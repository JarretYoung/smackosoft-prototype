import { go, unique } from "./support/app";
import { expect, test } from "./support/test";

test("a user creates a session with a guest member", async ({ page }) => {
  const id = unique();
  const name = `E2e session ${id}`;
  const guest = `Bob${id}`;

  await go(page, "/sessions/new");
  await page.getByLabel("Name", { exact: true }).fill(name);

  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByLabel("Search people").fill(guest);
  await page.getByRole("button", { name: new RegExp(`Add .${guest}. as a guest`) }).click();
  await page.getByRole("button", { name: /^Add 1$/ }).click();
  await expect(page.getByText(guest).first()).toBeVisible();

  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Nothing played yet")).toBeVisible();
});
