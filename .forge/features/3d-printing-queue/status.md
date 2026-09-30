# 3D Printing Queue Status

Current phase: Step 2 (consts, schema, migration 0055) done and waiting for
review. Next: validators, then the API.

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

## Open questions

- None blocking.

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
- [ ] Validators and upload policy (approval checkpoint). Moved into the API
      step because the API is their only consumer.
- [ ] API: Blade router, utilities, participant procedures, upload route.
- [ ] Email template and DM delivery (approval checkpoint).
- [ ] Hacker SDK contract, client, hooks, and adapter.
- [ ] Blade nav, page, and queue dashboard.
- [ ] KH IX rail unlock and printing page.
- [ ] Tests from this bundle.
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

## Links

- PRs:
- Issues:
- Discord/thread context: Dylan's task brief (screenshot in the planning
  session).
