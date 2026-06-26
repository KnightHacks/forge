# Initial Member Onboarding Spec

Status: Draft / awaiting human review

> This file owns the non-technical user/product intent. Technical design belongs in `srd.md`.

## User-facing purpose

A new Knight Hacks user should be able to arrive at Blade, sign in with Discord, create a basic Knight Hacks member profile, and land on a simple member dashboard.

This is the first Reforge slice of Blade. It should prove the core member path without rebuilding the full legacy dashboard, hacker application, dues, admin, general forms, events, judging, uploads, or permissions flows.

The membership signup experience should use Blade's dynamic form experience rather than a one-off hard-coded application form. The user should experience it as the official member signup form, even though admin form creation and response browsing are not part of this slice.

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
- The form provides clear required-field, invalid-value, loading, success, and failure feedback.
- Submitting the form creates the user's member profile through the configured form callback.
- After a successful signup, the user is taken to the member dashboard.

### Member dashboard

- A signed-in user with a member profile sees a minimal member dashboard.
- The dashboard confirms the member's profile exists and shows a small amount of profile/account information.
- The dashboard may include placeholders for future member features, but it should not pretend unavailable features are complete.
- The user can sign out from the authenticated shell.

## Scope

### In scope

- Public landing page for Blade.
- Discord sign-in entry point.
- Authenticated routing for the first member flow.
- Basic member profile signup for a signed-in user.
- Reusing the dynamic form responder/rendering model for the signup surface.
- Running a member-profile creation callback after valid form submission.
- Existing member detection.
- Minimal member dashboard after signup or direct authenticated visit.
- Sign-out from the authenticated shell.
- Basic error, loading, empty, and success states for the signup flow.

### Out of scope

- Hacker applications and hacker dashboard.
- Dues/payment checkout and dues status.
- Resume upload.
- Profile picture upload.
- Guild profile public directory behavior.
- Admin navigation and admin surfaces.
- Role/permission management.
- Discord role sync or Discord side effects beyond authentication.
- Club events, check-in, points, analytics, and QR/pass generation.
- General-purpose form browsing/responding outside member signup.
- Admin form creation, editing, connection management, and response visibility.
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
- `Form callback`: A configured tRPC procedure that runs after a valid form response is submitted.

## Acceptance criteria

- An unauthenticated visitor can see the landing page and start Discord sign-in.
- An authenticated user without a member profile is guided to member signup rather than shown the member dashboard.
- A signed-in user can submit valid basic member profile information.
- Member signup is rendered through the dynamic form experience rather than a bespoke hard-coded member form.
- Successful signup creates a `Member` profile linked to the current authenticated `User`.
- After successful signup, the user lands on a minimal member dashboard.
- An authenticated user with an existing member profile goes directly to the dashboard.
- The signup form shows safe, understandable feedback for missing or invalid required fields.
- The signup flow prevents duplicate member profile creation for the same user.
- The authenticated shell provides a sign-out path.
- The first slice does not expose, stub as complete, or partially rebuild out-of-scope hacker, dues, admin, general forms, events, or judge features.

## Open questions

- Should the member signup form be seeded/built-in under a stable slug such as `member-signup`, or should it be generated at runtime from a code-owned definition?
- Should company/source options appear in the first slice if they are part of the existing `Member` data model, or wait until a later profile enrichment slice?
- Should the dashboard include a "dues coming soon" or similar placeholder, or avoid mentioning future flows entirely?
