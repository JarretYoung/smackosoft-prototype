import { defineConfig, devices } from "@playwright/test";

/**
 * Tests against the app and the local Supabase stack you already run.
 * 127.0.0.1 matters: Supabase links in emails point at its Site URL, and next.config.ts only
 * lets the dev server hydrate pages opened on that address. Cookies are per host too.
 * The tests never start a server or reset the database. See e2e/global-setup.ts.
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
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
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
