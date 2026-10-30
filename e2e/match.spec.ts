import { expect, test } from "./support/test";
import { addMatch, scoreFirstGame, SEEDED, unique } from "./support/app";
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
