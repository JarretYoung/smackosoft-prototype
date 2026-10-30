import { expect, test } from "./support/test";
import { createSession, unique } from "./support/app";

test("a user creates a session", async ({ page }) => {
  const name = `E2e session ${unique()}`;

  await createSession(page, { name });

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("No matches yet")).toBeVisible();
});
