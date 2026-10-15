import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  unlink,
  readdir,
} from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { encryptBackup, decryptBackup } from "./backup-crypto.mjs";

// Windows, local synthetic drill ONLY. No URL, remote host, existing database,
// production token or caller-selected database name is accepted by this tool.
assert.equal(
  process.platform,
  "win32",
  "This drill uses Windows portable PostgreSQL and DPAPI",
);
assert.ok(
  process.env.PG_BIN,
  "Set PG_BIN to the approved portable PostgreSQL 17 bin directory",
);
const bin = resolve(process.env.PG_BIN);
const repo = resolve(".");
const root = resolve(
  process.env.M1_QA_ROOT ?? join(tmpdir(), "six-pillars-qa"),
);
assert.ok(
  /^[\x20-\x7e]+$/.test(root + bin),
  "Portable Windows PostgreSQL requires ASCII-only runtime/data paths for this UTF-8 drill",
);
assert.ok(
  root !== repo && !root.startsWith(repo + sep),
  "Artifacts must stay outside the repository",
);
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, "six-pillars-restore-"));
const cluster = join(directory, "cluster");
const passwordFile = join(directory, "init-password.local");
const password = randomBytes(32).toString("base64url");
await writeFile(passwordFile, password, { mode: 0o600 });
const listener = createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const env = {
  ...process.env,
  PGHOST: "127.0.0.1",
  PGPORT: String(port),
  PGUSER: "m1_qa_admin",
  PGPASSWORD: password,
  PGCLIENTENCODING: "UTF8",
};
// Ignore user's global PostgreSQL defaults, services and password files.
for (const key of [
  "PGSERVICE",
  "PGHOSTADDR",
  "PGSERVICEFILE",
  "PGDATABASE",
  "PGOPTIONS",
  "PGPASSFILE",
])
  delete env[key];
function tool(name, args, input) {
  const result = spawnSync(join(bin, `${name}.exe`), args, {
    env,
    input,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
    windowsHide: true,
    // pg_ctl's detached Windows server must not inherit our captured pipe handles.
    stdio: name === "pg_ctl" ? "ignore" : undefined,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${name} failed: ${result.error?.message ?? result.stderr}`,
    );
  return (result.stdout ?? "").trim();
}
function sql(db, query) {
  return tool(
    "psql",
    ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", "-"],
    query,
  );
}
const quote = (s) => `'${String(s).replaceAll("'", "''")}'`;
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  migratedOwner = "00000000-0000-4000-8000-000000000003";
const tables = [
  "goals",
  "projects",
  "milestones",
  "activity_logs",
  "achievements",
];
const checks = [];
const pass = (label) => checks.push(label);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const migrations = (await readdir("supabase/migrations"))
  .filter((x) => x.endsWith(".sql"))
  .sort();
const migrationText = await Promise.all(
  migrations.map((f) => readFile(join("supabase/migrations", f), "utf8")),
);
const grants = migrationText[0].slice(
  migrationText[0].indexOf("revoke all on public.app_owners"),
  migrationText[0].indexOf("alter table public.app_owners enable"),
);
assert.ok(grants.startsWith("revoke all"), "Reviewed grants block required");
const bootstrap = `create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth to anon,authenticated;
  insert into auth.users values (${quote(owner)}),(${quote(other)}),(${quote(migratedOwner)});`;
function snapshot(db, id) {
  return JSON.parse(
    sql(
      db,
      `select jsonb_build_object(${tables.map((t) => `${quote(t)},coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.${t} x${id ? ` where owner_id=${quote(id)}` : ""}),'[]'::jsonb)`).join(",")});`,
    ),
  );
}
const asUser = (id, query) =>
  `begin; set local role authenticated; select set_config('request.jwt.claim.sub',${quote(id)},true); ${query}; rollback;`;
function last(db, query) {
  return sql(db, query).split(/\r?\n/).at(-1);
}
function rejected(db, query, label) {
  assert.throws(
    () => sql(db, query),
    /permission denied|row-level security|foreign key|check constraint|Achievement date/,
  );
  pass(label);
}
function rls(db, id) {
  assert.equal(
    last(
      db,
      asUser(
        id,
        "select not rolsuper and not rolbypassrls from pg_roles where rolname=current_user",
      ),
    ),
    "t",
  );
  pass(`${db}: non-superuser/non-bypass authenticated role`);
  assert.equal(
    sql(
      db,
      "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('app_owners','goals','projects','milestones','activity_logs','achievements') and c.relrowsecurity",
    ),
    "6",
  );
  assert.equal(
    sql(db, "select count(*) from pg_policies where schemaname='public'"),
    "6",
  );
  assert.equal(
    sql(
      db,
      "select bool_and(convalidated) from pg_constraint where connamespace='public'::regnamespace",
    ),
    "t",
  );
  pass(
    `${db}: six RLS tables, six policies and validated constraints restored`,
  );
  const expected = snapshot(db, id);
  for (const table of [...tables, "app_owners"]) {
    rejected(
      db,
      `begin; set local role anon; select * from public.${table}; rollback;`,
      `${db}: anon cannot read ${table}`,
    );
    assert.equal(
      last(db, asUser(other, `select count(*) from public.${table}`)),
      "0",
    );
    pass(`${db}: non-owner cannot read ${table}`);
    assert.equal(
      last(db, asUser(id, `select count(*) from public.${table}`)),
      String(table === "app_owners" ? 1 : expected[table].length),
    );
    pass(`${db}: owner reads complete ${table}`);
  }
  rejected(
    db,
    asUser(
      id,
      `insert into public.app_owners(user_id) values(${quote(other)})`,
    ),
    `${db}: owner cannot grant whitelist`,
  );
  for (const table of tables) {
    const original = expected[table][0];
    const row = { ...original, id: randomUUID(), owner_id: id };
    const record = quote(JSON.stringify(row));
    const insert = `insert into public.${table} select * from json_populate_record(null::public.${table},${record}::json)`;
    rejected(
      db,
      asUser(other, insert),
      `${db}: non-owner cannot insert ${table}`,
    );
    rejected(
      db,
      `begin; set local role anon; ${insert}; rollback;`,
      `${db}: anon cannot insert ${table}`,
    );
    assert.equal(
      last(
        db,
        asUser(
          other,
          `with x as (update public.${table} set title='denied' where id=${quote(original.id)} returning id) select count(*) from x`,
        ),
      ),
      "0",
    );
    assert.equal(
      last(
        db,
        asUser(
          other,
          `with x as (delete from public.${table} where id=${quote(original.id)} returning id) select count(*) from x`,
        ),
      ),
      "0",
    );
    pass(`${db}: non-owner cannot update/delete ${table}`);
    rejected(
      db,
      asUser(
        id,
        `update public.${table} set owner_id=${quote(other)} where id=${quote(original.id)}`,
      ),
      `${db}: cannot transfer ${table}`,
    );
    // Commit disposable CRUD probe, then delete it; don't touch backed-up records.
    sql(
      db,
      `begin; set local role authenticated; select set_config('request.jwt.claim.sub',${quote(id)},true); ${insert}; update public.${table} set title='QA changed' where id=${quote(row.id)}; delete from public.${table} where id=${quote(row.id)}; commit;`,
    );
    pass(`${db}: owner insert/update/delete ${table}`);
  }
  const milestone = expected.milestones[0];
  rejected(
    db,
    asUser(
      id,
      `insert into public.milestones(id,owner_id,goal_id,title) values(${quote(randomUUID())},${quote(id)},${quote(randomUUID())},'broken relationship')`,
    ),
    `${db}: missing goal FK rejected`,
  );
  rejected(
    db,
    asUser(
      id,
      `update public.milestones set goal_id=${quote(sql(db, `select id from public.goals where owner_id=${quote(other)} limit 1`))} where id=${quote(milestone.id)}`,
    ),
    `${db}: cross-owner goal FK rejected`,
  );
  rejected(
    db,
    asUser(
      id,
      `update public.achievements set status='unlocked', unlocked_at=null where id=${quote(expected.achievements[0].id)}`,
    ),
    `${db}: invalid unlock date rejected`,
  );
  rejected(
    db,
    asUser(
      id,
      `update public.achievements set status='unlocked', unlocked_at=current_date+365 where id=${quote(expected.achievements[0].id)}`,
    ),
    `${db}: future achievement date rejected`,
  );
  assert.deepEqual(snapshot(db, id), expected);
  pass(`${db}: permission probes left restored business records unchanged`);
}

let started = false;
const began = Date.now();
try {
  const version = tool("postgres", ["--version"]);
  assert.match(version, /PostgreSQL\) 17\./);
  tool("initdb", [
    "-D",
    cluster,
    "-U",
    "m1_qa_admin",
    "--encoding=UTF8",
    "--locale=C",
    "--auth=scram-sha-256",
    `--pwfile=${passwordFile}`,
  ]);
  tool("pg_ctl", [
    "-D",
    cluster,
    "-l",
    join(directory, "postgres.log"),
    "-w",
    "start",
    "-o",
    `-h 127.0.0.1 -p ${port}`,
  ]);
  started = true;
  sql(
    "postgres",
    "create role anon nologin; create role authenticated nologin;",
  );
  for (const db of ["m1_source", "m1_restored", "m1_json_restored"]) {
    tool("createdb", [db]);
    sql(db, bootstrap);
  }
  for (const text of migrationText) sql("m1_source", text);
  const pillar = `(array['fitness','english','analog_ic','cooking','ai','finance'])[1+(i%6)]`;
  sql(
    "m1_source",
    `begin;
    insert into public.app_owners(user_id) values(${quote(owner)});
    insert into public.goals(id,owner_id,pillar_key,scope,title,description,start_on,due_on,status,created_at,updated_at)
      select md5('goal'||i)::uuid,${quote(owner)},${pillar},'year','QA goal '||i,'仅合成资料 ''quote''',date '2026-01-01',date '2026-12-31','active','2026-10-01T00:00:00Z','2026-10-02T00:00:00Z' from generate_series(1,1103) s(i);
    insert into public.goals(id,owner_id,pillar_key,scope,title,start_on,due_on) values(md5('foreign-goal')::uuid,${quote(other)},'ai','year','foreign synthetic',date '2026-01-01',date '2026-12-31');
    insert into public.projects(id,owner_id,pillar_key,title,status,started_on,created_at,updated_at)
      select md5('project'||i)::uuid,${quote(owner)},${pillar},'QA project '||i,'active',date '2026-01-01','2026-10-01T00:00:00Z','2026-10-02T00:00:00Z' from generate_series(1,7) s(i);
    insert into public.milestones(id,owner_id,goal_id,title,detail,due_on,status,completed_on,created_at,updated_at)
      select md5('milestone'||i)::uuid,${quote(owner)},md5('goal'||i)::uuid,'QA milestone '||i,'合成进度',date '2026-10-01',case when i%2=0 then 'done' else 'todo' end,case when i%2=0 then date '2026-10-01' else null end,'2026-10-01T00:00:00Z','2026-10-02T00:00:00Z' from generate_series(1,1103) s(i);
    insert into public.activity_logs(id,owner_id,pillar_key,project_id,activity_on,title,duration_minutes,note,metrics_json,created_at,updated_at)
      select md5('log'||i)::uuid,${quote(owner)},${pillar},md5('project'||(1+i%7))::uuid,date '2026-10-01','QA log '||i,case when i%2=0 then null else 30 end,E'合成日志\\n无隐私','{"synthetic":true}'::jsonb,'2026-10-01T00:00:00Z','2026-10-02T00:00:00Z' from generate_series(1,1505) s(i);
    insert into public.achievements(id,owner_id,pillar_key,title,description,icon,status,unlocked_at,notes,related_project_id,related_url,is_highlight,sort_order,created_at,updated_at)
      select md5('achievement'||i)::uuid,${quote(owner)},case when i%7=0 then null else ${pillar} end,'QA achievement '||i,'仅合成成就','✦',case when i%2=0 then 'locked' else 'unlocked' end,case when i%2=0 then null else date '2026-10-01' end,'合成感想',md5('project'||(1+i%7))::uuid,'https://example.invalid/evidence',i%3=0,i,'2026-10-01T00:00:00Z','2026-10-02T00:00:00Z' from generate_series(1,1105) s(i);
    commit;`,
  );
  const original = snapshot("m1_source");
  const own = snapshot("m1_source", owner);
  const archive = {
    format: "six-pillars-private",
    schemaVersion: 1,
    syntheticOnly: true,
    exportedAt: new Date().toISOString(),
    source: {
      projectRef: "local-isolated-drill",
      ownerId: owner,
      commit: spawnSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        windowsHide: true,
      }).stdout.trim(),
    },
    timezone: "Asia/Hong_Kong",
    migrations,
    counts: Object.fromEntries(tables.map((t) => [t, own[t].length])),
    data: own,
  };
  const json = JSON.stringify(archive);
  const dumpFile = join(directory, "synthetic.dump");
  tool("pg_dump", [
    "-d",
    "m1_source",
    "-Fc",
    "--schema=public",
    "--no-owner",
    "--no-acl",
    "-f",
    dumpFile,
  ]);
  const dump = await readFile(dumpFile);
  const plaintext = Buffer.from(
    JSON.stringify({
      json,
      dump: dump.toString("base64"),
      jsonSha256: sha(json),
      dumpSha256: sha(dump),
    }),
  );
  const passphrase = randomBytes(32).toString("base64url");
  const protect = (value, decrypt = false) => {
    const expression = decrypt
      ? "[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)"
      : "[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)";
    const ps = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Convert]::ToBase64String(${expression}))`,
      ],
      {
        input: Buffer.from(value).toString("base64"),
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(ps.status, 0, "DPAPI must succeed");
    return Buffer.from(ps.stdout.trim(), "base64");
  };
  await writeFile(
    join(directory, "recovery.dpapi"),
    protect(Buffer.from(passphrase)),
  );
  const encrypted = encryptBackup(plaintext, passphrase);
  await writeFile(join(directory, "synthetic-backup.enc.json"), encrypted);
  const recovered = JSON.parse(
    decryptBackup(
      await readFile(join(directory, "synthetic-backup.enc.json"), "utf8"),
      protect(
        await readFile(join(directory, "recovery.dpapi")),
        true,
      ).toString(),
    ).toString(),
  );
  assert.equal(sha(recovered.json), recovered.jsonSha256);
  const restoredDump = Buffer.from(recovered.dump, "base64");
  assert.equal(sha(restoredDump), recovered.dumpSha256);
  pass(
    "AES-256-GCM + scrypt encrypted backup recovered using current-user DPAPI-protected QA passphrase; checksums match",
  );
  await writeFile(join(directory, "recovered.dump"), restoredDump);
  tool("pg_restore", [
    "-d",
    "m1_restored",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--exit-on-error",
    join(directory, "recovered.dump"),
  ]);
  sql("m1_restored", grants);
  // --no-acl also omits schema USAGE after --clean recreates public.
  // Restore the normal schema entry privilege; table grants/RLS remain restrictive.
  sql("m1_restored", "grant usage on schema public to anon, authenticated;");
  assert.deepEqual(snapshot("m1_restored"), original);
  pass(
    "pg_dump/pg_restore: all five tables match every field, ID, timestamp, null and relationship",
  );
  rls("m1_restored", owner);
  for (const text of migrationText) sql("m1_json_restored", text);
  const imported = JSON.parse(recovered.json);
  assert.equal(imported.format, "six-pillars-private");
  assert.equal(imported.schemaVersion, 1);
  const remapped = Object.fromEntries(
    tables.map((t) => [
      t,
      imported.data[t].map((r) => ({ ...r, owner_id: migratedOwner })),
    ]),
  );
  sql(
    "m1_json_restored",
    `begin; insert into public.app_owners(user_id) values(${quote(migratedOwner)}); ${tables.map((t) => `insert into public.${t} select * from json_populate_recordset(null::public.${t},${quote(JSON.stringify(remapped[t]))}::json);`).join("\n")} commit;`,
  );
  // Separate unwhitelisted row to exercise composite-owner FK after remapping.
  sql(
    "m1_json_restored",
    `insert into public.goals(id,owner_id,pillar_key,scope,title,start_on,due_on) values(md5('foreign-goal')::uuid,${quote(other)},'ai','year','foreign synthetic',date '2026-01-01',date '2026-12-31');`,
  );
  assert.deepEqual(snapshot("m1_json_restored", migratedOwner), remapped);
  assert.equal(
    sql(
      "m1_json_restored",
      `select count(*) from public.app_owners where user_id=${quote(owner)}`,
    ),
    "0",
  );
  pass(
    "versioned owner JSON: new owner mapping, all five tables exact; old whitelist not imported",
  );
  rls("m1_json_restored", migratedOwner);
  const report = {
    passed: true,
    syntheticOnly: true,
    postgresVersion: version,
    listener: "127.0.0.1",
    counts: archive.counts,
    jsonSha256: sha(json),
    dumpSha256: sha(dump),
    checks,
    durationMs: Date.now() - began,
    realSupabaseAuthTest: false,
    productionRestoreTest: false,
    encryptionRecoveryScope:
      "QA current Windows user only; production vault/offsite choice pending",
  };
  await writeFile(
    join(directory, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: true,
      checks: checks.length,
      counts: archive.counts,
      evidence: join(directory, "results.json"),
    }),
  );
} finally {
  if (started) tool("pg_ctl", ["-D", cluster, "-m", "fast", "-w", "stop"]);
  await unlink(passwordFile).catch(() => {});
}
