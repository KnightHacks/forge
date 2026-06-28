# Admin Member Dashboard SRD

Status: Approved

## Technical purpose

Add the first Reforge admin surface and restore the minimum durable permission
infrastructure it needs. The Blade app remains a thin server-first client;
permission resolution and member administration live in `@forge/api`, while
reusable inputs live in `@forge/validators`.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: auth and
  permission policy, server-first React/Next.js, tRPC ownership, validation,
  mutation UX, testing, and auditability.
- `docs/API-AND-PERMISSIONS.md`: `permProcedure` plus an explicit
  `controlPerms` check in every permission-aware resolver.
- `apps/blade/DESIGN_SYSTEM.md`: dashboard surface hierarchy, token use,
  accessibility, and mobile behavior.

## Access policy

- Unauthenticated callers receive `UNAUTHORIZED` from protected APIs and are
  redirected to sign-in by the page.
- `READ_MEMBERS`, `EDIT_MEMBERS`, or `IS_OFFICER` may list/filter members and
  read a member detail.
- `EDIT_MEMBERS` or `IS_OFFICER` may update/delete members and change current
  dues status.
- `IS_OFFICER` remains the global override implemented by `controlPerms`.
- `READ_CLUB_DATA` alone does not grant access to member PII.
- Client-side visibility is UX only; every query and mutation enforces policy
  at the tRPC boundary.

## Architecture / data flow

- `permProcedure` loads the current user's effective permission map by joining
  `auth_permissions` to `auth_roles` and OR-ing each role bitstring.
- A small roles router exposes `getPermissions` for the current user and
  `hasPermission` for server page/navigation gates. It does not accept another
  user ID and contains no role mutations.
- Permission-map construction is a typed API utility with unit coverage for
  multiple roles, short/malformed bitstrings, and no-role users.
- Admin member inputs and filters live in `@forge/validators`.
- Admin member procedures live with the member domain in `@forge/api`.
- `/admin/members` is a Server Component that authenticates and performs the
  initial permission check. Interactive search/filter/pagination and dialogs
  live in leaf Client Components.
- The `/admin` layout owns the authenticated shell so its header and rail are
  server-rendered before the `/admin/members` loading boundary. The same shell
  receives effective permissions on member routes and exposes Members there
  only to authorized administrators.
- Dashboard state uses URL search parameters. The API remains authoritative for
  pagination, filtering, sorting, and counts.

## tRPC/API behavior

- `roles.getPermissions`: protected current-user query returning a complete
  typed boolean map.
- `roles.hasPermission`: permission-aware query accepting a validated `or` or
  `and` expression and returning a boolean for navigation/page gates.
- `member.getAdminMembers`: requires read-member access and returns rows,
  total count, page count, normalized page, and available facet values/counts.
- `member.getAdminMember`: requires read-member access and returns one full
  member record with derived current dues status.
- `member.updateAdminMember`: requires edit-member access, validates a member
  ID plus member profile values, updates the selected member rather than the
  caller, and keeps the code-owned signup response consistent.
- `member.deleteAdminMember`: requires edit-member access and deletes the
  selected Member row, signup response, dues rows, and unreferenced member
  uploads. It retains the User, roles, permissions, sessions, and Hacker data.
- `member.setAdminDuesStatus`: requires edit-member access. Marking paid creates
  a manual active record for the payable year with the configured dues amount
  and no Stripe intent, or reactivates an existing payable-year record without
  rewriting its payment metadata. Revoking repeatedly resolves effective rows
  and marks them inactive until the member is unpaid; it does not delete
  history.
- `member.invalidateEffectiveDues`: requires officer access and, in one
  transaction, repeatedly resolves and invalidates rows until every affected
  member is unpaid. The returned count is distinct affected members rather than
  modified rows.
- `member.exportAdminMembers`: requires read-member access and returns an
  escaped CSV for every result matching the current filters and fuzzy search.
- Admin profile-picture and resume procedures resolve the target User from the
  Member UUID, preserve object-prefix ownership, and require edit-member access.
- Missing records return `NOT_FOUND`; invalid filters return `BAD_REQUEST` via
  Zod; authenticated authorization failures return `FORBIDDEN`.
- Mutations log success and failure without sensitive field values.

## Validation

- Page sizes are restricted to `25 | 50 | 100 | 250 | 500`.
- Page is a positive integer; search is trimmed and bounded.
- Sort fields and direction are enumerated.
- Filters accept only known member option values, a valid graduation year,
  dues state, and Guild visibility.
- Admin member updates reuse current profile validation and add a UUID member
  identifier. Discord username, creation fields, auth identity, and storage
  object names supplied directly by clients are not editable.
- Permission expressions use `PermissionKey`, not arbitrary strings, and must
  provide exactly one non-empty `or` or `and` list.

## Data / migration / compatibility

- No schema migration is required. Existing `Roles`, `Permissions`, `Member`,
  `FormResponse`, and `DuesPayment` rows remain authoritative.
- Manual dues records use cents, the same configured price, academic-year
  calculation, unique member/year rule, and active/stale semantics as Stripe
  records.
- Legacy Blade dues rows used the UTC calendar year instead of the academic-year
  start and did not reliably distinguish manual grants from Stripe payments.
  Active current-calendar-year rows remain valid compatibility inputs for
  status, individual revoke, filtering, CSV, and mass invalidation.
- Current production `main` continues to interpret the same permission
  bitstrings and tables. This feature adds no permission indices and therefore
  remains compatible with existing roles and the bootstrap-superadmin script.
- Member deletion may target the acting administrator, but removes only their
  Member-owned data. It must not delete any User, role, permission, session, or
  Hacker row.
- Fuzzy search runs in the application layer over lightweight candidates after
  SQL filters. Exact, prefix, substring, and bounded edit-distance matches rank
  in that order. Relevance precedes the selected stable sort.
- CSV includes the Member UUID and human-facing profile fields, points, current
  dues summary, join date, and file-availability booleans. It excludes User IDs
  and storage keys and neutralizes spreadsheet formula prefixes.

## Discord integration

- Existing Discord-linked role rows remain the permission source.
- This slice reads role assignments only. It does not grant/revoke Discord
  roles or synchronize role membership.
- Member and dues mutations use the established audit log integration when
  available, but no mutation logs PII or payment details. A Discord transport
  failure is logged locally and does not reverse committed database work.

## Configurability review

Would this require a developer change next year?

- Answer: No for access, page sizes, filters, or dues year calculation. Access
  stays driven by configurable role bitstrings and dues year uses the existing
  academic-year rules.
- The dues price remains the existing configured product constant; making price
  admin-configurable is outside this feature.

## React / frontend constraints

- Keep the page server-side and put only table/filter/dialog interaction in
  Client Components.
- Use the Blade panel/inset hierarchy, no nested cards, semantic table/list
  markup, visible focus, 44px mobile targets, and token colors.
- Desktop uses a scan-friendly table with a sticky/clear filter tool area.
  Mobile uses compact member result surfaces rather than forcing a wide table.
  At 320px, page gutters, card padding, heading scale, pagination, and header
  actions must remain within the viewport without document-level horizontal
  overflow; interactive controls retain a minimum 44px target.
- Permission-restricted controls are omitted, not merely disabled.
- Desktop uses an icon-first left rail that reveals labels on hover/focus;
  mobile uses a compact admin header with one hamburger dropdown for Dashboard
  and Members. The desktop rail header and top navigation use the same fixed
  row height and divider position. The rail and header share one raised-card
  surface and appear on member routes only when effective permissions allow
  admin access. Only implemented destinations appear.
- Member detail is addressable through `?member=<uuid>` and uses a mobile-safe
  full dialog. Contact, academics, Guild, files, membership/dues, and record
  metadata are explicit sections rather than an undifferentiated card grid.
  Desktop places membership and record summaries beside the main content;
  mobile uses one compact, ordered column. The edit action belongs to the
  identity header on desktop and expands beneath the identity block on mobile.
  URL parameters also own filters, sort, page, and page size.
- Paid/Unpaid badges are direct controls for editors and static indicators for
  readers. Mutations expose pending state, raised-card themed toast feedback,
  safe errors, destructive confirmation, and query invalidation.

## Testing / verification strategy

- `@forge/api` Vitest coverage for permission resolution, access failures,
  member list/filter/pagination contracts, editing, deletion, and dues changes.
- `@forge/validators` tests for page sizes, filter combinations, permission
  expressions, and admin update inputs.
- Blade component tests for read-only/editor control visibility and dashboard
  states.
- Playwright covers authorized access, combined filters/pagination, editing,
  dues toggling, deletion confirmation, and unauthorized redirect.
- Run targeted tests/typechecks/lint first, then React analyzer,
  `pnpm verify:precommit`, and a focused desktop/mobile screenshot review.

## Open questions

- None.
