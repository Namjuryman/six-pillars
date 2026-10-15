// Pure policy: tests never need any real Supabase settings.
export function buildConfig(mode, env = {}) {
  if (mode === "isolated" || mode === "public")
    return {
      url: "",
      key: "",
      outDir: mode === "public" ? "pages-dist" : "dist",
    };
  if (mode === "mock")
    return {
      url: "https://m1-ui-tests.supabase.invalid",
      key: "sb_publishable_mock_ui_test_only",
      outDir: ".m1-ui-dist",
    };
  if (mode !== "private") throw new Error("Unknown build mode");
  const ref = env.PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  const url = env.PRODUCTION_SUPABASE_URL ?? "";
  const key = env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY ?? "";
  // Require an explicit production identity; never silently deploy the DEV project.
  if (
    !/^[a-z]{20}$/.test(ref) ||
    ref === "rplgwjhnptappdbwqygj" ||
    url !== `https://${ref}.supabase.co` ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  )
    throw new Error(
      "Private Pages build requires approved production URL, matching project ref and publishable key; DEV/secret keys are forbidden",
    );
  return { url, key, outDir: "pages-dist" };
}
