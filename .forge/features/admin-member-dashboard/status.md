# Admin Member Dashboard Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-15: Human confirmed the feature bundle is complete; normalized all
  artifact status fields to `Complete`.
- 2026-06-27: Work targets Blade and `@forge/api` on the
  `reforge/admin-member-dashboard` branch from local `reforge/main`.
- 2026-06-27: Existing `READ_MEMBERS`, `EDIT_MEMBERS`, and `IS_OFFICER`
  capabilities remain the permission vocabulary; client-side hiding will be
  backed by page and tRPC authorization checks.
- 2026-06-27: The legacy production dashboard is reference material only. The
  Reforge dashboard must use the current member and dues models, including
  academic-year payment history and stale records.
- 2026-06-27: Human selected member editing, deletion, individual dues
  controls, first-class filtering, search, and page sizes 25/50/100/250/500;
  payment history is deferred. Detailed behavior still requires reverse-prompt
  approval.
- 2026-06-27: `READ_MEMBERS` gates member reads; `EDIT_MEMBERS` gates member
  and dues mutations; `IS_OFFICER` remains the override. `READ_CLUB_DATA` alone
  will not expose member PII.
- 2026-06-27: Restore only read-only current-user role/permission APIs in this
  feature. Role configuration, assignment, and Discord writes remain deferred.
- 2026-06-27: Human selected `/admin/members`, no `/admin` landing page, and a
  thin icon-first admin navigation rail that reveals labels on hover/focus.
- 2026-06-27: Human selected fuzzy search, compound multi-select filters in a
  filter dialog, 25 default results, newest-first ordering, and sortable join
  date/name/Discord fields.
- 2026-06-27: Human selected a query-addressable member dialog, member-profile
  deletion only, the existing fixed deletion phrase, individual grant/revoke
  dues controls, filtered CSV export, and restored three-stage mass dues
  invalidation.
- 2026-06-27: Mobile results prioritize member name, Discord username, and dues
  status while retaining a complete mobile member dialog.
- 2026-06-27: Human approved effective-record-only mass invalidation,
  all-profile CSV with Member ID only, profile-owned deletion cleanup,
  target-user file view/replace/remove, app-layer fuzzy ranking, and
  relevance-first search ordering.
- 2026-06-27: Human approved the decision-complete implementation plan and
  requested implementation through all test and browser-verification gates.
- 2026-06-27: Human requested a card-toned toast, permission-aware admin rail
  on the member dashboard, directly toggleable dues badges, a persistent
  server-rendered shell during admin loading, and investigation of manual dues
  surviving mass invalidation.
- 2026-06-27: Investigation confirmed legacy Blade stores manual/Stripe dues
  under the UTC calendar year while Reforge writes the academic-year start.
  Current-calendar-year rows now remain compatible, and revoke/invalidate
  resolves rows repeatedly until the member is actually unpaid while
  preserving unrelated history.
- 2026-06-27: Human requested smaller, more intentional mobile sizing after
  card and detail layouts overflowed visually. The dashboard now treats 320px
  as the narrow regression viewport, uses compact type/gutters/padding, and
  gives member detail an explicit section hierarchy on desktop and mobile.
- 2026-06-27: Human requested exact alignment between the rail and header
  dividers and one mobile hamburger dropdown instead of separate Dashboard and
  Members buttons. Both shell regions now share a 64px divider row, and the
  mobile menu preserves active-page and keyboard semantics.
- 2026-06-27: Human identified the standalone desktop Edit member action as
  visually disconnected. It now lives in the dialog identity header on
  desktop while remaining full-width beneath the identity on mobile.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Read repository instructions, agentic-development docs, relevant repo
      skills, Blade design system, and legacy/current implementation surfaces.
- [x] Create the Reforge task branch and feature artifact bundle.
- [x] Implement and test effective permission loading and read-only roles API.
- [x] Implement and test admin member validators and tRPC procedures.
- [x] Implement and test the responsive admin member dashboard.
- [x] Integrate permission-aware admin navigation into the shared member shell.
- [x] Make row/card dues statuses direct editor controls.
- [x] Restore legacy calendar-year dues compatibility and guarantee that
      individual and mass revoke leave affected members unpaid.
- [x] Keep the admin shell mounted around loading/error/result boundaries and
      align toast surfaces with the raised-card theme.
- [x] Contain the mobile list and detail dialog at 320px and replace the flat
      detail-card grid with named content and summary sections.
- [x] Pixel-align the desktop shell divider and consolidate mobile admin
      destinations into one hamburger dropdown.
- [x] Anchor the responsive Edit member action to the dialog identity header.
- [x] Complete targeted and repository validation.

## Validation / commands

- `git status --short --branch`: work remains on
  `reforge/admin-member-dashboard`; no commit or merge was performed.
- `pnpm forge:feature admin-member-dashboard "Admin Member Dashboard"`: passed.
- Targeted package lint and typechecks pass for `@forge/api`, `@forge/blade`,
  `@forge/consts`, `@forge/utils`, and `@forge/validators`.
- `pnpm --filter=@forge/api test`: 11 files and 65 tests pass, including
  permission middleware, fuzzy ranking, CSV safety, shared-resume cleanup, and
  legacy calendar-year dues compatibility and invalidation-chain coverage.
- `pnpm --filter=@forge/blade test`: 8 files and 21 tests pass, including URL
  state, responsive information density, reader/editor/officer visibility,
  direct dues controls, permission-aware shared-shell rendering, and the
  sectioned member-detail hierarchy.
- `pnpm --filter=@forge/validators test`: 3 files and 24 tests pass, including
  exact page sizes, compound filters, destructive confirmations, update
  boundaries, and malformed inputs.
- `pnpm test`: 19 of 19 Turbo tasks pass across the monorepo.
- Focused Playwright admin suite: 4 scenarios pass against PostgreSQL and
  MinIO, covering route gates, no-Member administrators, fuzzy search,
  compound OR/AND filters, sorting, pagination, every page-size option,
  all-page CSV, deep links, editing, form-response sync, files, dues,
  profile-only deletion, desktop/mobile screenshots, member-to-admin shell
  stability, computed toast theming, direct badge toggling, and legacy manual
  grant invalidation. The mobile scenario runs at 320x740, asserts no
  document-level horizontal overflow before and after opening detail, and
  verifies the named detail sections. It also opens the hamburger menu and
  verifies both destinations, while the desktop check compares the rail and
  header divider coordinates exactly. The editor scenario asserts that the
  visible Edit member action is contained within the desktop dialog header.
- `pnpm --filter=@forge/blade e2e`: all 37 Playwright scenarios pass, including
  the four admin-member scenarios and the existing Blade browser suite.
- Targeted React analysis: 8 files, 5 components, 0 failures. Changed React
  analysis against the actual feature base (`--base=reforge/main`): 7 tracked
  files, 4 components, 0 failures.
- Follow-up React analysis for the final responsive dashboard, sectioned member
  detail, and compact sign-out control: 3 files, 3 components, 0 failures.
- Final shell analysis for the aligned authenticated shell and mobile admin
  dropdown: 2 files, 2 components, 0 failures.
- `pnpm --filter=@forge/api build`: passed.
- `NODE_ENV=production pnpm --filter=@forge/blade build`: passed; the generated
  route manifest includes `/admin/members`.
- `pnpm verify:push`: formatting and lint pass across the monorepo; its
  workspace typecheck reaches the unchanged `@forge/guild` package and fails
  because that app references the nonexistent `api.guild` router. No file in
  `apps/guild` differs from `reforge/main`.
- `pnpm verify:precommit`: its default React analyzer uses `origin/main` rather
  than this feature's `reforge/main` base, expands into 260 pre-existing
  Reforge/legacy files, and crashes on unchanged Blade tRPC wrapper files with
  `Cannot read properties of undefined (reading 'type')`. Both targeted
  feature analysis and changed analysis against `reforge/main` pass.
- `pnpm build`: the exact command first fails in unchanged Gemiknights because
  the developer's ignored local `.env` sets `NODE_ENV=development`. With
  `NODE_ENV=production`, Gemiknights builds and the workspace proceeds until
  the unchanged `@forge/club` app references the nonexistent `api.event`
  router. No file in `apps/gemiknights`, `apps/club`, or `apps/guild` differs
  from `reforge/main`; the feature's Blade production build passes.
- `git diff --check`: passed.
- Playwright uses the existing `BLADE_E2E_AUTH` flag to isolate its Next.js
  build in `.next-e2e`, allowing the shared development watcher to remain
  undisturbed.

## Links

- PRs:
- Issues:
- Discord/thread context:
