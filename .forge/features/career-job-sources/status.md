# Career job source adapters Status

Current phase: Implementation

## Decision log

- 2026-11-13: Start with #652, Cron source adapters; keep API, DB, scheduling,
  Discord delivery, and Blade integration out of this slice.
- 2026-11-13: Cron emits a provisional raw observation with source/external
  IDs, track, raw company/title/apply URL, optional source URL/date, original
  location text(s), and optional source fields. Coordinate with #649 before API
  hookup.
- 2026-11-13: Keep source registrations code-owned and easy to extend; Discord
  routing remains officer-configurable separately.
- 2026-11-13: Test source families for valid field mapping and explicit failure
  on HTTP, malformed-payload, and required-field errors; adapters have no API,
  DB, or Discord side effects.
- 2026-11-14: Rebased onto `origin/main` at `98f3f9d3`, bringing in merged #647
  and #648. GitHub feed output now uses `provider`/`boardKey` for `JobSource`
  and listing fields aligned with `Job`/`JobObservation`.
- 2026-11-14: During local verification, PostgreSQL 16 on port 5432 accepted
  the existing ignored root `.env`; `pnpm db:migrate` applied 67 migrations,
  including the merged JobSource, Job, and JobObservation tables. The temporary
  worktree-specific Compose image, port binding, and volume changes have since
  been reverted.
- 2026-11-14: Reverted the temporary `.env.example` and Getting Started edits;
  Compose and setup docs now remain unchanged from upstream.
- 2026-11-14: This checkpoint implements only GitHub Markdown/JSON feeds.
  Jobright, direct ATS, and company API adapters are still required for #652.

## Open questions

- Final approval of the Cron-to-API source snapshot/listing contract with the
  owner of #649.
- Jobright, direct ATS, and company API adapter implementation and verification
  remain after the GitHub-feed slice.

## Task list

- [x] Confirm source-adapter-only scope and provisional handoff.
- [x] Approve observable test cases.
- [x] Implement the GitHub feed registry and Markdown/JSON parsing against the
      merged schema contract.
- [ ] Implement Jobright, direct ATS, and company API adapters.
- [ ] Coordinate the raw observation contract with #649.

## Validation / commands

- `pnpm install --frozen-lockfile`: completed; workspace reports Node 22.23.1
  while the repo requests Node `^24.22.1`.
- `pnpm forge:feature career-job-sources "Career job source adapters"`:
  completed.
- `git rebase origin/main`: completed; branch now includes merged #647 and #648.
- `pnpm db:migrate`: passed against local PostgreSQL 16 at port 5432; 67
  migrations applied.
- `pnpm --filter=@forge/db test -- src/tests/career-schema.test.ts src/tests/career-migration.test.ts`:
  passed (7 tests).
- Cron GitHub feed test, typecheck, and lint: passed after schema adaptation.
- Full Cron tests: passed (68 tests); focused GitHub-feed tests: passed (6).
- Scoped ESLint for the two changed Cron TypeScript files, with a 3 GB Node
  heap cap: passed.
- Repository-wide `pnpm verify:precommit` and default-heap ESLint were
  interrupted by Node heap exhaustion; no further concurrent or repo-wide
  checks will be run in this environment.

## Links

- PRs:
- Issues: #633, #652, #649
- Discord/thread context:
