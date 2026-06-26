# Legacy API Current State

This document describes the behavior and platform features currently present in the legacy `@forge/api` package. It is intentionally written like a current-state product/spec inventory, not as an implementation guide. The code lives here only for archaeology while Reforge rebuilds the canonical `packages/api` platform layer.

## Purpose

Legacy `@forge/api` is the main tRPC platform layer used by Blade and some other Forge clients. It owns most business workflows for auth/session reads, members, hackers, hackathons, events, forms, issues, judging, roles/permissions, Discord-related operations, payments, resumes, QR/pass generation, email, file uploads, and operational utilities.

## API shape

The legacy API exposes a root tRPC router with these top-level domains:

- `auth`
- `challenge`
- `companies`
- `csvImporter`
- `duesPayment`
- `email`
- `event`
- `eventFeedback`
- `forms`
- `guild`
- `hackathon`
- `hackerMutation`
- `hackerPagination`
- `hackerQuery`
- `issues`
- `judge`
- `member`
- `misc`
- `passkit`
- `qr`
- `resume`
- `roles`
- `user`

## Auth/session behavior

Router: `auth`

Current features:

- Read current session state.
- Liveness/health-style auth check.
- Return a secret/admin-gated message.
- Check admin status.
- Check Discord member status.
- Check judge status.
- Sign out.

Auth context is connected to Better Auth/Discord identity and is used throughout Blade for logged-in, admin, organizer, and judge flows.

## Roles, permissions, and Discord role behavior

Router: `roles`

Current features:

- Create, update, delete, read, and list role links.
- Look up Discord roles and Discord role counts.
- Read current user's permissions.
- Check whether a user has a permission.
- Grant and revoke permissions.
- Batch-manage permissions.

This is one of the strongest current system concepts. Permission/capability management is Discord-aware and Blade-dashboard manageable. Reforge should preserve the system model while cleaning implementation details.

## Guild/profile/public roster behavior

Router: `guild`

Current features:

- Upload guild profile pictures.
- Read guild member data.
- Read public club team roster data.
- Retrieve guild resume data.

This powers guild/profile/team roster experiences and dynamic public team display behavior.

## Hackathon configuration and lookup

Router: `hackathon`

Current features:

- List hackathons.
- List hackathons managed by the current user/permissions.
- Get the current hackathon.
- Read a previous hacker/application record.
- Read hackathon details by slug or ID.
- List past hackathons for a user.
- Count confirmed hackers.
- Create hackathon records.
- Update hackathon records.

Current hackathon setup still contains operational/yearly assumptions that Reforge should move toward admin-configurable data.

## Hacker/application behavior

Routers:

- `hackerQuery`
- `hackerMutation`
- `hackerPagination`

Current query features:

- Read a hacker/application record.
- List hackers.
- List all hackers.
- Read points by class/team.
- Read top hackers/leaderboard data.
- Count statuses by hackathon.

Current mutation features:

- Create hacker/application data.
- Update hacker/application data.
- Delete hacker/application data.
- Confirm hacker attendance/participation.
- Withdraw hacker.
- Check hackers into events.
- Award hacker points.
- Update hacker status.

Current pagination/filter features:

- Read paginated hacker pages.
- Count filtered hackers.
- Read filter options.

These APIs back hacker application, admin review, check-in, status management, dashboards, analytics, and leaderboards.

## Member behavior

Router: `member`

Current features:

- Create, update, delete, and read member profiles.
- List/filter/search members.
- Count members.
- Read distinct schools and majors.
- Read member filter options.
- Award member points.
- Read dues-paying members.
- Read member attendance counts.
- Create/delete dues-paying member records.
- Clear dues.
- Check members into events.
- Read member-related events.

These APIs back member onboarding, club admin, dues, attendance, points, dashboards, and profile management.

## Dues/payment behavior

Router: `duesPayment`

Current features:

- Create checkout sessions.
- Create payment intents.
- Validate paid dues.
- Mark/order dues success.
- Read dues payment dates.

Payment behavior connects member dues state to Stripe/payment flows and member dashboard/admin dues management.

## Event and feedback behavior

Routers:

- `event`
- `eventFeedback`

Current event features:

- List events.
- List public club events.
- Read member attendees.
- Read hacker attendees.
- Create, update, and delete events.
- Ensure a feedback/form connection exists.
- Read feedback.

Current feedback features:

- Log hackathon feedback.

Events are used across club, hackathon, check-in, attendance, feedback, Discord/calendar-like operations, and dashboard surfaces.

## Dynamic forms behavior

Router: `forms`

Current features:

- Create, update, delete, and list forms.
- Read a form by slug/name.
- Check response access.
- Create, edit, delete, and read responses.
- Read a user's response.
- Add/list/delete form connections.
- Generate upload URLs.
- Delete media.
- Get file URLs.
- Read sections and section counts.
- Create, update, rename, delete, and reorder form sections.
- Read and update section role access.
- Check form edit access.
- Toggle form closed/open.

Forms are a major dynamic content system and support both user responses and admin analysis/export behavior.

## Issues / internal operations behavior

Router: `issues`

Current features:

- Look up users on a team.
- Create, read, list, update, and delete issues.
- Create, update, delete, and list issue templates.

This backs Blade's internal issue/list/kanban/calendar workflows and likely integrates conceptually with Discord/team operations.

## Judging behavior

Router: `judge`

Current features:

- Read project submissions.
- Check whether a rubric has been given.
- List judges.
- Generate judge tokens.
- Activate judge tokens.
- Create judged submissions.
- Create, update, and delete judges.
- Read judged submissions and submissions by ID.
- Read judging metrics.
- Read rooms with judge session counts.
- Delete judge sessions by room.
- Read unique room names.

Judging includes a separate judge-session/magic-link model and supports organizer/admin judging operations, room/session management, rubric submission, and results views.

## Email behavior

Router: `email`

Current features:

- Send hackathon email.
- Send general email.

Email behavior should be treated as an external side-effect boundary in Reforge SRDs.

## CSV import behavior

Router: `csvImporter`

Current features:

- Import CSV data.

This likely supports operational imports such as judging/results/hacker/member data and should be characterized before rebuilding.

## Resume, QR, and PassKit behavior

Routers:

- `resume`
- `qr`
- `passkit`

Current features:

- Upload resumes.
- Retrieve resumes.
- Generate/read QR codes.
- Generate passes.

These behaviors support member/hacker dashboards, check-in, recruiter/sponsor-style data access, and event/hackathon operations.

## Companies/challenges/misc utilities

Routers:

- `companies`
- `challenge`
- `misc`

Current features:

- Read company lists.
- Read challenge data.
- Add role IDs / recruiting-update style operational utilities.

These areas may include hard-coded operational assumptions and should be reviewed before porting.

## API context and procedure types

Legacy API uses procedure tiers such as public, protected, permission-gated, and judge-gated procedures. Reforge should preserve the access-policy concept while making every SRD explicitly document access tiers and permission requirements.

## Current behavior risks / Reforge notes

- Business logic and data queries live in the API package, which matches the future direction, but current routers are broad and uneven.
- Some routers encode operational/yearly/hackathon-specific assumptions that should become configurable through Blade/admin-managed DB tables.
- Discord integration is first-class and must be intentionally preserved: roles, permissions, guild profiles, membership state, announcements/threads, and operational side effects.
- Email, payments, file upload/storage, Discord, and CSV imports are external side-effect boundaries and require explicit SRD/test treatment before rebuilding.
- `@forge/db` should remain schema/client/migration infrastructure; legacy API behavior should not be pushed down into DB.
- This package is the primary source for spec-mining current platform behavior, not the target structure to copy wholesale.
