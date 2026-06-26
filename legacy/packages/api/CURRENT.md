# Legacy API Current State

This document describes the behavior and platform features currently present in the legacy `@forge/api` package. It is a current-state product/spec inventory for Reforge agents. It should explain what the platform can do and what users/surfaces depend on, without treating the legacy file layout as the target architecture.

Primary source folder: `legacy/packages/api/src`.

## Purpose

Legacy `@forge/api` is the main tRPC platform layer used by Blade and related Forge clients. It owns business workflows for auth/session reads, members, hackers, hackathons, events, forms, issues, judging, roles/permissions, Discord-aware operations, dues/payment flows, resumes, QR/pass generation, email, file storage, CSV imports, and operational utilities.

The API is the source of truth for current Blade behavior. Reforge should preserve the product capabilities and permission semantics even when changing package boundaries, naming, schema shape, or implementation details.

## API shape and source map

Root router: `legacy/packages/api/src/root.ts`.

Top-level tRPC domains currently exported:

- `auth` — session, liveness, Discord/member/admin/judge checks, sign-out.
- `challenge` — hackathon challenge lookup.
- `companies` — member application company/source options.
- `csvImporter` — Devpost/competition CSV ingest.
- `duesPayment` — membership dues checkout/payment recording/status.
- `email` — hackathon and general email sends.
- `event` — club/hackathon event CRUD, attendance reads, event feedback form support.
- `eventFeedback` — logged hackathon issue/feedback reporting.
- `forms` — dynamic forms, responses, sections, response access, tRPC form callbacks, uploads.
- `guild` — Discord/guild-facing roster and profile picture/resume utilities.
- `hackathon` — hackathon lifecycle, lookup, historical/current hackathon data.
- `hackerMutation` — hacker application/profile/admin mutations, status changes, check-in, points.
- `hackerPagination` — paginated/filterable hacker admin tables.
- `hackerQuery` — hacker profile/admin/analytics reads.
- `issues` — internal issue/task/template system.
- `judge` — judging portal, judge records, submissions, rubric results, magic-room sessions.
- `member` — member profile, admin member tables, points, dues, attendance/check-in.
- `misc` — dynamic-form callback procedures for role/recruiting workflows.
- `passkit` — Apple/Wallet-style pass generation for member/hacker profiles.
- `qr` — user QR code generation.
- `resume` — resume upload and retrieval.
- `roles` — Discord-linked Blade role/permission management.
- `user` — current user avatar and user listing for role assignment.

## Cross-cutting behavior

### tRPC is the primary API boundary

Normal product reads/mutations are exposed as tRPC procedures. REST/route handlers in Blade are only for app/protocol boundaries such as auth, membership callbacks, and the tRPC endpoint itself.

### Auth and permissions

The API distinguishes:

- public procedures that can answer unauthenticated/basic checks;
- protected procedures that require a logged-in Blade session;
- permission-controlled procedures that require one or more Blade permissions;
- judge-capable procedures that allow active judge sessions and/or judge/admin contexts depending on the procedure.

Permissions are backed by Discord-linked Blade roles. Many admin actions check named permission bits such as `IS_OFFICER`, `READ_MEMBERS`, `EDIT_MEMBERS`, `READ_FORMS`, `EDIT_FORMS`, `READ_HACK_DATA`, `CHECKIN_CLUB_EVENT`, `CHECKIN_HACK_EVENT`, `EMAIL_PORTAL`, `CONFIGURE_ROLES`, `ASSIGN_ROLES`, `READ_ISSUES`, `EDIT_ISSUES`, `READ_ISSUE_TEMPLATES`, and `EDIT_ISSUE_TEMPLATES`.

### Side effects and auditability

Several mutations create external or operational side effects:

- Discord role assignment/removal when Blade roles are granted/revoked.
- Discord logging for sensitive actions such as member deletion, dues changes, form response deletion, hackathon issue reports, and other operational actions.
- Stripe payment sessions/payment intents and post-payment dues records.
- MinIO/S3 uploads and presigned URLs for resumes, profile pictures, and form files.
- Email sends through the configured email provider/templates.
- Pass/QR generation.

Reforge agents should preserve which actions are side-effectful and make those boundaries explicit in SRDs/tests.

## Auth/session behavior

Router: `auth`. Source: `src/routers/auth.ts`.

Current capabilities:

- Read the current session object.
- Return liveness/health information including ok status, timestamp, and process uptime.
- Return a protected test/secret message for authenticated callers.
- Check whether the current user is an admin/officer according to Discord/auth utilities.
- Check whether the current user is a Discord/Knight Hacks member.
- Check whether the current context has judge access.
- Invalidate the current session token for sign-out.

Usage expectations:

- Blade uses these checks to route users between public auth, dashboard, admin, and judge surfaces.
- Unauthenticated checks return safe boolean false-style values rather than throwing where the UI needs a simple branch.

## Roles, permissions, and Discord role behavior

Router: `roles`. Source: `src/routers/roles.ts`.

Current capabilities:

- Create a Blade role link with a display name, Discord role ID, and permission bitstring.
- Update an existing role link.
- Delete a role link.
- Read one role link or list all role links.
- Look up Discord role metadata for one or many linked Discord roles.
- Read Discord role member counts for admin role tables.
- Resolve the current user's permission bitset, or another user's bitset when a user ID is provided.
- Check permission expressions with `and` and/or `or` requirements.
- Grant a linked Blade role to a user.
- Revoke a linked Blade role from a user.
- Batch grant/revoke role links across multiple users and roles and return successes/failures.

Usage expectations:

- Role configuration requires `CONFIGURE_ROLES`.
- User role assignment requires `ASSIGN_ROLES`.
- Permission checks are used throughout Blade for admin route guards and nav visibility.
- Grant/revoke flows are Discord-aware: when a Blade role maps to a Discord role, assigning/removing it should also update the member's Discord guild roles when possible.
- The roles system is a durable product concept, not just admin UI plumbing.

## User identity behavior

Router: `user`. Source: `src/routers/user.ts`.

Current capabilities:

- Return the current user's Discord avatar URL and display name.
- List users with their permission relations for role-management screens.

Usage expectations:

- Avatar/name data powers Blade account dropdowns.
- User listing is used by role assignment/search surfaces and is permission-gated for role configuration.

## Member behavior

Router: `member`. Source: `src/routers/member.ts`.

Current capabilities:

- Create the current user's club member profile from the member application.
- Update a member profile, including self-service settings and admin profile edits.
- Delete a member profile.
- Read the current user's member profile.
- Read events for the current member, including attendance relationship and attendance counts.
- List members for admin tables, with support for fetch-all and paginated/search/sort/filter modes.
- Count members matching search/filter criteria.
- Read distinct schools and majors.
- Read member filter options with counts for schools and majors.
- Give member points.
- Read dues-paying members.
- Read member attendance counts/engagement data.
- Mark a member as dues-paying.
- Remove a member from dues-paying status.
- Clear all dues records.
- Check a member into a club/hackathon event and award event points.

Usage expectations:

- Member creation is user self-service after authentication.
- Admin member tables support search by name/email/Discord-like fields plus school/major filters, sort, pagination, profile view, edit, deletion, dues toggling, and point operations.
- Dues mutations and deletion-style actions are operationally sensitive and should be logged/audited.
- Check-in flows accept a scanned/manual user identifier plus an event and apply event points.

## Dues/payment behavior

Router: `duesPayment`. Source: `src/routers/dues-payment.ts`.

Current capabilities:

- Create a Stripe Checkout session for membership dues.
- Create a Stripe PaymentIntent for embedded dues payment.
- Validate whether the current member has paid dues.
- Finalize/order-success flow by reading a completed payment and recording dues payment data.
- Read dues payment dates for analytics.

Usage expectations:

- Dues checkout requires an existing member profile.
- The dashboard uses dues status to show payment prompts or dues-only access.
- Payment success should not mark dues paid unless Stripe reports a completed/successful payment state.
- Dues payment dates power admin analytics such as dues-over-time charts.

## Hackathon behavior

Router: `hackathon`. Source: `src/routers/hackathon.ts`.

Current capabilities:

- List hackathons.
- List hackathons manageable by admins/officers.
- Read the current/active hackathon.
- Read a user's previous hacker/application state.
- Read a hackathon by name/slug or by ID.
- List past hackathons.
- Count confirmed hackers for a hackathon.
- Create hackathons.
- Update hackathons.

Usage expectations:

- Hackathon records drive application windows, confirmation deadlines, event relationships, dashboard countdowns, admin analytics, judging, challenge/submission context, and historical display.
- Current hackathon lookup is used heavily by dashboards, admin hacker tables, CSV import, judging, and application flows.
- Hackathon create/update is officer/admin behavior.

## Hacker application and attendee behavior

Routers: `hackerMutation`, `hackerQuery`, `hackerPagination`. Sources: `src/routers/hackers/*`.

### Mutations

Current capabilities:

- Create a hacker/application for the current user for a hackathon.
- Update a hacker/application profile.
- Delete hacker data.
- Confirm an accepted hacker.
- Withdraw a hacker.
- Check a hacker into an event and award event points.
- Give hacker points.
- Update hacker status/admin decision state.

Usage expectations:

- Hacker creation is the public/authenticated application path for a specific hackathon.
- Update/delete powers settings and admin edits.
- Confirmation and withdrawal are user-accessible lifecycle actions, not only admin actions.
- Admin status changes include accept, deny, waitlist, blacklist, and related transitions exposed by Blade.
- Check-in and points are used by hackathon admin events and shared point tools.

### Queries and analytics

Current capabilities:

- Read the current user's hacker/application for a hackathon.
- List hackers for admin/analytics use.
- List all hackers for check-in/manual selection.
- Compute points by class/team.
- Read top hackers/leaderboard data.
- Count hacker statuses by hackathon.
- Return paginated hacker pages with filters/search/sort for admin tables.
- Return hacker counts and filter option values/counts for admin tables.

Usage expectations:

- Admin hacker tables depend on server-side pagination/filtering for performance.
- Status counts drive application funnel cards and status-filtered views.
- Dashboard leaderboards and team/class points depend on points aggregation.

## Event behavior

Router: `event`. Source: `src/routers/event.ts`.

Current capabilities:

- List events with attendance counts.
- List public club events with a safe public shape and limit.
- Read member attendees for a club event.
- Read hacker attendees for a hackathon event.
- Create events.
- Update events.
- Delete events.
- Ensure an event feedback form exists.
- Read aggregated event feedback.

Usage expectations:

- Events can be club events, hackathon events, and operations-calendar/internal events depending on fields and selected options.
- Event CRUD supports name, description, tag/type, start/end datetime, location, point value, dues requirement where valid, related hackathon, associated roles, and Discord/calendar-like metadata.
- Creating/updating operations-calendar style events requires a Discord channel ID.
- Hackathon events cannot require dues.
- Event feedback uses a generated dynamic form named from the event and is surfaced in dashboards/admin analytics.
- Delete/update flows should preserve external calendar/Discord cleanup behavior where present in legacy.

## Event feedback / hackathon issue report behavior

Router: `eventFeedback`. Source: `src/routers/event-feedback.ts`.

Current capabilities:

- Accept a textual hackathon issue/feedback report from a user.
- Log the report to Discord with officer visibility.

Usage expectations:

- The hackathon dashboard uses this for user-reported event/ops issues.
- It is a side-effectful operational notification, not just stored feedback.

## Dynamic forms behavior

Router: `forms`. Source: `src/routers/forms.ts`.

Current capabilities:

- Create forms.
- Update/upsert forms and regenerate validation metadata from form schema.
- Read a form by slug/name.
- Check whether the current user can respond to a form.
- Delete forms.
- List forms with pagination and optional section filtering.
- Add, list, and delete tRPC form connections/callback mappings.
- Create a response.
- Edit an existing response.
- List responses for a form with respondent/member metadata.
- Delete a response.
- Read the current user's response by form or response ID.
- Generate upload URLs for form file/image/video responses.
- Delete uploaded form media.
- Generate view/download URLs for uploaded form files.
- List sections available to the current admin/editor.
- Read section form counts.
- Move forms between sections.
- Rename sections.
- Delete sections, moving contained forms to the default/general section.
- Create sections.
- Read and update role access for form sections.
- Reorder sections.
- Check whether the current user can edit a specific form.
- Toggle form closed/open state.

Usage expectations:

- Forms are a major dynamic content system, not a simple survey feature.
- Form definitions include title/name, description, questions, instructions, order, question types, options, validation, closed/open state, edit/resubmission settings, dues-only gating, and section assignment.
- Respondent access can be restricted by role. Empty response-role lists mean broadly accessible.
- Section access can be restricted by role. Officers/admins may see broader sections than normal editors.
- Public/respondent form routes require login and can show closed, dues-required, already-submitted, edit/view, not-found, submitted-success, and response-not-found states.
- File upload questions use presigned uploads and stored object references rather than embedding files in responses.
- Admin responses support all-responses and per-user views, charts/aggregations for option/numeric-style questions, CSV export, file download, and response deletion.

### tRPC form connections/callbacks

The forms system can map a form to one or more tRPC procedures that run after submission. A connection maps procedure input fields to submitted form fields and/or custom values.

Connected procedures must register metadata in the same pattern documented in `docs/API-AND-PERMISSIONS.md`:

- `.meta({ id, inputSchema })`
- matching `.input(inputSchema)`

The form editor/responder uses this metadata to discover callable procedures, validate mapped input, and submit callback payloads through the connector.

Important behavior to preserve:

- Form response creation executes configured connections/callbacks after submission.
- Callback execution maps response values into the target procedure's expected input shape.
- Procedures intended for form callbacks need stable IDs and schemas.
- Forms with tRPC connections cannot safely support normal response editing/resubmission in the same way as plain forms; the legacy update path blocks enabling edit when connections exist.
- The `misc` router currently contains form-callback-oriented procedures such as allowed Discord role assignment and recruiting updates.

## Misc dynamic-form callback behavior

Router: `misc`. Source: `src/routers/misc.ts`.

Current capabilities:

- `addRoleId`: assign an allowed Discord/Blade role from a dynamic form submission.
- `recruitingUpdate`: accept recruiting-interest form fields such as name, email, major, graduation term/year, and team.

Usage expectations:

- These procedures are intentionally metadata-registered for dynamic forms.
- Role assignment is allowlisted; arbitrary Discord roles should not be assignable from forms.
- Recruiting form callbacks should be treated as product workflows connected to forms, not random helper mutations.

## Guild/profile behavior

Router: `guild`. Source: `src/routers/guild.ts`.

Current capabilities:

- Upload/update a profile picture for a guild/member profile.
- List guild members.
- List the public club team roster.
- Retrieve a guild/member resume.

Usage expectations:

- Guild-facing data bridges member profiles, public club team display, and file storage.
- Profile-picture upload is file-storage side-effectful.

## Resume behavior

Router: `resume`. Sources: `src/routers/resume.ts`, `src/resume-storage.ts`, `src/resume-security.ts`.

Current capabilities:

- Upload a PDF resume for the current user from a base64 data URL.
- Validate resume payload size/content before storage.
- Store the resume in object storage under an owned object name.
- Associate the resume with the user's member and/or hacker profile as applicable.
- Retrieve a view/download URL for the current user's stored resume.

Usage expectations:

- Resume upload is used in member application/settings, hacker application/settings, and dashboard resume actions.
- Users should only retrieve their own resume unless an explicit admin/guild workflow allows broader access.
- Resume storage must preserve ownership and object-name normalization semantics.

## QR and pass behavior

Routers: `qr`, `passkit`. Sources: `src/routers/qr.ts`, `src/routers/passkit.ts`, `src/qr-code.ts`.

Current capabilities:

- Generate a QR code data URL for the current user's identity/check-in payload.
- Generate a wallet/pass file for member or hacker profile kind.

Usage expectations:

- QR codes are used for member/hacker check-in and account dropdown/dashboard display.
- Pass generation depends on an existing member or hacker profile and should return a downloadable pass artifact or error state.
- Generated QR/pass payloads should remain compatible with scanner/check-in flows.

## Email behavior

Router: `email`. Source: `src/routers/email.ts`.

Current capabilities:

- Send hackathon-specific emails using known hackathon email kinds/templates/data.
- Send general templated emails.

Usage expectations:

- Email sending requires `EMAIL_PORTAL`.
- Email is an external side effect and must remain explicit/auditable in Reforge.
- Hackathon emails require recipient metadata and hackathon context.

## CSV import behavior

Router: `csvImporter`. Source: `src/routers/csv-importer.ts`.

Current capabilities:

- Import competition/project/team data from CSV content for a hackathon.
- Parse rows with relaxed column handling.
- Create/update competition records needed for judging/project displays.

Usage expectations:

- The import is officer-only operational tooling.
- It feeds judging/project/challenge/submission views and should validate hackathon context before writing.
- It should be treated as destructive/bulk data ingest and tested with real exported CSV shapes.

## Challenge and company lookup behavior

Routers: `challenge`, `companies`. Sources: `src/routers/challenges.ts`, `src/routers/companies.ts`.

Current capabilities:

- Read hackathon challenges by hackathon ID.
- Read company/source options used by member/profile forms.

Usage expectations:

- Challenges power room assignment, judge assignment, and project/judging filters.
- Companies/options support form select fields and profile data normalization.

## Judging behavior

Router: `judge`. Source: `src/routers/judge.ts`.

Current capabilities:

- List project submissions, optionally scoped by hackathon.
- Check whether a judge already submitted a rubric for a submission.
- List judges and their room/challenge assignments.
- Generate short-lived magic judge activation URLs for a room.
- Activate a magic token and create a judge-room session.
- Create a judged submission/rubric score.
- Create judges.
- Update judge room/challenge assignments.
- Delete judges.
- List judged submissions with search and challenge/judge filters.
- Read judging metrics/averages.
- Read a judged submission by ID.
- Read active judge-session counts by room.
- Delete active judge sessions by room.
- List unique judge room names.

Usage expectations:

- Judges can access a dedicated judge portal through a judge session/magic-link flow.
- Admin/officer users can also access judging management/results where permissioned.
- A judge should not be able to submit multiple rubrics for the same submission.
- Rubric data includes category ratings, overall/private feedback, project/team/challenge/judge relationships, and result aggregation.
- Control-room session management lets officers clear active judge sessions by room during operations.

## Internal issues/tasks behavior

Router: `issues`. Source: `src/routers/issues.ts`.

Current capabilities:

- Look up users on a team for assignment.
- Create an issue, including optional child/sub-issues.
- Read one issue with relations and visibility filtering.
- List issues with filters such as date range, assignees, creator, team, status, and parent/root state.
- Update issue fields including name, description, status, priority, parent, due date, event link, links, team, assignees, team visibility, and child issues where applicable.
- Delete an issue and its subtree.
- Create issue templates.
- Update issue templates.
- Delete issue templates.
- List issue templates.

Usage expectations:

- Issues back Blade's internal kanban/list/calendar/task surfaces.
- Issue visibility is team-aware; users should only see issues visible to their teams unless officer/admin permissions allow broader access.
- Teams, assignees, parent/child relationships, event linkage, due dates, statuses, priorities, and external links are product concepts.
- Templates are separately permissioned from normal issue editing.

## Database/storage concepts surfaced by the API

The following product concepts are directly surfaced by API behavior and should be preserved conceptually:

- Users authenticated through Discord/Blade auth.
- Blade roles linked to Discord roles and permission bitstrings.
- Members and dues payment records.
- Hackathons, hacker applications/attendees, statuses, confirmations, withdrawals, points, teams/classes.
- Events, club/hackathon attendance, feedback forms.
- Dynamic forms, sections, response role restrictions, section role restrictions, responses, uploaded media, tRPC callback connections.
- Resumes/profile pictures in object storage.
- Judging challenges, submissions, judges, judge sessions, judged submissions/rubrics.
- Issues, issue templates, teams, assignees, team visibility.

## Reforge notes for future agents

- Preserve product behavior first; do not copy legacy router/file boundaries blindly.
- Prefer keeping business workflows in the API/platform layer rather than Blade components.
- Every mutation with Discord, Stripe, email, file-storage, QR/pass, or bulk-data side effects should have explicit tests or SRD acceptance criteria.
- Dynamic forms and tRPC callbacks are core platform behavior. Treat callback metadata and schemas as part of the API contract.
- Permission names and access semantics should be inventoried before renaming or consolidating.
- Current source evidence: `src/root.ts` plus routers under `src/routers/*` and storage helpers under `src/resume-*`, `src/minio/*`, and `src/qr-code.ts`.
