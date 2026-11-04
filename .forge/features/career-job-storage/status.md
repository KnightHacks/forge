# Career Job Storage Status

Current phase: Rebased onto the merged Career Discord configuration; awaiting dev-lead schema approval and PR review.

## Rebase after PR #665

- 2026-11-13: Regenerated the job storage migration as `0065_career_job_storage.sql`
  after `0064_career_discord_config`. The SQL body is unchanged; the journal,
  snapshot, lineage test, and migration references now use 0065.

## Decisions

- 2026-11-03: User approved database-only #647 after reverse prompting: seven tables,
  one post per job, supported-source configuration, Member digest opt-ins and JobDigest.
- Employer track evidence wins; fallback is first accepted track. No repost on
  reclassification. Rolling-feed disappearance cannot close a job.
- User requested following through with the agreed plan, authorizing local schema
  and migration work. No production database writes.
- Branch: db/career-job-storage. Existing .claude/settings.local.json is unrelated.

## Progress

- [x] Reverse-prompt scope and decisions; document agreed design and test scenarios.
- [x] Complete schema and relations.
- [x] Generate and review additive migration.
- [x] Run isolated database tests and validator regressions.
- [x] Run root checks, inspect diff and prepare handoff.

## Validation

- Feature generator passed. Git refs and pnpm store required sandbox escalation.
- Use pnpm.cmd: PowerShell blocks pnpm.ps1. Node is 25.8.0; repo wants ^24.22.1.
- `pnpm.cmd typecheck`: passed, 33 tasks. Adding Member fields required two
  Blade fixture updates and excluding digest fields from the profile form source
  type; no rendered UI or form behavior changed.
- `pnpm.cmd lint`: passed, 31 tasks, warnings only (including existing large
  files and the new integration-test describe block).
- `pnpm.cmd --filter @forge/db with-env vitest run`: 166 passed, 2 failed.
  One failure was the expected migration-count update, now fixed and verified.
  The other is the unchanged historical SQL checksum described below.
- Final `pnpm.cmd --filter @forge/db with-env vitest run
src/tests/job-board-migration.test.ts src/tests/migration-lineage.test.ts`:
  10 passed, 1 failed. All 9 new storage tests and the updated journal/snapshot
  lineage test pass. Fresh migration and populated-table upgrade run on disposable
  databases, including concurrent inserts through independent pool connections.
- Remaining checksum failure: `0010_wooden_supreme_intelligence.sql` is CRLF in
  this Windows checkout (SHA-256 starts e5285213); Git HEAD and LF-normalized bytes
  both match the expected a620ea7e hash. Historical SQL files were not changed.
- `pnpm.cmd --filter @forge/validators exec vitest run
src/tests/job-board.test.ts`: 30 passed.
- Three targeted Blade files (member-dashboard, member-profile-settings-form,
  member-profile-form-values): 19 tests passed.
- `pnpm.cmd format`: failed across 24 packages on existing checkout formatting.
  Untouched `packages/consts/src/career.ts` fails Prettier with its CRLF bytes and
  passes when checked in memory with LF only. No repo-wide formatting changes.
- Explicit Prettier check of all changed source, test, document and metadata
  files: passed. `git diff --check`: passed.
- `pnpm.cmd --filter @forge/db with-env drizzle-kit generate`: final check
  reports no schema changes. Generated `0064_career_job_storage.sql`, snapshot and
  journal are aligned. Original line endings restored on unchanged older snapshots
  after the generator's broad metadata formatter; no historical content changes.

## Handoff

- Renamed the uncommitted migration to `0064_career_job_storage.sql` at the
  user's request; updated journal and test references. Targeted rerun: 10 passed,
  with the unrelated historical checksum test excluded (1 skipped).
- Seven tables, eight enums, two false-default Member columns, query relations,
  named uniqueness/check constraints and search/delivery indexes are implemented.
- Design and follow-up runtime/access contracts are in srd.md. No current app
  sends jobs, syncs digest roles, or accepts source settings through this change.
- Migration is committed and pushed in PR #666; no production/shared database was
  migrated.
- Root formatting and historical checksum remain checkout limitations. GitHub
  review in #633 is still outstanding.

## Linux contribution review

- Ran the Forge standard review with migration, test-quality and placement
  reviewers after a green static gate. Used an isolated LF copy in Docker with
  Node 24.22.1 and PostgreSQL 16, matching CI; only .env.example placeholders and
  disposable database credentials were used. The original checkout was preserved.
- `pnpm verify:precommit`: passed (React changed-file analysis, root formatting,
  31 lint tasks and 33 typecheck tasks). Cold API lint/build exceeded Node's default
  heap; retry used NODE_OPTIONS=--max-old-space-size=6144 and TURBO_CONCURRENCY=1.
- `pnpm build`: passed, 21 tasks. `pnpm lint:ws` also passed during installation.
- Full non-DB CI command, `pnpm exec turbo run test --filter='!@forge/db'`:
  passed, 28 tasks, including 1,134 API tests and 911 Blade tests. Other consumers
  also passed (2026: 190, Club: 11, Cron: 62, Guild: 18). Final modified DB test
  file passed its targeted lint and formatting checks after the review fixes.
- `pnpm db:migrate` applied the complete migration chain successfully; running it
  a second time succeeded without pending changes.
- Full DB suite: 168 tests across 31 files passed on LF/PostgreSQL 16. The first
  concurrent run hit an unrelated 5-second event-workflow timeout; a one-worker
  retry passed without changing that test or increasing its timeout.
- Fixed a real CI portability issue: PostgreSQL 16 reports 23503 for the protected
  job deletion while PostgreSQL 18 reports 23001. The assertion now checks the
  specific application foreign-key constraint instead of the version-dependent code.
- Fixed a masked receipt test: set a valid destination before asserting that sent
  jobs require receipts, assert the receipt constraint by name, and test both
  one-sided receipt cases. All 9 storage tests passed again after this change.
- No actionable placement/current-consumer findings. Existing Guild projections
  do not expose application notes or the new digest fields; profile updates do
  not overwrite digest preferences.

### Resolved P2: unbounded keys in unique B-tree indexes

Review reproduced index-size failures for long Job.identityKey, JobSource.boardKey
and JobObservation.externalId values on PostgreSQL 16. User requested continuing
with the fix. The squashed migration 0064 creates stored SHA-256 fingerprint
columns and the three unique constraints directly, preserving original keys.
Named generated columns support typed Drizzle conflict targets. The immutable
conversion preserves Unicode and literal backslashes. Future writers must verify
raw-key equality before updating a fingerprint conflict; ingestion is out of scope.

Regression coverage includes incompressible 8KB identifiers, Unicode/backslashes,
duplicate upserts, distinct identifiers, and preservation of existing member/company data.

Final validation after the fix:

- `pnpm verify:precommit` passed in the isolated LF/Node 24.22.1 environment:
  React analysis, format (24 tasks), lint (31 tasks), typecheck (33 tasks).
- Full PostgreSQL 16 DB suite: 169 tests across 31 files passed.
- `pnpm db:migrate` passed twice against the isolated DB; Drizzle generation found
  no schema drift.
- Normalized checksums confirm all changed app/package files match the tested copy.
- Standard review: migration and test reviewers rechecked the fix with no remaining
  blockers; the earlier placement review remains applicable.
- Full build and non-DB suites passed earlier in this review; after the fingerprint
  change, the root static gate and complete DB suite were rerun.
- No new tables, dependencies, or CI-setting changes in the identifier fix.
  GitHub #633 design approval remains outstanding. No push or production migration.

## Links

- https://github.com/KnightHacks/forge/issues/647
- https://github.com/KnightHacks/forge/issues/633
- https://github.com/KnightHacks/forge/pull/658
- No GitHub comment, PR or lead review has been recorded by this session.

## Migration squash follow-up

User explicitly requested squashing 0064/0065 and clarifying the hash helper.
Only disposable local databases were migrated by this session; no shared deployment
or push occurred. Regenerated one descriptive 0064 migration and snapshot from
0063, updated the journal/lineage assertions and single-migration upgrade test,
and removed the obsolete intermediate-state backfill test. Hash behavior and
seven-table scope are unchanged. The helper explains the B-tree entry limit,
literal backslash handling, and generated-column immutability requirement.
Validation passed: 12 focused migration/lineage tests on PostgreSQL 16; fresh
migration and idempotent rerun; targeted formatting/lint, DB typecheck, and no
Drizzle schema drift. The user additionally confirmed that root lint, root
typecheck, DB tests, and db:generate ran after the squash. The local 0010 lineage
check has a CRLF-only failure; the isolated LF lineage suite passed.
Committed as one commit rebased onto main and opened as PR #666. Dev-lead schema
approval is still outstanding. Optional follow-ups: delivery_track digest index coverage and
an automated schema-drift regression test.
