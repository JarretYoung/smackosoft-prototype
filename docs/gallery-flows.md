# Screenshot gallery: flows and states

`pnpm gallery` resets the database, drives the app on an iPhone sized screen, and saves one image per important step. Images land in `gallery/screenshots/`, grouped by flow, with an `index.md` that lists every step.

## How it runs

| Setting | Value |
|---|---|
| Browser | Chromium, phone emulation (touch, mobile viewport) |
| Screen | 390 by 844, device scale 2, light mode |
| Timezone | Asia/Kuala_Lumpur |
| Data | `pnpm supabase db reset`, so every run starts from the seed |
| Crop | The visible screen only, never the full page. Long pages get a second image after scrolling. |

You need the Supabase stack and `pnpm dev` running. The script does not start them.

## Prerequisites by flow

Flows run in order. Later flows rely on data the earlier ones leave behind.

| Flow | Signed in as | Needs |
|---|---|---|
| 01 Auth | nobody | Seeded users |
| 02 Onboarding | a new user | Created in the flow |
| 03 Home and sessions | Ian, then Nadree | Seed |
| 04 Session details | Ian, then Nadree | Seed |
| 05 Create session | Ian | Seed teammates and the guest Aadit |
| 06 Edit session | Ian | Seed |
| 07 Match editor | Ian | Seed matches |
| 08 Videos | Ian, then Nadree | Seeded videos |
| 09 Profile and guests | Ian | Seed |
| 10 Claim a guest | Ian, then a new user | A claim link made in the flow |
| 11 States | various | Mixed |

## Flows and what each captures

### 01 Auth
1. Login, empty.
2. Login after pressing Log in with nothing filled in (both field errors).
3. Login with a wrong password (plain error).
4. Password shown with the toggle.
5. Forgot password, empty, then sent.
6. Sign up, empty, then with a bad email and a short password.

### 02 Onboarding
Starts with a real sign up of a new user.
1. Sign up success.
2. Onboarding, empty.
3. Name typed, handle suggested and checked, "available".
4. A taken handle (`izaaq`), with the error.
5. A handle that is too short, after leaving the field.
6. The claim code section open, with a wrong code error.
7. Finished: Home for a user with no data, then Sessions with no sessions.

### 03 Home and sessions
1. Ian's Home, top, then scrolled to teammates.
2. Ian's Sessions: today, upcoming and past groups.
3. Nadree's Sessions.

### 04 Session details
1. Ian, Thursday Smash: top (cover, details), then scrolled (members, matches).
2. The session menu open.
3. Nadree (viewer): the same page with edit controls hidden.
4. A viewer opening the edit URL, which gives the not found page.
5. A session the user is not in, which gives the same page.

### 05 Create session
1. Empty form, then scrolled to participants.
2. Pressing Create empty: scrolled to Title with its error.
3. Filled form.
4. Add participants sheet: the suggestion list, one person selected.
5. Typing a new name (guest row), typing an unknown `@handle` (not found).
6. Participants after adding.
7. Leaving with changes: the discard dialog.
8. Created: the new session's page (a session with no matches) and the success toast.

### 06 Edit session
1. Edit form with current members.
2. A role menu open on a member.
3. Removing a member who plays, then Save, and the error.

### 07 Match editor
1. Match 1: top (name, type, teams).
2. Type picker open.
3. Team players sheet.
4. Games: times collapsed, then one expanded.
5. A saved score cleared, then Save: the inline error.
6. Removing a game, with the Undo toast.
7. A change made, then the switcher arrow: the discard dialog.
8. Save succeeds: the match details page.
9. Match details for the in progress match.

### 08 Videos
1. Videos page: games with videos, "Not synced", and the Unassigned group.
2. Sync sheet from a synced video, then from an unsynced one.
3. A typed offset, and an invalid one (Save disabled).
4. Saved: the toast.
5. Add video sheet: empty, with errors, filled.
6. Add video row on a game: the picker.
7. Nadree's view of the page.

### 09 Profile and guests
1. Profile, top.
2. A taken handle with its error.
3. A free handle, then the confirm dialog.
4. Add guest sheet, then added.
5. Edit guest sheet.
6. Invite to claim sheet (code and link).
7. Delete confirm, then the empty guests state.

### 10 Claim a guest
1. Ian makes a claim link.
2. A new user signs up and opens it: onboarding with the claim first.
3. Claimed: Home for the new account.

### 11 States
1. Not found.
2. Auth error page.
3. Sign up success.

## Not covered

| Item | Reason |
|---|---|
| Dark mode | Not built |
| Desktop width | Mobile first, decided with the product owner |
| Large text and increased contrast | Not tested yet |
| Real keyboard overlap | The emulator has no on-screen keyboard |
| Email contents | Out of scope |
