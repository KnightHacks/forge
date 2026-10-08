# Email Delivery Reliability Status

Current phase: Recipient-lock capacity fix validated locally; hosted checks tracked in PR #599. Broader E2E failures remain documented.

## Decisions

- 2026-10-08: Created exact branch `emailfix` from origin/main at the user's request.
- User explicitly selected directors@knighthacks.org for the first pair, then the user-selected replacement mailbox for the larger batch. The directors test-list unsubscribe was left intact as requested.
- Review found a 536-message shortfall in reported counts across 11 completed campaigns in the preceding 14 days: 530 logged temporary SMTP errors and six consistent with overwritten subscriber data/membership. Production snapshots and recipient details are not committed.
- Use cross-process per-recipient locks and existing lifecycle columns. Preserve confirmation and suppression behavior. No automatic historical resend or SMTP configuration mutation.
- The larger live test exposed one provider over-count. Flag excessive send counts for investigation without claiming duplicate inbox delivery.
- The user's screenshot matches live campaign 2704, which selected Listmonk's default template 1. That template adds a white card, gray background, and 30px gutters around an already complete Forge HTML document. Default Forge HTML campaigns now use a dedicated content-only wrapper; missing unsubscribe/browser-view links and tracking stay inside the document. Explicit custom provider wrappers remain supported.
- The email E2E test previously deselected its only seeded member, leaving an empty audience on a fresh database. Add a second synthetic member so the schedule/cancel test is self-contained.
- PR review confirmed that overlapping campaigns could exhaust the process's ten-connection database pool while awaiting Listmonk. Add one shared four-slot FIFO limiter inside `withEmailRecipientLock`, before transaction acquisition. Keep advisory locks and provider behavior intact; release capacity on every transaction outcome.

## Tasks

- [x] Trace live evidence and reproduce defects offline.
- [x] Record scope, constraints, and regression cases.
- [x] Implement provider coordination and lifecycle corrections.
- [x] Validate with regression tests and affected consumers.
- [x] Send and inspect the first authorized live test pair.
- [x] Record validation and rollout limitations.
- [x] Complete 100 live test campaigns to the replacement address.
- [x] Complete SMTP capture and uniqueness checks for the 10,000-message local test.

## Open questions

- Gmail's exact cause of the temporary SMTP failures is not established.
- The first two test messages reached the directors inbox (confirmed by the user). A subsequent suppression check stopped additional sends there. The user provided a replacement address and requested substantially more testing.
- Listmonk reported two sends for live test 070/100, while the user confirmed one inbox copy and the logs showed one campaign start. The exact provider counter race is not established; do not interpret the aggregate 101 count as 101 delivered emails.
- Aggregate inbox receipt of all 100 messages has not been independently verified.

## Validation

- `pnpm --filter=@forge/email test`: 98 passed.
- `DATABASE_URL=<disposable-loopback-test-connection> pnpm --filter=@forge/api test -- src/tests/email`: 37 passed, including nine actual PostgreSQL delivery/locking regression cases. The harness creates and drops isolated databases; it does not use production data.
- `pnpm --filter=@forge/blade test -- src/tests/admin/email-portal-workspace.test.tsx src/tests/admin/email-send-status.test.ts`: 14 passed.
- `pnpm format`: passed, 24 tasks.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: passed, 31 tasks; warnings remain. An earlier single root ESLint process exhausted its default heap; the workspace lint run completed successfully.
- `pnpm typecheck`: passed, 33 tasks, including affected shared-package consumers.
- `pnpm analyze:react:changed`: passed.
- Playwright on a disposable local database with fake email mode: desktop and 320px mobile screenshots inspected. Preparation failures retain Retry; failures after delivery started hide it. Details display the provider sent count and missing-recipient explanation. Screenshots are local artifacts under `output/playwright/emailfix/`.
- Live campaigns 2601 and 2602: created concurrently through the updated provider and PostgreSQL lock. Both subscriber namespaces and list memberships survived; both finished with one sent of one and zero reported bounces. User confirmed receipt of both.
- Live campaigns 2603–2702: 100 one-recipient campaigns to the user-selected replacement mailbox. Thirteen batches (initially ten at a time, then five), verifying accumulated subscriber namespaces and memberships before every start. All 100 finished; 99 reported one send and campaign 2670 reported two for one recipient. Zero reported bounces and no send/template errors in the retained test logs. The run stopped on the anomalous count, inspected logs and received the user's one-copy confirmation, then completed the remaining 30. Local results: `output/emailfix-live-100.json`.
- Local volume test: 100 campaigns sharing 100 synthetic recipients, through actual `runEmailDeliveryCycle`, PostgreSQL advisory locks, Listmonk v6.0.0, and Mailpit v1.27.10. Two delivery-cycle invocations ran concurrently each round. All 10,000 expected SMTP messages were captured exactly once, with matching subject personalization and recipient addresses. All 10,000 subscriber namespaces and list memberships survived. All 100 queue records completed with correct counts in seven cycles (34 seconds on this local setup). Disposable containers, networks, and the Forge test database were removed. Results: `output/emailfix-load-10000.json`.
- The local harness needed setup corrections for Docker networking, provider API authentication/settings, connection pooling, and exclusion of Listmonk's seeded demo campaign from campaign totals. The final complete capture validation passed; these corrections did not change production configuration.

## Limitations and rollout

Changes remain on the user-requested `emailfix` branch. [PR #599](https://github.com/KnightHacks/forge/pull/599) runs hosted CI; no deployment or merge has occurred. Deploy API/Blade and cron together so all subscriber writers participate in the same lock. Production SMTP settings and historical sends were not changed. A live test to one mailbox does not establish deliverability across other mailbox providers or resolve Gmail's historical temporary errors. Bounce processing remains disabled in the inspected provider configuration, so zero reported bounces is not independent delivery confirmation.

## Wrapper regression and latest verification

- Created Forge-owned provider template 25 without changing the provider default or any other template. Empty test campaign 2705 used the pre-event content from 2704 through the updated gateway. Its provider preview has one body, no default card/gutters, and working provider-generated footer URLs. Mobile and desktop previews inspected under `output/playwright/email-wrapper/`.
- Sent exactly one accepted provider test to directors@knighthacks.org at 2026-10-08 06:06:57 UTC, subject `[TEST] Forge emailfix — pre-event email without white border`. Its subscriber/list state remained unchanged, including the existing unsubscribe. Two earlier requests were rejected before sending because the provider test endpoint requires an explicit messenger. No campaign was started or original audience resent. Inbox rendering still requires recipient confirmation.
- After the send, the draft preview was refined to retain translated footer labels and prevent its tracking pixel from adding an empty line. No second email was sent.
- Final full test run: 3,011 tests passed across 13 suites, including 102 email tests and 1,096 API tests. Root format, lint, workspace lint, typecheck (33 tasks), React analysis, and the final complete production build (21 tasks) passed after the wrapper/test-fixture changes. Lint warnings remain. Frozen-lockfile installation completed with pnpm 9.12.1 and CI's Node 25.6.1; no additional dependency changes were needed.
- Initial exhaustive checks exhausted local disk, interrupting tests/builds and leaving Docker storage read-only. Removed regenerable caches, restarted Docker, preserved the existing `forge-db-1`, and recreated only the disposable verification database. Frozen-lockfile install, migration generation, fresh migration, repeated migration, and all 13 Dockerfile static checks passed. No dependency or migration changes were needed.
- Full Blade browser run: 63 passed, 19 failed, 31 did not run. The corrected email fixture subsequently passed its complete create/publish/schedule/cancel flow on the disposable database. Preserved full-run failures under `output/emailfix-verification/blade-full/`. Other failures include resume storage prerequisites, stale UI expectations, responsive flows, and eight visual baselines. The 2026 and Club E2E commands also incorrectly discover Vitest files because they have no Playwright configuration. Guild had three passing tests and one failure because its team-filter test requires seeded team profiles. These unrelated E2E problems remain out of scope; do not call the entire repository green.
- Four archive Docker images built and all 19 corresponding E2E tests passed. Other legacy E2E scripts complete with no tests. All 13 Dockerfiles passed static BuildKit checks; a full build of every deployment image was not performed.
- Hosted CI, including the production-snapshot upgrade smoke, is tracked in [PR #599 checks](https://github.com/KnightHacks/forge/pull/599/checks). The production migration/deployment job is gated to main and has not been run by this task. Logs and command results are local in `output/emailfix-verification/`.

## Recipient-lock capacity review

- Reproduced the review before the fix: 60 concurrent writes caused 50 calls to wait in the database pool; the unit test observed all 12 callers acquire transactions immediately.
- Added six regression cases: real PostgreSQL headroom under three overlapping 20-recipient batches, aggregate FIFO capacity, and capacity recovery after checkout, advisory-lock, provider, and commit errors. All 43 API email tests passed with the limiter.
- Previous commit `f59d0908` passed all hosted CI jobs, including build, tests, typecheck, lint, format, migration checks, fresh migration, database tests, production-snapshot upgrade smoke, and CodeQL. Production migration was correctly skipped for the PR. For this follow-up, root format, lint, typecheck (33 tasks), React analysis, all API/Blade/cron tests, and the full production build passed. New hosted results are tracked in PR #599 checks.

## Links

[Issue #598](https://github.com/KnightHacks/forge/issues/598). [PR #599](https://github.com/KnightHacks/forge/pull/599) runs the explicitly requested hosted CI checks.

Research references: [Listmonk campaign API](https://listmonk.app/docs/apis/campaigns/), [Listmonk v6 campaign counters](https://github.com/knadh/listmonk/blob/v6.0.0/internal/manager/manager.go), [Google SMTP error reference](https://knowledge.workspace.google.com/admin/support/troubleshooting/about-smtp-error-messages), and [Google Workspace sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace). The counter anomaly's exact cause remains unconfirmed; no provider upgrade was performed.
