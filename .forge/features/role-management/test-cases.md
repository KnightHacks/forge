# Role Management Test Cases

Status: Complete

## Scope

These cases cover role-management access, Discord discovery, access/cosmetic
role configuration, synchronization, assignment, safe unlinking, URL state,
and responsive Blade behavior. They exclude Discord role creation/deletion,
dependency-resolution UI, audit delivery, and new permission definitions.

## Test placement plan

- `packages/validators/src/tests`: role input and query contracts with Vitest.
- `packages/api/src/tests/roles`: permission, mapping, Discord, reconciliation,
  assignment, and unlink behavior with deterministic DB/Discord mocks.
- `apps/blade/src/tests/admin`: rendered control visibility and dashboard states.
- `apps/blade/src/tests/e2e`: high-value role-management workflows against
  isolated local fixtures and mocked Discord transport.

## Test cases

### TC-001: Access follows Configure and Assign capabilities

Setup:

- Create an officer, a Configure-only user, an Assign-only user, an unrelated
  signed-in user, and an unauthenticated request.

Action:

- Open `/admin/roles`, switch tabs, and call every read/mutation family.

Expected observations:

- Officers see and use both tabs.
- Configure-only users receive only Roles capabilities; Assign-only users
  receive only Assignments capabilities.
- The unrelated user is redirected to `/member/dashboard` and receives
  `FORBIDDEN`; unauthenticated procedures return `UNAUTHORIZED`.
- Hidden UI does not substitute for API enforcement.

### TC-002: Discord picker returns only eligible roles

Setup:

- Discord returns `@everyone`, normal, managed, already-linked, colored, and
  uncolored roles plus optional member counts.

Action:

- Open the create dialog and search the picker.

Expected observations:

- Only unlinked, non-managed, non-`@everyone` roles are selectable.
- Options show exact Discord names, IDs, colors, and available counts in stable
  Discord position/name order.
- Count-service failure leaves roles selectable with count unavailable.

### TC-003: Manual Discord-ID preview follows the same eligibility rules

Setup:

- A configurator enters valid unlinked, missing, malformed, managed, and
  already-linked IDs.

Action:

- Request a preview and attempt creation.

Expected observations:

- The valid role previews and can be selected.
- Malformed input fails validation; missing is `NOT_FOUND`; managed,
  `@everyone`, and linked roles are rejected with safe specific messages.
- Client-supplied names/colors cannot replace Discord values.

### TC-004: Configurator creates an access role

Setup:

- An eligible Discord role has existing Discord members who also have Blade
  accounts.

Action:

- Select several grouped permissions and create the link.

Expected observations:

- The stored name and color match Discord exactly, the immutable Discord ID is
  unique, and the normalized bitstring enables only selected keys.
- Immediate sync adds missing Blade assignments and reports all outcome counts.
- The role appears as an Access role in the complete list and shareable detail.

### TC-005: Configurator creates and assigns a cosmetic role

Setup:

- An eligible Discord role is selected with no permissions.

Action:

- Create it, sync it, and grant it to a Blade user from Assignments.

Expected observations:

- Creation succeeds with an all-zero current-length bitstring and a Cosmetic
  label.
- It remains visible in normal role lists/selectors and participates in sync.
- It contributes no effective Blade capability even while assigned.

### TC-006: Permission editor is grouped without changing vocabulary

Setup:

- Open an access role containing permissions from several existing domains.

Action:

- Search permissions, clear/select values, and choose Officer access.

Expected observations:

- Every existing permission appears exactly once under a presentation group
  with its canonical name/description.
- Search and bulk selection update the count deterministically.
- Officer selection shows a high-impact warning.
- Saving emits a normalized bitstring without adding/reordering indices.

### TC-007: Sync reconciles one role and refreshes Discord metadata

Setup:

- The Discord role was renamed/recolored; Blade has missing, stale, duplicate,
  unchanged, absent-guild, and errored user assignments.

Action:

- Run `Sync now`.

Expected observations:

- Stored name/color match Discord; missing assignments are added, stale and
  duplicate rows are removed, and correct rows remain.
- The summary reports checked, added, removed, unchanged, skipped, and failed
  counts without exposing PII.
- One user failure does not discard successful reconciliation for others.

### TC-008: Assignment search, AND filters, pagination, and URL state work

Setup:

- More than 25 auth users exist, including users without Member profiles and
  users with overlapping roles.

Action:

- Search by supported identity fields, apply several role filters, sort through
  pages, choose every page size, reload, and share the URL.

Expected observations:

- Search finds matching Discord/member identity values safely.
- Users must hold every selected filter role.
- Totals/pages are correct, state survives reload, and search/filter/page-size
  changes reset to page one.
- Users without Member profiles remain eligible.

### TC-009: Batch grant changes only Discord-successful pairs

Setup:

- Select several users and roles producing successful, already-assigned,
  Discord-failed, and DB-failed pairs.

Action:

- Confirm the displayed Cartesian pair count and grant.

Expected observations:

- Discord is attempted before Blade for new pairs.
- Successful pairs receive one Blade assignment; existing pairs are skipped;
  Discord-failed pairs do not change Blade.
- DB failure triggers best-effort Discord compensation and appears as failed.
- The UI presents successful, skipped, and failed counts without claiming total
  success.

### TC-010: Batch revoke changes only Discord-successful pairs

Setup:

- Select assigned, missing, duplicate, and Discord-failed pairs.

Action:

- Confirm and revoke.

Expected observations:

- Discord succeeds before Blade removes all duplicate rows for an assigned
  pair; missing pairs are skipped; Discord-failed pairs remain in Blade.
- DB failure triggers best-effort Discord restoration and is reported.

### TC-011: Role unlink is safe and leaves Discord unchanged

Setup:

- A normal role has Blade assignments and no downstream dependencies.

Action:

- Enter `I am absolutely sure` and unlink it.

Expected observations:

- Blade assignments and the linked Role row disappear in one transaction.
- No Discord role or member-role removal call occurs.
- The dashboard closes the role query state and reports success.

### TC-012: Role detail and tab state are shareable

Setup:

- An authorized user opens an existing role on each permitted tab state.

Action:

- Copy/reload URLs containing `view`, searches/filters, and `role`.

Expected observations:

- The same permitted tab/filter/detail state reopens.
- Invalid or inaccessible tab parameters normalize to the user's first allowed
  tab; malformed role IDs produce a safe not-found state.

### TC-013: Desktop and phone layouts preserve operational density

Setup:

- Open both tabs at desktop width and 320x740.

Action:

- Search, open dialogs, select users/roles, inspect batch preview, and view
  pending/error states.

Expected observations:

- Desktop uses scan-friendly tables and aligned action panels.
- Mobile uses contained cards and a touch-friendly selection tray with no
  document-level horizontal overflow.
- Dialogs, focus order, contrast, reduced motion, and 44px targets remain
  usable; the server-rendered admin shell does not shift while loading.

## Negative / regression cases

### TC-NEG-001: Duplicate or conflicting role creation is rejected

Setup:

- A linked Discord ID or case-insensitively matching stored Discord name exists.

Action:

- Attempt to create another link.

Expected observations:

- The API returns `CONFLICT`; no role or assignment row is inserted.

### TC-NEG-002: Immutable and malformed inputs cannot mutate roles

Setup:

- Submit unknown permission keys, raw bitstrings, malformed UUID/snowflake,
  duplicate arrays, excessive pair counts, or a changed Discord role ID.

Action:

- Call role procedures directly.

Expected observations:

- Validation rejects the request before Discord or DB mutation.

### TC-NEG-003: Missing Discord roles remain diagnosable

Setup:

- A linked role no longer exists in Discord.

Action:

- List, inspect, edit, assign, sync, and unlink it.

Expected observations:

- List/detail show the stored-name fallback and Missing state.
- Edit, assignment, and sync fail safely; confirmed safe unlink remains
  available subject to normal dependency/admin protections.

### TC-NEG-004: Dependencies block unlink without cascading

Setup:

- A role is referenced by a form, issue, or issue visibility row.

Action:

- Attempt confirmed unlink.

Expected observations:

- The API returns `CONFLICT`, reports that the role is in use, and changes no
  Role, assignment, form, or issue data.

### TC-NEG-005: Final administrative access cannot be removed

Setup:

- The target role is the final assigned role granting Configure Roles or
  Officer access.

Action:

- Remove those permission keys or unlink the role.

Expected observations:

- The API returns `CONFLICT` and preserves the role, permissions, and
  assignments. A different assigned administrative role allows the operation.

### TC-NEG-006: Wrong unlink phrase changes nothing

Setup:

- A removable role exists.

Action:

- Submit any phrase other than `I am absolutely sure`.

Expected observations:

- Validation fails before Discord or DB work.

## Automation mapping

- `TC-001` — `permission-procedure.test.ts` exercises Configure/Assign/Officer
  API gates; Playwright `enforces configure and assignment capabilities`
  proves unauthenticated, unrelated, Configure-only, and Assign-only page and
  mutation behavior.
- `TC-002` — API `filters Discord discovery...` and `keeps eligible Discord
roles selectable...` cover eligibility, ordering, color/count mapping, and
  count failure; Playwright verifies the picker omits linked, managed, and
  `@everyone` roles.
- `TC-003` — validator snowflake/strict-object cases plus Playwright `filters
Discord discovery and validates manual previews...` cover valid, malformed,
  missing, managed, `@everyone`, already-linked, and name-conflicting IDs.
- `TC-004` — Playwright `creates an access role from Discord metadata...`
  asserts exact Discord name/color/ID, normalized permission bits, immediate
  assignment reconciliation, Access labeling, and shareable detail.
- `TC-005` — Playwright `creates, assigns, edits, syncs, revokes, and unlinks a
cosmetic role` verifies an all-zero role is assignable and does not grant an
  otherwise unauthorized user admin access.
- `TC-006` — Blade role-permission-editor tests prove canonical one-time
  grouping and warnings; Playwright exercises search, select all, clear all,
  deterministic counts, and Officer warning; API permission mapping tests
  preserve bit indices.
- `TC-007` — API reconciliation-plan tests and Playwright `sync reconciles
metadata...` assert rename/recolor plus added, stale, duplicate, unchanged,
  missing-member, and errored-member outcomes against persisted rows.
- `TC-008` — API identity-search/AND-filter tests, URL parser tests, and
  Playwright `persists assignment search...` cover all page sizes, totals,
  next-page behavior, reset-to-page-one, overlapping-role AND filters,
  profile-less users, reload, and shared URLs.
- `TC-009` — API batch tests cover Discord-first grant, existing-pair skips,
  Discord failure, DB failure, and compensation; Playwright `reports partial
Discord batch failures...` verifies pair counts, partial-result copy, and
  persisted successful/failed pairs.
- `TC-010` — API batch tests cover Discord-first revoke, missing-pair skips,
  Discord failure, DB failure, and restoration; Playwright `revokes every
duplicate Blade row...` verifies duplicate removal, skips, and preserved
  failed pairs in the database.
- `TC-011` — Playwright cosmetic and missing-role workflows assert confirmed
  unlink, assignment and Role deletion, closed query state, success copy, and
  the ability to relink the unchanged Discord role.
- `TC-012` — URL parser tests plus the cosmetic and assignment Playwright
  workflows verify tab/filter/detail reload and sharing, capability-specific
  tab normalization, and malformed role IDs.
- `TC-013` — Blade rendered-layout tests and Playwright desktop/320px workflows
  cover tables/cards, dialogs, selection tray, pending/error copy, screenshots,
  document-width containment, matching 44px desktop toolbar controls, and the
  intentionally reduced assignment table without an Email column.
- `TC-NEG-001` — Playwright `rejects conflicts...` calls the API for duplicate
  Discord ID and case-insensitive Discord-name conflicts and asserts no Role
  insertion.
- `TC-NEG-002` — strict validator tests reject unknown fields, raw bitstrings,
  malformed targets, duplicate arrays, excessive pairs, and attempted Discord
  metadata changes before mutation.
- `TC-NEG-003` — Playwright `diagnoses missing Discord roles...` proves stored
  fallback display, disabled edit/sync, assignment rejection, and safe unlink.
- `TC-NEG-004` — Playwright dependency-conflict coverage asserts `CONFLICT` and
  preservation of the Role and downstream reference.
- `TC-NEG-005` — pure final-administrator model tests plus Playwright
  `preserves the final assigned role administrator...` prove update and unlink
  conflicts while retaining the persisted assignment.
- `TC-NEG-006` — validator and direct HTTP Playwright cases reject the wrong
  phrase and preserve the dependency-bound Role.

## Open questions

- None.
