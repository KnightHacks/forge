# Forms Delivery and Action Feedback Spec

Status: Callback parity refinement approved; implementation and validation in progress

## Purpose and users

Members need an unmistakable receipt after submitting a form. Form editors
need understandable notification settings, reliable Discord delivery, and clear
confirmation when configuring a callback or deleting a response.

This proposal addresses Chris's five screenshots and submission/deletion report
from 2026-09-05. See [investigation.md](./investigation.md) for evidence. The
before/after screenshots are hosted in the pull request rather than committed
to the repository.

## Proposed PR scope

- Fix recruiting notification delivery rejected by Discord's nonce limit.
- Keep the callback dialog and its actions within the viewport, including long
  question labels, mobile widths, and browser zoom.
- Restore the generic tRPC callback mapper. Each explicitly registered
  procedure exposes named inputs, and an administrator maps each input to one
  form question, one respondent value, or a fixed value.
- Restore the structured recruiting announcement with applicant fields, team
  color, and the configured director mention.
- Make Discord role assignment use the same mapper, with its role ID entered as
  a fixed value.
- Show a persistent submission receipt, including when multiple responses are
  allowed. Starting another response must be an explicit choice.
- Confirm successful response deletion and show failures without losing context.
- Show callback configure/disable/retry results in the surface where initiated.

## Acceptance criteria

1. A valid configured recruiting callback can reach Succeeded with a
   provider-compliant request. Submission success is independent of delivery.
2. Neither the document nor callback dialog requires horizontal scrolling at
   320px, 375px, 768px, and desktop widths. Long labels do not push actions away.
   Vertical scrolling remains available for short viewports.
3. Existing configurations display a readable procedure name, enabled state,
   and an input-by-input summary. Procedure metadata may give each input a
   label, description, fixed-value placeholder, and allowed source kinds.
4. Each required procedure input is mapped exactly once. A form question may
   supply at most one input in a configuration. Available respondent values are
   Member ID, respondent name, respondent email, auth user ID, and Discord user
   ID. The UI labels each identity precisely.
5. The recruiting action accepts name, email, major, graduation term,
   graduation year, and team. It sends the legacy-style structured Discord
   announcement, colors it from the configured team role, and mentions the
   configured director role. Team may be a fixed value per form.
6. The Discord role action accepts a Discord role ID as a fixed value and acts
   on the respondent's Discord user ID. Server-side role policy remains in
   force.
7. A successful submission shows "Response submitted" and a way to review the
   saved response. Refresh retains the receipt. A form accepting multiple
   responses offers an explicit "Submit another response" action.
8. Failed submissions retain answers and visibly explain the failure. Pending
   requests prevent repeated clicks. Editable responses acknowledge updates.
9. Deletion retains the existing destructive warning. Only confirmed successful
   deletion closes the detail view, updates the list/count, and announces
   "Response deleted". Failure keeps the response available with an error.
10. Saved callback changes become visible immediately. Errors appear inside the
    open dialog; retry reports the returned delivery outcome accurately.

## Boundaries and open decisions

- Chris approved implementing the proposed order, including mobile, on 2026-09-05.
  No production changes, replay, messages, commit, push, issue, or PR creation.
- Missing instruction video is out of scope.
- No schema, dependency, permission, or deployment change is currently needed
  for the core fixes.
- Callback procedures are discovered only when their tRPC metadata explicitly
  registers them. The configuration surface remains admin-only, and each
  procedure retains its own authorization and input validation.
- Existing durable execution snapshots, leases, retries, and Delivery tab stay
  in scope. No historical response is replayed automatically.
- Existing one-note recruiting configurations cannot be translated into the
  new structured contract without knowing the intended question mappings.
  They must fail visibly as stale configuration until an administrator remaps
  them.
- A rich Discord role picker and automatic legacy configuration migration are
  outside this refinement.
