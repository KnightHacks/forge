# API and Permissions Guide

How to write tRPC procedures in `@forge/api`, and how access control actually
works. Everything here was checked against the code.

For the working conventions an agent should follow, see
`.claude/skills/forge-api/SKILL.md`. This document is the human-facing
explanation of the same system.

## Procedure types

Four exist in `packages/api/src/trpc.ts`. Three are meaningful:

| Type                 | Use for                                             |
| -------------------- | --------------------------------------------------- |
| `publicProcedure`    | genuinely public reads — Guild directory, club site |
| `protectedProcedure` | any logged-in user acting on their own data         |
| `permProcedure`      | permission-aware admin operations                   |

`permProcedure` **loads** the caller's permissions into context. It does not
decide anything. Every one must call its domain guard near the top, before any
work happens.

`judgeProcedure` is currently `export const judgeProcedure = protectedProcedure`
with zero uses in any router. It is a placeholder left from the judging system,
not a fourth tier. Do not reach for it.

## How permissions are stored

A user holds Roles; each Role carries a permission bitstring.
`loadPermissionsForUser` ORs the bitstrings of every role the user holds into one
flat object, which is what `permProcedure` puts in context.

Permission keys live in `packages/consts/src/permissions.ts` — `IS_OFFICER`,
`READ_MEMBERS`, `EDIT_MEMBERS`, `READ_CLUB_DATA`, `READ_CLUB_EVENT`,
`EDIT_CLUB_EVENT`, `CHECKIN_CLUB_EVENT`, and others. Read that file for the
current list rather than guessing a name.

`IS_OFFICER` short-circuits every `controlPerms` check. An officer passes
regardless of the specific permission asked for.

## The two access tiers

This distinction decides how a permission behaves, and until recently nothing
named it. Both tiers already existed in the code.

### Capability — a union across all your roles

Gates whether a route or nav destination is reachable at all. Hold a permission
through _any_ role and you have it. This is what `controlPerms` does, and it
covers most procedures.

```typescript
listAdminEvents: permProcedure.query(async ({ ctx }) => {
  requireEventRead(ctx); // wraps controlPerms.or([...], ctx)
  // ...
});
```

`controlPerms.or([...])` passes if the caller holds **any** listed permission.
`controlPerms.and([...])` requires **all** of them. Both throw `FORBIDDEN`
otherwise.

### Scope — an exact match against the granting role

Gates _which rows_ you may read or edit, rather than whether the feature is
reachable at all. Only two domains have a scope tier:

- **issues** — `issueAccessForRoles` matches an issue's owning team against the
  role that granted the permission. Holding `EDIT_ISSUES` through Dev Team does
  not let you edit Design Team's issues.
- **forms** — `evaluateFormSectionAccess` intersects your role IDs against a
  section's editor and viewer lists.

Everything else is capability-only, because it has nothing to scope.

**The trap:** if a nav gate uses capability while the server scopes per role, a
user can pass the gate and land on a page whose every query returns nothing. That
is the bug report that reads as unfixable — "it loads but it's blank." Where
capability passes but scope yields nothing, redirect server-side instead.

### Where guards live

One file per domain: `packages/api/src/utils/<domain>/access.ts`, each exporting
named `require*` functions. `email/access.ts` is the model, at fifteen lines.

This gives the access decision a name instead of an inline array of permission
keys, puts every rule for a domain in one place, and makes the guards unit
testable without a database.

## Gating a page

Blade pages gate server-side, in the page itself, using the predicates in
`apps/blade/src/lib/admin-access.ts`:

```typescript
export default async function Page() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessAnalytics(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  // ...
}
```

Client-side hiding is UX only. The server boundary is the boundary, and every
procedure the page calls enforces its own access independently — a page gate is
not a substitute for a procedure guard.

## Audit logging

Every `permProcedure` mutation, plus any `protectedProcedure` mutation that
deletes data or moves money, writes an audit event. Self-service deletion is
included: the actor is the member, which is exactly what forensics needs.

The function is `createAdminAuditEvent` from
`packages/api/src/utils/audit/service.ts`, with roughly 100 call sites. Write the
event inside the same transaction as the change, and before any deletes — the
actor snapshot reads rows a delete is about to remove.

```typescript
await createAdminAuditEvent(
  {
    actionKey: "member.profile.deleted",
    actor: ctx.session.user,
    metadata: { deletedObjectCount },
    operationId,
    subjects: [memberAuditSubject(member)],
  },
  tx,
);
```

Every permission-aware procedure must be declared in
`packages/api/src/utils/audit/coverage.ts` as `audited`, `excluded`, or
`hybrid`. The coverage test discovers routers from the filesystem, so a new
procedure with no declaration fails the suite. That guardrail once read a
hand-maintained list covering 10 of 18 routers, which is how a `permProcedure`
shipped with no declared policy and nobody noticed.

Reads are normally `excluded`. Exporting data is not a read — it is `audited`.

## Discord role syncing

Permissions follow Discord roles.

Assigning through the Blade role page is the preferred path: it updates Discord
immediately. A cron job at `apps/cron/src/crons/role-sync.ts` also runs daily at
08:00 to reconcile users whose roles were changed directly in Discord.

## What this document used to say

Four patterns documented here previously do not exist in the codebase, and
following them produced code that does not compile:

- a `log()` function for mutation logging — no such export; the real mechanism is
  `createAdminAuditEvent`
- `.meta({ id, inputSchema })` on procedures for the form responder — zero uses,
  and it would not typecheck
- the permissions `VIEW_EVENTS` and `MANAGE_EVENTS` — the real keys are
  `READ_CLUB_EVENT` and `EDIT_CLUB_EVENT`
- a `pageRouter` exposing `canAccessEventsPage` procedures — pages gate directly,
  as shown above

They are named here rather than quietly deleted, because anyone who followed them
deserves to know why their code did not work.
