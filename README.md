# Smackosoft Prototype

Next.js App Router prototype with Supabase auth, running against a local Supabase stack in Docker.

Tech stack decisions: [docs/architecture.md](docs/architecture.md).

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

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Use the `Publishable` key, not `Secret`. `NEXT_PUBLIC_` vars ship to the browser.

   Re-print the output any time with `pnpm supabase status`.

4. Start the dev server:

   ```bash
   pnpm dev
   ```

   App runs on [localhost:3000](http://localhost:3000/).

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
pnpm supabase db reset             # re-apply migrations and seeds
pnpm supabase migration new <name> # create a migration file
```

---

## Project structure

All application code lives under `src/`. The `@/*` alias maps to the repo root, so imports read `@/src/components/...`.

```
src/
  app/                  Next.js App Router routes
    auth/               login, sign-up, password reset, confirm route handler
    protected/          auth-gated pages
    layout.tsx          root layout
    page.tsx            landing page
  components/
    ui/                 shadcn/ui primitives
    tutorial/           starter-kit onboarding steps
    *.tsx               auth forms, header, theme switcher
  lib/
    supabase/
      client.ts         browser client
      server.ts         server component and route handler client
      proxy.ts          session refresh helper
    utils.ts
  proxy.ts              Next.js proxy (middleware) entry point

supabase/
  config.toml           local stack configuration
docs/
  architecture.md
```

`src/proxy.ts` runs on every request to refresh the session cookie. Server code must build a fresh client per request via `src/lib/supabase/server.ts` — never share one across requests.

---

## Why pnpm

`pnpm-lock.yaml` is the committed lockfile, and `pnpm-workspace.yaml` allowlists which dependency build scripts may run (the Supabase CLI needs this). npm or yarn would produce a second lockfile and skip that allowlist. Use `pnpm <script>` for everything.
