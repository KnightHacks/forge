# Member Dues Payment Test Cases

Status: Complete

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

These cases cover member-facing dues status, payment setup/confirmation,
database durability, and the high-value Blade user path from dashboard to dues
payment. They intentionally exclude admin rollover/manual dues UI, refunds,
member-visible history, sponsor/alumni dashboards, and real Stripe network calls
inside automated tests.

## Test placement plan

- `packages/validators/src/tests/dues.test.ts` for pure date/year/status helper
  behavior.
- `packages/api/src/tests/dues/router.test.ts` for tRPC dues procedures with DB
  and Stripe mocked.
- `apps/blade/src/tests/member/member-dashboard.test.tsx` for dashboard dues
  rendering.
- `apps/blade/src/tests/member/member-dues-page.test.tsx` for server/client dues
  page rendering pieces that can be tested without a browser.
- `apps/blade/src/tests/e2e/member-dues-payment.spec.ts` for the member user
  path through dashboard, payment page, E2E payment, and redirects.

Commands:

```bash
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
```

## Implementation coverage

- All 23 approved cases have automated coverage at the appropriate layer.
- TC-021 is intentionally split across the admin control component test, API
  authorization/configuration tests, dues-router payment gate tests, and member
  E2E paused/enabled scenarios rather than duplicated as one monolithic browser
  test.
- No cases are missing.
- Stripe network calls remain mocked by design, while Playwright covers the
  Blade payment orchestration, durable database result, and redirects through
  deterministic E2E payment mode.
- Repeated webhook delivery exercises the real shared dues-recording helper and
  proves that the same PaymentIntent inserts only one dues row.
- Inactive-entitlement coverage runs from the seeded database row through API
  status and dashboard rendering, then verifies that payment history remains
  unchanged.

## Test cases

### TC-001: Academic year labels use the August school-year boundary

Setup:

- Reference dates: July 31, August 1, and January 15.

Action:

- Call the dues academic-year helper.

Expected observations:

- July 31 maps to the previous start year.
- August 1 maps to the current start year.
- Labels render as `<start>-<start + 1> academic school year`.

### TC-002: Late-year warning only appears May 31 through July 31

Setup:

- Reference dates: May 30, May 31, July 31, August 1.

Action:

- Call the late-year warning helper.

Expected observations:

- May 31 and July 31 return true.
- May 30 and August 1 return false.

### TC-003: Inactive entitlement does not advance checkout to a future year

Setup:

- Current academic year is `2026`.
- A member has payment history and an inactive entitlement for `2026`.

Action:

- Compute dues status and begin checkout.

Expected observations:

- Member is unpaid.
- Checkout targets `2026`, the current academic year.
- Existing payment history is not deleted or overwritten.

### TC-004: API status returns unpaid with neutral payment copy

Setup:

- Authenticated user has a completed member profile.
- No active entitlement exists for the current year.

Action:

- Call `dues.getStatus`.

Expected observations:

- `paid` is false.
- Returned unpaid copy uses the current academic year.
- The procedure does not throw for a valid member.

### TC-005: API status returns paid for an active entitlement

Setup:

- Authenticated user has a completed member profile.
- An active entitlement exists for the current academic year and references a
  Stripe payment.

Action:

- Call `dues.getStatus`.

Expected observations:

- `paid` is true.
- The output includes the paid year label, amount, and payment date.

### TC-005A: API status returns paid for a manual entitlement

Setup:

- Authenticated user has a completed member profile.
- An active entitlement exists for the current academic year with no source
  payment.

Action:

- Call `dues.getStatus` and open `/member/dues`.

Expected observations:

- `paid` is true even though no `DuesPayment` row is linked.
- Payment-specific fields are null and the paid date uses the entitlement's
  update timestamp.
- `/member/dues` redirects to the member dashboard instead of offering
  checkout.

### TC-006: API status treats an inactive current-year entitlement as unpaid

Setup:

- Authenticated user has a completed member profile.
- Payment history exists, but the current-year entitlement is inactive.

Action:

- Call `dues.getStatus`.

Expected observations:

- `paid` is false.
- The current academic year remains the checkout target.

### TC-007: PaymentIntent creation requires a member profile

Setup:

- Authenticated user has no `Member` row.

Action:

- Call `dues.createPaymentIntent`.

Expected observations:

- Procedure throws `NOT_FOUND`.
- Stripe is not called.

### TC-008: PaymentIntent creation blocks a duplicate entitlement

Setup:

- Authenticated member already has an active current-year entitlement.

Action:

- Call `dues.createPaymentIntent`.

Expected observations:

- Procedure throws `CONFLICT`.
- Stripe is not called.

### TC-009: PaymentIntent creation sends cents and durable metadata to Stripe

Setup:

- Authenticated member is unpaid.

Action:

- Call `dues.createPaymentIntent`.

Expected observations:

- Stripe receives amount `2500`, currency `usd`, and card-only payment method
  types.
- Metadata includes `member_id`, `user_id`, and `academic_year_start`.
- API returns `clientSecret`, PaymentIntent id, amount, and year label.

### TC-010: Confirming a succeeded PaymentIntent records dues idempotently

Setup:

- Stripe retrieve returns a succeeded PaymentIntent with matching metadata.
- No existing dues row for the PaymentIntent id exists.

Action:

- Call `dues.confirmPayment`.

Expected observations:

- An immutable `DuesPayment` row is inserted with amount in cents and
  `stripePaymentIntentId`.
- The matching member/current-year entitlement is created or reactivated and
  linked to the payment.
- Calling the procedure again returns paid status without duplicating rows.

### TC-011: Confirming a processing PaymentIntent does not insert dues

Setup:

- Stripe retrieve returns `processing`.

Action:

- Call `dues.confirmPayment`.

Expected observations:

- API returns processing status.
- No dues row is inserted.

### TC-012: Confirming failed or incomplete PaymentIntent gives a safe error

Setup:

- Stripe retrieve returns `requires_payment_method`, `requires_action`, or
  `canceled`.

Action:

- Call `dues.confirmPayment`.

Expected observations:

- Procedure throws `BAD_REQUEST`.
- No dues row is inserted.

### TC-013: Confirming another member's PaymentIntent is forbidden

Setup:

- Stripe retrieve returns a succeeded PaymentIntent whose `member_id` or
  `user_id` metadata does not match the authenticated user.

Action:

- Call `dues.confirmPayment`.

Expected observations:

- Procedure throws `FORBIDDEN`.
- No dues row is inserted.

### TC-014: Stripe webhook records the same succeeded payment idempotently

Setup:

- Webhook event is `payment_intent.succeeded`.
- Event signature is valid in the route test/mocked Stripe constructor.

Action:

- POST the event to `/api/membership`.

Expected observations:

- Route returns `200`.
- The shared dues recording helper is invoked.
- Repeated webhook delivery does not create duplicates.

### TC-015: Dashboard renders paid and unpaid dues states

Setup:

- Render `MemberDashboard` with dues status variations.

Action:

- Inspect server-rendered markup.

Expected observations:

- Paid state includes green paid copy and no pay CTA.
- Unpaid state includes neutral `Dues unpaid` copy and `/member/dues` link.
- Existing Guild/profile dashboard content remains visible.

### TC-016: Payment page shows amount, academic year, warning, and non-refundable copy

Setup:

- Render dues page/client with unpaid status.

Action:

- Inspect markup for normal and late-year status.

Expected observations:

- Page shows `$25.00`, the academic school year label, and non-refundable copy.
- Late-year warning dialog copy is present only when `lateYearWarning` is true.

### TC-017: E2E unpaid member can pay and return to dashboard

Setup:

- Seed an E2E user/member without dues.
- Enable Blade E2E auth.

Action:

- Sign in, open dashboard, click pay dues, complete the E2E test payment.

Expected observations:

- Browser reaches `/member/dues`.
- Payment success state appears with a visible five-second countdown and an
  action to return to the dashboard immediately.
- Using the immediate action returns the browser to `/member/dashboard`.
- Dashboard shows paid dues status.
- Database contains one payment with amount `2500` and one active current-year
  entitlement linked to it.

### TC-018: E2E paid member is redirected away from `/member/dues`

Setup:

- Seed an E2E member with an active current-year entitlement.

Action:

- Navigate directly to `/member/dues`.

Expected observations:

- Browser redirects to `/member/dashboard`.
- No payment form is shown.

### TC-019: E2E no-member user is routed to onboarding

Setup:

- Seed an authenticated E2E user without a member profile.

Action:

- Navigate directly to `/member/dues`.

Expected observations:

- Browser redirects to `/form/member-signup`.
- No payment form is shown.

### TC-020: E2E mobile dues UI is compact and reachable

Setup:

- Seed an unpaid E2E member.
- Set a mobile viewport.

Action:

- Open `/member/dashboard`.

Expected observations:

- Guild/profile content remains primary.
- Dues status/action is visible as a compact quick action.
- No desktop-only oversized dues panel dominates the first mobile screen.

### TC-021: Admin payment availability controls payment setup

Setup:

- An authenticated member is unpaid.
- An authorized member editor can access `/admin/members`.

Action:

- Pause member payments from the admin member page, then read dues status and
  attempt to create a PaymentIntent.
- Render the unpaid member dashboard and `/member/dues` paused states.
- Enable member payments and retry.

Expected observations:

- While paused, status reports payments locked, direct PaymentIntent creation
  returns `PRECONDITION_FAILED`, and Stripe is not called.
- The dashboard shows a neutral paused state without a pay link.
- `/member/dues` says that payments are paused until further notice and renders
  no Stripe or E2E payment action.
- When enabled, the existing dues flow is available immediately without
  changing its paid-status or academic-year logic.
- A read-only member admin calling
  `memberAdmin.setDuesPaymentsEnabled` receives `FORBIDDEN`, and a subsequent
  configuration read confirms that the persisted setting is unchanged.

## Negative / regression cases

### TC-NEG-001: Legacy manual amount normalization remains cents

Setup:

- New manual dues constants are imported by future/admin code.

Action:

- Read the dues amount constant used for non-Stripe inserts.

Expected observations:

- The value is `2500`, matching Stripe cents semantics.

### TC-NEG-002: Paid status never depends on payment history alone

Setup:

- A member has payment history but no active current-year entitlement.

Action:

- Read status and render dashboard.

Expected observations:

- Member remains unpaid and can reach `/member/dues`.

## Open questions

- None.
