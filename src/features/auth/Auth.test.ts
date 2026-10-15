import { describe, expect, test } from "vitest";
import { validClientConfig } from "../../lib/supabase";
import { privateReturnPath } from "./Auth";
describe("client credential boundary", () => {
  test("accepts only HTTPS origin and modern publishable key", () =>
    expect(
      validClientConfig("https://dev.supabase.co", "sb_publishable_test_only"),
    ).toBe(true));
  test.each([
    "sb_secret_forbidden",
    "eyJhbGciOiJIUzI1NiJ9.service_role.signature",
    "",
    "service_role",
  ])("rejects privileged or legacy credentials %s", (key) =>
    expect(validClientConfig("https://dev.supabase.co", key)).toBe(false),
  );
  test.each([
    "http://dev.supabase.co",
    "https://user:pass@dev.supabase.co",
    "https://dev.supabase.co/path",
    "https://dev.supabase.co?key=value",
    "invalid",
  ])("rejects unsafe origins %s", (url) =>
    expect(validClientConfig(url, "sb_publishable_test")).toBe(false),
  );
});
describe("post-login destinations", () => {
  test.each(["/admin", "/admin/goals", "/admin/logs", "/admin/achievements"])(
    "allows %s",
    (path) => expect(privateReturnPath(path)).toBe(path),
  );
  test.each([
    "https://example.com",
    "//example.com",
    "/login",
    "/admin/../login",
    null,
    {},
  ])("rejects untrusted redirect %j", (path) =>
    expect(privateReturnPath(path)).toBe("/admin"),
  );
});
