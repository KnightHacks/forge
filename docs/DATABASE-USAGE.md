# Database Usage

This is a practical map of Forge's Drizzle tables: what each table is for, how app code currently uses it, and notable field semantics agents should preserve before editing schema or queries.

Schemas live in:

- `packages/db/src/schemas/auth.ts` for auth/roles/session tables.
- `packages/db/src/schemas/knight-hacks.ts` for Knight Hacks product tables.

## Auth, roles, and sessions

| Table export    | SQL table            | Usage                                                                                                                                                                            |
| --------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`          | `auth_user`          | Better Auth creates Discord OAuth users here, and app code uses the row for Discord guild joins, role/permission management, issue assignees, user lists, and bot point lookups. |
| `Account`       | `auth_account`       | Better Auth stores provider credentials here, and Discord utilities read the latest Discord account token/scope when joining users to the Knight Hacks server.                   |
| `Session`       | `auth_session`       | Better Auth owns normal Blade login sessions here, with explicit deletion when member/hacker delete flows need to log the user out.                                              |
| `JudgeSession`  | `auth_judge_session` | Hackathon judge magic links create room-scoped judge sessions that are validated from a judge cookie and counted/deleted by room in the judge router.                            |
| `Verifications` | `auth_verification`  | Better Auth's adapter uses this verification table; no direct app reads/writes were found outside auth configuration and migrations.                                             |
| `Roles`         | `auth_roles`         | Stores Discord-linked Blade roles, permission bitstrings, issue reminder metadata, and team display colors for permissions, role sync, forms, issues, and reminders.             |
| `Permissions`   | `auth_permissions`   | User-to-role join table used for Blade authorization, Discord role sync, manual/batch role grants, issue assignee validation, and permission checks.                             |

Notes:

- `User.discordUserId` is the Discord identity field, but it is not schema-unique.
- `User.name` is treated as the Discord username in bot code.
- `Account` has a compound primary key of `(provider, providerAccountId)`; `id` is not the primary key.
- `Roles.permissions` is a raw varchar bitstring interpreted against `PERMISSIONS.PERMISSIONS`.
- `Permissions` has no schema-level unique constraint on `(userId, roleId)`; code tries to avoid duplicates.
- `JudgeSession.sessionToken` is separate from Better Auth sessions even though the naming overlaps.

## Club membership, dues, and events

| Table export     | SQL table                     | Usage                                                                                                                                                                                     |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Member`         | `knight_hacks_member`         | Stores Blade club member profiles used for signup/profile updates, admin search/filtering, guild profiles, resumes, dues, event check-in, attendance, alumni roles, and bot leaderboards. |
| `DuesPayment`    | `knight_hacks_dues_payment`   | Records yearly dues payments from Stripe/admin flows and gates dues-only event check-in and dues-paying member queries.                                                                   |
| `OtherCompanies` | `knight_hacks_companies`      | Stores custom company names entered during member create/update when they are not in the constants list.                                                                                  |
| `Event`          | `knight_hacks_event`          | Stores club and hackathon events synchronized with Discord/Google Calendar and used for listings, reminders, forms, feedback, issues, check-in, and attendance.                           |
| `EventAttendee`  | `knight_hacks_event_attendee` | Records club member check-ins to events for attendee lists, attendance counts, member event history, and point awards.                                                                    |
| `EventFeedback`  | `knight_hacks_event_feedback` | Legacy/unused feedback table; current feedback flows appear to use dynamic `FormsSchemas` and `FormResponse` records instead.                                                             |

Notes:

- `Member.discordUser` stores `ctx.session.user.name`, not the numeric Discord user ID.
- `Member.phoneNumber` is nullable but unique.
- `DuesPayment` is unique per `(memberId, year)`.
- `Event.roles` is a string array used by reminders and role-scoped event filtering.
- `Event.start_datetime`/`end_datetime` are sometimes adjusted in create/update flows; preserve existing timezone/date behavior unless the task is explicitly to change it.
- `EventAttendee` has no schema-level unique constraint on `(memberId, eventId)`; duplicate prevention lives in check-in code.

## Hackathons, hackers, and judging

| Table export          | SQL table                            | Usage                                                                                                                                                                   |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hackathon`           | `knight_hacks_hackathon`             | Central hackathon config used for application routing, current/upcoming/past selection, admin editing, event association, email/background assets, and judging context. |
| `Hacker`              | `knight_hacks_hacker`                | Stores reusable person-level hacker profile/application data used by dashboards, admin hacker lists, filtering, check-in lookup, updates, and emails.                   |
| `HackerAttendee`      | `knight_hacks_hacker_attendee`       | Per-hackathon join table for a hacker's application status, confirmation time, points, and assigned class.                                                              |
| `HackerEventAttendee` | `knight_hacks_hacker_event_attendee` | Records hackathon event check-ins and powers duplicate check-in prevention, attendance counts, attendee lists, and point awards.                                        |
| `Sponsor`             | `knight_hacks_sponsor`               | Reserved for sponsor metadata; current sponsor displays elsewhere are static or unrelated.                                                                              |
| `HackathonSponsor`    | `knight_hacks_hackathon_sponsor`     | Reserved hackathon-to-sponsor tier join table.                                                                                                                          |
| `Challenges`          | `knight_hacks_challenges`            | Stores Devpost opt-in prize challenges plus general challenges, then feeds room assignment, judge assignment, judging filters, submissions, and results.                |
| `Teams`               | `knight_hacks_teams`                 | Stores Devpost CSV project/team metadata used for judging project names, Devpost links, descriptions, universities, emails, and results.                                |
| `Submissions`         | `knight_hacks_submissions`           | Join table for a team's submission to a challenge within a hackathon, used by judge project lists and result aggregation.                                               |
| `Judges`              | `knight_hacks_judges`                | Stores judge name, room, and challenge assignment for judge session flows, project filtering, QR/session management, and rubric attribution.                            |
| `JudgedSubmission`    | `knight_hacks_judged_submission`     | Stores one judge's rubric ratings and feedback for a submission, used for duplicate prevention, metrics, result tables, and detailed judging views.                     |

Notes:

- `Hackathon.name` is the unique slug/lookup key used in routes and API inputs; `Hackathon.displayName` is the human-facing label for dashboards, admin UI, emails, selectors, and logs.
- Do not use `Hackathon.name` and `Hackathon.displayName` interchangeably: use `name` for stable identifiers and `displayName` for user-facing copy.
- Hackathon date semantics vary by query: "current" can mean applications open, not ended, or future-start depending on the router.
- `Hacker.dateCreated`/`timeCreated` describe profile creation; per-hackathon application timing lives on `HackerAttendee.timeApplied`/`timeConfirmed`.
- `HackerAttendee.status` is the application/attendance state; keep values aligned with `FORMS.HACKATHON_APPLICATION_STATES`.
- `HackerAttendee.class` is a nullable game/team class assigned during check-in, not original application profile data.
- `HackerEventAttendee.hackathonId` duplicates context derivable through `eventId` and `hackerAttId`; no DB-level consistency check was found.
- `Challenges.sponsor` is plain text and is not linked to `Sponsor`.
- `Teams.matchKey` is globally unique and derived from Devpost submitter name, created timestamp, and project title, not scoped by hackathon.
- `Teams.submissionUrl` and `Teams.devpostUrl` are both Devpost CSV URL fields in current import flows.
- `Submissions.hackathonId` duplicates hackathon context from `teamId` and `challengeId`; app code filters by it, but schema consistency is not enforced.
- `Judges` has no direct `hackathonId`; hackathon scope is inferred through `challengeId`.
- `JudgedSubmission` has no schema-level unique constraint on `(submissionId, judgeId)` and no rating range constraints; code handles duplicate prevention and validation.

## Dynamic forms

| Table export         | SQL table                           | Usage                                                                                                                                                             |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormSections`       | `knight_hacks_form_sections`        | Stores named/orderable form sections used to organize forms and drive section-level access/editing in the form editor.                                            |
| `FormSectionRoles`   | `knight_hacks_form_section_roles`   | Section-to-role join table controlling which roles can access/edit a form section; an empty role list means broadly accessible.                                   |
| `FormsSchemas`       | `knight_hacks_form_schemas`         | Stores dynamic form definitions, JSON form data, validators, slugs, section metadata, closed/edit/resubmission flags, and dues-only behavior.                     |
| `FormResponseRoles`  | `knight_hacks_form_response_roles`  | Form-to-role join table controlling who may submit/respond to a form, despite the name sounding like response-reading permissions.                                |
| `FormResponse`       | `knight_hacks_form_response`        | Stores each user's JSON form submission and timestamps for create/edit/delete, admin response views, dashboards, event feedback, and duplicate-submission checks. |
| `TrpcFormConnection` | `knight_hacks_trpc_form_connection` | Stores dynamic callback mappings from a form to a tRPC procedure, with string procedure names and JSON field mappings executed after submission.                  |

Notes:

- `FormsSchemas` has both `section` string and nullable `sectionId`; code still filters/counts by string while access checks prefer `sectionId` with fallback lookup by name.
- `FormsSchemas.slugName` is the unique route/API identifier for forms.
- `FormResponse.form` does not cascade at the schema level, so delete flows manually remove responses before forms.
- `TrpcFormConnection.connections` is untyped `jsonb`, and form deletion does not appear to delete related connection rows.

## Issues and templates

| Table export              | SQL table                                 | Usage                                                                                                                               |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Issue`                   | `knight_hacks_issue`                      | Main task/issue table used for CRUD, hierarchy, filtering, calendar/reminders, visibility enforcement, and assignee/team workflows. |
| `IssuesToTeamsVisibility` | `knight_hacks_issues_to_teams_visibility` | Issue-to-role/team visibility join table used to let additional teams see/manage issues beyond the owning `Issue.team`.             |
| `IssuesToUsersAssignment` | `knight_hacks_issues_to_users_assignment` | Issue-to-user assignment join table used for assignee filters, UI relations, cron reminders, and team membership validation.        |
| `Template`                | `knight_hacks_template`                   | Stores issue templates used by the issue-template API/UI and expanded by Blade's issue creation dialog into parent/child issues.    |

Notes:

- `Issue.team` references `Roles.id`; in issue code, "team" usually means a role/team row, not a hackathon team project.
- `Issue.parent` is a nullable self-reference with `onDelete: set null`, but delete code may still manually delete subtrees.
- `IssuesToTeamsVisibility` also stores the issue's own team via `ensureTeamVisible`, duplicating visibility already implied by `Issue.team`.
- `IssuesToUsersAssignment` assignments are validated in code to ensure users belong to the issue team.
- `Template.body` is generic `jsonb` in the DB, but the API validates it as an array of nested issue template nodes.

## Undocumented columns

If a task needs a table or column not explained here, inspect existing usage first. If the intended semantics are still not clear from code, ask a clarifying question before setting a new precedent.
