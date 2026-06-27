# Member Dues Payment Status

Current phase: Implemented and validated

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-06-26: Human selected member dues payment as the next feature before the admin member dashboard because admin member management needs real dues status/history to build on.
- 2026-06-26: Dues are yearly membership dues, valid for the Knight Hacks school-year window from August 1 through the next August 1, regardless of when the member pays.
- 2026-06-26: Admins should choose when to roll dues forward instead of deleting old dues payment records. Reforge should retain dues history and avoid legacy's "clear all dues deletes all records" behavior.
- 2026-06-26: First payment amount remains code-configured at `$25` / `2500` cents. Admin price configuration is out of scope for the first slice unless reverse-prompting changes that.
- 2026-06-26: Member-facing payment should use Stripe's embedded Payment Element rather than redirect-only Checkout so Blade can keep the flow inside the current design system.
- 2026-06-26: Dues status should be displayed in school-year language, for example `Paid for 2026-2027`.
- 2026-06-26: Paying dues requires an authenticated user with a completed member profile.
- 2026-06-26: Member dashboard should show a dues status tag. Unpaid members should see an unpaid dues section that links to `/member/dues`.
- 2026-06-26: `/member/dues` should be a full payment page, not a dialog, so it can be linked from multiple surfaces.
- 2026-06-26: Dues year labeling should be dynamic from the August 1 through July 31 academic school year window, not a manually configured constant.
- 2026-06-26: Members should only see current dues status in this slice. Payment history is retained for future alumni/admin surfaces.
- 2026-06-26: Admin rollover and manual admin dues changes are deferred to later admin/member dashboard features.
- 2026-06-26: If a member pays between May 31 and July 31, `/member/dues` should warn that the new school year is close and they will need to pay again in the fall semester, without listing a specific date.
- 2026-06-26: Keep non-refundable payment copy in the member-facing payment UX.
- 2026-06-26: Calendar date determines the displayed academic school year and the May 31 through July 31 late-year warning. Admin-controlled active/stale state determines whether a dues record currently counts as paid.
- 2026-06-26: A stale dues payment for the current displayed academic year should be eligible to roll/bump forward to the next academic year rather than forcing duplicate payment history for the same stale current-year record. This needs SRD-level precision before implementation.
- 2026-06-26: Stripe payment options should be similar to legacy Blade, including card plus bank account behavior where practical.
- 2026-06-26: The member dashboard should avoid red/error styling for unpaid dues. Use neutral faded gray for unpaid and green for paid.
- 2026-06-26: Paid members who visit `/member/dues` should be routed back to `/member/dashboard` instead of seeing the payment page.
- 2026-06-26: After successful payment, `/member/dues` should show a short success state/dialog and route back to `/member/dashboard` after about five seconds.
- 2026-06-26: Use `active` for dues records that currently count toward paid status. The migration should default existing dues rows to `active = true` for backporting old dues data.
- 2026-06-26: Dues `year` should mean the academic school-year start year, for example `2026` for `2026-2027`.
- 2026-06-26: Stale current-year dues bumping should only happen after Stripe succeeds, not when the member merely opens or starts `/member/dues`.
- 2026-06-26: If an active dues record exists for the current academic school year, the member is paid. If only a stale record exists, the member is unpaid and can pay again.
- 2026-06-26: The late-year warning should be a dialog on `/member/dues` entry with dismiss and return-home actions, not a permanent warning card.
- 2026-06-26: Current `knight_hacks_dues_payment` only has `id`, `member_id`, `amount`, `payment_date`, and `year`, with a unique constraint on `(member_id, year)`. It does not currently store a Stripe PaymentIntent id.
- 2026-06-26: Legacy/current constants are mixed: `MEMBERSHIP_PRICE = 2500`, while manual admin dues used `DUES_PAYMENT = 25`. Reforge should standardize new Stripe dues writes around cents and explicitly decide whether to normalize historical `25` rows.
- 2026-06-26: Implementation default: normalize legacy/manual `amount = 25` rows to `2500` during migration so dues history uses cents consistently.
- 2026-06-26: Implementation default: add nullable unique `stripePaymentIntentId` for Stripe idempotency while keeping legacy/manual rows valid with null.
- 2026-06-26: Stale current-year dues are preserved as history. A new payment targets the next academic start year instead of mutating the stale row or deleting history.
- 2026-06-26: Automated E2E tests may use a deterministic test-payment button in Blade E2E mode. Unit/API tests still cover Stripe PaymentIntent creation, retrieval, metadata, and error handling.
- 2026-06-27: `/member/dues` now creates the Stripe PaymentIntent server-side in normal mode and passes the initial `clientSecret` into the client component, with a visible retryable setup error fallback instead of an indefinite skeleton.
- 2026-06-26: Coverage hardening closed every partial test-artifact mapping. Payment ownership now validates both authenticated user and member metadata before recording, repeated webhook delivery exercises the real idempotent helper, and stale dues history is verified through the browser and database together.
- 2026-06-27: Restored the complete implementation from stash `wip: member dues payment before main fix`; the source stash remains intact as a backup.
- 2026-06-27: Audit fixed a confirmation-boundary gap: processing PaymentIntents now require the same member/user metadata ownership check as succeeded PaymentIntents.
- 2026-06-27: Audit found that the app does not persist or reuse an in-progress PaymentIntent. This is unsafe with US bank account payments because ACH can remain processing for multiple business days while a page reload can create another PaymentIntent. Human decision required: make the first slice card-only, or add durable payment-attempt state and reuse.
- 2026-06-27: Human approved dropping ACH/bank transfer from the first slice. Stripe PaymentIntents are card-only, avoiding delayed-payment duplicate-attempt risk without expanding the schema.
- 2026-06-27: Human requested a visible `5, 4, 3, 2, 1` success countdown and an action to return to the dashboard before the automatic redirect.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approved implementation by asking to continue with implementation prompt.
- [x] Implement DB schema and migration.
- [x] Implement dues validators/helpers.
- [x] Implement dues API/payment recording and Stripe webhook.
- [x] Implement Blade dashboard and `/member/dues` UI.
- [x] Implement all test cases.
- [x] Run targeted validation and Playwright verification.
- [x] Re-audit all 22 approved test cases and close every partial coverage gap.
- [x] Restore the complete stashed implementation without dropping the backup stash.
- [x] Re-run unit, typecheck, lint, formatting, and push-gate checks on the restored work.
- [x] Require ownership verification before returning processing PaymentIntent state.
- [x] Resolve and implement the card-only vs. durable bank-payment-attempt decision.
- [x] Add a visible five-second success countdown and immediate dashboard action.
- [x] Re-run Blade E2E after the separate Blade dev server releases the Next.js development lock.

## Validation / commands

- 2026-06-26: `pnpm prettier --write .forge/features/member-dues-payment/spec.md .forge/features/member-dues-payment/status.md`: passed.
- 2026-06-26: `pnpm --filter=@forge/api test`: passed before dues changes; baseline confirmed existing tests are green.
- 2026-06-26: `pnpm db:generate`: passed and generated `packages/db/drizzle/0010_silent_toxin.sql`; migration manually augmented to normalize legacy `amount = 25` rows to `2500`.
- 2026-06-26: `pnpm db:migrate`: passed.
- 2026-06-26: `pnpm format:fix`: passed after implementation.
- 2026-06-26: `pnpm format`: passed.
- 2026-06-26: `pnpm --filter=@forge/validators test`: passed, 2 files / 18 tests.
- 2026-06-26: `pnpm --filter=@forge/api test`: passed, 8 files / 40 tests.
- 2026-06-26: `pnpm --filter=@forge/blade test`: passed, 4 files / 10 tests.
- 2026-06-26: `pnpm --filter=@forge/validators typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/api typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/db typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/consts typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/validators lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/api lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/db lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/consts lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade e2e`: passed, 32 browser tests.
- 2026-06-26: `git diff --check`: passed.
- 2026-06-26: `pnpm lint`: blocked by existing non-dues apps. `apps/club` still references missing `event`/`guild` API routers, and `apps/guild` still references missing `guild` API router; touched packages lint cleanly.
- 2026-06-26: `pnpm analyze:react:changed`: blocked by the existing analyzer limitation on `apps/blade/src/trpc/react.tsx` and `legacy/apps/blade/src/trpc/react.tsx` (`Cannot read properties of undefined (reading 'type')`); dues components themselves were analyzed successfully.
- 2026-06-27: Stripe smoke check with current test keys: `paymentIntents.create` returned a client secret successfully.
- 2026-06-27: `pnpm --filter=@forge/blade typecheck`: passed after server-side PaymentIntent initialization change.
- 2026-06-27: `pnpm --filter=@forge/blade lint`: passed after server-side PaymentIntent initialization change.
- 2026-06-27: `pnpm --filter=@forge/blade test`: passed, 4 files / 10 tests.
- 2026-06-27: `pnpm --filter=@forge/blade e2e`: passed, 32 browser tests.
- 2026-06-26: Coverage re-audit against `test-cases.md`: 22/22 cases fully covered, 0 partial, 0 missing.
- 2026-06-26: `pnpm --filter=@forge/validators test`: passed, 2 files / 18 tests after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/api test`: passed, 8 files / 43 tests after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/blade test`: passed, 4 files / 10 tests after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/api typecheck`: passed after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/blade typecheck`: passed after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/api lint`: passed after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/blade lint`: passed after coverage hardening.
- 2026-06-26: `pnpm --filter=@forge/blade e2e`: passed, 33 browser tests after adding stale-history and mobile-geometry coverage.
- 2026-06-27: Restored-work `pnpm --filter=@forge/validators test`: passed, 2 files / 18 tests.
- 2026-06-27: Restored-work `pnpm --filter=@forge/api test`: passed, 8 files / 44 tests after adding processing-state ownership coverage.
- 2026-06-27: Restored-work `pnpm --filter=@forge/blade test`: passed, 4 files / 10 tests.
- 2026-06-27: Targeted typecheck and lint passed for `@forge/validators`, `@forge/api`, `@forge/db`, `@forge/consts`, and `@forge/blade`.
- 2026-06-27: `pnpm format`: passed across the workspace.
- 2026-06-27: `pnpm verify:push`: formatting and lint passed; workspace typecheck remains blocked only by the existing `apps/guild` references to the absent `guild` API router. All dues-touched packages passed.
- 2026-06-27: `pnpm analyze:react:changed`: dues component surfaces analyzed successfully; command remains blocked by the existing parser errors in current and legacy `src/trpc/react.tsx`.
- 2026-06-27: Restored-work `pnpm --filter=@forge/blade e2e`: blocked before test execution because a separate Blade dev server owns the app's Next.js development lock on port 3000. The process was left untouched.
- 2026-06-27: Card-only/countdown update `pnpm --filter=@forge/api test`: passed, 8 files / 44 tests.
- 2026-06-27: Card-only/countdown update `pnpm --filter=@forge/blade test`: passed, 4 files / 10 tests.
- 2026-06-27: Card-only/countdown update targeted API and Blade typecheck/lint: passed.
- 2026-06-27: `pnpm analyze:react apps/blade/src/app/_components/member/member-dues-payment.tsx`: passed, 1 file / 1 exported component / 0 failures.
- 2026-06-27: Targeted `member-dues-payment.spec.ts` Playwright run: passed, 5 tests. The success-flow case verifies the visible countdown changes from 5 to 4 and the immediate dashboard action works.

## Links

- PRs:
- Issues:
- Discord/thread context:
