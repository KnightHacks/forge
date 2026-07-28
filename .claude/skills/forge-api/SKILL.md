---
name: forge-api
description: Adding or changing tRPC procedures in packages/api — procedure anatomy, the two access tiers, audit coverage, transactions, and where workflow logic lives. Use before touching any router or utils/<domain> module.
---

# Forge API

`@forge/api` is the platform layer: 18 routers, 178 client-callable procedures.
Apps are clients of it, including the Discord bot and cron.

## Procedure anatomy

Same order every time:

1. Choose the procedure type
2. Call the access guard — before any work
3. Validate input from `@forge/validators`
4. Do the work
5. Write an audit event if it mutates
6. Return a typed shape, not a raw Drizzle row

Procedure types: `publicProcedure` for genuinely public reads,
`protectedProcedure` for logged-in users, `permProcedure` for permission-aware
admin operations. `permProcedure` **loads** permissions; it does not choose them.
Every one must call its domain guard near the top.

## The two access tiers

These both exist in the code and were never named until now. Naming them is the
point — an unnamed distinction is one contributors rediscover by accident.

**Capability** — a union across all of a user's roles. Gates whether a route or
nav destination is reachable at all. This is `permissions.controlPerms.or([...],
ctx)` and it covers 87 procedures. Holding a permission via _any_ role grants it.

**Scope** — an exact match against the _granting_ role. Gates which rows are
readable or editable. Only two domains have one:

- `issues` — `issueAccessForRoles` matches the issue's owning team against the
  role that granted the permission. Holding `EDIT_ISSUES` via Dev Team does not
  let you edit Design Team's issues.
- `forms` — `evaluateFormSectionAccess` intersects your role IDs against a
  section's editor and viewer lists.

Everything else is capability-only because it has nothing to scope.

Put both in `packages/api/src/utils/<domain>/access.ts`. `email/access.ts` is the
model: fifteen lines of named `require*` functions. The access decision gets a
name instead of an inline array of permission keys, every rule for a domain sits
in one place, and it is unit-testable with no database.

**Where capability passes but scope yields nothing, redirect server-side.**
A nav gate using capability while the server scopes per-role produces a page that
loads completely blank — the bug report that looks unfixable.

Client-side hiding is UX only. The server boundary is the boundary.

## Audit

Every `permProcedure` mutation, plus any `protectedProcedure` mutation that
deletes data or moves money, writes an event via `createAdminAuditEvent`. Yes
including self-service deletion — the actor is the member, which is exactly what
forensics needs.

New permission-aware procedures must be declared in
`packages/api/src/utils/audit/coverage.ts`, as audited or excluded. The coverage
test discovers routers from the filesystem and will fail otherwise. It used to
read a hand-maintained list of 10 of 18 routers, which is how a `permProcedure`
shipped with no declared policy and nothing noticed.

## Where workflow logic lives

The rule, and it is checkable:

> Extract to `utils/<domain>/` when the logic can be tested without a tRPC
> context. Keep it in the procedure when it cannot. A `utils/<domain>/` file
> holds one cohesive concern — if you cannot name the file without using "and",
> split it.

Do not extract to make a router look thin, and do not inline a 150-line named
workflow to satisfy a "fat procedures are fine" reading. `updatePlatformForm` is
~170 lines with a real name and a real test; that belongs in `utils/`. A module
holding forms _and_ responses _and_ sections _and_ exports does not.

Extracted code is the well-tested half of this package precisely because it runs
without a database. That is a legitimate reason to extract, and it is why the
rule is phrased around testability rather than router size.

## Transactions and side effects

Use `db.transaction` for multi-table state changes. Never put a Discord call, an
email send, or a storage write inside a transaction — decide explicitly what
happens when the side effect fails after the row is committed, and say so in a
comment.

Queries live here, next to the procedure that needs them. `@forge/db` owns
schemas, the client, and migrations; it must not own product queries.

## Contracts

Adding, removing, or renaming a procedure changes a contract. The API surface
snapshot in `packages/api/src/tests/root/api-surface.test.ts` pins all 178 paths
and will fail — update it in the same commit, so the diff shows what clients
gained or lost.

**Before removing or renaming anything, search every app.** `apps/club` and
`apps/guild` deploy separately and reach Blade over HTTP, so a break there is
invisible to Blade's tests and to typecheck. Guild Collective deferred
`guild.getPublicClubTeamRoster` with a test asserting its absence while
`apps/club` kept calling it; the Club team page rendered empty from that merge
onward and no gate caught it.

## REST

tRPC for all business logic. Route handlers only for protocol-mandated
boundaries: OAuth callbacks, webhooks, file downloads and uploads, and ingesting
external REST. A route handler that wraps a query is a procedure in disguise.

Where a route handler does exist, the platform function it calls must enforce its
own access rather than trusting the caller — a Blade nav helper is not an
authorization boundary.
