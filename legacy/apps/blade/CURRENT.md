# Legacy Blade Current State

This document describes the behavior and product features currently present in the legacy Blade app. It is a current-state product/spec inventory for Reforge agents. It should explain what Blade does for users and operators without treating the legacy component/file layout as the target architecture.

Primary source folder: `legacy/apps/blade/src`.

## Purpose

Legacy Blade is Knight Hacks' internal/member/hacker platform. It combines Discord-based authentication, member onboarding, dues/payment prompts, hacker applications, hackathon dashboards, club dashboards, dynamic forms, Discord-integrated permissions, judging, event check-in, admin analytics, internal issues/tasks, and operational tooling.

Blade is both:

- a member-facing/hacker-facing web app for Knight Hacks participants; and
- an officer/admin operations console for club and hackathon organizers.

Reforge should preserve the product capabilities and user journeys even if UI structure, routing, or implementation changes.

## User groups

- Public/unauthenticated visitors.
- Logged-in users authenticated through Discord/Blade auth.
- Discord/Knight Hacks members.
- Club members with a member profile.
- Hackathon applicants/hackers with a hacker profile/application.
- Accepted/confirmed/withdrawn/waitlisted/denied/blacklisted hacker states.
- Judges using judge portal access and/or magic-room sessions.
- Officers/admins/organizers with permission-gated access.
- Sponsors/sponsor-facing visitors for the sponsor page.

## Route and source map

Primary app routes under `src/app`:

- `/` — auth entry / Blade landing.
- `/dashboard` — logged-in user dashboard shell.
- `/member/application` — member onboarding form.
- `/member/checkout` — dues checkout/payment.
- `/member/success` — dues/payment success processing.
- `/hacker/application/[hackathon-id]` — hackathon application.
- `/settings` — member profile settings.
- `/settings/hacker-profile` — hacker profile settings.
- `/forms/[formName]` — dynamic form response page.
- `/forms/[formName]/[responseId]` — dynamic response review/edit page.
- `/admin` — admin dashboard/navigation hub.
- `/admin/club/members` — club member admin table and actions.
- `/admin/club/events` — club event admin table and actions.
- `/admin/club/check-in` — club event check-in.
- `/admin/club/data` — club analytics.
- `/admin/hackathon/hackers` — hackathon applicant/hacker admin table.
- `/admin/hackathon/events` — hackathon event admin table and actions.
- `/admin/hackathon/check-in` — hackathon event check-in.
- `/admin/hackathon/data` — hackathon analytics.
- `/admin/hackathon/manage` — hackathon creation/update management.
- `/admin/hackathon/judge-assignment` — judge room QR/magic-link tooling.
- `/admin/hackathon/roomAssignment` — challenge/judge/room assignment tooling.
- `/admin/hackathon/control-room` — operations control room for judge sessions/imports.
- `/admin/forms` — form admin home.
- `/admin/forms/[slug]` — form editor.
- `/admin/forms/[slug]/responses` — form responses dashboard.
- `/admin/roles/configure` — role/permission link configuration.
- `/admin/roles/manage` — user role assignment.
- `/admin/issues/list` — issue list view.
- `/admin/issues/kanban` — issue kanban board.
- `/admin/issues/calendar` — issue calendar view.
- `/admin/issues/[id]` — issue detail view.
- `/admin/banquet-raffle` — banquet raffle tool.
- `/judge` — judge portal home.
- `/judge/dashboard` — judge project dashboard/rubrics.
- `/judge/results` — judging results dashboard.
- `/sponsor` — sponsor-facing page.
- `/[...not-found]` — not-found fallback.

Route/API endpoints under `src/app/api`:

- `/api/auth/[...all]` and `/api/auth/signin` — auth protocol routes.
- `/api/trpc/[trpc]` — tRPC HTTP endpoint for `@forge/api`.
- `/api/membership` — Stripe membership dues webhook boundary for checkout sessions and payment intents.

## Cross-cutting app behavior

### Authentication and session routing

Blade uses Discord/Blade auth for protected areas. Public routes can show auth options and sponsor information, but most member, hacker, dashboard, form, admin, and judge pages branch or redirect based on session state.

Expected behavior:

- Unauthenticated users attempting protected routes are redirected to sign-in/home with callback information where applicable.
- Authenticated users with existing member/hacker state are redirected away from duplicate application flows.
- Dashboard rendering depends on current Discord/member/hacker status.
- Admin routes require specific permission checks and redirect when unauthorized.
- Judge routes allow judge/admin access patterns distinct from normal member dashboards.

### tRPC data access

Blade consumes the legacy API through server and client tRPC helpers:

- server-side reads for route guards, initial data, redirects, and hydration;
- client-side queries/mutations for interactive tables, forms, charts, check-in, admin edits, uploads, and workflow actions.

Future Reforge Blade should keep route/page components thin: auth/permission checks, initial reads, and rendering; durable workflow logic belongs in the platform/API layer.

### Permission model

Admin surfaces are guarded by Blade permissions resolved from Discord-linked roles. Navigation visibility and route access both depend on these permissions.

Representative permissions used by Blade include:

- `IS_OFFICER`, `IS_JUDGE`
- `READ_MEMBERS`, `EDIT_MEMBERS`
- `READ_CLUB_EVENT`, `EDIT_CLUB_EVENT`, `CHECKIN_CLUB_EVENT`, `READ_CLUB_DATA`
- `READ_HACK_DATA`, `EDIT_HACK_EVENT`, `CHECKIN_HACK_EVENT`
- `READ_FORMS`, `EDIT_FORMS`
- `CONFIGURE_ROLES`, `ASSIGN_ROLES`
- `READ_ISSUES`, `EDIT_ISSUES`, `READ_ISSUE_TEMPLATES`, `EDIT_ISSUE_TEMPLATES`
- `EMAIL_PORTAL`

Unauthorized users are redirected or shown access-denied style states rather than receiving admin UI.

## Public/auth surfaces

### Home / auth entry

Route: `/`. Source: `src/app/page.tsx`, components such as `auth-showcase`, `option-cards`, `hero`.

Current behavior:

- Serves as the public entry point for Blade.
- Presents Discord sign-in / auth showcase behavior.
- Can route users toward member or hackathon onboarding choices.
- Hydrates tRPC for client auth/admin status checks.

### Not-found fallback

Route: `/[...not-found]`.

Current behavior:

- Shows a Blade-branded 404 page.
- Provides a way back to Blade/home.

### Sponsor page

Route: `/sponsor`. Source: `src/app/sponsor/page.tsx`.

Current behavior:

- Presents a sponsor-facing Knight Hacks/Blade page.
- Uses current hackathon/Knight Hacks public constants and sponsor positioning.
- Includes sponsor contact/call-to-action style content.

Reforge note: confirm whether this belongs in Blade or public site before rebuilding; current behavior exists and should be accounted for.

## Dashboard shell and user navigation

Route: `/dashboard`. Sources: `src/app/dashboard/page.tsx`, `src/app/_components/user-interface.tsx`, `src/app/_components/navigation/*`.

Current behavior:

- Requires authentication.
- Checks Discord/member/hacker state.
- Shows a logged-in navbar/account dropdown with avatar, sign-out, QR, dashboard, admin/system links when permissioned.
- Chooses user experience based on profile state:
  - prompt to become a member when no member profile exists;
  - member dashboard for club members;
  - hacker/hackathon dashboard for hackathon applicants/attendees;
  - admin links when role permissions permit.
- Includes Discord/Knight Hacks community modal/prompt behavior.

Navigation expectations:

- Account dropdown displays current user identity and avatar.
- QR code viewing is available for check-in payloads.
- Admin links are permission-driven, not hard-coded for everyone.
- Sign-out invalidates the session.

## Member user workflows

### Member application

Route: `/member/application`. Sources: `src/app/member/application/page.tsx`, `dashboard/member/member-application-form.tsx`.

Current behavior:

- Allows an authenticated user to create a club member profile.
- Redirects users who already have a member profile back to dashboard.
- Collects member profile data such as name/contact, demographics/academic info, shirt size, date of birth, source/company-style options, profile picture/resume where applicable, and required fields/validation.
- Submits through the member API and shows success/error states.

### Member dashboard

Sources: `dashboard/member-dashboard/*`.

Current behavior:

- Displays member identity/info and membership status.
- Shows points and engagement-style information.
- Shows upcoming/relevant club events and event counts.
- Lets members give event feedback through generated dynamic forms.
- Shows dues/payment prompts and donation/payment actions when dues are unpaid or required.
- Shows forms available to the member and the user's existing responses.
- Supports QR/pass download for check-in/member identity.
- Supports resume download/upload actions where the profile has a resume.
- Includes alumni and recap/early-access/volunteer themed content for relevant states.

### Dues checkout and success

Routes: `/member/checkout`, `/member/success`. Sources: `checkout-form`, `membership-success-page`.

Current behavior:

- Checkout requires authentication and an existing member profile.
- Users with paid dues are redirected away from checkout.
- Embedded payment/Stripe flows collect dues payment and confirm status.
- Success route validates/finishes payment state and records/reflects dues status.
- UI handles pending, successful, invalid confirmation, and error states.

### Member settings

Route: `/settings`. Sources: `settings/member-profile-form.tsx`, `delete-member-button.tsx`.

Current behavior:

- Requires authentication and member profile state.
- Lets a user view/update member profile data.
- Supports profile picture upload.
- Supports resume upload/update.
- Exposes destructive delete membership/profile action with confirmation text.
- If no member profile exists but a hacker profile exists, redirects toward hacker-profile settings.

## Hacker/hackathon user workflows

### Hacker application

Route: `/hacker/application/[hackathon-id]`. Sources: `dashboard/hacker/hacker-application-form.tsx`, `hacker-application-background.tsx`.

Current behavior:

- Allows an authenticated user to apply for a specific hackathon.
- Reads hackathon data, current hacker/application state, current member state, and previous hacker data where relevant.
- Redirects if the hackathon/application state does not allow a new application.
- Collects basics, contact/reachability, school/education, profile, survey/about-you responses, resume upload, and other application fields.
- Supports prefill from member/previous hacker data where available.
- Submits through hacker API and shows validation/success/error states.

### Hacker dashboard

Sources: `dashboard/hacker-dashboard/*`, `dashboard/hackathon-dashboard/*`.

Current behavior:

- Shows hackathon-specific participant/application state.
- Displays hackathon data, countdown/upcoming events, class/team assignment, point totals, team points, and leaderboards where available.
- Shows current hacker status and confirmation/withdrawal actions when applicable.
- Enforces confirmation deadlines/status constraints in the UI.
- Supports QR code display/download for hacker check-in.
- Supports resume upload/download actions.
- Shows past hackathons attended.
- Provides an issue/report dialog that logs operational feedback to officers.

### Hacker settings

Route: `/settings/hacker-profile`. Sources: `settings/hacker-profile-form.tsx`, `delete-hacker-button.tsx`.

Current behavior:

- Lets a user view/update hacker profile/application data.
- Supports resume upload/update.
- Exposes destructive delete hacker data action with confirmation text.
- Uses current hackathon context where needed.

## Dynamic forms system

### Public/respondent forms

Routes:

- `/forms/[formName]`
- `/forms/[formName]/[responseId]`

Sources: `src/app/forms/*`, `src/app/_components/forms/*`.

Current behavior:

- Requires authentication and redirects to sign-in with callback URL when needed.
- Loads a form by slug/name.
- Checks respondent access based on form response-role restrictions.
- Supports form states:
  - form not found;
  - response not found;
  - form closed;
  - dues required;
  - already submitted;
  - edit existing response;
  - view existing response;
  - submitted success.
- Renders instructions and questions from the dynamic form schema.
- Supports question types such as short answer, paragraph, multiple choice, checkboxes, dropdown, boolean, date, time, link, and file upload style questions.
- Handles client validation, submission, edit submission, and loading/error states.
- Upload questions request presigned upload URLs and submit stored object references.

### Admin forms home

Route: `/admin/forms`. Sources: `admin/forms/page.tsx`, `admin/forms/homepage.tsx`, `forms/shared/*`.

Current behavior:

- Requires `READ_FORMS` or `EDIT_FORMS`.
- Lists forms with pagination/section grouping.
- Shows sections and section counts.
- Supports creating forms.
- Supports moving forms between sections.
- Supports deleting forms.
- Supports QR code generation for form links.
- Supports CSV export of responses.
- Supports section management: create, rename, delete, reorder, and role access management.

### Form editor

Route: `/admin/forms/[slug]`. Sources: `admin/forms/editor/*`, `forms/shared/*`.

Current behavior:

- Requires basic form permissions plus per-form/section edit access.
- Lets admins edit form name, description, questions, instructions, ordering, question options, and form behavior flags.
- Supports form section assignment and role-restricted sections.
- Supports respondent role restrictions.
- Supports closed/open state, dues-only behavior, edit/resubmission settings.
- Detects duplicate question titles and save errors.
- Provides tRPC procedure connection UI with procedure selection and field mapping.

### Form responses

Route: `/admin/forms/[slug]/responses`. Sources: `admin/forms/responses/*`.

Current behavior:

- Requires form read/edit permissions.
- Shows all responses and per-user response tabs.
- Displays respondent metadata when available.
- Supports response table views by question/answer.
- Supports charts/aggregations such as bar, horizontal bar, pie, and average-style views depending on question type.
- Supports file response download via generated file URLs.
- Supports response deletion.

### tRPC form connections/callbacks

Current behavior:

- Admin form tooling supports tRPC form connections/callbacks.
- A form can be mapped to one or more tRPC procedures that run after submission.
- Connections map procedure input fields to form fields and/or custom values.
- Connected procedures must register metadata with `.meta({ id, inputSchema })` and a matching `.input(inputSchema)`.
- Blade/form responder code relies on that metadata to discover callable procedures, validate mapped form input, and submit callback payloads through the connector.
- Forms with callback connections have different edit/resubmission safety constraints; legacy blocks enabling normal edit behavior when connections exist.

## Club admin workflows

All club admin routes are permission-gated and redirect unauthorized users.

### Admin hub

Route: `/admin`. Source: `src/app/admin/page.tsx`.

Current behavior:

- Requires login and at least one admin-style permission.
- Shows grouped cards/links for club management, hackathon management, forms, roles, issues, judging, and other operations based on permission availability.
- Displays section descriptions such as members, events, check-in, analytics, forms, roles, and systems tooling.

### Club members

Route: `/admin/club/members`. Sources: `admin/club/members/*`.

Current behavior:

- Requires member read/edit style permissions.
- Shows a searchable/filterable/paginated member table.
- Filters include school and major; search covers names/contact-style fields.
- Supports member profile detail view with general/contact info, shirt size, date of birth, phone/email, and points.
- Supports editing member records.
- Supports deleting member records with typed destructive confirmation.
- Supports dues toggling, final/second dues dialogs, clearing all dues, and dues-paying views.
- Supports check-in scanner/manual entry integration.
- Supports giving member points.

### Club events

Route: `/admin/club/events`. Sources: `admin/club/events/*`.

Current behavior:

- Requires club event read/edit/check-in style permissions.
- Shows event table with search/sort/filter behavior.
- Supports creating, updating, and deleting events.
- Event fields include name, description, tag/type, start/end datetime, location, points, dues requirement, roles, and optional calendar/Discord metadata.
- Validates date formats and end-after-start behavior.
- Hackathon events cannot require dues.
- Supports viewing member attendees.
- Supports viewing feedback/rating summaries.
- Supports scanner/manual check-in and adding points.

### Club check-in

Route: `/admin/club/check-in`. Sources: `admin/club/check-in/*`, shared scanner.

Current behavior:

- Requires `CHECKIN_CLUB_EVENT` or related permission.
- Lets operators select upcoming/previous club events.
- Supports QR scanner and manual member selection/search by name/email.
- Checks the selected member into the selected event and applies event points.
- Shows validation/error states for missing member/event.

### Club analytics/data

Route: `/admin/club/data`. Sources: `admin/club/data/*`, `admin/charts/*`.

Current behavior:

- Requires club data read permissions.
- Provides member analytics and event analytics tabs.
- Member analytics include demographics such as gender, school, shirt size, year of study, dues over time, and engagement/attendance style metrics.
- Event analytics include attendance bars, mobile/alternate views, how-found/referral info, popularity rankings, rating rankings, event types, weekday popularity, and optional hackathon inclusion.
- Supports date/hackathon/semester-style filtering where present in UI.

## Hackathon admin workflows

All hackathon admin routes are permission-gated and redirect unauthorized users.

### Hackathon manage

Route: `/admin/hackathon/manage`. Source: `admin/hackathon/manage/hackathon-manager.tsx`.

Current behavior:

- Requires officer/admin access.
- Lists managed hackathons.
- Supports creating hackathons.
- Supports updating hackathons.
- Handles application open date, application deadline, confirmation deadline, start/end date, display/name/theme/configuration-style fields.
- Shows validation and success/error states.

### Hackathon hackers/applicants

Route: `/admin/hackathon/hackers`. Sources: `admin/hackathon/hackers/*`.

Current behavior:

- Requires hackathon data/admin permissions.
- Shows current/upcoming hackathon context.
- Provides status count cards and status-filtered views.
- Provides a paginated/searchable/filterable hacker table.
- Filters include school, major, race, gender, graduation year, status, and related options.
- Supports viewing hacker profile details, food restrictions, survey responses, repeated check-in info, and application data.
- Supports updating hacker profiles.
- Supports deleting hacker records with destructive confirmation.
- Supports status transitions such as accept, deny, waitlist, blacklist, and other status toggles.
- Supports email sends to hackers when the user has email permission.

### Hackathon events

Route: `/admin/hackathon/events`. Sources: `admin/hackathon/events/*`.

Current behavior:

- Similar to club event management but scoped to hackathon events.
- Supports creating, updating, deleting, listing, searching, and viewing event details.
- Supports viewing hacker attendees.
- Supports scanner/manual check-in and adding hacker/member points.
- Hackathon event behavior is tied to hackathon IDs and hacker attendance.

### Hackathon check-in

Route: `/admin/hackathon/check-in`. Sources: `admin/hackathon/check-in/*`.

Current behavior:

- Requires `CHECKIN_HACK_EVENT` or related permission.
- Lets operators choose a hackathon/check-in class and event.
- Supports QR scanner and manual hacker selection/search by name/email.
- Checks the selected hacker into the selected hackathon event and applies event points.

### Hackathon analytics/data

Route: `/admin/hackathon/data`. Sources: `admin/hackathon/data/*`, shared chart components.

Current behavior:

- Requires hackathon data read permissions.
- Lets admins select a hackathon.
- Shows application/confirmation analytics over time.
- Shows hacker/application demographics such as first-time hacker info, level/year of study, shirt size, school, major, race/ethnicity, gender, food/allergies where available.
- Includes event analytics tab reusing hackathon attendee/event data.

### Judge assignment / room assignment / control room

Routes:

- `/admin/hackathon/judge-assignment`
- `/admin/hackathon/roomAssignment`
- `/admin/hackathon/control-room`

Sources: `admin/hackathon/judge-assignment/*`, `admin/hackathon/roomAssignment/*`, `admin/hackathon/control-room/*`.

Current behavior:

- Judge assignment can generate/select room names and produce room-specific judge QR/magic-link flows.
- Room assignment shows challenges, rooms, and judges.
- Operators can add judges, delete judges, and update judge room/challenge assignment.
- Challenge table includes challenge ID/title/sponsor/room/judges style information.
- Control room shows active judge sessions by room and lets officers delete/clear sessions by room.
- Control room includes competition data import affordances.

## Judge portal workflows

Routes:

- `/judge`
- `/judge/dashboard`
- `/judge/results`
- `/judge/activate` — route handler that consumes judge magic tokens and creates/redirects to judge sessions.
- `/judge/session` — route handler for judge session state/cookie behavior.

Sources: `src/app/judge/*`, `src/app/_components/judge/*`.

Current behavior:

- Judge home shows current hackathon context and routes judges/admins to dashboard/results.
- Judge dashboard lists project submissions with Devpost/project/challenge/team context.
- Judges select/search judge identity where needed.
- Judges submit rubric scores/feedback through a rubric form.
- Prevents duplicate rubric submission for the same judge/submission and surfaces conflict/not-found/forbidden style errors.
- Results dashboard displays judged submissions with search/filter by judge/challenge, average ratings, project names, links, judges, challenges, and category/overall ratings.
- Admin/judge permissions determine access to results and portal pages.

## Roles and permissions admin workflows

Routes:

- `/admin/roles/configure`
- `/admin/roles/manage`

Sources: `admin/roles/*`.

Current behavior:

- Configure roles requires `CONFIGURE_ROLES`.
- Manage/assign roles requires `ASSIGN_ROLES`.
- Role configuration lists linked Blade roles with Discord role metadata, permission bitstrings, and Discord member counts.
- Admins can create role links, edit role links, and delete role links.
- Role edit UI looks up Discord role metadata before linking.
- Manage roles UI lists users, supports search/filter by role, reset checked users, and batch role grant/revoke.
- Assign/revoke flows should synchronize with Discord role membership through the API.

## Internal issues/tasks workflows

Routes:

- `/admin/issues/list`
- `/admin/issues/kanban`
- `/admin/issues/calendar`
- `/admin/issues/[id]`

Sources: `issue-list/*`, `issue-kanban/*`, `issue-calendar/*`, `issues/*`.

Current behavior:

- Requires issue read/edit/template permissions depending on action.
- List view shows issues in table/list form with search/filter controls, status updates, delete actions, due dates, and last-updated info.
- Kanban view groups issues by status and supports status updates/drag-like workflow through API updates.
- Calendar view shows dated issues by day, agenda/detail dialogs, status dot legend, copy-link, delete, and past-due indicators.
- Issue detail page shows issue name, status, due date, priority, parent issues, team, assignees, links, description, child/sub-issue relationships, and edit/navigation affordances.
- Issue create/edit dialog supports normal task issues and event-linked issues.
- Issue fields include name, description, status, priority, team, assignees, team visibility, parent, child issues, due date/time, event data, and external links.
- Template dialog supports creating/editing/deleting reusable issue templates.
- Fetcher/control bars support filters such as date range, status, team, tasks-only, event-linked-only, root-only, and view switching.

## Banquet raffle tool

Route: `/admin/banquet-raffle`. Source: `admin/banquet-raffle/*`.

Current behavior:

- Requires officer/admin access.
- Builds a raffle-eligible member pool from member/dues-style data.
- Provides a raffle draw UI with start/draw-again behavior.

Reforge note: this is an operations utility. Preserve only if still relevant or explicitly mark as legacy/seasonal.

## Shared scanner/check-in behavior

Sources: `shared/scanner.tsx`, club/hackathon check-in components.

Current behavior:

- Supports QR scanning and manual search/selection.
- Can operate for member or hacker check-in modes.
- Requires an event and selected/scanned user.
- Applies event-specific point values.
- Handles no-class/no-event/error states.

## Shared point behavior

Source: `shared/AddPoints.tsx`.

Current behavior:

- Lets authorized operators add points to a member or hacker.
- Uses current hackathon where hacker points require hackathon context.
- Supports selecting target and amount.

## Shared CSV import behavior

Source: `shared/csv-importer.tsx`.

Current behavior:

- Lets authorized operators import CSV content for the current hackathon.
- Validates that current hackathon context exists before import.
- Shows file-open/read/import errors.

## File, QR, resume, and pass behavior in Blade

Current behavior:

- User QR codes appear in navigation and dashboards and are used by scanner/check-in flows.
- Member/hacker dashboards can generate/download wallet/pass artifacts.
- Member and hacker application/settings can upload resumes.
- Member settings can upload profile pictures.
- Form file-upload questions use presigned upload and file-download URLs.

Reforge expectation:

- Preserve ownership/safety semantics: users should only mutate/view their own sensitive files unless an admin workflow explicitly grants access.
- QR/pass payloads must remain compatible with check-in scanners.


## API/protocol route behavior

Sources: `src/app/api/**/route.ts`, `src/app/judge/activate/route.ts`, `src/app/judge/session/route.ts`.

Current behavior:

- Auth route handlers delegate sign-in/session protocol behavior to `@forge/auth`.
- tRPC route exposes the `@forge/api` root router at `/api/trpc`, applies permissive CORS headers, creates API context from the current auth session and request headers, rejects oversized requests above roughly 4 MB, and logs tRPC errors with their procedure path.
- Membership webhook route verifies Stripe webhook signatures, handles checkout session completion/async success/failure/expiration and payment-intent success/failure/cancel states, records dues payments when payment state is successful, ignores duplicate dues inserts where possible, and returns status-specific responses.
- Judge activation/session route handlers support magic-link/room-based judge sessions used by the judge portal.

## Data and analytics surfaces

Blade currently contains several reporting surfaces that future agents should not overlook:

- Club member demographics: school, major, gender, shirt size, year of study, dues over time, engagement, attendance counts.
- Club event analytics: event attendance, feedback ratings, how-found/referral data, event type distribution, weekday popularity, popular/high-rated events.
- Hackathon application analytics: application/confirmation timelines, first-time hacker status, level/year of study, shirt size, school, major, race/ethnicity, gender, food/allergy info.
- Hacker status analytics: status count cards and status-filtered admin views.
- Judging results: project-level ratings, judge/challenge filters, averages/metrics.
- Form response analytics: per-question charts and per-user/all-response views.

## Admin/navigation expectations

- `/admin` is the central admin navigation hub.
- The user dropdown and session navbar expose admin/system links only when permissions allow.
- Admin surfaces should fail closed: no permission means redirect or access denied.
- Admin actions with irreversible/destructive behavior currently use typed confirmation dialogs in several places.
- Admin tables generally support loading/error/empty states and searchable/filterable views.

## Current-state source evidence

Route/page evidence:

- `src/app/**/page.tsx`
- `src/app/api/**/route.ts`

Major component evidence:

- `src/app/_components/dashboard/**`
- `src/app/_components/admin/club/**`
- `src/app/_components/admin/hackathon/**`
- `src/app/_components/admin/forms/**`
- `src/app/_components/forms/**`
- `src/app/_components/admin/roles/**`
- `src/app/_components/issues/**`
- `src/app/_components/issue-list/**`
- `src/app/_components/issue-kanban/**`
- `src/app/_components/issue-calendar/**`
- `src/app/_components/judge/**`
- `src/app/_components/settings/**`
- `src/app/_components/shared/**`
- `src/trpc/**`, `src/lib/**`, `src/consts/**`

## Reforge notes for future agents

- This doc is a product inventory, not a mandate to preserve legacy component boundaries.
- Preserve user journeys and permission semantics first.
- Keep Blade pages thin; push reusable workflows and side effects into platform/API packages.
- Treat dynamic forms, tRPC callbacks, roles/permissions, check-in, judging, dues, resumes, and issues as first-class product systems.
- Before deleting or simplifying a surface, verify whether it is seasonal/legacy or still used by Knight Hacks operations.
- Add tests/browser verification for high-risk flows: member application, hacker application, dues checkout state, dynamic forms with callbacks, check-in scanner/manual flow, role assignment, judging rubric submission, and issue CRUD/status transitions.
