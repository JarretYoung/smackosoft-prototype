import { go, logIn } from "./support/app";
import { expect, test } from "./support/test";

// This spec tests logging in, so it starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test("a seeded user logs in and logs out", async ({ page }) => {
  await logIn(page);

  await go(page, "/profile");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  // The session is gone: a signed-in page sends you back to the login form.
  await page.goto("/home");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
