import { expect, test } from "./support/test";
import { go, unique } from "./support/app";

test("a user imports a playlist file, links a name, and sees the games in a session", async ({ page }) => {
  const id = unique();
  // Names are capital then lowercase letters only, and unique to this run, so no earlier guest matches them.
  const tag = [...id].map((c) => String.fromCharCode(97 + (parseInt(c, 36) % 26))).join("");
  const [ann, bob, cat] = [`Ann${tag}`, `Bob${tag}`, `Cat${tag}`];
  // A far away day with a name of its own, so a re-run never meets an earlier import.
  const day = `2031-0${1 + (parseInt(id, 36) % 9)}-1${parseInt(id[0], 36) % 9}`;
  const video = (n: number) => `https://youtu.be/e2e${id}${String(n).padStart(2, "0")}`.slice(0, 28);
  const csv = [
    "date,session,match,title,url",
    `${day},E2e import ${id},1,24 Oct ${ann} vs ${bob},${video(1)}`,
    `${day},E2e import ${id},1,24 Oct ${bob} vs ${ann},${video(2)}`,
    `${day},E2e import ${id},,24 Oct ${ann} vs ${cat},${video(3)}`,
  ].join("\n");

  await go(page, "/import");
  await page.getByLabel("Choose a CSV file").setInputFiles({ name: "games.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("has 3 games in 1 session, with 3 names")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Every name starts as a new guest. Linking one changes only that row.
  await expect(page.getByRole("heading", { name: "Who is who?" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`${ann}.*New guest`) }).click();
  const sheet = page.getByRole("dialog").filter({ hasText: `Who is ${ann}?` });
  await sheet.getByRole("button", { name: /Izaaq Izham/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(`${ann}.*@izaaq`) })).toBeVisible();

  await page.getByRole("button", { name: "Check the import" }).click();
  await expect(page.getByRole("heading", { name: "Ready to import" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("2 new guests");

  await page.getByRole("button", { name: "Import 3 games" }).click();
  await expect(page.getByText("Imported 3 games")).toBeVisible();

  // The session is there, in the file's order: the match first, then the game on its own.
  await page.getByRole("link", { name: "View sessions" }).click();
  await page.getByRole("link", { name: new RegExp(`E2e import ${id}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2e import ${id}` })).toBeVisible();
  await expect(page.getByText("Match 1").first()).toBeVisible();
  await expect(page.getByText("Game 1").first()).toBeVisible();
});

test("a file with a bad row says which line and imports nothing", async ({ page }) => {
  const csv = ["date,title,url", "24/10/2026,24 Oct Ann vs Bob,https://youtu.be/aaaaaaaaaaa"].join("\n");
  await go(page, "/import");
  await page.getByLabel("Choose a CSV file").setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("Line 2")).toBeVisible();
  await expect(page.getByText(/YYYY-MM-DD/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});
