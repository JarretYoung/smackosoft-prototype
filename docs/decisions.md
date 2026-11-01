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
- Watching comes first, managing second. The Videos page is one screen: a playlist where each game is a row, in the order played. A game with no video shows "Add a video". Videos that no game uses sit under the list as "Not linked to a game". There is no separate recordings screen. Games and videos are mostly 1 to 1 and a session has up to 10 games, so one list is enough.
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
