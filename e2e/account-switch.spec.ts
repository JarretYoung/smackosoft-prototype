import { go, logIn, SEEDED, VIEWER } from "./support/app";
import { expect, test } from "./support/test";

// The tabs are cached in the browser, so a second person on the same browser must never see the
// first person's pages. The cache only exists in a production build, so this guards CI most.
test.use({ storageState: { cookies: [], origins: [] } });

test("a second person on the same browser sees none of the first person's pages", async ({ page }) => {
  await logIn(page);
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(page.getByRole("heading", { level: 1, name: SEEDED.name })).toBeVisible();

  // Visit every tab so the browser holds Ian's copy of each.
  await tabs.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sessions" })).toBeVisible();
  await tabs.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: SEEDED.name })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await logIn(page, VIEWER);
  await expect(page.getByRole("heading", { level: 1, name: VIEWER.name })).toBeVisible();
  await expect(page.getByText(SEEDED.name, { exact: true })).toHaveCount(0);

  await tabs.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: VIEWER.name })).toBeVisible();
  await expect(page.getByText(`@${SEEDED.handle}`)).toHaveCount(0);

  // Going straight to a tab loads the same person's data, not a leftover.
  await go(page, "/home");
  await expect(page.getByRole("heading", { level: 1, name: VIEWER.name })).toBeVisible();
});
