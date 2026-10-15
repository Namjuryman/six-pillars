import {
  test as base,
  expect,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pillars } from "../../src/config/pillars";
import { examples } from "../../src/features/public/content";

const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type()))
        errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) =>
      errors.push(`${request.url()} ${request.failure()?.errorText}`),
    );
    await use(page);
    expect(errors, "No runtime, console or resource failures").toEqual([]);
  },
});

async function healthy(page: Page) {
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "No horizontal overflow",
  ).toBe(true);
}

async function capture(page: Page, name: string, info: TestInfo) {
  const directory = process.env.E2E_SCREENSHOT_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  // Full-page capture must load off-screen lazy thumbnails before taking evidence.
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(
      images.map(async (image) => {
        image.loading = "eager";
        await image.decode();
      }),
    );
  });
  await page.screenshot({
    path: join(directory, `${info.project.name}-${name}.png`),
    fullPage: true,
  });
}

async function navigate(page: Page, label: string) {
  const menu = page.getByRole("button", { name: "导航菜单" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: label, exact: true })
    .click();
  await expect(
    page
      .locator("#main-nav")
      .getByRole("link", { name: label, exact: true, includeHidden: true }),
  ).toHaveAttribute("aria-current", "page");
}

test("all primary navigation, menu closing and keyboard focus", async ({
  page,
}, info) => {
  await page.goto("./");
  await expect(page).toHaveTitle("首页 · Six Pillars");
  await healthy(page);
  await expect(page.locator(".pillar-row")).toHaveCount(6);
  await capture(page, "home", info);
  for (const label of [
    "六大能力",
    "三年路线",
    "作品",
    "文章",
    "成就",
    "关于",
    "首页",
  ]) {
    await navigate(page, label);
    await healthy(page);
    await expect(page.locator("main")).toBeFocused();
    if (info.project.name === "mobile-375") {
      await expect(
        page.getByRole("button", { name: "导航菜单" }),
      ).toHaveAttribute("aria-expanded", "false");
    }
  }
  // A current-page nav link must also close the mobile menu.
  if (info.project.name === "mobile-375") {
    await navigate(page, "首页");
    await expect(page.locator("main")).toBeFocused();
    await expect(
      page.getByRole("button", { name: "导航菜单" }),
    ).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "导航菜单" }).click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "成就", exact: true })
      .focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "导航菜单" })).toBeFocused();
    await expect(page.getByRole("navigation")).toBeHidden();
  }
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳至正文" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("six independent pillar routes, links and refresh", async ({
  page,
}, info) => {
  await page.goto("./#/pillars");
  await healthy(page);
  await capture(page, "pillars", info);
  for (const pillar of pillars) {
    await page.goto("./#/pillars");
    await page.locator(`a[href="#/pillars/${pillar.key}"]`).click();
    await expect(page.locator("main h1")).toHaveText(pillar.name);
    await page.reload();
    await healthy(page);
    await expect(page.locator("main h1")).toHaveText(pillar.name);
    await expect(page.locator(".page-intro p")).toHaveText(pillar.vision);
  }
});

test("roadmap year selection, history, invalid year and deep reload", async ({
  page,
}, info) => {
  await page.goto("./#/roadmap");
  for (const [i, label] of ["2026 — 27", "2027 — 28", "2028 — 29"].entries()) {
    const choice = page.getByRole("button", { name: new RegExp(label) });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".quarter-list > li")).toHaveCount(4);
    await expect(page).toHaveURL(new RegExp(`year=${i}$`));
    await page.reload();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await healthy(page);
  }
  await page.getByRole("button", { name: /2027 — 28/ }).click();
  await page.getByRole("heading", { name: "问题驱动" }).waitFor();
  await capture(page, "roadmap", info);
  await page.goBack();
  await expect(page.getByRole("button", { name: /2028 — 29/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("./#/roadmap?year=invalid");
  await expect(page.getByRole("button", { name: /2026 — 27/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("project/article filters, empty recovery and every content detail", async ({
  page,
}) => {
  for (const kind of ["project", "article"] as const) {
    const route = kind === "project" ? "projects" : "writing";
    await page.goto(`./#/${route}`);
    await expect(page.locator(".entry-card")).toHaveCount(2);
    await page
      .getByRole("button", { name: "AI 第二专业", exact: true })
      .click();
    await expect(page.locator(".entry-card")).toHaveCount(1);
    await expect(page.getByRole("status")).toContainText("1 篇");
    await page.getByRole("button", { name: "健身运动", exact: true }).click();
    await expect(page.locator(".entry-card")).toHaveCount(0);
    await expect(page.locator(".empty-state")).toBeVisible();
    await page.getByRole("button", { name: "查看全部示例" }).click();
    await expect(page.locator(".entry-card")).toHaveCount(2);
    for (const entry of examples.filter((e) => e.kind === kind)) {
      await page.getByRole("link", { name: new RegExp(entry.title) }).click();
      await expect(page.locator("main h1")).toHaveText(entry.title);
      await expect(page.locator(".prose")).toContainText("示例");
      await page.reload();
      await healthy(page);
      await page
        .getByRole("link", {
          name: kind === "project" ? "← 作品集" : "← 全部文章",
        })
        .click();
    }
  }
});

test("achievement empty wall, keyboard timeline and six categories retained", async ({
  page,
}, info) => {
  await page.goto("./#/achievements");
  await healthy(page);
  await expect(page).toHaveTitle("成就 · Six Pillars");
  await expect(
    page.getByRole("region", { name: "公开成就徽章墙" }),
  ).toContainText("目前还没有公开成就");
  await expect(page.locator(".achievement-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /创建|点亮|发布/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "时间线", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "时间线", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "公开成就时间线" }),
  ).toContainText("等待第一个公开的时刻");
  await capture(page, "achievements", info);
  await page.getByRole("button", { name: "徽章墙", exact: true }).click();
  await page.getByRole("link", { name: "认识六大能力" }).click();
  await expect(page.locator(".pillar-row")).toHaveCount(6);
});

test("all 404 cases recover to home without backend routes", async ({
  page,
}) => {
  for (const route of [
    "missing",
    "pillars/missing",
    "projects/missing",
    "writing/missing",
  ]) {
    await page.goto(`./#/${route}`);
    await healthy(page);
    await expect(page.locator("main h1")).toHaveText("这一页还没有留下足迹。");
    await page.reload();
    await page.getByRole("link", { name: "回到首页" }).click();
    await expect(page.locator("main h1")).toContainText("把成长");
  }
});

test("Pages base path, favicon, CSS, JS and static images load after deep refresh", async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto("./#/projects/circuit-design-report");
  await page.reload();
  await healthy(page);
  const assetURLs = await page
    .locator('script[src], link[rel="stylesheet"], link[rel="icon"]')
    .evaluateAll((elements) =>
      elements.map((e) => e.getAttribute("src") ?? e.getAttribute("href")!),
    );
  expect(assetURLs.length).toBeGreaterThanOrEqual(3);
  assetURLs.push(
    "/six-pillars/images/circuit.png",
    "/six-pillars/images/notebook.png",
  );
  for (const path of assetURLs) {
    expect(path).toMatch(/^\/six-pillars\//);
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.status(), path).toBe(200);
    const type = response.headers()["content-type"];
    expect(type, path).not.toMatch(/text\/html/);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
  await page.goto("./#/");
  await page.locator(".entry-card img").first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".entry-card img")
        .evaluateAll((images) =>
          images.every((img) => (img as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  expect(
    await page.locator("body").evaluate((e) => getComputedStyle(e).color),
  ).toBe("rgb(24, 62, 53)");
  await page.getByRole("link", { name: "查看三年路线" }).click();
  await expect(page.locator(".roadmap-tabs")).toBeVisible();
});

test("M1 admin routes redirect guests to login without exposing records", async ({
  page,
}) => {
  await page.goto("./#/admin/achievements");
  await expect(page).toHaveURL(/#\/login$/);
  await expect(
    page.getByRole("heading", { name: "管理后台登录" }),
  ).toBeVisible();
  await expect(page.locator(".private-item")).toHaveCount(0);
});
