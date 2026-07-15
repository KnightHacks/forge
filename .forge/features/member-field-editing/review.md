# Member Flow Review

Status: Complete

> This is a human code-review guide for the Reforge member onboarding, editing, upload, deletion, and tests in this branch.

## Architecture Summary

The current member slice is organized around a code-owned form model instead of a hardcoded one-off member application:

```txt
/form/member-signup
  -> forms.createResponse
  -> FormResponse insert
  -> registered member.createMember callback
  -> Member insert
  -> /member/dashboard
```

Creation is response-first but transactionally durable: `forms.createResponse` validates the response, inserts `FormResponse`, and runs the registered `member.createMember` callback in the same DB transaction. If the member callback fails, the response rolls back with it.

Editing is member-first:

```txt
/member/settings
  -> prefill from Member
  -> member.updateMember
  -> Member update
  -> member signup FormResponse update/backfill
  -> stay on settings or return to dashboard
```

Deletion is account-level:

```txt
/member/settings
  -> member.deleteMember
  -> delete signup FormResponse
  -> delete Member
  -> delete auth Permissions
  -> delete auth User
  -> sign out
  -> /
```

Profile-picture and resume uploads are intentionally separate immediate-save flows. The profile form does not try to bundle MinIO object writes into the save-all member transaction.

## Main Files

- `packages/validators/src/member.ts`
  - Canonical member schemas, normalization, age and graduation helpers.
  - Code-owned member signup form metadata.
  - Signup/settings field definitions.
  - Response serialization for syncing `FormResponse`.
- `packages/api/src/utils/forms/manager.ts`
  - Code-owned form lookup/preparation.
  - `createResponse` with transactional callback execution.
  - `updateResponse` with validation, ownership checks, edit enforcement, and optional upsert.
- `packages/api/src/utils/member/onboarding.ts`
  - Code-owned member signup form config.
  - Callback mapping from form response data to `createMemberProfile`.
- `packages/api/src/utils/member/profile.ts`
  - Member creation workflow shared by the form callback and member router.
  - Session-derived `userId` and `discordUser`.
  - Resume/profile-picture object ownership normalization.
  - Unique violation translation.
- `packages/api/src/routers/member.ts`
  - Current member read.
  - Member creation.
  - Member update plus form-response sync/backfill.
  - Member/profile/account deletion.
- `packages/api/src/routers/resume.ts`
  - Resume upload/save/get procedures.
- `packages/api/src/routers/profile-picture.ts`
  - Profile-picture upload/save/get procedures.
- `packages/api/src/utils/resume/*`
  - PDF data validation, object naming, ownership, presigned reads, cleanup.
- `packages/api/src/utils/profile-picture/*`
  - Image data validation, object naming, ownership, presigned reads, cleanup.
- `apps/blade/src/app/form/[slug]/page.tsx`
  - Server route for code-owned forms.
  - Protects unsupported slugs and redirects existing members.
- `apps/blade/src/app/_components/member/member-signup-form.tsx`
  - Dynamic signup renderer using shared field definitions.
  - Deferred upload previews for resume/profile picture before final response submit.
- `apps/blade/src/app/member/dashboard/page.tsx`
  - Authenticated member dashboard route.
- `apps/blade/src/app/_components/member/member-dashboard.tsx`
  - Read-only profile/dashboard presentation.
  - Guild card, profile-picture control, resume viewer.
- `apps/blade/src/app/member/settings/page.tsx`
  - Server guard for auth/member existence.
  - Redirects authenticated non-members to signup.
- `apps/blade/src/app/_components/member/member-profile-settings-form.tsx`
  - Member settings editor.
  - Dirty reset/save state.
  - Custom dirty-navigation dialog.
  - Delete-profile confirmation.
- `apps/blade/src/hooks/use-member.ts`
  - Reusable client member query and redirect state for dashboard-style surfaces.
- `packages/ui/src/dialog.tsx`
  - Shared centered dialog animation.

## Test Coverage

### Validators

`packages/validators/src/tests/member.test.ts`

Covered:

- Valid signup data normalizes into member-compatible data.
- Resume/profile-picture object names survive validation.
- Invalid optional URLs are rejected.
- Underage members are rejected.
- Code of Conduct is required for signup.
- Settings/update schema does not require Code of Conduct again.
- Signup field definitions only include editable member data.
- Settings fields exclude signup-only and immediate-upload fields.
- Code-owned form definition is wired to `member.createMember`.
- Code of Conduct appears in the form definition.
- Age calculation handles birthday boundaries.
- Saved member data serializes back into signup response shape.
- Graduation term/year derives from stored dates.

### API

`packages/api/src/tests/forms/manager.test.ts`

Covered:

- `createResponse` maps validated fields into registered callbacks inside a transaction.
- Callback failures bubble so the response insert rolls back.
- Missing callback fields fail before callback invocation.
- `updateResponse` updates current-user responses and `editedAt`.
- Generic update honors `allowEdit`.
- Missing responses backfill only when `upsert` is requested.
- Cross-user/missing response updates are rejected without upsert.
- Invalid response data is rejected before writing.

`packages/api/src/tests/member/profile.test.ts`

Covered:

- Member creation derives auth-owned fields from session.
- Duplicate current-user profile creation is rejected.
- Unique email/phone violations are translated into safe errors.
- Wrapped unique violations are translated too.

`packages/api/src/tests/member/router.test.ts`

Covered:

- `member.updateMember` updates `Member` and existing signup `FormResponse` in one transaction.
- Missing signup responses are backfilled with Code of Conduct compatibility.
- Response sync failures bubble through the member update transaction.
- Duplicate member fields produce safe conflict errors.
- `member.deleteMember` deletes response/member/permissions/auth user in transaction order.
- Delete invokes upload cleanup helpers.
- Missing member delete does not delete auth identity.

`packages/api/src/tests/resume/*` and `packages/api/src/tests/profile-picture/*`

Covered:

- PDF/image data validation.
- Magic-byte checks.
- Object ownership rules.
- Legacy profile-picture MinIO URL resolution.
- Inline resume preview URL behavior.

### Blade Unit Tests

`apps/blade/src/tests/member/member-dashboard.test.tsx`

Covered:

- Dashboard renders the Guild social card without old member-profile chrome.
- Long Guild bio copy stays inside the About surface.
- Private visibility uses sponsor-only dashboard copy.

`apps/blade/src/tests/member/member-profile-settings-form.test.tsx`

Covered:

- Settings form renders Personal, Academics, and Guild sections.
- Settings form uses `Member` row data.
- Upload widgets render.
- Delete profile surface renders.
- Signup-only Code of Conduct fields do not render.

### Playwright E2E

`apps/blade/src/tests/e2e/member-onboarding.spec.ts`

Covered:

- Public landing and protected dashboard.
- Authenticated non-members route into code-owned signup.
- Dashboard skeleton shape.
- Missing required signup fields reject without records.
- Invalid signup values show safe feedback.
- Code of Conduct acceptance and policy link.
- Signup creates member through `forms.createResponse`.
- Callback failure rolls back response.
- Guild visibility copy/toggle behavior.
- Existing members route to dashboard and can sign out.
- Signup upload preview/rejection.
- Dashboard resume/profile-picture replace and clear.
- Unsupported form slugs do not render as member signup.

`apps/blade/src/tests/e2e/member-field-editing.spec.ts`

Covered:

- Legacy `/dashboard`, `/settings`, and `/settings/profile` redirects.
- Settings protection and non-member signup redirect.
- Settings prefill from `Member`, not stale `FormResponse`.
- Saving editable fields updates `Member`, syncs response, and updates dashboard.
- Missing signup response backfill.
- Required validation, reset, and custom dirty-navigation dialog.
- Duplicate email/phone update rejection.
- Immediate resume/profile-picture uploads on settings.
- Profile deletion removes `Member`, signup `FormResponse`, auth `User`, and session.

## Current Versus Legacy

### Signup

Legacy:

- `/member/application` rendered a hardcoded member form.
- Validation, file handling, graduation mapping, and payload assembly lived in one large client component.
- Signup called `member.createMember` directly.

Reforge:

- `/form/member-signup` renders a code-owned form.
- Field definitions and validation live in `@forge/validators`.
- Submission goes through `forms.createResponse`, then registered `member.createMember` callback.
- Response insert and member creation share one DB transaction.

Impact:

- Reforge is more reusable for future code-owned forms.
- Callback failure no longer leaves a saved response with no member row.
- Field names and validation are easier to audit.

### Forms And Callbacks

Legacy:

- Generic forms created a response server-side.
- Client-side success handling invoked connected callbacks afterward.
- Callback failure was logged, but the already-inserted response could remain.
- Generic editable responses rewrote JSON only and did not rerun domain callbacks.

Reforge:

- Forms manager owns callback execution server-side.
- `createResponse` runs response persistence and callback writes in one transaction.
- `updateResponse` is a generic response sync primitive.
- Member editing calls `member.updateMember` as the domain workflow and uses `updateResponse` only to sync/backfill response JSON.

Impact:

- Better transactional durability.
- Clearer ownership: forms store responses; member router owns member mutation logic.

### Member Router

Legacy:

- `memberRouter` mixed self-service creation/update/delete with admin listing, filtering, events, dues, QR generation, Discord logging, company side effects, and cleanup.
- `updateMember` accepted a member id from the client but updated by current session user.
- `deleteMember` accepted a member id and deleted current-user sessions afterward.

Reforge:

- `memberRouter` is focused on current-user member read/create/update/delete.
- Server derives current user from session for writes.
- Update syncs the signup response transactionally.
- Delete removes signup response, member row, permissions, and auth user in one transaction, then signs out.

Impact:

- Smaller review surface.
- Less ambiguity between self-service and admin operations.
- Better data-retention semantics.

### Settings/Edit UX

Legacy:

- `/settings` used a broader settings sidebar and a form visually disconnected from the dashboard.
- Uploads happened inside the save submit.
- No sync back to signup form responses.

Reforge:

- `/member/settings` visually mirrors signup and dashboard surfaces.
- Text/select fields save together.
- Resume/profile-picture uploads save immediately through dedicated controls.
- Dirty navigation uses a custom dialog with save/discard/close.
- Delete lives under the changes area with explicit confirmation.

Impact:

- Better continuity for the member flow.
- Easier to reason about object storage side effects.
- Less risk of partial DB object writes being treated like normal form fields.

### Dashboard

Legacy:

- Member dashboard fetched broad club data and ensured forms during render.
- Resume was a direct link/download-style flow.

Reforge:

- Dashboard is currently focused on member profile/Guild/resume/profile-picture.
- Resume signed URL is fetched when the viewer opens.
- Guild card is more social/profile-oriented and tests overflow/visibility copy.

Impact:

- Reforge dashboard is lighter for this first slice.
- Later club/event functionality can be rebuilt in smaller slices.

### Uploads

Legacy:

- Resume storage already used server-generated object names and PDF magic-byte validation.
- Profile pictures lived under `guildRouter`, used timestamp plus sanitized filename, and returned public MinIO URLs.
- Legacy update paths cleaned unreferenced resume/profile-picture objects more eagerly.

Reforge:

- Resume and profile-picture have dedicated routers, security modules, and storage modules.
- Profile pictures use server-generated object names, magic-byte validation, ownership checks, and signed reads.
- Delete attempts best-effort cleanup for owned resume/profile-picture objects.

Impact:

- Better security and clearer ownership.
- Remaining cleanup policy is worth revisiting for replace/remove flows.

## Review Notes / Risks

1. `Member.userId` is not unique at the DB layer.

   App code rejects an existing member before insert, but two concurrent creates could still race. A DB unique constraint on `Member.userId` would make this durable.

2. `member.deleteMember` deletes auth `User`.

   This matches the requested retention semantics, but it is broader than deleting only member profile data. It can cascade to other user-owned records. That should remain an explicit product decision.

3. Upload cleanup is best-effort and incomplete for replace/remove.

   Delete cleans owned objects best-effort. Reforge does not currently appear to remove old resume/profile-picture objects immediately after replace/remove in the same way legacy did.

4. Resume size limit may be inconsistent with base64 transport.

   The UI/security allow 5MB PDFs, but base64 tRPC payloads may exceed the route body size limit. This was called out by legacy comparison and should be verified before relying on true 5MB support.

5. `memberUpdateSchema` accepts resume/profile-picture fields, but `member.updateMember` does not write them.

   This is intentional because uploads save through dedicated routers. It is OK for UI usage, but direct API consumers could be surprised.

6. Legacy custom-company side effect is not present.

   Legacy inserted unknown companies into `OtherCompanies` on create/update. Reforge stores the member company field but does not appear to update that auxiliary table.

## Recommended Review Order

1. Start with `packages/validators/src/member.ts`.
2. Review `packages/api/src/utils/forms/manager.ts`.
3. Review `packages/api/src/utils/member/onboarding.ts` and `packages/api/src/utils/member/profile.ts`.
4. Review `packages/api/src/routers/member.ts`.
5. Review upload storage/security modules.
6. Review Blade route guards.
7. Review signup/settings/dashboard components.
8. Review tests last, mapping each test group back to the behavior above.
