# Legacy Blade Current State

This document describes the behavior and product features currently present in the legacy Blade app. It is intentionally written like a current-state product/spec inventory, not as an implementation guide. The code lives here only for archaeology while Reforge rebuilds the canonical `apps/blade` surface.

## Purpose

Legacy Blade is Knight Hacks' internal/member/hacker platform. It combines member onboarding, hacker applications, hackathon operations, club operations, dynamic forms, Discord-integrated permissions, judging, event check-in, dashboards, and admin tooling.

## User groups

- Public/unauthenticated visitors
- Logged-in Knight Hacks users authenticated through Discord/Blade auth
- Club members
- Hackathon applicants/hackers
- Judges using magic-link/session access
- Officers/admins/organizers with permission-gated access
- Sponsors or sponsor-facing visitors for the sponsor page

## Top-level app surfaces

### Home / auth entry

Route: `/`

The home page is the entry point for Blade authentication and initial access. It renders the auth showcase and hydrates tRPC for server/client access.

### Dashboard

Route: `/dashboard`

The dashboard is the logged-in user's central landing surface. It adapts around Discord membership state and can show member/hacker dashboard experiences, upcoming events, points, forms, payment/dues prompts, alumni/volunteer content, QR/pass/resume actions, and hackathon-specific dashboard data.

### Settings

Routes:

- `/settings`
- `/settings/hacker-profile`

Settings allow logged-in users to view/update their member profile, hacker profile, and related account/profile state. Settings also expose deletion actions for member/hacker profile data.

### Sponsor page

Route: `/sponsor`

Sponsor-facing Blade surface. Current behavior should be re-characterized before reuse because it may overlap with public site/sponsor workflows.

## Member workflows

### Member application

Route: `/member/application`

Allows a logged-in user to create a club member profile. The form collects member profile data and persists it through the member API.

### Member checkout and dues success

Routes:

- `/member/checkout`
- `/member/success`

Supports dues/payment flows. Users can create checkout/payment state, validate paid dues, and see a membership success experience.

### Member dashboard

Surface within `/dashboard`.

Current dashboard components include dues/payment prompts, points display, event showcase, event feedback, QR/pass download, resume actions, forms/responses, day-in-history content, alumni Discord/recap content, and volunteer/early-access prompts.

## Hacker and hackathon participant workflows

### Hacker application

Route: `/hacker/application/[hackathon-id]`

Allows a logged-in user to apply for a specific hackathon. It reads hackathon data and any existing hacker/application state, then presents the application form/background.

### Hacker profile settings

Route: `/settings/hacker-profile`

Allows a logged-in user to view/update their hacker profile for the current hackathon context.

### Hacker dashboard

Surface within `/dashboard`.

Shows hackathon-specific participant state such as application/confirmation state, QR code, resume upload/download actions, past hackathons, points/leaderboard/team points, upcoming events, and issue/dialog surfaces.

### Hacker confirmation and withdrawal

Current dashboard/API behavior supports confirmed hackers and withdrawal actions. These are user-accessible protected actions, not only admin actions.

## Forms system

### Public/respondent forms

Routes:

- `/forms/[formName]`
- `/forms/[formName]/[responseId]`

Allows users to access dynamic forms, submit responses, edit accessible responses, and see submitted/not-found/success states.

### Admin forms

Routes:

- `/admin/forms`
- `/admin/forms/[slug]`
- `/admin/forms/[slug]/responses`

Permission-gated admin form tooling supports creating/editing forms, managing form sections/questions/instructions, linking forms to events or other entities, viewing and exporting responses, charts/aggregations, per-user responses, file upload responses, QR codes, and closed/open form state.

## Club admin workflows

All club admin routes are permission-gated.

### Club check-in

Route: `/admin/club/check-in`

Supports member event check-in, including scanner/manual entry flows. Check-in records attendance and can connect to member point behavior.

### Club data/demographics

Route: `/admin/club/data`

Provides officer/admin analytics for member and event demographics, attendance, event popularity/rating, dues over time, engagement, gender, school, shirt size, year of study, and related charts.

### Club events

Route: `/admin/club/events`

Supports creating, updating, deleting, viewing, and managing club events. Admins can view attendance, feedback, and ratings.

### Club members

Route: `/admin/club/members`

Supports member table/search/filter workflows, profile views, member updates/deletion, dues toggling, final/second dues dialogs, scanner/check-in, clearing dues, and point management.

## Hackathon admin workflows

All hackathon admin routes are permission-gated.

### Hackathon check-in

Route: `/admin/hackathon/check-in`

Supports hacker/event check-in flows for hackathon operations, including scanner and manual entry behavior.

### Hackathon control room

Route: `/admin/hackathon/control-room`

Operational control-room surface for hackathon organizers. Current exact behavior should be characterized before rebuilding.

### Hackathon data/analytics

Route: `/admin/hackathon/data`

Shows hackathon/application analytics including applications over time, hacker charts, first-time information, level of study, shirt size, and related charts.

### Hackathon events

Route: `/admin/hackathon/events`

Supports hackathon event management: create/update/delete events and view attendance.

### Hacker management

Route: `/admin/hackathon/hackers`

Supports admin review and management of hackers/applications. Current operations include accept, deny, blacklist, delete, update status, view profile, view food restrictions, view status counters, filter/paginate hackers, and inspect application/profile data.

### Hackathon setup/manage

Route: `/admin/hackathon/manage`

Supports creating/updating hackathon records and managing current hackathon configuration. Current implementation includes hard-coded or semi-hard-coded assumptions that Reforge should replace with admin-configurable data where practical.

### Room assignment

Route: `/admin/hackathon/roomAssignment`

Supports room assignment workflows for hackathon/judging operations.

### Judge assignment

Route: `/admin/hackathon/judge-assignment`

Supports organizer assignment/management of judges for hackathon judging flows.

## Judging workflows

Routes:

- `/judge`
- `/judge/dashboard`
- `/judge/results`
- `/judge/activate`
- `/judge/session`

Legacy Blade supports judge-specific access separate from normal Better Auth sessions. Judges can activate magic-link/session tokens, access a judge dashboard, review project submissions, submit rubric/judged-submission data, and view results. Admin/organizer surfaces include judging metrics, room/session counts, judge creation/update/deletion, and session management.

## Issues / Jira-like Discord-integrated operations

Routes:

- `/admin/issues/list`
- `/admin/issues/kanban`
- `/admin/issues/calendar`
- `/admin/issues/[id]`

Permission-gated issue management supports issue creation, update, deletion, templates, assignment/team user lookup, list view, kanban view, calendar view, and detail view. This is part of the internal operations system and may overlap with Discord reminder/thread behavior in API/util layers.

## Roles, permissions, and Discord integration

Routes:

- `/admin/roles/manage`
- `/admin/roles/configure`

Legacy Blade manages Discord-linked role/permission behavior. Current surfaces include role links, role configuration, permission grants/revokes, batch permission management, Discord role lookup/counts, and permission checks.

Discord is first-class in current Blade behavior. Existing flows include Discord membership status checks, role sync/role IDs, alumni/member/hacker role behavior, guild profile behavior, announcements/thread workflows in supporting API/util code, and Discord-driven auth/identity assumptions.

## Guild profile / public team roster behavior

Legacy Blade supports guild/member profile behavior through dashboard/profile flows and API-backed public roster surfaces. This includes profile picture upload, guild member listing, public club team roster data, and guild resume retrieval.

## Banquet raffle

Route: `/admin/banquet-raffle`

Permission-gated special-purpose admin surface for banquet raffle drawing.

## QR, passes, resumes, and uploads

Legacy Blade exposes user and admin workflows around QR codes, Apple/PassKit-style passes, resume upload/retrieval, profile picture upload, file upload URLs, media deletion, and file URL retrieval.

## API routes owned by Blade app

### Auth routes

Routes:

- `/api/auth/[...all]`
- `/api/auth/signin`

Handle auth integration/sign-in behavior through the app route layer.

### Membership route

Route: `/api/membership`

Membership-specific route behavior exists and should be characterized before rebuilding.

### tRPC route

Route: `/api/trpc/[trpc]`

Exposes the tRPC router from `@forge/api` to Blade. The route includes request-size guarding, CORS headers, session lookup, context creation, and error logging.

### Judge activation/session routes

Routes:

- `/judge/activate`
- `/judge/session`

Support judge magic-link/session state in the route layer.

## Current behavior risks / Reforge notes

- Many admin and hackathon workflows rely on hard-coded or yearly operational assumptions.
- Blade mixes member, hacker, officer, judge, sponsor, Discord, form, event, and issue-management concerns into one app surface.
- Some current UI conventions are valuable contribution surfaces, but many server/client/data patterns should not be copied blindly.
- Current behavior should be mined as product truth, not treated as target architecture.
- Production data semantics should be preserved through API/validator/SRD decisions rather than by copying legacy code structure.
