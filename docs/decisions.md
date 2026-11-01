# Decisions

Standing decisions about how the app is built. Read them before you change the schema, the backend or the look.

## Product
- Design: light mode only, white background, red accent, shadcn, mobile first. No dark mode. See [design.md](design.md).
- Past session days on the Home calendar use the same red as upcoming ones.
- The session form is independent of the viewer's clock. You pick the time zone in the same form, and the times you type are in that zone.
- Hosting: staging runs on Supabase and Vercel. Production is not set up yet.

## Backend
- Backend rules live in [use-cases.md](use-cases.md). The contract in `src/contract` is the source of truth.
- The schema stays dumb. It holds structural checks only.
- The app is the one trusted writer. Business rules and races live in the backend.
- A schema change goes into the init migration or into a new migration. Decide which before you write it.

## Data
- `canonical_offset` is the video timestamp of a game's canonical 0. It is a per-game sync marker, such as a first hit or a clap. It is negative when the video started after that moment. `NULL` means not synced. Links from a session to a video have no offset.
- Session times are `timestamptz`. The app shows them on the viewer's clock. See [architecture.md](architecture.md#time-and-timezones).
- Game times stay `NOT NULL`. Session planned times are kept.
- A game always belongs to a match. A game played on its own is a match with `format` `BO1` and one game. There is no game without a match and no nullable parent.
- `matches.format` is `BO1`, `BO3`, `BO5` or `FREE`. It is stored, never derived from the game count. The backend limits the games to the format. A match may hold fewer games than its format. `FREE` has no limit, for casual play where nobody knows the count.
- Never call a format "single". It reads as singles, the badminton event. The words are "Best of 1" and "Free format".
- The session page has two sections. Matches (`BO3`, `BO5`, `FREE`) show a match card that opens the match. Games (`BO1`) show the same game card you see inside a match, and it opens that game's videos. The extra match step is gone for a game on its own.

## Videos
- Watching comes first, managing second. The Videos page has two lenses: Games (a playlist of games in time order, the way to watch) and Recordings (the raw files, sync state and assignment).
- A video plays in the page when its link is from a supported provider (YouTube first), through a player behind a provider interface. Any other link opens in a new tab as today.

## Speed and freshness
- Users are in Kuala Lumpur. The target is Supabase and the app in Singapore. Staging sits in Seoul by accident, so a round trip there is slow. Cut round trips first, because that holds in any region.
- The tabs (Home, Sessions, Profile) open from the browser's cache and redraw in place. Details are in [architecture.md](architecture.md#navigation-caching-and-freshness).
- The calendar must show the truth soon. A tab older than 10 seconds redraws when it appears. A cached tab is never older than 30 seconds.
- Nothing is cached on the server between requests. Access follows the database on every request. A removed member or deleted account loses access on the next request, as before.
- Forms and detail pages are never served from the cache.
- No optimistic concurrency and no offline mode for now. Last write wins.
- The database pool keeps idle connections for five minutes, and a query that runs over 15 seconds fails the request. The database does not stop it. The connection stays busy until the query ends, so the next query on it waits. A `statement_timeout` on the `smackosoft_service` role would stop it for real. That needs a migration, so it is open. Do not set `statement_timeout` as a connection option. A connection pooler rejects it.
- Risk: the tab prefetch is Next's legacy full prefetch. Next says Partial Prefetching becomes the only mode in the next major version. Re-check this when upgrading.

## Accepted, not changed
- A stale role window in `saveMembers` and `removeMembers`.
- A pre-check in `assertHandlesFree`.
