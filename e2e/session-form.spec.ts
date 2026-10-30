import { go, unique } from "./support/app";
import { createSession } from "./support/db";
import { todayIso } from "./support/time";
import { expect, test } from "./support/test";

test("an empty name is flagged, focused and fixed by typing one", async ({ page }) => {
  const name = `E2e validation ${unique()}`;
  await go(page, "/sessions/new");
  const nameField = page.getByLabel("Name", { exact: true });

  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByText("Give the session a name")).toBeVisible();
  await expect(nameField).toBeFocused();
  await expect(nameField).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/sessions\/new$/);

  // The message goes away as soon as the name is fine.
  await nameField.fill(name);
  await expect(page.getByText("Give the session a name")).toBeHidden();

  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("leaving an edited session asks before it throws the changes away", async ({ page }) => {
  const name = `E2e discard ${unique()}`;
  const sessionId = await createSession({ label: name, date: todayIso() });
  await go(page, `/sessions/${sessionId}/edit`);
  const nameField = page.getByLabel("Name", { exact: true });

  // Nothing changed, so Back leaves at once.
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}$`));

  await go(page, `/sessions/${sessionId}/edit`);
  await nameField.fill(`${name} changed`);
  await page.getByRole("link", { name: "Back" }).click();

  const prompt = page.getByRole("alertdialog", { name: "Discard your changes?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Keep editing" }).click();
  await expect(prompt).toBeHidden();
  await expect(nameField).toHaveValue(`${name} changed`);
  await expect(page).toHaveURL(/\/edit$/);

  await page.getByRole("link", { name: "Back" }).click();
  await page.getByRole("alertdialog", { name: "Discard your changes?" }).getByRole("button", { name: "Discard" }).click();
  await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}$`));

  // The change was thrown away for good.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("a saved edit is still there after a reload", async ({ page }) => {
  const name = `E2e save ${unique()}`;
  const renamed = `${name} renamed`;
  const sessionId = await createSession({ label: name, date: todayIso() });
  await go(page, `/sessions/${sessionId}/edit`);

  // Save waits for a change.
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await page.getByLabel("Name", { exact: true }).fill(renamed);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
  await go(page, `/sessions/${sessionId}/edit`);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(renamed);
});
