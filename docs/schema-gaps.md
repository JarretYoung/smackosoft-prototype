# Schema gaps

What the schema does not cover yet, and what we chose not to add. The migration is `supabase/migrations/20260901102322_init.sql`.

## Open gaps

| Gap | Today | Fix when needed |
|---|---|---|
| `match_games.start_time` and `end_time` are `NOT NULL`, but no screen asks for them | The match editor fills in a default of 20 minutes (`DEFAULT_GAME_MINUTES` in `src/features/matches/match-draft.ts`) | Make both columns nullable. A game does not need clock times. |
| Real video upload | `videos.video_url` holds a link. The contract allows an `r2` scheme as a placeholder. | Add storage key, size, type, duration and upload status when you choose storage. |

## Decided: not done on purpose

| Idea | Why not |
|---|---|
| A database limit of two teams per match | The backend enforces it. `matches.saveTeams` refuses a third team and `matches.removeTeams` refuses to remove the last one. |
| Deferrable game numbers | Nothing renumbers games. A deferrable unique constraint cannot be an `ON CONFLICT` arbiter or a foreign key target ([PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)). |
| Composite keys for "one team per player per match", "score team and game share a match" and "linked game belongs to the session" | They need `match_id` and `session_id` copied onto child rows. The backend checks cover them and tests prove them. |
| Derive the session time from its games | An upcoming session has no games yet, and the home screen shows its planned time. Keep both. |
| A status on sessions or matches | No screen needs one. |
| Soft delete for sessions and matches | Hard delete. Only accounts soft delete. |

## Why child tables cascade

Delete cascades from a parent to rows that cannot exist without it: session to matches, access rows and video links, match to teams and games, team to players and scores, game to scores, highlights and video links, and video to its links. The PostgreSQL manual gives the same test ([foreign keys](https://www.postgresql.org/docs/current/ddl-constraints.html)).

No cascade reaches an independent record. A session delete never deletes an account or a video. The screens ask for confirmation before a delete, because it cannot be undone.
