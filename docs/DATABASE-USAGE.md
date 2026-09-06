# Database Usage

This is a practical map of Forge's Drizzle tables: what each table is for, how app code currently uses it, and notable field semantics agents should preserve before editing schema or queries.

Schemas live in:

- `packages/db/src/schemas/auth.ts` for auth/roles/session tables.
- `packages/db/src/schemas/knight-hacks.ts` for Knight Hacks product tables.

## Auth, roles, and sessions

| Table export    | SQL table           | Usage                                                                                                                                                                            |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`          | `auth_user`         | Better Auth creates Discord OAuth users here, and app code uses the row for Discord guild joins, role/permission management, issue assignees, user lists, and bot point lookups. |
| `Account`       | `auth_account`      | Better Auth stores provider credentials here, and Discord utilities read the latest Discord account token/scope when joining users to the Knight Hacks server.                   |
| `Session`       | `auth_session`      | Better Auth owns normal Blade login sessions here, with explicit deletion when member/hacker delete flows need to log the user out.                                              |
| `Verifications` | `auth_verification` | Better Auth's adapter uses this verification table; no direct app reads/writes were found outside auth configuration and migrations.                                             |
| `Roles`         | `auth_roles`        | Stores Discord-linked Blade roles, permission bitstrings, issue reminder metadata, and team display colors for permissions, role sync, forms, issues, and reminders.             |
| `Permissions`   | `auth_permissions`  | User-to-role join table used for Blade authorization, Discord role sync, manual/batch role grants, issue assignee validation, and permission checks.                             |

Notes:

- `User.discordUserId` is the Discord identity field, but it is not schema-unique.
- `User.name` is treated as the Discord username in bot code.
- `Account` has a compound primary key of `(provider, providerAccountId)`; `id` is not the primary key.
- `Roles.permissions` is a raw varchar bitstring interpreted against `PERMISSIONS.PERMISSIONS`.
- `Permissions` has no schema-level unique constraint on `(userId, roleId)`; code tries to avoid duplicates.

## Club membership, dues, and events

| Table export        | SQL table                         | Usage                                                                                                                                                                                     |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Member`            | `knight_hacks_member`             | Stores Blade club member profiles used for signup/profile updates, admin search/filtering, guild profiles, resumes, dues, event check-in, attendance, alumni roles, and bot leaderboards. |
| `DuesConfiguration` | `knight_hacks_dues_configuration` | Singleton configuration for whether members may start Stripe dues payments. This is operational state, not payment history.                                                               |
| `DuesPayment`       | `knight_hacks_dues_payment`       | Records yearly dues payments from Stripe/admin flows and gates dues-only event check-in and dues-paying member queries.                                                                   |
| `OtherCompanies`    | `knight_hacks_companies`          | Stores custom company names entered during member create/update when they are not in the constants list.                                                                                  |
| `Event`             | `knight_hacks_event`              | Stores club and hackathon events synchronized with Discord/Google Calendar and used for listings, reminders, forms, feedback, issues, check-in, and attendance.                           |
| `EventAttendee`     | `knight_hacks_event_attendee`     | Records club member check-ins to events for attendee lists, attendance counts, member event history, and point awards.                                                                    |
| `EventFeedback`     | `knight_hacks_event_feedback`     | Legacy/unused feedback table; current feedback flows appear to use dynamic `FormsSchemas` and `FormResponse` records instead.                                                             |

Notes:

- `Member.discordUser` stores `ctx.session.user.name`, not the numeric Discord user ID.
- `Member.phoneNumber` is nullable but unique.
- `DuesConfiguration` accepts only the `global` row. A missing row is treated
  as payments paused, and the migration seeds that safe default.
- `DuesPayment` is unique per `(memberId, year)`.
- `Event.roles` is a string array used by reminders and role-scoped event filtering.
- `Event.start_datetime`/`end_datetime` are sometimes adjusted in create/update flows; preserve existing timezone/date behavior unless the task is explicitly to change it.
- `EventAttendee` has no schema-level unique constraint on `(memberId, eventId)`; duplicate prevention lives in check-in code.

## Hackathons, hackers, and judging

| Table export                    | SQL table                                      | Usage                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Hackathon`                     | `knight_hacks_hackathon`                       | Central hackathon config used for application routing, current/upcoming/past selection, admin editing, event association, email/background assets, and judging context. |
| `Hacker`                        | `knight_hacks_hacker`                          | Stores reusable person-level hacker profile/application data used by dashboards, admin hacker lists, filtering, check-in lookup, updates, and emails.                   |
| `HackerAttendee`                | `knight_hacks_hacker_attendee`                 | Per-hackathon join table for a hacker's application status, confirmation time, points, and assigned class.                                                              |
| `HackerEventAttendee`           | `knight_hacks_hacker_event_attendee`           | Records hackathon event check-ins and powers duplicate check-in prevention, attendance counts, attendee lists, and point awards.                                        |
| `Sponsor`                       | `knight_hacks_sponsor`                         | Reserved for sponsor metadata; current sponsor displays elsewhere are static or unrelated.                                                                              |
| `HackathonSponsor`              | `knight_hacks_hackathon_sponsor`               | Reserved hackathon-to-sponsor tier join table.                                                                                                                          |
| `Project`                       | `knight_hacks_project`                         | Stores a hackathon's imported Devpost projects, source metadata, and soft-deletion state for officer management and the judge directory.                                |
| `ProjectMember`                 | `knight_hacks_project_member`                  | Stores ordered project team contacts with separately validated names and emails.                                                                                        |
| `ProjectChallenge`              | `knight_hacks_project_challenge`               | Stores hackathon-scoped challenge labels derived from Devpost opt-in prize fields, including the required `General` challenge.                                          |
| `ProjectToChallenge`            | `knight_hacks_project_to_challenge`            | Associates projects with their challenges for directory display and filtering.                                                                                          |
| `HackathonJudgingConfiguration` | `knight_hacks_hackathon_judging_configuration` | Stores the durable project-inventory lock created by the first room QR.                                                                                                 |
| `JudgingRoom`                   | `knight_hacks_judging_room`                    | Stores physical judging rooms as durable hackathon entities, each assigned to one imported challenge.                                                                   |
| `Judge`                         | `knight_hacks_judge`                           | Stores hackathon-scoped member and guest judge identities for room presence and later judging records.                                                                  |
| `JudgingRoomAccessLink`         | `knight_hacks_judging_room_access_link`        | Stores revocable room QR records. The signed URL credential is derived and never stored.                                                                                |
| `GuestJudgeSession`             | `knight_hacks_guest_judge_session`             | Stores hashed, expiring guest browser credentials and their optional completed judge identity.                                                                          |
| `JudgingRoomPresence`           | `knight_hacks_judging_room_presence`           | Stores current and historical judge-to-room presence with joined, last-seen, and left timestamps.                                                                       |

Notes:

- `Hackathon.name` is the unique slug/lookup key used in routes and API inputs; `Hackathon.displayName` is the human-facing label for dashboards, admin UI, emails, selectors, and logs.
- Do not use `Hackathon.name` and `Hackathon.displayName` interchangeably: use `name` for stable identifiers and `displayName` for user-facing copy.
- Hackathon date semantics vary by query: "current" can mean applications open, not ended, or future-start depending on the router.
- `Hacker.dateCreated`/`timeCreated` describe profile creation; per-hackathon application timing lives on `HackerAttendee.timeApplied`/`timeConfirmed`.
- `HackerAttendee.status` is the application/attendance state; keep values aligned with `FORMS.HACKATHON_APPLICATION_STATES`.
- `HackerAttendee.class` is a nullable game/team class assigned during check-in, not original application profile data.
- `HackerEventAttendee.hackathonId` duplicates context derivable through `eventId` and `hackerAttId`; no DB-level consistency check was found.
- `Project.submissionUrl` is unique within a hackathon and is the stable Devpost identity used by the import inventory.
- Before judging locks the inventory, a Devpost import replaces projects while preserving exact matching challenge records.
- After the first room QR is generated, ordinary imports add projects with unseen normalized Devpost URLs and leave existing records untouched. A separately confirmed replacement revokes active guest access and cannot remove a challenge assigned to an active room.
- Every imported project is associated with the hackathon's `General` challenge. Devpost opt-in prize columns produce the remaining challenge labels.
- `HackathonJudgingConfiguration.judgingCommsChannelId` is the optional root
  Discord text channel for room communications. Null keeps Discord delivery
  off without changing judging behavior.
- `JudgingRoom.discordThreadId` is the room's current thread under that root
  channel. Changing or clearing the channel removes active Blade references but
  leaves old Discord history intact.
- `Project.deletedAt` provides officer-restorable soft deletion between imports; an authoritative re-import removes the prior inventory, including deleted rows.
- A guest session stores only the SHA-256 hash of its random browser credential. Shared development backups drop judging rooms, judge identities, links, guest sessions, and presence rows.

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

## Discord configuration

| Table export    | SQL table                     | Usage                                                                                                                                                                    |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DiscordConfig` | `knight_hacks_discord_config` | Officer-managed Discord guild, channel, and role IDs. Replaces the snowflakes that used to be hard-coded in `@forge/consts`; read through `@forge/utils/discord-config`. |

Notes:

- One row is one _setting_, not one value. `production_id` and `development_id` are the two environment values of the same setting, replacing the `PROD_`/`DEV_` constant pairs that fed an `IS_PROD` ternary.
- `development_id` is nullable and means "reuse `production_id`", which is how `alumni_role` and the six `*_director_role` rows behave.
- `key` is a code contract enumerated by `DISCORD.CONFIG_KEYS`, not something an officer invents; renaming one needs a data migration. `kind`, `label`, and `description` exist so a future admin UI can present a row without the editor guessing.
- Check constraints enforce that both ID columns are 17-20 digit snowflakes, so a pasted role mention or a trailing space fails at write time rather than as a Discord 404 inside a cron job.
- The read path caches the whole table for 60 seconds per process. There is no admin UI yet, so writes happen in SQL; a writer inside the app must call `invalidateDiscordConfigCache()`, and other processes converge within the TTL.
- `packages/db/scripts/seed_devdb.ts` reads the raw `guild` row rather than the resolved value, because it needs both environments at once.

## Club team roster

| Table export   | SQL table                     | Usage                                                                                                                                                       |
| -------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClubTeam`     | `knight_hacks_club_team`      | The buckets the public Club team page renders, with their slug, tab label, section heading, and left-to-right order. Replaces `TEAM.CLUB_TEAM_DEFINITIONS`. |
| `ClubTeamRole` | `knight_hacks_club_team_role` | Classifies one `auth_roles` row as executive, director, or team, with its rank and optional team. Replaces the role-name constants in `@forge/consts/team`. |

Notes:

- Classification is keyed by `auth_roles.id`, not by role name. That is the point of the tables: `inArray(Roles.name, CLUB_ROSTER_ROLE_NAMES)` meant renaming a Discord role emptied that team on the public site with no error and no failing test.
- `ClubTeam.kind` is how the roster finds the executive and director buckets without hard-coding the slugs `executive` and `directors`. A partial unique index allows at most one team of each non-`team` kind.
- `ClubTeamRole.kind` decides the role's primary bucket. An `executive` or `director` role that also sets `teamId` **leads** that team and appears in both buckets — this is "Hack Lead", listed under Executive Officers and at the top of Hackathon. There is no `is_lead` column because it would be derivable from those two and could disagree with them.
- `ClubTeamRole.rank` orders roles inside their primary bucket. Plain team members share a rank; their lead is placed ahead of them by the bucketing rule rather than by this column.
- `rosterLabel` and `calloutLabel` are `NULL` for almost every row. `NULL` means "use the role name", except for a plain team member, where the roster falls back to the team's label and the Guild badge to `"<team label> Team"`. The three exceptions are data: "Directors" displays as the singular "Director", "Officers" badges as "Officer", and the hackathon team role badges as "Organizer".
- `roleId` cascades on delete, so unlinking a role removes its classification. `teamId` restricts, so a team with roles cannot be deleted out from under them.
- Read these through `@forge/api`'s `utils/guild/club-team-config`, which applies the label fallbacks. There is no cache: the tables are ~27 narrow rows and the reads are two small queries.
- Classification rows come from two places: migration `0026`'s one-time backfill, and `pnpm db:club-roles`. A fresh database migrates before any Discord role is linked, so the backfill classifies nothing and the migration is then recorded as applied — an empty Club roster means the roles were linked afterwards and nothing has classified them yet. Run `pnpm db:club-roles` (`packages/db/scripts/classify-club-roles.ts`); it is insert-only, safe to re-run, and reports the configured roles it could not resolve. Role names are a bootstrap input there, never the source of truth: a classified role that is later renamed keeps its row.
- There is no admin UI yet, so writes happen in SQL — the same state the Discord config table is in.
- `auth_roles.event_feedback_excluded` is unrelated to these tables and remains the durable source for feedback eligibility. The role-name lists that used to seed it are gone; migration `0013` already wrote the column.

## Undocumented columns

If a task needs a table or column not explained here, inspect existing usage first. If the intended semantics are still not clear from code, ask a clarifying question before setting a new precedent.
