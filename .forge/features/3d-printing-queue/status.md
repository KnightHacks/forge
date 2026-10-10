# 3D Printing Queue Status

Current phase: Shinies UI refinement implemented and locally validated (2026-10-04). Changes are uncommitted on `codex/shinies-printing-ui`, based on PR #592, for human visual review.

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-09-29: Hackers are notified by both Discord DM and email on organizer
  status changes. Each channel is best-effort and independent.
- 2026-09-29: Jobs accept STL, 3MF, OBJ, and STEP models plus PNG and JPG
  reference images, up to 5 files, 50 MB each.
- 2026-09-29: Statuses are received, printing, needs clarification, ready for
  pickup, picked up, and cancelled. Picked up and cancelled are separate so
  organizers can see repeat cancellers. Hackers can cancel only while a job is
  received or needs clarification.
- 2026-09-29: One PR on `blade/3d-printing-queue` covers Blade, KH IX, and the
  shared packages. The PR description will explain the exception to the
  one-app rule.
- 2026-09-29: Print files stream through the Hacker SDK adapter to a Blade route
  handler, like resumes. Presigned PUTs would need MinIO CORS changes for the
  portal origin.
- 2026-09-29: The Discord channel is stored per hackathon in a new
  `PrintingConfiguration` table, editable by `PRINTING_QUEUE` holders, rather
  than as an officer-only `DiscordConfig` key.

- 2026-09-30: New-job notices mention only roles granted `PRINTING_QUEUE`.
  Officer-only roles can use the queue but are not pinged.
- 2026-09-30: No per-hacker limit on open jobs.
- 2026-09-30: A note is required for `needs_clarification` and optional for
  every other status.
- 2026-09-30: `cleanupAbandonedPrintFiles` ships and is tested, but scheduling
  it in `apps/cron` is deferred to a follow-up, which keeps this PR to Blade and
  KH IX.

- 2026-10-01: Added later requirements. A disclaimer states each print takes
  about the configured print time. `Received` and `Printing` jobs show queue
  position and an estimated ready time, computed when read from position,
  print time (default 60 minutes), and printer count (default 1), both set per
  hackathon in Blade. An organizer can set an exact ready time on a job, which
  wins over the computed one.
- 2026-10-01: Estimate changes do not notify. Hackers see the live estimate on
  the page. Status-change DMs and emails include the estimate and a link to the
  printing page, which acts as the tracker.
- 2026-10-01: Amend migration 0055 rather than adding 0056. It is unmerged, has
  no PR, and only ran on disposable databases. New columns:
  `print_job.estimated_ready_at`, `printing_configuration.print_minutes`,
  `printing_configuration.printer_count`. Leaving status as `received` or
  `printing` clears the override.
- 2026-10-01: The trailing "Ac" in the later requirement notes was dropped as
  incomplete.
- 2026-10-01: No commits, pushes, or PRs without the human reviewing and
  approving first.

- 2026-10-01: No `use_3d_printing` dashboard action. KH IX unlocks the tab
  from application status like Events, which avoids breaking an older KH IX
  deploy that strictly parses the dashboard. See the SRD participant section.
- 2026-10-01: Print uploads resolve the type from the file extension
  (`typeFrom: "extension"`), because browsers report STL and OBJ
  inconsistently.

- 2026-10-01: The Blade queue opens on an "Active" view (received, printing,
  needs clarification; `PRINTING.PRINT_JOB_OPEN_STATUSES`). "All" is the full
  history at `?status=all`. Human chose this over leaving All as the default.

- 2026-10-01: forge-review (deep tier) found and confirmed: the 0055
  collision with `main`, a note-only edit resetting a printing job's start
  time, a stale note carried into the next status, KH IX file list races
  during submit, unlimited staged uploads, failed files silently dropped, and
  missing tests. All were fixed (see Validation). The branch was rebased onto
  `main` (backup branch `backup/3d-printing-queue-pre-rebase`) and the
  migration renumbered to 0058. Staged uploads are capped at
  `MAX_PRINT_JOB_FILES` per hacker by deleting the oldest unsubmitted ones.
  Not fixed by choice (reported, left for the human): MinIO objects orphaned
  when an application or account delete cascades, the Blade ready-time input
  using the browser time zone, the settings dialog partial-save message, and
  the hacker job list refreshing only on focus.

## Open questions

- Deployment: a print upload passes through the KH IX server (up to 51 MB) and
  then Blade. Any reverse proxy in front of either needs a body limit above
  that (for example nginx `client_max_body_size 55m`).

## Follow-ups

- Schedule `cleanupAbandonedPrintFiles` with
  `apps/cron/src/crons/print-file-cleanup.ts`.
- Decide on retention for print files after a hackathon ends.

## Task list

- [x] Complete reverse-prompting for `spec.md` (notifications, files, statuses).
- [x] Draft `srd.md`.
- [x] Draft `test-cases.md`.
- [x] Resolve open questions.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Consts, schema, and migration 0055 (approval checkpoint).
- [x] Revise spec, SRD, and test cases for ready-time estimates and the
      disclaimer.
- [x] Amend 0055 with the estimate columns (approval checkpoint).
- [x] Validators and upload policy (approval checkpoint). Moved into the API
      step because the API is their only consumer.
- [x] API: Blade router, utilities, participant procedures, upload route.
      Includes the SDK contract entries the participant procedures need.
      Notifications are not wired yet.
- [x] Email template and DM delivery (approval checkpoint).
- [x] Hacker SDK contract, client, hooks, and adapter.
- [x] Blade nav, page, and queue dashboard.
- [x] KH IX rail unlock and printing page.
- [x] Tests from this bundle (API integration, unit, validator, SDK, Blade,
      KH IX). Browser checks were manual Playwright scripts, not committed
      specs.
- [ ] Verification, review, and screenshots.

## Validation / commands

- 2026-09-30, Step 2:
  - `print-job-schema.test.ts` (10 tests) and `database-harness.test.ts`
    (5 tests) on a disposable database: pass. Migrations 0000 to 0055 apply to
    a fresh database.
  - `@forge/db` vitest: 157 of 157 pass (lineage and backup-sanitizer gates
    included).
  - `@forge/blade` `src/tests/admin`: 388 of 388 pass (role permission editor
    included).
  - `pnpm typecheck`: every package passes except `@forge/api`, which fails only
    because `@ortools-node/cp-sat` is missing from local `node_modules`. This is
    a stale install, unrelated to this feature.
  - ESLint on changed files: no errors.
  - `pnpm db:migrate` on the local database fails before 0055. The local
    database records 0 applied migrations and predates 0049, so it needs a
    reset. This is local state, unrelated to this feature.
- The first 0055 draft had a CHECK that NULL notes slipped through
  (`NULL ~ ...` is NULL, and a NULL CHECK passes). The schema test caught it,
  and 0055 was regenerated before it was applied anywhere.

- 2026-10-01, 0055 amendment:
  - Regenerated with `drizzle-kit generate --name fresh_zombie`. The SQL diff
    only adds `estimated_ready_at`, `print_minutes`, `printer_count`, and the two
    range checks. The snapshot `prevId` is unchanged.
  - `print-job-schema.test.ts`: 12 of 12 pass on a disposable database
    (migrations 0000 to 0055 apply).
  - `@forge/db` vitest: 157 of 157 pass.
  - `pnpm typecheck` (33 of 33), `pnpm lint` (31 of 31), and `pnpm format`: pass.
  - Not run: `pnpm db:migrate` on the local `local` database, which still
    needs a reset (see above).

- 2026-10-01, validators and API:
  - New: `validators/src/printing.ts`, `PRINT_FILE_UPLOAD_POLICY`, portal
    printing schemas, audit keys and target types, SDK contract entries,
    `api/src/utils/printing/{access,estimate,queue,files}.ts`,
    `api/src/routers/printing.ts`, `api/src/hacker-portal/printing.ts`, and
    Blade `api/hacker/v1/printing/[operation]/route.ts`. The resume route's
    helpers moved to `api/hacker/v1/participant-upload.ts` unchanged.
  - `tests/integration/printing.test.ts` (8), `tests/printing/estimate.test.ts`
    (4), and the validator printing and upload tests: pass.
  - `@forge/validators` 327/327, `@forge/hacker-sdk` 31/31, `@forge/blade`
    881/881.
  - `@forge/api`: everything passes except 2 tests in
    `judging-access.test.ts`, which also fail with these changes stashed, so
    they were already failing on this branch.
  - API surface snapshot updated: adds exactly the 8 `printing.*` procedures.
  - `pnpm format`, `pnpm lint` (no errors), and `pnpm typecheck` (33/33): pass.

- 2026-10-01, notifications:
  - New: `@forge/email` `printJobStatusEmail`,
    `api/src/utils/printing/notifications.ts`. `escapeMarkdown` in
    `utils/judging/discord-comms.ts` is now exported for reuse.
  - Wired: `submitPrintJob` posts the channel notice after commit (only when
    the job was created, not on replay). `printing.updateStatus` DMs and
    emails after commit and returns `delivery`.
  - Tests: `tests/printing/notifications.test.ts` (2),
    `tests/integration/printing.test.ts` now 10, `@forge/email` 88/88.
  - `@forge/api` 1014/1016; the 2 failures are the existing
    `judging-access.test.ts` ones.
  - `pnpm format`, `pnpm lint` (no errors), `pnpm typecheck` (33/33): pass.

- 2026-10-01, Hacker SDK:
  - Client `uploadPrintFile(file, { fileName })`: checks type and size with
    `PRINT_FILE_UPLOAD_POLICY` before sending, then posts to
    `{adapter}/printing/upload`.
  - Hooks: `useHackerPrintJobs` (enabled only when checked in),
    `useUploadPrintFile` (no retry, no invalidation), `useRemoveStagedPrintFile`,
    `useSubmitPrintJob`, `useCancelPrintJob`. Query key `printJobs`.
  - Adapter: forwards only `printing/upload` to Blade
    `/api/hacker/v1/printing/upload`, multipart only, capped at 51 MB. KH IX's
    catch-all `api/hacker-sdk/[...hackerSdk]` route needs no change.
  - Error codes added: `INVALID_PRINT_FILE`, `PRINT_FILE_UNAVAILABLE`,
    `PRINT_JOB_NOT_CANCELLABLE`.
  - `@forge/hacker-sdk` 34/34, `@forge/2026` 14/14. `pnpm format`,
    `pnpm lint` (no errors), `pnpm typecheck` (33/33): pass.

- 2026-10-01: Upload progress is per-file state (uploading, uploaded,
  failed with reason), not a percentage. Human chose option A.
- 2026-10-01, Blade page:
  - New: `/admin/printing` page, `printing-queue-workspace`,
    `print-job-dialog` (with `ReadyTimeForm` and `ContactSection`),
    `printing-settings-dialog`, `print-status-pill`, `print-queue-format`;
    nav item "Printing Queue" in the Hackathon group; `canAccessPrintingQueue`;
    API `printing.listHackathons` (running hackathon first).
  - Bug found by screenshot and fixed: `app/admin/layout.tsx` redirected
    users whose only admin permission is `PRINTING_QUEUE`. The layout gate now
    includes `canAccessPrintingQueue`.
  - Screenshots at 1440x1000 and 320x800 against a scratch database
    (`forge_printing_screens`, 64 seeded jobs, long names and descriptions):
    no document overflow, dialogs fit at 320 px, no page errors. Status saves
    were not clicked in the browser because development email may use the
    real provider; the API integration tests cover that path.
  - The local `local` database has migrations 0000 to 0054 applied, so it does
    not need a reset; `pnpm db:migrate` applies 0055.
  - `@forge/blade` 886/886, `pnpm format`, `pnpm lint` (no errors, no new
    warnings), `pnpm typecheck` (33/33): pass.

- 2026-10-01, KH IX page:
  - Rail "3D Printing" unlocks at `checkedin` (same rule as Events) and links
    to `/dashboard/printing`. Before check-in the page shows the Events-style
    locked `StatusStage` (now exported from `khix-dashboard.tsx`).
  - New: `hacker-printing.tsx` and `.module.css` (print-time disclaimer with
    waiting count and wait estimate, new-job form with per-file upload state,
    job list as numbered queue tickets with estimate, organizer note, and
    cancel confirmation), `lib/print-jobs.ts` (copy helpers, tested), and
    `useHackerPrintingFlow` in `lib/hacker-portal.tsx` (idempotency leases for
    submit and cancel). The SDK re-exports `PRINT_FILE_UPLOAD_POLICY` and
    `uploadAccept` so KH IX needs no new dependency.
  - Screenshots at 1440 and 320 px through the real portal OAuth (Blade :3100,
    KH IX :3007, scratch database): no document overflow, no page errors.
    Locked state, rejected-file state, cancel dialog, and an end-to-end cancel
    (row became `cancelled`) verified. A valid upload was not run because it
    would write to the MinIO bucket in `.env`.
  - Review fixes: only `received` jobs show a ticket number (a printing job
    showed "No. 9"); an empty file row is hidden.
  - `@forge/2026` 16/16, `@forge/hacker-sdk` 34/34, `pnpm format`,
    `pnpm lint` (no errors, no new warnings), `pnpm typecheck` (33/33): pass.

- 2026-10-01, review fixes on the rebased branch:
  - `updateStatus` only moves `statusChangedAt` when the status changes.
  - Blade dialog clears the note when a different status is picked.
  - KH IX form freezes the file list while sending and blocks sending while
    any file failed.
  - New tests: hacker isolation for list and cancel, note-only edit keeps the
    print start, staged-upload cap, admin layout gate for a
    `PRINTING_QUEUE`-only role, and a 10 MB print upload through the SDK
    adapter.
  - `@forge/api` 1041/1041 (the old judging-access failures are fixed on
    main), `@forge/db` 159/159, `@forge/validators` 327/327,
    `@forge/hacker-sdk` 35/35, `@forge/email` 88/88, `@forge/blade` 890/890,
    `@forge/2026` 16/16; `pnpm verify:precommit` passes.

## Links

- PRs:
- Issues:
- Discord/thread context: Dylan's task brief (screenshot in the planning
  session).

## Shinies UI refinement — 2026-10-04

Current phase: locally validated; ready for visual review. Branch: codex/shinies-printing-ui, based on PR #592 (https://github.com/KnightHacks/forge/pull/592).

User approved a sponsor-focused UX/UI redesign. Scope: KH IX hacker printing page and Blade organizer queue. Logo and sponsor URL already exist in the repo; description verified against the official site. No new sponsor service promises, material guarantees or pickup location are invented.

- [x] Inspect existing workflow, repo design contract, sponsor assets and official site.
- [x] Implement sponsor identity, focused submission, active/history separation and compact searchable queue.
- [x] Verify desktop/mobile screenshots and representative workflows with local sample data.
- [x] Run formatting, lint, types, React analysis and relevant tests; record results.

Local preview uses the pre-existing temporary fixture server. It does not validate production auth, storage, database persistence or notification delivery. No deployment or commit requested.

### Refinement validation

- Both `pnpm --filter=@forge/2026 typecheck` and `pnpm --filter=@forge/blade typecheck` pass. Stale workspace declaration builds and old map route types initially blocked checks; dependency builds and Next type generation resolved them without source changes.
- Scoped ESLint passes for the printing workspace, detail dialog, hacker page and new submission component, with no warnings. The existing dashboard shell still has its pre-existing size warnings.
- Prettier checks on edited code/styles and the feature bundle pass; `git diff --check` passes.
- `pnpm analyze:react:changed` reports 0 failures; explicit strict analysis of the new, untracked submission component also passes.
- KH IX tests: 16/16 pass. Blade printing format tests: 3/3 pass.
- Actual UI inspected at 1600×900 and 320×800. Both job collections stay within a 574px scroll region with 60 synthetic records; no document overflow at 320px. Long description and contact-name recovery, mobile modal bounds and readable sponsor marks checked.
- Local browser checks pass for unsupported-file guard, draft persistence across dismissal, submission from History returning to In progress, cancellation moving to History, filename search, empty search, required clarification note, status save and model download.
- Preview fixtures restored after stress checks. Existing backend estimates, settings, status transitions, auth, storage and delivery implementations were not changed. No production database/notification validation, production build, commit or deployment performed for this visual refinement.

## Organizer request counts — 2026-10-04

Implemented locally on the existing task branch. Added a per-person total in Blade queue rows and job details, with the hackathon/all-status scope made explicit. Extended the existing API attendee aggregate; no extra query or migration. Added integration assertions for filter stability, cancellations, completed jobs, multiple files, other attendees and other events.

Validation: API, Blade and KH IX typechecks pass. Scoped ESLint has no errors (existing integration-suite length warnings remain). Printing unit tests: 6 passed; database integration suite: 14 skipped because no loopback test database is configured and Docker is unavailable. Database-backed count correctness is not executed locally. React changed analysis: 0 failures. Browser sample-data checks confirm stable totals under search and status filters, matching detail text, and no document/dialog overflow at 320px. Desktop/mobile screenshots inspected. Local preview fixture now supplies the additive count. No commit or deployment.

## Upload guardrails — 2026-10-04

User requested a security review and code guardrails, selected STL + reference images, clarified no malware scanner, and authorized pushing the existing branch. The scoped review found four source-level issues: filename extension loss, pre-authentication SDK buffering, missing retained-file quotas and a staging-cap race. Implemented fixes address all four; independent read-only review also caught and resolved multi-file client concurrency and ASCII STL whitespace compatibility. No server-side file execution path was found.

Implementation scope: validators printing policy/parser; API printing storage, quotas and authorization helper; SDK upload proxy; Blade upload route; KH IX submission form. Versioned validation metadata intentionally blocks downloads of legacy unvalidated files until re-upload. All status categories consume the 25-file/250-MiB per-attendee/event quota. Existing UI refinements and organizer request counts are included on the same branch as requested.

Validation: root `pnpm format`, `pnpm lint`, and `pnpm typecheck` pass (existing size/complexity lint warnings remain). `pnpm analyze:react:changed` and strict analysis of the new form report zero failures. Validators: 338 passed; hacker SDK: 40 passed; printing API unit tests: 9 passed; Blade upload/printing format tests: 6 passed; KH IX: 16 passed. The original renamed script/HTML payloads are rejected by the printing policy; safe filename and legacy-download tests pass. Authentication tests verify no body read for missing/forged/unchecked sessions and upstream failures, plus successful refresh before buffering. Browser checks confirmed two overlapping selections produce maximum one active upload, both complete, and submission is enabled; screenshot inspected and fixture uploads removed afterward. Initial type/lint issues found during implementation were corrected and checks rerun.

Database integration: 17 skipped, including quota/concurrency and organizer-count cases, because no loopback PostgreSQL database is configured. These database-backed fixes are implemented and typechecked but their runtime verification remains blocked; the configured nonlocal database is never used for tests. Storage tests mock MinIO; production bucket policy, live storage and downstream slicers were not tested. No antivirus guarantee, deployment or production configuration changes.

## CI teardown fix — PR #592

Current branch: `blade/3d-printing-queue`, aligned with the rebased remote head `6502bc3e`. CI run 37251475322 passed all 1,048 API assertions but failed on an unhandled PostgreSQL `57P01` during printing test teardown. The installed `pg-pool` removes idle clients from its internal list before their socket-close callbacks finish, so awaiting `Pool.end()` alone can let disposable-database termination race those connections.

Added a printing-test shutdown tracker before the first database query. Teardown now awaits both pool shutdown and every observed client’s `end` event, and propagates shutdown errors instead of suppressing them. Scope is API test support and printing tests; production database behavior is unchanged. A deterministic no-server regression failed under the previous `Pool.end()`-only behavior before implementing the fix. Validation: root `pnpm format`, `pnpm lint`, and `pnpm typecheck` pass (existing warnings only). Focused printing tests: 12 passed, 17 database tests skipped. Full API suite: 792 passed, 259 database-dependent tests skipped because no local PostgreSQL server is configured; no unhandled errors. The teardown regression was first observed failing with the original behavior and then passing with the fix. PostgreSQL-backed CI confirmation follows the push.

- 2026-10-10 emergency update: user requested a manual open/closed switch only, bundled with the check-in picker fix. Blade queue controls availability per hackathon; hackers see the status and cannot upload or submit while closed. Existing jobs, cancellation, and successful idempotent replays remain available. Migration 0062 defaults printing to closed; an organizer must open it after deployment. Database-backed printing, schema, audit, SDK, validators, and portal tests pass.
