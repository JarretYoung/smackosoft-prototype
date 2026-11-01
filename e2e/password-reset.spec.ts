import { go, logIn } from "./support/app";
import { resetLinkFor } from "./support/mailpit";
import { expect, test } from "./support/test";

// The person resets a password while signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const NEW_PASSWORD = "Reset-pass-456";

test("a person resets a forgotten password from the email link", async ({ page, newUser }) => {
  await go(page, "/auth/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password/);
  await page.getByLabel("Email").fill(newUser.email);
  await page.getByRole("button", { name: "Send reset email" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // The link in the email signs the person in just enough to choose a new password.
  await page.goto(await resetLinkFor(newUser.email));
  await expect(page).toHaveURL(/\/auth\/update-password/);

  await page.getByLabel("New password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/home/);

  // The new password is the one that works from now on, not only in this browser session.
  await go(page, "/profile");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("Email").fill(newUser.email);
  await page.getByLabel("Password", { exact: true }).fill(newUser.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "That email and password do not match" })).toBeVisible();

  await logIn(page, { email: newUser.email, password: NEW_PASSWORD });
  await expect(page.getByRole("heading", { name: newUser.name })).toBeVisible();
});
