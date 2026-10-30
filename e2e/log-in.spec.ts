import { expect, test } from "@playwright/test";
import { go, logIn } from "./support/app";

test("a seeded user logs in and logs out", async ({ page }) => {
  await logIn(page);

  await go(page, "/profile");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/auth\/login/);

  // The session is gone: a signed-in page sends you back to the login form.
  await page.goto("/home");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
