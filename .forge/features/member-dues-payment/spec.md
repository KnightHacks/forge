# Member Dues Payment Spec

Status: Complete

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Members should be able to understand whether they have paid Knight Hacks
membership dues for the current academic school year and pay dues from Blade
without leaving the member experience.

The payment flow should support the later admin member dashboard by preserving
dues payment history instead of treating each year's rollover as deleted data.

## Users / actors

- Signed-in members with completed member profiles.
- Future admins/officers who need dues history and current dues status for the
  admin member dashboard.

## User-visible interface

- `/member/dashboard` should show a compact dues status tag.
- If the member has not paid for the current academic school year,
  `/member/dashboard` should show an unpaid dues section with a clear action to
  pay.
- The payment action should take the member to `/member/dues`.
- `/member/dues` should be a full payment page so it can be linked from the
  dashboard and future member/admin surfaces.
- `/member/dues` should use the current Blade design system and embedded Stripe
  payment experience.
- After a successful payment, the member should return to `/member/dashboard`.
- After Stripe confirms success, `/member/dues` should show a short success
  dialog/state with a visible five-second countdown and then route back to
  `/member/dashboard`. The dialog should also let the member return to the
  dashboard immediately.
- Members should see the current academic school year in status copy, for
  example `Paid for 2026-2027 academic school year`.
- The date should determine the displayed academic school year and whether the
  late-year warning appears.
- If a member visits the payment page between May 31 and July 31, Blade should
  open a warning dialog that says the next school year is close, which means
  they will need to pay again in the fall semester. The member may dismiss the
  dialog and continue paying for the current school year or return home.
- The first payment slice should accept card payments only.
- The payment page should show non-refundable payment copy.
- Paid status should feel positive, with green status treatment. Unpaid status
  should be neutral/faded gray rather than red.
- The unpaid dashboard section should say: `Dues unpaid` and explain that dues
  are unpaid for the current academic school year.
- The late-year warning dialog should say: `The school year is almost over`
  and explain that the next school year is close, which means the member will
  need to pay dues again in the fall semester.

## Scope

### In scope

- Show current dues status on the member dashboard.
- Let unpaid members reach a dedicated dues payment page.
- Let completed members pay `$25` dues for the current academic school year.
- Show safe loading, processing, success, and failure states around payment.
- Show a five-second redirect countdown and an immediate dashboard action after
  successful payment.
- Preserve dues history for future alumni/admin surfaces.
- Prevent members from paying twice for the same active academic school year.
- Keep the first member-facing payment flow scoped to completed member profiles.
- Treat the active/stale state of a dues payment as something future admins can
  control, while this member-facing slice only reads and respects that state.
- Store new member dues amounts in cents so Stripe payments and future manual
  inserts use the same amount semantics.
- If a stale record already occupies the current academic school year, let the
  member pay for the next academic school year instead of deleting or
  overwriting that historical record.

### Out of scope

- Member-visible dues history.
- Admin member dashboard UI.
- Admin manual dues payment, comp, revoke, or rollover controls.
- Refund handling.
- Coupon codes or discounts.
- Admin-configurable pricing.
- Receipts beyond Stripe's normal payment/receipt behavior.
- Sponsor, alumni, or reporting dashboards.
- Hacker application dues behavior.
- Member-dashboard payment history.
- Red/error-styled unpaid status.

## Vocabulary

- `Dues`: Knight Hacks membership dues for the current academic school year.
- `Academic school year`: The dues year that starts on August 1 and ends on
  July 31, labeled by start and end year, such as `2026-2027`.
- `Current dues status`: Whether the member is paid, unpaid, or processing for
  the current academic school year.
- `Active dues record`: A dues payment that currently counts toward paid member
  status.
- `Stale dues record`: A dues payment that remains in history but no longer
  counts toward current paid member status.
- `Historical dues record`: A past payment record retained for future admin or
  alumni use, even when it no longer grants current dues status.
- `Late-year warning`: The May 31 through July 31 warning that paying now only
  covers the current school year and another dues payment will be needed in the
  fall semester.

## Acceptance criteria

- A signed-in member with a completed member profile can see their current dues
  status from `/member/dashboard`.
- A member who has not paid sees an unpaid dues section on `/member/dashboard`
  with a clear action to pay.
- The pay action opens `/member/dues`.
- `/member/dues` lets an unpaid member pay `$25` dues using an embedded Stripe
  payment experience.
- A successful payment shows a brief success state and then returns the member
  to `/member/dashboard`. The success state counts down from five seconds and
  includes an action to return immediately.
- After payment, the dashboard shows paid copy for the current academic school
  year.
- A member who is already paid for the current academic school year cannot pay
  again for that same academic school year.
- A paid member who visits `/member/dues` is routed back to the member
  dashboard instead of seeing another payment form.
- A signed-in user without a completed member profile cannot pay dues and is
  routed back into member onboarding.
- Between May 31 and July 31, `/member/dues` shows the late-year warning before
  the member pays.
- Old dues records are not deleted as part of this member-facing payment flow.

## Open questions

- None.
