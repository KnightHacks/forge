# Forms Delivery and Action Feedback SRD

Status: Core implementation approved on 2026-09-05

## Ownership and constraints

Follow [engineering principles](../../../docs/agentic-development/forge-engineering-principles.md),
[repository conventions](../../../docs/REPO-CONVENTIONS.md), and
[Blade design system](../../../apps/blade/DESIGN_SYSTEM.md).

Blade owns respondent receipts, callback configuration, and action feedback.
`@forge/api` owns execution dispatch and provider payload validation. Cron is an
affected consumer of the API helper; it should not need a new workflow.
Preserve current form/section permissions, callback permissions, locked modes,
response ownership checks, and server-only external effects.

## Proposed implementation sequence

### 1. Repair the Discord request contract

- Replace the identity implementation in
  `packages/api/src/utils/forms/callback-policy.ts:formCallbackDeliveryNonce`
  with a deterministic encoding no longer than 25 characters.
- Preferred candidate: encode the full 16 UUID bytes as unpadded base64url
  (22 characters), with explicit canonical UUID validation. This preserves all
  identity bits; do not truncate a UUID or generate a fresh nonce per retry.
- Keep database execution UUIDs and `enforce_nonce: true` unchanged. The
  dispatcher must derive the nonce from the same execution on every attempt.
- Test the actual recruiting request through a mocked Discord boundary, not
  only a separately modeled dispatcher. Use synthetic member/config data.
- Preserve succeeded/cancelled guards and fenced lease completion. Discord
  documents nonce deduplication only for the past few minutes, so do not claim
  unconditional exactly-once delivery across an arbitrarily delayed crash.
- No table migration is required for this proposal. Failed executions contain
  input snapshots and derive their nonce at dispatch time.

### 2. Make the callback dialog fit and explain its state

Likely files: `apps/blade/src/app/_components/admin/forms/`
`form-callbacks-dialog.tsx`, `admin-form-builder.tsx`,
`form-callback-mappings.ts`, and adjacent tests.

- Reproduce the overflow with a long unselected question option and the
  disabled permission label; measure actual scrollWidth/clientWidth before
  choosing CSS. Suspected causes are native select intrinsic width and nested
  grid minimum sizing, compounded by non-wrapping actions.
- Use existing Blade Select/combobox conventions, explicit constrained widths,
  shrinkable grid children, wrapping summaries/actions, and viewport gutters.
  Do not hide overflow as a substitute for making controls usable.
- Select the first permitted action (or an empty explanatory state), rather
  than hardcoding unavailable role assignment. Keep server enforcement intact.
- Resolve configured slugs through catalog labels, show description and saved
  note-source summary. Existing `getAdminForm` callback mappings should be
  inspected before adding any API fields.
- Give note source/fixed value visible labels. Saved settings should seed an
  edit flow rather than presenting an unrelated empty draft.
- Keep save failures in the dialog. On success, close and announce the result,
  refresh server-read props, and preserve unrelated unsaved builder edits.
  Add explicit error handling for disable.

### 3. Retain the response receipt

Likely files: `generic-form-response-form.tsx`, `generic-form-respondent.tsx`,
and `apps/blade/src/app/form/[slug]/page.tsx`.

- Use the returned `formResponseId` to navigate to the existing
  `/form/<slug>?responseId=<id>` ownership-checked receipt path instead of
  unconditionally reloading the same URL. Keep pages server components.
- Display and focus a clear submitted state; preserve the receipt on refresh.
  Use a transient immediate success state if navigation is delayed.
- For `multiple_locked`, provide an explicit action back to the bare form URL
  to start another response. Preserve single-locked and editable behavior.
- Audit all `GenericFormResponseForm` consumers and its optional `onSubmitted`
  callback before changing the component contract. Announce update success.
- Failed mutations preserve answers and show an accessible error. Do not infer
  that a callback failure means the response failed to save.

### 4. Confirm deletion and callback outcomes

Likely file: `form-responses-dashboard.tsx` and its interaction tests.

- Keep the existing pre-delete confirmation. Await deletion before closing the
  selected detail, refreshing the list/counts, and showing a success toast.
- Keep the detail open on failure and expose the error. Reset selection only
  for the response actually deleted; keep search and active tab.
- Retry returns a result that may itself be `failed` despite mutation success.
  Do not show a delivered toast merely because the HTTP mutation resolved.
- Display friendly callback labels and status explanations, retaining provider
  detail for diagnosis. Cancelled/deleted executions must not offer retry.

## Compatibility and rollout

- A new configuration affects future responses only; the PR must not silently
  enqueue historical submissions or revive legacy synchronous connections.
- An authorized maintainer deploys API-consuming Blade and Cron images and
  checks the revision of both, since manual retry and scheduled delivery can
  otherwise use different code.
- After deployment, an authorized operator may retry one retained execution
  that failed specifically with `NONCE_TYPE_TOO_LONG`, then verify its result.
  This is a separate side-effecting action, not part of this investigation.
- Cancelled executions whose responses were deleted remain cancelled. Failed
  executions are not automatically selected by `dispatchPendingFormCallbacks`.
- If a fresh execution remains pending, investigate cron scheduling. If it
  reports a different provider error, investigate that error separately.
- Reverting the nonce repair restores the known rejection; pause further
  operational retries if rollback is needed.

## Questions before expanding scope

- Historical parity: exact team-selection source, intended director mention,
  and minimum summary fields need confirmation. Reuse existing role/team data;
  do not scatter yearly Discord IDs into form components.
- Confirm Outreach's response mode in a permitted read-only view. The reported
  cleared form is directly explained by the multiple-response branch, but its
  live mode was not provided.
