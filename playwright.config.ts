import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const deployedURL = process.env.E2E_BASE_URL;
const baseURL = deployedURL ?? "http://127.0.0.1:4173/six-pillars/";
if (new URL(baseURL).pathname !== "/six-pillars/") {
  throw new Error(
    "E2E_BASE_URL must include the /six-pillars/ base path and trailing slash.",
  );
}
const output = process.env.E2E_OUTPUT_DIR ?? "test-results";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: resolve(output, "artifacts"),
  reporter: [
    ["line"],
    ["json", { outputFile: resolve(output, "results.json") }],
  ],
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  use: {
    baseURL,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: deployedURL
    ? undefined
    : {
        command: "npm run preview -- --port 4173 --strictPort",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
