import { expect, type Page } from "@playwright/test";
import { setTime } from "./session-form";

/** A seeded user. See the sample logins in docs/runbook.md. */
export const SEEDED = { email: "ian@smacko.test", password: "Password123", name: "Ian Chong" };

/** A seeded viewer on "Badminton with da Laddies" and "Thursday Smash". */
export const VIEWER = { email: "nadree@smacko.test", password: "Password123", name: "Nadree Omar" };

/** A password that passes the sign-up rule. */
export const STRONG_PASSWORD = "E2e-pass-123";

/** A short lowercase id, so every run makes data nobody else made. */
export const unique = () => Math.random().toString(36).slice(2, 8);

/**
 * Resolves once React has taken over every button, link and field on the page. Typing before that
 * is lost, and the session form is rebuilt when it happens. React marks each element it owns with
 * a `__reactProps$` key, so this waits on that mark instead of sleeping.
 */
export async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const controls = [...document.querySelectorAll("button, a[href], input, textarea")];
    return controls.length > 0 && controls.every((el) => Object.keys(el).some((key) => key.startsWith("__reactProps$")));
  });
}

/** Open a page and wait until it is interactive. */
export async function go(page: Page, url: string) {
  await page.goto(url);
  await hydrated(page);
}

export async function logIn(page: Page, { email, password }: { email: string; password: string } = SEEDED) {
  await go(page, "/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/home/);
}

/** Sign up with the form. Stops on the "check your email" screen. */
export async function signUp(page: Page, { email, password }: { email: string; password: string }) {
  await go(page, "/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up-success/);
}

/** Pick a name and handle on the onboarding screen. Ends on Home. */
export async function onboard(page: Page, { name, handle }: { name: string; handle: string }) {
  await hydrated(page);
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Handle").fill(handle);
  await expect(page.getByText(`@${handle} is available`)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/home/);
}

const SESSION_URL = /\/sessions\/[0-9a-f-]{36}$/;
const sessionIdOf = (url: string) => new URL(url).pathname.split("/").pop()!;

/**
 * Create a session through the form. Returns its id. Optionally adds a guest as a member and sets
 * the start and end as "HH:mm". An end earlier than the start runs past midnight.
 */
export async function createSession(
  page: Page,
  { name, guest, times }: { name: string; guest?: string; times?: { start: string; end: string } },
) {
  await go(page, "/sessions/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
  if (times) {
    await setTime(page, "Starts", times.start);
    await setTime(page, "Ends", times.end);
  }
  if (guest) {
    await page.getByRole("button", { name: "Add member" }).click();
    await page.getByLabel("Search people").fill(guest);
    await page.getByRole("button", { name: new RegExp(`Add .${guest}. as a guest`) }).click();
    await page.getByRole("button", { name: /^Add 1$/ }).click();
    await expect(page.getByText(guest).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page).toHaveURL(SESSION_URL);
  return sessionIdOf(page.url());
}

/** Add an empty match in the editor and wait for it to open. */
export async function addMatch(page: Page, sessionId: string) {
  await go(page, `/sessions/${sessionId}/matches/edit`);
  await page.getByRole("button", { name: "Add match" }).click();
  await expect(page).toHaveURL(/\/matches\/edit\?m=/);
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
