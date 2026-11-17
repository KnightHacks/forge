# Career Job Router Status

Current phase: PR 1 implemented, validated locally and opened as a draft PR.

## Decision log

- 2026-11-16: Kevin split #651. PR 1 is job search, job and company views,
  applications with history, people in process and privacy. Ping preferences
  and digest opt-ins wait for #650.
- 2026-11-16: New `jobBoard` router instead of extending `career`.
- 2026-11-16: Stage changes take an optional date, not in the future, defaulting
  to the time of saving. Timeline entries are not editable.
- 2026-11-16: Community views show name, profile picture, Discord username,
  stage, round and interview label.
- Implementation choices to confirm in review: no new officer procedure because
  `discordConfig.list` and `discordConfig.update` already cover the Career keys;
  a missing member profile is `FORBIDDEN`; location filters widen each other;
  the removal audit event carries no job details.

## Open questions

- Should `saved` applications be visible to other members?
- Confirm location filter behavior with the #655 owner.

## Task list

- [x] Reverse-prompt scope and decisions with Kevin.
- [x] Extend application validators with interview label and stage date.
- [x] Add the `jobBoard` router, access guard, search, community projection and
      application mutations.
- [x] Add validator, integration and contract tests; update the API surface snapshot.
- [x] Commit and open the draft PR for Kevin's review.
- [ ] PR 2: ping preferences and digest opt-ins after #650.

## Validation / commands

- `pnpm --filter @forge/validators exec vitest run src/tests/audit.test.ts src/tests/job-board.test.ts`:
  39 passed.
- `pnpm with-env vitest run src/tests/integration/job-board.test.ts src/tests/job-board src/tests/root/api-surface.test.ts src/tests/audit/coverage.test.ts`
  in `packages/api` with `NODE_ENV=test`: 19 passed, including 5 integration
  tests on disposable local PostgreSQL. Snapshot gained the eight `jobBoard.*` paths.
- `src/tests/root/version-pins.test.ts` fails on this checkout because
  `pnpm-lock.yaml` has no `overrides:` block; the lockfile is unchanged by this work.
- Root `pnpm lint`: passed, 31 tasks, warnings only. Root `pnpm typecheck`:
  passed, 33 tasks.
- Root `pnpm format`: fails in 24 packages on this Windows checkout's CRLF line
  endings in untouched files (same limitation as #647). A Prettier check of
  every file changed here passes.

## Links

- PRs:
- Issues: https://github.com/KnightHacks/forge/issues/651,
  https://github.com/KnightHacks/forge/issues/633
- Discord/thread context:
