import { defineConfig, devices } from "@playwright/test";

/**
 * Tests against the app and the local Supabase stack you already run.
 * 127.0.0.1 matters: Supabase links in emails point at its Site URL, and next.config.ts only
 * lets the dev server hydrate pages opened on that address. Cookies are per host too.
 * Locally the tests never start a server or reset the database. See e2e/global-setup.ts.
 *
 * Projects:
 * - setup logs in the seeded users once and saves their cookies to e2e/.auth.
 * - mobile runs every spec as Ian, in Kuala Lumpur time.
 * - tz-* rerun only the specs that depend on the browser timezone, in other zones.
 */

/** Specs whose result depends on the browser timezone. */
const TIME_SPECS = /session-times\.spec\.ts/;

const phone = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } };

const inZone = (name: string, timezoneId: string) => ({
  name,
  testMatch: TIME_SPECS,
  dependencies: ["setup"],
  // The product is mobile first, so every test runs at phone size.
  use: { ...phone, timezoneId, storageState: "e2e/.auth/ian.json" },
});

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One worker: every test shares one local Supabase and its small hourly email limit.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A test that passes only on retry is flaky, so CI fails it. The retry still leaves a trace.
  failOnFlakyTests: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  // In CI nobody runs a server, so Playwright builds and starts the production one.
  // Locally you run `pnpm dev` yourself and the config never starts anything.
  webServer: process.env.CI
    ? {
        command: "pnpm build && pnpm start --hostname 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000/auth/login",
        reuseExistingServer: false,
        timeout: 300_000,
      }
    : undefined,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "mobile",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...phone, timezoneId: "Asia/Kuala_Lumpur", storageState: "e2e/.auth/ian.json" },
    },
    inZone("tz-los-angeles", "America/Los_Angeles"),
    inZone("tz-london", "Europe/London"),
    inZone("tz-auckland", "Pacific/Auckland"),
  ],
});
