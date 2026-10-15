import { describe, expect, test } from "vitest";
import { buildConfig } from "../scripts/build-policy.mjs";
const approved = {
  PRODUCTION_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  PRODUCTION_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_public_identifier",
};
describe("Pages environment isolation", () => {
  test.each(["isolated", "public"])(
    "%s discards inherited and production values",
    (mode) => {
      expect(
        buildConfig(mode, {
          ...approved,
          VITE_SUPABASE_URL: "https://untrusted.invalid",
          VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_forbidden",
        }),
      ).toMatchObject({ url: "", key: "" });
    },
  );
  test("UI mocks always use a reserved nonexistent host", () => {
    expect(buildConfig("mock", approved).url).toBe(
      "https://m1-ui-tests.supabase.invalid",
    );
  });
  test("private release requires all matching explicit settings", () => {
    expect(buildConfig("private", approved)).toMatchObject({
      url: approved.PRODUCTION_SUPABASE_URL,
      outDir: "pages-dist",
    });
    for (const key of Object.keys(approved)) {
      expect(() =>
        buildConfig("private", { ...approved, [key]: "" }),
      ).toThrow();
    }
  });
  test.each([
    { PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "sb_secret_forbidden" },
    { PRODUCTION_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiJ9.legacy.jwt" },
    { PRODUCTION_SUPABASE_URL: "https://other.supabase.co" },
    {
      PRODUCTION_SUPABASE_PROJECT_REF: "rplgwjhnptappdbwqygj",
      PRODUCTION_SUPABASE_URL: "https://rplgwjhnptappdbwqygj.supabase.co",
    },
  ])(
    "rejects secrets, legacy JWT, wrong ref and development project: %j",
    (overrides) => {
      expect(() =>
        buildConfig("private", { ...approved, ...overrides }),
      ).toThrow();
    },
  );
  test("unknown mode cannot silently choose a live build", () => {
    expect(() => buildConfig("unknown", approved)).toThrow();
  });
});
