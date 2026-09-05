# Forms Delivery and Action Feedback Spec

Status: Core scope approved; implementation and validation in progress

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
- Make recruiting configuration understandable: human-readable action names,
  visible labels, explanation of the note source, and confirmation of saved
  configuration. Unavailable actions remain discoverable but cannot be selected
  for configuration.
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
3. Existing configurations display a readable name, enabled state, and useful
   summary. Editors can tell what message will be sent and where its note comes
   from. Internal identifiers are secondary diagnostic information.
4. A successful submission shows "Response submitted" and a way to review the
   saved response. Refresh retains the receipt. A form accepting multiple
   responses offers an explicit "Submit another response" action.
5. Failed submissions retain answers and visibly explain the failure. Pending
   requests prevent repeated clicks. Editable responses acknowledge updates.
6. Deletion retains the existing destructive warning. Only confirmed successful
   deletion closes the detail view, updates the list/count, and announces
   "Response deleted". Failure keeps the response available with an error.
7. Saved callback changes become visible immediately. Errors appear inside the
   open dialog; retry reports the returned delivery outcome accurately.

## Boundaries and open decisions

- Chris approved implementing the proposed order, including mobile, on 2026-09-05.
  No production changes, replay, messages, commit, push, issue, or PR creation.
- Missing instruction video is out of scope.
- No schema, dependency, permission, or deployment change is currently needed
  for the core fixes.
- Historical team-director mentions and structured applicant summaries remain
  a separate unresolved parity requirement. Proposed follow-up: a guided team
  selector using existing organizational configuration, a bounded summary, and
  an explicit allowlist of mentions. Confirm desired summary fields and whether
  this belongs in the same PR before extending the callback payload.
- Do not imply that selecting a question maps every applicant field: the
  existing recruiting callback accepts one note. UI copy must describe that
  contract honestly while parity remains unresolved.
- A full role-picker redesign and automatic legacy configuration migration are
  outside the proposed core PR. Record them separately if required.
