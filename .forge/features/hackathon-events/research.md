# Hackathon Events Discovery

Status: Evidence complete; product decisions proposed for owner review

Date: 2026-08-05

This is supplemental research, not an approved product or technical spec. It
uses the historical Spec Miner method to separate observed behavior, inferred
needs, and proposed Reforge behavior. Approved product decisions move into
`spec.md`; technical decisions move into `srd.md`; observable proof moves into
`test-cases.md`.

## Analysis boundary

Included:

- Legacy hackathon event CRUD, scanner/manual check-in, points, class gates,
  VIP bypass, Discord roles, and the operator result overlay.
- Current Reforge event management, hackathon configuration, hacker management,
  permissions, schema, API, validators, tests, and Blade UI seams.
- Security, concurrency, data integrity, privacy, external-side-effect, and
  mixed-version compatibility concerns.

Excluded for this intake pass:

- Judging, applications, hacker-facing dashboard SDK, hackathon analytics, and
  class leaderboards unless the owner deliberately adds them to this slice.
- Implementation and migrations. Schema or integration changes require an
  approved spec/SRD first.

## Executive finding

Reforge already has the right shared entity and most of the configuration, but
it intentionally walls hackathon events off from Club behavior.

- `Event.hackathonId` already distinguishes a hackathon event from a Club event.
- `HackerAttendee` already owns per-hackathon status, points, `classId`, and an
  orthogonal `isVip` flag.
- `HackathonClass` already supports any configured number of classes and one
  VIP entry, each with a Discord role and color.
- The current event API, validators, queries, access helpers, attendance service,
  and UI serve Club members only and explicitly reject hackathon event IDs.
- `HackerEventAttendee` remains a bare legacy junction with no timestamp,
  operator, point snapshot, indexes, correction path, or audit provenance.

The safest direction is to reuse the shared Event model and the proven event
workflow concepts while keeping separate hackathon-scoped API contracts and
access checks. Broadly removing the Club filters would leak hackathon events
into Club discovery, reminders, feedback, analytics, and issue workflows.

## Observed Legacy behavior

### OBS-LEG-001: Overall check-in was a magic-tagged event

Legacy did not model whole-hack admission separately. An ordinary hackathon
Event whose tag was exactly `Check-in` triggered the whole-hack workflow.

When a confirmed hacker scanned that event, Legacy:

1. changed `HackerAttendee.status` to `checkedin`;
2. assigned a least-populated class;
3. attempted the general hackathon Discord role and class role;
4. inserted `HackerEventAttendee` for the selected event;
5. incremented `HackerAttendee.points` by the event's points; and
6. returned special ID/lanyard instructions to the scanner.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:606-778`.

### OBS-LEG-002: Ordinary hackathon events required whole-hack admission

Only `confirmed` or `checkedin` attendees could enter the workflow. A non-primary
event rejected a hacker until their hackathon status was `checkedin`.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:612-625`.

### OBS-LEG-003: Class lanes and VIP were operational check-in inputs

Each scanner/manual station selected `All` or one class. The server rejected a
hacker assigned to another class, while a VIP bypassed the class gate.

Evidence:
`legacy/apps/blade/src/app/_components/shared/scanner.tsx:185-215`,
`legacy/packages/api/src/routers/hackers/mutations.ts:715-727`.

### OBS-LEG-004: The result overlay forced organizers to acknowledge a scan

The scanner opened a full-screen persistent result showing first name, last
name, colorized class, and an instruction/error block. Overall check-in told the
operator to check ID and send the hacker to the correct lanyard area; ordinary
events told the operator to check the badge and direct the hacker to the event.

Evidence:
`legacy/apps/blade/src/app/_components/shared/scanner.tsx:318-363`,
`legacy/packages/api/src/routers/hackers/mutations.ts:760-793`.

### OBS-LEG-005: Discord writes were best-effort and untracked

Legacy committed the database transition before attempting Discord roles. A
missing Discord identity or failed role call produced a log but did not reverse
check-in, persist a repair state, or offer an operator retry.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:675-713`.

## Legacy defects not to preserve

### DEF-LEG-001: The client chose points and hackathon identity

The mutation accepted `eventPoints` and `hackathonId` from the browser even
though both are server-owned facts. It resolved the attendee from the Event's
hackathon but used the client hackathon ID during class counting and updates.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:523-544,549-595,636-669`.

Reforge must derive hackathon, points, class configuration, and attendee scope
from the selected Event on the server.

### DEF-LEG-002: Repeat scans repeatedly awarded points

Allowing a repeat inserted another attendance row and added the full point value
again. Current Club attendance already has the safer rule: preserve a repeat
record when allowed, but award zero additional points after the first record.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:730-758`,
`packages/api/src/utils/events/attendance.ts:157-180`.

### DEF-LEG-003: Class assignment was neither safe nor data-driven

Legacy counted six hardcoded classes and chose randomly among the smallest. It
did not serialize concurrent assignments, so many simultaneous scans could all
choose the same class. It also compared a stale pre-assignment class value when
enforcing the selected lane.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:628-673,715-727`.

### DEF-LEG-004: VIP truth came from a live Discord lookup

Legacy asked Discord whether the user was VIP during every scan. Reforge already
stores `HackerAttendee.isVip`, making the per-hackathon participation row the
stable source of truth.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:606-610`,
`packages/db/src/schemas/knight-hacks.ts:676-706`.

### DEF-LEG-005: A tag name carried lifecycle meaning

Renaming the `Check-in` tag would silently disable overall admission behavior.
A free-form label must not decide whether the attendee enters the hackathon.

Evidence:
`legacy/packages/api/src/routers/hackers/mutations.ts:621-628,760-778`.

## Current Reforge evidence

### OBS-CUR-001: Club and hackathon event permissions already differ

`READ_HACK_EVENT`, `EDIT_HACK_EVENT`, and `CHECKIN_HACK_EVENT` already exist;
the check-in permission explicitly includes primary check-in. They are not wired
into current routes, navigation, or API helpers.

Evidence:
`packages/consts/src/permissions.ts:28-77`,
`apps/blade/src/lib/admin-access.ts:29-40,71-77,93-95`.

### OBS-CUR-002: Club event isolation is deliberate and load-bearing

The current event-management spec excludes hackathon events. API access and
queries reject or filter every non-null `Event.hackathonId`; creation hardcodes
`hackathonId: null`.

Evidence:
`.forge/features/event-management/spec.md:33-34,321-324,355-361`,
`packages/api/src/utils/events/access.ts:7-28`,
`packages/api/src/utils/events/queries.ts:85,112,161,209,291,561,609,656`,
`packages/api/src/routers/event.ts:719-840`.

### OBS-CUR-003: Event is shared, but its strongest invariants are Club-only

Event already owns schedule, content, tag/color, points, Discord/Google
projection, revision, publication, and repair state. Current database checks
exempt rows with a non-null `hackathonId` from the new-event points and creation
identity guarantees.

Evidence:
`packages/db/src/schemas/knight-hacks.ts:478-578`.

### OBS-CUR-004: Configurable N classes plus VIP already landed

The approved direction is any number of classes per hackathon. Six is a likely
real-world configuration, not a schema rule. VIP is held in addition to a normal
class and bypasses class boundaries. Class assignment and live Discord role
application were explicitly deferred to this event/check-in slice.

Evidence:
`.forge/features/hackathon-configuration/spec.md:97-134,179-197`,
`packages/db/src/schemas/knight-hacks.ts:124-184,676-706`.

### OBS-CUR-005: Overall check-in state is incomplete

`checkedin` exists as a HackerAttendee status and cannot be set from hacker
management, but the row has no whole-hack check-in timestamp, operator, identity
verification, or Discord-delivery health. No current API writes `classId`,
`isVip`, or `HackerEventAttendee`.

Evidence:
`packages/validators/src/hackers.ts:7-16`,
`packages/db/src/schemas/knight-hacks.ts:676-706,819-842`.

### OBS-CUR-006: Hacker attendance lacks the Club ledger guarantees

`EventAttendee` records check-in time, operator, point snapshot, and indexes.
`HackerEventAttendee` stores only IDs, duplicates `hackathonId`, and has no
constraint proving that its event and attendee belong to that hackathon.

Evidence:
`packages/db/src/schemas/knight-hacks.ts:638-669,819-842`.

### OBS-CUR-007: Hacker-only QR display remains blocked

Current scanner parsing accepts raw account UUIDs and transitional `user:`
payloads, but QR generation requires a Member profile. A hacker who is not also
a Club member cannot display their check-in code.

Evidence:
`packages/api/src/utils/events/attendance.ts:74-81`,
`packages/api/src/routers/qr.ts:12-35`.

### OBS-CUR-008: There is no configured overall hackathon Discord role

Class and VIP Discord role IDs are configured per hackathon. Legacy also granted
one general hackathon attendee role, but current Hackathon configuration has no
field for it. The global `vip_role` config is inert and should not replace the
per-hackathon VIP row.

Evidence:
`packages/db/src/schemas/knight-hacks.ts:124-184`,
`packages/consts/src/discord.ts:25-86`,
`legacy/packages/api/src/routers/hackers/mutations.ts:683-699`.

## Proposed product shape for review

These are proposals, not decisions.

### PROP-001: A hackathon Event is a scoped superset of a Club Event

Reuse `Event`, its event details, scheduling, tags, points, provider projection,
repair, attendance viewing, export, and correction concepts. Keep the Club API
fence and add explicit hackathon-scoped contracts/adapters rather than making
Club queries accept every Event.

Hackathon-specific differences:

- the attendee is `HackerAttendee`, not Member;
- points accrue to that attendee's per-hackathon ledger;
- dues and Club-role audiences do not apply;
- ordinary event entry requires overall hackathon admission;
- a class lane may restrict a station, with VIP bypass; and
- one designated event kind may perform primary hackathon admission.

Feedback, Club discovery, Club reminders, Issues integration, and Club analytics
should stay excluded unless named explicitly. Their current assumptions are not
safe consequences of sharing the Event table.

### PROP-002: Designate a primary-check-in event explicitly

Add an explicit hackathon event kind such as `event` versus
`primary_check_in`, with at most one primary check-in event per hackathon.
Never infer it from tag or title.

The primary item still behaves like an event for point value and attendance,
but its transaction also records first-class overall admission on
`HackerAttendee`: status, check-in time/operator, and class assignment. This
hybrid keeps the user's requested event superset while preserving the important
fact that a person has entered the whole hackathon, not merely one session.

### PROP-003: Assign one configured class plus optional VIP

At first primary check-in, serialize allocation for that hackathon, choose one
of the currently smallest configured classes, persist it, and use the persisted
result for the response. Six configured class rows means six choices; it does
not mean granting six class roles to one hacker.

VIP remains an independent boolean. A VIP still receives a normal class, gets
the VIP treatment in the result, and bypasses later class-lane gates.

If no classes exist, check-in should still succeed with no class role. The owner
must decide whether the UI merely warns or blocks primary check-in for an event
that operationally expected classes.

### PROP-004: Track Discord delivery and make it repairable

Commit physical check-in first; Discord is an external side effect and must stay
outside the transaction. Attempt these configured roles:

- a per-hackathon general attendee role, if the owner wants one;
- the assigned class role; and
- the VIP role when `isVip` is true.

A role failure should not tell the person they were refused entry. The result
must say `Checked in; Discord roles need repair`, persist enough status for an
authorized retry, and expose a retry/repair action. Undo policy must say whether
roles are revoked or left for an officer to repair.

### PROP-005: Distinguish the two operator feedback modes

For ordinary hackathon events, reuse the current non-blocking Latest result
panel so the scanner remains high-throughput.

For primary check-in, use an interruptive, viewport-safe result dialog because
the operator must complete physical work before scanning the next person. It
should show:

- an unmistakable success, already-entered, ineligible, wrong-lane, or
  role-repair state;
- full applicant name for ID comparison;
- the minimum additional ID fact the owner approves, likely date of birth or an
  under-18 indicator;
- class name and configured color, VIP, and the selected lane/group result;
- direct instruction such as `Verify photo ID`, `Give the VIP lanyard`, and
  `Send to the <class> line`; and
- Discord role health as an operator-facing warning, not a raw provider error.

A Discord avatar is not identity proof and should not be presented as such.
Whether the operator's verification itself is persisted needs a deliberate
privacy and retention decision.

### PROP-006: Award points once per event

All points are derived from the Event on the server. First attendance awards the
event snapshot. An authorized repeat may create another operational attendance
row with zero points. Removal reverses exactly the stored snapshot and is
audited, following the current Club model.

Primary re-scan returns the existing assignment and directions without changing
status, class, or points. A separate repair action handles missing Discord
roles.

## Likely technical ownership after product approval

- `@forge/db`: explicit event kind or primary link, whole-hack check-in metadata,
  richer hacker attendance ledger/integrity/indexes, optional role-delivery
  state, migration and compatibility constraints.
- `@forge/validators`: hackathon event CRUD, check-in modes, class lane, VIP,
  result DTO, attendance correction, and audit contracts.
- `@forge/api`: hack-event access helpers, scoped event adapters, transactional
  class assignment/attendance/points, Discord grant and repair workflow, audit.
- Blade: server-gated events/check-in entry points, scanner/manual workspace,
  result panel/dialog, attendance/export/correction UI.
- Role management: unchanged. Hackathon class/VIP roles are Discord logistics
  roles, not Blade permission roles.

## Reverse-prompt decisions

1. Is the proposed hybrid right: one explicitly designated primary-check-in
   Event that also writes first-class whole-hack state? Or should whole-hack
   admission have no Event row at all?
2. Does "superset" include Discord and Google projection, tag management,
   provider repair, attendance export, and correction? The proposal includes
   those, but keeps feedback, Club discovery/reminders/analytics, and Issues out.
3. Do events themselves declare allowed classes, or does each check-in station
   select `Any class`/one class at runtime as Legacy did? Does VIP always bypass?
4. Confirm that six is current configuration, while the product continues to
   support any configured number of classes.
5. Who marks a hacker VIP, and may that change at the primary check-in desk?
6. Should every admitted hacker receive a configured general hackathon Discord
   role in addition to one class role and, where applicable, VIP?
7. If Discord fails, is `checked in; roles need repair` the correct outcome?
   Who may retry, and should undo revoke roles?
8. What must an organizer compare against photo ID: full name only, name plus
   date of birth, or name plus an under-18 indicator? Should verification be
   stored and audited, or should Blade only display the cue?
9. Are repeat attendance rows useful for every event, only selected events, or
   never? The proposal awards points once regardless.
10. Can overall hackathon admission be undone? If yes, what happens to ordinary
    event attendance, points, class assignment, status, and Discord roles?
11. Should hacker-only users receive the same account QR immediately in the
    hackathon app/SDK, or does this Blade feature also need a hacker QR surface?
12. Are class points/leaderboards part of this slice, or should this slice only
    create the trustworthy ledger they will consume later?

## Owner resolutions and follow-up trace, 2026-08-05

The owner resolved the core product direction after the original reverse prompt:

- primary admission is explicit and never inferred from the Legacy `Check-in`
  tag;
- only Confirmed applicants move to Checked in, with timestamp, operator,
  class, attendance, and points recorded;
- classes remain an arbitrary per-hackathon configuration rather than a fixed
  six, and assignment uses current least-populated counts;
- the admission role set is the configured general hacker role, assigned class
  role, and VIP role when the pre-existing VIP flag applies;
- ordinary scanner stations choose one current class or All classes and may
  change that choice while operating; explicit repeat mode records no points
  after the first attendance;
- results do not auto-dismiss, operators can reopen history, and full name plus
  date of birth drive a prominent under-18 warning and physical routing;
- Discord Scheduled Event, Google Calendar, and reminder behavior belong in
  this slice without weakening the Club-event fence;
- each hackathon needs a configured announcement channel and general role for
  its event reminders; and
- the pending hacker-detail event panel is in scope while leaderboards are not.

These decisions supersede `PROP-005`'s non-blocking ordinary-event panel. The
current product draft uses an operator-dismissed, reopenable result for both
check-in purposes; the primary result carries the additional admission and
routing emphasis.

### Pending hacker-detail panel seam

- The placeholder is in the row-opened hacker detail dialog, not the roster
  table itself: `apps/blade/src/app/_components/admin/hackathon/hackers/hacker-detail-dialog.tsx:699-715`.
- The dialog already lazy-loads one attendee through `api.hacker.get` at
  `hacker-detail-dialog.tsx:89-126`.
- That API currently returns no event attendance, and
  `HackerEventAttendee` still contains only identifiers
  (`packages/db/src/schemas/knight-hacks.ts:819-842`). The completed panel needs
  selected-attendee/selected-hackathon scope, event identity, occurrence time,
  operator, and awarded-points history. Querying by global hacker or user would
  violate the panel's per-hackathon promise.

### Provider and reminder seams

- Discord and Google adapters are scope-neutral in
  `packages/api/src/utils/events/provider-gateways.ts:38-368`.
- Provider leases, revision fencing, ambiguous-result handling, repair, and
  projection state are centralized in
  `packages/api/src/utils/events/orchestration.ts:199-485` and
  `packages/api/src/utils/events/database-state.ts:33-155`.
- The orchestration layer calls `assertClubEvent` throughout, and Club creation
  hard-codes no hackathon plus Club feedback setup. Hack support needs an
  explicit scoped entry path or adapter; deleting those guards is not reuse.
- Club reminder candidate selection rejects hackathon events in
  `packages/api/src/utils/events/reminders.ts:3-90`, with a second query-level
  fence in `packages/api/src/utils/events/queries.ts:106-133`. Those Club
  capabilities remain unchanged.
- `apps/cron/src/crons/reminder.ts:35-78` contains a disabled Legacy-shaped hack
  reminder. It directly queries the database, applies the one-day timestamp
  workaround, hard-codes the guild/role/banner, lacks durable deduplication and
  tests, and is not safe to reactivate. It is evidence for the approximately
  fifteen-minute product behavior only.
- The clean direction is a separate hack-scoped candidate capability and
  delivery path that use the selected hackathon's configured channel and role,
  while sharing provider/date/presentation machinery below the domain fence.

The owner later approved minor routing, shared history, role repair, no primary
undo, readiness gating, a single reminder window, and dashboard-SDK ownership
of hacker QR delivery. Remaining policy centers on primary-event reminders and
the first-time-hacker compatibility bridge below.

### First-time-hacker ownership and compatibility

- `Hacker.isFirstTime` is the only current field
  (`packages/db/src/schemas/knight-hacks.ts:332`). The selected
  `HackerAttendee` has no first-time snapshot today.
- Hacker management currently filters and returns the mutable profile field
  (`packages/api/src/routers/hacker.ts:149-166,502`). Its false filter uses
  `coalesce(..., false)`, and the detail dialog renders null as No, so both
  paths mislabel an unrecorded answer as Returning.
- The Reforge roster has no first-time badge; Legacy showed a prominent badge
  for a true value. Current Reforge filter controls are Either, First-timers,
  and Returning (`hacker-filters.tsx:429-455`).
- Legacy application intake creates a new profile row and attendee but stores
  the answer only on the profile. Repeat application pre-fills the most recent
  profile answer, while the Legacy profile update can rewrite every Hacker row
  for a user. Past per-hack answers are therefore not recoverable with
  confidence.
- `.forge/features/hacker-management/status.md:151-205` already records the
  owner-approved long-term correction: nullable, no-default
  `HackerAttendee.isFirstTime`; self-declared per-hack value written at
  application; profile field retained only through application cutover; no
  inference from Knight Hacks attendance.
- Primary check-in can serve as a temporary bridge before the dashboard SDK
  owns application intake. Under the same attendee lock, it may copy the
  profile value only when the attendee snapshot is null, then change only the
  linked/current profile value from true to false for Legacy's next-application
  prefill. Repeat scans never overwrite the attendee snapshot.
- Every new read must prefer the attendee snapshot over the compatibility
  profile value. A durable API status of `first`, `returning`, or `unknown`
  prevents Blade screens from reimplementing precedence. The final filter must
  keep Unknown separate instead of coalescing it with Returning.
- Application remains the permanent write point because check-in-only capture
  loses no-shows, reads a later mutable value, and would conflate an application
  answer with physical attendance. The dashboard SDK slice should re-ask the
  question for each hackathon and write the attendee snapshot directly.

## Required proof once decisions are approved

- Permission matrix for read/edit/check-in and direct-UUID cross-hack isolation.
- Validator rejection of client-supplied points, hackathon IDs, invalid lanes,
  and cross-hack class/event combinations.
- Concurrent primary scans keep class allocation balanced and never double-award.
- Confirmed-to-checked-in transition, ordinary-event prerequisite, idempotent
  primary re-scan, authorized repeat, and exact point reversal.
- VIP gets a normal class and bypasses only the approved gates.
- Discord role success, partial failure, persisted repair, retry, and undo.
- Minimal check-in PII response and no leakage to callers without
  `CHECKIN_HACK_EVENT` or stronger access.
- Manual and QR flows, hacker-only QR availability, camera failure fallback,
  full-screen primary dialog, non-blocking ordinary result, keyboard/touch
  behavior, and 320px/desktop screenshots.
- Attendance export/correction and audit coverage.
- Regression proving every Club surface continues to exclude hackathon events.

## Skill review impact

All eleven current repo-local skills were reviewed for this feature.

- Current discovery/spec work: `forge-spec-writer`, `forge-srd-writer`,
  `forge-test-case-writer`, `forge-placement`, `forge-api`, and
  `frontend-design`.
- UI surface mapping: `react-analyzer`; five relevant files analyzed, five
  component surfaces found, zero failures.
- Later implementation: `forge-placement`, `forge-api`, `forge-react`, and
  `frontend-design`.
- Later verification: `react-analyzer`, the repository's durable Blade
  Playwright suites, `forge-review`, and `deslop` for final prose/comments.

The third-party `spec-miner` is not a current skill. It was deleted in commit
`5d1bcd7c` with six other vendored skills. This research reuses its sound
evidence-mining discipline from Git history but rejects its generic output path
and any stale stack advice. Forge's feature artifacts remain authoritative.

Two repo-skill inconsistencies are worth noting but do not block this feature:

- `forge-react` is more current than the broad engineering-principles prose on
  Suspense, optimistic state, and hook extraction; use the skill's concrete
  Blade doctrine during implementation.
- `playwright-skill` and `deslop` are generic despite the skill registry saying
  current skills are Forge-authored. For durable browser proof, prefer Blade's
  checked-in e2e fixtures and visual harness over ad hoc `/tmp` scripts.
