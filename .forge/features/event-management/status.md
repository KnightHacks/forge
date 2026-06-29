# Event Management Status

Current phase: Implementation

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

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

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Commit the approved artifact bundle before implementation.
- [x] Generate tests from all approved test-case boundaries.
- [ ] Implement database, API, provider, Blade, Club, and cron behavior.
- [ ] Complete targeted, migration, React, E2E, and repository verification.

## Validation / commands

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
- `pnpm forge:feature event-management "Event Management"`: created the
  feature bundle from repository templates.
- `git status --short --branch`: confirmed work is isolated on
  `reforge/event-management` with only the new artifact bundle untracked.
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
- Final independent read-only data/concurrency and integration/access audits:
  artifact-green with every reported edge encoded in the SRD and observable
  test cases.

## Links

- PRs:
- Issues:
- Discord/thread context:
