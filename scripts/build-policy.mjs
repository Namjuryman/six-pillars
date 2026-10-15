// Pure policy: tests never need any real Supabase settings.
import approvedProject from "../config/approved-data-project.json" with { type: "json" };
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
  // Match the owner's explicit project approval; environment values alone cannot
  // silently select another database. Only public client identifiers are accepted.
  if (
    !/^[a-z]{20}$/.test(ref) ||
    ref !== approvedProject.projectRef ||
    url !== `https://${ref}.supabase.co` ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  )
    throw new Error(
      "Private Pages build requires owner-approved project ref, matching URL and publishable key; secret keys are forbidden",
    );
  return { url, key, outDir: "pages-dist" };
}
