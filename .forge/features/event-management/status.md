# Event Management Status

Current phase: PR-review hardening implemented and verified

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

- 2026-07-15 layout refinement red checkpoint: focused Blade tests intentionally
  fail because the member dashboard/events views still use two-column layouts
  and `/admin/check-in` still renders helper copy plus an empty latest-result
  panel.
- 2026-07-15 layout refinement completion: member event groups and attendance
  now use compact stacked rows, the dashboard overview has intrinsic height,
  and the check-in station omits redundant instructions and renders Latest
  result only after an attempt.

## Decision log

- 2026-07-15: The isolated check-in page uses prominent Upcoming/Past event
  timing and one responsive event combobox. Upcoming mirrors Legacy Blade's
  descending start-time order; Past is newest first. The separate older-event
  search/native-select combination is removed.
- 2026-07-15: Scanner and Manual are first-class tabs. Manual lookup is one
  responsive member combobox plus an explicit Check in button, so selection is
  never an attendance mutation.
- 2026-07-15: Repeat check-in is a scanner-session option, off by default and
  never persisted on Event. Scanner requests may explicitly allow repeated
  attendance rows, but only the first row awards points; later rows snapshot
  zero. Manual stays idempotent. Pair locking, eligibility, audit, and deletion
  safety still apply. A handled QR must leave frame before the same payload is
  rearmed, preventing stationary-code scan loops.
- 2026-07-15: PR-review hardening preserves future Legacy discovery, adds stale
  edit revision checks, makes creation-key retry precede lead-time validation,
  preserves combined Legacy roles on ordinary dues edits, and adds bidirectional
  attendance indexes without a repeat-blocking uniqueness constraint.
- 2026-07-15: `db:pull --truncate` now uses a temporary dump and a single
  fail-fast transaction that preserves/restores the local migration ledger and
  tag catalog and validates orphan attendance before commit.
- 2026-07-15: Repeat mode needs no schema migration because EventAttendee
  already permits multiple member/event rows. The optional API flag defaults
  false, and the shared responsive-combobox additions are optional, preserving
  current-main callers and existing Blade consumers.
- 2026-07-15: The check-in workspace is edge-to-edge and viewport-filling on
  mobile below the authenticated shell, while desktop retains raised panels.

- 2026-06-29: Created `reforge/event-management` from local
  `reforge/main` at `aacd2589` and instantiated this feature bundle.
- 2026-06-29: Human selected event management as the next Reforge feature.
- 2026-06-29: The feature must provide a strong admin management experience,
  first-class Discord scheduled-event and Google Calendar integration, and
  explicit permission-based visibility and access policies.
- 2026-06-29: Product scope, lifecycle ownership, integration failure policy,
  and test expectations entered deep reverse-prompting. No product
  implementation or generated tests will begin before the completed artifact
  bundle is approved.
- 2026-06-29: Code archaeology confirmed that the legacy event router and
  Blade club event/check-in pages in `legacy/` exactly match production
  `main`, so they are valid behavioral evidence rather than an older snapshot.
- 2026-06-29: The existing `Event` model serves club and hackathon events and
  stores Discord/Google IDs, audience role UUIDs, operations-calendar state,
  an optional Discord channel, dues-only state, and points. `EventAttendee`
  stores only member/event IDs and has no uniqueness constraint or check-in
  timestamp.
- 2026-06-29: Reforge already supplies the prerequisites this feature should
  reuse: effective role permissions, linked/cosmetic roles, the shared admin
  shell, raw-`User.id` member QR codes, effective academic-year dues status,
  and member search/profile data.
- 2026-06-29: The legacy implementation is reference material, not a target.
  It exposes a broad event query publicly, allows club/hackathon edit
  capabilities to cross scopes, trusts client-supplied check-in points, checks
  for any dues row instead of effective dues, and expects a deprecated
  `user:` QR prefix.
- 2026-06-29: Legacy create/update subtract one day before persistence while
  reminder code adds one day back. Reforge needs one explicit timezone and
  production-data compatibility policy instead of preserving that workaround.
- 2026-06-29: Legacy create attempts Discord, Google, then Blade with cleanup;
  update and delete can still leave providers divergent. First-class
  integration requires an explicit source of truth, partial-failure,
  reconciliation, retry, and externally-missing-event policy.
- 2026-06-29: The public Club app already consumes
  `event.getPublicClubEvents`; restoring a safe public contract will remove the
  current `api.event` workspace build blocker.
- 2026-06-29: Human scoped the first slice to club events only. Hackathon event
  UI and hacker check-in remain absent, while the platform boundary should not
  make their later addition harder.
- 2026-06-29: The feature includes `/admin/events` with URL-addressable list,
  calendar, and check-in views; a shareable event detail dialog; large
  sectioned create/edit dialogs; responsive mobile cards; event duplication;
  search, first-class filters, pagination, and URL-preserved state.
- 2026-06-29: The public Club site keeps an upcoming-event feed. Members gain
  `/member/events`, a dashboard quick link, upcoming eligible events, and their
  own attendance history. Feedback/forms and analytics beyond attendance and
  CSV are deferred; existing public reminder consumption should remain
  compatible.
- 2026-06-29: Timed single-day and multi-day events use
  `America/New_York`; all-day and recurring events are deferred. Events may
  award zero points. The selected tag supplies default points, with an optional
  per-event override.
- 2026-06-29: Club event tags and default-point mappings must become
  admin-configurable in the database and dashboard. Adding a normalized table
  and migration is approved in principle.
- 2026-06-29: Human does not want a general Draft/Published/Cancelled/
  Completed lifecycle. A successfully synchronized submitted event is exposed
  immediately according to its audience, remains fully editable after it
  occurs, and cannot be deleted while it has attendance. Form-state
  preservation across accidental refresh/exit uses browser-local storage only.
- 2026-06-29: Event audience is exactly one of Public, Dues paying, or Selected
  roles. Selected roles use OR against Blade role assignments and include
  cosmetic roles. An orthogonal Internal event toggle selects the internal
  Google calendar and channel-backed Discord event behavior.
- 2026-06-29: The public Club feed includes Public and Dues-paying events, with
  a dues badge, but excludes role-restricted and internal events. Signed-in
  unpaid members see dues events in a locked state; ineligible role/internal
  events remain absent.
- 2026-06-29: `READ_CLUB_EVENT` reads club event configuration, provider
  health, aggregate attendance, and a minimal attendee view. `EDIT_CLUB_EVENT`
  owns event lifecycle, repair, attendee correction, export, and implied reads.
  `CHECKIN_CLUB_EVENT` receives only event titles, scanner access, and minimal
  identity lookup, with no event detail or attendee access. Officers override;
  administrators do not need a Member row; club capabilities never cross into
  hackathon events.
- 2026-06-29: Blade is authoritative. Creation must target both Discord and
  Google and reject past starts. Partial provider failure retains recoverable
  Blade state marked Needs attention; provider health, idempotent retry,
  explicit repair, and recreation of externally missing events are required.
  Drift detection and external import are deferred.
- 2026-06-29: Public events use external-location Discord scheduled events;
  internal events use a searchable live voice/stage-channel picker with manual
  ID fallback. Google destinations remain deployment-defined Public and
  Internal calendars; the existing development calendar intentionally serves
  as the internal destination. External titles use `[TAG] Name`, and Discord
  and Google receive the same generated location/points copy.
- 2026-06-29: Provider not-found responses count as successful cleanup.
  Mutations use idempotency protections and attempt non-blocking Discord audit
  logging with actor/event identifiers.
- 2026-06-29: Check-in is operator-scans-member: select one event, scan raw
  `User.id` QR values repeatedly, and retain temporary compatibility with
  legacy `user:<UUID>` values. Manual lookup uses name, Discord username, and
  email but returns minimal identity data.
- 2026-06-29: Check-in has no strict time window; the UI prioritizes current
  and recent events. It enforces effective academic-year dues and selected-role
  eligibility, returns an informative idempotent Already checked in result,
  and gives high-throughput visible success/rejection feedback.
- 2026-06-29: Attendance removal lives in the event attendee viewer and
  requires edit access. It subtracts the exact captured award for Reforge rows;
  migrated estimates are labeled and require extra acknowledgement. Later
  event-point edits do not rewrite historical awards. Check-in-only users cannot
  remove attendance. Attendance CSV and member-owned attendance history are
  required; offline scanning is deferred.
- 2026-06-29: Automated Discord/Google behavior uses deterministic gateways,
  not live writes. Browser coverage spans permission tiers, cross-scope UUID
  attacks, public/member visibility, provider failures and repair, duplicate
  scans, corrections, and 320px mobile. Full Reforge verification gates remain
  required.
- 2026-06-29: Unsaved create-form values persist only in browser-local storage;
  there is no user-facing server Draft lifecycle. After explicit submission, a
  partially synchronized row is admin-only until both providers succeed.
- 2026-06-29: Internal is orthogonal to audience. Internal events never reach
  the public Club feed but may be visible to eligible signed-in members. A
  selected-role event may intentionally use the public Discord calendar; the
  form warns that Discord visibility is then broader than Blade eligibility.
- 2026-06-29: Tag management includes name, default points, color, and active /
  archived state. Editors manage tags from a dedicated Events view. Existing
  event tag/point presentation is snapshotted, so later tag changes affect only
  future event selections.
- 2026-06-29: Attendance gains nullable migration-compatible check-in time,
  actor, awarded-points, and estimate metadata; new check-ins record all four.
  No database unique constraint will be added. A pair-scoped transaction lock
  and second existence check provide idempotency.
- 2026-06-29: Legacy attendance points are best-effort estimates. Backfill uses
  the Event's stored points and then the former hard-coded tag map, marks the
  result Estimated, and does not claim to reconstruct the client-supplied
  historical award. Unknown check-in time/actor values remain null.
- 2026-06-29: Events with any attendance cannot be deleted. Events without
  attendance use recoverable provider cleanup; not-found is success and a
  transient provider failure retains an admin-only deletion error for retry.
- 2026-06-29: Pre-Reforge events are marked legacy/stale. Their historical
  timestamps are preserved without the old plus/minus-one-day correction,
  they remain available for history and attendance, and automatic provider
  health/repair does not apply to them.
- 2026-06-29: A real development Discord/Google smoke test is deferred. All
  required automated integration proof uses deterministic gateway fakes.
- 2026-06-29: Final artifact audit locked safe provider reconciliation:
  Internal changes replace old projections in delete-then-create order;
  Google uses mandatory private identity metadata; ambiguous Discord creation
  requires an editor to link a reviewed candidate or confirm a new projection.
- 2026-06-29: Event-selected Blade roles participate in role-management
  dependency counts and cannot be unlinked while referenced. Reminder
  selection tolerates a later Google-only failure but requires a healthy
  Discord projection. Check-in-only access is enforced at direct API boundaries.
- 2026-06-29: Final concurrency audit added one shared Event lock for
  check-in/deletion, one fenced sync lease for every provider mutation, durable
  applied-destination metadata, role/tag locking, and changed-payload conflicts
  for creation-key reuse.
- 2026-06-29: Visibility-changing edits use the safe overlap of current and last
  synchronized policy, so narrowing is immediate and broadening waits for both
  providers. Legacy dues-plus-role rows retain AND semantics. DST gaps are
  rejected and repeated-hour edits require an explicit offset choice.
- 2026-06-29: Human approved the complete implementation plan. The artifact
  bundle was committed first on `reforge/event-management` as `47d1bc68`; test
  generation now precedes product implementation.
- 2026-06-29: Generated the approved validator, migration, API, Blade, Club,
  Cron, and focused Playwright contracts before product code. The aggregate
  red checkpoint failed only at the planned missing event modules, migration,
  shell access, public payload fields, reminder executor, and gated E2E fixture
  route; no unexpected baseline regression appeared.
- 2026-06-29: Implemented the responsive Blade event shell, admin list,
  calendar, check-in, tags, detail and create/edit surfaces; member event and
  attendance views; dashboard/admin navigation; Club safe-payload rendering;
  bounded reminder execution; and the production-gated Playwright fixture.
  Server pages now enforce the event permission tiers before loading data.
- 2026-06-29: Cross-package integration review identified and handed back API
  contract gaps for event-audience role choices, live Discord channel choices,
  list date-range filtering, member attendance tag colors, full attendee names,
  and public field-name compatibility. These are implementation gaps, not
  product questions, and are being closed against the approved artifacts.
- 2026-06-29: Blade/consumer review closed the remaining interaction gaps:
  provider-specific repair, known-ID versus no-ID Discord ambiguity, Legacy
  history treatment, defensive attendance deletion gating, newest-first past
  ordering, focus restoration, strict browser-draft validation, explicit
  estimated-attendance acknowledgement, and accurate Blade-only Legacy edit
  feedback. A real SQL repro also exposed an unqualified correlated attendance
  count; the API now qualifies the outer Event ID and returns the correct
  aggregate.
- 2026-06-29: Final provider-fencing review closed three release-blocking
  recovery races. Known-ID attempts now retain their durable revision and stay
  Unknown after inconclusive readback, configured Google calendars are
  deduplicated before identity recovery, and deletion intent is established
  only after the shared sync lease plus a transactional Event/attendance
  recheck. An expired update can no longer be mistaken for a deletion attempt.
- 2026-06-29: Post-handoff development startup exposed one stale disposable-DB
  test fixture that omitted the newly required provider attempt revision. The
  fixture now uses the complete projection shape, restoring the DB package
  build used by the root development task.
- 2026-07-03: Human split least-privilege event check-in from Event
  administration. `/admin/events` is the Read/Edit/Officer management surface;
  `/admin/check-in` is the Check-in/Officer operational surface. Check-in-only
  users must not see or receive event-table, detail, attendee, tag, export, or
  provider-management data.
- 2026-07-03: Human required Selected roles to use the established searchable
  multi-select combobox with removable choices. Multiple selected roles retain
  OR eligibility; one matching role is sufficient.
- 2026-07-03: Human required live Discord voice/stage selection to use the
  established searchable single-select combobox instead of a separate search
  field plus dropdown. Manual ID/type entry remains an explicit fallback state,
  not a competing default control.
- 2026-07-03: Artifact truth was revised before regenerated tests or product
  changes. Human approved the revised bundle and resumed the test-generation
  loop.
- 2026-07-03: Implemented independent `/admin/events` and `/admin/check-in`
  server routes, permission gates, navigation destinations, loading/error
  boundaries, and client data ownership. The management route no longer
  imports, fetches, receives, or renders check-in capabilities.
- 2026-07-03: Replaced the native multi-select role control with the established
  searchable multi-select pattern and removable selected-role values. Replaced
  the separate Discord channel search plus native dropdown with the shared
  responsive searchable combobox; manual ID/type entry is now an explicit
  fallback state.
- 2026-07-03: Completed the startup permission typing repair across utilities,
  API role projections, and Blade role consumers. Permission iteration now
  remains keyed by the typed permission index without string-key widening.
- 2026-07-03: Local `db:pull --truncate` after migration 0011 exposed a restore
  compatibility defect: zero Event rows and zero migration-seeded EventTag rows
  were restored while 1,061 orphan EventAttendee rows remained. The restore
  path currently continues past SQL import errors and requires a scoped repair
  plus regression coverage before final branch readiness.
- 2026-07-15: Production-shaped local data confirmed that all 155 migrated
  Legacy club events were preserved but fell under the default Upcoming timing
  predicate. Human made Past history a frequent first-class workflow, so the
  timing choice now uses a persistent prominent Upcoming/Past control rather
  than living inside the secondary filter dialog.
- 2026-07-15: Provider health is operational only until an event ends. Past
  queries ignore stale Discord/Google health filters, completed rows/details
  hide provider warnings and repair controls, and Blade deletion-pending state
  remains visible. Create and Duplicate now require a start at least 30 minutes
  ahead in the form and authoritative server schema because Discord rejects
  scheduled-event creation too close to or behind the current time.
- 2026-07-15: Member dashboard placeholders Member info and Academics are
  replaced by a larger Events overview containing a small nearest-upcoming set,
  up to three recent attendance rows, and a link to `/member/events`.
- 2026-07-15: Member event cards prioritize title/timing and add location,
  description access, aggregate check-in context, a dashboard return path, and
  safe Discord/Google Calendar actions. Member surfaces omit missing check-in
  time and never expose Legacy or Estimated migration terminology.
- 2026-07-15: Event descriptions now use one shared safe Markdown renderer in
  Blade admin/member details and Club event/home cards. CommonMark links, bold,
  italics, lists, and line breaks render consistently; raw HTML is ignored and
  links open with safe new-tab attributes. The focused Blade renderer and event
  surface checkpoint passed 12/12 cases, and Club event tests passed 5/5.
- 2026-07-15: Attendance correction uses the same removal flow for current and
  migrated non-null stored awards. The estimate acknowledgement is removed from
  validator, API, and Blade; unexpectedly null awards remain protected by a
  consistency conflict.
- 2026-07-15: Resolved check-in results return and render a minimal safe member
  identity/Guild snippet so Latest result identifies the person without
  exposing email, private profile fields, or profile-image storage keys.
- 2026-07-15: This UX revision requires no schema migration. It changes safe
  member/check-in response projections, a strict removal input, and Blade
  composition while retaining existing attendance migration metadata.
- 2026-07-15: Screenshot review replaced member-event two-column card grids
  with compact single-column rows, stacks the dashboard event groups in an
  intrinsic-height panel, and removes the empty/redundant chrome from the
  check-in station, especially at 320px.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Commit the approved artifact bundle before implementation.
- [x] Generate tests from all approved test-case boundaries.
- [x] Implement database, API, provider, Blade, Club, and cron behavior.
- [x] Complete targeted, migration, React, E2E, and repository verification.
- [x] Revise `spec.md`, `srd.md`, and `test-cases.md` for dedicated
      `/admin/check-in`, multi-role selection, and searchable channel selection.
- [x] Human approves the 2026-07-03 artifact revisions.
- [x] Regenerate focused route, navigation, access, and combobox tests from the
      approved cases and confirm the intended red failures.
- [x] Implement the dedicated check-in route and role/channel comboboxes.
- [x] Make Past history prominent and ignore completed provider health across
      URL, API, list, detail, filter, and repair presentation.
- [x] Enforce the 30-minute Discord creation lead time in Create/Duplicate and
      at the server validation boundary.
- [x] Revise the check-in artifacts for Upcoming/Past selection, searchable
      event/member comboboxes, Scanner/Manual tabs, mobile treatment, and
      request-scoped repeat mode.
- [x] Capture intended Validator/API/Blade red failures, then implement and
      regression-test the revised check-in station.
- [x] Inspect the live desktop and 320px check-in layouts and run the complete
      event-management browser suite.
- [x] Revise artifacts for the member dashboard/event-card refresh, unified
      attendance removal, and identified check-in results.
- [x] Generate focused failing API, Validator, and Blade tests for the member UX
      revision before product changes.
- [x] Implement member event projections/dashboard/cards, direct attendance
      removal, and minimal identity in Latest result.
- [x] Inspect desktop/mobile member surfaces and rerun focused/full verification
      plus changed React analysis.
- [x] Capture focused red tests, implement, and visually verify the stacked
      member lists and streamlined mobile check-in layout.
- [x] Repair and regression-test post-migration `db:pull --truncate` behavior.
- [x] Re-run targeted Blade/API tests, React analysis, Playwright, and
      repository verification for the revision.

## Validation / commands

- 2026-07-15 PR-review completion: the full workspace test graph passed 20/20
  tasks: API 169/169, Blade 72/72, Validators 55/55, DB 12/12 (including a live
  PostgreSQL truncate/restore cycle), Cron 7/7, and Club 5/5. Event/API/Blade/DB
  lint, formatting, and typechecks passed. `pnpm db:generate` reported no schema
  drift after migration 0012. Changed React analysis passed every changed
  feature component and reported only its two unchanged, known `trpc/react.tsx`
  parser failures because it compares against unrelated `origin/main`.
- The post-migration browser run passed 60/61 and exposed one stale accessible
  option-name assertion after event dates were added to the combobox. After
  correcting that assertion, the focused Event Management suite passed 11/11.

- 2026-07-15 layout-refinement completion: focused Blade layout tests passed
  8/8 and the complete Blade unit suite passed 69/69. The Event Management
  Playwright file passed 11/11; desktop and 320px member dashboard/events plus
  320px check-in screenshots were inspected, with no horizontal overflow.
  Blade TypeScript, ESLint, Prettier, and changed React analysis against
  `reforge/main` passed; React analysis covered 34 files and 21 components with
  zero failures. The previously stale onboarding combobox locator was updated
  for the shared combobox trigger and its full Playwright file passed 13/13.
- 2026-07-15 member-events UX red checkpoint: the focused Validator run failed
  only because removal still accepted/defaulted estimate acknowledgement; API
  failed only for missing safe member/event projections, missing check-in
  identity, and the old estimate-removal gate; Blade failed only for the old
  placeholder/event cards, estimate warning UI, and missing identified result
  component. Unaffected focused assertions remained green.
- 2026-07-15 check-in-station red checkpoint: focused Validators failed only
  because `allowRepeat` was absent; API failed only because Past choices still
  required a second search, Upcoming still used the newer ongoing/ascending
  order, and repeat requests remained idempotent; Blade failed only because
  the timing control, combobox/tabs, and repeat setting were absent.
- 2026-07-15 check-in-station completion: Validators passed 55/55, API passed
  166/166, Blade passed 68/68, and UI exited cleanly with no test files. The
  complete Event Management Playwright file passed 10/10, including desktop
  event/member combobox behavior, Manual idempotency, Past selection, Legacy
  ordering, and a 320px overflow assertion. Validators/API/UI/Blade TypeScript,
  ESLint, and Prettier passed. Changed React analysis against `reforge/main`
  covered 32 files and 19 components with zero failures. Live desktop and
  320x780 captures were inspected; both preserve clear hierarchy and the mobile
  surface is edge-to-edge without horizontal overflow.

- 2026-07-15 history/lead-time red checkpoint: focused Validators, API, and
  Blade runs failed only for the planned 30-minute boundary, Past health
  predicate, persistent timing control, completed detail presentation, and
  deliberately missing form helper.
- 2026-07-15 completed revision: Validators passed 55/55, API passed 165/165,
  and Blade passed 68/68. The full Event Management Playwright file passed 9/9,
  including a completed non-Legacy fixture with stale provider errors and a
  hand-authored Past URL carrying a health filter. Validators/API/Blade
  TypeScript, ESLint, and Prettier passed; changed React analysis against
  `reforge/main` covered 32 files and 19 components with zero failures.
- 2026-07-03 artifact revision: no tests or product implementation were run or
  changed before human approval, by design.
- Local restore diagnostic: `knight_hacks_event=0`,
  `knight_hacks_event_tag=0`, and `knight_hacks_event_attendee=1061`, with all
  attendance rows orphaned from missing Event rows after
  `db:pull --truncate` against the post-0011 schema.
- 2026-07-03 local recovery: the restored database carried one foreign Drizzle
  ledger row newer than checked-in migrations 0010/0011 while its sequence
  still pointed at ID 10. Drizzle therefore skipped both migrations and had
  previously collided on ID 11. After an exact guarded removal of that row and
  sequence normalization, repo-pinned pnpm 9.12.1 applied 0010 and 0011
  successfully. Verification found 17 EventTag rows, 215 migrated Legacy
  events, 1,061 backfilled attendance rows, both dues columns, and ledger IDs
  11/12 with the checked-in hashes. The reusable `db:pull --truncate` repair
  remains open so a later production pull cannot recreate the mismatch.
- Startup TypeScript repair: repo-pinned pnpm 9.12.1 passed
  `@forge/utils` typecheck, ESLint, Prettier, and `git diff --check` after
  replacing the widened permission-key lookup with explicit permission-index
  iteration.
- 2026-07-03 revision test-first checkpoint: four focused Blade files produced
  the intended failures for the missing `/admin/check-in` client, distinct
  navigation destination, removal of `view=check-in` URL state, and removal of
  the management-dashboard Check-in tab. Ten unaffected assertions remained
  green.
- Revision component checkpoint: all 20 Blade Vitest files passed (62/62),
  including route, navigation, URL-state, management-dashboard, isolated
  check-in-page, and independent active-route coverage.
- Revision API/permission checkpoint: 4 focused API files passed 33/33. Blade,
  API, Utils, and UI TypeScript passed; Blade, API, and UI ESLint passed.
- Revision Playwright checkpoint: the complete Event Management file passed
  8/8, including direct route isolation, minimal idempotent check-in, searchable
  multi-role selection with removal, keyboard channel selection, and explicit
  manual-channel fallback. The enhanced combobox flow passed again after its
  final keyboard/removal assertions.
- Targeted React analysis covered 29 files and 29 components across Event,
  member navigation, role permission consumers, the new Check-in route, and
  the shared responsive combobox with zero failures.
- `git diff --check` passed after the revision implementation.

- Pre-generation baseline with repo-pinned pnpm 9.12.1: Validators 30/30,
  API 83/83, and Blade 32/32 tests passed. Club had no tests and exited cleanly.
  Node emitted the existing non-blocking `module.register()` deprecation for
  Blade/Club Vitest.
- Test-first red checkpoint with repo-pinned pnpm 9.12.1:
  - Validator suite: missing `event-management` module, as expected.
  - API suite: all six event suites stopped at their missing workflow modules,
    as expected.
  - DB suite: migration-discovery assertion failed and four disposable-
    PostgreSQL cases skipped because no loopback `DATABASE_URL` was available.
  - Blade suite: five missing event modules and the event-only shell access
    assertion failed, as expected.
  - Club suite: missing dues badge and missing safe `requiresDues` / `tagColor`
    fields, as expected.
  - Cron suite: missing shared reminder executor, as expected.
- Focused Playwright discovery found four flows; the generator's red run
  reached the intentionally absent `/api/e2e/events` route and received 404.
- Blade event/component checkpoint: 6 files, 16 tests passed.
- Club event contract checkpoint: 2 files, 4 tests passed.
- Cron reminder checkpoint: 1 file, 5 tests passed, including bounded weekday
  windows and Next Week suppression for OPS and Project Launch lab/hours;
  Cron TypeScript passed.
- Event API checkpoint: 7 focused files, 78 tests passed. API TypeScript and
  focused event-source ESLint passed. Coverage includes permission policy,
  public/member/admin discovery, provider orchestration and reconciliation,
  fenced leases, attendance idempotency/correction, role/tag dependencies,
  CSV safety, and reminder selection.
- Disposable PostgreSQL event checkpoint: 8 tests passed against a loopback
  database. The suite applies the full migration chain over production-shaped
  legacy fixtures and exercises the production attendance/workflow adapters,
  concurrent check-in locking, stale lease fencing, accent-tolerant fuzzy
  lookup, public/member visibility, admin compound filtering/count/order/page,
  and calendar-window intersection. DB TypeScript and ESLint passed.
- The live SQL-loader proof exposed and fixed role-array parameter binding in
  member visibility and admin role filters by constructing explicit typed
  PostgreSQL arrays; the final live database and focused API suites are green.
- Blade final consumer checkpoint: 19 files and 58 Vitest cases passed; Blade
  TypeScript, ESLint, and Prettier passed. The focused event Playwright file
  passed all 7 flows, including permission tiers, URL sharing and focus return,
  local draft/edit/duplicate state, provider-specific repair, idempotent
  check-in, member eligibility/history, Discord ambiguity resolution, safe
  deletion, and desktop/320px layouts.
- Desktop and 320px Playwright captures were inspected with animations disabled
  at viewport size. The detail hierarchy is sectioned and opaque at both
  widths, the 320px page has no document overflow, its dialog scrolls
  internally, and its Close target is at least 44px.
- Targeted React analysis covered 11 event/member/Club files and 12 components
  with zero failures. Changed-file analysis covered 12 files and 5 components
  with zero failures.
- Club event consumers passed 4/4 Vitest cases and Prettier. Workspace ESLint
  passed; Club TypeScript still fails only in the pre-existing
  `apps/club/src/app/teams/team-roster.ts` call to the absent `api.guild`
  router; event sources and tests are unaffected.
- Cron passed 7/7 reminder cases plus TypeScript, ESLint, and Prettier,
  including spring-forward/fall-back local-date boundaries.
- Final provider-fencing checkpoint: all 81 focused Event API cases and all
  164 API cases passed. The disposable PostgreSQL migration/runtime suite
  passed 8/8 after the final changes. API TypeScript, ESLint, and Prettier
  remained green.
- Full Blade Playwright passed 57/57. The focused Event file passed 7/7 again
  after the final deletion-serialization change.
- `pnpm db:generate` reported no schema drift after the hand-reviewed 0011
  migration; Drizzle consistency and `git diff --check` passed.
- `pnpm verify:precommit` stops in its default changed-React analysis because
  it compares this Reforge branch with unrelated `origin/main` and includes
  two unchanged analyzer failures in `apps/blade/src/trpc/react.tsx` and
  `legacy/apps/blade/src/trpc/react.tsx`. Running the same analysis against
  the actual branch base, `reforge/main`, covered 12 files / 5 components with
  zero failures; targeted Event analysis covered 11 files / 12 components with
  zero failures.
- `pnpm verify:push` completed workspace formatting and linting, then stopped
  at the pre-existing missing `api.guild` router used by unchanged Club/Guild
  consumers. The same router is absent on `reforge/main`; no Event source is
  implicated.
- The literal `pnpm build` inherits the local `.env` value
  `NODE_ENV=development`, causing the pre-existing Next `_global-error`
  prerender failure in unchanged applications. With `NODE_ENV=production`,
  Blade built successfully with `/admin/events` and `/member/events`, and the
  monorepo completed 15/16 build tasks before stopping only at the same
  pre-existing Club `api.guild` type error.
- Post-handoff DB startup regression: `@forge/db` build and typecheck passed,
  and the disposable migration/runtime suite passed 8/8. Root `pnpm dev`
  progressed beyond DB/API compilation into application startup; the probe was
  then stopped because an existing local dev stack already occupied ports
  3000-3007.
- Club TypeScript reaches the confirmed pre-existing `api.guild` absence in
  `apps/club/src/app/teams/team-roster.ts`; event-specific Club tests remain
  green and the unchanged consumer has no diff from `reforge/main`.
- `pnpm forge:feature event-management "Event Management"`: created the
  feature bundle from repository templates.
- Initial `git status --short --branch` checkpoint confirmed artifact work was
  isolated on `reforge/event-management` before implementation began.
- Production/legacy hash comparison: confirmed exact matches for the event
  router, club event page, club check-in page, and club create-event UI.
- Legacy/current search covered event CRUD, public listing, member/hacker
  attendance, QR/manual check-in, dues and points, feedback forms, Discord and
  Google integrations, reminders/cron consumers, role audiences, schema and
  migration constraints, Club-site consumption, and current admin navigation.
- `./node_modules/.bin/prettier --write .forge/features/event-management/*.md`:
  formatted the artifact bundle. The workspace `pnpm exec prettier` wrapper is
  independently blocked because the desktop pnpm is 11.7.0 while this repo
  declares pnpm `^9.6.0`; the checked-in Prettier binary completed normally.
- `git diff --check`: passed after artifact formatting.
- Artifact-stage independent data/concurrency and integration/access audits
  were green with every reported edge encoded in the SRD and observable test
  cases; the final implementation audit is recorded above.

## Links

- PRs:
- Issues:
- Discord/thread context:
