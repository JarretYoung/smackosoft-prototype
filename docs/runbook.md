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

Run `pnpm db:types` after every migration and after every `pnpm supabase db reset`. It reads `DATABASE_URL` from `.env.local` and rewrites `src/server/db/types.ts`. Commit the result.

### Tests

| Command | What it runs | Needs |
|---|---|---|
| `pnpm test` | Unit and backend tests in `tests/`. A disposable Postgres starts in Docker and stops after. | Docker running |
| `pnpm test:coverage` | Same, with a coverage report | Docker running |
| `pnpm test:shuffle` | Same, in random order | Docker running |
| `pnpm test:e2e` | Playwright browser tests in `e2e/` against the real app | Steps below |

`pnpm test` tests create their own people and ids, so they never touch the local Supabase database.

### End to end tests

The Playwright tests in `e2e/` drive the real app in a browser. They run on demand and are not part of `pnpm test`.

What they cover:

- Log in, log out, sign up with the confirmation email, and password reset through the email link.
- Wrong password, weak password and existing email messages.
- The session form: validation, the discard prompt, saving an edit and times past midnight.
- A viewer who cannot edit, the profile form, scoring a match and syncing a video.
- Accessibility: axe-core on the main screens, failing on serious and critical violations.

Set up once:

1. `pnpm supabase start`
2. `pnpm supabase db reset`. The tests log in as `ian@smacko.test` and `nadree@smacko.test`.
3. `pnpm dev`

Commands:

| Command | What it does |
|---|---|
| `pnpm test:e2e` | Runs everything: the setup login, then all four timezone projects |
| `pnpm exec playwright test --project=mobile` | Runs every spec in Kuala Lumpur time only. This is the quick run |
| `pnpm exec playwright test --project=tz-london` | Runs only the time specs in one zone. Others: `tz-los-angeles`, `tz-auckland` |
| `pnpm exec playwright test session-form --project=mobile` | Runs one spec file |
| `pnpm exec playwright test -g "viewer" --project=mobile` | Runs tests whose title matches |
| `pnpm exec playwright show-report` | Opens the HTML report from the last run |

Rules:

- Locally the tests never start a server and never reset the database. A global setup checks the app (port 3000), the Supabase API (54321) and Mailpit (54324). It lists what is missing.
- Each test makes its own data with unique names. Run them as often as you like without a reset.
- Only the spec for a flow drives that flow through the UI. Other specs insert their prerequisites with `e2e/support/db.ts`, which uses `DATABASE_URL` from `.env.local`.
- A setup project logs in once and saves the cookies in `e2e/.auth` (not committed). Specs that test signed out screens opt out with `storageState`.
- Every test fails on a browser console error, an uncaught page error or a 5xx response. The exclusions are listed in `e2e/support/test.ts`.
- The `newUser` fixture signs up a fresh person through the real forms and Mailpit.
- Only `session-times.spec.ts` runs in the extra timezones. The other specs run in `mobile`.
- One worker, phone size viewport, address `127.0.0.1` (not `localhost`). Supabase email links use `127.0.0.1`, and `next.config.ts` only hydrates pages opened there.
- Local Supabase allows 20 emails an hour. A full run sends 4. Wait if you see "Too many emails sent".
- CI retries a failed test once. Locally nothing retries.
- The HTML report lands in `playwright-report/`.

### Running the e2e tests in CI

- Start Supabase and apply the migrations and seed first (`pnpm supabase db reset`).
- Set `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Run `CI=1 pnpm test:e2e`. It builds the app, starts the production server on port 3000, retries once and fails a test that only passes on retry.
- Run `pnpm check` for types, lint, unused code and the unit tests.

### Unused code check

`pnpm knip` lists unused files, exports and dependencies. Run it before you merge. It should report nothing.

### Known environment issue

On some Windows machines `supabase start` fails with "ports are not available" for 54322. Windows reserves port ranges that include Supabase's defaults. Check with `netsh interface ipv4 show excludedportrange protocol=tcp`. A restart usually clears it.
