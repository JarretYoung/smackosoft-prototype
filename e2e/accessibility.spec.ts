import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { createSession, go, unique } from "./support/app";
import { expect, test } from "./support/test";

/**
 * Runs axe-core on the main screens and fails on serious or critical violations.
 * Lesser impacts (minor, moderate) are not checked. No rule or element is excluded.
 * Automated checks find part of the problems, so they do not replace a manual pass.
 */
async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n")}`);
}

const SIGNED_IN_SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: "home", open: (page) => go(page, "/home") },
  { name: "sessions list", open: (page) => go(page, "/sessions") },
  {
    name: "session details",
    open: async (page) => {
      await createSession(page, { name: `E2e a11y ${unique()}`, times: { start: "19:00", end: "21:00" } });
      // The time range shows once the page has hydrated.
      await expect(page.getByText("7:00 pm to 9:00 pm")).toBeVisible();
    },
  },
  { name: "session form", open: (page) => go(page, "/sessions/new") },
  { name: "profile", open: (page) => go(page, "/profile") },
];

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the log in screen has no serious accessibility violations", async ({ page }) => {
    await go(page, "/auth/login");
    expect(await seriousViolations(page)).toEqual([]);
  });
});

for (const screen of SIGNED_IN_SCREENS) {
  test(`the ${screen.name} screen has no serious accessibility violations`, async ({ page }) => {
    await screen.open(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
}
