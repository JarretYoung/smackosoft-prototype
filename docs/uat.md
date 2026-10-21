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
| Create session | `/sessions/new` | Add a member by handle, add a guest, change a role, save |
| Edit session | `/sessions/[id]/edit` | Same form with the current members. Remove someone who plays and read the error. |
| Edit match | `/sessions/[id]/matches/edit` | Switch, add and delete a match. Pick players per team. Add and remove games. Enter scores. Save all. |
| Match details | `/sessions/[id]/matches/[matchId]` | Score header, game cards, video counts. A game card opens its videos. |
| Videos | `/sessions/[id]/videos` | Add a video record, link it to the session or a game with an offset, unlink |
| Onboarding | `/onboarding` | Taken handle error, then a free handle |

## Behavior worth checking on purpose

- A viewer who opens `/sessions/[id]/edit` gets the 404 page.
- A session you are not in gives the 404 page, not an error.
- A player cannot be on both teams of one match. The team picker greys them out.
- Saving the same match twice changes nothing.
- A score you entered cannot be cleared. A blank box leaves the saved score alone.
- Deleting a session keeps the videos and removes only the links.

## Known gaps

| Gap | Note |
|---|---|
| Court photos | A drawn court stands in for the photo |
| Video upload | Videos are links only. There is no file upload. |
| Profile screen | Not built. Handle changes have no screen yet. |
| Stats | Provisional. The win rate counts decided matches only. |
| Dev badge | Next.js shows an "Insight" badge about instant navigation. It is a dev hint, not an error. |
| Real sign-in in tests | Backend tests fake the signed-in user. The browser path was checked by hand. |
