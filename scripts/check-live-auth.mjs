import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { verifyRLS } from "./verify-rls.mjs";
// Interactive developer-only check: user copies the one-use email link locally.
// No HAR/trace or raw errors: neither URLs, JWTs, emails nor passwords are logged.
const qa = resolve(process.env.LIVE_QA_DIR ?? "../qa-m1");
const input = resolve(qa, "private-input");
const app = "http://127.0.0.1:5173/six-pillars/";
let browser;
let page;
const savedSession = resolve(input, "owner-session.dpapi.local");
function protectedState(value, decrypt = false) {
  const pre =
    "[void][Reflection.Assembly]::LoadWithPartialName('System.Security');";
  const command =
    pre +
    (decrypt
      ? "[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([Console]::In.ReadToEnd()),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))"
      : "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    { input: value, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, "Windows protected local state unavailable");
  return result.stdout.trim();
}
let stage = "read-local-link";
try {
  const config = Object.fromEntries(
    (await readFile(".env.development.local", "utf8"))
      .split(/\r?\n/)
      .filter((x) => x.includes("="))
      .map((x) => {
        const n = x.indexOf("=");
        return [x.slice(0, n), x.slice(n + 1)];
      }),
  );
  const url = config.VITE_SUPABASE_URL,
    key = config.VITE_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(
    key?.startsWith("sb_publishable_"),
    "Publishable development key required",
  );
  let previousSession = null,
    loginLink = null;
  try {
    previousSession = JSON.parse(
      protectedState(await readFile(savedSession, "utf8"), true),
    );
  } catch {
    /* first run */
  }
  if (!previousSession) {
    const copied = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-Command", "Get-Clipboard -Raw"],
      { encoding: "utf8", windowsHide: true },
    );
    loginLink = new URL(copied.stdout.trim());
    assert.equal(
      loginLink.origin,
      url,
      "Clipboard must contain only this development project email link",
    );
    assert.equal(
      loginLink.pathname,
      "/auth/v1/verify",
      "Clipboard must contain the one-use verification link",
    );
    assert.equal(loginLink.searchParams.get("type"), "magiclink");
    const redirected = loginLink.searchParams.get("redirect_to");
    if (redirected) assert.equal(redirected, app);
  }
  stage = "open-email-link";
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  if (previousSession)
    await context.addInitScript(
      (value) =>
        sessionStorage.setItem("six-pillars-auth-v1", JSON.stringify(value)),
      previousSession,
    );
  await page.goto(previousSession ? app + "#/admin" : loginLink.href, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForURL(
    (value) => value.origin === new URL(app).origin && value.hash === "#/admin",
    { timeout: 30000 },
  );
  await page
    .getByRole("heading", { name: "我的工作台", exact: true })
    .waitFor();
  assert.equal(page.url(), app + "#/admin", "Auth callback must be scrubbed");
  await page.reload();
  await page
    .getByRole("heading", { name: "我的工作台", exact: true })
    .waitFor();
  const session = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("six-pillars-auth-v1")),
  );
  assert.ok(
    session?.access_token && session?.refresh_token,
    "Real owner session required",
  );
  await writeFile(savedSession, protectedState(JSON.stringify(session)));
  console.log("PASS LIVE email link login and owner restoration");
  const shotdir = resolve(qa, "screenshots/live");
  await mkdir(shotdir, { recursive: true });
  await page.screenshot({
    path: resolve(shotdir, "owner-workspace-1440.png"),
    fullPage: true,
    mask: [page.locator(".private-account small")],
  });
  // Check genuine SDK restoration in a separate mobile browser context.
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await mobile.addInitScript(
    (value) =>
      sessionStorage.setItem("six-pillars-auth-v1", JSON.stringify(value)),
    session,
  );
  const phone = await mobile.newPage();
  await phone.goto(app + "#/admin/achievements");
  await phone.getByRole("heading", { name: "我的成就", exact: true }).waitFor();
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await phone.screenshot({
    path: resolve(shotdir, "owner-achievements-375.png"),
    fullPage: true,
    mask: [phone.locator(".private-account small")],
  });
  stage = "non-owner-auth";
  const otherClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const password = (
    await readFile(resolve(input, "nonowner-password.local"), "utf8")
  ).trim();
  const signed = await otherClient.auth.signInWithPassword({
    email: "m1-rls-other@example.invalid",
    password,
  });
  assert.equal(
    signed.error,
    null,
    "Synthetic non-owner must authenticate with real Auth",
  );
  const otherToken = signed.data.session?.access_token;
  assert.ok(otherToken);
  const foreign = JSON.parse(
    await readFile(resolve(input, "foreign-fixtures.local"), "utf8"),
  );
  stage = "direct-rls";
  const result = await verifyRLS({
    onProgress: (label) => console.log("PASS RLS " + label),
    url,
    key,
    ownerToken: session.access_token,
    otherToken,
    ...foreign,
  });
  await writeFile(
    resolve(qa, "rls-results.json"),
    JSON.stringify(result, null, 2),
  );
  // Verify genuine non-owner route denial in an isolated context.
  stage = "non-owner-route";
  const denied = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await denied.addInitScript(
    (value) =>
      sessionStorage.setItem("six-pillars-auth-v1", JSON.stringify(value)),
    signed.data.session,
  );
  const deniedPage = await denied.newPage();
  await deniedPage.goto(app + "#/admin");
  await deniedPage
    .getByRole("alert")
    .filter({ hasText: "此账户没有后台权限" })
    .waitFor();
  assert.equal(
    await deniedPage.getByRole("navigation", { name: "后台导航" }).count(),
    0,
  );
  // Exercise actual backend persistence through the real achievement form.
  stage = "real-achievement-form";
  await page.getByRole("link", { name: "我的成就", exact: true }).click();
  await page.getByLabel("成就名称").fill("M1-QA-UI-临时验收记录");
  await page.getByLabel("点亮状态").selectOption("unlocked");
  await page.getByLabel("达成日期", { exact: true }).fill("2025-01-01");
  await page.getByRole("button", { name: "添加成就", exact: true }).click();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "M1-QA-UI-临时验收记录",
      exact: true,
    }),
  });
  await card.waitFor();
  stage = "real-form-reload";
  await page.reload();
  await card.waitFor();
  stage = "real-form-revoke";
  await card.getByRole("button", { name: "撤销点亮", exact: true }).click();
  await card.getByText("等待点亮", { exact: false }).waitFor();
  stage = "real-form-delete";
  page.on("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "删除", exact: true }).click();
  await card.waitFor({ state: "detached" });
  console.log("PASS LIVE real achievement create, reload, revoke and delete");
  stage = "owner-logout";
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(/#\/login$/);
  await page.waitForFunction(
    () => sessionStorage.getItem("six-pillars-auth-v1") === null,
    {},
    { timeout: 30000 },
  );
  await otherClient.auth.signOut({ scope: "local" });
  const report = {
    ownerEmailLinkLogin: true,
    ownerReload: true,
    mobileRestoration: true,
    nonOwnerAuth: true,
    nonOwnerRouteDenied: true,
    realAchievementForm: true,
    ownerLogout: true,
    ...result,
  };
  await writeFile(
    resolve(qa, "live-results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ ...report, checks: undefined }));
  await rm(resolve(input, "nonowner-password.local"));
  await rm(savedSession);
} catch {
  try {
    const form = page?.locator(".private-panel.private-form");
    if (form && (await form.count()) === 1)
      await form.screenshot({ path: resolve(qa, "live-form-failure.png") });
  } catch {
    /* no raw errors */
  }
  // Keep all credential-bearing error objects and navigation URLs out of logs.
  console.error(
    `LIVE_CHECK_FAILED at ${stage}: no credential-bearing error was logged.`,
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
