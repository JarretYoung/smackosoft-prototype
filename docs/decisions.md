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
- Games have no clock times. The old defaults of "now plus 20 minutes" were made up, and nothing needed them. The length of a game is its video's length. Only a session has start and end times, and both are optional.
- Order is by design, not by clock. Sessions go by date, then start time (none last), then creation. Matches go by `matches.position`. Games in a match go by `game_number`. The backend gives a new match the next position. Gaps are fine and nothing renumbers.
- `videos.source_key` names the video a link points at (`youtube:<id>`), whatever shape the link has. The server sets it from the link on every save. It is not unique, because the same video can be added again by hand. The bulk import uses it to skip a video the person already has.
- A game always belongs to a match. A game played on its own is a match with `format` `BO1` and one game. There is no game without a match and no nullable parent.
- `matches.format` is `BO1`, `BO3`, `BO5` or `FREE`. It is stored, never derived from the game count. The backend limits the games to the format. A match may hold fewer games than its format. `FREE` has no limit, for casual play where nobody knows the count.
- Never call a format "single". It reads as singles, the badminton event. The words are "Best of 1" and "Free format".
- The session page has two sections. Matches (`BO3`, `BO5`, `FREE`) show a match card that opens the match. Games (`BO1`) show the same game card you see inside a match, and it opens that game's videos. The extra match step is gone for a game on its own.

## Videos
- Watching comes first, managing second. The Videos page is one screen: a playlist where each game is a row, in the order played (match position, then game number). A game with no video shows "Add a video". Videos that no game uses sit under the list as "Not linked to a game". There is no separate recordings screen. Games and videos are mostly 1 to 1 and a session has up to 10 games, so one list is enough.
- A row leads with the video's own label, then the game and its result. The video's length sits bottom right of the thumbnail, where YouTube puts it. The sync point is not shown on the row. It is in the "…" menu and in the "needs syncing" line.
- Video.js 10 is the wrapper and YouTube's own minimal controls are the controls. The app uses `@videojs/react` with its `YouTubeVideo` media element and `controls` on, with no Video.js skin. Video.js is there to make the player ours to drive: `mediaRef` gives a `<video>`-like adapter (`currentTime`, `duration`, `pause()`), and the media events (`onTimeUpdate`, `onPause`, `onSeeked`, `onPlaying`) arrive as React props, so the sync sheet can link the player to React state without our own player-API code.
- We tried two Video.js skins and removed both: the editable shadcn skin (about 40 files and 530 lines of injected CSS, with cast, AirPlay and quality controls that do not apply to YouTube) and the packaged `NeutralVideoSkin`. With a skin over a YouTube embed, YouTube's own paused overlay still shows underneath. If a skin is wanted later, the packaged one is `import { NeutralVideoSkin } from "@videojs/react/video"` plus `@videojs/react/video/neutral-skin.css`, and the editable one comes from the shadcn registry (`pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/{name}.json`, then `add @videojs/video` without `--overwrite`).
- YouTube's chrome stays as quiet as the embed allows: `rel: 0` (related videos only from the same channel), `iv_load_policy: 3` (no annotations), white controls, and `disablekb: 1`. YouTube's keyboard shortcuts are all off, because its frame step (`,` and `.`) and jump to a percent (`0` to `9`) would move the video without the sync sheet knowing, and fire while typing a time. YouTube only offers all or nothing, so space and the arrow keys are off too. While playing, nothing of YouTube's shows over the picture. While paused or before the first play, YouTube draws its own title, channel, share, watch later and logo. No embed parameter removes that, and hiding it would conflict with YouTube's rules for embeds (not verified, check before trying).
- Why not the old Video.js 8 line with `videojs-youtube`: v10 is the current line and has a YouTube element of its own. The plugin only declares support for Video.js 5 to 8.
- A video plays in the page when its link is from a supported provider. `playableOf` in `src/features/videos/player.ts` decides, and `VideoPlayer` renders it. YouTube is the only provider today, started at the sync point. Any other link opens in a new tab at the sync point. To host our own files later, use the `Video` or `HlsVideo` elements from `@videojs/react` in the same place.
- Playback is controlled in one place, `VideosPanel`, which holds what is playing. Only one player runs at a time, and the page player plays only while nothing sits over the page. Opening any sheet (add, pick, sync) stops it, and closing the sheet leaves it stopped, so a video never plays under a sheet and never restarts by itself. The sync sheet has its own preview, which is the only player while it is open.
- Leaving the Videos page stops and removes the player. The app keeps the previous page mounted but hidden so going back is instant, and a hidden YouTube iframe keeps playing audio (reproduced: after Back, the iframe was still in the page). React runs effect cleanups when a page is hidden as well as when it unmounts, so the panel clears its playing state in a cleanup. Do the same for any future screen that holds a player. Switching browser tabs or locking the phone does not stop it, which is how YouTube normally behaves.
- The YouTube thumbnail comes from the link itself (`thumbnailOf`), so no API key and no stored image. A thumbnail saved on the video wins.
- The length of a video is stored in `videos.duration_seconds`, read once when the video is added. It is a snapshot, like the sync point. Reading it for every row on every visit would mean one hidden player per video. While the person fills in the Add video sheet, a hidden Video.js element (`DurationProbe`) loads the pasted link and reports its length, so adding does not wait. If the length is not known when they submit (private video, blocked embed, offline, or the link is not YouTube), the video still saves with no length and the row shows none.
- The sync sheet shows a live preview for YouTube links (`sync-preview.tsx`), linked to the number in both directions. Play the video to the first serve and pause, and the sync point already reads that moment. It follows while playing, on a pause, and on a seek, including a scrub on YouTube's own bar. Move the number with the ruler, the steps or by typing, and the video jumps there and waits. A link that cannot play has no preview, and the sheet works as before.
- The sync point is kept to the millisecond and shown with hundredths when it has them (`0:10.03`). The ruler steps a 30th of a second (`FRAMES_PER_SECOND` in `offset.ts`), which is one frame for 30 fps video. YouTube does not report a video's frame rate, so 25, 24 and 60 fps are approximations. The player does report and honor fractional times (checked: it returned exactly 10.033 and 12.345 after seeking to them while paused). Whether it decodes the exact frame for every fraction is not verified. The database and contract already held fractions.
- Moving a YouTube player that has not started: seek, wait for it to play, pause it, then seek again while paused. Pausing straight after the first seek cancels it and leaves a black frame. The wait runs the video on by up to about 100 ms, so the second seek puts it back exactly. A paused player seeks exactly and stays paused. Events that follow our own moves are ignored for 700 ms, so the number and the player do not chase each other.
- Adding a video means pasting a link. Real file upload is not planned yet, and it would need storage and a schema change.

## Bulk import

### The model
- One canonical interface: `backend.imports.games` takes rows (`src/contract/imports.ts`). A source is an adapter in the frontend that turns its own shape into rows. The backend knows nothing about YouTube or CSV.
- A row is a statement: "this video is game G of match M in session S, between these two teams." The row carries its own identity. Nothing depends on another row, on file order, or on a count.

| Thing | Identity | Remembered as |
|---|---|---|
| Session | `date` and `session`. With no `session`, the day, such as "24 Oct 2026". | the session's date and label |
| Match | the `match` name, unique inside the session. No name means a game on its own. | the label "Match <name>" |
| Game | the `game` number inside its match. A game on its own is game 1. | `match_games.game_number` |
| Video | the link's source, such as `youtube:<id>` | `videos.source_key` |

- The match name is an opaque string. The importer never counts, ranks or derives it. A source may follow its own convention for names (the playlist script uses the teams and the series). Hand files write 1, 2, 3 or any words.
- A row with no `sides` is a video with no game. It goes into its session's pool (`video_sessions`) for the person to link later: another angle, a practice, a clip. It makes the session if the session does not exist. It may not have a `match`, `game` or `scores`.
- `game` is a whole number from 1. The database allows gaps (`UNIQUE (match_id, game_number)`, `> 0`), so game 3 can arrive before game 2.

### Laws
Each law is a test.
1. **Idempotent.** The same file twice changes nothing.
2. **Order and split free.** Any row order, or any split into several files, gives the same result. Only the position of new matches in a session follows the file.
3. **Append-stable.** New rows never change what earlier rows produced.
4. **Round trip.** Export of the app state, imported again, changes nothing. Export is not built. It will use the same identity rules.
5. **Conflicts are errors.** Two rows that disagree about one game, or a video already in a different game, fail with the lines or the place named. Nothing merges silently.
6. **Links only grow.** A row can add a link and never removes one.

### Sheet rules
The adapter checks the rules marked "file" at the file step, with line numbers. Continue stays disabled until the file is clean. The rules about whole files live in `src/lib/import-rules.ts` (`checkImportRows`, `checkMatchPlayers`). The adapter and the planner both call them, so no rule is written twice.

| # | Rule | Checked |
|---|---|---|
| 1 | Required columns are present. No column is unknown or repeated. `comments` is known and never read. | file |
| 2 | `game` is a whole number, 1 or more. | file |
| 3 | A game with a `match` has a game number, from the column or from the end of the title ("Game 2" or "2"). A game with no `match` has none. | file |
| 4 | A game row has two sides. No token is on both sides or twice on one side. | file, and again after names are merged |
| 5 | In one session, one match name means one pair of teams, either side first. The error names the first line. | check step only |
| 6 | In one match, each game number appears once. The error names both lines. | file |
| 7 | Each video appears once in the file, however its link is written. | file |
| 8 | A `video` row has no match, game or sides. A game row's title names two sides. | file |
| 9 | When the column and the title both give a game number, they agree. | file |

Rule 5 waits for the check step because two names can be one person. "Wen" and "Soong" can be linked to the same account in the people step, so rows that look like different teams in the raw file can be the same teams.

What only the server can decide, because it depends on what is already saved: a video already in a different game, a match name already in that session with different players, two matches in one session with the same name (the database has no unique index on the label, so this is an error and not a guess), names not yet linked to a person, permissions, handle clashes and the row limit.

### What the server does
- The import composes the real save use cases inside one transaction (`.within(ctx, input)` on `write` and `act`). No rule is written twice. Anything that fails imports nothing, and every problem comes back at once with a path to the row or person.
- A dry run runs the same code and throws `Rollback`, so the preview is exact, including handle clashes and role checks.
- Names in rows (such as `Soong`) are tokens. The caller says who each token is: an existing account, or a guest to create. The import creates only the guests that imported rows use, and the report lists them (`newGuests`, by handle and account id). A caller that sends one file after another links the next file's names to those accounts, so no guest is made twice.
- Several tokens can be one person. Tokens linked to the same account, or given the same new guest handle (compared without case), are merged before planning. The first token listed stands for them and rows are rewritten to it (`mergeAliases`). So "Wen" and "Soong" can both be `@wensoong`, sides can swap across the two spellings, and the same person on both sides of one game is still rejected.
- A session is found by the actor's own sessions (EDITOR or higher) on that date with that label, or created with the import's time zone and no times.
- A match is found by its label in that session. If it exists, its teams must be the same players in either order, and its games are added with the numbers the sheet gives. A number the match already has is an error. Sides may swap between games, and scores follow the players. A match grows into a bigger format when it must (BO1 to BO3, BO3 to BO5).
- Format is worked out from the number of games in the match: 1 is BO1, 2 or 3 is BO3, 4 or 5 is BO5, more is FREE. Rows cannot override it. Match type is worked out from the sides: 1 v 1 is `MS`, 2 v 2 is `MD`, anything else is `OTHER`. Gender is not known, so `XD`, `WS` and `WD` are set by hand afterwards.
- A video the actor already has is handled by where it is, so a row can fix an earlier import:

| Where the video is now | What the row does |
|---|---|
| Not in the app | Creates it, and links it to its game or the pool. |
| In the row's game | Nothing. Reported as already there. |
| In no game | A row with a game links the saved video to it, so an unlinked video becomes a game video. A row with no game adds it to the row's session pool if it is not there. No second copy is made. |
| In a different game | Fails, and says which session, match and game. |

- Labels are cosmetic for identity but visible. A named match is "Match <name>". A game on its own is "Game <n>", numbered on from the session's last one. New matches go last in the session, in file order. The match card shows the label. The Videos page reads a game's number mark from a trailing "Game N" in its name, so a named match with one game shows no mark.
- Adding people to an existing session takes MANAGER, as in `saveMatchPlayers`. An EDITOR who imports into a session with people it does not have gets FORBIDDEN on that row.
- At most 300 rows per import, games and videos together.
- The import sends no lengths. `saveVideos` asks each video's source for the length in one batch, so a 300 row import is a handful of calls. See Video sources below.

### Several files
- The import takes 300 rows a call, so a first load comes as several files (the script cuts them between days). The screens take them as one set and the backend sees one call per file, each in its own transaction, in name order.
- Names are linked once for the set. The rules about rows together (`checkImportRows`) run over every file at the file step, so a video or a game number used in two files is a problem before anything is sent. A file over 300 rows is a problem at once.
- After a file is imported, the next file links its names to the guests that file made (`newGuests`), so no guest is made twice.
- If a later file fails, the earlier files stay imported. Nothing is rolled back across files. Choosing the files again is safe, because rows already in are left out.
- The check step is a dry run per file, so a file does not see what an earlier file would add. Counts are summed, and a guest used in two files is counted once. The real import is exact.

### An import in progress
- The screens keep the import in the browser (`localStorage`, one draft per signed in person), so you can leave and carry on. It holds the files' text, who each name is, which names were asked about, the zone, and the step. The preview and counts are worked out again. Nothing goes to the server.
- It saves after every change. Opening Import with a draft shows "Pick up where you left off", with a "Start over" link. Finishing the import, or removing every file, clears it.
- A saved check step opens the step before it, because the check is a dry run that must be run again.
- There is no replace for a file. To change a file, remove it and add it again.
- Removing a file drops the names that only it used, with their choices. Names another file also uses keep their choice. Adding a file keeps every choice and starts only the new names from a guess, and the people step asks only about names not yet asked.
- A draft is not shared between devices. Changing the playlist after a draft was saved does nothing to the draft, which keeps the text it saved.

### Accepted limits
Each one removes code. Each fails loudly and has a one step recovery.

| Limit | Recovery |
|---|---|
| The import only adds. It never edits or deletes. | Fix wrong data in the app, or delete the session and import again. |
| The import makes one video per game. Extra angles stay in the pool and are linked in the app. | Link the angle in the app. |
| A file cannot change a match's teams. | A different team set is an error. Change teams in the app. |
| The match name is the label. Renaming a match in the app loses the join. | Do not rename imported matches, or the rows make a new match. |
| A match made by hand in the app is named "Match 1", "Match 2" and so on. A row whose `match` is "1" joins it, and fails if the teams differ. | Name imported matches with words, or check the session first. |
| A deleted match comes back on the next import, with its videos linked again. | None needed. |
| Names are linked to people in the app, outside the file. | The same file with the same links gives the same result. |
| Labels and match order are not part of equality. | None. |
| Session is one per day unless the file gives `session`. | Write `session`. |

### The playlist script
`scripts/playlist-to-csv.mjs` is a pure function of the playlist and `scripts/playlist-names.json`. It reads no CSV and writes no state.
- It writes every column on every row. A match is always named, even with one game, so a late second game joins it. Names come from the teams and the series, such as `GarNad v IanJus` and `GarNad v IanJus 2`.
- It writes `game` on every matched row. Ties break by upload time, then video id, so a newer upload does not move an older video. The one exception is a game with no number, which is numbered by guess and listed in the report. If a later video is titled with that number, the guessed game moves, and the import refuses it with the "already in a different game" error.
- A part number in a title ("Game 4.1", "Game 4.2", "Game 4 1") means one game recorded in parts. Part 1, or a lone part, is the game's video. Later parts are `video` rows in the same session, listed in the report, for the person to link in the app. So the game count stays right.
- It writes titles that are not "A vs B" as `video` rows.
- It splits a first load that passes 300 rows at day boundaries, so no match is split.
- You keep your own CSV. The script prints a full draft, and you take the new rows from the diff. Fix title typos in your CSV, not in the script.
- It never stops on a problem and never drops a row. What a person should read goes in the row's `comments` column: a game numbered by a choice (no number in the title, with other games in its match), a year worth checking (uploaded long after the game), a name not in the names file, and why a title became an unlinked video. A row with no day is written with a blank date, so the file step stops at it until one is written. The terminal report only counts them. Only a missing key or an API error stops the run.

## Video sources
- The app is written against one idea of a video: a link, a stable key (`youtube:<id>`), a length, a thumbnail and a way to play it. Nothing outside the source folders names YouTube.
- Each source has three small files, one per place the source matters: `lib/video-sources/<name>.ts` (read a link, give a thumbnail), `server/video-lengths/<name>.ts` (ask the service for a length) and `features/videos/players/<name>.tsx` (the Video.js media element). A registry in each folder picks by source. To add Vimeo you add those three files and one line in each registry.
- Lengths are read on the server, never in the browser. The source is YouTube Data API v3, `videos.list` with `part=contentDetails`: 1 quota unit per call and up to 50 videos per call. The key is `YOUTUBE_API_KEY`, server only.
- `saveVideos` fills the length when the caller gives none. A saved video keeps its length while its link is the same video, so renaming never costs a call. A length that is given wins.
- A missing key, a refused call, a private or removed video and a live stream all save the video with no length. Reading a length never fails a save.
- Not yet verified against the live API (needs a key): the exact response for a private or removed video, and a live stream's duration. The code treats both as no length.

## Search and filters
- Sessions search runs in the browser, on the sessions the Sessions page already loads (all of them, with members). Users are far from the database, so a result must not wait for a round trip. Move it to the server (Postgres `pg_trgm`) only when a person has thousands of sessions, or when search must reach what the list does not carry.
- The library is MiniSearch (`sessionSearch`, behind one function so it can be swapped). It matches word by word across fields, with prefix and typo tolerance. Fuse.js was the other candidate: it scores one pattern against one field, so a query like "ian oct" needs extra work.
- Searched: session name, place, the day as words, members' names and real handles (a guest's handle is made up, so it is not searched). Not searched: matches, games and videos. Finding games across sessions is a separate feature and needs a server query.
- Search and filters only leave out sessions. They never reorder, because the list is an archive read by date.
- The Players filter on Sessions means members of the session. It matches a session when all chosen players are members. Location and Date range filters are planned next. "Has videos" and "no time set" wait for a use case.

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
