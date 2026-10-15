import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanCallbackURL, hasAuthFragment } from "./authURL";
const mock = vi.hoisted(() => ({ setSession: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth: mock } }));
import { completeAuthCallback } from "./authCallback";
const replace = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BASE_URL", "/six-pillars/");
  vi.stubGlobal("window", {
    location: {
      hash: "#access_token=synthetic&refresh_token=synthetic-refresh",
      origin: "https://example.invalid",
    },
    history: { replaceState: replace },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
test.each(["#access_token=x", "#error=expired", "#refresh_token=x"])(
  "recognizes auth fragment %s",
  (hash) => expect(hasAuthFragment(hash)).toBe(true),
);
test.each(["#/admin", "#/projects?access_token=x", "#/pillars/ai", ""])(
  "leaves app routes alone %s",
  (hash) => expect(hasAuthFragment(hash)).toBe(false),
);
test("canonical callback cleanup retains Pages base", () =>
  expect(cleanCallbackURL("https://example.invalid", "/six-pillars/")).toBe(
    "https://example.invalid/six-pillars/#/login",
  ));
test("removes credentials before asking SDK to validate and store session", async () => {
  mock.setSession.mockImplementation(async () => {
    expect(replace).toHaveBeenCalledTimes(1);
    return { data: { session: { user: { id: "synthetic" } } }, error: null };
  });
  expect(await completeAuthCallback()).toBe(false);
  expect(replace).toHaveBeenCalledWith(
    null,
    "",
    "https://example.invalid/six-pillars/#/login",
  );
});
test("failed callback always removes tokens and error parameters", async () => {
  mock.setSession.mockRejectedValue(new Error("private error"));
  expect(await completeAuthCallback()).toBe(true);
  expect(replace).toHaveBeenCalledTimes(1);
});
