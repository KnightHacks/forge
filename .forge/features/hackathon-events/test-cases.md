# Hackathon Events Test Cases

Status: Draft after owner approval; awaiting adversarial reconciliation

> This file owns observable proof for Hackathon Events. Test implementation must
> reference these IDs and assert public behavior rather than private helpers.

## Scope

These cases cover hackathon event administration, provider projection,
permissions, whole-hack and ordinary event check-in, points, class/VIP behavior,
first-time snapshots, persistent history, Discord role repair, reminder
delivery, migration compatibility, hacker detail, and responsive navigation.

They explicitly prove that every Club Event consumer remains fenced. They do
not cover leaderboards, judging, feedback, analytics calculations, or the
future hacker dashboard QR surface.

## Test placement plan

- `packages/db/src/tests`: migration/preflight and schema-constraint proof.
- `packages/validators/src/tests`: reusable contract validation.
- `packages/api/src/tests` and `packages/api/src/tests/integration`: access,
  transactions, concurrency, providers, points, history, repair, CSV, and
  audit/API-surface proof.
- `apps/cron/src/tests`: hack reminder selection, payload, delivery leasing,
  retry, and Club reminder regression.
- `apps/blade/src/tests`: route/nav/component state and accessibility behavior.
- `apps/blade/src/tests/e2e`: high-value event editor/check-in workflows and
  desktop/mobile visual proof through deterministic provider fakes.

Expected commands are the targeted package tests, `pnpm analyze:react:changed`,
focused Blade E2E, `pnpm verify:precommit`, `pnpm verify:push`, and `pnpm build`.

## Data and migration

### TC-DB-001: Explicit purpose and one primary event

Setup:

- Create one Club event and one hackathon with ordinary hack events.

Action:

- Create a primary-check-in event, then attempt another primary for the same
  hackathon and primary purpose on the Club event.

Expected observations:

- The first primary succeeds.
- The second primary and Club primary purpose are rejected by durable
  constraints even through a direct database write.
- Ordinary events remain unlimited.

### TC-DB-002: Attendance enforces one hackathon scope

Setup:

- Create two hackathons, one attendee per hackathon, and one event per
  hackathon.

Action:

- Insert attendance using an attendee from one hackathon, an event from the
  other, and either duplicated hackathon ID.

Expected observations:

- The database rejects both cross-hack combinations.
- Matching combinations accept multiple occurrences for one attendee/event.

### TC-DB-003: Delivery ledgers enforce identities

Setup:

- Create one admitted attendee, expected role targets, and one ordinary event.

Action:

- Insert duplicate role-delivery identities and duplicate fifteen-minute
  reminder identities.

Expected observations:

- Duplicate logical role grants for attendee/kind and duplicate event/window
  reminders are rejected.
- Updating a logical grant's current target and a different event are allowed;
  append-only grant attempts preserve old target snapshots.

### TC-MIG-001: Legacy hackathon history is preserved honestly

Setup:

- Use production-shaped Legacy hack events, multiple `Check-in` tags, existing
  HackerEventAttendee rows, checkedin attendees without operator/time, provider
  IDs, and arbitrary classes.

Action:

- Apply the migration and run preflight validation.

Expected observations:

- Every Legacy hack event and attendance row remains present.
- Legacy events backfill to ordinary purpose; none becomes primary by tag.
- Unknown attendance points/time/operator and overall check-in metadata remain
  null and visibly historical.
- The migration sends no provider call, reminder, or Discord role grant.

### TC-MIG-002: First-time backfill does not invent answers

Setup:

- Create users with multiple hack profiles/attendees, profile drift, current
  true/false/null values, checked-in and non-checked-in histories, and tied
  timestamps.

Action:

- Apply the documented deterministic backfill.

Expected observations:

- Only the earliest known checked-in attendance for a currently true person is
  true; later checked-in attendance is false.
- Every unrecoverable row remains null.
- Stable User identity and deterministic tie-breaking are used; no historical
  Hacker row is deleted or globally rewritten.

## Access and scope

### TC-ACC-001: Event and check-in permissions are independent

Setup:

- Create users holding only READ_HACK_EVENT, only EDIT_HACK_EVENT, only
  CHECKIN_HACK_EVENT, and Officer.

Action:

- Visit Hackathon Events and Hackathon Check-in and call their read/mutation
  procedures directly.

Expected observations:

- Reader/editor access reaches Event administration according to its mutation
  tier and receives no DOB-bearing check-in payload.
- Check-in-only access reaches Check-in, history, and role retry but cannot load
  Event administration, CRUD, providers, CSV, or attendance correction.
- Officer reaches both.

### TC-ACC-002: Direct identifiers cannot cross hackathons

Setup:

- Give a permitted caller valid event, attendee, attendance, attempt, class, and
  repair IDs from another hackathon context.

Action:

- Call detail, update, delete, attendance, history, check-in, and repair
  procedures with mixed IDs.

Expected observations:

- Every call fails safely without revealing the foreign record.
- No database or provider state changes.

### TC-ACC-003: Club permission never grants hack-event capability

Setup:

- Give callers each Club event permission without hack-event permissions, and
  vice versa.

Action:

- Call both routers and visit all four navigation destinations.

Expected observations:

- Club-only callers cannot read or mutate hack events.
- Hack-only callers cannot read or mutate Club events.
- Navigation matches the server capabilities.

## Event administration and providers

### TC-EVT-001: Create and publish a hackathon event

Setup:

- Configure a hackathon, active tag, valid provider fakes, role, channel, and an
  authorized editor.

Action:

- Create an ordinary event with points and provider-supported timing.

Expected observations:

- One shared Event row stores the selected hackathon and ordinary purpose.
- Discord and Google projections use the documented public/internal semantics.
- The event becomes healthy/published only after both initial projections
  succeed.
- No Club feedback object or Club audience policy is created.

### TC-EVT-002: Primary event is explicit

Setup:

- Create ordinary events with tag/name variants including `Check-in`.

Action:

- Designate one event through the purpose control and attempt conflicting
  creates/updates.

Expected observations:

- Text never changes purpose.
- One explicit primary is allowed; conflicts return a safe conflict state.

### TC-EVT-003: Provider failure and repair preserve scope

Setup:

- Make one provider create/update succeed and the other fail or become
  ambiguous.

Action:

- Create/update, inspect health, then retry/repair through reviewed candidates.

Expected observations:

- Partial state is durable and admin-only.
- Repair does not duplicate the successful projection.
- Every reload and reconciliation remains tied to the requested hackathon.

### TC-EVT-004: Internal destination matches Club provider semantics

### TC-EVT-005: Tag authority is scoped

Setup:

- Create one Club tag and same-named tags in two hackathons.

Action:

- List, update, archive, and attach tags as a hack editor in one hackathon.

Expected observations:

- The caller sees and mutates only the selected hackathon's tags.
- Club and other-hack tags remain unchanged and cannot be attached by ID.

Setup:

- Supply eligible voice/stage channels and configured public/internal Google
  calendars.

Action:

- Create and change a hack event between external and internal modes.

Expected observations:

- External uses Discord External plus public Google.
- Internal uses the selected voice/stage entity plus internal Google.
- Replacement removes/reconciles the previous destination safely.

### TC-EVT-005: Attendance protects event deletion

Setup:

- Create an empty event, an ordinary event with attendance, and a primary with
  admission attendance.

Action:

- Delete each through the editor flow.

Expected observations:

- Empty deletion follows provider-safe confirmation.
- Events with either attendance type cannot be deleted.

## Primary check-in

### TC-PRI-001: Confirmed applicant completes primary admission

Setup:

- Configure a primary event, general role, normal classes, optional VIP, and a
  Confirmed attendee with DOB and linked Discord identity.

Action:

- Check in through scanner and repeat with an equivalent Manual fixture.

Expected observations:

- The first accepted attempt changes status to checkedin and records one
  timestamp/operator/class/attendance/point award.
- The attendee receives one least-populated class plus general/class/VIP role
  targets as applicable.
- The compact result contains class/color, VIP, name, DOB, and minor state
  without points, first-time status, recorded time, operator, raw QR, or provider
  details.

### TC-PRI-002: Only Confirmed may enter

Setup:

- Create Pending, Accepted, Waitlisted, Denied, Withdrawn, and Confirmed
  attendees.

Action:

- Attempt first primary admission for each.

Expected observations:

- Confirmed succeeds.
- Every other status receives a distinct wrong-status result and no status,
  class, attendance, points, first-time bridge, or role change.

### TC-PRI-003: Concurrent stations balance classes safely

Setup:

- Create uneven classes and many Confirmed attendees. Hold two or more primary
  transactions at the allocation boundary.

Action:

- Release concurrent admissions.

Expected observations:

- Each attendee receives one normal class.
- Each decision sees committed current counts under the per-hack allocation
  lock; no stale-count burst chooses one class.
- Ties resolve deterministically and no attendee receives duplicate points.

### TC-PRI-004: Primary rescan is idempotent

Setup:

- Admit one attendee successfully, including a partial Discord role failure.

Action:

- Rescan at another station and use Manual lookup.

Expected observations:

- Original status, timestamp, operator, class, attendance, points, and
  first-time snapshot remain unchanged.
- The result returns the existing facts and current role health.
- No repeat attendance is created for primary purpose.

### TC-PRI-005: Configuration readiness blocks unsafe admission

Setup:

- Omit the general role, all normal classes, one selected class role, or the VIP
  entry for a VIP attendee.

Action:

- Load station readiness and attempt primary admission.

Expected observations:

- Administration names the missing configuration.
- The relevant attempt is rejected before status/points/attendance mutation.
- Non-VIP admission does not require a VIP entry when no VIP grant is expected.

### TC-PRI-006: Minor calculation uses check-in time

Setup:

- Create DOBs exactly before, on, and after the 18th birthday boundary around
  midnight and DST in America/New_York.

Action:

- Check in at fixed instants.

Expected observations:

- `minorAtCheckIn` matches the local calendar boundary.
- The persistent dialog uses unmistakable non-motion-only warning treatment for
  minors and does not cancel admission.
- Attempt history stores the boolean, not a DOB copy.

### TC-PRI-007: Role failure preserves admission and supports repair

Setup:

- Make general succeed, class fail, and VIP rate-limit after transaction commit.

Action:

- Admit, inspect history, change one configured role, and retry as a check-in
  operator.

Expected observations:

- Admission remains successful with `Roles need attention`.
- Each target has durable state and safe error information.
- Retry uses current expected configuration, supersedes obsolete failed target,
  and never duplicates a successful grant.

## Ordinary event attendance

### TC-ATT-001: Called class, All, and VIP gates

Setup:

- Create checked-in hackers from several classes plus VIP and non-admitted
  attendees.

Action:

- Operate one class, then All classes, and scan each hacker.

Expected observations:

- Matching class and VIP succeed under one-class mode.
- Other classes receive wrong-class without attendance/points.
- All admits every already-admitted hacker.
- Not-yet-admitted hackers remain refused in every station mode.

### TC-ATT-002: Repeat mode records occurrences but awards once

Setup:

- Choose an ordinary event with nonzero points and an admitted hacker.

Action:

- Scan once, rescan with repeat off, enable repeat, remove/re-present the QR,
  and scan again.

Expected observations:

- First occurrence snapshots Event points.
- Repeat-off reports already attended and inserts nothing.
- Repeat-on inserts a separate zero-point occurrence.
- Aggregate hacker points increase once.

### TC-ATT-003: Concurrent first scans award once

Setup:

- Two stations concurrently scan the same first-time attendee/event, with one
  station allowing repeats.

Action:

- Release both database operations together.

Expected observations:

- Exactly one occurrence has the Event point award.
- Any accepted second occurrence has zero; otherwise it is already attended.
- Aggregate points equal one Event award.

### TC-ATT-004: Manual check-in is always idempotent

Setup:

- Select an already-attended hacker while station scanner repeat is enabled.

Action:

- Submit Manual check-in twice.

Expected observations:

- Manual creates no repeat occurrence and awards no additional points.
- Selecting a search result alone performs no mutation.

### TC-ATT-005: Ordinary attendance correction reverses exact points

Setup:

- Create a first occurrence with points, a zero-point repeat, and a Legacy row
  with unknown award.

Action:

- Remove the first while its repeat remains, then remove the repeat and first;
  separately attempt to remove the Legacy row.

Expected observations:

- Removing the point-bearing first while an active repeat remains is refused.
- Removing repeat changes no points; removing the now-sole first soft-voids it
  and subtracts its stored award once.
- Unknown Legacy award remains blocked and unchanged.
- Primary attendance cannot use this removal flow.

## First-time hacker compatibility

### TC-FIRST-001: Per-hack snapshot wins over mutable profile

Setup:

- One hacker has attendee snapshots true, false, and null across three hacks;
  mutate the reusable profile between reads.

Action:

- Load roster rows, detail, filter counts, and check-in result for each hack.

Expected observations:

- True/false attendee snapshots never change with profile edits.
- During the bridge only null may use documented profile fallback.
- After fallback removal null is Unknown, never Returning.

### TC-FIRST-002: Primary bridge snapshots once and flips only current profile

Setup:

- Create a pre-cutover Confirmed attendee with null snapshot, current profile
  true, and older Hacker rows for the same User.

Action:

- Admit, rescan, and inspect all rows.

Expected observations:

- The attendee freezes true once.
- Only the linked/current profile becomes false; older rows remain untouched.
- Rescan does not alter the snapshot or profile again.
- Roster/detail still report First-time from attendee precedence.

### TC-FIRST-003: First-time UI and filter keep Unknown distinct

Setup:

- Load first, returning, and unknown attendee statuses.

Action:

- Inspect roster badge/detail/check-in and apply each filter choice.

Expected observations:

- First receives the prominent badge.
- Returning is explicit in detail without a misleading first-time badge.
- Unknown reads Not recorded and is selected only by Unknown.
- Filter URL state round-trips all three values.

## History and data hygiene

### TC-HIST-001: Dialog persists and history reopens exact result

Setup:

- Produce successful, rejected, wrong-class, minor, and role-error attempts.

Action:

- Close each dialog manually, refresh or use another permitted station, open
  shared history, and select the attempt.

Expected observations:

- Dialog never auto-dismisses.
- History is newest first and reopens the compact stored outcome/class/VIP/
  identity/minor result without replaying check-in.
- Keyboard close returns focus to the operating control.

### TC-HIST-002: History access minimizes PII

Setup:

- Create readers, check-in operators, and unauthorized callers plus malformed
  and resolved attempts.

Action:

- Query history and inspect persistence/logging.

Expected observations:

- Check-in permission receives DOB only for resolved permitted rows; readers do
  not.
- No raw QR, DOB snapshot, email, phone, Discord handle, provider payload, or
  secret is stored in attempt history or audit.
- Unauthorized callers receive no existence signal.

### TC-HIST-003: Rejected attempts expire after 30 days

Setup:

- Create old/recent rejected attempts and old/recent successful attendance
  attempts.

Action:

- Run bounded cleanup repeatedly and concurrently.

Expected observations:

- Rejected attempts older than 30 days are removed once.
- Recent rejected and all successful operational/audit rows remain.
- Cleanup cannot delete attendance or role-grant history.

## Reminders

### TC-REM-001: Club and hack reminder selectors remain disjoint

Setup:

- Create eligible Club, ordinary hack, primary hack, Legacy hack, unhealthy,
  deletion-pending, ended, and future-window events.

Action:

- Run both candidate selectors at a fixed clock.

Expected observations:

- Club selector returns no hackathon event.
- Hack selector returns only healthy published ordinary hack events within the
  fifteen-minute window.
- Primary and Legacy hack events never produce hack reminders.

### TC-REM-002: Reminder uses configured channel and hacker role

Setup:

- Configure two hackathons with different channels and general roles.

Action:

- Deliver one eligible event for each through a fake Discord bot.

Expected observations:

- Each message goes to its hackathon's channel and mentions only its general
  role.
- Copy links the matching scheduled event and includes time/location.
- No webhook URL, @everyone, Club reminder role, or year constant is used.

### TC-REM-003: Delivery is deduplicated and repairable

Setup:

- Run concurrent cron replicas, restart after acquisition, and inject a Discord
  failure followed by success.

Action:

- Execute the reminder planner repeatedly before and after Event edits.

Expected observations:

- At most one sent message exists for event/fifteen-minute window.
- Lease expiry permits safe retry of unfinished/error state.
- Editing the event does not create a second reminder identity.

## Blade navigation and operations

### TC-UI-001: Separate navigation entries and scrollable rail

Setup:

- Render every permission combination and enough admin entries to exceed a
  short desktop viewport.

Action:

- Navigate by keyboard, mouse, and mobile drawer.

Expected observations:

- Hackathon Events and Hackathon Check-in use distinct icons and independent
  visibility.
- Desktop primary items scroll while Settings stays reachable.
- Mobile retains scroll, focus management, active state, and touch targets.

### TC-UI-002: Check-in station controls follow event purpose

Setup:

- Load primary and ordinary events with arbitrary classes.

Action:

- Switch events, called class, Scanner/Manual, and repeat mode.

Expected observations:

- Primary hides/disables called-class and repeat controls because assignment is
  automatic.
- Ordinary exposes configured classes plus All; repeat appears only for Scanner
  and resets off on reload.
- Changing station state does not edit Event configuration or prior attempts.

### TC-UI-003: Hacker detail shows hack-scoped event history

Setup:

- Give one Hacker attendances across Club, two hackathons, repeats, primary, and
  Legacy unknown rows.

Action:

- Open the selected attendee's lazy hacker detail dialog.

Expected observations:

- The panel shows only the selected hackathon's primary/ordinary occurrences.
- Repeat rows and zero points remain separate.
- Unknown Legacy time/operator/points are omitted or labeled honestly.
- Club and other-hack rows never appear.

### TC-E2E-001: Officer event and provider workflow

Setup:

- Use deterministic Discord/Google fakes and an officer session.

Action:

- Create ordinary and primary events, inspect list/calendar/detail, inject a
  partial failure, repair it, and test deletion constraints.

Expected observations:

- The approved event/provider states and one-primary rule are visible end to
  end without affecting Club pages.

### TC-E2E-002: Volunteer primary and ordinary check-in workflow

Setup:

- Use a CHECKIN_HACK_EVENT-only session, configured classes/VIP, confirmed and
  admitted hackers, and provider-role fakes.

Action:

- Admit a minor first-timer, reopen history, operate one class then All, enable
  repeat, use Manual fallback, and retry a role failure.

Expected observations:

- The volunteer completes every approved workflow and cannot enter Event
  administration.
- Results remain persistent, accessible, and point-idempotent.

### TC-E2E-003: Desktop and 320px operational QA

Setup:

- Render event administration, check-in, dialog, history, hacker detail, and a
  long navigation rail with deterministic fixtures.

Action:

- Capture desktop and 320px screenshots and run keyboard/focus checks.

Expected observations:

- No document-level horizontal overflow, clipped result, inaccessible action,
  hidden nav destination, or auto-dismissed dialog occurs.
- Minor/error/role-health states remain distinguishable without color or
  animation alone.

## Negative / regression cases

### TC-NEG-001: Client cannot supply scope, points, class assignment, or roles

Setup:

- Craft requests with another hackathon ID, inflated/negative points, chosen
  class, VIP, status, operator, and Discord role IDs.

Action:

- Submit through check-in contracts or bypass client validation.

Expected observations:

- Validators reject unsupported fields where applicable; the API derives all
  authoritative values and changes nothing on mismatch.

### TC-NEG-002: Checked-in status cannot be moved through hacker management

Setup:

- Create an admitted attendee with primary attendance, class, points, and role
  state.

Action:

- Use single and bulk hacker-management status transitions toward every
  non-checkedin status.

Expected observations:

- Every transition is refused because this slice has no primary undo.
- Check-in metadata, attendance, points, class, and roles remain consistent.

### TC-NEG-003: QR payload and camera repetition are safe

Setup:

- Provide malformed, unknown, raw UUID, `user:<UUID>`, and stationary camera
  payloads.

Action:

- Scan through the browser and inspect history/logs.

Expected observations:

- Supported forms resolve; malformed/unknown receive safe results.
- One visible stationary QR cannot loop accepted attempts until it leaves the
  frame.
- Raw payloads are absent from persistence and logs.

### TC-NEG-004: Provider and Discord failures expose no secrets

Setup:

- Inject errors containing raw Discord/Google responses, IDs, credentials, and
  stack traces.

Action:

- Create/repair events, grant roles, deliver reminders, and inspect UI/API/audit.

Expected observations:

- Users receive centralized safe errors and actionable health state.
- Secrets/raw payloads remain server-log-only with sensitive values redacted.

### TC-REM-005: Ambiguous reminder delivery is not duplicated

Setup:

- Let Discord accept a reminder while the caller observes a network/5xx-style
  ambiguous outcome.

Action:

- Run the cron again from multiple replicas before the event starts.

Expected observations:

- The durable delivery becomes `unknown`.
- No automatic retry sends a second ping; an officer can inspect the unresolved
  state without provider response bodies or secrets.

### TC-REG-001: Every Club consumer still excludes hack events

Setup:

- Create published healthy hack events that otherwise match every Club query,
  reminder, check-in, feedback, analytics, Issues, and member/public filter.

Action:

- Call each Club consumer and direct-ID procedure.

Expected observations:

- No hack event appears or mutates through Club code.
- Existing Club Event tests and reminder cadence remain unchanged.

## Open questions

- None. Adversarial review findings are incorporated before this document is
  marked approved and before implementation tests are generated.
