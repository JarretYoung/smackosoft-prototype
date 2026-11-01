import { go } from "./support/app";
import { expect, test } from "./support/test";

// Nadree is a viewer on the seeded session "Badminton with da Laddies". See docs/runbook.md.
test.use({ storageState: "e2e/.auth/nadree.json" });

const SESSION = "Badminton with da Laddies";

test("a viewer can read a session but not change it", async ({ page }) => {
  await go(page, "/sessions");
  await page.getByRole("link", { name: new RegExp(SESSION) }).click();
  await expect(page.getByRole("heading", { level: 1, name: SESSION })).toBeVisible();
  const sessionId = new URL(page.url()).pathname.split("/").pop()!;

  // The menu offers what a viewer may do, and nothing that edits or deletes.
  await page.getByRole("button", { name: "Session menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Videos" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Leave session" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit session" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Delete session" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Matches show, but there is no way into the score editor.
  await expect(page.getByRole("heading", { level: 2, name: "Matches" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add a game" })).toHaveCount(0);

  // Members open in a read-only list: the only control is the close button.
  await page.getByRole("button", { name: /Members/ }).click();
  const members = page.getByRole("dialog", { name: "Members" });
  await expect(members.getByRole("listitem").filter({ hasText: "Ian Chong" })).toContainText("Owner");
  await expect(members.getByRole("listitem").filter({ hasText: "Nadree Omar" })).toContainText("Viewer");
  await expect(members.getByRole("button")).toHaveCount(1);
  await expect(members.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(members.getByRole("combobox")).toHaveCount(0);
  await page.keyboard.press("Escape");

  // The edit page answers as if it did not exist, and the answer holds after a reload.
  await page.goto(`/sessions/${sessionId}/edit`);
  await expect(page.getByText("We could not find that")).toBeVisible();
  await page.reload();
  await expect(page.getByText("We could not find that")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);
});
