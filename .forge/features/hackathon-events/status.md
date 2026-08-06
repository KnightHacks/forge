# Hackathon Events Status

Current phase: Complete / owner-approved for Reforge main

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-05: Created `reforge/hackathon-events` from Reforge main commit
  `976fa0b1d`, after hacker management landed.
- 2026-08-05: Historical Spec Miner method used for evidence collection only.
  The removed vendored skill does not override Forge artifact skills or current
  repo architecture.
- 2026-08-05: Owner approved an explicit primary check-in instead of Legacy's
  magic `Check-in` tag. First admission is Confirmed to Checked in and records
  timestamp, operator, class assignment, attendance, and points.
- 2026-08-05: Owner approved an arbitrary configured class count with no fixed
  six-class model. Primary check-in assigns one least-populated class; VIP is
  orthogonal and receives a normal class too.
- 2026-08-05: Owner approved primary role grants for the per-hackathon general
  hacker role, assigned class role, and VIP role when applicable. The general
  role and announcement delivery channel must be configurable in the hackathon
  administration slice.
- 2026-08-05: Owner approved parity with current Discord Scheduled Event,
  Google Calendar, and reminder behavior while retaining the Club-event fence.
  Hackathon reminders deliver to the configured hackathon channel and ping its
  general hacker role.
- 2026-08-05: Owner approved persistent, operator-closable result dialogs and a
  reopenable check-in history. The final compact result shows class/color, VIP,
  name, and date of birth, with a prominent DOB-derived warning when the hacker
  is under 18 at check-in time.
- 2026-08-05: Owner approved per-station mutable class calling, `All classes`,
  VIP bypass, and explicit ordinary-event repeat mode. Repeats award no points
  after the first attendance.
- 2026-08-05: Owner included completion of the pending Hackathon events panel
  in the hacker detail dialog and deferred hacker/class leaderboards.
- 2026-08-05: `spec.md` now contains the owner-approved behavior plus visibly
  labeled proposed defaults. `srd.md` and `test-cases.md` remain templates until
  the product spec is approved.
- 2026-08-05: Owner approved the product spec and its proposed defaults. The
  under-18 state warns and routes without undoing admission; history is shared
  across stations; role failures preserve admission with visible repair; this
  slice has no primary-admission undo; primary operation requires the general
  role and at least one ready class; and the first slice uses one deduplicated
  reminder around fifteen minutes before an ordinary event.
- 2026-08-05: Began the Forge SRD Writer reverse prompt. No technical proposal
  has been written into `srd.md` yet.
- 2026-08-05: Owner approved the shared Event model with explicit hackathon
  scope and separate hack-event tRPC procedures; the per-hack attendee and
  repeatable per-event occurrence ledgers; the proposed access policy; and
  post-commit, repairable Discord role delivery.
- 2026-08-05: Owner declined configurable routing/instruction copy. Check-in
  results provide the compact name, date of birth, class, VIP, and minor facts;
  volunteer briefings own operational instructions.
- 2026-08-05: Owner confirmed Club reminders must continue excluding all
  hackathon events. A separate deduplicated hack reminder uses the selected
  hackathon's configured announcement destination and general hacker role.
- 2026-08-05: Owner deferred hacker-facing QR retrieval to the future dashboard
  SDK slice and approved conservative preservation of Legacy events for later
  analytics.
- 2026-08-05: Owner added separate, independently permissioned Hackathon Events
  and Hackathon Check-in navigation entries with new icons. The desktop rail
  must become viewport-scrollable; mobile already scrolls.
- 2026-08-05: Owner added per-hackathon first-time-hacker correctness to this
  slice. Roster badge/filter/detail must stop allowing a mutable profile answer
  to rewrite earlier hackathons.
- 2026-08-05: Owner approved all remaining reverse-prompt defaults and
  authorized implementation while away. Primary events project to Discord and
  Google but never remind; attendee-first first-time reads use explicit
  `first | returning | unknown` states and snapshot the bridge at admission.
- 2026-08-05: Three owner-authorized adversarial reviews converged on strict
  scope predicates, scoped hack tags, additive Legacy-safe schema, serialized
  points/class allocation, post-commit repairable roles, ambiguous-reminder
  `unknown` state, and blocking status-based undo from `checkedin`. Their
  majority decisions are incorporated in `srd.md` and `test-cases.md`.
- 2026-08-05: Owner expanded the event-management pass to converge Club and
  Hackathon events on compact list rows, List/Calendar/Tags navigation, dense
  filters, pagination, past/upcoming history, duplication, feedback-form
  linkage, and an hourly day calendar. Hackathon event state remains scoped by
  the root hackathon selector.
- 2026-08-05: Hackathon tags can now preview and import every tag occurrence
  from earlier hackathons. Latest active definitions win, target conflicts and
  archived-only definitions are shown but skipped, and import is transactional,
  idempotent, and audited.
- 2026-08-05: Vision-based desktop/mobile QA aligned both event surfaces. The
  calendar mode is URL-backed so Month/Day survives server navigation and
  refreshes. Final adversarial review remains intentionally paused until the
  owner completes this iterative UI walkthrough.
- 2026-08-05: Admin audit records for Hackathon check-in now target the
  HackerAttendee by name and relate the Event, Hackathon, attendance occurrence,
  and attempt. Historical slice records are enriched at read time from their
  immutable attempt rows, so the existing log is actionable without rewriting
  append-only audit data. Hackathon Event/Tag writes now use Hackathon-domain
  action keys rather than Club Event keys.
- 2026-08-05: Admin logs gained exact Hacker, check-in result, domain, actor,
  member, commit-status, target, and club-time date filters. Filter state lives
  in the URL and composes through a pending-search buffer, fixing the stale URL
  race that reset adjacent filters. Hackathon Event view/filter/sort/pagination
  state uses the same composition rule and survives scope/view changes.
- 2026-08-05: The Hackathon Events scope selector moved into the page-header
  action cluster beside Feedback template and Create event. Removing its
  standalone card brings the desktop and mobile page footprint back in line
  with Club Events while preserving the per-hack root scope.
- 2026-08-06: The deep `forge-review` pass resolved every surviving adversarial
  finding across reminder leases/snapshot immutability, role-grant leases,
  Discord ambiguity repair/auditing, audit URL filters, mobile calendar URL
  synchronization, scoped deletion/restore behavior, and real-PostgreSQL test
  fixtures. No product invariant was weakened to satisfy a fixture.
- 2026-08-06: Fresh vision QA covered Hackathon Events list/calendar on desktop,
  the mobile day calendar, Hackathon Check-in, and Admin Logs. The branch is
  intentionally not merged until the owner approves this final UI pass.
- 2026-08-06: Three final adversarial reviewers independently rechecked the
  hackathon/admin filter path, both scanner lifecycles, and the repository
  skills/contract surface. All three returned green after the last fixes; no
  P0, P1, or P2 finding remains.
- 2026-08-06: Owner completed the final live UI audit, approved the feature,
  and authorized its merge into `reforge/main`.

## Open questions

- None for this implementation slice.

## Final hardening results

- [x] Shared deletion fences/counts are hackathon-scoped and refuse any retained
      Hackathon attendance history.
- [x] Club and Hackathon scanners remain mounted and accept subsequent same- or
      different-code scans without a refresh.
- [x] Immediate rejected results preserve the DOB-derived minor warning.
- [x] Reminder eligibility is revalidated under lock; only one delivery is
      leased immediately before each serial provider call.
- [x] Reminder payload/destination snapshots freeze at the first provider
      attempt and edits cannot bypass retry backoff.
- [x] Legacy nullable attendance history cannot produce another points award.
- [x] Successful admissions require a scoped attendee/attendance identity.
- [x] Expired role leases close their prior attempt as unknown before retry and
      each sequential grant reads a fresh clock.
- [x] Restore/migration coverage exercises scoped orphan-tag filtering against a
      real disposable PostgreSQL database.

## Task list

- [x] Review all current repo-local skills and their detailed Forge guidance.
- [x] Recover and apply the historical Spec Miner evidence workflow.
- [x] Mine Legacy hackathon event/check-in behavior and defects.
- [x] Map current Event, HackathonClass, HackerAttendee, permissions, API, and
      Blade seams.
- [x] Record evidence, proposals, risks, and questions in `research.md`.
- [x] Owner answers the core reverse-prompt decisions in `research.md`.
- [x] Draft `spec.md` from those answers and label remaining proposed defaults.
- [x] Owner approves the product spec and proposed defaults.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Owner approves artifact bundle before implementation/test generation.
- [x] Implement additive schema/migration, preflights, and first-time backfill.
- [x] Implement validators, API, cron, and Blade surfaces.
- [x] Add Club/Hack event UI parity, hack-scoped tag import, event duplication,
      pagination/filtering, feedback-form linkage, and month/day calendars.
- [x] Run the approved implementation tests, typechecks, formatting, focused
      lint, React analysis, visual QA, and critical Playwright flow.
- [x] Complete the deep Forge reviewer flow and resolve every surviving finding.
- [x] Receive owner approval for the fresh final UI pass and authorization to
      merge into `reforge/main`.

## Validation / commands

- `git pull --ff-only origin reforge/main`: already current at `976fa0b1d`.
- `pnpm forge:feature hackathon-events "Hackathon Events"`: first attempt blocked
  because the new worktree has no `node_modules`; the same repository script
  then succeeded through the installed runtime in `forge-reforge-main`.
- `pnpm analyze:react` over current Reforge event check-in and Legacy hackathon
  check-in/scanner: 5 files, 5 component surfaces, 0 failures.
- Prettier check over `.forge/features/hackathon-events/*.md`: passed.
- 2026-08-05 product-spec revision: repo `deslop` checklist applied to the new
  prose; Spec Writer source documents re-read; Prettier write/check passed for
  `spec.md`, `status.md`, and `research.md`.
- Read-only source archaeology only; no tests, lint, typecheck, database, or
  provider calls were needed for this discovery pass.
- `pnpm --filter=@forge/db test`: 22 files, 106 tests passed after migration
  `0033_dry_shriek.sql` was applied successfully to the local development DB.
- `pnpm --filter=@forge/db typecheck`: passed.
- `pnpm --filter=@forge/db lint`: passed with zero errors and five pre-existing
  max-lines warnings.
- `pnpm --filter=@forge/validators test`: 18 files, 203 tests passed during the
  validator implementation pass.
- `pnpm --filter=@forge/validators typecheck`: passed.
- `pnpm --filter=@forge/cron test -- src/tests/hack-event-reminders.test.ts`:
  four tests passed for role mention safety, success completion, ambiguous
  delivery, and definite rejection.
- `pnpm --filter=@forge/cron lint` and `pnpm --filter=@forge/cron typecheck`:
  passed for the reminder payload/executor slice.
- `pnpm analyze:react:changed`: 14 changed TSX files, 13 components, zero
  failures.
- `pnpm format`: 19 package format tasks passed; `git diff --check` passed.
- Blade full Vitest run: 107 files, 639 tests passed.
- Focused Hackathon Events API run: 3 files passed, 5 integration files skipped
  without a test database; 8 tests passed and 22 skipped. API and Blade
  typechecks passed.
- Focused validators run: 9 tests passed; validators typecheck passed.
- Focused ESLint has zero errors. Existing/new oversized orchestration surfaces
  still report non-blocking max-lines warnings.
- Playwright `hackathon-events.spec.ts`: 2 tests passed, covering compact list
  fields, duplicate dialog, persisted hourly day view, tags/import preview,
  primary admission, under-18 warning, class/VIP result, and history reopen.
- 2026-08-05 admin-quality pass: validators, API, and Blade typechecks passed;
  focused audit/Blade tests passed; Playwright remained 2/2 and now covers the
  rapid timing/sort URL composition regression. The owner-facing server was
  restarted on port 3000 after the audit module changes.
- 2026-08-05 Discord projection pass: Hackathon Scheduled Event descriptions
  now use the Legacy-style hackathon banner, organizer-authored body, and
  starred point value. Club and Google Calendar descriptions remain unchanged;
  the focused orchestration suite passes 28/28, API typecheck passes, and API
  lint reports zero errors.
- 2026-08-05 scanner lifecycle pass: Hackathon check-in now keeps the scanner
  mounted beneath the operator-dismissed result dialog, releases its request
  lock before asynchronous history refresh completes, and accepts subsequent
  same- or different-QR scans without a page refresh once the prior code leaves
  view. Club member check-in now uses the same absence-aware multi-scan gate
  instead of permanent per-payload memory. Focused scanner tests pass 4/4,
  Blade typecheck passes, changed React analysis reports zero failures, and
  focused lint reports zero errors.
- 2026-08-05 Admin Logs filter pass: domain, action, commit status, check-in
  result, and target type now use searchable responsive combo boxes alongside
  the existing member, hacker, and actor lookups. Desktop popover and mobile
  drawer selection were visually verified; action and target selections retain
  their URL-backed filter state. Focused tests pass 3/3, Blade typecheck passes,
  and focused lint reports zero errors.
- Vision QA artifacts cover Hack desktop/mobile list and calendar, Hack tags and
  import, Club desktop list/month/day, and Admin Logs desktop/mobile combo-box
  states under `visuals/`.
- The owner development server is live at `http://localhost:3000`.
- 2026-08-06 `pnpm verify:precommit`: passed. Changed React analysis reported 19
  files, 17 components, and zero failures; formatting, lint, and all 27
  workspace typecheck tasks passed.
- 2026-08-06 full Vitest suites: API 70 files passed / 12 skipped (487 passed,
  110 skipped); Blade 111 files / 653 tests passed; Cron 6 files / 28 tests
  passed; Validators 18 files / 208 tests passed; DB 22 files passed (75 passed,
  31 environment-gated tests skipped in the ordinary run).
- 2026-08-06 real PostgreSQL contract runs: six Hackathon Events API suites,
  29/29 tests passed; the production restore/migration suite passed 10/10.
- 2026-08-06 Playwright Hackathon Events flow: 2/2 passed against the live
  owner server, covering list/calendar/tags/duplicate and minor primary
  admission with persistent result/history behavior.
- 2026-08-06 final screenshots were inspected with vision at 1440px desktop and
  390px mobile widths for Hackathon Events, the hourly day calendar, Hackathon
  Check-in, and Admin Logs searchable filters. A malformed calendar deep link
  also rendered the validated default day without crashing or retaining bad
  bounds.

## Links

- PRs:
- Issues:
- Discord/thread context: owner request in this Codex task, 2026-08-05.
