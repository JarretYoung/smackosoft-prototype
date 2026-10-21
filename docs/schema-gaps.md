## Schema gaps

What the product needs that the schema did not cover, and what we did about it. All changes are in `supabase/migrations/20260901102322_init.sql`. Run `pnpm supabase db reset` to apply them locally.

## Applied

| Change | Why | Backend work it unlocks |
|---|---|---|
| One `OWNER` row per session (partial unique index) | Exactly one owner, the creator | Nothing new. The database now backs the existing rule. |
| `accounts.claim_token`, unique, guests only | A person can adopt a guest account at sign up instead of creating a second one | `accounts.createClaim`, `accounts.claim` |
| Guests never have `user_id` (check) | A guest has no login until it is claimed | Claiming sets `user_id` and `account_type` together |
| Index on guests by `created_by` | List the guests someone created | `accounts.listGuests` |
| `sessions.start_time`, `end_time` (nullable) | The home mockup shows "9:00 am to 11:00 am" before any game is played | Session form and reads need two optional fields |
| `sessions.location_url` (nullable) | A maps link next to the location text | Session form and reads need one optional field |
| `sessions.cover_url`, `videos.thumbnail_url`, existing `accounts.avatar_url` | Anywhere an image shows, we store a URL for now | Fields on the contract when a screen needs them |
| `ON DELETE CASCADE` on the child tables below | See "Why cascade" | The helpers in `src/server/remove.ts` can shrink |

Guest deletion is a soft delete (`accounts.deleted`). That already exists. It keeps old matches intact and frees the handle, because the handle index ignores deleted accounts.

## Teams per match: backend only

A match has one or two teams. The schema does not enforce it. The backend does: `matches.saveTeams` refuses a third team and `matches.removeTeams` refuses to remove the last one.

## Why cascade

Cascade only where the child is a component of the parent and cannot exist without it. The PostgreSQL manual gives the same test: cascade fits when "the referencing table represents something that is a component of what is represented by the referenced table and cannot exist independently" ([PostgreSQL: foreign keys](https://www.postgresql.org/docs/current/ddl-constraints.html)).

| Parent | Cascades to | Why it is a component |
|---|---|---|
| Session | Matches, access rows, video links | They only make sense inside the session |
| Match | Teams, games | Same |
| Team | Players, scores | Same |
| Game | Scores, highlights, video links | Same |
| Match player | Highlights | Same |
| Video | Its links | A link without a video is meaningless. The session is untouched. |

No cascade crosses into something independent. Accounts are never deleted by these rules, and a video is never deleted when a session goes.

The cost is that one delete can remove a lot. Two habits keep that safe:

- Only the backend deletes, and the screens ask for confirmation. The session and match dialogs name what will go.
- Child foreign key columns are indexed, so a cascade does not scan tables. They are.

The alternative is `RESTRICT`: the delete fails until the user removes each child first. That is safer for shared data, but for badminton scores it means deleting every game, team and match by hand before a session. The other common advice is to confirm what you cannot undo and undo what you can ([overview of destructive action patterns](https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/)). We confirm because a hard delete cannot be undone.

## Open: needs a decision

| Gap | Options | Recommendation |
|---|---|---|
| Session `start_time` and `end_time` are a plan. Game times are what happened. Can the session time come from the games? | Derive it, or keep both | Keep both. An upcoming session has no games yet, and the dashboard shows its time. |
| `match_games.start_time` and `end_time` are required, but no screen collects them. The editor fills in a fake 20 minutes. | Make them nullable, or keep them required | Make them nullable. A game does not need clock times. |
| Real video upload | Needs storage key, size, type, duration, upload status | Add them when storage is chosen. Today `video_url` holds a link. |

## Not done on purpose

| Idea | Why not |
|---|---|
| A database limit of two teams | The backend enforces it. |
| Deferrable game numbers | Nothing renumbers games. A deferrable unique constraint cannot be an `ON CONFLICT` arbiter or a foreign key target, so it has real costs ([PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)). |
| Composite keys so the database enforces "one team per player per match", "score team and game share a match" and "linked game belongs to the session" | They need `match_id` and `session_id` copied onto child rows. The backend checks cover them and are tested. |
| A status on sessions or matches | No screen needs it |
| Soft delete for sessions and matches | Decided: hard delete. Only accounts soft delete. |
