import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
const mock = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}));
vi.mock("./supabase", () => ({
  configured: true,
  supabase: { auth: mock, from: mock.from },
}));
import { sendSignInLink, restore, ownerAllowed, logout } from "./privateApi";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BASE_URL", "/six-pillars/");
  vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:5173" } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("official auth SDK adapter", () => {
  test("sign-in link uses canonical app base and never enables signup", async () => {
    mock.signInWithOtp.mockResolvedValue({ error: null });
    await sendSignInLink(" owner@example.invalid ");
    expect(mock.signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.invalid",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://127.0.0.1:5173/six-pillars/",
      },
    });
  });
  test("does not enumerate unknown email", async () => {
    mock.signInWithOtp.mockResolvedValue({
      error: { status: 422, message: "unknown" },
    });
    await expect(
      sendSignInLink("unknown@example.invalid"),
    ).resolves.toBeUndefined();
  });
  test("rate limit has a safe message", async () => {
    mock.signInWithOtp.mockResolvedValue({
      error: { status: 429, message: "sensitive" },
    });
    await expect(sendSignInLink("owner@example.invalid")).rejects.toThrow(
      "发送过于频繁",
    );
  });
  test("does not trust cached user without server validation", async () => {
    mock.getSession.mockResolvedValue({
      data: { session: { user: { id: "owner" } } },
      error: null,
    });
    mock.getUser.mockResolvedValue({
      data: { user: { id: "other" } },
      error: null,
    });
    await expect(restore()).rejects.toThrow("登录验证失败");
  });
  test("guest requires no server user lookup", async () => {
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await restore()).toBeNull();
    expect(mock.getUser).not.toHaveBeenCalled();
  });
  test("validated owner can restore", async () => {
    mock.getSession.mockResolvedValue({
      data: { session: { user: { id: "owner" } } },
      error: null,
    });
    mock.getUser.mockResolvedValue({
      data: { user: { id: "owner" } },
      error: null,
    });
    expect(await restore()).toEqual({ id: "owner" });
  });
  test("empty whitelist denies access", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mock.from.mockReturnValue(query);
    expect(await ownerAllowed("other")).toBe(false);
    expect(query.eq).toHaveBeenCalledWith("user_id", "other");
  });
  test("logout uses SDK local scope", async () => {
    mock.signOut.mockResolvedValue({ error: null });
    await logout();
    expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
