import { expect, test } from "./support/test";
import { addMatch, go, scoreFirstGame, SEEDED, unique } from "./support/app";
import { accountOf, createGuest, createSession } from "./support/db";
import { todayIso } from "./support/time";

test("a user scores a match with two teams and a game", async ({ page }) => {
  const id = unique();
  const guest = `Bob${id}`;
  const ownerId = await accountOf(SEEDED.handle);
  const sessionId = await createSession({
    ownerId,
    label: `E2e match ${id}`,
    date: todayIso(),
    members: [await createGuest(ownerId, guest)],
  });

  await addMatch(page, sessionId);

  await page.getByRole("button", { name: "Edit Team 1 players" }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: new RegExp(SEEDED.name) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Edit Team 2 players" }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: new RegExp(guest) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();

  await scoreFirstGame(page, { team1: "21", team2: "15" });

  // Saving moves on to the match details.
  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]{36}$/);
  await expect(page.getByText("21", { exact: true }).first()).toBeVisible();
});

test("a game on its own starts with its game and shows its points, with no way to add a second", async ({ page }) => {
  const sessionId = await createSession({ ownerId: await accountOf(SEEDED.handle), label: `E2e game ${unique()}`, date: todayIso() });

  await go(page, `/sessions/${sessionId}/matches/edit`);
  await page.getByRole("button", { name: "Add a game or match" }).click();
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\/edit\?m=/);

  await expect(page.getByRole("button", { name: "Add game" })).toHaveCount(0);
  await page.getByLabel("Team 1 score for game 1").fill("21");
  await page.getByLabel("Team 2 score for game 1").fill("17");
  await page.getByRole("button", { name: "Save game" }).click();

  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Game", exact: true })).toBeVisible();
  await expect(page.getByText("21", { exact: true }).first()).toBeVisible();
});
