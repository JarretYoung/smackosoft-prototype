# Smackosoft Prototype

Next.js App Router prototype with Supabase auth, running against a local Supabase stack in Docker.

Architecture: [docs/architecture.md](docs/architecture.md). Local setup, tests and first-deploy steps: [docs/runbook.md](docs/runbook.md).

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router, React 19) |
| Auth and database | Supabase (`@supabase/ssr`, cookie-based sessions) |
| Styling | Tailwind CSS + shadcn/ui |
| Package manager | pnpm |
| Local backend | Supabase CLI (Docker) |

---

## Prerequisites

- Node.js 20+
- pnpm 11+ (`corepack enable pnpm`)
- Docker Desktop, running

---

## Run locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

   The Supabase CLI is a dev dependency, so no global install is needed.

2. Start the local Supabase stack:

   ```bash
   pnpm supabase start
   ```

   First run pulls container images and takes a few minutes.

3. Copy `.env.example` to `.env.local` and fill it from the tables `supabase start` printed:

   | Env var | Where to find it |
   |---------|------------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | **APIs** table, `Project URL` row |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Authentication Keys** table, `Publishable` row |
   | `DATABASE_URL` | See [docs/runbook.md](docs/runbook.md) |

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   DATABASE_URL=postgres://smackosoft_service:postgres@127.0.0.1:54322/postgres
   ```

   Use the `Publishable` key, not `Secret`. `NEXT_PUBLIC_` vars ship to the browser.

   Re-print the output any time with `pnpm supabase status`.

4. Start the dev server:

   ```bash
   pnpm dev
   ```

   App runs on [localhost:3000](http://localhost:3000/).

---

## Bruno OpenAPI Documentation

We maintain a [bruno/](bruno/) collection. It is compatible with Bruno v4.1.0.

1. Ensure your Supabase stack is running locally.
2. Ensure you have created your first authenticated user in Supabase Studio.
3. Open `bruno/` as a collection in Bruno.
4. Select the `local` environment and fill its secret variables. These remain uncommitted by default.
    - `supabaseAnonKey`
    - `userEmail`
    - `userPassword`
5. Run the `POST /token` to sign in. It stores `accessToken` for the other authenticated requests.
6. For example, you can run `GET /user` to fetch the current user.

---

## Local Supabase services

Configured in [supabase/config.toml](supabase/config.toml) under project id `smackosoft-prototype`.

| Service | URL |
|---------|-----|
| API / Project URL | http://127.0.0.1:54321 |
| REST | http://127.0.0.1:54321/rest/v1 |
| GraphQL | http://127.0.0.1:54321/graphql/v1 |
| Edge Functions | http://127.0.0.1:54321/functions/v1 |
| Storage (S3) | http://127.0.0.1:54321/storage/v1/s3 |
| MCP | http://127.0.0.1:54321/mcp |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Mailpit (email testing) | http://127.0.0.1:54324 |

Confirmation emails go to Mailpit, not to real inboxes. Open it to click the link.

The local stack is deliberately insecure: shared default keys, services bound to `0.0.0.0`, no auth on Studio. Never reuse these keys anywhere deployed.

On Windows, `supabase start` warns that analytics needs Docker exposed on `tcp://localhost:2375`. Ignore it unless you need the analytics container.

```bash
pnpm supabase stop                 # stop containers, keep data
pnpm supabase stop --no-backup     # stop and wipe local data
pnpm supabase db reset             # re-apply migrations and seeds, then run pnpm db:types
pnpm supabase migration new <name> # create a migration file
```

---

## Project structure

All application code lives under `src/`. The `@/*` alias maps to the repo root, so imports read `@/src/components/...`.

```
src/
  app/                  Next.js App Router routes
    (app)/              signed-in screens
    auth/               login, sign-up, password reset, confirm and callback route handlers
    onboarding/         first-sign-in profile step
  contract/             the Backend interface, input schemas, read types
  server/               the real backend (Kysely over pg)
  features/<name>/      components, hooks and server actions per feature
  components/           shared components. ui/ holds shadcn primitives
  hooks/                shared client hooks, including useAppForm
  lib/                  pure helpers
    supabase/           server client and session refresh helper
  proxy.ts              Next.js proxy (middleware) entry point

tests/                  backend and unit tests (pnpm test)
e2e/                    Playwright browser tests (pnpm test:e2e)
supabase/               local stack config, migrations, seed data
bruno/                  Bruno OpenAPI documentation
docs/                   architecture, use cases, runbook, UAT, schema gaps
```

`src/proxy.ts` runs on every request to refresh the session cookie. Server code must build a fresh client per request via `src/lib/supabase/server.ts`. Never share one across requests.

Layers and folder rules are in [docs/architecture.md](docs/architecture.md).

---

## Why pnpm

`pnpm-lock.yaml` is the committed lockfile, and `pnpm-workspace.yaml` allowlists which dependency build scripts may run (the Supabase CLI needs this). npm or yarn would produce a second lockfile and skip that allowlist. Use `pnpm <script>` for everything.
