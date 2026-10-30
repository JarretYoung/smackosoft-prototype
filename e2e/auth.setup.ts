import { logIn, SEEDED, VIEWER } from "./support/app";
import { expect, test as setup } from "./support/test";

/**
 * Log in each seeded user once per run and keep the cookies, so specs start signed in.
 * The log in flow itself is tested in log-in.spec.ts.
 */
for (const [file, user] of [
  ["ian", SEEDED],
  ["nadree", VIEWER],
] as const) {
  setup(`log in as ${file}`, async ({ page }) => {
    await logIn(page, user);
    await expect(page).toHaveURL(/\/home/);
    await page.context().storageState({ path: `e2e/.auth/${file}.json` });
  });
}
