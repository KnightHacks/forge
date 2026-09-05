# Forms Delivery and Action Feedback Status

Current phase: Implementation and automated local validation complete; manual zoom review and production delivery verification remain

## Decisions

- 2026-09-05: Chris requested investigation and durable planning for Discord
  recruiting failure, callback dialog overflow/clarity, submission receipts,
  and response deletion feedback. Preserve the supplied screenshots for the PR.
- New screenshot evidence confirms Discord rejects the nonce; it replaces
  missing configuration as the explanation for these attempted executions.
- Proposed core PR owns Blade forms UX and the shared API nonce repair. Cron
  is a verification/deployment consumer. Historical team routing remains an
  explicit scope decision, not an assumed completed requirement.
- Work branch: `codex/forms-delivery-feedback`, rebased on 2026-09-05 from
  `1c1457e0` onto current `origin/main` at `f4436df1` before publication.
- Chris approved starting the proposed implementation order with mobile support.
- Core nonce repair, callback editor, submission receipt, deletion feedback and
  retry outcome feedback are implemented. Automated tests used only synthetic
  local/disposable PostgreSQL data and cleaned up their fixtures. No production
  access, real callback invocation, Discord send, branch push, or PR creation
  occurred. The tracking issue was created in Chris's fork.

## Ordered work

- [x] Inspect current code and user evidence; correct earlier hypotheses.
- [x] Preserve screenshots and create investigation/spec/SRD/test-case bundle.
- [x] Measure the real helper's nonce length and run focused existing tests.
- [x] Approve core PR; historical director mentions and summary expansion remain
      a separate open follow-up.
- [x] Reproduce provider-contract failure and overflow/interaction bugs with
      tests that exercise the actual implementation boundary.
- [x] Repair nonce, callback editor, receipt transition, and deletion feedback.
- [x] Verify isolated negative cases, unavailable actions, all receipt modes,
      retry outcomes, and mobile/desktop component layout.
- [x] Run root checks and changed React analysis; preserve exact blockers below.
- [x] Restore local dependencies and PostgreSQL; pass the full automated gate
      and targeted authenticated forms E2E.
- [ ] Check literal 200% browser zoom and complete formal review.
- [x] Prepare local PR text with before/after evidence and deployment checklist.
      External publication requires a subsequent request.
- [ ] Authorized maintainer validates one delivery after deploying matching
      Blade/Cron revisions. Do not replay historical responses automatically.

## Investigation baseline captured on 2026-09-05

- Real `formCallbackDeliveryNonce` called with a synthetic UUID via `tsx`:
  `{ nonceLength: 36, discordMaxLength: 25, violatesDiscordLimit: true }`.
- `pnpm --filter @forge/api test -- src/tests/forms/callbacks.test.ts src/tests/forms/responses.test.ts`:
  **27 tests passed**, 2 files.
- `pnpm --filter @forge/blade test -- src/tests/forms/generic-form-response-form.test.tsx src/tests/forms/generic-form-respondent.test.tsx src/tests/forms/form-responses-dashboard.test.tsx src/tests/forms/admin-form-builder-dialogs.test.tsx src/tests/forms/form-callback-mappings.test.ts`:
  **29 tests passed**, 5 files.
- These passing baseline tests do not establish correct provider payload or
  browser layout. No new regression test or end-to-end run occurred this phase.
- Documentation formatting passed; all local Markdown links resolve and all
  five preserved screenshots were verified byte-for-byte against attachments.

## Implementation verification

- Nonce regression failed at 36 > 25 before the fix. The full API forms suite
  now passes 67 tests in 11 files, including 7 actual enqueue/dispatcher tests
  using mocked database and Discord boundaries.
- Blade forms suite: 131 tests passed in 20 files after rebasing onto current
  `origin/main`. Covers pending submit,
  failure retention, each response mode, callback save/edit/permission states,
  deletion confirmation/failure, and accurate retry outcomes.
- Cron suite: 29 tests passed in 6 files. No cron process was started.
- Headed Chrome with real components and synthetic mocked data reproduced the
  old dialog at clientWidth 373 / scrollWidth 1412 on a 375px viewport.
  Updated dialog clientWidth equals scrollWidth at 320, 375, 768, and 1440px.
  Synthetic receipt navigation/refresh and mobile deletion also passed.
- Edge cases: 320x480 short viewport, 240-character unbroken question label at
  320px, and 720x450 reflow passed. The unbroken-label regression was reproduced
  first (scrollWidth 3245), then fixed and rechecked (scrollWidth 271).
- Mobile submission/deletion failures retained context. Rechecked synthetic
  answer text after receipt navigation and refresh. Inspect the preserved
  after screenshots in the pull request's Screenshots section.
- The synthetic browser checks isolate components rather than a deployed system.
  The authenticated local Next route is covered separately below. No real
  Discord behavior was tested.
- Restored dependencies from the unchanged lockfile and refreshed stale
  generated validator/UI declarations. No dependency declarations or lockfile
  were changed.
- React analyzer: 10 tracked changed TSX files, 8 components, zero failures.
- `pnpm format`: passed, 24 tasks. `git diff --check`: passed.
- Repository lint without stale ESLint caches: 31 tasks passed with warnings and
  zero errors. The normal cached run had replayed unresolved-type errors created
  before dependencies were restored.
- `pnpm typecheck`: 33 tasks passed. `pnpm build`: 21 tasks passed.
- `pnpm test`: 29 tasks passed on the second full run. The first run completed
  all 136 database assertions but timed out dropping one disposable database;
  that file passed 10/10 in isolation before the successful full rerun.
- Extended `forms-platform.spec.ts` to assert receipt URL/refresh and deletion
  toast/count. The targeted authenticated journey passed 1/1 in 26.5 seconds
  against localhost PostgreSQL. Earlier timeouts came from Playwright reusing a
  stale unresponsive Node 24 server on port 3100; a fresh Node 25 server passed.
- After rebasing, the API forms suite passed 69 tests in 11 files, Cron passed
  29 tests in 6 files, and root typecheck passed all 33 tasks.
- The automated gate is green. Formal human/CodeRabbit review and literal 200%
  browser zoom remain before merge readiness.

## Next owner actions

1. Check literal 200% browser zoom (720x450 reflow was tested, but is not an
   actual browser zoom setting) and review the final diff for scope.
2. Complete review and request publication separately. After approved deployment,
   an authorized maintainer verifies matching Blade/Cron revisions and retries
   one retained NONCE_TYPE_TOO_LONG failure, without replaying all old responses.

## Links

- [Investigation and source evidence](./investigation.md)
- [Product scope](./spec.md)
- [Technical plan](./srd.md)
- [Acceptance tests](./test-cases.md)
- Existing baseline: [Forms and Event Feedback](../forms-and-event-feedback/spec.md)
- Tracking issue: [ChrisH0125/forge#1](https://github.com/ChrisH0125/forge/issues/1)
- Draft pull request: [KnightHacks/forge#533](https://github.com/KnightHacks/forge/pull/533)
