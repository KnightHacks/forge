# Project judging scheduler SRD

Status: Implementation contract, 2026-09-07. The owner approved proceeding after the final product decisions.

## Technical purpose and ownership

Add one configurable judging schedule per hackathon, project/challenge appointments, isolated repairs, building-aware optimization, timed answer persistence, and MLH normalization.

Follow [engineering principles](../../../docs/agentic-development/forge-engineering-principles.md), [repository conventions](../../../docs/REPO-CONVENTIONS.md), [database guidance](../../../docs/DATABASE-USAGE.md), and [Blade design](../../../apps/blade/DESIGN_SYSTEM.md).

| Owner               | Responsibilities                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| packages/api        | Scheduling model, candidate validation, job orchestration, tRPC, authorization, answer persistence, expiry, scoring, MLH import behavior |
| packages/db         | Building/schedule/appointment/job/draft schemas, constraints, additive migration and sanitized-backup exclusions                         |
| packages/validators | Shared timing, schedule, building, move, and draft input contracts                                                                       |
| apps/blade          | Command Center schedule, room fields, judge refresh, timer, autosave and incomplete-submission UX                                        |

Scope is Blade and the API/DB/validator packages it consumes. No changes to Cron, T.K., other apps, Dockerfiles, deployment, runtime dependencies, publication, hacker delivery, or production settings. No deployment is part of this task.

## Access policy

Use existing judging principals and officer project-management guards. Do not add a new permission model.

| Actor                          | Reads                                                                                                           | Writes                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Anonymous without guest access | None                                                                                                            | None                                                                                                       |
| Ordinary authenticated member  | None unless separately authorized as a guest                                                                    | None                                                                                                       |
| QR guest                       | Own challenge projects, permitted scores, own submissions, room schedule and original MLH labels where relevant | Own allowed evaluations/drafts only                                                                        |
| Authenticated judge            | Existing permitted project/challenge browsing, schedule context, own submissions                                | Own evaluations/drafts subject to scheduled room/time gates                                                |
| Officer                        | Command Center, all relevant schedule data, existing team contact details                                       | Configure, generate, save, drop when unlocked, add/move individual appointments, existing judging controls |

Scheduled evaluation writes require the selected room, its challenge, current appointment, and server time before the judging deadline. Browsing remains available. MLH rooms retain untimed judging. Without a saved schedule, existing untimed judging remains.

An auto-submission's edit restriction follows its appointment room. The room's entire slot, including teardown, blocks editing old auto-submissions. Switching rooms and officer access do not bypass it. Also prevent editing another project during the actor's currently selected room booking. Closed judging remains read-only; reopening uses the existing lifecycle.

All mutation checks are server-side. Audit officer changes through existing coverage declarations. Never return team emails through judge/guest DTOs.

## Time model and configuration

Use integer minutes internally for scheduling and timezone-aware timestamps for persistence. Display the one judging date/window in America/New_York using existing date utilities. Both endpoints have zero seconds/milliseconds.

Fields: windowStart, windowEnd, setupMinutes, judgingMinutes, teardownMinutes, sameBuildingBreakMinutes, differentBuildingBreakMinutes.

Defaults are 2/6/2 and 10/20. Setup/teardown are nonnegative integers, judging and same-building breaks positive integers, and the different-building break is at least the same-building break. Reject a nonpositive window, fractions, non-finite values, and a window that cannot contain one full slot.

Let D = setup + judging + teardown. Legal starts are windowStart + kD for nonnegative integer k with start + D <= windowEnd. The last partial interval remains unused. A break is nextStart - previousFullSlotEnd. It is independent of D.

Deadline = slotStart + setup + judging. No actor can extend it. The form may open during setup; presentation is never forced to start by the client. Treat time ranges as start-inclusive and end-exclusive.

Configuration freezes while a schedule is saved. Drop unlocks it only before the first submitted result tied to that schedule, including an incomplete auto-submission. Typing drafts, MLH results, and unrelated historical evaluations do not trigger this lock.

## Buildings and room compatibility

Add a shared building catalog with seeded labels ENG, BA, HEC, HS, plus custom additions. Preserve display text and use trimmed case-insensitive identity to prevent duplicates.

Existing room IDs, QR links, memberships, and Discord thread IDs remain unchanged. Existing rooms receive no guessed building; an officer selects one before scheduling. Enforce normalized building + room uniqueness within a hackathon. Same room number in different buildings is valid.

Keep the existing Command Center roster's eligible joined-member/valid-guest semantics, including its fifteen-minute recent-presence cutoff. Its two-minute active label remains presentation only. No new staffing authority is created. Snapshot eligible non-MLH rooms at generation and revalidate before save. Staffing loss after save warns and never moves bookings.

Block room/challenge/location edits and archival that would invalidate saved reservations. New rooms may contribute unused grid intervals for individual assignment; they never cause existing appointments to move.

## Scheduling model

There is one task per active project and scheduled challenge membership, including General. Exclude every challenge whose label contains MLH case-insensitively, including legacy labels. A project is the conflict unit across its tasks; imported member emails are not identity constraints.

Rooms have one fixed challenge. A task chooses exactly one eligible room and one legal start. Two tasks cannot occupy the same room/interval. Every required task must be placed before a preview is usable.

For each project's chronological sequence, enforce the configured same-building break, or cross-building break when consecutive locations differ. Count building changes over this sequence. Do not impose a fixed challenge order. General may run concurrently with sponsors.

Run cheap total and per-challenge capacity checks first. Spend a bounded initial probe on the sponsor capacity lower bound before continuing the full search. A failed probe is not an infeasibility proof. Missing challenge capacity cannot be fixed through a travel fallback. At default timing, a four-hour room has 24 slots. The user's twelve total rooms include one MLH room, leaving eleven schedulable rooms and 264 slots before challenge-specific capacity. At 250 General presentations, at least eleven General rooms are needed. This is a diagnostic example, not a feasible benchmark.

### Objectives

Compare schedules lexicographically:

1. Earliest completion of the final non-General, non-MLH sponsor appointment.
2. Least sponsor idle minutes within used sponsor rooms, between their first and final appointments.
3. Earliest completion of all appointments.
4. Fewest building changes across project sequences.
5. Greatest total project break minutes between consecutive appointments within the fixed earlier objectives.

Room balancing follows the sponsor finish and idle objectives; it must not override a higher objective. Use stable input order for reproducible fixtures. Do not claim a global optimum unless the solver proves it.

### Solver and bounded execution

Use a TypeScript constraint search in Blade's existing API runtime, with no external solver/runtime dependency. Represent legal starts as integer grid indices and precompute room/challenge domains. Use minimum-remaining-values task selection, forward checking, occupancy bitsets or equivalent indexed sets, and branch-and-bound against the accepted lexicographic objectives. Seed with deterministic feasible constructions and use their objective vector as an incumbent. Exhaustive tiny-model comparison is mandatory to test pruning correctness.

Keep heavy search out of one uninterrupted event-loop turn. Search advances in bounded cooperative chunks and stores recoverable run state/progress behind officer-authorized operations. A generation request/continuation never holds a database transaction during computation. Use a lease/version to reject competing continuations and a source fingerprint to prevent applying stale results. The organizer's generation flow drives continuation while open; returning to it can resume an unfinished valid run. No external scheduled process is needed.

Enforce one overall wall-time budget below five minutes, including strict/relaxed attempts and objective improvement. Return the best independently validated candidate if optimality remains unproven. With no candidate and unfinished search, report search-incomplete. Only exhausted valid search or an independent sound capacity contradiction proves infeasibility.

A strict model uses the configured cross-building break. Only proven infeasibility permits retrying with the same-building minimum for cross-building transitions. Timeout must not trigger fallback. If relaxed search is infeasible too, show unresolved work and prevent saving. A relaxed candidate lists every shortened transition and requires officer acknowledgment.

Do not call a heuristic failure infeasible, and do not claim a globally optimal result without an exhausted/proven search. Measure realistic workload performance before choosing search budgets and pruning refinements. A missing fit is not permission to weaken constraints.

### Independent validation

Validate every candidate in TypeScript independently of the solver model. Check required task coverage, no duplicates/extras, room/challenge/hackathon scope, MLH exclusion, grid bounds, occupancy, project sequence breaks, reported relaxed transitions, and objective values.

Before saving, repeat validation against fresh authoritative data under the hackathon aggregate lock. A source fingerprint/version detects a stale source. A candidate hash binds Save and reduced-travel acknowledgment to the exact assignments the organizer reviewed. Validation rejects any candidate that would violate accepted rules, regardless of its solver status.

## Persistence and lifecycle

Use normalized schedule and appointment records. Generation jobs may store bounded versioned problem/result snapshots for recovery; never put credentials or member contacts in them.

A saved schedule owns its timing configuration, creation/version, and a durable first-submitted-result lock timestamp. Appointments own project, challenge, room, start, revision, and relaxed-travel attribution. Retain an individual move history or equivalent audit metadata so old attempt locations/deadlines remain explainable.

Distinguish generation preview from saved appointments. Preview changes may regenerate freely. Saving creates all appointments atomically after validation. Only one live schedule exists per hackathon.

Drop is a separate explicit action with a clear confirmation. Serialize it against submission/expiry; materialize due initial drafts before deciding eligibility. Drop removes the unlocked schedule and its unsent drafts only. It never deletes submitted evaluations or unrelated records. The first qualifying result permanently disables Drop for that schedule.

Ordinary reservation mutations affect exactly one appointment. No swapping, cascading moves, or bulk reshuffling. Compare expected revision before write and enforce fresh destination occupancy. Leave every other reservation unchanged.

New projects require individual appointments and appear as unscheduled work. Handle cancellations/soft deletion explicitly for the affected project without moving anyone else; preserve evaluations and history. Do not delete a scheduled project through an import side effect.

## Individual reassignment

Use existing future grid openings in rooms for the appointment's challenge. Require start >= server operation time and full slot fit; no additional notice delay. An already-started interval is not a new shortened slot.

Evaluate both predecessor and successor breaks across the project's other appointments. Try full travel requirements first. If no legal destination exists solely because of the cross-building minimum, offer the same-building fallback with explicit affected-transition acknowledgment. If no legal destination remains, report that and keep the reservation unchanged.

Smart reassignment ranks legal destinations using the same priorities without moving any other appointment. Show the proposed destination before apply. Manual choices expose only current valid openings and are revalidated on save.

Future and missed appointments are movable. Do not move a currently active appointment in a way that grants extra judging time. Preserve already submitted results and attempt attribution; a late result never silently deletes a replacement reservation. Team names/emails are prominent only in the officer dialog. No contact messages are sent.

## Evaluation drafts and expiry

Keep in-progress answers separate from submitted scoring data. Autosaving fully filled answers must not count as a submission.

Use a draft identity scoped to judge/project/challenge and optional appointment/attempt, with server revision and deadline. Persist ratings/responses after a short debounce, with a bounded maximum interval and flush on explicit save/close while permitted. Initial drafts have the fixed appointment deadline; edits to existing submissions preserve their prior committed result until an allowed submit.

A never-opened/never-edited form does not create an evaluation. Successfully persisted drafts survive browser closure. The persisted deadline makes an initial draft effectively submitted at that instant even if no browser remains. Relevant reads, judging/control heartbeats, and mutations reconcile due drafts transactionally before returning scores or evaluating locks. Record the effective submission time as the original deadline, not the later reconciliation time. With no requests, no materialization process runs; the next request observes the same expired result. Never depend on a live judge tab or background worker for time-window enforcement.

At expiry, commit complete answers as a complete evaluation; otherwise commit an incomplete evaluation. Preserve missing values as missing, never substitute a score. Set submitted/auto-submitted metadata and the schedule lock atomically. Maintain the existing one-evaluation-per-judge/project/challenge identity and revision history.

Reject answer changes after the fixed initial deadline. Duplicate heartbeat/client expiry and manual submission races are idempotent. A stale answer revision cannot overwrite newer saved work. Snapshot feedback visibility using the existing guest/member rules.

During a room gap, an auto-submission may reopen. Its edit session ends when either the relevant appointment room or selected current room becomes booked. Persist allowed progress, close/lock the editor, and retain the prior committed result until completion is submitted during downtime. Teardown counts as occupied. No officer override.

Show Saving, Saved, and Save failed accurately. Retry transient errors while the write window remains open. On reconnect after expiry, load authoritative state and explain whether locally unsaved changes were excluded. Do not claim unsent keystrokes survived a closed/offline browser.

## Completion consumers and status

A complete evaluation for a project/challenge makes its matching appointment green. Incomplete-only expired work remains yellow; expired work without an evaluation is red; current pending is yellow; future pending is neutral.

Incomplete evaluations appear in Submissions and leave the author's default Projects queue, but do not count toward scoped/overall averages or sorting, unlock score access, complete challenge badges, enter Deliberation, or release written feedback. Preserve existing complete-evaluation behavior.

Audit all consumers, including projects.ts's direct SQL sorting aggregates, judging-scores.ts reads, feedback, personal submissions, revision history, and deliberation checks. Historical evaluations are complete by migration default. Closed judging remains read-only and an officer can reopen through existing controls.

## MLH normalization

For newly imported projects only, collapse case-insensitive MLH-containing labels into one MLH Challenges entity per hackathon. Preserve each project's original MLH labels in its existing prizeCategories metadata and display them read-only in project/evaluation modals.

Keep add-only import behavior: existing normalized URLs and their data remain untouched. Do not migrate historical challenge memberships, rooms, or evaluations. Scheduler eligibility excludes both consolidated and legacy MLH labels.

MLH rooms have no appointments and use untimed judging with the existing rubric. A consolidated complete MLH evaluation contributes once per judge/project to overall rating. Historical evaluations retain their existing weighting and identity. Guest access stays scoped to the current MLH challenge; do not merge historical room entitlements.

## tRPC and audit

Extend the judging namespace through a focused router module. Expected operations cover generation start/status, preview save, schedule read/drop, legal destinations, appointment add/move, building catalog, draft save/read, and evaluation reconciliation. Reuse existing evaluation submission and room endpoints where their contracts remain clear.

Validators live in packages/validators. Declare new audit coverage and update API-surface snapshots. Read all consumers before changing an existing response contract. External effects remain outside database transactions.

Generation continuation and reconciliation remain API-owned functions called from the existing Blade request flow. Generation requires the officer guard; judge reads reconcile only authorized data. Do not expose unauthenticated job-running endpoints or introduce REST for internal business logic.

## Frontend contract

Add Schedule to Command Center with server-loaded initial configuration/data. Use a full-width schedule area, compact toolbar, bounded room columns, a live 60-minute view, and a full room agenda. Filter by room/project/status, navigate time manually, and return to now without losing the chosen view during polling.

Officer polling is five seconds; judge schedule polling is fifteen seconds, with lightweight payloads and visible stale/error state. Timers render from a server timestamp/deadline anchor; polling is not the clock. Preserve user inputs and open forms across query refresh.

Show project, challenge, building/room, and status text plus color on cards. The move dialog contains team contact details and a destination preview. Configuration, Drop, and fallback acknowledgment are bounded dialogs, not a permanent side rail.

The judge manually opens its current evaluation. Show remaining time clearly, yellow below three minutes and red below ninety seconds. Use a restrained blink with a static urgent equivalent for reduced motion. Urgent announcements do not extend deadlines. After expiry show a concise submitted/incomplete notice. Locked past submissions say to wait until downtime.

Keep existing permitted project browsing; show the relevant active-challenge appointment, or earliest matching appointment with multiple filters, and unscheduled rows last. MLH remains explicitly unscheduled. Preserve server sorting and pagination.

Use focused timer/autosave hooks, tRPC mutation state, server pages, existing design tokens, and matching loading skeletons. Verify desktop and 320px mobile with populated data.

## Migration and rollout

Generate and commit additive Drizzle migrations after schema edits. Preserve existing evaluation IDs and treat all existing evaluations as complete. New buildings are seeded idempotently; legacy rooms remain unschedulable until assigned a building.

Exclude schedule jobs, reservations, and drafts from sanitized backups. Retain the reusable building catalog as configuration. Validate empty DB migration and upgrade using synthetic existing room/QR/evaluation fixtures. Preserve submitted data on rollback; a rollback cannot reinterpret incomplete results as complete.

Use the current Blade runtime and existing dependencies. No Python, external solver, Cron, Dockerfile, secret, or deployment changes. No production migration or deployment is authorized by this task.

## Verification and exit condition

Generate meaningful tests from test-cases.md, including independent brute-force small-model comparisons and representative workload benchmarks. Run focused tests, then pnpm format, pnpm lint, pnpm typecheck, relevant complete package tests, migration checks, Blade build, and browser E2E/screenshots. Run pnpm analyze:react:changed for meaningful React changes.

Initial static React context covered five files and five components with zero analysis failures. This is not runtime verification.

After all gates pass, run Forge review capped at depth five, create the issue and PR using the repository template, attach extensive screenshots hosted only in GitHub discussion, and address CodeRabbit findings until it approves the latest revision and CI passes. Do not merge or deploy.

## Open questions

No product questions remain. Implementation discoveries must be recorded in status.md and must not silently relax the accepted constraints.

### Review follow-up implementation

The organizer board has three view modes: whole-slot room timeline, room agendas, and project itinerary. The itinerary derives a complete project list from all appointments, sorts the selected project's reservations by start time and ID, and computes end-to-start gaps against the configured building rules. It shares appointment inspection and individual reassignment. Live window start is aligned to the saved schedule's grid, and the board displays enough full slots to cover at least an hour. Cards advance at slot boundaries with reduced-motion support.

`judging.getAppointmentResults` is an officer read keyed by hackathon and appointment ID. It lists complete and partial judge identities, exposes ratings/responses only for complete submissions, and averages per-judge means for that appointment. Earlier/unlinked project results are identified separately and cannot affect that average. The inspection dialog polls every five seconds while open.

Judge directory inputs include `showInRoomOnly`, default true, represented as `room=all` when disabled. The server applies an appointment EXISTS predicate for the judge's selected room before count and pagination. Guests retain their enforced room/challenge; authenticated judges use their current room presence. No schedule and MLH remain untimed. Without an authenticated room selection, the directory explains how to enable filtering and preserves permitted browsing. Disabled actions use a focusable tooltip wrapper and gray buttons, with server timing checks retained for stale or unavailable client data.

Draft CAS reads lock the row before comparing revisions. Deadline processing uses one savepoint per draft so an invalid or stale submission cannot roll back other deadlines; retained drafts are reported through the existing logger without answer content. Automatic draft retries back off and stop after five failures; explicit retry still attempts to save the current answers. Contact reads are audited, and schedule/appointment/building events identify the concrete target plus hackathon context. Expired generation jobs are removed when generating another preview.

### Failed deadline reconciliation

Drafts that fail deadline submission with an expected stale-data error retain their answers and record a failure timestamp and error code. Subsequent heartbeat probes exclude these rows. A valid user autosave clears the marker. Migration 0052 adds nullable fields to support this state. Contact-read audit failures produce a warning with identifiers and do not block organizer recovery.
