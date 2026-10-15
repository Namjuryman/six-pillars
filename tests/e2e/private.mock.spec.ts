import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
// UI contract mocks only. These are NOT Supabase login or RLS security tests.
type Row = Record<string, any>;
const callbackURLs = new WeakMap<Page, () => string>();
const ownerId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
async function backend(page: Page, owner = true) {
  let releaseLogout: () => void = () => {};
  const logoutGate = new Promise<void>((resolve) => {
    releaseLogout = resolve;
  });
  const state = {
    holdLogout: false,
    releaseLogout: () => releaseLogout(),
    rows: {
      goals: [],
      milestones: [],
      activity_logs: [],
      achievements: [],
    } as Record<string, Row[]>,
    requests: [] as { method: string; path: string; body: Row | null }[],
    refreshes: 0,
    denyReads: false,
  };
  const user = {
    id: owner ? ownerId : otherId,
    aud: "authenticated",
    role: "authenticated",
    email: owner ? "owner@example.invalid" : "other@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  function session() {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: expiry,
        role: "authenticated",
        aud: "authenticated",
      }),
    ).toString("base64url");
    return {
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.bW9jay1zaWduYXR1cmU`,
      refresh_token: "mock-refresh-not-a-real-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiry,
      user,
    };
  }
  await page.route("https://m1-ui-tests.supabase.invalid/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    state.requests.push({ method, path: url.pathname, body });
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "content-type": "application/json",
    };
    const reply = (value: unknown, status = 200) =>
      route.fulfill({ status, headers, body: JSON.stringify(value) });
    if (method === "OPTIONS") return reply({});
    if (url.pathname.endsWith("/otp")) {
      expect(body.create_user).toBe(false);
      expect(url.searchParams.get("redirect_to")).toBe(
        "http://127.0.0.1:4174/six-pillars/",
      );
      return reply({});
    }
    if (url.pathname.endsWith("/token")) {
      state.refreshes++;
      return reply(session());
    }
    if (url.pathname.endsWith("/user")) return reply(user);
    if (url.pathname.endsWith("/logout")) {
      if (state.holdLogout) await logoutGate;
      return reply({});
    }
    if (url.pathname.endsWith("/app_owners"))
      return reply(owner ? [{ user_id: ownerId }] : []);
    const table = url.pathname.split("/").at(-1)!;
    if (!(table in state.rows))
      return reply({ message: "Unknown mock route" }, 404);
    if (state.denyReads && method === "GET")
      return reply({ message: "Synthetic permission error" }, 403);
    const matches = (row: Row) =>
      Array.from(url.searchParams).every(
        ([key, value]) =>
          !value.startsWith("eq.") || String(row[key]) === value.slice(3),
      );
    let result = state.rows[table].filter(matches);
    if (method === "POST") {
      const row = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        status: "todo",
        detail: "",
        completed_on: null,
        ...body,
      };
      state.rows[table].push(row);
      result = [row];
    }
    if (method === "PATCH") result.forEach((row) => Object.assign(row, body));
    if (method === "DELETE") {
      state.rows[table] = state.rows[table].filter((row) => !matches(row));
      if (table === "goals")
        state.rows.milestones = state.rows.milestones.filter(
          (row) => !result.some((goal) => goal.id === row.goal_id),
        );
    }
    return reply(
      request.headers().accept?.includes("application/vnd.pgrst.object+json")
        ? (result[0] ?? null)
        : result,
    );
  });
  callbackURLs.set(page, () => {
    const value = session();
    const params = new URLSearchParams({
      access_token: value.access_token,
      refresh_token: value.refresh_token,
      token_type: "bearer",
      expires_in: String(value.expires_in),
      expires_at: String(value.expires_at),
      type: "magiclink",
    });
    return "./#" + params.toString();
  });
  return state;
}
async function login(page: Page) {
  await page.goto("./#/admin");
  await expect(
    page.getByRole("heading", { name: "管理后台登录" }),
  ).toBeVisible();
  await page.getByLabel("登录邮箱").fill("owner@example.invalid");
  await page.getByRole("button", { name: "发送登录链接" }).click();
  await expect(page.getByRole("status")).toContainText("登录链接将发送");
  await page.goto(callbackURLs.get(page)!());
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function shot(page: Page, name: string) {
  if (!process.env.E2E_SCREENSHOT_DIR) return;
  const dir = resolve(process.env.E2E_SCREENSHOT_DIR);
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({
    path: resolve(dir, `mock-${name}-${page.viewportSize()!.width}.png`),
    fullPage: true,
  });
}

test("email link error, token cleanup, owner restore, refresh and logout (mock)", async ({
  page,
}) => {
  const api = await backend(page);
  await page.goto(
    "./#error=access_denied&error_description=mock-private-error",
  );
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("status")).toContainText("登录链接无效或已过期");
  await expect(page.locator("body")).not.toContainText("mock-private-error");
  await login(page);
  await expect(page).toHaveURL(/#\/admin$/);
  expect(page.url()).not.toContain("access_token");
  await page.getByRole("link", { name: "活动日志", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "活动日志", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = "six-pillars-auth-v1";
    const value = JSON.parse(sessionStorage.getItem(key)!);
    value.expires_at = 1;
    sessionStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "活动日志", exact: true }),
  ).toBeVisible();
  expect(api.refreshes).toBeGreaterThan(0);
  await noOverflow(page);
  await shot(page, "logs");
  api.holdLogout = true;
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "正在退出登录…", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "后台导航" })).toHaveCount(
    0,
  );
  await expect
    .poll(() => api.requests.some((item) => item.path.endsWith("/logout")))
    .toBe(true);
  expect(
    await page.evaluate(
      () => sessionStorage.getItem("six-pillars-auth-v1") !== null,
    ),
  ).toBe(true);
  api.releaseLogout();

  await expect(page).toHaveURL(/#\/login$/);
  await expect
    .poll(() =>
      page.evaluate(
        () => sessionStorage.getItem("six-pillars-auth-v1") === null,
      ),
    )
    .toBe(true);
  await page.goto("./#/admin");
  await expect(
    page.getByRole("heading", { name: "管理后台登录" }),
  ).toBeVisible();
});

test("non-owner cannot enter workspace (mock UI guard only)", async ({
  page,
}) => {
  const api = await backend(page, false);
  await login(page);
  await expect(page.getByRole("alert")).toContainText("此账户没有后台权限");
  await expect(page.getByRole("navigation", { name: "后台导航" })).toHaveCount(
    0,
  );
  expect(
    api.requests.filter((x) =>
      /\/(goals|milestones|activity_logs|achievements)$/.test(x.path),
    ),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "退出此账户" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("goals, milestones and logs CRUD with reload and filters (mock)", async ({
  page,
}) => {
  const api = await backend(page);
  page.on("dialog", (dialog) =>
    dialog.type() === "prompt"
      ? dialog.accept("验收里程碑改名")
      : dialog.accept(),
  );
  await login(page);
  await page.getByRole("link", { name: "目标与里程碑", exact: true }).click();
  await page.getByLabel("目标名称").fill("自动测试目标");
  await page.getByRole("button", { name: "添加目标", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "自动测试目标", exact: true }),
  ).toBeVisible();
  await page.getByLabel("归属目标").selectOption(api.rows.goals[0].id);
  await page.getByLabel("里程碑名称").fill("验收里程碑");
  await page.getByRole("button", { name: "添加里程碑", exact: true }).click();
  await page
    .getByRole("button", { name: "标记完成：验收里程碑", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "撤销完成：验收里程碑", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "编辑里程碑：验收里程碑", exact: true })
    .click();
  await expect(page.getByText("验收里程碑改名", { exact: true })).toBeVisible();
  await page
    .getByRole("article")
    .getByRole("button", { name: "编辑", exact: true })
    .click();
  await page.getByLabel("目标名称").fill("目标修改后");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "目标修改后", exact: true }),
  ).toBeVisible();
  await page.getByLabel("能力筛选").selectOption("english");
  await expect(page.getByText("尚无符合条件的目标。")).toBeVisible();
  await page.getByLabel("能力筛选").selectOption("all");
  await noOverflow(page);
  await shot(page, "goals");
  await page
    .getByRole("button", { name: "删除里程碑：验收里程碑改名", exact: true })
    .click();
  await expect(page.getByText("验收里程碑改名", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("article")
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(page.getByText("尚无符合条件的目标。")).toBeVisible();
  await page.getByRole("link", { name: "活动日志", exact: true }).click();
  await page.getByLabel("标题", { exact: true }).fill("自动测试日志");
  await page.getByLabel("投入时间（分钟，可空）").fill("25");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "自动测试日志" }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .getByRole("button", { name: "编辑", exact: true })
    .click();
  await page.getByLabel("标题", { exact: true }).fill("日志修改后");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "日志修改后" })).toBeVisible();
  await page.getByLabel("指定日期").fill("2000-01-01");
  await expect(page.getByText("还没有符合条件的活动记录。")).toBeVisible();
  await page.getByLabel("指定日期").fill("");
  await page
    .getByRole("article")
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(page.getByText("还没有符合条件的活动记录。")).toBeVisible();
  expect(api.rows.goals).toHaveLength(0);
  expect(api.rows.milestones).toHaveLength(0);
  expect(api.rows.activity_logs).toHaveLength(0);
});

test("freeform achievements, dates, all pillars, pin, sort, filters and deletion (mock)", async ({
  page,
}) => {
  const api = await backend(page);
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  await page.getByRole("link", { name: "我的成就", exact: true }).click();
  for (const [i, pillar] of [
    "",
    "fitness",
    "english",
    "analog_ic",
    "cooking",
    "ai",
    "finance",
  ].entries()) {
    await page.getByLabel("归属能力").selectOption(pillar);
    await page.getByLabel("成就名称").fill(`自定义测试成就${i}`);
    if (i === 6) {
      await page.getByLabel("点亮状态").selectOption("unlocked");
      const date = page.getByLabel("达成日期", { exact: true });
      await date.fill("2099-01-01");
      expect(
        await date.evaluate((el: HTMLInputElement) => el.checkValidity()),
      ).toBe(false);
      await date.fill("2025-01-01");
    }

    await page.getByRole("button", { name: "添加成就", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `自定义测试成就${i}`, exact: true }),
    ).toBeVisible();
  }
  const card = (name: string) =>
    page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  const composite = card("自定义测试成就0");
  await composite.getByRole("button", { name: "点亮", exact: true }).click();
  await expect(page.getByLabel("达成日期", { exact: true })).toBeVisible();
  expect(api.rows.achievements[0].status).toBe("locked");
  await page.getByLabel("达成日期", { exact: true }).fill("2025-10-01");
  await page.getByRole("button", { name: "保存成就", exact: true }).click();
  await expect(composite).toContainText("点亮于 2025-10-01");
  await composite.getByRole("button", { name: "置顶", exact: true }).click();
  await expect(
    composite.getByRole("button", { name: "取消置顶", exact: true }),
  ).toBeVisible();
  const first = page.locator(".private-achievement").first();
  await expect(first).toContainText("自定义测试成就0");
  await card("自定义测试成就6")
    .getByRole("button", { name: "上移", exact: true })
    .click();
  await expect(page.locator(".private-achievement").nth(5)).toContainText(
    "自定义测试成就6",
  );
  await page.getByRole("combobox", { name: /^能力/ }).selectOption("composite");
  await expect(page.locator(".private-achievement")).toHaveCount(1);
  await page.getByLabel("达成年份").selectOption("2025");
  await expect(composite).toBeVisible();
  await noOverflow(page);
  await shot(page, "achievements");
  await composite
    .getByRole("button", { name: "撤销点亮", exact: true })
    .click();
  await expect(page.getByText("没有符合条件的成就。")).toBeVisible();
  await page.getByLabel("达成年份").selectOption("all");
  await expect(composite).toContainText("等待点亮");
  expect(api.rows.achievements[0].unlocked_at).toBeNull();
  await composite.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByText("没有符合条件的成就。")).toBeVisible();
  await page.goto("./#/achievements");
  await expect(page.getByText("自定义测试成就1")).toHaveCount(0);
});

test("data service failure shows recoverable error, never fake data (mock)", async ({
  page,
}) => {
  const api = await backend(page);
  await login(page);
  await expect(page.getByRole("heading", { name: "我的工作台" })).toBeVisible();
  api.denyReads = true;
  await page.getByRole("link", { name: "活动日志", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("数据操作失败");
  await expect(page.getByRole("article")).toHaveCount(0);
  api.denyReads = false;
  await page.reload();
  await expect(page.getByText("还没有符合条件的活动记录。")).toBeVisible();
});
