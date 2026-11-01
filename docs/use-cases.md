# Backend use cases and design guidelines

The contract is in `src/contract/`, one file per feature. The implementation is in `src/server/` and the tests are in `tests/`. Layers, folders and names are in [architecture.md](architecture.md).

## Principles

Everything below follows from five principles. When a new case does not fit a guideline, go back to these.

| Principle | Meaning |
|---|---|
| Narrow | One responsibility per use case |
| Declarative | A write states what should be true, not the steps to get there |
| Replayable | Running any command, or any sequence of commands, twice gives the same result |
| Backend-owned rules | Authorization and business rules live in the use case, never in a screen or the client |
| Minimal | Build only what a screen or story needs. Trust the database constraints. |

## Guidelines

### Shape of a use case

| # | Guideline | Principle |
|---|---|---|
| G1 | One use case, one responsibility, one exported function. | Narrow |
| G2 | Every command leaves the data valid. No command needs another to run first, beyond foreign keys. | Replayable |
| G3 | Completeness is a read concept, not a write rule. A match with no scores is valid. | Replayable |
| G4 | A rule lives on the command that changes the fact it protects. Not on a screen. | Backend-owned rules |
| G5 | Use cases never call each other. They share internal helpers (`requireRole`, `ensureMember`). The caller composes use cases. | Narrow |
| G6 | Reads are screen-shaped DTOs built from small shared queries. Writes are never screen-shaped. | Narrow |

### Writes

| # | Guideline | Principle |
|---|---|---|
| G7 | **Declare state, not deltas.** A write is either `save` (these rows should exist with these values) or `remove` (these rows should not exist). | Declarative |
| G8 | **Identity rule.** If the schema has a unique natural key, address the row by it. Otherwise the client supplies a UUID. The backend never hands out IDs the client must wait for. | Replayable |
| G9 | **Every write on a collection takes an array.** One item is a list of one. One transaction, all or nothing. The actor's own account is a singleton, not a collection, so `accounts.saveCurrent` takes one object. | Narrow |
| G10 | A call that repeats a key is rejected as `VALIDATION`. Postgres also rejects it for `DO UPDATE`. | Minimal |
| G11 | **Authorize on the parent, pin the parent on conflict.** The actor's role comes from the parent named in the payload (match, then session), never from the row's own ID. If the ID already exists under a different parent, the save fails with `CONFLICT`. | Backend-owned rules |
| G11a | Side effects run only when they apply, and never lower anything. Saving a player grants access only if the account is not a member yet. | Replayable |
| G12 | `remove` of a missing row succeeds. So does `remove` of a row the actor cannot see. If the actor can see it but lacks the role, the result is `FORBIDDEN`. | Replayable |
| G12a | `save` replaces all editable fields of the row. Omitted optional fields become null. There are no partial updates. | Declarative |
| G13 | Writes return a minimal acknowledgement. The frontend revalidates and re-reads. | Minimal |
| G14 | Hard delete removes dependents in order inside the transaction. Only accounts soft delete. Videos survive session deletion. Only their session and game links go. In the UI, "Delete" is the word for `remove` on a record, and "Remove" is the word for a link or member. | Minimal |
| G15 | No concurrency control for now. Last write wins. Known gaps: two concurrent `matches.saveMatchPlayers` calls can put one account on both teams of a match, and `members.remove` can race with `matches.saveMatchPlayers`. Closing the first needs a `match_id` column on `match_players` with a unique index. | Minimal |

### Cross-cutting

| # | Guideline | Principle |
|---|---|---|
| G16 | No actor parameter. Each function derives the acting account from the auth session. | Backend-owned rules |
| G17 | Validate input with Zod once, inside the use case. Export the schemas for frontend forms. | Minimal |
| G18 | Trust database constraints. Map violations to error codes. Do not re-check in code. | Minimal |
| G19 | Expected failures return a typed result with a code from a closed list. Unexpected failures throw. | Backend-owned rules |
| G20 | No access reads as `NOT_FOUND`. `FORBIDDEN` only when the actor can see the thing but lacks the role. | Backend-owned rules |

## How a "save" works

One statement per table. Postgres handles insert or update in one pass.

```sql
INSERT INTO smackosoft.match_games (id, match_id, game_number, start_time, end_time, created_by)
VALUES (...), (...)
ON CONFLICT (id) DO UPDATE
  SET game_number = EXCLUDED.game_number,
      start_time  = EXCLUDED.start_time,
      end_time    = EXCLUDED.end_time,
      updated_at  = now(),
      updated_by  = $actor
WHERE match_games.match_id = EXCLUDED.match_id;   -- G11: do not move rows
```

Notes:

- `ON CONFLICT DO UPDATE` is atomic under concurrency and fails if one statement touches the same row twice ([PostgreSQL INSERT docs](https://www.postgresql.org/docs/current/sql-insert.html)). That is why G10 exists.
- Rows that fail the `WHERE` are not returned. Compare the returned count to the input count to detect a blocked row, then return `FORBIDDEN` or `NOT_FOUND`.
- Videos use two tables, `video_sessions` (the video is in the session) and `video_games` (the video is linked to a game), so each has one plain unique key and no `NULL` arbiter.

## Error model

Server Actions always return HTTP 200 to the caller. Status codes are not visible to your code. The Next.js docs say to model expected errors as return values and throw only for unexpected ones ([Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)). So the contract borrows HTTP words as codes, not as statuses.

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; issues?: { path: (string | number)[]; message: string }[] } }

type ErrorCode =
  | 'UNAUTHENTICATED' // no session. Frontend redirects to login.
  | 'NOT_FOUND'       // missing, or the actor has no access
  | 'FORBIDDEN'       // visible, but the role is too low
  | 'VALIDATION'      // bad input. `issues` carries Zod paths, including array index.
  | 'CONFLICT'        // a unique or foreign-key constraint blocked the write
```

There is no `reason` field. Every error points at the input item that caused it through `issues[].path`, so the frontend branches on `code` plus `path`. `message` is for humans. Add a `reason` later only if a screen needs it. That change is additive.

| Situation | Code | Frontend action |
|---|---|---|
| Not signed in | `UNAUTHENTICATED` | Redirect to login |
| Session id unknown or not yours | `NOT_FOUND` | Show not found |
| Viewer tries to edit | `FORBIDDEN` | Disable the control |
| Score is negative | `VALIDATION` | Show the field error from `issues` |
| Handle already taken | `CONFLICT` | Ask for another handle |
| Bug, database down | throw | Error boundary |

## Rules the backend owns

| Rule | Where it lives |
|---|---|
| The creator of a session becomes `OWNER`. | `sessions.save` on insert |
| A player is always a member. A member may or may not be a player. | Invariant, see below |
| Saving a match player makes the account a `VIEWER` member if it is not one. It never lowers an existing role. | `matches.saveMatchPlayers` |
| Removing a match player does not remove membership. | `matches.removeMatchPlayers` |
| Removing a member who is still a player fails with `CONFLICT`. Remove the player first. | `members.remove` |
| Anyone can remove themselves from a session, which is how a member leaves. The owner cannot. | `members.remove` |
| Exactly one `OWNER`, the creator. No transfer, no demotion. `members.save` cannot grant `OWNER` or touch the owner's row. | `members.save`, `members.remove` |
| Every account may change its handle twice after it is first set. Saving the same handle is not a change. Backed by `accounts.handle_change_count`. | `accounts.saveGuests`, `accounts.saveCurrent` |
| Handles are free for anyone once released. | Accounts |
| An editor puts a video in a session if they own it, or if it is already in that session. | `videos.saveVideoSessions` |
| A game link also puts the video in the game's session. A game link with a null `canonicalOffset` is not synced yet. A session link has no offset. | `videos.saveVideoGames` |
| Removing a session link removes the video's game links in that session. Removing a game link keeps the session link. | `videos.removeVideoSessions`, `videos.removeVideoGames` |
| A new auth user gets an account from an explicit `accounts.saveCurrent` call on onboarding. No lazy creation. | `accounts.saveCurrent` |
| A player cannot be on both teams of one match. | `matches.saveMatchPlayers` |
| A score's team and game must belong to the same match. | `matches.saveGameScores` |
| A match holds at most as many games as its `format` allows (`BO1` 1, `BO3` 3, `BO5` 5, `FREE` no limit). A match may hold fewer games than its format. A game played on its own is a `BO1` match. A format cannot shrink below the games the match already has. | `matches.saveGames`, `matches.save` |
| A game link needs `EDITOR` on the game's session. The session comes from the game, so a game link cannot point at another session. | `videos.saveVideoGames` |
| Adding a member gives instant access. No acceptance step. | `members.save` |
| A `VIEWER` reads everything in the session. | All reads |
| Only the creator of a guest account can edit it. | `accounts.saveGuests` |
| Removing a guest is a soft delete. Past matches keep it. The handle becomes free. | `accounts.removeGuests` |
| A guest is claimed with a claim code the creator made. The guest row becomes the claimer's account, with its history. Only someone with no account can claim. | `accounts.createClaimCode`, `accounts.claim` |
| Scores are stored as entered. Operational reads never mark winners. The frontend decides. | Operational reads |
| Only the analytics surface defines "win". See below. | Analytics reads |

## Vocabulary

| Term | Meaning |
|---|---|
| Member | Account with a `session_access` row. Has a role. |
| Player | Account with a `match_players` row in a match of the session. Always a member. |
| Guest | Account of type `GUEST`. Has no login until someone claims it. |
| Claim code | Secret on a guest account. Whoever redeems it becomes that account. |

Code says account. The UI says Profile for your own account. `accounts.handle_change_count` counts changes up. The contract field `handleChangesLeft` counts down.

## Two read surfaces

| | Operational | Analytics |
|---|---|---|
| Purpose | Drive the screens that view and edit sessions | Show derived numbers |
| Stability | Stable. Changes are additive. | Provisional. Expect to change with frontend feedback. |
| Home | `reads/` | `stats/` |
| Rule | No derived business meaning | The only place that defines "win" |

Minimum for now:

| Use case | Returns | "Win" definition (provisional) |
|---|---|---|
| `stats.get` | Matches played, win rate, current streak | A match is won by the team with more game wins. Equal or no scores is neither win nor loss. |
| `stats.getTeammates` | Per teammate: games, wins, losses, win rate | A game is won by the higher score. Equal is neither. |

The crown on a screen is a frontend decision and the backend stats may disagree with it. We accept this until stats mature.

## Permissions

Confirmed.

| Role | Can |
|---|---|
| `VIEWER` | Read the session, including videos |
| `EDITOR` | Edit matches, teams, games, scores, players |
| `MANAGER` | Edit session details, manage members |
| `OWNER` | Delete the session, change `OWNER` or `MANAGER` roles |

## Use cases

Reads are one per screen or lookup. Writes follow one pattern: `save` and `remove` per entity.

### Reads

| Use case | Screen | Min role |
|---|---|---|
| `sessions.list` | Sessions home | any member |
| `sessions.get` | Session Details | `VIEWER` |
| `accounts.getCurrent` | Dashboard header, onboarding check | signed in |
| `sessions.list({ from?, to? })` | Sessions home, dashboard upcoming | signed in. Default window: last month through next month. The frontend may override. Ordered by date, then start time (no start last), then creation. The Sessions page asks for all time. |
| `accounts.findByHandle` | Add members | signed in |
| `accounts.isHandleFree` | Onboarding and Profile, checks a handle as it is typed. Your own handle counts as free. | signed in. Works before onboarding. |
| `videos.listBySession` | Videos page, session videos row, Match Details video counts. Each row has a nullable `matchGameId` and `canonicalOffset`, plus `changedByName` and `changedAt` (the last editor of the offset, or the person who made the link). | `VIEWER` |
| `videos.listOwn({ sessionId? })` | Video management UI with session context | signed in. With `sessionId`, each video also lists its links in that session. |

`sessions.get` also nests matches, teams, games and scores. There is no separate match read.

`stats.get` and `stats.getTeammates` live on the analytics surface above.

Unverified: `videos.listOwn` follows the fourth story in the story map, "link their own videos to session/match". The story map shows no screen for it. This reading is an inference, and no page calls it today.

### Writes

| Entity | Save | Remove | Key (G8) | Min role | Notes |
|---|---|---|---|---|---|
| Session | `sessions.save` | `sessions.remove` | client UUID | new: signed in. Existing: `MANAGER`. Remove: `OWNER` | Creator becomes `OWNER` on insert. Court fee and currency saved together. `timezone` (IANA name) is required. `date` is the day in that zone. |
| Member | `members.save` | `members.remove` | session, account | `MANAGER` | One call adds people and changes roles. Cannot grant `OWNER`. |
| Match | `matches.save` | `matches.remove` | client UUID | `EDITOR` | |
| Team | `matches.saveTeams` | `matches.removeTeams` | client UUID | `EDITOR` | |
| Match player | `matches.saveMatchPlayers` | `matches.removeMatchPlayers` | team, account | `EDITOR` | Also makes the account a `VIEWER` member if missing. Adding a new member takes `MANAGER`. |
| Game | `matches.saveGames` | `matches.removeGames` | client UUID | `EDITOR` | Frontend supplies start and end time. |
| Game score | `matches.saveGameScores` | `matches.removeGameScores` | team, game | `EDITOR` | Removing a game removes its scores. Clearing one team's score leaves the game and the other score. No screen clears a score today. |
| Guest account | `accounts.saveGuests` | `accounts.removeGuests` (soft delete) | client UUID | signed in | Creator edits it. Handle changes twice at most. `accounts.listGuests` reads them. |
| Video | `videos.save` | none | client UUID | own videos only | Record only. No storage upload. `durationSeconds` is the length the app read when the video was added, or null. |
| Video in a session | `videos.saveVideoSessions` | `videos.removeVideoSessions` | video, session | `EDITOR` | The video is the actor's own, or already in the session. Removing also removes its game links in that session. |
| Video in a game | `videos.saveVideoGames` | `videos.removeVideoGames` | video, game | `EDITOR` | Also puts the video in the game's session. `canonicalOffset` is seconds, null when not synced. Saving again only updates the offset. |

## Side effects are documented, not named

Methods are `save` and `remove`, namespaced by feature (`videos.save`). A command that also writes another entity says so in its doc comment in the feature file under `src/contract/`.

| Command | Also writes |
|---|---|
| `sessions.save` | The creator's `OWNER` member row, on insert only |
| `matches.saveMatchPlayers` | A `VIEWER` member row if the account is not a member yet |
| `videos.saveVideoGames` | A `video_sessions` row if the video is not in the game's session yet |

Not built, because no screen needs them: highlights and video deletion.

### Order of saves for a frontend save

Foreign keys fix the order. Replaying the whole sequence is always safe.

1. `sessions.save`
2. `members.save`, `matches.save`
3. `matches.saveTeams`, `matches.saveGames`
4. `matches.saveMatchPlayers`, `matches.saveGameScores`
5. Then `remove*` calls

## Schema notes

| Note | Impact |
|---|---|
| `match_games.start_time` and `end_time` are `NOT NULL`. | The frontend must send them. |
| Child tables now cascade on delete. | The delete helpers still remove dependents in order. They can be simplified later. |
| `accounts.handle_change_count` counts handle changes. The database only checks it is not negative. The limit of 2 lives in the backend. | In the init migration. |
| Nothing creates an `accounts` row when someone signs up. | `accounts.saveCurrent`, called from an onboarding step. See "Account creation and handles". |

## Account creation and handles

The frontend provides the handle and display name on an onboarding step after the first sign-in. The backend does not generate handles.

| Why | Detail |
|---|---|
| Simpler backend | No generator, no retry loop. The unique index decides, and a taken handle returns `CONFLICT` on `handle`. |
| Handle changes are not wasted | A generated first handle would burn one of the two changes. |
| `display_name` is required | Something must collect it anyway. |

- `accounts.saveCurrent({ displayName, handle, avatarUrl? })` creates the account on first call and updates it later. A changed handle counts against `handle_change_count`. `avatarUrl` is stored on creation only, and must be an https link on `*.googleusercontent.com`.
- Every use case, including `accounts.getCurrent`, returns `UNAUTHENTICATED` when there is no session or no account. One rule, no exceptions.
- The frontend already knows whether a Supabase session exists (`src/proxy.ts`). Session present plus `UNAUTHENTICATED` from `accounts.getCurrent` means onboarding.
- `accounts.saveCurrent` and `accounts.isHandleFree` are the only use cases that work without an account.
- Not decided: what happens when two sign-ups race for one handle. The unique index handles it.

## Implementation notes

What the code does that the tables above do not say.

| Topic | Behavior |
|---|---|
| Transactions | Each `write` runs in one transaction. Any error rolls the whole call back. |
| Empty arrays | A write with `[]` returns success without touching the database. |
| Existing id under another owner | `CONFLICT` with no detail. Applies to sessions, matches, teams, games, videos and guests. |
| Parent pinning | `matches`, `match_teams` and `match_games` upserts only update when the parent is unchanged. Moving a row returns `CONFLICT`. |
| Manager role | Granting, changing or removing a `MANAGER` needs `OWNER`. |
| Owner row | `members.save` and `members.remove` return `CONFLICT` for the owner's row. |
| Player on one team | `matches.saveMatchPlayers` returns `CONFLICT` if the account is on another team of the match, in the call or already saved. |
| Score and game | `matches.saveGameScores` returns `CONFLICT` when the team and game belong to different matches. |
| Video in a game | One insert into `video_sessions` (do nothing on conflict), one upsert into `video_games`. |
| Deletes | `remove*` deletes dependents first, in order. Videos stay. Their session and game links go. |
| Stats | Computed in memory from the actor's matches. Provisional. |

### Known limits

| Limit | Impact | Fix when needed |
|---|---|---|
| Swapping `gameNumber` between two games in one `matches.saveGames` call fails on the unique constraint | `CONFLICT` | Nothing renumbers games today. Add a deferrable constraint or a temporary number if a screen needs it. |
| `sessions.list` filters on the saved `date`, which is in the session's own zone | A session can be a day outside a window that the viewer sees it inside. Home asks a day wider each side to cover it. | Filter on the start instant |
| The Sessions page loads every session | Slow with thousands of sessions | Page the reads by date |
| No React `cache` around reads | A layout and a page calling the same read query twice | Wrap the read in `cache` where a screen needs it |
| Stats load all of the actor's matches | Slow with thousands of matches | Move to SQL |
| Account bootstrap relies on the frontend calling `accounts.saveCurrent` | A signed-in user without an account gets `UNAUTHENTICATED` everywhere | Route to onboarding when `accounts.getCurrent` fails with a session present |
