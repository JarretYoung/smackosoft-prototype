## Architecture

### Tech stack considerations

| Component | Technology |
|-----------|-----------|
| Authentication | Supabase |
| Video storage | R2 |
| Database language | PostgreSQL |
| Installability | PWA |
| Database access | Kysely over `pg`, as the `smackosoft_service` role |
| Input validation | Zod, shared by the contract and the forms |
| UI | Next.js App Router, shadcn, Tailwind v4 |

### How the frontend and backend meet

The frontend codes against one TypeScript interface, `Backend` in `src/contract`. The real implementation is in `src/server`.

| Folder | Role | Safe in Client Components |
|---|---|---|
| `src/contract/` | The `Backend` interface, input schemas, read types, error model | Yes |
| `src/server/` | The real implementation. Server only. | No |
| `src/app/actions.ts` | Thin server actions. One per write. They call `backend` and refresh the pages. | Called from them |
| `src/app/(app)/` | Signed-in screens. They read through `backend` in Server Components. | Server |
| `src/components/` | Shared UI. `ui/` is shadcn. | Yes |

Rules the frontend follows:

- Read in Server Components with `backend.x.y()` and unwrap with `unwrap` from `src/lib/result.ts`.
- Write from Client Components through `src/app/actions.ts`. Show `errorMessage(error)` in a toast, or `fieldErrors(error)` under a field.
- The client picks the id for anything it creates, so a retried save never duplicates.
- Hide controls by role with `can(role, min)`. The backend still refuses anything not allowed.
- Pages read the session, so the `(app)` layout sets `export const instant = false`.

### Where to read more

- [use-cases.md](use-cases.md): rules, permissions and the use case list
- [runbook.md](runbook.md): running it locally, sample logins, tests
- [uat.md](uat.md): what to try on each screen

