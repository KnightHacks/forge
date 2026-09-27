# Forms Delivery and Action Feedback Status

Current phase: Callback parity refinement verified and published for review

## Decisions

- 2026-09-05: Chris requested investigation and durable planning for Discord
  recruiting failure, callback dialog overflow/clarity, submission receipts,
  and response deletion feedback. Preserve the supplied screenshots for the PR.
- New screenshot evidence confirms Discord rejects the nonce; it replaces
  missing configuration as the explanation for these attempted executions.
- Proposed core PR owns Blade forms UX and the shared API nonce repair. Cron
  is a verification/deployment consumer.
- Work branch: `codex/forms-delivery-feedback`, rebased on 2026-09-05 onto
  current `origin/main` at `ec5e26ec` before publication.
- Chris approved starting the proposed implementation order with mobile support.
- Core nonce repair, callback editor, submission receipt, deletion feedback and
  retry outcome feedback are implemented. Automated tests used only synthetic
  local/disposable PostgreSQL data and cleaned up their fixtures. No production
  access, real callback invocation, or Discord send occurred.
- Dylan confirmed the legacy generic mapper is the intended model: registered
  tRPC procedures expose inputs, and admins map each input from one question,
  one respondent field, or a fixed value. Question sources cannot be reused.
- Dylan confirmed structured recruiting parity and Discord role assignment are
  part of this PR. Recruiting uses the six legacy fields, configured director
  role, and team color. Discord role assignment uses a fixed Discord role ID.
- Auth user ID and Discord user ID are separate sources. The latter is the
  Discord snowflake used for Discord actions.
- A disabled callback with current, complete mappings can be enabled directly.
  Legacy mappings must still be edited and resaved before activation.
- Declared callback `questionTypes` are the procedure owner's compatibility
  contract. The callback schema still validates the submitted answer before
  execution, instead of rejecting a mapping with an arbitrary sample value.

## Ordered work

- [x] Inspect current code and user evidence; correct earlier hypotheses.
- [x] Preserve screenshots and create investigation/spec/SRD/test-case bundle.
- [x] Measure the real helper's nonce length and run focused existing tests.
- [x] Approve core PR and callback parity refinement.
- [x] Reproduce provider-contract failure and overflow/interaction bugs with
      tests that exercise the actual implementation boundary.
- [x] Repair nonce, callback editor, receipt transition, and deletion feedback.
- [x] Verify isolated negative cases, unavailable actions, all receipt modes,
      retry outcomes, and mobile/desktop component layout.
- [x] Run root checks and changed React analysis; preserve exact blockers below.
- [x] Restore local dependencies and PostgreSQL; pass the full automated gate
      and targeted authenticated forms E2E.
- [x] Complete final diff and responsive browser review.
- [x] Prepare and publish PR text with before/after evidence and a deployment
      checklist after Dylan authorized the update.
- [x] Replace hard-coded callbacks with metadata-discovered tRPC procedures.
- [x] Restore the per-input mapping UI and structured recruiting/role actions.
- [x] Add regression coverage, rerun all gates, and capture new screenshots.
- [x] Push the rebased branch and update the pull request with the behavior
      summary and attached screenshots.
- [x] Restore explicit callback re-enabling and accept graduation-year question
      mappings declared compatible by the recruiting procedure.
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
  now passes 73 tests in 11 files, including actual enqueue/dispatcher tests
  using mocked database and Discord boundaries.
- Blade forms suite: 132 tests passed in 20 files after rebasing onto current
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
- React analyzer: 12 tracked changed TSX files, 8 components, zero failures.
- `pnpm format`: passed, 24 tasks. `git diff --check`: passed.
- Repository lint without stale ESLint caches: 31 tasks passed with warnings and
  zero errors. The normal cached run had replayed unresolved-type errors created
  before dependencies were restored.
- `pnpm typecheck`: 33 tasks passed. The Blade production build and its 13
  dependencies passed. A repository-wide build still reproduces unrelated
  `_global-error` prerender failures in the archived 2023 and 2024 apps.
- `pnpm test`: 29 tasks passed on the second full run. The first run completed
  all 136 database assertions but timed out dropping one disposable database;
  that file passed 10/10 in isolation before the successful full rerun.
- Extended `forms-platform.spec.ts` to assert receipt URL/refresh and deletion
  toast/count. The targeted authenticated journey passed 1/1 in 26.5 seconds
  against localhost PostgreSQL. Earlier timeouts came from Playwright reusing a
  stale unresponsive Node 24 server on port 3100; a fresh Node 25 server passed.
- After rebasing, the API forms suite passed 73 tests in 11 files, the Blade
  forms suite passed 132 tests in 20 files, the Discord configuration suite
  passed 10 tests, and root typecheck passed all 33 tasks.
- The follow-up callback regressions pass: API forms 75 tests in 12 files and
  Blade forms 135 tests in 20 files. Focused tests cover enabling with saved
  mappings, constrained graduation-year inputs, and rejected undeclared
  question types. Root typecheck passes all 33 tasks after refreshing unchanged
  local package declarations; targeted lint has zero errors, and changed React
  analysis reports zero failures. Root format passes all 24 tasks. Root lint
  still reproduces unrelated unresolved-type errors in the archived 2020/2021
  apps and the 2026 app when Turbo invokes the local Node 24 runtime.
- The authenticated admin mapping page was captured in headed Chrome at desktop
  and mobile widths with zero console errors and zero horizontal overflow. Its
  synthetic database fixture was removed after capture.
- The feature-specific automated gate is green. Maintainer review and deployed
  delivery verification remain before merge.

## Next owner actions

1. Review the final PR diff and attached desktop/mobile callback screenshots.
2. After approved deployment, an authorized maintainer verifies matching
   Blade/Cron revisions and retries one retained NONCE_TYPE_TOO_LONG failure,
   without replaying all old responses.

## Links

- [Investigation and source evidence](./investigation.md)
- [Product scope](./spec.md)
- [Technical plan](./srd.md)
- [Acceptance tests](./test-cases.md)
- Existing baseline: [Forms and Event Feedback](../forms-and-event-feedback/spec.md)
- Tracking issue: [ChrisH0125/forge#1](https://github.com/ChrisH0125/forge/issues/1)
- Pull request: [KnightHacks/forge#533](https://github.com/KnightHacks/forge/pull/533)
- Follow-up fixes: [KnightHacks/forge#540](https://github.com/KnightHacks/forge/pull/540)
