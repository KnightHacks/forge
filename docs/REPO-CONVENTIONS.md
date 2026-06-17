# Forge Repo Conventions

These conventions document the structure agents should preserve when editing Forge. Prefer existing patterns, keep changes scoped, and treat existing boundary violations as debt to avoid copying.

## Blade (`apps/blade`)

- Keep `app/**/page.tsx` thin: auth, permission checks, redirects, initial server tRPC reads, and rendering route components only.
- Put Blade UI in `apps/blade/src/app/_components/**`, grouped by feature. Use `_components/shared` only for Blade-wide reusable pieces.
- Do not put Blade-specific product components in `@forge/ui`; `@forge/ui` is for app-agnostic primitives.
- Server components/pages use `~/trpc/server` (`api`, `HydrateClient`). Client components use `~/trpc/react`.
- Do not add `"use client"` to pages just to use hooks. Keep auth/permissions server-side and move interactivity into a client component.
- Blade-only constants belong in `apps/blade/src/consts`. Constants used across apps/packages belong in `@forge/consts`.
- Blade-only helpers belong near the feature or in `apps/blade/src/lib`. Shared helpers belong in `@forge/utils`.

## Constants

Use this placement hierarchy:

| Scope                  | Location                                    |
| ---------------------- | ------------------------------------------- |
| One component/file     | local `const` near use                      |
| Multiple Blade files   | `apps/blade/src/consts`                     |
| Multiple apps/packages | `packages/consts/src/*` via `@forge/consts` |

`@forge/consts` owns shared literals, option lists, enum sources, Discord IDs, MinIO bucket names, issue statuses, event tags, permission names, and similar metadata. Export new namespaces from `packages/consts/src/index.ts`.

Do not duplicate constants that already exist in `@forge/consts`. Existing cross-package relative imports in const files are debt, not a pattern to copy.

## Utilities

Use this placement hierarchy:

| Scope                   | Location                                                  |
| ----------------------- | --------------------------------------------------------- |
| One feature             | feature-local helper file                                 |
| Multiple Blade features | `apps/blade/src/lib` or feature `_components/**/utils.ts` |
| Multiple apps/packages  | `packages/utils/src/*` via `@forge/utils`                 |

`@forge/utils` owns reusable non-UI behavior: date/time helpers, permission calculations, form transforms, CSV/export logic, recursive tree helpers, status filtering/counting, and integration helpers.

Constants do not belong in utils. Server-only utilities must stay behind explicit server-only files/subpath exports such as `@forge/utils/permissions.server`; do not leak DB, cookie, or service-client code through the root barrel.

## tRPC and API (`packages/api`)

- Routers live in `packages/api/src/routers/*` and are registered in `packages/api/src/root.ts`.
- Child routers should export named router records ending in `Router`, usually with `satisfies TRPCRouterRecord`.
- When adding a router, update `root.ts`: import it, add it to the type map, and add it to the exported router object. The key becomes the client path, e.g. `api.forms.*`.
- Use tRPC for normal app CRUD/workflows. Do not add REST route handlers unless the task specifically needs an external webhook, callback, file endpoint, or protocol boundary.
- Choose procedures intentionally:
  - `publicProcedure`: truly public operations.
  - `protectedProcedure`: logged-in user operations.
  - `permProcedure`: permission-aware admin operations.
  - `judgeProcedure`: only for established judge flows.
- `permProcedure` loads permissions but does not choose the required permission. Call `permissions.controlPerms.or(...)` or `.and(...)` near the top of the resolver.
- Keep API-side business workflows in `@forge/api`; do not move them into `@forge/db` or UI code.

## Database (`packages/db`)

- `@forge/db` owns Drizzle schemas, relations, schema types, the DB client, and Drizzle helper exports.
- Read `docs/DATABASE-USAGE.md` before changing table semantics, adding queries against unfamiliar tables, or deciding between ambiguous columns.
- Import the client from `@forge/db/client`; import schemas from `@forge/db/schemas/*`; import Drizzle helpers from `@forge/db`.
- DB schemas may consume enum/value sources from `@forge/consts`.
- Use `db.transaction(...)` for multi-table state changes.
- Do not put business workflows, auth checks, Discord calls, email sends, uploads, or tRPC procedures in `@forge/db`.

## Package boundaries

| Package             | Owns                                                                   | Must not own                                    |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `@forge/consts`     | Shared constants, option lists, enum sources, IDs, permission metadata | DB/API/auth/UI logic                            |
| `@forge/validators` | Shared Zod schemas and pure validation helpers                         | DB/API/auth/UI logic                            |
| `@forge/db`         | Drizzle schemas, relations, DB client, schema types                    | Business workflows or service integrations      |
| `@forge/auth`       | Better Auth setup, session/token helpers                               | App UI or feature workflows                     |
| `@forge/api`        | tRPC routers, procedures, API-side workflows                           | App components or DB schema ownership           |
| `@forge/utils`      | Reusable non-UI helpers and integrations                               | Shared constants or UI components               |
| `@forge/ui`         | App-agnostic UI primitives                                             | Blade-specific UI, DB/auth/API/server-only deps |
| `@forge/email`      | Email clients, send functions, templates                               | General app workflows                           |

Never import another package through relative internals like `../../utils/src/...` or `../../../db/src/...`. Use package exports or fix the package boundary. Existing internal relative imports are debt, not precedent.

## UI package (`packages/ui`)

- Use `@forge/ui` for reusable primitives only.
- Prefer subpath imports such as `@forge/ui/button`, `@forge/ui/dialog`, plus `cn` from `@forge/ui`.
- Keep composed/domain UI in apps, especially `apps/blade/src/app/_components`.
- Do not add DB, auth, API, email, or server-only utility dependencies to `@forge/ui`.

## Common anti-patterns

Do not:

- add constants inside components when they belong in `~/consts` or `@forge/consts`;
- duplicate constants, status maps, dropdown options, or permission metadata;
- leave reusable logic buried in pages/components;
- add `"use client"` to a page instead of extracting a client component;
- create REST endpoints for ordinary app CRUD instead of tRPC;
- add a tRPC router without registering it in `packages/api/src/root.ts`;
- use `permProcedure` without an explicit permission check;
- put app-specific components in `@forge/ui`;
- import across package internals with relative paths;
- copy existing debt patterns unless the task is explicitly to clean them up.
