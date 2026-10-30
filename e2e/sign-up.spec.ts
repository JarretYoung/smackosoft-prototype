import { onboard, signUp, STRONG_PASSWORD, unique } from "./support/app";
import { confirmationLinkFor } from "./support/mailpit";
import { expect, test } from "./support/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("a new person signs up, confirms the email and onboards", async ({ page }) => {
  const id = unique();
  const email = `e2e-${id}@smacko.test`;

  await signUp(page, { email, password: STRONG_PASSWORD });

  // Local Supabase has email confirmation on, so the account waits for the link in the email.
  await page.goto(await confirmationLinkFor(email));
  await expect(page).toHaveURL(/\/onboarding/);

  await onboard(page, { name: `E2e ${id}`, handle: `e2e${id}` });
});
