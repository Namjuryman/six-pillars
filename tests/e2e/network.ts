import { test as base, expect } from "@playwright/test";

// Installed on every context, including popups. Requests outside the test origin
// are blocked before leaving the browser; private mocks are a reserved .invalid host.
export const test = base.extend<{ networkIsolation: void }>({
  networkIsolation: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL!).origin;
      const blocked: string[] = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          url.origin === origin ||
          (process.env.E2E_PRIVATE_MOCKS === "1" &&
            url.origin === "https://m1-ui-tests.supabase.invalid")
        )
          return route.continue();
        blocked.push(url.origin);
        await route.abort("blockedbyclient");
      });
      await use();
      expect(
        blocked,
        "No requests to production or other external services",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
