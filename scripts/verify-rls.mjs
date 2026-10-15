import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// Direct HTTP checks with real user sessions. Tokens stay in the caller's memory.
// This module never loads a service key or bypasses RLS. Foreign fixture IDs, if
// supplied, must come from disposable records created by a DB administrator.
export async function verifyRLS({
  url,
  key,
  ownerToken,
  otherToken,
  foreignGoalId,
  foreignProjectId,
  onProgress = () => {},
}) {
  assert.ok(
    url.startsWith("https://") && key.startsWith("sb_publishable_"),
    "Development client configuration required",
  );
  const checks = [],
    created = [];
  async function call(token, table, method = "GET", body, filter = "") {
    const target = new URL(`${url}/rest/v1/${table}`);
    target.searchParams.set("select", "*");
    if (filter)
      target.searchParams.set(
        table === "app_owners" ? "user_id" : "id",
        `eq.${filter}`,
      );
    const response = await fetch(target, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const value = await response.json();
    if (method === "POST" && response.ok && table !== "app_owners")
      for (const row of value) created.push({ table, id: row.id });
    return { status: response.status, ok: response.ok, value };
  }
  async function identity(token) {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(
      response.status,
      200,
      "Session must be validated by the Auth server",
    );
    return (await response.json()).id;
  }
  const owner = await identity(ownerToken),
    other = await identity(otherToken);
  assert.notEqual(owner, other, "Two different real accounts required");
  function pass(label) {
    checks.push(label);
    onProgress(label);
  }
  function denied(result, label) {
    assert.ok(
      [401, 403].includes(result.status) ||
        (result.ok && Array.isArray(result.value) && result.value.length === 0),
      label,
    );
    pass(label);
  }
  function rejected(result, label, code) {
    assert.equal(result.status, code === "23503" ? 409 : 400, label);
    assert.equal(result.value.code, code, label);
    pass(label);
  }
  async function insert(table, record) {
    const result = await call(ownerToken, table, "POST", {
      ...record,
      owner_id: owner,
    });
    assert.equal(result.status, 201, `Owner insert ${table}`);
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].owner_id, owner);
    pass(`Owner insert ${table}`);
    return result.value[0];
  }
  const prefix = `M1-QA-${randomUUID()}`;
  const goalBody = {
    pillar_key: "ai",
    scope: "quarter",
    title: prefix,
    start_on: "2025-01-01",
    due_on: "2025-03-31",
  };
  let cleanupError = false;
  try {
    const whitelist = await call(ownerToken, "app_owners");
    assert.equal(whitelist.status, 200);
    assert.deepEqual(
      whitelist.value.map((row) => row.user_id),
      [owner],
    );
    pass("Owner whitelist self-read");
    denied(
      await call(otherToken, "app_owners"),
      "Non-owner cannot read owner whitelist",
    );
    for (const token of [ownerToken, otherToken])
      denied(
        await call(token, "app_owners", "POST", { user_id: other }),
        "Client cannot edit owner whitelist",
      );
    for (const token of [ownerToken, otherToken])
      for (const method of ["PATCH", "DELETE"]) {
        const deniedWrite = await call(
          token,
          "app_owners",
          method,
          method === "PATCH" ? { user_id: other } : undefined,
          "00000000-0000-4000-8000-000000000099",
        );
        assert.ok(
          [401, 403].includes(deniedWrite.status),
          "Whitelist mutation privilege must be revoked",
        );
        pass("Whitelist " + method + " privilege revoked");
      }
    const goal = await insert("goals", goalBody);
    const project = await insert("projects", {
      pillar_key: "ai",
      title: prefix,
      status: "idea",
    });
    const milestone = await insert("milestones", {
      goal_id: goal.id,
      title: prefix,
    });
    const log = await insert("activity_logs", {
      pillar_key: "ai",
      activity_on: "2025-01-01",
      title: prefix,
      duration_minutes: 5,
    });
    const achievement = await insert("achievements", {
      pillar_key: null,
      title: prefix,
      status: "locked",
      unlocked_at: null,
    });
    const fixtures = {
      goals: goal,
      milestones: milestone,
      projects: project,
      activity_logs: log,
      achievements: achievement,
    };
    const bodies = {
      goals: goalBody,
      milestones: { goal_id: goal.id, title: prefix },
      projects: { pillar_key: "ai", title: prefix },
      activity_logs: {
        pillar_key: "ai",
        title: prefix,
        activity_on: "2025-01-01",
      },
      achievements: { pillar_key: null, title: prefix, status: "locked" },
    };
    for (const [table, row] of Object.entries(fixtures)) {
      const read = await call(ownerToken, table, "GET", undefined, row.id);
      assert.equal(read.status, 200);
      assert.equal(read.value.length, 1);
      pass(`Owner read ${table}`);
      const ownerList = await call(ownerToken, table);
      assert.equal(ownerList.status, 200);
      assert.ok(
        ownerList.value.every((value) => value.owner_id === owner),
        "Unfiltered owner read must not reveal other owners",
      );
      pass("Owner unfiltered read excludes other accounts " + table);

      denied(await call(otherToken, table), "Non-owner read " + table);
      for (const forgedOwner of [owner, other])
        denied(
          await call(otherToken, table, "POST", {
            ...bodies[table],
            owner_id: forgedOwner,
          }),
          "Non-owner insert " + table,
        );
      denied(
        await call(ownerToken, table, "POST", {
          ...bodies[table],
          owner_id: other,
        }),
        "Owner cannot forge ownership " + table,
      );
      denied(
        await call(
          otherToken,
          table,
          "PATCH",
          { title: prefix + "-forbidden" },
          row.id,
        ),
        "Non-owner patch " + table,
      );
      denied(
        await call(otherToken, table, "DELETE", undefined, row.id),
        "Non-owner delete " + table,
      );
      const updated = await call(
        ownerToken,
        table,
        "PATCH",
        { title: prefix + "-edited" },
        row.id,
      );
      assert.equal(updated.status, 200);
      assert.equal(updated.value.length, 1);
      assert.equal(updated.value[0].title, prefix + "-edited");
      pass(`Owner update ${table}`);
      denied(
        await call(ownerToken, table, "PATCH", { owner_id: other }, row.id),
        "Owner cannot transfer record " + table,
      );
    }
    rejected(
      await call(
        ownerToken,
        "achievements",
        "PATCH",
        { status: "unlocked", unlocked_at: "2099-01-01" },
        achievement.id,
      ),
      "Future achievement date update rejected",
      "23514",
    );
    rejected(
      await call(ownerToken, "goals", "POST", {
        ...goalBody,
        owner_id: owner,
        start_on: "2025-03-31",
        due_on: "2025-01-01",
      }),
      "Invalid goal dates rejected",
      "23514",
    );
    rejected(
      await call(ownerToken, "activity_logs", "POST", {
        ...bodies.activity_logs,
        owner_id: owner,
        duration_minutes: -1,
      }),
      "Negative duration rejected",
      "23514",
    );
    for (const pillar_key of [
      null,
      "fitness",
      "english",
      "analog_ic",
      "cooking",
      "ai",
      "finance",
    ]) {
      const row = await insert("achievements", {
        title: prefix,
        pillar_key,
        status: "unlocked",
        unlocked_at: "2025-01-01",
        notes: "Synthetic security acceptance fixture",
      });
      const update = await call(
        ownerToken,
        "achievements",
        "PATCH",
        { notes: "Synthetic edit", unlocked_at: "2025-02-01" },
        row.id,
      );
      assert.equal(update.status, 200);
      assert.equal(update.value[0].unlocked_at, "2025-02-01");
      pass("Achievement actual date edit");
      const locked = await call(
        ownerToken,
        "achievements",
        "PATCH",
        { status: "locked", unlocked_at: null },
        row.id,
      );
      assert.equal(locked.status, 200);
      assert.equal(locked.value[0].unlocked_at, null);
      pass("Achievement revoke clears date");
    }
    for (const body of [
      { status: "unlocked", unlocked_at: null },
      { status: "locked", unlocked_at: "2025-01-01" },
      { status: "unlocked", unlocked_at: "2099-01-01" },
      { pillar_key: "seventh_pillar", status: "locked", unlocked_at: null },
    ])
      rejected(
        await call(ownerToken, "achievements", "POST", {
          owner_id: owner,
          title: prefix,
          ...body,
        }),
        "Invalid achievement state/date/pillar rejected",
        "23514",
      );
    rejected(
      await call(ownerToken, "milestones", "POST", {
        owner_id: owner,
        goal_id: goal.id,
        title: prefix,
        status: "done",
        completed_on: null,
      }),
      "Completed milestone requires date",
      "23514",
    );
    if (foreignGoalId)
      rejected(
        await call(ownerToken, "milestones", "POST", {
          owner_id: owner,
          goal_id: foreignGoalId,
          title: prefix,
        }),
        "Cross-owner goal FK rejected",
        "23503",
      );
    if (foreignProjectId)
      for (const table of ["achievements", "activity_logs"])
        rejected(
          await call(ownerToken, table, "POST", {
            ...bodies[table],
            owner_id: owner,
            [table === "achievements" ? "related_project_id" : "project_id"]:
              foreignProjectId,
          }),
          "Cross-owner project FK rejected " + table,
          "23503",
        );
  } finally {
    // Reverse insertion order respects parent/child FKs. Touch only our returned IDs.
    for (const row of created.reverse())
      try {
        const deleted = await call(
          ownerToken,
          row.table,
          "DELETE",
          undefined,
          row.id,
        );
        if (!deleted.ok || deleted.value.length !== 1) cleanupError = true;
        else pass("Owner delete " + row.table);
      } catch {
        cleanupError = true;
      }
  }
  assert.equal(
    cleanupError,
    false,
    "Some disposable QA rows could not be cleaned",
  );
  return {
    passed: checks.length,
    checks,
    crossOwnerFKVerified: !!foreignGoalId && !!foreignProjectId,
  };
}
