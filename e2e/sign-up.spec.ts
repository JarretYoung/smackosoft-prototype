import { expect, test } from "@playwright/test";
import { go, unique } from "./support/app";
import { confirmationLinkFor } from "./support/mailpit";

test("a new person signs up, confirms the email and onboards", async ({ page }) => {
  const id = unique();
  const email = `e2e-${id}@smacko.test`;

  await go(page, "/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-pass-123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.waitForURL(/\/auth\/sign-up-success/);

  // Local Supabase has email confirmation on, so the account waits for the link in the email.
  await page.goto(await confirmationLinkFor(email));
  await page.waitForURL(/\/onboarding/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Display name").fill(`E2e ${id}`);
  await page.getByLabel("Handle").fill(`e2e${id}`);
  await expect(page.getByText(`@e2e${id} is available`)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL(/\/home/);
});
