import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the app and the local Supabase stack you already run.
 * 127.0.0.1 matters: Supabase links in emails point at its Site URL, and next.config.ts only
 * lets the dev server hydrate pages opened on that address. Cookies are per host too.
 * The tests never start a server or reset the database. See e2e/global-setup.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      // The product is mobile first, so every test runs at phone size.
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
});
