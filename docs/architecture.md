# Architecture

The frontend codes against one TypeScript interface, `Backend`. The schema is the source of truth for names.

Stack: Next.js App Router (cache components), Supabase auth, PostgreSQL through Kysely over `pg` as the `smackosoft_service` role, Zod 4, TanStack Form, shadcn with Tailwind v4. Planned and not built: video storage on R2, PWA.

## The layers

Each layer calls only the one below it.

| Layer | Where | Role |
|---|---|---|
| Contract | `src/contract/` | The `Backend` interface, Zod input schemas, read types, error model. Safe in Client Components. |
| Server | `src/server/` | The real implementation. Imports `server-only`. Shared query fragments live in `src/server/queries/`. |
| Actions | `src/features/<name>/actions.ts` | Thin `"use server"` wrappers, one per write. They call `backend` and refresh pages. |
| Pages | `src/app/` | Server Components. Fetch, then compose feature components. |
| Features | `src/features/<name>/` | Components, hooks and reducers that belong to one feature. |
| Shared UI | `src/components/`, `src/components/ui/` | Components used by two or more features. `ui/` holds shadcn primitives. |

Pure helpers live in `src/lib/`. Shared client hooks live in `src/hooks/`.

## Where a component lives

| If it is used by | Put it in |
|---|---|
| One feature | `src/features/<name>/` |
| Two or more features | `src/components/` |
| A shadcn primitive | `src/components/ui/` |
| Nothing React (pure function) | `src/lib/` |

A feature file never imports another feature file for server logic. Shared server code goes in `src/server/queries/`.

## The page rule

- Read with `backend.x.y()` in a Server Component. Unwrap with `unwrap` from `src/lib/result.ts`.
- Start independent reads together with `Promise.all`.
- Pass down only what a component needs. Compose feature components.
- The `(app)` layout sets `export const instant = false`, because pages read the session.

## The form pattern

Every form has three parts.

| Part | File | Job |
|---|---|---|
| Hook | `use-<name>-form.ts` | Form state and submit. Built on `useAppForm` in `src/hooks/use-app-form.ts`. |
| Reducer | `<name>-draft.ts` | Pure logic when several fields change together. Has a unit test. |
| Component | `<name>-form.tsx` | Presentational. No state logic. |

`useAppForm` wires TanStack Form to the Zod schema, the server action `Result`, the leave guard and first-error focus. Show `errorMessage(error)` in a toast or `fieldErrors(error)` under a field.

## The auth rule

All auth goes through server actions in `src/features/auth/actions.ts`: sign in, sign up, sign out, forgot password, update password, Google OAuth. Components never import the Supabase client. Pages read the signed-in user with `getClaims` from `src/lib/supabase/server.ts`.

Other writes follow the same rule. A Client Component writes only through a server action.

## The naming principle

1. The schema is the source of truth. Code uses the camelCase of the column name (`match_game_id` is `matchGameId`).
2. A type is the singular table name without the parent prefix (`match_games` is `Game`). A method keeps the prefix where the short name is ambiguous (`saveMatchPlayers`).
3. If the schema name is the poor one, change the schema.
4. A concept with no table takes the plain domain word (`Member`, `Teammate`, `Stats`).
5. UI copy is plain language. Delete a record. Remove a link or a member. Leave means removing yourself.

## Time and timezones

A session has a timezone: where it happens, as an IANA name in `sessions.timezone`.

- `date` is the calendar day in that zone. Start and end times are exact instants.
- **Everything is on the viewer's clock.** Lists, Home and the session page show times in the viewer's timezone. The day of a session is the day it starts on the viewer's clock (`viewerDay`), and "today" is today where the viewer is.
- **One set of forms.** Dates and times read the same on every screen, from `src/lib/format.ts`: "Sat 31 Oct" (the year only when it is not this year), "6:00 am", "6:00 am to 9:00 am", "1 h 30 min".
- **One session row.** Home and the Sessions page share it. A date block on the left names the day once, and the name, time, place and people sit to its right.
- **The session's own clock is one tap away.** A session that happens on a different clock gets a chip in the When row at the top of its details. It says "Your time", and a tap switches to the session's clock, named by its short zone name ("GMT", or "UTC+8" where the browser has no abbreviation), and back. The date moves with the time. Two zones with the same clock at that moment, such as Kuala Lumpur and Singapore, count as the same, so nobody sees a chip. Lists have no chip, so every row reads on one clock.
- **The server knows the viewer's zone from a cookie.** A browser does not send its timezone, so `TimezoneCookie` (in the root layout) keeps a `tz` cookie equal to the browser's and draws the page again once when it changes. `getViewerZone` reads it on the server and checks it first. A first visit assumes `DEFAULT_TIMEZONE` (Kuala Lumpur, set in `src/config.ts`), then corrects itself if the browser is somewhere else. Nobody on Malaysian time sees a redraw.
- **Forms stay on the session's clock.** The session form always shows the zone as a row, "Time zone", with a search sheet. A new session starts in the browser's zone, taken in the browser so a stale cookie can never set it. Changing the zone keeps the times that were typed, because "8 pm" means 8 pm at the venue. The match editor edits game times on the session's clock too, and says so when it differs from yours.
- The server renders the times, so nothing pops in after the page loads.
- The helpers are in `src/lib/zoned.ts`. They use `Intl`, with no library.

## Glossary

| Concept | Schema | Code | UI |
|---|---|---|---|
| Session | `sessions` | `Session*` | Session |
| Session name | `sessions.label` | `label` | Name |
| Member | `session_access` | `Member` | Member |
| Role | `session_access.role` (enum `role_type`) | `Role` | Viewer, Editor, Manager, Owner |
| Match | `matches` | `Match` | Match |
| Team | `match_teams` | `Team` | Team |
| Game | `match_games` | `Game`, `matchGameId` | Game |
| Game score | `match_game_scores` | `saveGameScores` | Score |
| Player | `match_players` | `saveMatchPlayers`, `Team.players` | Player |
| Account | `accounts` | `Account` | Profile (your own) |
| Guest | `accounts` with type `GUEST` | `Guest` | Guest |
| Claim code | `accounts.claim_code` | `createClaimCode`, `ClaimInput.code` | Claim code, Claim link |
| Video in a session | `video_sessions` | `saveVideoSessions` | Videos, Unassigned |
| Video in a game | `video_games` | `saveVideoGames` | Game videos |
| Sync point | `video_games.canonical_offset` | `canonicalOffset` | Sync point |
| Teammate | derived from `match_players` | `TeammateStat` | Teammates |
| Court fee | `sessions.court_fee` | `courtFee` | Court fee |
| Timezone | `sessions.timezone` | `timezone` | "Times are in London time" |

## Known simplification

Every write refreshes the whole app with `revalidatePath("/", "layout")` (see `src/features/refreshed.ts`). It is simple and correct. It refetches more than it needs. Narrow it per feature if a screen feels slow.

## Where to read more

- [use-cases.md](use-cases.md): rules, permissions and the use case list
- [runbook.md](runbook.md): running it locally, sample logins, tests
- [uat.md](uat.md): what to try on each screen
