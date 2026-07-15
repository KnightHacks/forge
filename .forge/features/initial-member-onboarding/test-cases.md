# Initial Member Onboarding Test Cases

Status: Complete

> This file owns observable proof for this feature slice.

## Scope

These cases cover the first member onboarding path:

```txt
landing page -> Discord sign-in -> member profile signup -> member dashboard
```

They intentionally exclude hacker applications, dues/payment, general-purpose uploads, admin permissions, events, general-purpose forms, judging, and Discord role side effects. Member resume and profile-picture upload/preview are included because they are part of the member profile.

The member signup UI should use the dynamic form rendering/callback path. Admin form creation and response visibility remain out of scope.

The member form is code-owned for this slice. Submitting it should use the generic `forms.createResponse` path and the configured member callback, not a one-off client-side member insert.

## Test placement plan

- Package/app tests should live under that workspace's `src/tests/` directory, grouped by domain where useful.
- API member/session behavior: `packages/api/src/tests/**`.
- Member form validation and callback input validation: `packages/validators/src/tests/**` and/or `packages/api/src/tests/**`.
- Route/shell behavior and lightweight UI integration: `apps/blade/src/tests/**`.
- End-to-end user flow: Playwright under `apps/blade/src/tests/e2e/**`, using the env-gated Blade e2e auth seam.

Playwright coverage now includes public routing, e2e Discord-sign-in compatibility, no-member onboarding redirect, dashboard skeleton shape, missing/invalid field validation, Code of Conduct enforcement, valid transactional signup, callback-failure rollback, Guild visibility copy, existing-member dashboard/sign-out, signup upload previews/rejections, dashboard resume/profile-picture replace/clear, and unsupported form slugs.

Candidate commands:

```bash
pnpm --filter=@forge/api test
pnpm --filter=@forge/validators test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade typecheck
```

## Test cases

### TC-001: Public visitor sees landing sign-in

Setup:

- No active session exists.

Action:

- Visit `/`.

Expected observations:

- The public Blade landing page is visible.
- A Discord sign-in action is visible.
- Member dashboard content is not visible.

### TC-002: Public visitor cannot access dashboard

Setup:

- No active session exists.

Action:

- Visit `/dashboard`.

Expected observations:

- The user is redirected to the public landing/sign-in path or otherwise prompted to sign in.
- Member dashboard content is not visible.

### TC-003: Authenticated user without member profile enters signup

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.

Action:

- Visit `/dashboard`.

Expected observations:

- The user sees the member signup flow or a clear route into it.
- The dashboard shows a member-dashboard skeleton while member state is loading or redirecting.
- The user is redirected to `/form/member-signup`.
- The signup flow is rendered from a form definition at the form route.
- The signup flow is available without an officer configuring a form in an admin UI.
- The user does not see the completed member dashboard.
- Out-of-scope hacker, dues, admin, general forms, event, and judge flows are not presented as complete.

### TC-004: Member signup rejects missing required fields

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Submit the form with one or more required fields missing.

Expected observations:

- The profile is not created.
- The form shows safe, field-specific validation feedback.
- The user remains in the signup flow.

### TC-005: Member signup rejects invalid field values

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Submit invalid values, such as an invalid email, invalid optional URL, invalid phone number, or underage date of birth if date of birth is included.

Expected observations:

- The profile is not created.
- The form shows safe validation feedback for the invalid values.
- The user remains in the signup flow.

### TC-006: Valid signup creates member profile

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Submit valid first-slice member profile information, including Code of Conduct acceptance.

Expected observations:

- The form response passes form validation.
- The configured member creation callback runs.
- The form response and member profile creation complete as one successful operation.
- A member profile is created for the current user.
- The created member profile is linked to the current authenticated `User`.
- User/auth identity fields derived from the session are not supplied by, or trusted from, editable client input.
- The user sees success feedback or an immediate transition.
- The user lands on the member dashboard.

### TC-006B: Member signup requires Code of Conduct acceptance

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Submit otherwise valid first-slice member profile information without accepting the Knight Hacks Code of Conduct checkbox.

Expected observations:

- The form links to `https://knight-hacks.notion.site/code-of-conduct`.
- The submission is rejected with safe validation feedback.
- No member profile is created.
- No successful member signup response is left behind.

### TC-006A: Member signup completion uses form redirect

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The user is viewing `/form/member-signup`.

Action:

- Submit valid first-slice member profile information.

Expected observations:

- The form response and member profile creation complete successfully.
- The UI redirects to the form's configured completion redirect URL.
- For the built-in member signup form, the redirect target is `/dashboard`.

### TC-007: Member signup uses DB-backed member field set

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Inspect or render the member signup form.

Expected observations:

- The form collects values needed for the existing `Member` data model.
- Server-derived fields such as `userId`, `discordUser`, `age`, IDs, points, and timestamps are not editable client fields.
- The validator accepts valid values compatible with the existing DB-backed member schema.
- Guild-facing fields are collected as part of the existing member profile rather than requiring a separate Guild table.

### TC-008: Existing member goes directly to dashboard

Setup:

- A valid session exists for a Discord-authenticated user.
- A member profile already exists for that user.

Action:

- Visit `/` or `/dashboard`.

Expected observations:

- Visiting `/` routes the user into the authenticated experience.
- Visiting `/dashboard` shows the member dashboard.
- The signup form is not shown as the primary state.

### TC-009: Sign-out returns user to public state

Setup:

- A valid session exists for a user.
- The user is viewing the authenticated dashboard shell.

Action:

- Use the sign-out action.

Expected observations:

- The active session is invalidated.
- The user returns to the public landing/sign-in state.
- Protected dashboard content is no longer visible.

### TC-010: Resume upload previews selected PDF

Setup:

- A valid session exists for a Discord-authenticated user.
- The user is viewing either the member signup form or the member dashboard resume section.

Action:

- Select a valid PDF resume file.

Expected observations:

- The UI shows upload progress while the file is being stored.
- The selected PDF is previewed in the page without waiting for a page refresh.
- Non-PDF files and files over the configured size limit are rejected with safe feedback.
- On the dashboard, an already saved resume can be previewed through a temporary signed URL when one exists.

### TC-010A: Profile-picture upload previews selected image

Setup:

- A valid session exists for a Discord-authenticated user.
- The user is viewing either the member signup form or the member dashboard profile section.

Action:

- Select a valid profile-picture image file.

Expected observations:

- The UI shows upload progress while the file is being stored.
- The selected image is previewed in the page without waiting for a page refresh.
- On the dashboard, the image appears as a circular Guild avatar and can be updated from the compact avatar upload action.
- Unsupported image files and files over the configured size limit are rejected with safe feedback.
- On the dashboard, an already saved profile picture can be previewed through a temporary signed URL when one exists.

### TC-011: Dashboard resume can be replaced or cleared

Setup:

- A valid session exists for a user with a member profile.
- The dashboard resume section is visible.

Action:

- Upload a new valid PDF resume.
- Then remove the saved resume.

Expected observations:

- The new PDF is uploaded through the resume API and attached to the current member profile.
- The dashboard does not inline-expand the PDF preview in the main layout.
- Opening the resume viewer dialog shows the newly selected PDF without a page refresh.
- Opening the resume viewer dialog can also show an existing saved resume through a temporary signed URL.
- Removing the resume clears the current member's persisted resume reference.
- Other member profile fields are not changed by resume replacement or removal.

### TC-011A: Dashboard profile picture can be replaced or cleared

Setup:

- A valid session exists for a user with a member profile.
- The dashboard profile-picture section is visible.

Action:

- Upload a new valid profile-picture image.
- Then remove the saved profile picture.

Expected observations:

- The new image is uploaded through the profile-picture API and attached to the current member profile.
- The newly selected image is previewed immediately in the circular Guild avatar.
- The update control is compact and attached to the avatar rather than rendered as a large upload panel.
- Removing the profile picture clears the current member's persisted profile-picture reference.
- Other member profile fields are not changed by profile-picture replacement or removal.

### TC-011B: Dashboard presents Guild profile as a social card

Setup:

- A valid session exists for a user with a member profile.
- Guild fields may include tagline, about, company, visibility, GitHub, LinkedIn, portfolio, and profile picture values.

Action:

- Visit `/dashboard`.

Expected observations:

- The old "Member profile active" dashboard pill is not shown.
- The right-side dashboard surface is a Guild profile card.
- The left-side dashboard surface uses the same desktop-height panel structure as the Guild profile card.
- The old all-caps "Member profile" eyebrow is not shown in the left panel.
- The Guild profile card does not render a decorative banner strip above the avatar.
- The Guild profile card shows the profile picture at the top, name, tagline, about, company, visibility state, and all Guild link slots.
- The profile-picture remove action is a compact red icon-only circle attached to the avatar, not a full text row below it.
- When no profile picture exists, the avatar area does not reserve empty rows for file-name or remove-picture text.
- Long Guild about text is clamped with an ellipsis instead of overflowing through the panel.
- The visibility state uses compact copy such as public/private rather than a long stretched pill.
- Guild link rows use the same darker inset surface background as the other nested dashboard tiles.
- The left dashboard panel content starts near the top of the panel instead of being bottom-distributed.
- On desktop, the dashboard is composed as a screen-height layout rather than a long sparse vertical page.
- Dashboard content appears immediately when member data replaces the skeleton, without fade, slide, translate, or staggered entrance motion.
- Uploading a profile picture shows pending state without changing the Guild profile card height.

### TC-011C: Dashboard skeleton matches loaded dashboard structure

Setup:

- A valid session exists.
- Member state is loading or the dashboard is redirecting.

Action:

- Visit `/dashboard`.

Expected observations:

- The loading skeleton uses the same two-panel desktop structure as the loaded dashboard.
- The skeleton's left profile panel and right Guild profile panel match the loaded panel height/shape closely enough that layout does not jump when data arrives.
- Skeleton placeholders appear inside stable panels rather than replacing the dashboard with a different layout.

### TC-012: Guild visibility copy is explicit

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Inspect the Guild profile visibility control.
- Toggle between private and public states.

Expected observations:

- The control clearly labels the current state as private or public.
- The private copy explains that sponsors or Knight Hacks staff can still see the profile.
- The public copy explains that other members can also see the profile on `guild.knighthacks.org`.
- Changing visibility updates only the `guildProfileVisible` member field.

### TC-013: Signup form cards reveal on scroll

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- The member signup form is visible.

Action:

- Scroll through the signup form.

Expected observations:

- Form sections reveal as they enter the viewport.
- Reduced-motion users receive the final visible state without motion-dependent interaction.
- Animation does not block field interaction, validation, or submission.

### TC-014: Code-owned signup form uses generic response path

Setup:

- A valid session exists for a Discord-authenticated user.
- No member profile exists for that user.
- Admin form creation and response browsing are unavailable.

Action:

- Load the member signup form and submit valid member data.

Expected observations:

- The code-owned member signup form is prepared through the existing form tables/configuration shape.
- The client submits to the generic form response mutation.
- The member-specific callback mapping is applied server-side.
- The forms manager does not require member-specific client payload fields beyond the form response data.

### TC-015: Existing member cannot re-enter member signup

Setup:

- A valid session exists for a Discord-authenticated user.
- A member profile already exists for that user.

Action:

- Visit `/form/member-signup`.

Expected observations:

- The form route resolves the form metadata.
- The user is redirected to the form's configured completion redirect URL.
- The member signup form is not shown for another submission.

### TC-016: Unsupported form slug is not rendered as member signup

Setup:

- A valid session exists.

Action:

- Visit `/form/unknown-slug`.

Expected observations:

- The route returns a not-found state or another safe unsupported-form state.
- The member signup form is not rendered for the wrong slug.

## Negative / regression cases

### TC-NEG-001: API rejects member creation without auth

Setup:

- No active session exists.

Action:

- Attempt to call the member creation API.

Expected observations:

- The request is rejected as unauthorized.
- No member profile is created.

### TC-NEG-002: API rejects duplicate profile for same user

Setup:

- A valid session exists.
- A member profile already exists for that session user.

Action:

- Attempt to create another member profile for the same session user.

Expected observations:

- The request is rejected with a safe duplicate-profile error.
- No second member profile is created.

### TC-NEG-003: Form response does not create member when callback input is invalid

Setup:

- A valid session exists.
- No member profile exists for that session user.
- The member signup form response is submitted with payload that passes generic form shape but fails member callback validation.

Action:

- Submit the invalid callback payload.

Expected observations:

- The member profile is not created.
- The user sees a safe validation or submission error.
- The system does not report signup as complete.

### TC-NEG-004: Callback failure rolls back member signup response

Setup:

- A valid session exists.
- No member profile exists for that session user.
- The member signup form response passes generic form validation.
- The configured member callback fails during member creation, such as because of a duplicate unique member field.

Action:

- Submit the signup form.

Expected observations:

- The member profile is not created.
- The user sees a failed submission state.
- The form response is not left behind as a successful member signup response.
- A later corrected submission can still create the member profile.

### TC-NEG-005: Resume APIs reject unsafe resume values

Setup:

- A valid session exists for a user.

Action:

- Attempt to upload a malformed PDF data URL, a non-PDF file, an oversized file, or save a resume object name that is not owned by the current user.

Expected observations:

- The request is rejected with safe feedback.
- No member profile is created or updated with an unsafe resume value.
- The persisted `Member.resumeUrl` remains a server-generated object name or empty value, not a public URL.

### TC-NEG-005A: Profile-picture APIs reject unsafe image values

Setup:

- A valid session exists for a user.

Action:

- Attempt to upload a malformed image data URL, unsupported image type, oversized image file, or save a profile-picture object name that is not owned by the current user.

Expected observations:

- The request is rejected with safe feedback.
- No member profile is created or updated with an unsafe profile-picture value.
- The persisted `Member.profilePictureUrl` remains a server-generated object name or empty value, not a public URL.

### TC-NEG-006: Out-of-scope legacy side effects do not accidentally run

Setup:

- A valid session exists.
- No member profile exists for that user.

Action:

- Complete a valid first-slice signup.

Expected observations:

- No dues/payment flow is started.
- No resume or profile-picture upload is required to complete member signup.
- No admin role/permission mutation occurs.
- No hacker application is created.
- Discord role/logging side effects do not occur unless explicitly approved in the SRD.
- Admin form creation/editing/response browsing is not required for the signup to work.

## Open questions

- None for this completed slice.
