# Admin Config Console SRD

Status: Draft — technical plan for the approved `spec.md`

> This file owns technical implementation constraints. `spec.md` owns product
> intent and is authoritative; nothing here reopens a decision it records.

## Technical purpose

Give three already-migrated configuration tables a write path that is not
`psql`, without adding a migration, a permission key, or a navigation
destination.

- `knight_hacks_discord_config` (14 rows) — label, description, and the two
  environment snowflakes become editable.
- `knight_hacks_club_team_role` (18 rows) — a Blade role's roster
  classification becomes editable, including first-time classification.
- `knight_hacks_club_team` (8 rows) — read-only context.
- `auth_roles.event_feedback_excluded` — a switch in the existing role detail
  dialog on `/admin/roles`.

Everything the console reads already has a read path. The data model landed in
`packages/db/drizzle/0025_broad_amazoness.sql` and
`packages/db/drizzle/0026_cute_sersi.sql`; the resolvers landed in
`packages/utils/src/discord-config.ts` and
`packages/api/src/utils/guild/club-team-config.ts`. This feature adds the write
half and the officer surface, nothing else.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md#configurability-principles`
  (line 189) — "would this require a developer change next year?". These rows
  already answered yes, which is why they became tables; this feature closes
  the loop by giving the tables an admin UI rather than leaving officers in a
  SQL client.
- `.../#trpc-and-api-principles` (line 118) — routers organised by product
  intent, business workflow allowed directly in the procedure, transactions
  owned by the API layer. Two namespaces, not one grab-bag.
- `.../#validation-principles` (line 215) — procedure inputs come from
  `@forge/validators`; local one-off schemas are rare and justified.
- `.../#database-principles` (line 149) and `docs/DATABASE-USAGE.md` — column
  semantics for `rosterLabel`/`calloutLabel` NULL are load-bearing and are
  documented on the schema at `packages/db/src/schemas/club-team.ts:106-119`.
- `docs/REPO-CONVENTIONS.md` — Blade pages stay thin, `@forge/consts` owns code
  contracts, `@forge/db` owns schemas only.
- `apps/blade/DESIGN_SYSTEM.md:37`, `:112`, `:168` — 14px minimum body text and
  44px hit targets. The `@forge/ui` defaults are 36px
  (`packages/ui/src/input.tsx:13`, `packages/ui/src/select.tsx:27`,
  `packages/ui/src/button.tsx:26` all specify `h-9`), so every input, select,
  switch row and button on these surfaces carries an explicit `h-11` or
  `min-h-11`.

## Access policy

Officer-only, everywhere, with no new permission key. Permissions are
positional bits on `auth_roles.permissions` encoded from
`packages/consts/src/permissions.ts:7`; adding one is migration-shaped and is
out of scope by `spec.md`.

| Surface                                                          | Gate                                                            | Failure                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------- |
| `/admin/roles/config` (server page)                              | `if (permissions.IS_OFFICER !== true) redirect("/admin/roles")` | redirect, before any render |
| `discordConfig.list` / `discordConfig.update`                    | `assertCanManagePlatformConfig(ctx.session.permissions)`        | `FORBIDDEN`                 |
| `clubTeams.listConfiguration` / `clubTeams.updateClassification` | same                                                            | `FORBIDDEN`                 |
| `roles.updateEventFeedbackExclusion`                             | `requireConfigure(ctx)`                                         | `FORBIDDEN`                 |
| unauthenticated                                                  | `permProcedure` inherits `protectedProcedure`                   | `UNAUTHORIZED`              |

Details:

- The page gate is written inline in the server component, copying
  `apps/blade/src/app/admin/forms/sections/page.tsx:17` exactly. It does **not**
  add a `canAccess*` predicate to `apps/blade/src/lib/admin-access.ts`, because
  those predicates exist to drive `getAdminNavigationAccess`
  (`apps/blade/src/lib/admin-access.ts:76-88`) and this route has no navigation
  destination.
- The redirect target is `/admin/roles`, not `MEMBER_DASHBOARD_PATH`. A
  non-officer reaching this URL has almost certainly followed the link from the
  roles dashboard, which `canAccessRoleAdmin`
  (`apps/blade/src/lib/admin-access.ts:21-27`) already lets `CONFIGURE_ROLES`
  and `ASSIGN_ROLES` holders see. Sending them to the member dashboard would
  bounce them out of a section they legitimately hold.
- New guard helper: `assertCanManagePlatformConfig(permissions: PermissionMap)`
  in `packages/api/src/utils/platform-config/access.ts`, modelled line-for-line
  on `assertCanReadAdminAudit` at `packages/api/src/utils/audit/access.ts:5-12`.
  Do **not** use `permissions.controlPerms.or([], ctx)`: it happens to throw
  `FORBIDDEN` for a non-officer (`packages/utils/src/permissions.ts:13-22`) but
  only as a side effect of an empty loop, which reads like a bug.
- `roles.updateEventFeedbackExclusion` reuses `requireConfigure`
  (`packages/api/src/utils/roles/access.ts:11-13`) rather than the officer
  guard, because it sits beside `roles.updateEmailAudience`
  (`packages/api/src/routers/roles.ts:435-492`) in the same dialog and a
  `CONFIGURE_ROLES` holder who can already rewrite a role's permissions is not
  meaningfully restrained by being denied one boolean.
- Client-side gating is UX only. Every procedure enforces its own gate.

## Architecture / data flow

```txt
apps/blade/src/app/admin/roles/config/page.tsx        server: auth → gate → 2 awaited reads
  └─ AdminConfigConsole (client)                      owns <main>, header, refresh
       ├─ DiscordConfigSection  → DiscordConfigDialog
       └─ ClubClassificationSection → ClubClassificationDialog

apps/blade/src/app/admin/roles/page.tsx               unchanged
  └─ RoleManagementDashboard (client)                 + one <Link> to the console
       └─ RoleDetailDialog                            + feedback-exclusion section
```

- `@forge/api` owns both new routers, the transactions, the audit writes, and
  the `invalidateDiscordConfigCache()` call. Blade is a thin client.
- `@forge/validators` owns every input schema. `@forge/consts` owns the
  live/inert key classification (see "Identifying the ten inert keys").
- `@forge/db` gains nothing. No schema file changes.
- No Discord REST call is made by any procedure in this feature. That is a
  deliberate departure from `buildLinkedRoleViews`
  (`packages/api/src/utils/roles/service.ts:365-419`), which calls the guild
  gateway and can return `syncState: "unavailable"`. The console's job is to
  repair configuration, including configuration that is wrong _because_ Discord
  calls are failing, so it must not itself depend on Discord being reachable.
  It renders `Roles.name` (the stored copy) rather than a live Discord name.

## tRPC/API behavior

Two namespaces, registered in `packages/api/src/root.ts` alongside the existing
eighteen. Both use `permProcedure` (`packages/api/src/trpc.ts:50-62`), which is
what supplies `ctx.session.permissions`.

### `discordConfig` — `packages/api/src/routers/discord-config.ts`

**`discordConfig.list`** — query, no input.

```ts
{
  /** Which column this process resolves. From process.env.NODE_ENV, server-side. */
  environment: "development" | "production";
  rows: {
    key: DISCORD.ConfigKey;
    kind: DISCORD.ConfigKind;
    label: string;
    description: string;
    productionId: string;
    developmentId: string | null;
    /** resolveDiscordConfigId(row, isProduction) — what this process actually uses. */
    resolvedId: string;
    /** Officer-facing consumer labels. Empty array means nothing reads this key. */
    readBy: readonly string[];
    updatedAt: Date;
  }[];
}
```

- `resolvedId` reuses `resolveDiscordConfigId`
  (`packages/db/src/schemas/discord-config.ts:80-87`) rather than re-deriving
  the `developmentId ?? productionId` fallback. That fallback is the reason the
  `developmentId` column is nullable and it must not get a second
  implementation.
- Ordering is server-side and fixed: `guild`, then `channel` rows, then `role`
  rows; within a kind, declaration order from `DISCORD.CONFIG_KEYS`
  (`packages/consts/src/discord.ts:34-49`). This is the grouping `spec.md`
  asks for and it is not alphabetical, so the client must not re-sort.
- `id` is deliberately absent from the payload. `key` is unique
  (`packages/db/src/schemas/discord-config.ts:32-36`) and is the identifier
  code already uses; exposing a second one invites a second way to address a
  row.

**`discordConfig.update`** — mutation, input `discordConfigUpdateSchema`.

Returns the updated row in the same shape as one `list` element. Errors:

| Condition                                                                  | Code                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| no row for `key`                                                           | `NOT_FOUND` — "This setting has no row yet. It is created by a migration, not here." |
| `key === "guild"`, a snowflake changed, `acknowledgeGuildRepoint !== true` | `PRECONDITION_FAILED`                                                                |
| snowflake fails the check constraint                                       | should be unreachable; Zod rejects first                                             |

There is no `create` and no `delete` procedure. `knight_hacks_discord_config`
keys are read from code by name, so the key set is a code contract and stays a
migration concern (`status.md`, 2026-07-28).

### `clubTeams` — `packages/api/src/routers/club-teams.ts`

**`clubTeams.listConfiguration`** — query, no input.

```ts
{
  teams: {
    id: string;
    slug: string;
    label: string;
    heading: string;
    kind: TEAM.ClubTeamKind;
    displayOrder: number;
    /** Classifications pointing at this team. Read-only context. */
    classifiedRoleCount: number;
  }[];
  roles: {
    roleId: string;
    /** Roles.name, the stored copy. No Discord call. */
    roleName: string;
    teamHexcodeColor: string | null;
    /** null = unclassified; the console offers a first classification. */
    classification: {
      kind: TEAM.ClubTeamKind;
      rank: number;
      teamId: string | null;
      rosterLabel: string | null;
      calloutLabel: string | null;
      updatedAt: Date;
    } | null;
    /** Resolved values a NULL override produces today. Null when unclassified. */
    resolvedRosterLabel: string | null;
    resolvedCalloutLabel: string | null;
  }[];
}
```

- `roles` contains **every** linked Blade role, not only classified ones. That
  is what makes first-time classification possible and what makes
  `pnpm db:club-roles` unnecessary on a fresh environment (`spec.md`
  acceptance criterion 6).
- `resolvedRosterLabel` / `resolvedCalloutLabel` come from `getClubRosterLabel`
  (`packages/api/src/utils/guild/club-team-config.ts:117-125`) and
  `getClubCalloutLabel` (`:128-138`), fed by `loadClubTeamConfig` (`:63-93`).
  They are computed, never stored. They exist because a NULL override does not
  mean the same thing for every `kind` — for a plain team member NULL means
  "use the team's label", for everyone else it means "use the role name" — and
  an officer editing a blank field with no idea what blank produces will fill
  it in defensively and create an override the roster did not need.
- `teams` is ordered by `displayOrder` ascending, matching `loadClubTeamConfig`.
  `roles` is ordered classified-first by `(kind, rank, roleName)`, then
  unclassified by `roleName`, so the unclassified rows the officer is meant to
  act on cluster together.

**`clubTeams.updateClassification`** — mutation, input
`clubClassificationUpdateSchema`.

Upsert on `roleId`, which is unique
(`packages/db/src/schemas/club-team.ts:91-95`). Inserting when no row exists is
in scope — `spec.md` names "giving an unclassified role its first
classification" explicitly. What is out of scope is _removal_: there is no
procedure that deletes a `knight_hacks_club_team_role` row, and there is no
affordance for one.

Returns the updated `roles` element (same shape as in `listConfiguration`,
including the recomputed resolved labels, so the table can render the effect
immediately after `router.refresh()`). Errors:

| Condition                                          | Code                                                            |
| -------------------------------------------------- | --------------------------------------------------------------- |
| no `auth_roles` row for `roleId`                   | `NOT_FOUND`                                                     |
| `teamId` given but no `knight_hacks_club_team` row | `NOT_FOUND`                                                     |
| `kind === "team"` and `teamId === null`            | `BAD_REQUEST` (Zod rejects first; the DB check is the backstop) |

There is no team create, update, delete, or reorder. `displayOrder` carries a
non-deferrable unique index
(`packages/db/src/schemas/club-team.ts:51-53`), so two rows cannot swap in one
statement — recorded in `spec.md` out-of-scope and not attempted here.

### `roles.updateEventFeedbackExclusion`

Added to the existing `rolesRouter` in `packages/api/src/routers/roles.ts`,
immediately after `updateEmailAudience` (`:435-492`), whose body it mirrors.

- Input: `roleEventFeedbackExclusionSchema` = `roleIdSchema.extend({ excluded: z.boolean() })`, `.strict()`.
- Output: `{ id, name, eventFeedbackExcluded }`.
- `NOT_FOUND` when the locked select returns nothing.

It lives in `roles`, not in a config namespace, because `spec.md` settled that
`/admin/roles` owns role attributes and this console owns the three config
tables. Two write paths to one column is how a flag drifts (`status.md`,
2026-07-28).

### Procedure metadata

Each of the five procedures carries a one-line JSDoc above it in the style of
`packages/api/src/routers/discord-archive.ts:8`, and every field of the new
Zod object schemas carries `.describe()`. This is what
`forge-engineering-principles.md:130-148` asks new routers to leave behind for
generated API/LLM context.

## Validation

### New module: `packages/validators/src/platform-config.ts`

Registered with one line in `packages/validators/src/index.ts`
(`export * from "./platform-config";`, appended after `./discord-archive`).

Exports:

| Export                           | Shape                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `configSnowflakeSchema`          | `z.string().trim().pipe(discordSnowflakeSchema)`                                                        |
| `optionalConfigSnowflakeSchema`  | above, `.nullable()`, empty string → `null`                                                             |
| `discordConfigUpdateSchema`      | `{ key, label, description, productionId, developmentId, acknowledgeGuildRepoint }`, `.strict()`        |
| `clubClassificationUpdateSchema` | `{ roleId, kind, rank, teamId, rosterLabel, calloutLabel }`, `.strict()`, with the team-kind refinement |
| `clubClassificationLabelSchema`  | `z.string().trim().max(64).nullable()`, empty string → `null`                                           |

Rules:

- **Reuse the snowflake regex, do not copy it.** `discordSnowflakeSchema` at
  `packages/validators/src/discord-archive.ts:18-20` already owns
  `/^\d{17,20}$/`. There are five copies of that literal in the package today
  (`discord-archive.ts:20`, `role-management.ts:16`, `role-management.ts:48`,
  `event-management.ts:158`, `event-management.ts:417`); this feature adds a
  sixth copy of neither the regex nor the message. `configSnowflakeSchema`
  pipes a `.trim()` in front of it because the officer path is _paste from
  Discord_, and a trailing space is the realistic failure the check constraint
  at `packages/db/src/schemas/discord-config.ts:62-69` was written to catch —
  better to normalise it than to surface a Postgres constraint name.
  Importing `discordSnowflakeSchema` from `./discord-archive` is admittedly an
  odd home for a general schema; promoting it to a neutral module is a separate
  cleanup and is **not** bundled here.
- **Empty string must become `null`, not `""`.** `developmentId`,
  `rosterLabel`, and `calloutLabel` are all nullable columns where `NULL` has a
  specific documented meaning — "reuse `productionId`"
  (`packages/db/src/schemas/discord-config.ts:45-46`), "use the role name" /
  "use the team's label"
  (`packages/db/src/schemas/club-team.ts:106-119`). A cleared `<Input>` yields
  `""`, and `""` stored in `rosterLabel` is a real bug: `getClubRosterLabel`
  tests truthiness (`club-team-config.ts:121`), so `""` would fall through to
  the fallback anyway while the console kept showing an override that is not
  there. Normalising in the schema means the client can bind
  `value={draft.rosterLabel ?? ""}` and send it raw.
- `kind === "team" → teamId !== null` is a `superRefine` on
  `clubClassificationUpdateSchema` with the issue attached to the `teamId`
  path. It mirrors the check constraint
  `knight_hacks_club_team_role_team_check`
  (`packages/db/src/schemas/club-team.ts:133-136`) so the officer gets a field
  message instead of a raw constraint violation.
- `label` is `z.string().trim().min(1).max(128)` (column is `varchar(128)`).
  `description` is `z.string().trim().min(1).max(1000)`; the column is `text`,
  so 1000 is an abuse bound rather than a schema mirror, and is documented as
  such in the file.
- `rank` is `z.number().int().min(0).max(1000)`. The column is a plain
  `integer` with no constraint; the bound exists so a typo cannot produce a
  sort key nobody will find.
- `key` is `z.enum(DISCORD.CONFIG_KEYS)`. `@forge/validators` already depends
  on `@forge/consts` (`packages/validators/package.json`), and
  `packages/validators/src/permissions.ts:3` sets the precedent for deriving a
  Zod enum from a consts tuple.
- `acknowledgeGuildRepoint` is `z.boolean().default(false)`. It is only
  _consulted_ for `key === "guild"`, and only when a snowflake actually
  changes, which the schema cannot know — see "Transaction and locking".

### Existing module: `packages/validators/src/role-management.ts`

Add `roleEventFeedbackExclusionSchema`, beside
`roleIssueReminderUpdateSchema` (`:43-51`):

```ts
export const roleEventFeedbackExclusionSchema = roleIdSchema
  .extend({ excluded: z.boolean() })
  .strict();
```

No acknowledgement field. The confirmation for this toggle is a client dialog
(see "Asymmetric confirmation enforcement" below).

## Audit

Every mutation writes `createAdminAuditEvent(..., tx)` inside its transaction,
following `roles.updateEmailAudience`
(`packages/api/src/routers/roles.ts:468-489`). Actor capture uses
`captureAdminAuditActor(ctx.session.user)` **before** opening the transaction,
as at `:439`.

### `packages/validators/src/audit.ts`

Three catalog entries, one new domain, one new target type. Keys must match
`/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/`, asserted at
`packages/validators/src/tests/audit.test.ts:16`; all three below comply.

```ts
"discord_config.updated": policy(
  "platform",
  "Updated Discord configuration",
  ["configKey", "configKind", "isInert", "guildRepointAcknowledged"],
  ["label", "description", "productionId", "developmentId"],
),
"role.club_classification.updated": policy(
  "roles",
  "Updated club roster classification",
  ["created"],
  ["kind", "rank", "teamSlug", "rosterLabel", "calloutLabel"],
),
"role.event_feedback_exclusion.updated": policy(
  "events",
  "Updated role event feedback exclusion",
  [],
  ["excluded"],
),
```

Placement and rationale:

- **New domain `"platform"`** in `AUDIT_DOMAINS`
  (`packages/validators/src/audit.ts:13-24`). None of the existing ten fits a
  Discord guild repoint. The precedent for choosing a domain by _effect_ rather
  than by table is `role.email_audience.updated`, which is filed under
  `"email"` (`:236-241`) even though it writes `auth_roles`. By that rule,
  "changed the recruiting notification channel" is neither `roles` nor
  `events`. Adding a domain is one string: `domain` is
  `varchar(32)` with **no** check constraint
  (`packages/db/src/schemas/audit.ts:26` — compare `outcome` at `:81-84`,
  which does have one), and the logs UI renders it as a raw badge
  (`apps/blade/src/app/_components/admin/logs/admin-logs-dashboard.tsx:164`)
  with no label map to update.
- `role.club_classification.updated` stays in `"roles"` — it changes what a
  role means.
- `role.event_feedback_exclusion.updated` goes to `"events"`, not `"roles"`,
  by the same effect rule: the visible consequence is event feedback analytics
  and export, which is where `event.feedback.exported`
  (`packages/validators/src/audit.ts:43-46`) already lives.
- **New target type `discord_config`** in `AUDIT_TARGET_TYPES`
  (`:553-583`), inserted alphabetically between `"company"` (`:561`) and
  `"discord_role"` (`:562`). `targetType` is `varchar(64)` with no check
  constraint (`packages/db/src/schemas/audit.ts:97`), so this too is code-only.
  `role` is reused for both role-shaped actions; no `club_team` target type is
  added, because the team change is captured as a change field.

Subjects and payloads:

| Action                                  | primary subject                                                               | notes                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `discord_config.updated`                | `{ targetType: "discord_config", targetId: row.key, targetLabel: row.label }` | `targetId` is the key, not the UUID — the key is what a reader can act on |
| `role.club_classification.updated`      | `{ targetType: "role", targetId: role.id, targetLabel: role.name }`           |                                                                           |
| `role.event_feedback_exclusion.updated` | `{ targetType: "role", targetId: role.id, targetLabel: role.name }`           |                                                                           |

- Snowflakes go into `changes` in the clear. They are public Discord IDs, not
  secrets, and "what was it before" is the entire point of the log.
- `teamSlug`, not `teamId`, is the change field. A UUID in an audit row is
  unreadable; the slug is stable and human-legible. The procedure resolves it
  from the locked team row.
- On a **first** classification there is no prior row, so each change is emitted
  with `after` only and `before` omitted. `AuditChangeInput.before` is optional
  (`packages/api/src/utils/audit/service.ts:34-46`) and
  `metadata.created = true` distinguishes the case.
- `metadata.isInert` on `discord_config.updated` records whether the edited key
  was in `INERT_CONFIG_KEYS` at write time, so a future reader can tell an
  inert-row cleanup from a live-wiring change without re-deriving the
  classification from a code version they no longer have.
- `role.event_feedback_exclusion.updated` carries **no** metadata. An earlier
  draft declared `impactedPastEventCount` — the number the officer was shown —
  but `roleEventFeedbackExclusionSchema` is `.strict()` and has no such field,
  so the key could never have been populated. The fix is to drop the key, not
  to add the field: a count supplied by the client is a number the log cannot
  vouch for, and adding one to the input is exactly the acknowledgement field
  that "Asymmetric confirmation enforcement" below rules out for this toggle.
  The empty metadata array matches `role.email_audience.updated`
  (`packages/validators/src/audit.ts:236-241`), the sibling this procedure
  mirrors. The blast radius stays where an officer can act on it — in the
  confirmation, recomputed at read time — rather than being frozen into an
  audit row.

### `packages/api/src/utils/audit/coverage.ts`

This file keys on **router file names** (`member-admin.*`,
`event-feedback.*`), while the api-surface snapshot keys on **client
namespaces** (`memberAdmin.*`). Both lists are alphabetically sorted.

Add to `AUDITED_ADMIN_PROCEDURES` (`:1-77`):

- `"club-teams.updateClassification"` (after `"career.uploadCompanyImage"`)
- `"discord-config.update"` (after `"club-teams.updateClassification"`)
- `"roles.updateEventFeedbackExclusion"` (between `"roles.updateEmailAudience"`
  and `"roles.updateIssueReminders"`)

Add to `EXCLUDED_ADMIN_PROCEDURES` (`:86-140`):

- `"club-teams.listConfiguration"`
- `"discord-config.list"`

`packages/api/src/tests/audit/coverage.test.ts` discovers router files from
disk (`:29-37`), so both new router files are picked up automatically and the
test fails until these five entries exist.

## Data / migration / compatibility

**There is no migration. Not one line of DDL, and no change to any file under
`packages/db/`.**

Verified reasons, each individually sufficient to have forced a migration if it
were false:

1. Every column the console writes already exists. `label`, `description`,
   `productionId`, `developmentId` are on `DiscordConfig`
   (`packages/db/src/schemas/discord-config.ts:40-46`); `kind`, `rank`,
   `teamId`, `rosterLabel`, `calloutLabel` are on `ClubTeamRole`
   (`packages/db/src/schemas/club-team.ts:96-119`);
   `eventFeedbackExcluded` is on `Roles`
   (`packages/db/src/schemas/auth.ts:42`) and was backfilled by migration 0013.
2. No new permission key, so the bitstring width in
   `packages/consts/src/permissions.ts:7` is unchanged and every stored
   `auth_roles.permissions` value stays valid.
3. Concurrency uses `SELECT ... FOR UPDATE`, not `expectedRevision`. Neither
   `knight_hacks_discord_config` nor `knight_hacks_club_team_role` has a
   revision column, and adding one is exactly the migration this avoids.
4. The audit additions are values, not types. `audit_event.domain` is
   `varchar(32)` and `audit_subject.target_type` is `varchar(64)`, both with no
   check constraint (`packages/db/src/schemas/audit.ts:26`, `:97`). The
   enumeration is enforced in Zod only. Contrast `outcome` (`:81-84`) and
   `relation` (`:127-130`), which _do_ carry check constraints — adding a value
   to either of those would have required DDL.
5. No table gains a row through this feature. The only insert is a
   `knight_hacks_club_team_role` row for an already-linked role, which the
   existing constraints and cascade rules already cover.

Compatibility with current `main`:

- `main` does not have these tables at all; they arrived on
  `reforge/refactor` in 0025/0026. Nothing in this feature widens or narrows
  that gap.
- Rollback is code-only. Reverting the feature leaves whatever values an
  officer saved, which is the same state a `psql` session would have produced.
- `packages/db/scripts/classify-club-roles.ts` (`pnpm db:club-roles`) still
  parses the seed literal out of `0026_cute_sersi.sql`. The console supersedes
  its purpose but the script is untouched — recorded as a known gap in
  `spec.md`, not closed here.

## Transaction and locking

### `discordConfig.update`

```txt
captureAdminAuditActor(...)                       ← outside the transaction
db.transaction(async (tx) => {
  SELECT * FROM knight_hacks_discord_config
    WHERE key = $key LIMIT 1 FOR UPDATE           ← the serialization point
  if (!row) NOT_FOUND
  if (key === "guild"
      && (productionId or developmentId differs)
      && !acknowledgeGuildRepoint) PRECONDITION_FAILED
  UPDATE ... RETURNING
  createAdminAuditEvent({...}, tx)
})
invalidateDiscordConfigCache()                    ← AFTER commit, see below
```

- `.for("update")` follows `roles.updateEmailAudience`
  (`packages/api/src/routers/roles.ts:441-446`). Two officers saving the same
  key serialise; the second reads the first's committed values, so its audit
  `before` is honest rather than a stale snapshot from before its own read.
- The guild acknowledgement is checked **inside** the transaction, after the
  locked read, because "did a snowflake actually change" needs the current row
  and cannot be a Zod refinement. Editing only the guild row's `label` or
  `description` does not require the acknowledgement — it changes nothing any
  consumer resolves.
- `updatedAt` refreshes itself via `$onUpdate`
  (`packages/db/src/schemas/discord-config.ts:47-51`); the procedure does not
  set it.

### `clubTeams.updateClassification`

```txt
db.transaction(async (tx) => {
  SELECT id, name FROM auth_roles WHERE id = $roleId FOR UPDATE
  if (!role) NOT_FOUND
  SELECT * FROM knight_hacks_club_team_role WHERE role_id = $roleId FOR UPDATE
  if (teamId) SELECT id, slug FROM knight_hacks_club_team WHERE id = $teamId
  INSERT ... ON CONFLICT (role_id) DO UPDATE ... RETURNING
  createAdminAuditEvent({...}, tx)
})
```

- **The `auth_roles` row is locked first, and that is the important lock.**
  `ClubTeamRole.roleId` is `ON DELETE cascade`
  (`packages/db/src/schemas/club-team.ts:91-95`), and `roles.unlinkRole` takes
  `FOR UPDATE` on the same `auth_roles` row before deleting it
  (`packages/api/src/routers/roles.ts:740-744`). Locking `auth_roles` here is
  therefore what makes the two mutations serialise: either the classification
  commits and the unlink proceeds afterwards, or the unlink commits first and
  this transaction's locked select returns nothing and raises `NOT_FOUND`.
  Locking only `knight_hacks_club_team_role` would leave a window where a
  classification is written for a role that is being deleted, and the cascade
  would silently swallow it.
- Locking the existing classification row `FOR UPDATE` (when present) serialises
  two officers editing the same role, for the same `before`-honesty reason as
  above. `FOR UPDATE` on a select that returns no rows is a no-op, which is
  correct: the `ON CONFLICT (role_id)` clause is what makes the insert race
  safe, since `roleId` is unique.
- The team row is read but **not** explicitly locked. `ClubTeamRole.teamId` is
  `ON DELETE restrict` (`packages/db/src/schemas/club-team.ts:105`), so the FK
  check on insert already takes a row-share lock and Postgres already refuses
  to delete a referenced team. An explicit lock would add nothing.
- `getDependencyCounts` (`packages/api/src/utils/roles/service.ts:64-110`) still
  does not count `ClubTeamRole`, so an unlink of a classified role still
  succeeds and still silently empties a team. That is `spec.md`'s first known
  gap and is not closed here.

### `roles.updateEventFeedbackExclusion`

Byte-for-byte the shape of `updateEmailAudience`
(`packages/api/src/routers/roles.ts:440-491`): lock the `Roles` row
`FOR UPDATE`, `NOT_FOUND` if absent, update, audit inside `tx`, return.

## `invalidateDiscordConfigCache()`

**Exactly one production call site**, in
`packages/api/src/routers/discord-config.ts`, in the `update` mutation body,
**after** `await db.transaction(...)` resolves and before the procedure
returns. Imported from `@forge/utils/discord-config`.

```ts
const updated = await db.transaction(async (tx) => {
  /* ... */
});
invalidateDiscordConfigCache();
return updated;
```

- It has **zero** production call sites today; the module's own doc comment
  (`packages/utils/src/discord-config.ts:26-30`) records that this feature is
  the thing that has to add one.
- It must not be called inside the transaction. `invalidateDiscordConfigCache`
  clears the module-level `snapshot` and `inFlight`
  (`packages/utils/src/discord-config.ts:88-91`); a concurrent read in the same
  process would then repopulate the cache from the pre-commit snapshot and the
  writing process would serve its own stale value for the next sixty seconds —
  the precise failure the call exists to prevent.
- It clears **only the process that served the request** — one Blade instance.
  This is not a bug to route around, it is the documented cost of a per-process
  TTL cache (`packages/utils/src/discord-config.ts:18-31`, `CACHE_TTL_MS` at
  `:32`). Other Blade instances and `apps/cron` converge within ~60s.
  `apps/tk` resolves the guild id once at module scope
  (`apps/tk/src/index.ts:65`) and does not converge at all until it restarts.
- Success copy must state that mechanism. `spec.md` acceptance criterion 5
  forbids "changes are live". The approved wording is: _"Saved. Other Blade
  instances and the cron worker pick this up within about a minute. The T.K.
  bot reads the server ID once at startup and needs a restart."_
- No invalidation call is needed for `clubTeams.updateClassification`.
  `loadClubTeamConfig` (`packages/api/src/utils/guild/club-team-config.ts:63-93`)
  queries on every call and holds no cache.

## Identifying the ten inert keys

This is the one place where the distinction lives in code rather than data, and
where a decision was required.

### What the current shape supports

`DISCORD.CONFIG_KEYS` (`packages/consts/src/discord.ts:34-49`) is a flat
`as const` tuple of fourteen strings. `ConfigKey` is
`(typeof CONFIG_KEYS)[number]` (`:51`), the `key` column is typed with it
(`packages/db/src/schemas/discord-config.ts:32-36`), and a migration test
compares `[...DISCORD.CONFIG_KEYS].sort()`
(`packages/db/src/tests/discord-config-migration.test.ts:170`). The file's own
comment states the invariant that makes an inert key possible at all: _"adding
a key means adding code that reads it"_ (`:27-28`). Ten keys were added without
that ever happening.

`kind` deliberately does **not** live in the constant — it is a column, seeded
per row (`packages/db/drizzle/0025_broad_amazoness.sql:29-42`). So the catalog
must not acquire a `kind` field; that would duplicate data the table owns.

The four live keys, each verified by a call site:

| Key                  | Read at                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guild`              | `packages/utils/src/discord-config.ts:116` via `getKnightHacksGuildId()`, called from `packages/utils/src/discord.ts:24,37,50,107`, `packages/api/src/routers/roles.ts:102,122,186,302`, `packages/api/src/routers/event.ts:563`, `packages/api/src/utils/roles/discord-gateway.ts:36,54,63,76,116`, `packages/api/src/utils/roles/service.ts:191`, `packages/api/src/utils/events/provider-gateways.ts:96-181`, `packages/api/src/utils/discord-archive/health.ts:31`, `packages/api/src/utils/analytics/discord-report.ts:67`, `apps/cron/src/crons/role-sync.ts:26`, `apps/tk/src/index.ts:65` |
| `log_channel`        | `packages/utils/src/discord.ts:126` (`discord.log`), called from `packages/api/src/routers/member-admin.ts:149`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `recruiting_channel` | `packages/api/src/utils/forms/database-callbacks.ts:225`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `alumni_role`        | `apps/cron/src/crons/alumni-assign.ts:18`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The other ten (`officer_role`, `admin_role`, `volunteer_role`, `vip_role`, and
the six `*_director_role` keys) have no call site anywhere outside
`packages/consts/src/discord.ts` itself.

### Decision

**Add a hand-declared, type-forced catalog to `packages/consts/src/discord.ts`,
next to `CONFIG_KEYS`, and back it with a source-scanning drift test in
`@forge/utils`.**

```ts
/**
 * What reads each setting, in officer-facing terms. An empty array means the
 * platform reads this key nowhere: the row exists because the constant it
 * replaced existed, not because anything resolves it.
 *
 * `satisfies Record<ConfigKey, ...>` is the point. Adding a key to
 * CONFIG_KEYS without answering "what reads it?" is a type error, which is the
 * only moment anyone is in a position to answer honestly.
 */
export const CONFIG_KEY_CONSUMERS = {
  guild: [
    "Discord message archive",
    "Role sync and role linking",
    "Discord event projection",
    "T.K. Discord bot",
    "Role-sync and alumni cron jobs",
  ],
  log_channel: ["Blade admin action log embeds"],
  recruiting_channel: ["Recruiting notifications posted by form callbacks"],
  alumni_role: ["Nightly alumni grant/revoke cron"],
  officer_role: [],
  admin_role: [],
  volunteer_role: [],
  vip_role: [],
  outreach_director_role: [],
  design_director_role: [],
  development_director_role: [],
  sponsorship_director_role: [],
  workshops_director_role: [],
  projects_mentorship_director_role: [],
} as const satisfies Record<ConfigKey, readonly string[]>;

export const LIVE_CONFIG_KEYS = CONFIG_KEYS.filter(
  (key) => CONFIG_KEY_CONSUMERS[key].length > 0,
);

export const INERT_CONFIG_KEYS = CONFIG_KEYS.filter(
  (key) => CONFIG_KEY_CONSUMERS[key].length === 0,
);
```

`CONFIG_KEYS` and `ConfigKey` are unchanged, so
`packages/db/src/schemas/discord-config.ts:34` and
`packages/db/src/tests/discord-config-migration.test.ts:170` keep working with
no edit.

### Why a consumer list rather than a boolean

The badge is not the officer's real question. "Inert" tells them not to bother;
_"Discord message archive, role sync, event projection, T.K. bot, crons"_ tells
them what they are about to break. And it removes a duplication that would
otherwise be forced on us: `spec.md` acceptance criterion 4 requires the guild
confirmation to name those five consumers, so the alternative is a second
hard-coded list inside a Blade dialog that can drift from the first. The dialog
renders `row.readBy` and there is one list.

### Why not the alternatives

- **A column on `knight_hacks_discord_config`.** It is a fact about code, so it
  would go stale the instant someone adds or deletes a read, with no signal.
  It also needs a migration, which `spec.md` rules out.
- **A second flat tuple, `INERT_CONFIG_KEYS`, hand-maintained.** No type link
  to `CONFIG_KEYS`. Add a fifteenth key and forget to touch it and the key
  silently defaults to "live" — the failure is invisible in exactly the
  direction that matters.
- **Derive at runtime by instrumenting `getDiscordConfigId`.** Cannot work: an
  inert key is inert precisely because it is never called, so runtime
  observation cannot distinguish "inert" from "not called yet in this process".
- **Put it in `@forge/api` or `@forge/validators`.** `@forge/consts` already
  owns the sibling contract (`CONFIG_KEYS`, `CONFIG_KINDS`), the file's comment
  already draws the code-contract/organisational-state line, and both
  `@forge/utils` (the reader) and `@forge/api` (the console's API) can import
  from it without inverting a dependency.

### The drift guard

New test: `packages/utils/src/tests/discord-config-consumers.test.ts`, beside
the existing `packages/utils/src/tests/discord-config.test.ts`.

It resolves the workspace root from `import.meta.url`, walks `apps/*/src` and
`packages/*/src` (excluding `legacy/`, `node_modules`, `dist`, any `tests/`
directory, and `packages/utils/src/discord-config.ts` itself), and asserts two
things:

The last exclusion is not tidiness. The declaration reads
`export async function getDiscordConfigId(\n  key: DISCORD.ConfigKey,\n)`
(`packages/utils/src/discord-config.ts:101-103`), so the defining module is the
one place in the repo where `getDiscordConfigId(` is followed by a parameter
rather than a string literal — assertion 2 would fail on the module it exists to
protect. Excluding the file costs assertion 1 nothing: the `getDiscordConfigId("guild")`
call inside `getKnightHacksGuildId` (`:116`) is the function's own body, and
`guild` still enters the live set from the twelve modules that call
`getKnightHacksGuildId(`.

1. The set of keys appearing as `getDiscordConfigId("<key>")` — plus `guild`,
   whenever `getKnightHacksGuildId(` appears — equals `LIVE_CONFIG_KEYS`.
2. Every `getDiscordConfigId(` occurrence is immediately followed by a string
   literal. A computed key would make the scan silently under-report; today
   there are none.

Precedent and placement:

- The pattern — a declared list plus a test that reads source from disk to
  prove it — is `packages/api/src/tests/audit/coverage.test.ts:29-37`, whose
  own comment records why: _"A hand-maintained list only covered 10 of 18
  routers, so `discordArchive.getHealth` shipped as a permProcedure with no
  declared audit policy and nothing noticed."_ Same failure mode, same remedy.
- It lives in `@forge/utils` because that package owns the two functions being
  scanned for (`getDiscordConfigId` at `packages/utils/src/discord-config.ts:101`,
  `getKnightHacksGuildId` at `:115`), and because `@forge/consts` has neither a
  `test` script nor a vitest dependency (`packages/consts/package.json`), so
  the guard cannot sit beside the constant.
- **Only the live/inert classification is machine-checked.** The prose labels
  are officer-facing copy and are not verified against anything. That is a
  deliberate limit: a test that tried to match "Discord message archive" to a
  file path would be a test of the copy, and it would break every rename.

### How the console uses it

`discordConfig.list` joins `CONFIG_KEY_CONSUMERS[row.key]` onto each row as
`readBy`. Blade renders from that prop; it does not import `@forge/consts` to
re-derive the classification. Keeping the derivation server-side means there is
one place the fact is stated and the console component stays dumb.

## React / frontend constraints

### Route

`/admin/roles/config`. Sub-route of `/admin/roles`, matching
`/admin/forms/sections` and `/admin/events/feedback-template`.

**No error boundary is added.** `apps/blade/src/app/admin/roles/error.tsx`
already covers the sub-route through Next.js boundary cascade, exactly as
`/admin/forms/sections` inherits `apps/blade/src/app/admin/forms/error.tsx`.
Its copy ("Your tab and filters are still in the URL") is mildly wrong for a
page with no query state; that is an accepted cosmetic mismatch, not a licence
to edit shared copy for one consumer.

### Server page — `apps/blade/src/app/admin/roles/config/page.tsx` (new)

```tsx
export const metadata: Metadata = { title: "Blade | Platform Configuration" };

export default async function AdminRolesConfigPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) redirect("/admin/roles");

  const [discord, clubTeams] = await Promise.all([
    api.discordConfig.list(),
    api.clubTeams.listConfiguration(),
  ]);

  return <AdminConfigConsole clubTeams={clubTeams} discord={discord} />;
}
```

- Async server component. **No** `"use client"` at page level.
- Returns exactly one client component with resolved data as props. No
  `initialData` seeding, matching every other admin page.
- The page does **not** render `<main>`; `AdminConfigConsole` does.

### Loading — `apps/blade/src/app/admin/roles/config/loading.tsx` (new)

Effectively mandatory: 23 of the 25 admin routes have one. It mirrors the real
markup structurally — back-link button, header with no actions, two panels —
and is built from `AdminPageHeaderSkeleton` and `adminPageLayoutClassName`
(`apps/blade/src/app/_components/shared/admin-page.tsx:64-92`, `:12`), copying
the shape of `apps/blade/src/app/admin/forms/sections/loading.tsx:8-19`.
`Skeleton className="h-11 w-28"` stands in for the back link, as there.

### Client components (new, flat in `apps/blade/src/app/_components/admin/roles/`)

The directory is flat today (five files); no `config/` subdirectory is
introduced, and no `_components/admin/*` directory in Blade nests.

| File                              | Owns                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `admin-config-console.tsx`        | `<main className={adminPageLayoutClassName}>`, back link, `AdminPageHeader`, `refresh`, renders both sections |
| `discord-config-section.tsx`      | grouped table + card list, live/inert badges, opens the dialog                                                |
| `discord-config-dialog.tsx`       | `draft` state, four fields, guild confirmation step, save mutation                                            |
| `club-classification-section.tsx` | teams context panel, roles table + card list, opens the dialog                                                |
| `club-classification-dialog.tsx`  | `draft` state, kind/rank/team/labels, save mutation                                                           |

- Separate dialog files match `role-detail-dialog.tsx` and
  `create-role-dialog.tsx`, which are already split out of
  `role-management-dashboard.tsx`.
- `AdminPageHeader` requires all four of `description`, `eyebrow`, `icon`
  (a `LucideIcon`), `title`
  (`apps/blade/src/app/_components/shared/admin-page.tsx:14-30`). There is no
  `AdminPage` wrapper component; the three layout primitives are exported
  strings (`:7-12`).
- Back link copies `apps/blade/src/app/_components/admin/forms/form-sections-manager.tsx:129-133`:
  `<Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">` wrapping
  `<Link href="/admin/roles"><ArrowLeft className="h-4 w-4" /> Roles</Link>`.

### Eyebrow

New key in `apps/blade/src/consts/admin-page-eyebrows.ts`:

```ts
rolesConfig: "Platform wiring",
```

`apps/blade/src/tests/admin/admin-page.test.tsx:9-13` asserts every value is
unique. "Platform wiring" avoids the near-misses "Access control" (`:35`),
"Discord operations" (`:19`), "Feedback configuration" (`:21`), "Form
configuration" (`:24`), and "Club Operations" (`:29`). Title is "Platform
configuration"; icon is `SlidersHorizontal` from `lucide-react`. It is already
used in Blade admin, on the members filter trigger
(`apps/blade/src/app/_components/admin/members/member-filters.tsx:175`) and on
the member Guild preferences dialog (`.../member/guild-preferences-dialog.tsx:73`).
That is not a conflict — the uniqueness assertion at
`apps/blade/src/tests/admin/admin-page.test.tsx:9-13` covers eyebrow strings,
not icons, and icons are already shared across surfaces: `MessageSquareText`
heads `/admin/events/feedback-template` and also appears in the archive health
panel and the member detail dialog.

### Tables

Each section renders its rows twice: a `hidden overflow-x-auto md:block`
`<Table>` and a `grid min-w-0 gap-2 p-2 sm:p-3 md:hidden` card list. Both are
required. Copy the structure at
`apps/blade/src/app/_components/admin/roles/role-management-dashboard.tsx:555-660`.

### Editing

Always a Dialog seeded from a `draft` object in `useState`. There is no
inline-editable table row anywhere in Blade and this feature does not introduce
the first. Both dialogs seed `draft` on open from the row prop and reset on
close.

### Mutations

- `api.discordConfig.update.useMutation({ onSuccess, onError })` and
  `api.clubTeams.updateClassification.useMutation({ ... })`, with a toast from
  `@forge/ui/toast`. **`useFeatureMutation` does not exist** — do not reference
  it.
- The data arrives as RSC props, so invalidation is
  `startTransition(() => router.refresh())`, not `utils.x.invalidate()`. Copy
  `apps/blade/src/app/_components/admin/forms/form-sections-manager.tsx:91-93`.
- **No optimistic updates.** There are zero in `apps/blade` today.
- Each section keeps a per-row `useState<string | null>` pending id
  (`savingKey`, `savingRoleId`) because one mutation object is shared across
  rows and `mutation.isPending` would spin every row's control. Precedent:
  `syncingRoleId` in `role-management-dashboard.tsx:604`.
- Save buttons are disabled until the draft differs from the row, and render
  `<Loader2 className="h-4 w-4 animate-spin" />` while pending.

### Sibling-scoped Tailwind

`adminPageStackClassName` is `min-w-0 space-y-4 sm:space-y-6`
(`apps/blade/src/app/_components/shared/admin-page.tsx:10`), which compiles to
`> * + *` and applies to **direct children only**. `AdminConfigConsole` must
render the back link, the header, and the two sections as four direct children
of `<main>`. Wrapping the two sections in a `<div>` deletes a gap with no type
error, no lint error, and no failing unit test. The same applies to `gap-*`,
`divide-*`, and `first:`/`last:` variants inside each section. This is a new
route, so there is no baseline to protect — but it is why the roles-screen
changes below need one.

### `/admin/roles` changes

**Console link.** One `<Button asChild variant="outline" className="min-h-11 gap-2">`
wrapping `<Link href="/admin/roles/config">` added to the `actions` prop of
`AdminPageHeader` at
`apps/blade/src/app/_components/admin/roles/role-management-dashboard.tsx:1176-1183`,
beside the existing linked-role count. It copies
`apps/blade/src/app/_components/admin/forms/admin-forms-dashboard.tsx:125-128`
("Manage sections" → `/admin/forms/sections`). It is rendered only when
`access.isOfficer` is true, so a `CONFIGURE_ROLES`-only holder is not shown a
link that redirects them straight back.

**Feedback exclusion toggle.** Added inline to
`apps/blade/src/app/_components/admin/roles/role-detail-dialog.tsx` as a new
`<section>` immediately after the Team email audience section (`:340-383`).
**No new file.** The email-audience section is inline, and the unlink
confirmation is already an inline nested `<Dialog>` driven by `unlinkOpen`
state in the same file (`:57`); extracting one of three sibling sections would
be inconsistent and would risk the wrapper-`<div>` gap failure above for no
gain.

It copies the email-audience precedent exactly:

- `const [feedbackExcluded, setFeedbackExcluded] = useState(detail.eventFeedbackExcluded);`
- `<Switch aria-label="Exclude this role's events from feedback" checked={...} onCheckedChange={...} />`
- an explicit Save button disabled until
  `feedbackExcluded !== detail.eventFeedbackExcluded` or the mutation is
  pending, with `<Loader2 className="h-4 w-4 animate-spin" />` while pending
- toast on success, then the parent-supplied `onChanged()`

The one addition: pressing Save while turning the flag **on** opens a nested
confirmation `<Dialog>` (same pattern as the unlink dialog) stating the count
from `detail.feedbackExclusionImpact.pastEventCount`. Turning it **off** saves
directly — restoring readability needs no warning.

### Impact count

`buildLinkedRoleViews` (`packages/api/src/utils/roles/service.ts:365-419`) gains
exactly one field, `eventFeedbackExcluded: role.eventFeedbackExcluded`. That one
is free — the function already does `db.select().from(Roles)` (`:371`), so the
column is in hand.

The count is **not** computed there. `buildLinkedRoleViews` runs a per-role
`await` inside `roleRows.map` (`:384-389`), so a query added to it is a query
per linked role on every call — and its first caller is `roles.listLinks`
(`packages/api/src/routers/roles.ts:81-85`), which backs the roles **list**
page. `getDependencyCounts` already pays that cost there; a second N-query fan-out
for a number only one dialog reads is not worth repeating.

Instead, `roles.getRole` (`:137-151`) computes it once, for the one role it
resolves, after the `.find()` and beside the existing `canRemoveAdmin` lookup —
which is the same shape: one extra query for one role, on the procedure the
detail dialog actually reads (`RoleDetail = RouterOutputs["roles"]["getRole"]`,
`role-detail-dialog.tsx:39`). `getRole` returns
`feedbackExclusionImpact: { pastEventCount: number }`; `listLinks` does not
carry the field at all.

`pastEventCount` counts `Event` rows where `hackathonId IS NULL` **and**
`roleId = ANY(Event.roles)` **and** `end_datetime <= now()` **and** an
`EventFeedbackConfig` row exists for the event **and** no _other_ role on that
event is already `eventFeedbackExcluded`. Every clause is load bearing:

- `hackathonId IS NULL` and the role membership are what `isQualifyingEvent`
  tests (`packages/api/src/utils/events/feedback.ts:231-239`).
- `end_datetime <= now()` because `spec.md` promises a count of _past_ events.
- the no-other-excluded-role clause because `isQualifyingEvent` fails on _any_
  protected role (`:236-237`), so an event already carrying a flagged role is
  already unreadable. Counting it would attribute to this toggle a loss that has
  already happened. The number the officer is agreeing to is "events that
  qualify today and stop qualifying because of this", not "events touching this
  role".
- the `EventFeedbackConfig` join because that row is what collection hangs off:
  no config, no feedback form, no responses. Such an event has nothing to lose,
  so naming it inflates the number and makes the warning easier to dismiss.
  (Note that `requireQualifyingEvent` —
  `packages/api/src/utils/events/feedback.ts:385-391`, reached from `getAnalytics`
  at `:461` and `exportCsv` at `:546` — does _not_ check for a config; it checks
  the hackathon and role rules only. The join is justified by what is lost, not
  by what those two functions refuse.)

The `Event.roles` containment predicate is the same raw `= ANY(...)` form
already used at `packages/api/src/utils/roles/service.ts:73`, written through
Drizzle's `sql` tag rather than as a second helper.

The confirmation copy also states, without a count, that future events attached
to the role stop provisioning feedback (`provisionForEvent` returns
`not_applicable`, `packages/api/src/utils/events/feedback.ts:616-620`).

## Asymmetric confirmation enforcement

Two confirmations in this feature, enforced at different layers. This is
deliberate.

- **Guild repoint: server-enforced.** `discordConfig.update` returns
  `PRECONDITION_FAILED` without `acknowledgeGuildRepoint`. Repointing the guild
  silently redirects every Discord read and write in the platform to a
  different server, cannot be detected by looking at Blade, and does not fully
  take effect until `apps/tk` restarts. `spec.md` acceptance criterion 4 says
  the change _requires_ a confirmation; enforcing it at the API boundary is
  what makes that testable without a component test. Precedent for a
  server-side confirmation gate:
  `roleUnlinkSchema` (`packages/validators/src/role-management.ts:53-55`).
- **Feedback exclusion: client-only.** No acknowledgement field on the input.
  The blast radius is one boolean on one row, the same dialog shows its current
  value, and it can be flipped back in one click. `emailRoleAudienceSchema`,
  the toggle this one is a sibling of, has no acknowledgement either, and
  adding one here would make two adjacent switches behave differently for no
  reason an officer could infer.

## Discord integration

No Discord API call is added, and no Discord credential is touched.

The feature changes which snowflakes the platform resolves, and therefore
changes the behaviour of every existing Discord integration. Consumers of a
`guild` change: the Discord message archive
(`packages/api/src/utils/discord-archive/health.ts:31`), role sync and role
linking (`packages/api/src/utils/roles/discord-gateway.ts`,
`packages/api/src/utils/roles/service.ts:191`), Discord event projection
(`packages/api/src/utils/events/provider-gateways.ts`), the T.K. bot
(`apps/tk/src/index.ts:65`), and the role-sync and alumni crons
(`apps/cron/src/crons/role-sync.ts:26`,
`apps/cron/src/crons/alumni-assign.ts:18`). These are named in the confirmation
dialog, sourced from `CONFIG_KEY_CONSUMERS.guild`.

Propagation is the TTL described under `invalidateDiscordConfigCache()`. There
is no push invalidation and none is added; introducing one would mean a
cross-process channel for a value that changes once a year.

## Configurability review

Would this require a developer change next year?

- **No** for the things this feature exists for: changing a Discord snowflake
  after a server reorganisation, relabelling a config row, classifying a newly
  linked staff role, moving a role between teams, adjusting rank, overriding a
  roster or callout label, and excluding a role from event feedback. All of
  those become officer actions.
- **Yes, deliberately**, for four things:
  - Adding or removing a `knight_hacks_discord_config` key. The keys are read
    from code by name, so adding one means adding the code that reads it. Kept
    a migration on purpose (`status.md`, 2026-07-28).
  - Adding, renaming, reordering, or deleting a club team. `displayOrder` has a
    non-deferrable unique index, and deleting the executive or director row
    succeeds at the database level while silently emptying those buckets on the
    public site.
  - Adding a permission key. Positional bits on `auth_roles`.
  - Adding a fourth `CLUB_TEAM_KINDS` value. The bucketing rules in
    `club-team-config.ts` are written against the three
    (`packages/consts/src/team.ts:17-28`).
- One new hard-coded thing is introduced: `CONFIG_KEY_CONSUMERS`. It is
  acceptable because it describes code, not organisational state — the thing it
  records is _which modules call which function_, which cannot change without a
  developer by definition — and because the drift test fails if it stops being
  true.

## Testing / verification strategy

### `@forge/consts` / `@forge/utils`

- `packages/utils/src/tests/discord-config-consumers.test.ts` (new): the drift
  guard described above. Must fail if a key is added to `CONFIG_KEYS` without a
  `CONFIG_KEY_CONSUMERS` entry (type error, caught by `pnpm typecheck`), if a
  key declared inert acquires a call site, or if a key declared live loses its
  last one.
- `packages/utils/src/tests/discord-config.test.ts` (existing): unchanged.
  Confirm it still passes — the module is not edited.

### `@forge/validators`

New cases in `packages/validators/src/tests/` (a `platform-config.test.ts`,
plus additions to `role-management.test.ts` and `audit.test.ts`):

- snowflake accept/reject including the whitespace-trim path and a role-mention
  paste (`<@&123…>`);
- empty string → `null` for `developmentId`, `rosterLabel`, `calloutLabel`;
- `kind === "team"` with `teamId: null` rejected, with the issue on `teamId`;
- unknown `key` rejected; unknown extra properties rejected (`.strict()`);
- `rank` bounds and non-integer rejection;
- the three new action keys satisfy the key-format and uniqueness invariants at
  `packages/validators/src/tests/audit.test.ts:11-24`;
- `AUDIT_TARGET_TYPES` still unique after `discord_config`.

### `@forge/api`

- Access: non-officer gets `FORBIDDEN` from all four new config procedures;
  `IS_OFFICER` and `CONFIGURE_ROLES` behaviour on
  `roles.updateEventFeedbackExclusion`.
- `discordConfig.list`: ordering (guild → channel → role, declaration order
  within kind), `resolvedId` under both `NODE_ENV` values including the
  `developmentId IS NULL` fallback, `readBy` empty for exactly ten keys.
- `discordConfig.update`: `NOT_FOUND` for an unseeded key; guild snowflake
  change without acknowledgement is `PRECONDITION_FAILED`; guild label-only
  change succeeds without acknowledgement; audit event has the right action
  key, target type, target id and change fields; `invalidateDiscordConfigCache`
  is called once, after commit, and **not** called when the transaction throws.
- `clubTeams.listConfiguration`: unclassified roles present with
  `classification: null`; resolved labels for each of the three kinds and for
  the NULL-override fallbacks.
- `clubTeams.updateClassification`: first classification inserts and audits with
  `metadata.created = true` and `before`-less changes; subsequent update writes
  both sides; `teamSlug` (not `teamId`) appears in changes; `NOT_FOUND` for an
  unknown role and an unknown team.
- `roles.updateEventFeedbackExclusion`: writes the column, audits, and
  `createDbEventFeedbackService`
  (`packages/api/src/utils/events/database-feedback.ts:479-490`) picks the role
  up in `protectedRoleIds` on the next call.
- `feedbackExclusionImpact.pastEventCount`: excludes hackathon events, future
  events, events with no `EventFeedbackConfig`, and events already carrying a
  different `eventFeedbackExcluded` role. Present on `roles.getRole` and absent
  from `roles.listLinks`, asserted both ways — the list page is where the
  per-role query would have been expensive.
- `packages/api/src/tests/root/api-surface.test.ts` — snapshot goes from **179**
  to **184** paths (`+2 clubTeams`, `+2 discordConfig`, `+1 roles`), updated in
  the same commit. The namespace list at `:72-91` gains `"clubTeams"` and
  `"discordConfig"`.
- `packages/api/src/tests/audit/coverage.test.ts` passes only once the five
  coverage entries exist.

### `apps/blade`

- `apps/blade/src/tests/admin/admin-page.test.tsx` — the uniqueness assertion
  covers the new eyebrow automatically.
- New component tests under `apps/blade/src/tests/admin/`: inert badge rendered
  for exactly the inert rows and not derived from description text; guild
  confirmation names the five consumers; success copy contains the ~60s and
  bot-restart wording and does **not** contain "live"; unclassified role offers
  a first classification; no create or delete affordance is rendered in any of
  the three tables; save disabled until dirty; per-row pending state does not
  spin sibling rows.
- `apps/blade/src/tests/admin/role-detail-dialog.test.tsx` extended: the switch
  renders with its `aria-label`, Save is disabled until the value differs,
  turning on opens a confirmation naming the count, turning off saves directly.

### Visual baseline

`spec.md` acceptance criterion 11 requires an **element-scoped** baseline of the
role detail dialog, recorded before the feedback toggle is added to it. Not a
full-page `/admin/roles` capture: `roles.listLinks`
(`packages/api/src/routers/roles.ts:81-85`) takes no input and returns every row
in `Roles`, so no query parameter can scope the page and the capture would be a
function of the developer's database. The dialog is different — it is
server-rendered from `?role=<uuid>` through `api.roles.getRole`
(`apps/blade/src/app/admin/roles/page.tsx:54-56`), so it renders exactly one
fixture role.

`apps/blade/src/tests/e2e/visual/__screenshots__/darwin/` holds nine PNGs today
and none is a roles screen.

**Harness addition.** `expectVisualBaseline`
(`apps/blade/src/tests/e2e/visual/visual-harness.ts:141-154`) takes a `Page` and
always shoots the page. It gains a sibling rather than a flag, because the two
have different option sets — `fullPage` is meaningless for an element:

```ts
export async function expectElementVisualBaseline(
  locator: Locator,
  name: string,
) {
  await expect(locator).toHaveScreenshot(name, {
    maxDiffPixels: 120,
    timeout: 30_000,
  });
}
```

The 120-pixel budget and the 30s timeout are copied deliberately, not tuned: the
regression this suite hunts shifts everything below a wrapper by a full gap, and
that diffs in the thousands of pixels even inside one dialog. `preparePage`,
`signInAs` and `settle` are used unchanged.

Sequencing, as three commits:

1. **The console link, alone.** `spec.md` acceptance criterion 11 puts it
   _before_ the baseline so it is inside the reference rather than invalidating
   it. It lands in the roles dashboard header, which is outside the captured
   element, so this ordering costs nothing and removes the argument.
2. **The baseline.** The harness addition above, a roles fixture in
   `apps/blade/src/tests/e2e/visual/visual-fixtures.ts`, and desktop (1440x1000)
   and mobile (390x844) dialog cases in
   `apps/blade/src/tests/e2e/visual/visual-baselines.spec.ts` on a fully pinned
   URL — the spec file's own comment (`:32-38`) explains that a baseline reading
   ambient rows from the developer's Postgres is a baseline that fails for
   unrelated reasons. Generate the PNGs. **No product code in this commit.**
   `test-cases.md` owns the fixture details, including why the fixture role must
   not reuse one of the seven snowflakes the e2e Discord override hard-codes.
3. **The feedback toggle.** The baselines from commit 2 must pass unchanged
   (`spec.md` acceptance criterion 11). Nothing is re-recorded.

What commit 2 captures is therefore _not_ the whole dialog. The new section is a
sibling inside `<div className="space-y-5 px-4 py-4 sm:px-6">`
(`role-detail-dialog.tsx:157`), so a capture of that container grows by
construction and could never "still pass". The baselines are the two regions the
new section sits below and must not disturb:

- the `DialogHeader` identity block (`:134-155`) — colour swatch, name, snowflake,
  Access/Cosmetic badge;
- the `Team email audience` section (`:340-383`), the sibling the new one is
  inserted immediately after.

A `toHaveScreenshot` on a locator is relative to that element's own box, so these
prove the regions' _internal_ layout is unchanged — a deleted `gap-3`, a reflowed
badge — and not their absolute position. Position is the wrong thing to assert
here anyway: the new section legitimately moves everything below it. The one gap
that leaves — a section inserted in the wrong place translating a region
downward without changing it — is closed by asserting the accessible names of
the dialog's sections in document order in the same test, before the captures.
`test-cases.md` owns those assertions.

### E2E

Extend `apps/blade/src/tests/e2e/role-management.spec.ts` rather than adding a
spec: non-officer redirect from `/admin/roles/config` to `/admin/roles`;
officer edits a snowflake and sees it after reload (acceptance criterion 2);
officer classifies a previously unclassified role and the public roster query
reflects it without a script run (criterion 6).

The snowflake case edits a row nothing seeds. `knight_hacks_discord_config` is
populated by migration 0025 and no e2e fixture touches it, so an unrestored edit
is permanent for every later run on that database. The spec reads the row first,
restores it in a `finally`, and picks an inert key — never `guild`, and not
`alumni_role`, which the nightly cron resolves. `test-cases.md` (TC-003) owns the
detail.

### Commands

```txt
pnpm --filter=@forge/utils test
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm analyze:react:changed
pnpm --filter=@forge/blade e2e visual-baselines
pnpm format && pnpm lint && pnpm typecheck
pnpm build
```

`pnpm db:generate` is expected to produce **no** migration. If it produces one,
something in this plan was violated — stop rather than committing it.

## File change inventory

The "no sidebar entry, no permission key, no `canAccess*` predicate" decision
in `spec.md` is what keeps this short, so it is spelled out.

### New files — 17

| #   | Path                                                                         |
| --- | ---------------------------------------------------------------------------- |
| 1   | `packages/validators/src/platform-config.ts`                                 |
| 2   | `packages/validators/src/tests/platform-config.test.ts`                      |
| 3   | `packages/api/src/routers/discord-config.ts`                                 |
| 4   | `packages/api/src/routers/club-teams.ts`                                     |
| 5   | `packages/api/src/utils/platform-config/access.ts`                           |
| 6   | `packages/api/src/tests/config/discord-config.test.ts`                       |
| 7   | `packages/api/src/tests/config/club-teams.test.ts`                           |
| 8   | `packages/api/src/tests/integration/platform-config.test.ts`                 |
| 9   | `packages/utils/src/tests/discord-config-consumers.test.ts`                  |
| 10  | `apps/blade/src/app/admin/roles/config/page.tsx`                             |
| 11  | `apps/blade/src/app/admin/roles/config/loading.tsx`                          |
| 12  | `apps/blade/src/app/_components/admin/roles/admin-config-console.tsx`        |
| 13  | `apps/blade/src/app/_components/admin/roles/discord-config-section.tsx`      |
| 14  | `apps/blade/src/app/_components/admin/roles/discord-config-dialog.tsx`       |
| 15  | `apps/blade/src/app/_components/admin/roles/club-classification-section.tsx` |
| 16  | `apps/blade/src/app/_components/admin/roles/club-classification-dialog.tsx`  |
| 17  | `apps/blade/src/tests/admin/admin-config-console.test.tsx`                   |

6 and 7 are the procedure-surface and gate cases the testing plan above calls
for; `packages/api/src/tests/config/` is a new directory, matching the
one-directory-per-domain layout the package already uses. 8 is every case that
needs real SQL — locking, cascade, check constraints, the impact count — and
sits beside `database-harness.test.ts`, which established the disposable-database
seam.

Plus the visual-baseline PNGs generated in the baseline commit, under
`apps/blade/src/tests/e2e/visual/__screenshots__/darwin/`:
`role-detail-identity-desktop.png`, `role-detail-identity-mobile.png`,
`role-detail-email-audience-desktop.png`, `role-detail-email-audience-mobile.png`.

### Changed files — 20

| #   | Path                                                                       | Change                                                                                                    |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `packages/consts/src/discord.ts`                                           | `CONFIG_KEY_CONSUMERS`, `LIVE_CONFIG_KEYS`, `INERT_CONFIG_KEYS`. `CONFIG_KEYS` and `ConfigKey` untouched. |
| 2   | `packages/validators/src/index.ts`                                         | one `export * from "./platform-config";`                                                                  |
| 3   | `packages/validators/src/role-management.ts`                               | `roleEventFeedbackExclusionSchema`                                                                        |
| 4   | `packages/validators/src/audit.ts`                                         | domain `platform`, target type `discord_config`, three catalog entries                                    |
| 5   | `packages/validators/src/tests/audit.test.ts`                              | assertions for the three new keys                                                                         |
| 6   | `packages/validators/src/tests/role-management.test.ts`                    | exclusion schema cases                                                                                    |
| 7   | `packages/api/src/root.ts`                                                 | two imports, two `AppRouterShape` members, two `appRouterRecord` entries                                  |
| 8   | `packages/api/src/routers/roles.ts`                                        | `updateEventFeedbackExclusion`                                                                            |
| 9   | `packages/api/src/utils/roles/service.ts`                                  | `eventFeedbackExcluded` on the role view                                                                  |
| 10  | `packages/api/src/utils/audit/coverage.ts`                                 | three audited + two excluded entries                                                                      |
| 11  | `packages/api/src/tests/root/api-surface.test.ts`                          | namespace list at `:72-91`                                                                                |
| 12  | `packages/api/src/tests/root/__snapshots__/api-surface.test.ts.snap`       | 179 → 184 paths                                                                                           |
| 13  | `packages/api/src/tests/roles/management.test.ts`                          | `updateEventFeedbackExclusion` and the impact count on `getRole`                                          |
| 14  | `packages/api/src/tests/guild/club-roster.test.ts`                         | classification-change matrix                                                                              |
| 15  | `packages/api/src/tests/guild/role-callout.test.ts`                        | label-fallback and callout-priority matrix                                                                |
| 16  | `apps/blade/src/consts/admin-page-eyebrows.ts`                             | `rolesConfig: "Platform wiring"`                                                                          |
| 17  | `apps/blade/src/app/_components/admin/roles/role-management-dashboard.tsx` | one `<Link>` in the header `actions`                                                                      |
| 18  | `apps/blade/src/app/_components/admin/roles/role-detail-dialog.tsx`        | exclusion section + confirmation dialog                                                                   |
| 19  | `apps/blade/src/tests/admin/role-detail-dialog.test.tsx`                   | toggle cases                                                                                              |
| 20  | `apps/blade/src/tests/e2e/role-management.spec.ts`                         | console redirect, snowflake round trip, first classification                                              |

`feedbackExclusionImpact` is not in row 9: it is computed in
`packages/api/src/routers/roles.ts` (row 8), on `getRole` only — see "Impact
count".

Plus `visual-harness.ts`, `visual-fixtures.ts` and `visual-baselines.spec.ts`,
changed in the **baseline** commit, not in the feature commit.

### Files that must NOT change

These are the six the "no nav entry" decision protects. A diff touching any of
them means the plan drifted:

1. `apps/blade/src/app/_components/shared/admin-navigation.ts` — no
   `adminNavigationItems` entry, no `AdminNavigationAccess` field.
2. `apps/blade/src/app/_components/shared/desktop-admin-navigation.tsx`
3. `apps/blade/src/app/_components/shared/mobile-admin-navigation.tsx`
4. `apps/blade/src/lib/admin-access.ts` — no `canAccessRolesConfig`, no new key
   in `getAdminNavigationAccess` (`:76-88`).
5. `apps/blade/src/app/admin/layout.tsx` — the ten-predicate gate at `:32-45`
   stays ten.
6. `apps/blade/src/tests/admin/authenticated-shell.test.tsx` — it asserts the
   exact alphabetical destination list at `:36-63`; a sidebar entry would break
   it, which is the point.

Also unchanged: everything under `packages/db/` (no migration), and
`packages/consts/src/permissions.ts` (no permission key).

## Open questions

- None blocking. Three choices in this document are proposals rather than
  settled facts and are the right things to push back on at review: the new
  `"platform"` audit domain, the server-enforced guild acknowledgement, and the
  `EventFeedbackConfig` join in the impact count.
