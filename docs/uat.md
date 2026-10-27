## Prototype acceptance testing

Start here to try the prototype. The steps to run it are in [runbook.md](runbook.md).

## Run it

1. `pnpm supabase start`
2. `pnpm supabase db reset` to load the sample data
3. `pnpm dev`, then open `http://localhost:3000`

Sign in with any seeded user. The password is `password123`.

| Email | Use it to check |
|---|---|
| `ian@smacko.test` | Owner view. Everything is editable. |
| `izaaq@smacko.test` | Editor of Thursday Smash. Can score, cannot manage members. |
| `nadree@smacko.test` | Viewer. Edit controls are hidden. |
| `jarret@smacko.test` | Owns Last Week Doubles. Ian is a viewer there. |

A new email signs up with no account, so it lands on onboarding.

## Screens and what to try

| Screen | Path | Try |
|---|---|---|
| Home | `/home` | Stat tiles, calendar highlights, upcoming sessions, teammate stats |
| Sessions | `/sessions` | Today card, upcoming and past groups, empty state for a user with no sessions |
| Session details | `/sessions/[id]` | Fee and location, members, match cards with the winner crown, the menu |
| Create session | `/sessions/new` | Fill the title, date, planned start and end, fee, location and maps link, cover image link. Add a member by handle, add a guest, change a role, save. |
| Edit session | `/sessions/[id]/edit` | Same form with the current members. Remove someone who plays and read the error. |
| Edit match | `/sessions/[id]/matches/edit` | Switch, add and delete a match. Pick players per team. Add and remove games, edit each game's start and end time, enter scores. Save all. A match keeps one or two teams. |
| Match details | `/sessions/[id]/matches/[matchId]` | Score header, game cards, video counts. A game card opens its videos. |
| Videos | `/sessions/[id]/videos` | One page. Each match is a large heading with its games under it as small subheaders, each game with its videos. Videos that no game uses yet sit at the bottom under "Unassigned". A game card on the match screen opens this page for that one game, with an "All games" link. The "+" in the header adds a new video to the session. "Add video" at the end of a game picks one from the session, or "New video" adds one straight into that game. Tapping an unassigned video or picking one for a game ends in the sync sheet. In the sheet, drag the ruler or type the time (`1:30`, `90`, `-0:05`). "Not now" keeps the video in the game but leaves it "Not synced". Each row shows who last changed it. "N need attention" scrolls to the first item. |
| Session videos row | `/sessions/[id]` | Shows the video count and how many need sorting out |
| Profile | `/profile` | Change your name and handle and read how many handle changes are left. Add, edit and delete guests. "Invite to claim" makes a link. |
| Onboarding | `/onboarding` | Taken handle error, then a free handle. "I have a claim code" turns a guest into your account. |

## Behavior worth checking on purpose

- A viewer who opens `/sessions/[id]/edit` gets the 404 page.
- A session you are not in gives the 404 page, not an error.
- A player cannot be on both teams of one match. The team picker greys them out.
- Saving the same match twice changes nothing.
- A score you entered cannot be cleared. A blank box leaves the saved score alone.
- Deleting a session keeps the videos and removes only the links.
- Claim flow: as Ian, open Profile, choose Invite to claim on a guest, copy the link. Sign up as a new user, open the link, press Claim. The new account is the guest, with its matches.
- A member can leave a session from the session menu. The owner cannot. Someone who still plays in a match is told to be taken off it first.
- A deleted guest disappears from your list and frees its handle, but stays in matches already played.

## Known gaps

| Gap | Note |
|---|---|
| Court photos | A drawn court stands in for the photo |
| Video upload | Videos are links only. There is no file upload. |
| Avatars | The database has `avatar_url`, but the contract and screens do not set it yet |
| Stats | Provisional. The win rate counts decided matches only. |
| Dev badge | Next.js shows an "Insight" badge about instant navigation. It is a dev hint, not an error. |
| Real sign-in in tests | Backend tests fake the signed-in user. The browser path was checked by hand. |
