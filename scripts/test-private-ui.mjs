import { spawnSync } from "node:child_process";
// Separate build with fake, reserved .invalid host. Never uses real project credentials.
const env = {
  ...process.env,
  VITE_SUPABASE_URL: "https://m1-ui-tests.supabase.invalid",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_ui_test_only",
  E2E_PRIVATE_MOCKS: "1",
};
const cli = (path, args) => {
  const result = spawnSync(process.execPath, [path, ...args], {
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
cli("node_modules/vite/bin/vite.js", ["build", "--outDir", ".m1-ui-dist"]);
cli("node_modules/@playwright/test/cli.js", ["test", ...process.argv.slice(2)]);
