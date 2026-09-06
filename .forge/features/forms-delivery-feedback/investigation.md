# Forms Delivery and Action Feedback Investigation

Inspected 2026-09-05 at local Forge revision `1c1457e0`.
Scope: code/history inspection, user evidence, offline checks, and planning.
No production or database access was used in this investigation.

## Confirmed delivery defect

Screenshot 04 shows three `recruiting.notify` failures with one attempt and:

> Invalid Form Body nonce[NONCE_TYPE_TOO_LONG]: Must be 25 or fewer characters long.

It also shows one cancelled execution with zero attempts. This supersedes the
earlier observation of no executions: configuration/enqueue now exist for
these samples, and a dispatcher reached Discord. The screenshot cannot tell
whether Cron or manual Retry performed those attempts. Cancellation is
consistent with the reported deletion; it is not evidence of Discord failure.

`packages/api/src/utils/forms/callback-policy.ts:17` returns `executionId`
unchanged. Executions use UUIDs. `database-callbacks.ts:214` posts that value as
`nonce` with `enforce_nonce: true`. A synthetic invocation of the real helper
returned length **36**, exceeding Discord's **25** character limit.

The [Discord Create Message contract](https://docs.discord.com/developers/resources/message#create-message)
confirms the length limit and says nonce deduplication covers the past few
minutes. The defect is in request construction, independent of the editor's
chosen note. Coolify access is unnecessary to diagnose this error. It does not
prove all deployment settings are correct or that no additional error will
appear after the nonce is fixed.

The existing `packages/api/src/tests/forms/callbacks.test.ts:278` explicitly
asserts that the full UUID is returned. It tests identity/stability but omits
the provider length contract. This explains why the suite passes with the bug.

## Submission confirmation

`generic-form-response-form.tsx:634` ignores the create response result and
uses `window.location.reload()` when no `onSubmitted` callback is passed. The
public form route passes none. The API already returns `formResponseId`.

`database-responses.ts:210` only selects a saved response for a multiple-response
form when `requestedResponseId` is provided. Reloading the bare form URL thus
renders an open blank form for `multiple_locked`. The existing
`?responseId=...` route can instead render an ownership-checked receipt.

The submitted-state panel exists in `generic-form-respondent.tsx:233`, so it
would be inaccurate to say there is no confirmation implementation anywhere.
The confirmed gap is the successful create transition, particularly for
multiple-response forms. Chris reports the symptom; screenshot 03 is a blank
form state, not independent proof of the preceding mutation or live mode.
Editable responses also reload without a distinct update-success announcement.

## Callback dialog overflow and clarity

Screenshots 01 and 02 show the same callback dialog at opposite horizontal
scroll positions. The primary action's text is outside the initial view.
Screenshot 05 shows the native dropdown and raw `recruiting.notify` label.

`form-callbacks-dialog.tsx:58` places a nested grid inside a width-limited dialog
with vertical auto overflow; its selects and grid children have no explicit
minimum-width reset. Native selects can size to the longest option, even when
that option is not selected. Shared buttons default to `whitespace-nowrap`.
These are plausible contributors; exact CSS causality needs a real browser
with long labels and viewport measurements. No browser reproduction was run.

Further source-confirmed usability gaps:

- `admin-form-builder.tsx:101` always initializes `discord.assign-role`, even
  when unavailable to the editor.
- The dialog shows active configurations by raw slug instead of catalog label.
- The note source select uses only an accessible name, and fixed input relies
  on placeholder copy. The callback description is not rendered.
- `addCallback` sets a message on the underlying builder, without closing the
  dialog or refreshing configurations. The modal obscures that message.
- Disable refreshes, but has no rejection handler in its promise chain.
- The current mapped contract is only `memberId` plus `note`. Selecting
  "What is your name?" maps that answer to the note; it does not construct a
  full application summary or select a team director.

## Response deletion feedback

`form-responses-dashboard.tsx:642` already has an explicit pre-delete warning
and Delete permanently action. However, the mutation at line 902 only refreshes
on success and exposes neither success toast nor failure feedback. The detail
selection stores a response object, so refreshing list props alone does not
explicitly close that selected detail. Plan deletion as one complete interaction
with pending, success, and failure states rather than adding another warning.

## Blast radius and previous diagnosis correction

- The invalid nonce affects every `recruiting.notify` execution using this
  helper, across all forms. It does not establish that role assignment or all
  other Discord features fail; they do not use this message path.
- Callback dialog/feedback changes apply to the shared generic form editor.
- Receipt defects particularly affect multiple-response forms; verify all modes.
- Deletion feedback affects the shared generic response dashboard.
- All five Club team slugs share these generic surfaces: Sponsorship, Workshop,
  Design, Outreach, and Dev. Only Outreach's current failure is pictured; other
  forms' live configurations and execution counts remain unknown.
- Earlier migration/history inspection found no automatic legacy-connection
  backfill and no historical director-routing parity. Those are separate gaps.
  Missing configuration was a plausible explanation for the earlier empty
  Delivery view, not a confirmed production root cause. The new configured
  failures have a directly evidenced code cause: the invalid nonce.

## Remaining checks

1. Reproduce long-label overflow locally with synthetic data in a browser.
2. Exercise actual submit/delete interactions and receipts in all response modes.
3. Test the real outbound handler against a mock enforcing Discord limits.
4. Confirm desired scope of historical director-routing parity before adding
   payload fields or configuration migration.
5. After the code repair is deployed, an authorized maintainer verifies matching
   Blade/Cron revisions and performs one agreed delivery check. Only investigate
   environment or cron if fresh evidence indicates those failures.
