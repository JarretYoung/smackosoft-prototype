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
