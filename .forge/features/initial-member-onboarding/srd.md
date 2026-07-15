# Initial Member Onboarding SRD

Status: Complete

> This file owns technical implementation constraints and the accepted shape for this feature slice.

## Technical purpose

Rebuild the first vertical slice of Blade on Reforge:

```txt
landing page -> Discord sign-in -> member profile signup -> member dashboard
```

The slice should establish the authenticated Blade shell, real Discord session handling, current-user member lookup, form-driven member creation, and a minimal dashboard while keeping Blade as a thin Next.js client over `@forge/api`.

The implementation should preserve the existing data model distinction:

- `User` is the auth/account profile owned by the authentication system.
- `Member` is Knight Hacks membership information linked to `User` by `Member.userId`.

Do not collapse `User` and `Member` into one model.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: Product/architecture philosophy.
- `docs/agentic-development/forge-engineering-principles.md`: React and Next.js principles.
- `docs/agentic-development/forge-engineering-principles.md`: Sharing and package boundaries.
- `docs/agentic-development/forge-engineering-principles.md`: tRPC and API principles.
- `docs/agentic-development/forge-engineering-principles.md`: Auth, Discord, and permission principles.
- `docs/agentic-development/forge-engineering-principles.md`: Validation principles.
- `docs/agentic-development/forge-engineering-principles.md`: Error-handling and UX principles.

## Access policy

- Unauthenticated/public:
  - May view the landing page.
  - May start Discord sign-in.
  - Must not access the member dashboard or member signup submit action.
- Logged-in user:
  - May view their onboarding state.
  - May create their own member profile if one does not already exist.
  - May view their own member dashboard after a member profile exists.
  - May sign out.
- Officer/admin/organizer:
  - No special access is required for this feature.
  - Admin-specific surfaces are out of scope.

Server/API boundaries must enforce the logged-in requirement for member profile creation and dashboard data reads. Client-side hiding is not sufficient.

## Architecture / data flow

- `apps/blade` owns pages, routing, form rendering, shell UI, and user-facing feedback.
- `@forge/api` owns session-aware member read/create workflows, generic form response submission, and upload/storage workflows.
- `@forge/db` owns schema, DB client, and existing member table definitions only.
- `@forge/validators` should own reusable member onboarding input validation for this slice. The validator should be derived from, wrapped around, or kept compatible with the existing `@forge/db` `Member` schema/`InsertMemberSchema` rather than inventing a parallel shape.
- `@forge/auth` remains the source for Discord/session integration.
- The forms runtime should reuse the existing `FormsSchemas`, `FormResponse`, and `TrpcFormConnection` concepts where possible.
- Forms must stay generic. Member-specific form definition, field mapping, and callback behavior may be hardcoded for this slice, but that hardcoded conversion belongs in member scope and is registered with the forms manager through a callback map.
- Guild profile fields remain on the existing `Member` table for this slice. `@forge/validators` may expose a separate `GuildProfile` type for readability, but no Guild table or migration should be introduced here.

Legacy source guidance:

- Use `legacy/apps/blade` and `legacy/packages/api` as source evidence for behavior and established patterns.
- Use `packages/auth` as the real auth implementation source. It already defines Better Auth, Discord provider mapping, session helpers, sign-in helpers, and `User` persistence through `@forge/db`.
- Active Reforge Blade may need to reintroduce the auth route handlers from legacy patterns because the scaffold moved the legacy app routes under `legacy/`.
- Do not copy legacy implementation debt just because it exists.
- In particular, review legacy form responder/callback code for the runtime concept, but simplify/reshape it where the SRD calls for a smaller first slice.

Implemented route/data flow:

1. `/` renders public landing content when no session exists.
2. `/` redirects authenticated users toward `/dashboard` or the member onboarding destination.
3. `/dashboard` is server-first and requires a session.
4. `/dashboard` keeps the page-level session guard server-side.
5. `/dashboard` uses the reusable `useMember` hook to load the current member and shows a dashboard-shaped skeleton while loading or redirecting.
6. A logged-in user without a member profile is redirected from `/dashboard` to `/form/member-signup`.
7. `/form/[slug]` renders the matching form route. For this slice, `/form/member-signup` renders the member signup form through the dynamic form runner/responder model.
8. Member signup submits a form response through `forms.createResponse`.
9. `forms.createResponse` validates and persists the response, then invokes the configured `member.createMember` callback using the connection map.
10. After successful callback completion, the form route redirects to the form's configured `completionRedirectUrl`.
11. A logged-in user with a member profile who visits `/form/member-signup` is redirected to the form's configured `completionRedirectUrl`.
12. A logged-in user with a member profile sees a minimal dashboard at `/dashboard`.
13. Signup profile-picture uploads call `profilePicture.uploadProfilePicture` before final form submission and store only the returned object name in form/member data.
14. Signup resume uploads call `resume.uploadResume` before final form submission and store only the returned object name in form/member data.
15. Existing-member profile-picture updates call `profilePicture.uploadProfilePicture` followed by `profilePicture.saveMemberProfilePicture`.
16. Existing-member resume updates call `resume.uploadResume` followed by `resume.saveMemberResume`.
17. Profile-picture and resume previews use client-local object URLs for newly selected files and temporary signed URLs for existing saved files.

Implemented module boundaries:

- `packages/api/src/routers/member.ts`: exposes `member.getMember` and `member.createMember` only.
- `packages/api/src/utils/member/profile.ts`: owns the shared `createMemberProfile` write path for direct member procedure calls and form callbacks.
- `packages/api/src/utils/member/onboarding.ts`: owns the code-owned member signup form config and the member signup form callback.
- `packages/api/src/utils/forms/manager.ts`: owns generic form response loading, validation, persistence, permission/resubmission checks, callback mapping, and transaction handling.
- `packages/api/src/utils/forms/config.ts`: registers code-owned forms and callback functions with the generic forms manager.
- `packages/api/src/utils/profile-picture/security.ts` and `packages/api/src/utils/profile-picture/storage.ts`: own profile-picture validation, object naming, storage, signed URL generation, and current-member profile-picture persistence.
- `packages/api/src/utils/resume/security.ts` and `packages/api/src/utils/resume/storage.ts`: own resume validation, object naming, storage, signed URL generation, and current-member resume persistence.
- `apps/blade/src/hooks/use-member.ts`: owns the reusable client member query, member/null state, unauthenticated redirect behavior, and optional no-member onboarding redirects for Blade surfaces that need current-member state.
- `apps/blade/src/app/_components/member/dashboard-client.tsx`: uses `useMember` to render dashboard data or dashboard skeleton states inside the authenticated shell.
- `apps/blade/src/app/form/[slug]/page.tsx`: owns authenticated form route rendering for code-owned forms. For this slice, it supports the `member-signup` slug.

## Forms/callback onboarding design

This feature should make member onboarding a first-class consumer of Blade's form + callback system.

First-slice target:

- Render the member signup UI from a form schema.
- Persist the submitted response if the existing `FormResponse` model is retained.
- Invoke a stable tRPC callback procedure that creates the current user's `Member` profile.
- Do not expose admin form creation, editing, connection management, or response visibility yet.
- Do not require officers/admins to configure the initial member signup form before the first slice works.

Accepted implementation shape:

- Use a code-owned built-in member signup form definition with stable IDs/slugs that are upserted into the existing `FormsSchemas` and `TrpcFormConnection` structures at runtime.
- Store the code-owned form's completion redirect in form metadata as `completionRedirectUrl`; for member signup this is `/dashboard`.
- `forms.getForm` should return the form record plus code-owned route metadata such as `completionRedirectUrl`.
- Keep the code-owned member signup form definition and field-to-procedure mapping in member scope for this first slice.
- Expose a generic `forms.createResponse` mutation as the form submission path.
- Let `forms.createResponse` load the form, validate response data, enforce response permissions/resubmission rules, persist `FormResponse`, and run configured callbacks.
- Register callbacks through a server-owned config map from stable procedure strings to server functions. For this slice, `member.createMember` is the member signup callback.
- Map form fields to callback input using explicit field names, not fragile UI labels where possible.
- Keep form callback execution inside server/API-controlled code so the client cannot call arbitrary procedures by editing payloads.
- Keep tRPC routers light. Router files should expose procedures and delegate shared write behavior to utilities/services.
- Do not reuse legacy `handleCallbacks` as-is for member creation. It runs after client-side response success and can mark the UI submitted before the callback finishes.
- Prefer a server-side submission path where form response validation, optional response persistence, callback execution, and member creation complete as one operation from the user's perspective.
- The member router may call the same `createMemberProfile` utility used by the form callback so direct tRPC creation and form-driven creation do not drift.
- The forms manager must not import the member router or know member-specific fields. Member-specific callback/config registration belongs outside the generic manager.

Design constraints:

- The member onboarding form is product-critical and should not depend on an admin UI that has not been rebuilt yet.
- Form response editing/resubmission should remain disabled for callback-backed member signup unless a later SRD proves safe behavior.
- If callback execution fails after a response is saved, the failure state must be visible and recoverable; avoid silently recording a response without creating the member profile.
- If the existing form callback approach is too client-driven or too permissive, Reforge may keep the data model while moving callback execution server-side.
- If the database supports it cleanly, form response persistence and member creation should happen in one transaction. If that is not practical, the SRD/implementation must define the recovery state.
- For this slice, `forms.createResponse` must execute `FormResponse` insertion and `member.createMember` in the same database transaction. If member creation fails, the response must roll back; the user should see the failed submission rather than a successful response with no member profile.
- Member profile creation must check for an existing current-user member before insert, derive auth-owned fields from the session, normalize attached resume object names through the resume utility, and translate duplicate member constraints into safe user-facing errors.
- Future form callbacks that perform external side effects should use an outbox/post-commit design or be idempotent, because database rollback cannot undo already-sent external side effects.

## tRPC/API behavior

Accepted API surface for this slice:

- `auth.getSession`: public query returning the current session or `null`.
- `auth.liveness` or equivalent health query: public query for basic API health.
- `auth.signOut`: protected mutation invalidating the active session.
- `member.getMember`: protected query returning the current user's member profile or `null`.
- `member.createMember`: protected mutation/callback creating a member profile for the current user from validated member onboarding data.
- `forms.getForm`: protected query returning a generic form record by slug when a runtime needs it.
- `forms.createResponse`: protected mutation that validates a form response, persists `FormResponse`, and triggers configured server callbacks.
- `resume.uploadResume`: protected mutation that validates a PDF data URL and stores a user-owned resume object in MinIO.
- `resume.saveMemberResume`: protected mutation that persists the uploaded resume object path to the current user's member profile.
- `resume.getResume`: protected query returning a temporary download URL for the current user's stored resume, when one exists.
- `profilePicture.uploadProfilePicture`: protected mutation that validates an image data URL and stores a user-owned profile-picture object in MinIO.
- `profilePicture.saveMemberProfilePicture`: protected mutation that persists the uploaded profile-picture object path to the current user's member profile.
- `profilePicture.getProfilePicture`: protected query returning a temporary download URL for the current user's stored profile picture, when one exists.

Expected API behavior:

- `member.getMember` returns only the current user's member profile.
- `member.createMember` derives `userId` and Discord display data from the current session rather than trusting client input.
- `member.createMember` rejects creation when the current user already has a member profile.
- `member.createMember` normalizes nullable optional fields consistently, such as empty phone/profile URL strings.
- `member.createMember` and the member signup form callback must share the same member creation utility.
- `forms.createResponse` must not import or directly know member-specific behavior. It should invoke registered callbacks by configured procedure string.
- `forms.getForm` should expose `completionRedirectUrl` for code-owned forms without requiring a database migration in this slice.
- If callback execution fails, `forms.createResponse` should fail the submission from the user's perspective and avoid leaving a successful response without the side effect the form was configured to create.
- `resume.uploadResume` returns an object name, never a public URL.
- `resume.saveMemberResume` accepts only a current-user-owned resume object name or an empty value to clear the resume.
- `resume.getResume` returns a short-lived signed URL only for the current user's saved resume.
- `profilePicture.uploadProfilePicture` returns an object name, never a public URL.
- `profilePicture.saveMemberProfilePicture` accepts only a current-user-owned profile-picture object name or an empty value to clear the profile picture.
- `profilePicture.getProfilePicture` returns a short-lived signed URL only for the current user's saved profile picture.
- User-facing duplicate/validation errors should be safe and understandable.
- Procedure and validator names should be clear enough to support future generated tRPC/API context.

## Validation

Validation should be centralized enough to be reused by the form and API.

Create or update a member validator in `@forge/validators` for this slice. It should reuse the fields and constraints of the existing `@forge/db` `Member` schema as much as possible, rather than creating a new product model. `@forge/db` may continue exporting its drizzle-zod insert schema; `@forge/validators` should provide the application-facing onboarding schema and any form/callback input shape.

Member fields should be the fields represented in the existing `Member` DB model, with explicit handling for values derived by the server.

- first name
- last name
- email
- phone number
- school
- level of study
- major
- gender
- race or ethnicity
- shirt size
- graduation term/year or `gradDate`
- company/source
- date of birth, with server-derived `age`
- optional GitHub/LinkedIn/website URLs
- tagline/about
- guild profile visibility
- Knight Hacks Code of Conduct acceptance for the signup form response
- optional resume/profile-picture object names persisted in the existing nullable URL columns

Guild profile data and visibility semantics:

- Guild-facing data is modeled as a separate validator/type shape for readability but persisted on the existing `Member` row for this slice.
- Private Guild profiles remain available to sponsors and Knight Hacks staff.
- Public Guild profiles are also visible to other members on `guild.knighthacks.org`.
- The signup UI should label the state clearly rather than implying "private" removes sponsor access.

Server-derived or non-client-owned fields:

- `userId`
- `discordUser`
- `age`
- `points`
- `dateCreated`
- `timeCreated`
- generated IDs

Validation rules should cover required fields, email format, URL format where fields are present, phone format, date/age requirements, enum membership, Code of Conduct acceptance, and safe optional string length limits.

Code of Conduct acceptance:

- The signup form must include a required checkbox linking to `https://knight-hacks.notion.site/code-of-conduct`.
- The form response should include the acceptance field so the member creation callback can validate it.
- The acceptance value is not persisted on `Member` in this slice unless the existing DB schema already has an approved field for it.

## Resume upload / MinIO design

Resume upload is in scope for the initial member flow because `Member.resumeUrl` already exists and the signup/dashboard UI needs a concrete upload capability.

Design constraints:

- Resume files are stored in MinIO, not in Postgres.
- The persisted `Member.resumeUrl` value should be the MinIO object name, not a public URL.
- Object names must be server-generated and user-owned, using the shape `<userId>/resume-<uuid>.pdf`.
- Upload validation should reject non-PDF data, malformed base64, unsafe object names, and files larger than the existing MinIO resume size limit.
- API utilities should own resume validation/storage details under a resume utility boundary, e.g. `@forge/api` `utils/resume/security` and `utils/resume/storage`.
- Member creation may attach a previously uploaded resume object when the object is owned by the current user.
- Existing members may update or clear their member resume through the resume API, not through a member-router form-specific endpoint.
- Download/view flows should use short-lived presigned MinIO URLs.
- The signup form should show a client-side PDF preview immediately after a valid PDF is selected, using a local object URL rather than a public storage URL.
- The member dashboard should preview newly selected PDFs immediately and may use `resume.getResume` to render the existing saved resume through a short-lived signed URL.
- Preview state is presentation-only. The persisted member value remains the MinIO object name returned by the resume API.
- Clearing a dashboard resume should remove the persisted member resume reference for the current member. Deleting unreferenced MinIO objects may be handled by cleanup utilities rather than blocking the UI.

## Profile picture upload / MinIO design

Profile-picture upload is in scope for the initial member flow because `Member.profilePictureUrl` already exists and the signup/dashboard UI needs a concrete upload capability.

Design constraints:

- Profile-picture files are stored in MinIO, not in Postgres.
- The persisted `Member.profilePictureUrl` value should be the MinIO object name, not a public URL.
- Object names must be server-generated and user-owned, using the shape `<userId>/profile-picture-<uuid>.<ext>`.
- Upload validation should reject unsupported image data, malformed base64, unsafe object names, and files larger than the existing MinIO profile-picture size limit.
- Supported image types are JPEG, PNG, GIF, and WebP.
- API utilities should own profile-picture validation/storage details under a profile-picture utility boundary, e.g. `@forge/api` `utils/profile-picture/security` and `utils/profile-picture/storage`.
- Member creation may attach a previously uploaded profile-picture object when the object is owned by the current user.
- Existing members may update or clear their member profile picture through the profile-picture API, not through a member-router form-specific endpoint.
- Download/view flows should use short-lived presigned MinIO URLs.
- The signup form should show a client-side image preview immediately after a valid profile picture is selected, using a local object URL rather than a public storage URL.
- The member dashboard should preview newly selected profile pictures immediately and may use `profilePicture.getProfilePicture` to render the existing saved profile picture through a short-lived signed URL.
- Preview state is presentation-only. The persisted member value remains the MinIO object name returned by the profile-picture API.

## Data / migration / compatibility

- Prefer the existing `User`, `Member`, `FormsSchemas`, `FormResponse`, and `TrpcFormConnection` table shapes unless the feature explicitly approves schema changes.
- No DB migration should be required for this first slice unless implementation proves the existing schema cannot support the form/callback runtime safely.
- Do not split Guild profile data into a new table in this slice.
- If required member columns force more form fields than desired, collect the DB-backed fields rather than changing schema casually.
- Existing member profiles should be recognized by `member.getMember` and shown the dashboard, not forced through signup again.
- Production cutover/import behavior is out of scope for this first slice unless a later migration/cutover decision changes that.

## Discord integration

In scope:

- Discord sign-in/session identity.
- Displaying the signed-in user's identity where useful.
- Using the existing Discord auth package as the real authentication path.
- Reintroducing active Blade auth routes needed to expose the existing `@forge/auth` handlers.

Out of scope:

- Discord role assignment.
- Discord membership checks.
- Discord logging on member creation.
- Discord guild profile publication.
- Discord bot or admin workflows.

If legacy's "member created" Discord log should be preserved in the first slice, that must be explicitly approved because it adds an external side effect. For now, prefer no Discord side effects beyond authentication.

## Configurability review

Would this require a developer change next year?

- Answer: The landing/sign-in/dashboard shell should not require yearly changes.
- The member signup field list may require future configuration if Knight Hacks changes onboarding questions frequently.
- For this first slice, a code-owned member signup form definition may be acceptable because admin form creation is out of scope, but the form should still use the same runtime/form schema pattern that later admin-managed forms can use.
- Any semester/hackathon/team-specific prompts should be excluded or planned for an admin-configurable future form/profile system.

## React / frontend constraints

- Pages should stay server components by default.
- Do not put `"use client"` at the page level.
- Use server-side reads for page-level session guards.
- Reusable client surfaces may use `useMember` for current-member data, onboarding branching, and unauthenticated fallback redirects.
- Client components are appropriate for the interactive signup form and sign-out action if needed.
- `/dashboard` should not render the signup form inline. It should show dashboard loading skeletons while member state loads and redirect no-member users to `/form/member-signup`.
- `/form/[slug]` should render the requested form inside the authenticated shell and use form metadata for post-submit redirection.
- Signup UI must include pending/loading, success, validation error, and mutation error states.
- Signup form sections should reveal as they enter the viewport through an `IntersectionObserver`-driven motion pattern, with reduced-motion users receiving the final visible state.
- Signup and dashboard profile-picture/resume uploads should preview selected files in-page without requiring a refresh.
- Dashboard resume preview should open inside a dialog viewer. The dashboard should not inline-expand the PDF preview in the main layout.
- Dashboard resume preview dialog should be constrained with mobile screen-edge padding/width so it does not touch or overflow the viewport.
- Dashboard profile-picture upload should be presented as a circular Guild avatar with a compact bottom-right upload action.
- Dashboard profile-picture removal should be an icon-only destructive circle attached to the left side of the avatar and should not reserve a full text row below the avatar.
- Dashboard profile-picture upload pending state should reuse reserved space and avoid changing the Guild profile card height when the spinner appears.
- Dashboard should present Guild-facing member fields as a social-profile card: avatar, name, tagline, about, company, visibility, and external links.
- Guild profile bio/about text should receive the reclaimed vertical space from compact avatar actions and clamp overflow with an ellipsis rather than pushing through the panel.
- Dashboard outer panels should use the lighter raised card surface, while nested tiles and link rows inside those panels should use the same darker inset surface treatment.
- Dashboard should not show a decorative banner strip above the Guild avatar or an all-caps "Member profile" eyebrow in the left panel.
- The left dashboard panel content should start at the top of the panel rather than being distributed toward the bottom.
- Dashboard content should not use entrance animation after member data loads. Avoid fade, slide, translate, and stagger effects on the dashboard because they create a double-swap against the skeleton state.
- Dashboard loading skeletons should reuse the same two-panel desktop shell, height constraints, and broad structure as the loaded dashboard. Skeletons should replace content inside those panels rather than using a different layout.
- Signup section content padding should feel balanced around the form fields, with card spacing large enough to visually separate sections.
- The dashboard should avoid exposing placeholder UI that looks like a finished dues, events, hacker, admin, or forms feature.
- Use existing `@forge/ui` primitives where appropriate.
- Reuse or adapt the existing form runner/responder pattern for member signup rendering.
- Keep Blade-specific composed components in `apps/blade`.

## Testing / verification strategy

Test cases are defined in `test-cases.md`.

Expected placement:

- `@forge/api` tests for member read/create auth behavior and validation under `packages/api/src/tests/**`.
- `@forge/validators` tests for member form/validator contracts under `packages/validators/src/tests/**`.
- `@forge/blade` tests for route gating and signup/dashboard UI behavior under `apps/blade/src/tests/**`.
- Playwright e2e for the high-value path under `apps/blade/src/tests/e2e/**`.

Implemented Playwright auth strategy:

- Production and normal development continue to use real Discord/Better Auth.
- E2e tests enable `BLADE_E2E_AUTH=true` and use a Blade-local, env-gated session cookie to represent a Discord-authenticated `User`.
- The e2e sign-in compatibility route still exercises `/api/auth/signin?provider=discord&callbackURL=...`, but redirects into the guarded e2e session route instead of external Discord OAuth.
- The e2e auth route rejects requests unless the env flag is set and verifies that the requested test user exists in `auth_user`.
- The Playwright suite seeds deterministic test users/members, asserts DB side effects and rollback behavior, and cleans up its rows after the run.

Expected commands, subject to actual harness availability:

```bash
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade typecheck
pnpm verify:precommit
```

## Resolved choices

- The built-in member signup form is a code-owned definition upserted at runtime with stable IDs/slugs.
- The member signup form is rendered at `/form/member-signup`; `/dashboard` redirects no-member users there instead of embedding the signup form.
- The member signup completion redirect is form-owned metadata and currently points to `/dashboard`.
- QR generation is deferred.
- The initial dashboard contains profile confirmation, basic profile details, resume upload/update/preview, and sign-out.
- Resume and profile-picture upload/preview are in scope for the member flow; general-purpose upload management remains out of scope.
- Guild profile data remains on `Member`; only validator/type grouping is separated for now.
