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

## Accepted, not changed
- A stale role window in `saveMembers` and `removeMembers`.
- A pre-check in `assertHandlesFree`.
