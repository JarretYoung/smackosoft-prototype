import { expect, type Page } from "@playwright/test";

/** A seeded user. See the sample logins in docs/runbook.md. */
export const SEEDED = { email: "ian@smacko.test", password: "Password123", name: "Ian Chong" };

/** A short lowercase id, so every run makes data nobody else made. */
export const unique = () => Math.random().toString(36).slice(2, 8);

/**
 * Open a page and wait until it is interactive. Typing before React has hydrated is lost,
 * and the session form is rebuilt once it hydrates, so a short settle follows network idle.
 */
export async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
}

export async function logIn(page: Page, { email, password } = SEEDED) {
  await go(page, "/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/home/);
}

const SESSION_URL = /\/sessions\/[0-9a-f-]{36}$/;
const sessionIdOf = (url: string) => new URL(url).pathname.split("/").pop()!;

/** Create a session through the form. Returns its id. Optionally adds a guest as a member. */
export async function createSession(page: Page, { name, guest }: { name: string; guest?: string }) {
  await go(page, "/sessions/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
  if (guest) {
    await page.getByRole("button", { name: "Add member" }).click();
    await page.getByLabel("Search people").fill(guest);
    await page.getByRole("button", { name: new RegExp(`Add .${guest}. as a guest`) }).click();
    await page.getByRole("button", { name: /^Add 1$/ }).click();
    await expect(page.getByText(guest).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Create session" }).click();
  await page.waitForURL((url) => SESSION_URL.test(url.pathname));
  return sessionIdOf(page.url());
}

/** Add an empty match in the editor and wait for it to open. */
export async function addMatch(page: Page, sessionId: string) {
  await go(page, `/sessions/${sessionId}/matches/edit`);
  await page.getByRole("button", { name: "Add match" }).click();
  await page.waitForURL(/\/matches\/edit\?m=/);
  await expect(page.getByRole("button", { name: "Edit Team 1 players" })).toBeVisible();
}

/** Add a game with scores and save the match. */
export async function scoreFirstGame(page: Page, scores: { team1: string; team2: string }) {
  await page.getByRole("button", { name: "Add game" }).click();
  await page.getByLabel("Team 1 score for game 1").fill(scores.team1);
  await page.getByLabel("Team 2 score for game 1").fill(scores.team2);
  await page.getByRole("button", { name: "Save match" }).click();
  await expect(page.getByText("Match saved")).toBeVisible();
}
