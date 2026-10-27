import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { authFile, DEVICE, MANIFEST, PASSWORD, SHOTS } from "./device";

/** Flows are described in docs/gallery-flows.md. Keep the two in step. */

const S1 = "b0000000-0000-4000-8000-000000000001";
const M1 = "c0000000-0000-4000-8000-000000000001";
const M2 = "c0000000-0000-4000-8000-000000000002";

const counters = new Map<string, number>();

/** Save the visible screen as `<flow>/<NN>-<name>.png` and note it for the index. */
async function shot(page: Page, flow: string, name: string, caption: string) {
  await page.waitForTimeout(450);
  const step = (counters.get(flow) ?? 0) + 1;
  counters.set(flow, step);
  const file = `${String(step).padStart(2, "0")}-${name}.png`;
  fs.mkdirSync(path.join(SHOTS, flow), { recursive: true });
  await page.screenshot({
    path: path.join(SHOTS, flow, file),
    animations: "disabled",
    caret: "hide",
    // The Next dev badge is a development hint, not part of the app.
    style: "nextjs-portal { display: none !important; }",
  });
  fs.appendFileSync(MANIFEST, JSON.stringify({ flow, step, file, caption }) + "\n");
}

/** Open a page and wait until it is interactive. Typing before React loads is silently lost. */
const go = async (page: Page, url: string) => {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
};

/** Scroll the page down by most of a screen. */
const scrollDown = async (page: Page, screens = 0.85) => {
  await page.evaluate((s) => window.scrollBy(0, window.innerHeight * s), screens);
  await page.waitForTimeout(250);
};
const scrollTop = (page: Page) => page.evaluate(() => window.scrollTo(0, 0));

/** A step that may not apply to every dataset. A miss is logged and the flow carries on. */
async function attempt(label: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    console.log(`  skipped: ${label} (${(error as Error).message.split("\n")[0]})`);
  }
}

async function signUp(page: Page, email: string, password: string) {
  await go(page, "/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.waitForURL(/sign-up-success/);
}

const asUser = async (browser: Browser, user: "ian" | "nadree") =>
  browser.newContext({ ...DEVICE, storageState: authFile(user) });

const signedOut = { cookies: [], origins: [] };

// ---------------------------------------------------------------- 01 Auth
test.describe("01 auth", () => {
  test.use({ storageState: signedOut });
  const flow = "01-auth";

  test("login and password reset", async ({ page }) => {
    await go(page, "/auth/login");
    await shot(page, flow, "login-empty", "Login, empty");

    await page.getByRole("button", { name: "Log in" }).click();
    await shot(page, flow, "login-empty-submit", "Pressing Log in with nothing entered: both fields explain");

    await page.getByLabel("Email").fill("ian@smacko.test");
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Show password" }).click();
    await shot(page, flow, "login-password-shown", "Password revealed with the toggle");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/do not match/)).toBeVisible();
    await shot(page, flow, "login-wrong-password", "Wrong password: a plain sentence, not provider text");

    await go(page, "/auth/forgot-password");
    await shot(page, flow, "forgot-empty", "Forgot password, empty");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Email").blur();
    await shot(page, flow, "forgot-bad-email", "Forgot password, email that is not an email");
    await page.getByLabel("Email").fill("ian@smacko.test");
    await page.getByRole("button", { name: "Send reset email" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    await shot(page, flow, "forgot-sent", "Reset email sent");
  });

  test("sign up validation", async ({ page }) => {
    await go(page, "/auth/sign-up");
    await shot(page, flow, "signup-empty", "Sign up, empty, with the password hint");
    await page.getByLabel("Email").fill("nope");
    await page.getByLabel("Password", { exact: true }).fill("abc");
    await page.getByRole("button", { name: "Sign up" }).click();
    await shot(page, flow, "signup-errors", "Bad email and short password, both explained");
    await page.getByLabel("Email").fill("ian@smacko.test");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText(/already an account/)).toBeVisible();
    await shot(page, flow, "signup-email-taken", "Email already registered: points at the email field");
  });
});

// ---------------------------------------------------------------- 02 Onboarding
test.describe("02 onboarding", () => {
  test.use({ storageState: signedOut });
  const flow = "02-onboarding";

  test("a new person signs up and picks a handle", async ({ page }) => {
    await signUp(page, "gallery.one@smacko.test", "gallery-pass-1");
    await shot(page, flow, "signup-success", "Sign up accepted");

    await go(page, "/onboarding");
    await shot(page, flow, "onboarding-empty", "Onboarding, empty");

    await page.getByLabel("Display name").fill("Gallery One");
    await expect(page.getByText(/is available/)).toBeVisible();
    await shot(page, flow, "handle-suggested", "A handle is suggested from the name and checked: available");

    await page.locator("#handle").fill("izaaq");
    await expect(page.getByText("That handle is taken")).toBeVisible();
    await shot(page, flow, "handle-taken", "A taken handle, flagged while typing");

    await page.locator("#handle").fill("ab");
    await page.locator("#handle").blur();
    await shot(page, flow, "handle-short", "Too short, flagged once the field is left");

    await page.getByRole("button", { name: "I have a claim code" }).click();
    await page.getByLabel("Claim code").fill("wrong-code-123");
    await page.getByRole("button", { name: "Claim my guest account" }).click();
    await expect(page.getByText(/did not work|not valid|invalid/i).first()).toBeVisible();
    await shot(page, flow, "claim-wrong-code", "Claim code section with a wrong code");

    await page.locator("#handle").fill("gallery_one");
    await expect(page.getByText(/is available/)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/home/);
    await shot(page, flow, "home-new-user", "Home for someone with no data yet");

    await go(page, "/sessions");
    await shot(page, flow, "sessions-empty", "Sessions, empty state");
    await go(page, "/profile");
    await shot(page, flow, "profile-new-user", "Profile with no guests yet");
  });
});

// ---------------------------------------------------------------- 03 Home and sessions
test.describe("03 home and sessions", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "03-home-and-sessions";

  test("owner view", async ({ page, browser }) => {
    await go(page, "/home");
    await shot(page, flow, "home-top", "Home: win rate, upcoming");
    await scrollDown(page);
    await shot(page, flow, "home-scrolled", "Home: calendar and teammates");

    await go(page, "/sessions");
    await shot(page, flow, "sessions-top", "Sessions: today and upcoming");
    await scrollDown(page);
    await shot(page, flow, "sessions-scrolled", "Sessions: past");

    const nadree = await asUser(browser, "nadree");
    const view = await nadree.newPage();
    await go(view, "/sessions");
    await shot(view, flow, "sessions-viewer", "Sessions as a viewer");
    await nadree.close();
  });
});

// ---------------------------------------------------------------- 04 Session details
test.describe("04 session details", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "04-session-details";

  test("owner and viewer", async ({ page, browser }) => {
    await go(page, `/sessions/${S1}`);
    await shot(page, flow, "owner-top", "Session as owner: cover, details");
    await scrollDown(page);
    await shot(page, flow, "owner-members-matches", "Session as owner: members and matches");
    await scrollDown(page);
    await shot(page, flow, "owner-bottom", "Session as owner: lower matches and videos row");

    await scrollTop(page);
    await page.getByRole("button", { name: "Session menu" }).click();
    await shot(page, flow, "owner-menu", "The session menu");
    await page.keyboard.press("Escape");

    const nadree = await asUser(browser, "nadree");
    const view = await nadree.newPage();
    await go(view, `/sessions/${S1}`);
    await shot(view, flow, "viewer-top", "Same session as a viewer: edit controls hidden");
    await scrollDown(view);
    await shot(view, flow, "viewer-matches", "Viewer: matches");
    await go(view, `/sessions/${S1}/edit`);
    await shot(view, flow, "viewer-edit-blocked", "A viewer opening the edit page gets not found");
    await go(view, "/sessions/00000000-0000-4000-8000-000000000000");
    await shot(view, flow, "session-not-yours", "A session you are not in looks the same as one that does not exist");
    await nadree.close();
  });
});

// ---------------------------------------------------------------- 05 Create session
test.describe("05 create session", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "05-create-session";

  test("create with people", async ({ page }) => {
    await go(page, "/sessions/new");
    await shot(page, flow, "form-empty", "Create session, empty");
    await scrollDown(page, 1.5);
    await shot(page, flow, "form-empty-bottom", "Details and participants");

    await page.getByRole("button", { name: "Create session" }).click();
    await shot(page, flow, "form-title-error", "Pressing Create empty scrolls to Title and explains");

    await page.getByLabel("Title").fill("Friday Smash");
    await page.locator("#start").fill("19:00");
    await page.locator("#end").fill("18:00");
    await page.locator("#end").blur();
    await shot(page, flow, "form-end-before-start", "End before start is flagged on the end field");
    await page.locator("#end").fill("21:00");
    await page.locator("#location").fill("Sunway Serene");
    await page.locator("#fee").fill("12");
    await page.locator("#maps").fill("maps");
    await page.locator("#maps").blur();
    await shot(page, flow, "form-link-error", "A link that is not a link");
    await page.locator("#maps").fill("https://maps.app.goo.gl/example");
    await shot(page, flow, "form-filled", "Filled in");

    await page.getByRole("button", { name: "Add participant" }).click();
    await shot(page, flow, "picker-suggestions", "People picker: teammates and guests to tap");
    await page.getByRole("button", { name: /Izaaq Izham/ }).click();
    await shot(page, flow, "picker-selected", "One person selected, the button counts");
    await page.getByLabel("Search people").fill("Bob");
    await shot(page, flow, "picker-new-guest", "Typing a new name offers a guest");
    await page.getByLabel("Search people").fill("@nobodyhere");
    await page.getByRole("button", { name: /Find @nobodyhere/ }).click();
    await expect(page.getByText(/No one has the handle/)).toBeVisible();
    await shot(page, flow, "picker-handle-missing", "An unknown handle says so next to the search");
    await page.getByLabel("Search people").fill("Bob");
    await page.getByRole("button", { name: /Add “Bob” as a guest/ }).click();
    await shot(page, flow, "picker-two-selected", "A teammate and a new guest selected");
    await page.getByRole("button", { name: /^Add 2/ }).click();
    await scrollDown(page, 1.5);
    await shot(page, flow, "participants-added", "Participants after adding");

    await scrollTop(page);
    await page.getByRole("link", { name: "Back" }).click();
    await shot(page, flow, "leave-dialog", "Leaving with changes asks first");
    await page.getByRole("button", { name: "Keep editing" }).click();

    await page.getByRole("button", { name: "Create session" }).click();
    await page.waitForURL((url) => /\/sessions\/[0-9a-f-]{36}$/.test(url.pathname));
    await shot(page, flow, "created", "Created: a session with no matches yet");
    await scrollDown(page);
    await shot(page, flow, "created-bottom", "The new session below the fold");
  });
});

// ---------------------------------------------------------------- 06 Edit session
test.describe("06 edit session", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "06-edit-session";

  test("roles and removing someone who plays", async ({ page }) => {
    await go(page, `/sessions/${S1}/edit`);
    await shot(page, flow, "edit-form", "Edit session with the current values");
    await scrollDown(page, 1.5);
    await shot(page, flow, "edit-participants", "Current participants");

    await attempt("role menu", async () => {
      await page.getByRole("button", { name: /Options for Izaaq/ }).click();
      await shot(page, flow, "role-menu", "Changing a role, or removing");
      await page.keyboard.press("Escape");
    });
    await attempt("remove a player", async () => {
      await page.getByRole("button", { name: /Options for Nadree/ }).click();
      await page.getByRole("menuitem", { name: "Remove" }).click();
      await shot(page, flow, "member-removed-staged", "Removed in the form, not saved yet");
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.waitForTimeout(1200);
      await shot(page, flow, "remove-player-error", "Saving is refused: that person still plays in a match");
    });
  });
});

// ---------------------------------------------------------------- 07 Match editor
test.describe("07 match editor", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "07-match-editor";
  const editUrl = (m: string) => `/sessions/${S1}/matches/edit?m=${m}`;

  test("edit a match", async ({ page }) => {
    await go(page, editUrl(M1));
    await shot(page, flow, "editor-top", "Match editor: switcher, name, type, teams");

    await attempt("type picker", async () => {
      await page.locator("#match-type").click();
      await shot(page, flow, "type-picker", "Match types, in words");
      await page.keyboard.press("Escape");
    });
    await attempt("team players", async () => {
      await page.getByRole("button", { name: /Edit Team 1 players/ }).click();
      await shot(page, flow, "team-players", "Choosing players: the other team's players are greyed out");
      await page.getByRole("button", { name: "Done" }).click();
    });

    await scrollDown(page);
    await shot(page, flow, "games", "Games with scores and the winner crown");
    await attempt("expand times", async () => {
      await page.getByRole("button", { name: "Edit times for game 1" }).click();
      await shot(page, flow, "game-times", "A game's times, opened");
    });

    await attempt("clear a saved score", async () => {
      const score = page.getByLabel("Team 1 score for game 1");
      await score.fill("");
      await page.getByRole("button", { name: "Save match" }).click();
      await expect(page.getByText(/can be changed, not removed/)).toBeVisible();
      await shot(page, flow, "saved-score-error", "A saved score cannot be cleared: explained next to the box");
      await score.fill("21");
    });

    await attempt("remove a game and undo", async () => {
      await page.getByRole("button", { name: "Remove game 2" }).click();
      await shot(page, flow, "game-removed-undo", "Removing a game, with Undo");
      await page.getByRole("button", { name: "Undo" }).click();
    });

    await attempt("discard dialog", async () => {
      await scrollTop(page);
      await page.getByLabel("Team 2 score for game 1").fill("18");
      await page.getByRole("link", { name: "Next match" }).click();
      await shot(page, flow, "switch-discard", "Switching matches with unsaved changes asks first");
      await page.getByRole("button", { name: "Keep editing" }).click();
    });

    await attempt("add a game", async () => {
      await page.getByRole("button", { name: "Add game" }).scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Add game" }).click();
      await page.waitForTimeout(300);
      await shot(page, flow, "game-added", "A new game after Add game");
    });

    await page.getByRole("button", { name: "Save match" }).click();
    await page.waitForURL(new RegExp(`/matches/${M1}$`));
    await shot(page, flow, "saved-match-details", "Saved: match details");
    await scrollDown(page);
    await shot(page, flow, "match-details-games", "Match details: game cards");

    await go(page, `/sessions/${S1}/matches/${M2}`);
    await shot(page, flow, "match-in-progress", "A match still in progress");
    await go(page, editUrl(M2));
    await shot(page, flow, "editor-in-progress", "Editor for the in progress match");
  });
});

// ---------------------------------------------------------------- 08 Videos
test.describe("08 videos", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "08-videos";

  test("sync and add", async ({ page, browser }) => {
    await go(page, `/sessions/${S1}/videos`);
    await shot(page, flow, "page-top", "Videos: matches, games and their videos");
    await scrollDown(page);
    await shot(page, flow, "page-scrolled", "Videos: more games and the Unassigned group");

    await attempt("sync an unsynced video", async () => {
      await page.getByRole("button", { name: /Not synced/ }).first().click();
      await shot(page, flow, "sync-open", "Sync sheet for a video that is not synced");
      await page.locator("#sync-offset").fill("abc");
      await shot(page, flow, "sync-invalid", "Text that is not a time: Save is disabled");
      await page.locator("#sync-offset").fill("1:30");
      await page.locator("#sync-offset").blur();
      await shot(page, flow, "sync-typed", "Typed 1:30, the ruler follows");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Sync point saved")).toBeVisible();
      await shot(page, flow, "sync-saved", "Saved, with the toast");
    });

    await attempt("adjust a synced video", async () => {
      await page.getByRole("button", { name: /Synced at/ }).first().click();
      await shot(page, flow, "sync-adjust", "Adjusting an existing sync point, with Clear");
      await page.getByRole("button", { name: "Cancel" }).click();
    });

    await attempt("add video", async () => {
      await scrollTop(page);
      await page.getByRole("button", { name: "Add video" }).first().click();
      await shot(page, flow, "add-video-empty", "Add video, empty");
      await page.getByRole("dialog").getByRole("button", { name: "Add video" }).click();
      await shot(page, flow, "add-video-errors", "Pressing Add with nothing entered");
      await page.getByLabel("Name").fill("Court 3 recording");
      await page.getByLabel("Link", { exact: true }).fill("not a link");
      await page.getByLabel("Link", { exact: true }).blur();
      await shot(page, flow, "add-video-bad-link", "A link that is not a link");
      await page.getByLabel("Link", { exact: true }).fill("https://example.com/court3.mp4");
      await shot(page, flow, "add-video-filled", "Filled in");
      await page.getByRole("button", { name: "Cancel" }).click();
    });

    const nadree = await asUser(browser, "nadree");
    const view = await nadree.newPage();
    await go(view, `/sessions/${S1}/videos`);
    await shot(view, flow, "viewer", "Videos as a viewer");
    await nadree.close();
  });
});

// ---------------------------------------------------------------- 09 Profile and guests
let claimLink = "";

test.describe("09 profile and guests", () => {
  test.use({ storageState: authFile("ian") });
  const flow = "09-profile-and-guests";

  test("name, handle and guests", async ({ page }) => {
    await go(page, "/profile");
    await shot(page, flow, "profile-top", "Profile: details and guests");

    await page.locator("#handle").fill("izaaq");
    await expect(page.getByText("That handle is taken")).toBeVisible();
    await shot(page, flow, "handle-taken", "A taken handle, flagged while typing");
    await page.locator("#handle").fill("iancz_gallery");
    await expect(page.getByText(/is available/)).toBeVisible();
    await shot(page, flow, "handle-free", "A free handle");
    await page.getByRole("button", { name: "Save changes" }).click();
    await shot(page, flow, "handle-confirm", "Changing a handle spends one of two changes, so it asks");
    await page.getByRole("button", { name: /^Keep @/ }).click();
    await page.locator("#handle").fill("ianczm");

    await page.getByRole("button", { name: "Add guest" }).first().click();
    await page.locator("#guest-name").fill("Raj");
    await shot(page, flow, "add-guest", "Add a guest");
    await page.getByRole("dialog").getByRole("button", { name: "Add guest" }).click();
    await expect(page.getByText("Guest added")).toBeVisible();
    await shot(page, flow, "guest-added", "Guest added, with the toast");

    await page.getByRole("button", { name: "Options for Raj" }).click();
    await shot(page, flow, "guest-menu", "A guest's menu");
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await shot(page, flow, "edit-guest", "Edit guest: name and handle");
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Options for Raj" }).click();
    await page.getByRole("menuitem", { name: "Invite to claim" }).click();
    await expect(page.locator("#claim-link")).toBeVisible();
    claimLink = await page.locator("#claim-link").inputValue();
    await shot(page, flow, "invite-claim", "Invite to claim: code and link");
    await page.getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Options for Aadit" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await shot(page, flow, "delete-guest", "Deleting a guest says what is kept");
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});

// ---------------------------------------------------------------- 10 Claim a guest
test.describe("10 claim a guest", () => {
  test.use({ storageState: signedOut });
  const flow = "10-claim-a-guest";

  test("a new person claims the guest", async ({ page }) => {
    test.skip(!claimLink, "No claim link was made in the guests flow");
    await signUp(page, "gallery.two@smacko.test", "gallery-pass-2");
    await go(page, new URL(claimLink).pathname + new URL(claimLink).search);
    await shot(page, flow, "claim-first", "Arriving with a code: claim comes first, new account second");
    await page.getByRole("button", { name: "Claim my guest account" }).click();
    await page.waitForURL(/\/home/);
    await shot(page, flow, "claimed-home", "Claimed: the guest is now this person's account");
    await go(page, "/sessions");
    await shot(page, flow, "claimed-sessions", "Sessions the guest already belonged to");
  });
});

// ---------------------------------------------------------------- 11 States
test.describe("11 states", () => {
  test.use({ storageState: signedOut });
  const flow = "11-states";

  test("system pages", async ({ page }) => {
    await go(page, "/auth/sign-up-success");
    await shot(page, flow, "sign-up-success", "Check your email");
    await go(page, "/auth/error?error=Link%20expired");
    await shot(page, flow, "auth-error", "Auth error page");
    await go(page, "/this-page-does-not-exist");
    await shot(page, flow, "not-found", "Not found");
  });
});

void PASSWORD;
