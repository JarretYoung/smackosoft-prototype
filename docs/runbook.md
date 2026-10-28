## Runbook

This is a running list of steps we should do when we deploy to a fresh environment for the first time.

- Run new database migrations with nextjs deployment
- Set the `smackosoft_service` Postgres role's password
  - `ALTER ROLE "smackosoft_service" WITH PASSWORD '...'`
- Set `DATABASE_URL` for the app to the `smackosoft_service` connection string

## Local development

### Start the database with sample data

1. `pnpm supabase start`
2. `pnpm supabase db reset`. This applies the migrations and `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local`. Use the keys printed by `supabase start`. The local `DATABASE_URL` is `postgres://smackosoft_service:postgres@127.0.0.1:54322/postgres`. The seed sets that password.
4. `pnpm dev`

Run step 2 any time you want the sample data back. It wipes the local database.

### Sample logins

All users share the password `Password123`.

| Email | Person | Role in the seed |
|---|---|---|
| `ian@smacko.test` | Ian Chong (`@ianczm`) | Owns 3 sessions, plays in the finished match |
| `izaaq@smacko.test` | Izaaq Izham | Editor of Thursday Smash |
| `nadree@smacko.test` | Nadree Omar | Viewer |
| `justin@smacko.test` | Justin Chong | Viewer |
| `jarret@smacko.test` | Jarret Young (`@jayrome`) | Owns Last Week Doubles |

The guest `Aadit` has no login. Ian created it.

### Google sign in

Do this once before `pnpm supabase start`. Google is enabled in `supabase/config.toml`, and the CLI needs both values.

1. In Google Cloud Console, create an OAuth client of type Web application.
2. Add this authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
3. Create `supabase/.env` (not committed) with:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
   ```
4. Run `pnpm supabase stop`, then `pnpm supabase start`.

A new Google user lands on onboarding to pick a handle, like any new user. On the hosted project, enter the same two values under Authentication, Sign in providers, Google, and use the callback URL shown there.

### Regenerating database types

Run `pnpm db:types` after every migration. It reads `DATABASE_URL` from `.env.local` and rewrites `src/server/db/types.ts`. Commit the result.

### Tests

`pnpm test` starts a disposable Postgres in Docker, runs the suite and stops it. Docker must be running. `pnpm test:coverage` adds a coverage report. `pnpm test:shuffle` runs in random order.

Tests create their own people and ids, so they never touch the local Supabase database.

### Known environment issue

On some Windows machines `supabase start` fails with "ports are not available" for 54322. Windows reserves port ranges that include Supabase's defaults. Check with `netsh interface ipv4 show excludedportrange protocol=tcp`. A restart usually clears it.
