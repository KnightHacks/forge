# Initial Member Onboarding Spec

Status: Complete

> This file owns the non-technical user/product intent. Technical design belongs in `srd.md`.

## User-facing purpose

A new Knight Hacks user should be able to arrive at Blade, sign in with Discord, create a basic Knight Hacks member profile, and land on a simple member dashboard.

This is the first Reforge slice of Blade. It should prove the core member path without rebuilding the full legacy dashboard, hacker application, dues, admin, general forms, events, judging, uploads, or permissions flows.

The membership signup experience should use Blade's dynamic form experience rather than a one-off hard-coded application form. The user should experience it as the official member signup form, even though admin form creation and response browsing are not part of this slice.

For this slice, the member signup form is code-owned and registered by the member feature. Submitting the form creates a form response and runs the member creation callback as one operation, so the user should not see a successful submission unless their member profile is also created.

## Users / actors

- Public visitor who has not signed in.
- Signed-in Discord user who does not yet have a Knight Hacks member profile.
- Signed-in Discord user who already has a Knight Hacks member profile.

Officer/admin users, hackers, judges, sponsors, and event operators exist in the broader product, but their specialized workflows are not part of this first slice.

## User-visible interface

### Landing page

- A public Blade landing page is visible to unauthenticated visitors.
- The landing page presents Knight Hacks/Blade branding and a clear Discord sign-in action.
- The page should not expose member-only dashboard content to unauthenticated users.

### Discord sign-in

- Choosing the sign-in action starts the Discord sign-in flow.
- After successful sign-in, the user is taken into the member onboarding flow.
- Discord sign-in creates or resolves the user's auth/account profile.

### Member profile signup

- A signed-in user without a member profile is shown a member signup page or signup panel.
- The signup UI renders as a Blade form, backed by the form schema/callback pattern rather than a bespoke member-only form component.
- The signup UI collects the member information represented by the existing member data model.
- The signup UI includes Personal, Academics, and Guild profile sections.
- The signup UI is rendered at `/form/member-signup`, not embedded directly in `/dashboard`.
- Dashboard routing sends authenticated users without a member profile to the member signup form route.
- The signup UI lets the user upload and preview a profile picture image before submitting the member profile.
- The signup UI lets the user upload a PDF resume and preview the selected PDF before submitting the member profile.
- Profile picture upload accepts only supported image files within the configured size limit and gives safe feedback for invalid files.
- The resume upload accepts only PDFs within the configured size limit and gives safe feedback for invalid files.
- The signup UI requires the user to accept the Knight Hacks Code of Conduct before member profile creation.
- Guild profile visibility is explicit: private profiles remain visible to sponsors and Knight Hacks staff, while public profiles are also visible to other members on `guild.knighthacks.org`.
- The form provides clear required-field, invalid-value, loading, success, and failure feedback.
- Submitting the form creates the user's member profile through the configured form callback.
- If the member creation callback fails, the signup is shown as failed rather than as a successful response with no member profile.
- After a successful signup, the user is taken to the member dashboard.

### Member dashboard

- A signed-in user with a member profile sees a minimal member dashboard.
- The dashboard uses a desktop-height layout with profile/account summary content on the left and a Guild profile card on the right.
- On desktop, both dashboard halves use the same stable panel height/structure.
- The Guild profile card shows the member's circular profile picture, name, tagline, about text, company, Guild visibility, and GitHub/LinkedIn/portfolio links.
- The Guild profile card should not use a decorative banner strip above the profile picture.
- The dashboard shows a member-dashboard skeleton while member state is loading or redirecting, and the skeleton matches the real dashboard's panel height and structure.
- The dashboard lets the member upload, replace, remove, and preview their profile picture through the Guild profile avatar.
- The dashboard profile-picture update affordance is a compact upload icon attached to the avatar, not a large upload block.
- Profile-picture upload loading state should not change the Guild profile card height.
- The dashboard lets the member upload, replace, remove, and preview their resume.
- The dashboard opens resume previews in a dialog viewer rather than inline on the dashboard.
- The resume preview dialog leaves screen-edge breathing room on mobile.
- The dashboard can preview a saved resume through a temporary download URL only when the member chooses to view it.
- Dashboard content should render immediately when member data replaces the skeleton, with no entrance fade, slide, or stagger animation.
- The dashboard may include placeholders for future member features, but it should not pretend unavailable features are complete.
- The user can sign out from the authenticated shell.

## Scope

### In scope

- Public landing page for Blade.
- Discord sign-in entry point.
- Authenticated routing for the first member flow.
- Basic member profile signup for a signed-in user.
- Reusing the dynamic form responder/rendering model for the signup surface.
- Generic form response creation with a member-profile creation callback after valid form submission.
- Transactional signup behavior: form response persistence and member profile creation succeed or fail together.
- Member profile picture image upload and preview for the signup and dashboard surfaces.
- Member resume PDF upload and preview for the signup and dashboard surfaces.
- Guild profile visibility copy and storage on the existing `Member` profile.
- Existing member detection.
- Member signup route under `/form/[slug]` with a form-owned completion redirect.
- Minimal member dashboard after signup or direct authenticated visit.
- Sign-out from the authenticated shell.
- Basic error, loading, empty, and success states for the signup flow.

### Out of scope

- Hacker applications and hacker dashboard.
- Dues/payment checkout and dues status.
- General-purpose upload management outside member resume/profile-picture uploads.
- Guild profile public directory behavior.
- Admin navigation and admin surfaces.
- Role/permission management.
- Discord role sync or Discord side effects beyond authentication.
- Club events, check-in, points, analytics, and QR/pass generation.
- General-purpose form browsing/responding outside member signup.
- Admin form creation, editing, connection management, and response visibility.
- A general form-response inbox or admin response viewer.
- Judge portal.
- Sponsor page.
- Migration or cutover of production users beyond using the existing member/profile data model.

## Vocabulary

- `Blade`: Knight Hacks' member and operations platform.
- `Discord sign-in`: The authentication flow that lets a user log in using their Discord identity.
- `User`: The auth/account profile created or resolved by authentication. It represents identity and session ownership, not Knight Hacks member details.
- `Member profile`: A Knight Hacks profile connected to the signed-in user and used for member-specific Blade behavior.
- `Member signup`: The first-time form a signed-in user completes to create a member profile.
- `Member dashboard`: The authenticated page a member sees after signup or on return visits.
- `Form response`: The saved response payload for a submitted form.
- `Form callback`: A server-owned callback mapped from a form connection that runs after a valid form response is submitted.
- `Guild profile visibility`: A member-controlled visibility setting where private remains sponsor/staff-visible and public also appears to members on Guild.

## Acceptance criteria

- An unauthenticated visitor can see the landing page and start Discord sign-in.
- An authenticated user without a member profile is guided to member signup rather than shown the member dashboard.
- A signed-in user can submit valid basic member profile information.
- Member signup is rendered through the dynamic form experience rather than a bespoke hard-coded member form.
- Member signup is submitted through the generic form response path and mapped into member creation by the configured callback.
- A callback failure prevents both a successful signup state and a persisted successful form response for this flow.
- Successful signup creates a `Member` profile linked to the current authenticated `User`.
- Profile-picture upload accepts valid JPEG, PNG, GIF, and WebP images, rejects invalid files safely, previews the selected image in signup, and previews saved/new images on the dashboard.
- Resume upload accepts valid PDFs, rejects invalid files safely, previews the selected PDF in signup, and previews saved/new PDFs on the dashboard.
- Member signup requires accepting the Knight Hacks Code of Conduct link.
- Guild visibility clearly explains private versus public behavior before submission.
- After successful signup, the user lands on a minimal member dashboard.
- An authenticated user with an existing member profile goes directly to the dashboard.
- The signup form shows safe, understandable feedback for missing or invalid required fields.
- The signup flow prevents duplicate member profile creation for the same user.
- The authenticated shell provides a sign-out path.
- The first slice does not expose, stub as complete, or partially rebuild out-of-scope hacker, dues, admin, general forms, events, or judge features.

## Resolved choices

- The first member signup form is code-owned with a stable form ID/slug and is upserted at runtime.
- The first slice collects the existing DB-backed `Member` fields needed to create a durable profile.
- The dashboard stays intentionally small and avoids dues/events/admin placeholders that could look complete.
- Guild profile data remains persisted on `Member` for this slice; no separate Guild table is introduced.
