import { go, SEEDED, STRONG_PASSWORD } from "./support/app";
import { expect, test } from "./support/test";

// These specs test the signed out forms, so they start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD_RULE = "Use at least 8 characters with a lowercase letter, an uppercase letter and a number.";

test("a wrong password is explained under the password field", async ({ page }) => {
  await go(page, "/auth/login");
  const password = page.getByLabel("Password", { exact: true });
  await page.getByLabel("Email").fill(SEEDED.email);
  await password.fill("Not-the-password-1");
  await page.getByRole("button", { name: "Log in" }).click();

  const problem = page.getByRole("alert").filter({ hasText: "That email and password do not match" });
  await expect(problem).toBeVisible();
  await expect(password).toBeFocused();
  await expect(page).toHaveURL(/\/auth\/login/);

  // Typing again clears the message.
  await password.fill("Another-try-1");
  await expect(problem).toBeHidden();

  // Nothing was signed in: a signed in page still sends you back to the form.
  await page.goto("/home");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("sign up rejects a weak password and an email that already has an account", async ({ page }) => {
  await go(page, "/auth/sign-up");
  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password", { exact: true });
  const rule = page.getByRole("alert").filter({ hasText: PASSWORD_RULE });

  await email.fill("e2e-weak@smacko.test");
  for (const weak of ["short1A", "alllowercase1", "NOLOWERCASE1", "NoDigitsHere"]) {
    await password.fill(weak);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(rule, `"${weak}" should be rejected`).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up$/);
  }

  // A strong password for an address that is taken: the problem sits under the email.
  await email.fill(SEEDED.email);
  await password.fill(STRONG_PASSWORD);
  await expect(rule).toBeHidden();
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "There is already an account with that email" })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
});
