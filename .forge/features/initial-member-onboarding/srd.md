# Initial Member Onboarding SRD

Status: Draft / awaiting human review

> This file owns technical implementation constraints. It should be revised after the open product questions in `spec.md` are answered.

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
- `@forge/api` owns session-aware member read/create workflows.
- `@forge/db` owns schema, DB client, and existing member table definitions only.
- `@forge/validators` should own reusable member onboarding input validation for this slice. The validator should be derived from, wrapped around, or kept compatible with the existing `@forge/db` `Member` schema/`InsertMemberSchema` rather than inventing a parallel shape.
- `@forge/auth` remains the source for Discord/session integration.
- The forms runtime should reuse the existing `FormsSchemas`, `FormResponse`, and `TrpcFormConnection` concepts where possible.

Legacy source guidance:

- Use `legacy/apps/blade` and `legacy/packages/api` as source evidence for behavior and established patterns.
- Use `packages/auth` as the real auth implementation source. It already defines Better Auth, Discord provider mapping, session helpers, sign-in helpers, and `User` persistence through `@forge/db`.
- Active Reforge Blade may need to reintroduce the auth route handlers from legacy patterns because the scaffold moved the legacy app routes under `legacy/`.
- Do not copy legacy implementation debt just because it exists.
- In particular, review legacy form responder/callback code for the runtime concept, but simplify/reshape it where the SRD calls for a smaller first slice.

Expected route/data flow:

1. `/` renders public landing content when no session exists.
2. `/` redirects authenticated users toward `/dashboard` or the member onboarding destination.
3. `/dashboard` is server-first and requires a session.
4. `/dashboard` uses server-side API reads to determine whether the current user has a member profile.
5. A logged-in user without a member profile sees member signup rendered through the dynamic form runner/responder model.
6. Member signup submits a form response through tRPC to `@forge/api`.
7. A configured member signup form callback maps response values into a member creation procedure.
8. After successful callback completion, the UI redirects or refreshes into the member dashboard state.
9. A logged-in user with a member profile sees a minimal dashboard.

## Forms/callback onboarding design

This feature should make member onboarding a first-class consumer of Blade's form + callback system.

First-slice target:

- Render the member signup UI from a form schema.
- Persist the submitted response if the existing `FormResponse` model is retained.
- Invoke a stable tRPC callback procedure that creates the current user's `Member` profile.
- Do not expose admin form creation, editing, connection management, or response visibility yet.
- Do not require officers/admins to configure the initial member signup form before the first slice works.

Recommended implementation shape:

- Introduce a code-owned or seeded built-in member signup form definition using the existing `FormsSchemas` structure.
- Introduce a stable callback-capable tRPC procedure such as `member.createCurrentFromForm`.
- Add procedure metadata compatible with the existing form connection discovery pattern, or a cleaned-up Reforge equivalent.
- Map form fields to the callback input using explicit field names, not fragile UI labels where possible.
- Keep form callback execution inside server/API-controlled code so the client cannot call arbitrary procedures by editing payloads.
- Do not reuse legacy `handleCallbacks` as-is for member creation. It runs after client-side response success and can mark the UI submitted before the callback finishes.
- Prefer a server-side submission path where form response validation, optional response persistence, callback execution, and member creation complete as one operation from the user's perspective.

Design constraints:

- The member onboarding form is product-critical and should not depend on an admin UI that has not been rebuilt yet.
- Form response editing/resubmission should remain disabled for callback-backed member signup unless a later SRD proves safe behavior.
- If callback execution fails after a response is saved, the failure state must be visible and recoverable; avoid silently recording a response without creating the member profile.
- If the existing form callback approach is too client-driven or too permissive, Reforge may keep the data model while moving callback execution server-side.
- If the database supports it cleanly, form response persistence and member creation should happen in one transaction. If that is not practical, the SRD/implementation must define the recovery state.

## tRPC/API behavior

Proposed API surface, subject to refinement during implementation planning:

- `auth.getSession`: public query returning the current session or `null`.
- `auth.liveness` or equivalent health query: public query for basic API health.
- `auth.signOut`: protected mutation invalidating the active session.
- `member.getCurrent`: protected query returning the current user's member profile or `null`.
- `member.createCurrentFromForm`: protected callback-capable mutation creating a member profile for the current user from validated member onboarding form data.
- `forms.getBuiltInMemberSignup` or equivalent: protected query returning the member signup form definition if the form is code-owned rather than database-seeded.
- `forms.createResponse` or a narrower onboarding-specific submit procedure: protected mutation that validates a member signup response and triggers the member creation callback.

Expected API behavior:

- `member.getCurrent` returns only the current user's member profile.
- `member.createCurrentFromForm` derives `userId` and Discord display data from the current session rather than trusting client input.
- `member.createCurrentFromForm` rejects creation when the current user already has a member profile.
- `member.createCurrentFromForm` normalizes nullable optional fields consistently, such as empty phone/profile URL strings.
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
- optional resume URL/profile picture URL if the existing schema requires them as nullable fields, but uploads are out of scope

Server-derived or non-client-owned fields:

- `userId`
- `discordUser`
- `age`
- `points`
- `dateCreated`
- `timeCreated`
- generated IDs

Validation rules should cover required fields, email format, URL format where fields are present, phone format, date/age requirements, enum membership, and safe optional string length limits.

## Data / migration / compatibility

- Prefer the existing `User`, `Member`, `FormsSchemas`, `FormResponse`, and `TrpcFormConnection` table shapes unless the feature explicitly approves schema changes.
- No DB migration should be required for this first slice unless implementation proves the existing schema cannot support the form/callback runtime safely.
- If required member columns force more form fields than desired, collect the DB-backed fields rather than changing schema casually.
- Existing member profiles should be recognized by `member.getCurrent` and shown the dashboard, not forced through signup again.
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
- Use server-side reads for session and current member state.
- Client components are appropriate for the interactive signup form and sign-out action if needed.
- Signup UI must include pending/loading, success, validation error, and mutation error states.
- The dashboard should avoid exposing placeholder UI that looks like a finished dues, events, hacker, admin, or forms feature.
- Use existing `@forge/ui` primitives where appropriate.
- Reuse or adapt the existing form runner/responder pattern for member signup rendering.
- Keep Blade-specific composed components in `apps/blade`.

## Testing / verification strategy

Test cases are defined in `test-cases.md`.

Expected placement:

- `@forge/api` tests for member read/create auth behavior and validation.
- `@forge/blade` tests for route gating and signup/dashboard UI behavior.
- Playwright e2e for the high-value path when an auth test harness or mocked session strategy exists.

Expected commands, subject to actual harness availability:

```bash
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade typecheck
pnpm verify:precommit
```

## Open questions

- Should the built-in member signup form live as a DB seed, a code-owned form definition, or a hybrid?
- Should callback execution happen inside `forms.createResponse`, an onboarding-specific submit procedure, or a shared server-side callback runner?
- Should form response persistence and member creation happen in one transaction?
- Should member creation preserve legacy QR generation immediately, or defer it?
- What is the intended initial dashboard content after signup?
