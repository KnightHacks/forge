# Role Management SRD

Status: Approved

## Technical purpose

Extend the read-only Reforge roles foundation into a permission-gated platform
capability for Discord-backed role configuration, membership reconciliation,
and role assignment. Blade remains the interactive client; `@forge/api` owns
authorization, Discord operations, database workflows, and result contracts.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: tRPC ownership,
  explicit access policy, Discord as a first-class integration, server-first
  Next.js, admin configurability, and tests at owning boundaries.
- `docs/REPO-CONVENTIONS.md`: Blade pages stay thin, validators live in
  `@forge/validators`, and product workflows remain in `@forge/api`.
- `apps/blade/DESIGN_SYSTEM.md`: dark-first token colors, border-led raised
  panels, darker inset rows, direct copy, and 44px mobile targets.

## Access policy

- Unauthenticated API calls return `UNAUTHORIZED`; page access redirects to
  `/` through the existing auth flow.
- Signed-in users without `CONFIGURE_ROLES`, `ASSIGN_ROLES`, or `IS_OFFICER`
  receive `FORBIDDEN`; `/admin/roles` redirects to `/member/dashboard`.
- `CONFIGURE_ROLES` or `IS_OFFICER` may discover Discord roles, create links,
  read full role details, update permissions, synchronize, and unlink.
- `ASSIGN_ROLES` or `IS_OFFICER` may list assignment-safe role data and users,
  then grant or revoke roles.
- Users with only one capability do not receive the other tab or its protected
  data. Client hiding is UX; every procedure enforces the matching permission.
- `IS_OFFICER` retains the existing global override.

## Architecture / data flow

- Extend `packages/api/src/routers/roles.ts`; keep Discord and DB workflows in
  `@forge/api`, with small colocated helpers only where multiple procedures or
  tests need the same behavior.
- Add reusable role-management schemas to `@forge/validators`. Clients submit
  typed permission keys, never raw permission bitstrings. The API encodes keys
  using the stable indices in `PERMISSION_DATA`.
- Reuse `Roles`, `Permissions`, `User`, `Member`, and existing downstream role
  references. Add no table, migration, dependency, or environment variable.
- `/admin/roles/page.tsx` stays server-side: authenticate, read effective
  permissions, normalize the requested tab, load stable initial data, and
  render a client dashboard for search, selection, dialogs, and mutations.
- Generalize the Reforge admin shell so navigation destinations are derived
  from effective permissions. The active destination may be resolved from the
  current path inside a focused navigation client component; the shell and
  route skeleton remain server-rendered.
- Use URL parameters for `view`, selected `role`, role search/filters, user
  search/role filters, page, and page size. Selection for a batch is transient
  UI state and is not shareable.

## tRPC/API behavior

### Read procedures

- `roles.listLinks`: requires Configure or Assign access. Returns all linked
  roles with UUID, immutable Discord ID, stored name/color, normalized
  permission keys/count/type, live Discord metadata when available, Discord
  member count when available, missing/managed state, and assignment count.
  Full dependency counts are included only for Configure access.
- `roles.listDiscordOptions`: requires Configure access. Fetches the guild role
  list once with `Routes.guildRoles`, removes `@everyone`, managed roles, and
  already-linked IDs, sorts by Discord position/name, and returns only fields
  required by the picker. Member-count failure yields unavailable counts rather
  than failing discovery.
- `roles.previewDiscordRole`: requires Configure access and accepts a validated
  Discord snowflake. It supports the manual-ID path and rejects missing,
  managed, `@everyone`, or already-linked roles.
- `roles.getRole`: requires Configure access and accepts a Blade role UUID. It
  returns full detail, live Discord metadata, assignment count, downstream
  dependency counts, and whether edit/unlink would violate final-admin safety.
- `roles.listUsers`: requires Assign access. It accepts validated search,
  AND-role filters, page, and exact page sizes `25 | 50 | 100 | 250 | 500`.
  It returns all auth users, optional Member names, current linked roles, total,
  and page count in deterministic Discord-name/User-ID order.

### Mutations

- `roles.createLink`: requires Configure access. Input is Discord role ID plus a
  deduplicated array of permission keys. The server refetches the Discord role,
  enforces eligibility and unique link/name rules, stores the exact Discord
  name/color and server-encoded bitstring, then runs immediate reconciliation.
  It returns the new role and sync summary. Sync failures do not delete the
  successfully created link but are reported explicitly.
- `roles.updatePermissions`: requires Configure access. Input is role UUID and
  permission keys. Discord ID is immutable. The server refetches the linked
  role, refreshes its exact name/color, validates final-admin safety, and
  updates the bitstring. Missing Discord roles remain inspectable but cannot be
  edited until restored.
- `roles.syncRole`: requires Configure access. It refetches Discord metadata,
  scans Blade users, and reconciles every assignment for that linked role.
  Existing duplicate assignment rows are collapsed. Discord 404 users are
  skipped; other per-user failures are counted. The summary contains checked,
  added, removed, unchanged, skipped, and failed counts.
- `roles.batchAssign`: requires Assign access. Inputs contain unique role UUIDs,
  unique user UUIDs, and `grant | revoke`; validation caps the Cartesian product
  to a safe finite size. For each pair, Discord is attempted first. Blade rows
  change only after Discord succeeds. Existing grants/missing revocations are
  skipped. DB failure triggers a best-effort compensating Discord operation.
  The response contains per-pair successful, skipped, and failed results.
- `roles.unlinkRole`: requires Configure access, role UUID, and the literal
  `I am absolutely sure`. It blocks final-admin lockout and any downstream role
  references. In one transaction it removes all Blade assignments and the Role
  row. It never removes the Discord role from members or deletes it from the
  guild.

All procedures use safe `TRPCError` codes: `NOT_FOUND` for missing Blade/Discord
objects, `CONFLICT` for duplicate links/names, dependencies, or last-admin
protection, `BAD_REQUEST` for ineligible roles/invalid operations, and
`FORBIDDEN` for access failures. No role mutation writes to the deferred audit
transport.

## Validation

- Add `role-management.ts` in `@forge/validators` for Discord snowflakes, UUID
  inputs, deduplicated permission arrays, role filters, assignment paging,
  Cartesian-product limits, operation discriminants, and unlink confirmation.
- Export the existing permission-key schema from a neutral validator module or
  reuse it without duplicating the permission vocabulary.
- Normalize query strings and reject unknown tab/filter/page-size values.
- The API ignores client-supplied Discord names, colors, managed state, counts,
  and raw bitstrings.

## Data / migration / compatibility

- No schema migration. Cosmetic state is inferred from an all-zero bitstring of
  the current permission length.
- Preserve all existing permission indices and tolerate legacy shorter
  bitstrings on read. Every save emits a normalized current-length bitstring.
- `Roles.name` becomes a synchronized copy of the exact Discord name; create,
  edit, and manual sync refresh it. Existing rows display live Discord names
  when available and retain the stored name as the missing-role fallback.
- `teamHexcodeColor` refreshes from Discord. `issueReminderChannel` remains
  unchanged and hidden.
- Role-name uniqueness is enforced case-insensitively in the API without a new
  database constraint. `discordRoleId` retains its database unique constraint.
- `Permissions` lacks a unique pair constraint. Mutations explicitly collapse
  duplicates and avoid creating known duplicates; a schema hardening migration
  is out of scope.
- Downstream dependency management is deferred. Detail may count
  `FormSectionRoles`, `FormResponseRoles`, `Issue`, and
  `IssuesToTeamsVisibility`; unlink returns `CONFLICT` when any exist rather
  than relying on cascade/restrict side effects.
- Existing production and cron consumers continue reading the same tables and
  bitstrings. The daily role-sync cron remains bidirectional and naturally
  includes zero-permission cosmetic roles.
- Rollback is code-only because no data shape changes. Roles created through
  this feature remain valid legacy-compatible rows.

## Discord integration

- Use the configured Knight Hacks guild and existing server-only Discord REST
  client. Discord credentials never reach Blade.
- Discovery uses one guild-role request; manual preview uses a single role
  request. The existing member-count endpoint is optional and failure-safe.
- Immediate/manual membership sync uses the established per-user guild-member
  lookup to avoid requiring a new privileged intent. Work is sequential or
  conservatively bounded to respect rate limits.
- Assignment is Discord-authoritative per pair: no Discord success means no
  Blade access change. Partial batch results are normal and visible.
- Direct Discord changes continue reconciling through the existing daily cron.
- Missing Discord roles remain visible with a warning and may be safely
  unlinked, but cannot be edited, assigned, or synchronized.
- Discord audit logging is explicitly deferred to a future shared audit router.

## Configurability review

Would this require a developer change next year?

- Answer: No for routine role linking, cosmetic roles, assignments, or existing
  permission combinations. Officers configure those in Blade from live Discord
  data.
- Adding a new platform capability still requires a developer to add one stable
  permission key/index. This feature then exposes it automatically in the
  grouped permission editor.

## React / frontend constraints

- Keep the page and access gate server-side. Use client components only for
  tabs/query-state interaction, picker/search, selection, and mutations.
- Match the existing integrated Blade header/rail. Add one Roles destination;
  do not add an admin landing page or inaccessible links.
- Roles tab: one raised panel containing a compact toolbar and table on desktop;
  mobile uses role cards. Permission lists and metadata are darker inset rows,
  not nested cards.
- Assignments tab: desktop user table plus a persistent selection/action panel;
  mobile user cards plus a touch-friendly selection tray.
- Creation/edit/detail uses query-addressable dialogs. Destructive unlink and
  batch preview use separate focused confirmation dialogs.
- Use searchable combobox/command behavior for Discord and permission search,
  status text plus color, visible focus, reduced motion, keyboard navigation,
  and 44px mobile targets.
- Loading/error boundaries must preserve the server-rendered shell. Toasts use
  the raised-card theme already established in Blade.

## Testing / verification strategy

- `@forge/validators` Vitest: snowflakes, permission arrays, exact page sizes,
  URL/query parsing, pair limits, and confirmation phrase.
- `@forge/api` Vitest: permission separation/override, bitstring conversion,
  Discord-option filtering, exact-name sync, cosmetic roles, reconciliation,
  Discord-first batch behavior, compensation, partial results, dependencies,
  and last-admin protection.
- Blade component tests: capability-specific tabs/actions, role filters,
  cosmetic/missing states, grouped permissions, warning copy, selection preview,
  mobile density, and safe errors.
- Playwright: auth redirects, capability-specific access, Discord picker/manual
  path, cosmetic create/edit/sync, search/filter/query persistence, assignment
  grant/revoke with partial failure, safe unlink, and desktop/320px screenshots.
- Required gates include targeted tests, typecheck/lint, React analysis before
  and after UI work, focused Blade E2E, `pnpm test`, `pnpm verify:precommit`,
  `pnpm verify:push`, and production Blade/API builds. Feature-caused failures
  must be fixed; unrelated reproducible blockers belong in `status.md`.

## Open questions

- None.
