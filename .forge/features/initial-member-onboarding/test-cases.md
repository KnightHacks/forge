# Initial Member Onboarding Test Cases

Status: Draft / awaiting human review

> This file owns observable proof. Do not generate implementation tests until these cases are accepted.

## Scope

These cases cover the first member onboarding path:

```txt
landing page -> Discord sign-in -> member profile signup -> member dashboard
```

They intentionally exclude hacker applications, dues/payment, uploads, admin permissions, events, general-purpose forms, judging, and Discord role side effects.

The member signup UI should use the dynamic form rendering/callback path. Admin form creation and response visibility remain out of scope.

## Test placement plan

- API member/session behavior: package-level tests near `packages/api`.
- Member form validation and callback input validation: package-level tests near `packages/validators` and/or `packages/api`.
- Route/shell behavior: app-level tests near `apps/blade`.
- End-to-end user flow: Playwright under `apps/blade` once the auth/session test strategy is available.

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
- The signup flow is rendered from a form definition.
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

- Submit valid first-slice member profile information.

Expected observations:

- The form response passes form validation.
- The configured member creation callback runs.
- A member profile is created for the current user.
- The created member profile is linked to the current authenticated `User`.
- User/auth identity fields derived from the session are not supplied by, or trusted from, editable client input.
- The user sees success feedback or an immediate transition.
- The user lands on the member dashboard.

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

### TC-NEG-004: Out-of-scope legacy side effects do not accidentally run

Setup:

- A valid session exists.
- No member profile exists for that user.

Action:

- Complete a valid first-slice signup.

Expected observations:

- No dues/payment flow is started.
- No resume or profile-picture upload is required.
- No admin role/permission mutation occurs.
- No hacker application is created.
- Discord role/logging side effects do not occur unless explicitly approved in the SRD.
- Admin form creation/editing/response browsing is not required for the signup to work.

## Open questions

- Should the built-in member signup form be seeded in the DB for tests or loaded from a code-owned definition?
- Should successful member creation assert QR generation is absent or present?
- Should successful member creation assert form response persistence is transactional with member creation?
- Which errors should be visible as field errors versus global form errors?
