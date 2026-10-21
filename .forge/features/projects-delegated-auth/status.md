# P1 status

Phase: P1 READY for reviewable PR; refresh concurrency remediation and local verification complete.
Branch: `auth/projects-delegated-auth`.

The implementation request approves the supplied P1 design, fixed redirects, schema/migration, and auth regression coverage (G1 and relevant G4). The subsequent instruction limits work to local changes and excludes infrastructure changes. Registration/enabling (G5), browser integration, and deployment remain outside scope. The earlier untracked `projects-archive` planning bundle is preserved unchanged.

## Implementation

- [x] Read engineering guidance and inspect affected consumers.
- [x] Create task branch and feature bundle.
- [x] Add constrained client kinds and cascading kind foreign keys to the three portal tables.
- [x] Generate migration 0064 and snapshot; order safeguards before relaxing event-ID nullability. No registration or enablement SQL.
- [x] Support typed Projects sessions in the existing service/store and verify Projects parent-session validity during exchange.
- [x] Apply exact authorization/logout redirects and exclude Projects from hacker context construction before token lookup or upload body access.
- [x] Add unit, route, schema, audience-isolation, and database regression cases.
- [x] Complete isolated PostgreSQL lifecycle, constraint, fresh migration, and synthetic existing-record upgrade verification. No deployed-data snapshot was used.
- [x] Finish root gates and final diff review.

The SDK, annual site, credential-history table, token/refresh/revoke HTTP routes, main Blade tRPC, and cleanup implementation are unchanged. Event provisioning still uses a required hackathon ID and the default event kind. Existing event-context test fixtures now specify that kind explicitly.

## Validation

Passed local checks:

- Auth primitives/service: 24 tests. Covers both kinds, fixed redirects, PKCE, replay, rotation/grace, absolute expiry, stale-token revocation, disabled clients, registered audience mismatch, and inactive parent sessions.
- Hacker API and printing unit regressions: 51 tests, including Projects rejection from anonymous reads and mutations.
- Blade auth/upload/printing routes: 18 tests, including rejection before upload bodies are read and use of the authenticated Blade identity for Projects authorization.
- SDK: all 57 tests, including the Next adapter.
- DB schema metadata: 7 tests. Existing Hacker SDK migration contract: 4 tests.
- Root `pnpm format`: passed, 24 tasks.
- `git diff --check` and feature-document formatting: passed.
- Migration snapshot inspection: only portal client, authorization code, and session tables changed.

Final verification used a temporary PostgreSQL 18.6 cluster bound to `127.0.0.1:55439`, with Forge's disposable-database harness. All test databases were disposable; the cluster was stopped after verification. No remote database or system service was changed.

- DB migration/schema suites: 15 passed across 3 files. Fresh migrations and the upgrade through 0063 to 0064 passed, preserving synthetic event records and credential history. Invalid scope/registration/FK combinations and deletion cascades passed.
- Auth primitives/service/store: 39 passed, 3 intentionally skipped across 3 files. Skips are two Projects origin-cutover cases excluded by its fixed origin and one Projects-specific parent-expiry case excluded for event clients. Projects lifecycle setup requires no Hackathon, Member, or Hacker record.
- Hacker API, event configuration/lifecycle, map, point store, and printing: 115 passed across 16 files.
- SDK: 57 passed across 7 files. Blade routes/uploads/printing: 18 passed across 5 files.
- Total selected regression checks: 244 passed, 3 intentional skips. Logs: `/tmp/p1-review-{db,auth,api,sdk,blade}.log`.

Final root gates:

- `NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck --concurrency=1`: passed, 33 tasks, including Blade, 2026, the API, and the cleanup consumer.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm exec turbo run lint --continue --concurrency=1 -- --cache --cache-location .cache/.eslintcache`: passed, 31 tasks, warnings only. This runs the root lint tasks serially with the same ESLint arguments as `pnpm lint`.
- `pnpm format`: passed again after the final edits, 24 tasks.

Initial root lint/typecheck attempts exhausted memory or were interrupted. The serial reruns completed successfully. Lint identified redundant downstream kind comparisons after the context had already narrowed to event-only types; those were removed, and the isolation tests passed again. The final lint run also rebuilt the API successfully. One attempt to pass concurrency through the root lint script forwarded it to ESLint as a file pattern; the direct Turbo invocation above corrected the argument placement. No React UI changes require the React analyzer. No full application production build, commit, push, registration, or deployment was performed. Package builds invoked by the root checks are local TypeScript builds.

## Prior review findings (before remediation)

Prior verdict: **BLOCKED**. Independent security, database, and regression source reviews found no introduced privilege escalation, redirect, audience-isolation, or schema defect. This was a source/diff review with local reproduction, not a completed plugin-managed security scan.

**Medium: inherited concurrent-refresh race.** In `packages/auth/src/portal-session-store.ts:219`, the joined credential read locks only the session row (`:245`). A waiting refresh can observe the updated session token hash with stale credential `rotatedAt`, then take the family-revocation branch (`:254–271`) instead of returning the retryable grace response. This logic is unchanged by P1, but violates P1's explicit concurrent-refresh contract.

A local probe held the session row lock, started two refreshes using the same credential, confirmed both were waiting on locks, then released the lock. All six trials (three Projects, three event) returned one successful rotation and one `SESSION_EXPIRED`; authentication with the newly issued token also returned `SESSION_EXPIRED`. The existing integration grace test invokes requests sequentially and misses this overlap. Probe and evidence: `/tmp/p1-review-refresh-race.mts` and `/tmp/p1-review-refresh-race.log`.

Required changes from the prior review (subsequently approved by the refresh-fix request):

1. Make refresh rotation read credential rotation state consistently after acquiring the required locks, retaining historical-token revocation and the ten-second grace contract.
2. Add deterministic overlapping-refresh PostgreSQL regressions for both client kinds. Require one rotation, one retryable response, and a usable winning token; retain replay-after-grace revocation checks.
3. Rerun auth database and affected consumer regressions plus root gates after remediation, then reassess readiness.

Nonblocking findings:

- Two introduced lint warnings: `packages/db/src/tests/projects-auth-migration.test.ts:14` (`max-lines-per-function`) and `apps/blade/src/tests/hacker-portal-projects-upload.test.ts:18` (`consistent-type-imports`). Other warnings on changed files preexist; auth test callback-size warnings grew but already existed at HEAD. Database tests also emit the pg deprecation warning for concurrent queries on one client.
- Migration 0064 reserves `client_id = 'projects'`. An existing event client using that previously legal ID would prevent migration. Synthetic upgrade compatibility passed; an authorized predeployment collision check is still necessary. No shared database was queried.
- Optional coverage: live-store wrong-audience checks with two registered clients, and explicit Projects rejection tests for resume GET / printing HEAD (both already use the reviewed guard).

G1 and relevant G4 implementation authorization remain recorded above. The subsequent refresh-fix request explicitly authorizes narrow remediation and test-warning cleanup. G5 registration/enabling and deployment remain separate approvals. Rollback remains disable Projects, revoke families, invalidate codes, and retain the expanded schema; restoring NOT NULL is not the default rollback.

Recommended next PR: the scoped P1 backend change after approved refresh-race remediation and repeat verification. P2 browser/SDK integration follows separately. The review itself made no remote or infrastructure changes; the separately requested commit and branch push follow after this verification record.

PR/issue: none supplied or created. Rollout and rollback requirements are recorded in [srd.md](srd.md).

## Refresh concurrency remediation

The user approved fixing the confirmed race for both client kinds, without schema or security-contract changes. The store retains its existing session-row lock and reads historical `rotatedAt` in a fresh statement after acquiring that lock when the supplied hash is no longer current. This avoids using a credential snapshot taken before the winning transaction committed. Audience, expiry, token history, revocation, and ten-second grace decisions are unchanged. An independent read-only review found no remaining blocker or new lock-order risk.

Changed files for this remediation:

- `packages/auth/src/portal-session-store.ts`: fresh rotation-state read under the existing session lock.
- `packages/auth/src/tests/portal-session-store.integration.test.ts` and `portal-refresh-concurrency.ts`: replace the sequential grace test with a parameterized PostgreSQL overlap regression and a test-only lock barrier for event and Projects clients.
- `packages/db/src/tests/projects-auth-migration.test.ts`: extract fixture helpers to remove the new function-length lint warning; SQL and assertions unchanged.
- `apps/blade/src/tests/hacker-portal-projects-upload.test.ts`: explicit type import removes the new import-style lint warning.
- This status document.

The new tests first failed against the old implementation for both client kinds (`SESSION_EXPIRED` instead of `REFRESH_RETRY`). After the fix, both pass: two transactions demonstrably wait on locks before release, one rotates, the other receives `REFRESH_RETRY`, and the winning access and refresh tokens remain usable. Reuse at exactly 10,000 ms remains retryable; reuse at 10,001 ms revokes the family. The original six-trial probe now passes all six trials (three per kind), with usable winning tokens.

Post-fix regression results: auth 39 passed / 3 intentional skips, DB 15 passed, API 115 passed, SDK 57 passed, Blade 18 passed: **244 passed, 3 intentional skips**. The total is unchanged because the concurrent tests replace the sequential grace tests for both kinds. Fresh and synthetic-upgrade migration tests were rerun; no migration changed. Logs: `/tmp/p1-fix-{before,auth,db,api,sdk,blade,probe}.log`. Final quality gates:

- `pnpm format`: passed, 24 tasks.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm exec turbo run lint --continue --concurrency=1 -- --cache --cache-location .cache/.eslintcache`: passed, 31 tasks. Existing warnings remain; both requested new warnings are resolved. The existing auth integration callback-length warning remains, without a new file-length warning.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck --concurrency=1`: passed, 33 tasks. After the final test-only helper extraction, `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @forge/auth typecheck` also passed.
- `git diff --check` and feature-status Prettier check: passed.

Logs: `/tmp/p1-fix-format-final.log`, `/tmp/p1-fix-lint-final.log`, `/tmp/p1-fix-typecheck.log`, and `/tmp/p1-fix-auth-typecheck.log`. The first lint run caught redundant type guards in the new regression, which were removed before the successful rerun. The lint cleanup reviewer initially exhausted the default Node heap; the 4 GB rerun passed. Existing pg concurrent-query deprecation warnings remain in unrelated migration/integration fixtures.

Final verdict: **READY for a reviewable P1 PR**. The confirmed blocker is resolved; no remaining local implementation blocker was identified. Migration compatibility evidence remains synthetic, so the authorized predeployment `projects` client-ID collision check is still required. Registration/enabling and deployment require their separate approvals; P2 browser integration remains out of scope. No full production app build was run. PostgreSQL was local and isolated and is stopped. This remediation added no schema changes and performed no client registration, deployment, or infrastructure changes.
