import { expect, test } from "@playwright/test";
import { addMatch, createSession, go, logIn, scoreFirstGame, unique } from "./support/app";

test("a user adds a video to a game and syncs it", async ({ page }) => {
  const id = unique();
  const label = `Court ${id}`;
  await logIn(page);
  const sessionId = await createSession(page, { name: `E2e video ${id}` });
  await addMatch(page, sessionId);
  await scoreFirstGame(page, { team1: "21", team2: "15" });

  await go(page, `/sessions/${sessionId}/videos`);
  await page.getByRole("group", { name: "Game 1" }).getByRole("button", { name: "Add video" }).click();
  await page.getByRole("button", { name: "New video" }).click();

  const add = page.getByRole("dialog").filter({ hasText: "Paste a link" });
  await add.getByLabel("Name", { exact: true }).fill(label);
  await add.getByLabel("Video link").fill(`https://example.com/${id}.mp4`);
  await add.getByRole("button", { name: "Add video" }).click();
  await expect(page.getByText("Video added")).toBeVisible();

  // A new video in a game opens the sync sheet straight away.
  const sync = page.getByRole("dialog").filter({ hasText: "Sync video" });
  await sync.getByLabel("Sync point").fill("1:30");
  await sync.getByLabel("Sync point").blur();
  await sync.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Sync point saved")).toBeVisible();

  await expect(page.getByRole("group", { name: "Game 1" }).getByText(label)).toBeVisible();
  await expect(page.getByText(/Synced at 1:30/)).toBeVisible();
});
