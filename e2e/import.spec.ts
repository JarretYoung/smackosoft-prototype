import { expect, test } from "./support/test";
import { go, logIn, unique } from "./support/app";

test("a user imports a playlist file, links a name, and sees the games in a session", async ({ page }) => {
  const id = unique();
  // Names are capital then lowercase letters only, and unique to this run, so no earlier guest matches them.
  const tag = [...id].map((c) => String.fromCharCode(97 + (parseInt(c, 36) % 26))).join("");
  const [ann, bob, cat] = [`Ann${tag}`, `Bob${tag}`, `Cat${tag}`];
  // A far away day with a name of its own, so a re-run never meets an earlier import.
  const day = `2031-0${1 + (parseInt(id, 36) % 9)}-1${parseInt(id[0], 36) % 9}`;
  const video = (n: number) => `https://youtu.be/e2e${id}${String(n).padStart(2, "0")}`.slice(0, 28);
  const csv = [
    "date,session,match,game,title,url",
    `${day},E2e import ${id},1,1,24 Oct ${ann} vs ${bob},${video(1)}`,
    `${day},E2e import ${id},1,2,24 Oct ${bob} vs ${ann},${video(2)}`,
    `${day},E2e import ${id},,,24 Oct ${ann} vs ${cat},${video(3)}`,
  ].join("\n");

  await go(page, "/import");
  await page.getByLabel("Choose CSV files").setInputFiles({ name: "games.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const holds = page.getByRole("region", { name: "In this import" });
  await expect(holds).toContainText("with a video");
  await expect(holds).toContainText("Unlinked video");
  await page.getByRole("button", { name: "Continue" }).click();

  // The names are asked about one at a time, the most games first. Ann is Izaaq: search and tap. The rest stay guests.
  await expect(page.getByRole("heading", { name: `Who is ${ann}?` })).toBeVisible();
  await page.getByLabel("Search people").fill("Izaaq");
  await page.getByRole("button", { name: /Izaaq Izham/ }).click();
  await expect(page.getByRole("heading", { name: `Who is ${bob}?` })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: `Who is ${cat}?` })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  // The review lists every name, and Ann is now Izaaq.
  await expect(page.getByRole("heading", { name: "Who is who?" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`Izaaq Izham.*@izaaq.*imported from “${ann}”`) })).toBeVisible();

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

test("two names in the file can be linked to the same person", async ({ page }) => {
  const id = unique();
  const tag = [...id].map((c) => String.fromCharCode(97 + (parseInt(c, 36) % 26))).join("");
  const [wen, soong, bob] = [`Wen${tag}`, `Soong${tag}`, `Bob${tag}`];
  const day = `2032-0${1 + (parseInt(id, 36) % 9)}-1${parseInt(id[0], 36) % 9}`;
  const video = (n: number) => `https://youtu.be/e2e${id}${String(n).padStart(2, "0")}`.slice(0, 28);
  const csv = [
    "date,session,match,game,title,url",
    `${day},E2e alias ${id},1,1,24 Oct ${wen} vs ${bob},${video(1)}`,
    `${day},E2e alias ${id},1,2,24 Oct ${bob} vs ${soong},${video(2)}`,
  ].join("\n");

  await go(page, "/import");
  await page.getByLabel("Choose CSV files").setInputFiles({ name: "games.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Continue" }).click();

  // Bob has the most games, so he is asked first and stays a guest. Wen and Soong are both Izaaq.
  await expect(page.getByRole("heading", { name: `Who is ${bob}?` })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  for (const name of [wen, soong]) {
    await expect(page.getByRole("heading", { name: `Who is ${name}?` })).toBeVisible();
    await page.getByLabel("Search people").fill("Izaaq");
    await page.getByRole("button", { name: /Izaaq Izham/ }).click();
  }
  // Both names are one row, and it says where each came from.
  await expect(page.getByRole("button", { name: new RegExp(`Izaaq Izham.*@izaaq.*imported from “(${wen}, ${soong}|${soong}, ${wen})”`) })).toBeVisible();

  await page.getByRole("button", { name: "Check the import" }).click();
  await expect(page.getByRole("heading", { name: "Ready to import" })).toBeVisible();
  // One match with two games, and only Bob is new.
  await expect(page.getByRole("main")).toContainText("1 new guest");
  await page.getByRole("button", { name: "Import 2 games" }).click();
  await expect(page.getByText("Imported 2 games")).toBeVisible();
});

test("a file of only unlinked videos skips the people step", async ({ page }) => {
  const id = unique();
  const csv = ["date,title,url,kind", `2033-03-03,Top view ${id},https://youtu.be/e2e${id}01,video`].join("\n");
  await go(page, "/import");
  await page.getByLabel("Choose CSV files").setInputFiles({ name: "videos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Continue" }).click();
  // Nobody is named, so there is no one to ask about. It goes straight to the check.
  await expect(page.getByRole("heading", { name: "Ready to import" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import 1 unlinked video" })).toBeVisible();
});

test("a user finds the import in the Sessions menu and can go back to Sessions", async ({ page }) => {
  await go(page, "/sessions");
  await page.getByRole("button", { name: "Sessions menu" }).click();
  await page.getByRole("menuitem", { name: "Import games" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Import games" })).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sessions" })).toBeVisible();
});

test.describe("a new person with no sessions", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is offered the import next to New session", async ({ page, newUser }) => {
    await logIn(page, newUser);
    await go(page, "/sessions");
    await expect(page.getByText("No sessions yet")).toBeVisible();
    await page.getByRole("link", { name: "Import games" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Import games" })).toBeVisible();
  });
});

test("a file with a bad row says which line and imports nothing", async ({ page }) => {
  const csv = ["date,title,url", "24/10/2026,24 Oct Ann vs Bob,https://youtu.be/aaaaaaaaaaa"].join("\n");
  await go(page, "/import");
  await page.getByLabel("Choose CSV files").setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("Line 2")).toBeVisible();
  await expect(page.getByText(/YYYY-MM-DD/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});
