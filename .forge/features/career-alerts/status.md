# Career Job Alerts and Digests Status

Phase 4 is at the local review and publication check-in.

Branch `stevin/career-alerts-650` starts from upstream `main` at `98f3f9d3`.

## Decisions recorded on November 23, 2026

- Accepted. Any matching preference on the job's track can trigger one ping.
  A member with no matching preferences gets no targeted ping.
- Accepted. Use city, U.S. remote, and Other for the first release. Defer
  a dedicated statewide preference.
- Verified on upstream. Use the merged preference schema, Member digest flags,
  validators, and officer-configured role keys.
- Accepted scope. #650 delivers backend services. #651 exposes the member
  procedures and #654 calls the server functions from cron.

## Phases and check-ins

| Phase                             | Work                                                                                                                                                             | Check-in                                                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Plan and confirm scope         | Record the product choices, compare the plan against upstream, confirm which ticket owns the service, member API, and cron work, and draft the acceptance cases. | Review this bundle with Stevin before test generation or implementation. Confirm the scope and the examples in the test cases.                              |
| 2. Ping preferences and matching  | Implement member-scoped preference storage, the pure matcher, and Discord ID resolution. Run the focused preference and matcher tests.                           | Walk through the Google/Orlando example, custom location matching, ownership, and one ping per person. Share test results and the changed files.            |
| 3. Digest choices and role repair | Store per-track choices, sync Discord roles after saving, and build a repair service using a fake Discord gateway for verification.                              | Show a normal opt-in, a Discord failure with the saved choice intact, and a repair example. Record the officer confirmation still needed before activation. |
| 4. Verify and prepare the PR      | Verify shared imports, run focused and pre-commit checks, review the diff, and prepare the PR summary and #651/#654 handoff locally.                             | Review the final diff, checks, and open items with Stevin before any remote publication.                                                                    |

Pause at each check-in. Resume the next phase after Stevin responds.

## Phase 2 delivery

- `alert-preferences.ts` lists, creates, updates, and removes member-owned
  targets using the merged database constraints. City targets use the Census
  lookup. Custom entries keep display text and a normalized key.
- `alert-matching.ts` applies the same-track matching rule. It checks each
  location, resolves eligible members to Discord user IDs, and deduplicates the
  recipients. The lookup returns an empty list when the job is missing.
- Tests cover P1, P2, M1, M2, and M3. Both test files are under
  `packages/api/src/tests/job-board/`. The integration suite checks that it is
  connected to the test database before writing fixtures.

## Phase 3 delivery

- `digest-subscriptions.ts` reads both choices and writes one track at a time.
  It commits the choice before calling Discord and returns the saved `enabled`
  value plus `roleSynced`. Retrying a choice can repair an earlier failure.
- Role repair completes the guild member scan, reads the saved choices, and
  applies the difference. A failed scan aborts repair. Individual role failures
  contribute to the returned counts and can be retried on a later run.
- Reused the guild member pager for the role management counts. The officer
  config catalog now lists both digest role consumers.
- D1–D4 ran against disposable PostgreSQL and fake Discord calls. The tests also
  verified the existing role management counts across multiple pages.

## Phase 4 delivery

- `@forge/api/job-alerts.server` exposes the recipient lookup and role repair.
  Verified both exports from the cron workspace. The separate entry point
  works alongside the ingestion export proposed in PR #672.
- Standard Forge review covered API behavior, package placement, and test
  quality. It identified the role configuration guard and shared Discord
  identity cases, now covered by D5 and D6. The default gateway test also
  verifies that a completed scan changes only the configured track role.
- The working diff and PR draft are ready for local review.

## Activation follow-ups

- #651 owns the signed-in member procedures. Before Discord role writes go
  live in #651 or #654, officers confirm the roles are distinct, dedicated
  to Career digests, and free of Discord permissions.
- #654 owns the delivery policy. Concurrent opt-outs can leave roles briefly
  stale after repair. Use saved consent to authorize mentions at send time
  and account for incomplete repair before any role mention.
- Publication requires the user's separate approval.

## Validation

- Compared the proposal with merged validators #658, role configuration
  #665, storage #666, and their current upstream implementation.
- Initialized the Forge feature bundle in a separate worktree.
- The generator succeeded under Node 22 with an engine warning. Confirmed that
  Forge's pinned Node 24.22.1 runtime is available through `fnm` for checks.
- On Node 24.22.1, `pnpm --filter @forge/api test src/tests/job-board
src/tests/career src/tests/root/api-surface.test.ts` passed 27 tests, including
  nine alert tests. The integration cases ran on a disposable PostgreSQL 16
  instance, which was shut down after the run.
- `pnpm --filter @forge/validators test src/tests/job-board.test.ts` passed
  30 tests. API and cron typechecks, the API build, and lint on the new API
  files passed.
- Phase 3 API validation passed 78 tests across the job board, role
  management, Career, Discord config, and API surface suites. The integration
  suites used disposable PostgreSQL 16 with fake Discord requests.
- All 48 utility tests passed, including the config consumer check. API and cron
  typechecks, the API dependency build, and formatting passed. Targeted lint had
  zero errors and retained one existing config test file-length warning.
- The final workspace pre-commit gate passed on Node 24.22.1. The focused
  API run passed 81 tests after the review fixes. The utility, validator,
  and cron suites passed 48, 380, and 62 tests respectively.
- The final full API suite passed all 1,242 tests across 152 files using
  disposable PostgreSQL 16 and test-only service settings. The earlier
  missing-storage-setting failure also reproduced on clean upstream.

## Links

- [Parent project #633](https://github.com/KnightHacks/forge/issues/633)
- [This work #650](https://github.com/KnightHacks/forge/issues/650)
- [Router PR #670](https://github.com/KnightHacks/forge/pull/670)
- [Ingestion PR #672](https://github.com/KnightHacks/forge/pull/672)
- [Discord delivery #654](https://github.com/KnightHacks/forge/issues/654)
- [Blade UI #656](https://github.com/KnightHacks/forge/issues/656)
