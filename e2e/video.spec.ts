import { expect, test } from "./support/test";
import { go, SEEDED, unique } from "./support/app";
import { accountOf, createMatch, createSession } from "./support/db";
import { todayIso } from "./support/time";

test("a user adds a video to a game and syncs it", async ({ page }) => {
  const id = unique();
  const label = `Court ${id}`;
  const ownerId = await accountOf(SEEDED.handle);
  const sessionId = await createSession({ ownerId, label: `E2e video ${id}`, date: todayIso() });
  await createMatch({ sessionId, createdBy: ownerId, games: [[21, 15]] });

  await go(page, `/sessions/${sessionId}/videos`);
  await page.getByRole("button", { name: "Add a video to Match 1 · Game 1" }).click();
  await page.getByRole("button", { name: "New video" }).click();

  const add = page.getByRole("dialog").filter({ hasText: "Paste a link" });
  await add.getByLabel("Name", { exact: true }).fill(label);
  await add.getByLabel("Video link").fill(`https://example.com/${id}.mp4`);
  await add.getByRole("button", { name: "Add video" }).click();
  await expect(page.getByText("Video added")).toBeVisible();

  // A new video in a game opens the sync sheet straight away.
  const sync = page.getByRole("dialog").filter({ hasText: "Sync video" });
  const offset = sync.getByRole("textbox", { name: "Sync point" });
  await offset.fill("1:30");
  await offset.blur();
  await sync.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Sync point saved")).toBeVisible();

  // The game's row has the video, and nothing is left to sync.
  await expect(page.getByRole("list", { name: "Games" }).getByRole("button", { name: `Play ${label}` })).toBeVisible();
  await expect(page.getByText(/need.* syncing/)).toHaveCount(0);
});

test("a playing video stops when a sheet opens over it and when the page is left", async ({ page }) => {
  // The seeded session has YouTube videos. Nothing here changes them.
  await go(page, "/sessions");
  await page.getByRole("link", { name: /Badminton with da Laddies/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Badminton with da Laddies" })).toBeVisible();
  const sessionId = new URL(page.url()).pathname.split("/").pop()!;
  const players = page.locator("iframe[src*='youtube.com/embed']");

  await go(page, `/sessions/${sessionId}/videos`);
  await page.getByRole("list", { name: "Games" }).getByRole("button", { name: "Play Court 3 full recording" }).first().click();
  await expect(players).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A sheet that has its own preview leaves one player, its own. The page player is gone, not just hidden.
  await page.getByRole("button", { name: "More for Court 3 full recording" }).first().click();
  await page.getByRole("menuitem", { name: /sync point/ }).click();
  await expect(page.getByRole("dialog").locator("iframe[src*='youtube.com/embed']")).toHaveCount(1);
  await expect(players).toHaveCount(1);

  // Closing the sheet leaves the page stopped. It does not start again by itself.
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(players).toHaveCount(0);

  // Leaving the page tears the player down. The page stays mounted but hidden, so it must not stay behind.
  await page.getByRole("list", { name: "Games" }).getByRole("button", { name: "Play Court 3 full recording" }).first().click();
  await expect(players).toHaveCount(1);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Badminton with da Laddies" })).toBeVisible();
  await expect(players).toHaveCount(0);
});
