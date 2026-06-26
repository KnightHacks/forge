# Member Field Editing Spec

Status: Draft / ready for review

> This file owns the non-technical user/product intent. Technical design belongs in `srd.md`.

## User-facing Purpose

An existing Knight Hacks member should be able to edit their own member profile after signup without going through admin support or re-submitting the onboarding form from scratch.

This is the next Reforge Blade member slice after initial onboarding. The feature should preserve the design continuity of the current member dashboard and member signup form while giving members a focused profile settings page for all editable member data.

The editing experience should feel like the form the user already completed, but adapted for settings:

- a lightweight dashboard entry point
- a dedicated `/member/settings` page
- Personal, Academics, and Guild sections matching signup
- one save action for profile fields
- upload controls for profile picture and resume that keep their existing immediate-save behavior
- clear dirty, reset, save, and navigation behavior
- a confirmed self-service profile deletion path for data-retention requests

## Users / Actors

- Signed-in Discord user with an existing Knight Hacks member profile.
- Signed-in Discord user without a member profile.
- Public visitor without a session.

Officer/admin users exist in the broader product, but admin editing is out of scope for this slice.

## User-visible Interface

### Member Route Namespace

- Member-facing routes should live under `/member`.
- The canonical member dashboard route is `/member/dashboard`.
- The canonical member settings/edit route is `/member/settings`.
- The previous `/dashboard` route should redirect to `/member/dashboard` during this transition.
- The previous `/settings` and `/settings/profile` routes should redirect to `/member/settings` if they are reached.
- Sign-in callbacks and member signup completion should point to `/member/dashboard`.

### Dashboard Entry Point

- The member dashboard should include a small, unobtrusive cog/settings action that links to profile editing.
- The action should not dominate the dashboard or turn the dashboard into an editing surface.
- The dashboard remains primarily read-only outside existing profile-picture and resume upload controls.
- The edit action should be discoverable on desktop and mobile.

### Profile Settings Page

- The edit surface lives at `/member/settings`.
- The page uses the authenticated Blade shell and should visually feel connected to the member dashboard.
- The page should also feel connected to the signup form:
  - same section organization
  - similar card hierarchy
  - similar field labels and controls where possible
  - no sudden legacy-style visual drift
- The page should include an easy path back to `/member/dashboard`.
- The page should stay on `/member/settings` after a successful save.
- After save, the page should show a clear saved state.
- The page should include a small destructive section for deleting the member profile and account.
- Profile deletion should require an explicit confirmation and should not be mixed into the normal save button.

### Editable Member Fields

All member-owned fields from the current `Member` profile should be editable unless they are server-owned.

Editable fields include:

- first name
- last name
- email
- phone number
- date of birth
- school
- level of study
- major
- gender
- race or ethnicity
- shirt size
- graduation term/year or equivalent graduation date control
- company
- GitHub profile URL
- LinkedIn profile URL
- portfolio/website URL
- tagline
- about
- Guild profile visibility
- profile picture
- resume

Server-owned fields are not editable directly:

- `userId`
- `discordUser`
- `age`
- `points`
- generated IDs
- created timestamps

`discordUser` and `age` may still be refreshed by the server during update from the current session and date of birth.

### Sections

The profile editor should use the same high-level organization as member signup:

- Personal
- Academics
- Guild

Profile picture and resume controls should appear in context on the settings page for continuity, but they remain immediate-save upload flows instead of becoming part of the profile form's save-all transaction.

### Save / Dirty State

- Text, select, boolean, and date profile fields should use one `Save changes` action.
- The save button should be disabled or clearly inactive when nothing changed.
- A whole-form undo/reset action should restore the form to the last saved member values.
- If the user tries to leave with unsaved changes, the UI should warn them where practical.
- Field-level validation errors should be shown before save.
- Server errors should be safe, understandable, and should not expose database internals.

### Profile Deletion

- Members should be able to delete their own profile from `/member/settings`.
- Deletion should remove the current user's member profile and built-in member signup form response.
- Deletion should also remove the current user's auth account so the user is signed out.
- Deletion should send the browser back to the public root route after completion.
- Stored profile-picture and resume objects owned by the user should be removed on a best-effort basis.
- Deletion is destructive and does not need an undo path.

### Upload Behavior

- Profile-picture upload keeps the existing avatar overlay behavior.
- Resume upload keeps the existing upload/view/replace/remove behavior.
- Uploads are immediate-save flows with their own loading/error states.
- Upload success should keep the page and dashboard consistent after refresh.
- Uploads are not bundled into the `Save changes` button because object storage side effects cannot be rolled back as cleanly as member/form-response database fields.

### Form Response Sync

Member editing should source initial values from the `Member` table, not from `FormResponse`.

When a member saves edits:

- the `Member` row should update
- the member signup `FormResponse` should update to match the editable fields
- if the member has no signup response, the system should backfill one
- legacy/prod backfilled responses should write `codeOfConductAccepted: true` for compatibility without showing the checkbox again

This keeps legacy/prod members pulled into the new form-response model without forcing them through signup again.

### Code of Conduct

The profile settings page should not ask the member to accept the Knight Hacks Code of Conduct again.

Code of Conduct acceptance remains signup-only evidence from the original member signup flow.

## Scope

### In Scope

- `/member/dashboard` route as the canonical member dashboard.
- `/member/settings` route for authenticated member profile editing.
- Redirects from old member paths, including `/dashboard`, `/settings`, and `/settings/profile`.
- Dashboard cog/settings entry point.
- Full self-service editing of current member-owned profile fields.
- Personal, Academics, and Guild section organization matching signup.
- One save action for non-upload profile fields.
- Whole-form reset/undo.
- Dirty-state navigation protection where practical.
- Server-side update of the current user's `Member` row.
- Server-side update/backfill of the built-in member signup `FormResponse`.
- Generic forms-manager response update capability used by member editing.
- Existing profile-picture upload/update/clear controls on settings.
- Existing resume upload/update/clear/view controls on settings.
- Confirmed self-service profile/account deletion from settings.
- Validation for required fields, enum values, dates, age, phone, email, URLs, and text length.
- E2E coverage for editing and persistence.

### Out of Scope

- Admin editing of other members.
- General settings navigation beyond the member profile page.
- Admin form builder support for editable forms.
- Public Guild directory behavior.
- Discord role sync or Discord side effects beyond refreshing the stored Discord display name from session data.
- Editing auth `User` account data directly.
- New database tables for Guild profile data.
- Changing profile-picture or resume storage architecture.
- Migrating all historical form responses outside the current member edit backfill path.

## Vocabulary

- `Member`: Knight Hacks membership profile data linked to an auth `User`.
- `User`: Auth/account identity owned by the authentication system.
- `Profile settings`: The self-service member editing experience at `/member/settings`.
- `Guild profile`: The public/sponsor-facing subset of member profile fields, still persisted on `Member` for this slice.
- `Form response sync`: Updating or backfilling the built-in member signup `FormResponse` so form-response data matches the current `Member` row.
- `Dirty state`: The UI state where the visible form has unsaved changes.
- `Profile deletion`: A confirmed self-service action that removes the current user's `Member`, signup `FormResponse`, owned upload objects, and auth `User`.

## Acceptance Criteria

- A member can reach `/member/settings` from `/member/dashboard` through a small cog/settings action.
- A member can return from `/member/settings` to `/member/dashboard` easily.
- `/member/settings` is protected from unauthenticated users.
- `/dashboard` redirects to `/member/dashboard`.
- `/settings` and `/settings/profile` redirect to `/member/settings`.
- A signed-in user without a member profile is routed to member signup rather than shown profile settings.
- The settings page is prefilled from the current `Member` row.
- The settings page is organized into Personal, Academics, and Guild sections matching signup.
- All current member-owned fields are editable.
- Server-owned fields are not directly editable by the client.
- A member can change valid profile fields and save them with one save action.
- Saving updates the current user's `Member` row.
- Saving refreshes server-derived fields where applicable, including age from date of birth and Discord display value from the current session.
- Saving updates the member signup `FormResponse` when one exists.
- Saving backfills a member signup `FormResponse` when one does not exist.
- Saving `Member` and `FormResponse` data succeeds or fails as one database operation.
- Email and phone uniqueness are preserved while unchanged values remain valid.
- Required fields remain required on edit.
- Invalid fields show safe validation feedback and do not persist partial profile data.
- The whole-form reset action restores the last saved values.
- The UI warns about unsaved changes where practical.
- Profile-picture and resume controls work on the settings page with the same immediate-save behavior used on the dashboard.
- Profile-picture and resume uploads do not wait for the `Save changes` button.
- The settings page does not include Code of Conduct acceptance.
- The implementation avoids the legacy mismatch where profile editing updates `Member` but not form responses.
- A member can delete their own profile from settings after confirmation.
- Deleting a profile removes the current user's `Member` row and member signup `FormResponse`.
- Deleting a profile removes the current user's auth account and returns the browser to `/`.
- Deleting a profile signs out the current session, including the env-gated e2e auth state.
- Deleting a profile attempts to remove owned profile-picture and resume storage objects.

## Resolved Choices

- Use `/member/settings`, not an inline dashboard editor.
- Use `/member/dashboard` as the canonical member dashboard route.
- Keep the dashboard edit entry point as a lightweight cog/settings action.
- Stay on `/member/settings` after save.
- Use one save action for all non-upload member fields.
- Keep profile-picture and resume upload flows separate and immediate-save.
- Source edit initial values from `Member`, not from `FormResponse`.
- Update/backfill the member signup `FormResponse` during save.
- Add a generic forms-manager update response capability now.
- Use a database transaction for `Member` and `FormResponse` writes.
- Do not ask for Code of Conduct acceptance again during edit.
- Add a confirmed self-service delete profile path for retention requests.
- Delete member profile data, signup response data, and auth identity together before returning the user to `/`.
- Keep admin editing out of scope.
