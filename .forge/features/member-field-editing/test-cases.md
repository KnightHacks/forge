# Member Field Editing Test Cases

Status: Implemented / validated in automated tests

> This file owns observable proof for this feature slice.

## Scope

These cases cover self-service member profile editing:

```txt
/member/dashboard cog -> /member/settings -> edit fields -> save -> member/form response synced -> dashboard reflects updates
```

The cases intentionally exclude admin editing, generic admin form editing UI, public Guild directory behavior, Discord role side effects, and broader settings navigation.

## Test Placement Plan

- Validator tests: `packages/validators/src/tests/member.test.ts`.
- API member/form response tests: `packages/api/src/tests/**`.
- Blade component tests: `apps/blade/src/tests/member/**`.
- End-to-end tests: `apps/blade/src/tests/e2e/member-field-editing.spec.ts`.

Candidate commands:

```bash
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade lint
pnpm --filter=@forge/blade typecheck
```

## Test Cases

### TC-001: Old Dashboard Route Redirects To Member Dashboard

Setup:

- A valid session exists.
- The user has a member profile.

Action:

- Visit `/dashboard`.

Expected observations:

- The route redirects to `/member/dashboard`.
- The member dashboard renders after redirect.
- A small cog/settings action is visible.
- The action links to `/member/settings`.
- The action does not replace or dominate dashboard content.

### TC-001B: Canonical Dashboard Exposes Profile Settings Entry

Setup:

- A valid session exists.
- The user has a member profile.

Action:

- Visit `/member/dashboard`.

Expected observations:

- The dashboard renders the member profile.
- A small cog/settings action is visible.
- The action links to `/member/settings`.
- The action does not replace or dominate dashboard content.

### TC-002: Public User Cannot Access Profile Settings

Setup:

- No active session exists.

Action:

- Visit `/member/settings`.

Expected observations:

- The user is redirected to the public/sign-in flow.
- Profile settings content is not visible.

### TC-002B: Old Settings Routes Redirect To Member Settings

Setup:

- A valid session exists.
- The user has a member profile.

Action:

- Visit `/settings`.
- Visit `/settings/profile`.

Expected observations:

- Both routes redirect to `/member/settings`.
- The profile settings form renders after redirect.
- The redirected page still enforces the member profile requirement.

### TC-003: Authenticated User Without Member Is Routed To Signup

Setup:

- A valid session exists.
- No member profile exists for the user.

Action:

- Visit `/member/settings`.

Expected observations:

- The user does not see an empty settings form.
- The user is routed to `/form/member-signup`.

### TC-004: Profile Settings Prefills From Member Row

Setup:

- A valid session exists.
- A member profile exists.
- A stale or different `FormResponse` may exist for the user.

Action:

- Visit `/member/settings`.

Expected observations:

- Fields are prefilled from the current `Member` row.
- Stale `FormResponse.responseData` does not override the member values.
- Personal, Academics, and Guild sections are visible.
- Code of Conduct acceptance is not shown as an edit field.

### TC-005: Required Fields Remain Required On Edit

Setup:

- A valid session exists.
- A member profile exists.
- The profile settings page is visible.

Action:

- Clear one or more required fields and submit.

Expected observations:

- Validation errors appear near the relevant fields.
- `member.updateMember` does not persist partial data.
- The user remains on `/member/settings`.

### TC-006: Invalid Values Are Rejected

Setup:

- A valid session exists.
- A member profile exists.

Action:

- Enter invalid values such as invalid email, invalid phone, invalid optional URL, underage date of birth, or invalid enum value.
- Submit the form.

Expected observations:

- Validation errors are safe and field-specific.
- The member row is not updated.
- The form response is not updated.

### TC-007: Save Updates All Editable Member Fields

Setup:

- A valid session exists.
- A member profile exists.
- A member signup `FormResponse` exists.

Action:

- Change valid values across Personal, Academics, and Guild fields.
- Save changes.

Expected observations:

- One save action updates all non-upload profile fields.
- The current user's `Member` row is updated.
- `age` is recomputed from `dob`.
- `discordUser` is refreshed from the current session.
- Server-owned fields are not accepted from the client.
- The page remains at `/member/settings`.
- Saved feedback is shown.
- The save action returns to a clean/not-dirty state.

### TC-008: Save Updates Existing Member Signup Response

Setup:

- A valid session exists.
- A member profile exists.
- A member signup `FormResponse` exists for the same user.

Action:

- Edit member fields and save.

Expected observations:

- `FormResponse.responseData` is updated to match the saved editable member fields.
- `FormResponse.editedAt` changes.
- No `member.createMember` callback is rerun.
- The response update and member update commit together.

### TC-009: Save Backfills Missing Member Signup Response

Setup:

- A valid session exists.
- A member profile exists.
- No member signup `FormResponse` exists for the user.

Action:

- Edit member fields and save.

Expected observations:

- The member row updates.
- A new member signup `FormResponse` is inserted for the user.
- The response data is derived from the saved `Member` row.
- The backfilled response writes `codeOfConductAccepted: true` for compatibility.
- The backfill does not require the user to re-accept Code of Conduct on the settings page.

### TC-010: Member And Response Writes Roll Back Together

Setup:

- A valid session exists.
- A member profile exists.
- The forms response update/backfill path can be made to fail in the test.

Action:

- Submit otherwise valid profile changes.

Expected observations:

- The mutation fails safely.
- The `Member` row remains unchanged.
- The `FormResponse` row remains unchanged or absent.
- The user sees an understandable error.

### TC-011: Duplicate Email Or Phone Is Rejected Safely

Setup:

- A valid session exists.
- The current user has a member profile.
- Another member owns an email or phone number.

Action:

- Change the current member's email or phone number to the other member's value.
- Save.

Expected observations:

- The update is rejected.
- The error message is safe and understandable.
- Existing unchanged email/phone values remain valid when saving other fields.

### TC-012: Dirty State And Whole-form Reset

Setup:

- A valid session exists.
- A member profile exists.
- The profile settings page is visible.

Action:

- Change one or more fields.
- Use the reset/undo action.

Expected observations:

- The form values return to the last saved member values.
- The save action returns to inactive/not-dirty state.
- No API update is sent by reset alone.

### TC-013: Dirty Navigation Warning

Setup:

- A valid session exists.
- A member profile exists.
- The profile settings page is visible.

Action:

- Change a field without saving.
- Attempt to leave the page, go back, or navigate to dashboard.

Expected observations:

- The UI warns about unsaved changes where the browser/framework allows it.
- Staying keeps the unsaved form values.
- Leaving discards unsaved changes.

### TC-014: Dashboard Reflects Saved Changes

Setup:

- A valid session exists.
- A member profile exists.

Action:

- Edit member profile fields at `/member/settings`.
- Save.
- Navigate to `/member/dashboard`.

Expected observations:

- Dashboard member summary reflects updated fields.
- Guild card reflects updated Guild fields and visibility.
- A reload keeps the updated values.

### TC-015: Profile-picture Upload Works On Settings

Setup:

- A valid session exists.
- A member profile exists.
- The profile settings page is visible.

Action:

- Upload a valid profile picture.
- Replace it.
- Clear it.

Expected observations:

- Upload uses the existing profile-picture API.
- The saved object belongs to the current user.
- The avatar preview updates.
- Clearing returns to initials fallback.
- Upload pending/error state does not alter unrelated form dirty state.

### TC-016: Resume Upload Works On Settings

Setup:

- A valid session exists.
- A member profile exists.
- The profile settings page is visible.

Action:

- Upload a valid PDF resume.
- View it.
- Replace it.
- Clear it.

Expected observations:

- Upload uses the existing resume API.
- The saved object belongs to the current user.
- Resume preview/view behavior works.
- Clearing removes the persisted resume reference.
- Upload pending/error state does not alter unrelated form dirty state.

### TC-017: Upload Validation Is Preserved

Setup:

- A valid session exists.
- A member profile exists.

Action:

- Try invalid profile-picture and resume uploads.

Expected observations:

- Unsupported image/PDF types are rejected.
- Oversized files are rejected.
- Malformed data URLs are rejected.
- Invalid upload attempts do not change the saved member profile.

### TC-018: Generic Forms Update Service Validates Ownership And Data

Setup:

- A form response exists for one user.
- A different user is authenticated.

Action:

- Attempt to update the other user's response through the generic forms update service or direct utility tests.

Expected observations:

- Cross-user update is rejected.
- Invalid response data is rejected.
- `editedAt` updates only on successful response changes.
- Member-specific behavior is not imported into the generic forms manager.

### TC-019: Playwright Full Edit Flow

Setup:

- Use the env-gated Blade e2e auth seam.
- Seed a member profile and, in one scenario, a matching signup form response.

Action:

- Visit `/member/dashboard`.
- Click the cog/settings action.
- Edit values across Personal, Academics, and Guild sections.
- Save.
- Return to dashboard.
- Reload.

Expected observations:

- Route transitions work.
- Form sections render.
- Changes persist.
- Dashboard reflects changes.
- Form response sync can be asserted through the test database.

### TC-020: Playwright Legacy Backfill Flow

Setup:

- Use the env-gated Blade e2e auth seam.
- Seed a member profile with no member signup response.

Action:

- Visit `/member/settings`.
- Edit and save member fields.

Expected observations:

- Save succeeds.
- Member row updates.
- A member signup form response is backfilled.
- The user never sees a signup-only Code of Conduct checkbox on settings.

### TC-021: Profile Deletion Removes Member, Response, Auth, And Session

Setup:

- Use the env-gated Blade e2e auth seam.
- A valid session exists.
- A member profile exists.
- A member signup `FormResponse` exists.

Action:

- Visit `/member/settings`.
- Open the destructive delete confirmation.
- Confirm profile deletion.

Expected observations:

- The UI requires confirmation before deleting.
- `member.deleteMember` removes the current user's `Member` row.
- The current user's member signup `FormResponse` is removed.
- The current user's auth `User` is removed, with auth account/session rows handled by cascade.
- Auth permission rows for the user are removed before auth user deletion.
- The browser is routed back to `/`.
- The e2e auth cookie/session is cleared.
- Revisiting `/member/dashboard` without a new sign-in redirects away from the protected member page.
- Owned profile-picture and resume objects are cleaned up on a best-effort basis.
