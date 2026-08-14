# Member Dues Payment SRD

Status: Complete

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Add member-facing dues status and payment to Reforge Blade. The capability
includes academic-year dues status, a full-page embedded Stripe Payment Element
flow, idempotent dues recording, and a database shape that preserves old dues
history for future admin/alumni surfaces.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md#trpc-and-api-principles`:
  dues status and payment setup are platform workflows in `@forge/api`.
- `docs/agentic-development/forge-engineering-principles.md#database-principles`:
  schema changes stay in `@forge/db`; payment writes use transactions where
  consistency requires it.
- `docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles`:
  pages stay server-first; Stripe/browser interactivity lives in leaf client
  components.
- `docs/agentic-development/forge-engineering-principles.md#configurability-principles`:
  price stays code-configured for the first slice, while year labeling is
  derived from the current UTC date.
- `apps/blade/DESIGN_SYSTEM.md`: dues UI must use the current Blade raised panel
  and darker inset surface hierarchy.

## Access policy

- Unauthenticated users cannot read dues status, create PaymentIntents, confirm
  payments, or view `/member/dues`; Blade redirects them to `/`.
- Authenticated users without a completed `Member` profile cannot pay dues.
  Member-facing API procedures return `NOT_FOUND`; Blade routes them to the
  member signup form.
- Authenticated members can read their own current dues status and create/confirm
  payment for their own member row only.
- Stripe webhook fulfillment can record a successful payment only when the
  PaymentIntent metadata points to an existing member/user pair.
- Admins with read-member access can read global payment availability. Admins
  with edit-member access can update it. Other dues management continues to
  use its existing access rules.

## Architecture / data flow

1. `/member/dashboard` reads the authenticated member and dues status through
   tRPC. It renders a compact status tag and, when unpaid, a neutral inset CTA to
   `/member/dues`.
2. `/member/dues` is a server route that gates auth/member access, redirects
   already-paid members to `/member/dashboard`, and renders a client payment
   component for unpaid members. In normal mode, the server route creates the
   Stripe PaymentIntent before rendering so the client receives an initial
   `clientSecret` and does not sit on an indefinite setup skeleton.
   While admin configuration has payments disabled, it skips PaymentIntent
   creation and renders the paused state instead.
3. The payment component renders Stripe's Payment Element with the initial
   `clientSecret`, confirms payment with
   `stripe.confirmPayment({ redirect: "if_required" })`, and can retry
   `dues.createPaymentIntent` from the client if server-side setup fails.
4. After Stripe reports a succeeded PaymentIntent, the client calls
   `dues.confirmPayment`. The API retrieves the PaymentIntent from Stripe and
   records the immutable payment and activates the matching current-year
   entitlement in one transaction before the UI shows success and redirects.
5. `/api/membership` handles Stripe webhook `payment_intent.succeeded` events and
   calls the same shared idempotent recording helper used by `confirmPayment`.
6. `@forge/db` owns immutable dues payment history, yearly dues entitlements,
   and the singleton dues configuration.
7. `@forge/validators` owns pure dues helper functions and output/input schemas
   that are shared by API, Blade, and tests.

## tRPC/API behavior

- Add a `dues` router registered in `packages/api/src/root.ts`.
- `dues.getStatus`
  - Access: protected member.
  - Input: none.
  - Output: current academic year, formatted labels, `paid`, `paymentYear`,
    `paidAt`, `amount`, `lateYearWarning`, and the
    admin-controlled payment-availability state.
  - Error: `NOT_FOUND` when the authenticated user has no `Member` row.
- `dues.createPaymentIntent`
  - Access: protected member.
  - Input: none.
  - Errors:
    - `NOT_FOUND` when no member exists.
    - `CONFLICT` when an active current-year entitlement already makes the
      member paid.
    - `PRECONDITION_FAILED` while admins have payments paused.
    - `INTERNAL_SERVER_ERROR` when Stripe does not return a client secret.
  - Stripe metadata must include `member_id`, `user_id`, and
    `academic_year_start`.
  - Payment method types are restricted to `card`. Delayed-notification bank
    payments remain out of scope for this slice.
- `dues.confirmPayment`
  - Access: protected member.
  - Input: `{ paymentIntentId: string }`.
  - Retrieves the PaymentIntent from Stripe; the client-provided id alone is not
    trusted.
  - Verifies the PaymentIntent member/user metadata matches the authenticated
    session.
  - Records only succeeded payments. Processing returns a processing status.
    Canceled/failed/incomplete statuses return a safe `BAD_REQUEST`.
  - Uses idempotent payment inserts keyed by `stripePaymentIntentId` and upserts
    one entitlement for the member/current-year pair.
- `dues.getPaymentDates` remains deferred until admin analytics are reintroduced.
- `/api/membership` is the only new REST route because Stripe webhooks require an
  HTTP protocol boundary; it must not own separate business behavior.

## Validation

- Add reusable dues schemas/helpers to `@forge/validators`.
- `paymentIntentId` is a non-empty Stripe PaymentIntent id string.
- Academic-year helpers use UTC dates to avoid local timezone rollover bugs.
- Admin payment-availability input is a strict boolean.
- Amounts are represented in cents for new writes.

## Data / migration / compatibility

- Add nullable `stripe_payment_intent_id varchar(255)` with a unique constraint.
  Legacy/manual rows can remain null while new Stripe rows become idempotent.
- `DuesPayment` is immutable recorded payment history. New rows come only from
  Stripe; legacy manual rows remain preserved. Remove its `active` field and
  member/year uniqueness so a revoked member can make another real payment for
  the same academic year without overwriting the original transaction.
- Add `DuesEntitlement` with one row per member/year, an active flag, and an
  optional `sourcePaymentId` link. Current dues status reads only the active
  current-year entitlement.
- Activating an already-active entitlement must not replace its
  `sourcePaymentId`; this preserves which payment funded the entitlement when
  duplicate fulfillment paths race.
- Keep `year integer` as the academic school-year start year, e.g. `2026` for
  `2026-2027`.
- New Stripe payment rows store cents (`2500` for `$25`). Migration 0011 already
  normalized historical `amount = 25` rows to `2500`; entitlement state does
  not depend on amount.
- Backfill one entitlement per normalized member/year from existing payment
  rows. Preserve the aggregate active state and link the entitlement to the
  newest active payment, or newest payment when all rows are inactive.
- Normalize legacy January-July calendar-year values to the academic year that
  began the previous August before backfilling entitlements.
- Checkout always targets the current academic year. An inactive entitlement
  never advances a payment into the next year.
- Add a singleton `DuesConfiguration` row keyed by `global`, with
  `paymentsEnabled boolean not null default false`. Missing configuration is
  also treated as paused so a partial deployment cannot accidentally open
  payments.

## Discord integration

None in this slice. Dues payment does not grant Discord roles yet.

## Configurability review

Would this require a developer change next year?

- Answer: Partially.
- The academic year window does not require a developer change because it is
  derived from August 1 through July 31.
- The `$25` price is still code-configured. That is acceptable for this first
  slice because the human explicitly said the price is always `$25`, while admin
  configurable pricing is out of scope.
- Academic-year membership state is admin-controllable through entitlements;
  payment transactions remain unchanged by grants and revocations.
- Payment availability no longer requires a developer change because authorized
  member editors can change the persisted setting from `/admin/members`.

## React / frontend constraints

- Keep `/member/dues` as a server page; use a client component only for Stripe
  Elements and local payment state.
- Reuse Blade member dashboard surface classes:
  - top-level panels: `bg-card/95` with subtle border/shadow
  - inset rows/tiles: `bg-background/60`
- Paid status uses green (`chart-2`) plus text; unpaid status uses neutral muted
  styling.
- The late-year warning is a dialog shown on `/member/dues` entry from May 31
  through July 31. It has a continue/dismiss action and a return-home action.
- While payments are paused, the member dashboard replaces the pay action with
  a neutral unavailable state and `/member/dues` says that payments are paused
  until further notice. No Stripe form or retry action is rendered.
- After successful confirmation, show a short centered success dialog/state
  with a visible countdown from five seconds. Redirect to `/member/dashboard`
  when it completes and provide a button that returns there immediately.
- Respect the existing mobile-first member dashboard constraints: the mobile
  Guild profile remains primary, and dues is a compact quick action/status
  rather than a full extra mobile dashboard section.
- In Playwright/E2E mode, Stripe iframe behavior can be replaced by an explicit
  deterministic test payment button. Unit/API tests must still cover the real
  Stripe PaymentIntent interaction and metadata.

## Testing / verification strategy

- `packages/validators/src/tests/dues.test.ts`
  - academic-year label boundaries
  - late-year warning boundaries
- `packages/api/src/tests/dues/router.test.ts`
  - status: unpaid without entitlement, paid with an active current-year
    entitlement, inactive current-year entitlement remains unpaid
  - create PaymentIntent: no member, duplicate paid, and Stripe metadata/options
  - create PaymentIntent: admin pause rejects before Stripe
  - confirm PaymentIntent: succeeded inserts, idempotent repeat, processing,
    failed/incomplete, wrong member/user
- `packages/api/src/tests/admin/dues-configuration.test.ts`
  - read-member access can inspect payment availability
  - edit-member access can update and audit payment availability
  - read-only mutation attempts return `FORBIDDEN` without changing the setting
- `apps/blade/src/tests/member/member-dashboard.test.tsx`
  - dashboard paid/unpaid rendering and dues link/status styles.
- `apps/blade/src/tests/member/member-dues-page.test.tsx`
  - payment page copy, paused state, late warning dialog copy, and
    success/processing/error client states where practical with mocks.
- `apps/blade/src/tests/e2e/member-dues-payment.spec.ts`
  - unpaid member dashboard CTA routes to `/member/dues`
  - E2E payment shows the countdown/early-return action, marks dues paid, and
    returns to the dashboard
  - paid member visiting `/member/dues` redirects to dashboard
  - no-member user is routed to signup
  - mobile dashboard keeps dues compact and reachable
- `packages/db/src/tests/dues-entitlement-migration.test.ts`
  - payment/entitlement separation and legacy-year backfill ordering

Expected commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm analyze:react:changed
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db typecheck
pnpm --filter=@forge/validators typecheck
```

## Open questions

- None.
