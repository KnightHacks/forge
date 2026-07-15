# Member Field Editing SRD

Status: Complete

> This file owns technical implementation constraints and accepted architecture for this feature slice.

## Technical Purpose

Add self-service member profile editing to Reforge Blade:

```txt
/member/dashboard -> /member/settings -> edit member fields -> save -> dashboard reflects changes
```

The feature should establish the durable update pattern for member-owned profile data:

- update the current user's `Member` row
- keep the code-owned member signup `FormResponse` synchronized
- backfill a signup response for legacy/prod members that do not have one
- keep upload storage side effects isolated to the existing resume/profile-picture flows
- support confirmed profile deletion for data-retention requests
- preserve Blade design continuity with the dashboard and signup surfaces

## Relevant Principles

- `docs/agentic-development/forge-engineering-principles.md`: product architecture and package boundaries.
- `docs/agentic-development/forge-engineering-principles.md`: readability, colocation, and router workflow guidance.
- `docs/agentic-development/forge-engineering-principles.md`: tRPC/API principles.
- `docs/agentic-development/forge-engineering-principles.md`: validation and transaction principles.
- `apps/blade/DESIGN_SYSTEM.md`: Blade visual system, dashboard surface hierarchy, and form/card continuity.
- `.forge/features/initial-member-onboarding/srd.md`: current member signup, dashboard, upload, and form-callback behavior.

## Access Policy

- Unauthenticated/public:
  - Must not access `/member/settings`.
  - Must be redirected or routed to sign-in/public landing.
- Logged-in user without a member profile:
  - Must not see an empty settings editor.
  - Should be routed to `/form/member-signup`.
- Logged-in user with a member profile:
  - May read their own member profile.
  - May edit their own member profile.
  - May update or clear their own profile picture and resume through existing upload procedures.
  - May delete their own member profile, member signup response, owned uploads, and auth account.
- Officer/admin/organizer:
  - No special editing access is added in this slice.
  - Editing another member is out of scope.

All member update behavior must be enforced server-side. Client routing is UX only.

## Existing Architecture Context

Current Reforge member onboarding provides:

- `member.getMember`: current-user member read.
- `member.createMember`: current-user member creation from validated signup data.
- `forms.createResponse`: generic form response creation plus registered callback execution.
- Code-owned `member-signup` form config and callback mapping.
- Dashboard profile-picture and resume update flows through dedicated upload routers.
- `useMember`: reusable Blade client hook for current-member query and redirects.

Legacy findings to avoid:

- Legacy self-edit lived at `/settings` with a settings sidebar and long form. The route worked, but visual continuity drifted from the dashboard and forms.
- Legacy profile editing updated `Member` only. It did not update `FormResponse`.
- Legacy generic form response editing rewrote JSON data only and did not safely rerun callbacks.
- Legacy reused ambiguous update paths for self-service and admin editing.
- Legacy duplicated member-field definitions across settings, admin, application, and generic forms.

This slice should keep the useful idea of a dedicated settings page, but not inherit the data drift or visual mismatch.

## Route / UI Design

### Routes

- Move the canonical member dashboard to `/member/dashboard`.
- Add `/member/settings` as the member self-service edit route.
- Redirect `/dashboard` to `/member/dashboard`.
- Redirect `/settings` and `/settings/profile` to `/member/settings`.
- Update Discord sign-in callback URLs to target `/member/dashboard`.
- Update member signup completion redirects to target `/member/dashboard`.
- Keep page files server-first:
  - route-level auth/session guard
  - no page-level `"use client"`
  - redirect no-session users away
  - redirect authenticated users without a member profile to `/form/member-signup`
- Render a Blade client component for form interactivity.

### Dashboard Entry

- Add a small cog/settings button on the member dashboard.
- The control links to `/member/settings`.
- The control should be visually quiet and aligned with the dashboard's current card hierarchy.

### Settings Page Layout

The settings page should blend dashboard and signup visual language:

- authenticated shell
- container width similar to signup/settings content
- easy dashboard back link
- high-level page heading
- sections matching signup: Personal, Academics, Guild
- top-level cards using the lighter dashboard card surface
- nested fields/upload rows using the darker inset surface where useful
- no large marketing hero
- no legacy sidebar unless/until settings grows beyond one page

### Client Form Behavior

- Use one form state for non-upload member fields.
- Use one `Save changes` action.
- Use one whole-form `Reset changes` action.
- Disable save or mark it inactive when not dirty.
- Warn on unload/navigation when dirty where practical.
- Stay on `/member/settings` after save.
- Refresh or update cached `member.getMember` data after save.
- Include a destructive delete section with explicit confirmation.
- Keep profile deletion outside the normal save/dirty-state workflow.

Profile picture and resume controls:

- Appear on `/member/settings`.
- Reuse the existing upload components/behavior where possible.
- Auto-save immediately.
- Do not participate in the save-all dirty state.

## API Surface

Accepted API additions:

- `member.updateMember`: protected mutation that updates the current user's member profile and syncs the member signup response.
- `member.deleteMember`: protected mutation that deletes the current user's member profile, built-in member signup response, auth permissions, and auth user.
- `forms.updateResponse`: generic server-side service capability for updating a form response's JSON data and `editedAt`.

Potential exposed tRPC procedure:

- `forms.updateResponse` may remain a utility/service first if no generic UI calls it yet.
- If exposed as a tRPC mutation, it must enforce `allowEdit`, ownership, permissions, and validation. For this slice, member editing does not need a generic client-facing forms edit endpoint.

Existing API procedures remain:

- `member.getMember`
- `member.createMember`
- `member.updateMember`
- `member.deleteMember`
- `forms.getForm`
- `forms.createResponse`
- `resume.uploadResume`
- `resume.saveMemberResume`
- `resume.getResume`
- `profilePicture.uploadProfilePicture`
- `profilePicture.saveMemberProfilePicture`
- `profilePicture.getProfilePicture`

## Member Update Behavior

`member.updateMember` should:

1. Require an authenticated session.
2. Validate input with a member update schema.
3. Load the current user's existing member.
4. Reject if no member exists.
5. Recompute `age` from `dob`.
6. Refresh `discordUser` from the current session.
7. Normalize optional strings consistently with signup.
8. Normalize/derive `gradDate` from the edit form's graduation term/year input, or use an equivalent validated graduation date representation.
9. Preserve server-owned fields that are not editable.
10. Update only the current user's `Member` row.
11. Update or backfill the built-in member signup `FormResponse`.
12. Return the updated member.

Workflow logic should live directly in `packages/api/src/routers/member.ts` unless it becomes shared by multiple procedures or a generic forms service needs a clear boundary.

Duplicate email/phone behavior:

- Unchanged values should pass.
- Changed values must still respect database uniqueness.
- Duplicate conflicts should be translated into safe user-facing errors.
- The implementation may proactively check other member rows or rely on database unique constraints, but resulting errors must be readable.

## Member Delete Behavior

`member.deleteMember` should:

1. Require an authenticated session.
2. Load the current user's existing member.
3. Reject if no member exists.
4. Delete the current user's built-in member signup `FormResponse`.
5. Delete the current user's `Member` row.
6. Delete current-user auth permission rows that would otherwise restrict `auth_user` deletion.
7. Delete the current user's auth `User` row.
8. Rely on existing database cascades for auth account/session rows.
9. Attempt best-effort cleanup for owned profile-picture and resume objects after the database transaction commits.
10. Return a small success payload so the client can sign out and route to `/`.

Deletion should live in `packages/api/src/routers/member.ts` because it is a member-owned self-service workflow. Storage cleanup helpers may stay in the existing resume/profile-picture utility boundaries.

## Form Response Sync

### Source of Truth

Member editing initializes from `Member`, not from `FormResponse`.

`FormResponse` sync is a consistency side effect of saving member edits. This prevents old or missing response JSON from overriding the real member profile.

### Update / Backfill Rules

On successful member edit:

- Find the current user's response for the built-in member signup form.
- If it exists, update `responseData` and `editedAt`.
- If it does not exist, insert a response for the built-in member signup form with response data derived from the updated member.
- Backfilled response data should match the code-owned member signup response shape as closely as possible.
- Do not include a new Code of Conduct acceptance prompt on edit.
- If the response schema requires Code of Conduct acceptance, the backfill/update layer must preserve an existing `codeOfConductAccepted` value when present and write `codeOfConductAccepted: true` for legacy/prod backfills that have no prior response.

### Generic Forms Service

Add a generic forms-manager service for response updates, likely in `packages/api/src/utils/forms/manager.ts`.

The service should:

- load or prepare code-owned form metadata
- validate response data against the form schema when appropriate
- enforce ownership and editability when used as a generic form update
- update `responseData` and `editedAt`
- optionally insert/backfill when the caller explicitly requests upsert behavior
- not import member-specific code
- not invoke callbacks during edits by default

For this member slice, `member.updateMember` should call the generic forms update capability inside the same DB transaction used for the member update.

Callback note:

- Do not rerun `member.createMember` when editing.
- `member.updateMember` is the domain update workflow.
- Generic editable form callbacks remain a later design problem.

## Transaction / Consistency

Use one database transaction for:

- current-user `Member` update
- member signup `FormResponse` update/backfill

Expected failure behavior:

- If member validation fails, no database writes occur.
- If the member update fails, no form response update/backfill persists.
- If the form response update/backfill fails, the member update rolls back.
- Upload object storage side effects are excluded from this transaction because they happen through existing upload APIs before or outside save-all.

Use a separate database transaction for profile deletion:

- current-user member signup `FormResponse` delete
- current-user `Member` delete
- current-user auth permission delete
- current-user auth `User` delete

Expected deletion failure behavior:

- If no member exists, no delete occurs.
- If auth deletion fails, member and form-response deletes roll back.
- Upload-object cleanup runs only after the database transaction commits and should log/continue on storage failure.

## Validation

Add a member edit/update schema in `@forge/validators`.

Recommended validator shape:

- Extract shared member field constraints from the current signup validator.
- Keep `memberFormSchema` for signup, including Code of Conduct.
- Add `memberUpdateFormSchema` or `memberUpdateSchema` for edit, excluding Code of Conduct.
- Keep names short and durable.
- Preserve required fields on edit.
- Reuse enum values from `@forge/consts`.
- Keep optional string normalization consistent with signup.

Validation must cover:

- required text fields
- email format
- optional phone format
- date of birth and minimum age
- school enum
- level of study enum
- major enum
- gender enum
- race/ethnicity enum
- shirt size enum
- graduation term/year or graduation date
- optional URL format
- tagline length
- about length
- Guild profile visibility boolean
- optional upload object-name fields when part of a response payload

Server-derived fields:

- `age` is recomputed from `dob`.
- `discordUser` is taken from session.
- `userId` is taken from session.
- `points`, IDs, and timestamps are not client input.

## Field Mapping

The profile settings form should use the same field definitions as signup wherever practical, minus Code of Conduct and with edit-specific copy.

The implementation should avoid maintaining divergent field lists across:

- signup form
- settings form
- validators
- form-response sync
- tests

If a shared field definition is introduced, keep it readable and avoid names that encode too much implementation detail.

## Uploads

Resume and profile-picture update behavior should reuse the existing storage/security design from the initial onboarding slice.

Settings page upload behavior:

- profile picture:
  - upload image through `profilePicture.uploadProfilePicture`
  - save object name through `profilePicture.saveMemberProfilePicture`
  - clear through `profilePicture.saveMemberProfilePicture` with an empty value
  - render initials fallback when cleared
- resume:
  - upload PDF through `resume.uploadResume`
  - save object name through `resume.saveMemberResume`
  - clear through `resume.saveMemberResume` with an empty value
  - preview through existing local object URL or signed URL behavior

Uploads should remain immediate-save because they involve MinIO side effects and already have dedicated ownership/security checks.

Profile deletion should remove owned upload objects after the database delete commits:

- profile-picture cleanup lists the user's profile-picture object prefix and removes owned objects
- resume cleanup lists the user's resume object prefix and removes unreferenced owned objects
- cleanup failures should not resurrect deleted database rows

## Frontend State / Cache

After `member.updateMember` succeeds:

- update or invalidate `member.getMember`
- reset dirty state to the returned member values
- show saved feedback
- leave the user on `/member/settings`

After upload mutations succeed:

- invalidate or update `member.getMember` if the dashboard/settings state depends on the saved object name
- avoid layout shift in avatar/resume controls

After `member.deleteMember` succeeds:

- clear the e2e auth cookie through `/api/e2e/signout` when e2e auth is enabled
- otherwise call the configured auth client's sign-out path
- route the browser to `/`
- refresh so protected member routes observe the deleted auth/session state

## Design Constraints

- Follow `apps/blade/DESIGN_SYSTEM.md`.
- Highest-level cards should use the lighter dashboard panel surface.
- Nested field groups, link rows, or compact detail surfaces may use the darker gray/purple inset surface.
- Keep content top-aligned.
- Avoid large slide/fade page animations for settings load.
- Do not use a separate raised card inside another raised card.
- Keep mobile field controls readable and non-overlapping.
- The settings page should not look like the legacy settings sidebar unless a future settings hub justifies it.

## Implementation Plan

Likely files:

- `apps/blade/src/app/member/dashboard/page.tsx`
- `apps/blade/src/app/member/settings/page.tsx`
- redirect shims for `apps/blade/src/app/dashboard/page.tsx`, `apps/blade/src/app/settings/page.tsx`, and `apps/blade/src/app/settings/profile/page.tsx` as needed
- `apps/blade/src/app/_components/member/member-profile-settings-form.tsx`
- `apps/blade/src/app/_components/member/member-dashboard.tsx`
- `apps/blade/src/app/_components/auth/sign-out-flow.ts`
- `apps/blade/src/hooks/use-member.ts` if settings needs reusable redirect behavior
- `packages/validators/src/member.ts`
- `packages/validators/src/tests/member.test.ts`
- `packages/api/src/routers/member.ts`
- `packages/api/src/utils/forms/manager.ts`
- `packages/api/src/utils/profile-picture/storage.ts`
- `packages/api/src/utils/resume/storage.ts`
- `packages/api/src/tests/forms/manager.test.ts`
- `packages/api/src/tests/member/profile.test.ts`
- `apps/blade/src/tests/member/member-profile-settings.test.tsx`
- `apps/blade/src/tests/e2e/member-field-editing.spec.ts`

Router workflow:

- Keep `member.updateMember` readable and colocated.
- Extract only genuinely shared helpers:
  - response data serialization from member values
  - generic forms response update/upsert
  - reusable unique-constraint detection if already shared

## Legacy Compatibility

Legacy/prod members may have:

- a `Member` row but no member signup `FormResponse`
- older resume/profile-picture URL shapes
- values that were not originally created through the new signup validator

This feature should:

- initialize from `Member`
- allow valid edits through the new schema
- backfill missing member signup responses on save
- preserve existing upload compatibility behavior from the initial onboarding implementation

## Open Questions

- None for this feature. Compatibility redirects remain in place; removing them
  is a future Reforge cutover decision.
