# Member QR Codes Test Cases

Status: Complete

> This file owns observable proof.

## Scope

These cases cover member-dashboard QR viewing and API access behavior.

Excluded:

- scanner/check-in flows
- PassKit/member wallet pass generation
- MinIO storage, migration, cleanup, or legacy QR object compatibility

## Test placement plan

- API behavior: `packages/api/src/tests/qr/router.test.ts`
- Dashboard component behavior: `apps/blade/src/tests/member/member-dashboard.test.tsx`
- User path behavior: existing Blade Playwright member dashboard tests where cheap and stable

## Test cases

### TC-001: Member Can Retrieve User QR

Setup:

- Authenticated session exists for a user with a member profile.

Action:

- Call the QR query.

Expected observations:

- Response includes an image data URL.
- The QR payload source is the raw current `User.id`.
- No MinIO write/read is required.

### TC-002: Dashboard Shows QR Action

Setup:

- Authenticated member opens the member dashboard.

Action:

- Inspect the dashboard.

Expected observations:

- The QR action is visible.
- On mobile, the QR action is inside the Guild profile card and styled as a prominent primary action.
- On desktop, the QR action is easy to find in the member-details side.

### TC-003: Member Opens QR Dialog

Setup:

- Authenticated member is on the dashboard.

Action:

- Activate the QR action.

Expected observations:

- A centered dialog opens.
- The dialog shows the generated QR image.
- Loading and failure states are contained in the dialog.

## Negative / regression cases

### TC-NEG-001: Unauthenticated User Cannot Retrieve QR

Setup:

- No authenticated session exists.

Action:

- Call the QR query.

Expected observations:

- Query fails as unauthorized.

### TC-NEG-002: Authenticated Non-member Cannot View Member-dashboard QR

Setup:

- Authenticated user exists without a member profile.

Action:

- Visit dashboard or call the member-dashboard QR query.

Expected observations:

- Dashboard routes to onboarding and does not show a QR action.
- QR query does not return a QR image for the non-member.

### TC-NEG-003: Legacy QR Storage Is Not Used

Setup:

- Legacy MinIO QR objects may or may not exist.

Action:

- Open the member QR dialog.

Expected observations:

- The dialog still works from the current `User.id`.
- No MinIO QR storage behavior is required by the feature.

## Open questions

- None for this slice.
