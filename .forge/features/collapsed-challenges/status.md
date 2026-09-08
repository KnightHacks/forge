# Status

Phase: implementing follow-up to preserve groups on project drop and initialize defaults for every hackathon.

Confirmed behavior: editable judging groups are separate from Devpost prize challenges. General and MLH are starter groups, not fixed identities. Every-project membership is optional and non-unique. New MLH imports default to the organizer-selected group (initially MLH Challenges); re-import preserves overrides and never recreates deleted groups. Search hides children and every-project groups. Child tags remain visible during judging. Saving a schedule locks setup.

Database: 0053 introduced grouping and membership metadata. Forward migration 0054 distinguishes groups, records initial group setup, retains import matching across group renames, and removes the single-default restriction. Both migrations have been applied locally. The membership marker retains existing evaluation/appointment/draft foreign keys; see SRD for rationale.

User authorized KH8/KH9 local project and judging cleanup and designated KH8 for testing. KH8 has 188 imported projects. The temporary Collapsed challenges test hackathon was deleted as requested. No auth accounts, applications, shared buildings, or source CSV files were removed. No production cleanup is part of these migrations.

Completed:

- Group create, rename, settings, and delete APIs/UI with permission, audit, and setup locks.
- Imported-only project opt-ins, automatic group memberships, and starter group import policy.
- Hidden child/every-project filters with visible eligibility tags.
- Internal-browser KH8 checks: group create/rename/delete, first-time grouping, MLH grouping, and filter options.
- Two grouping integration cases, 12 parser tests, 52 Blade project tests, and three DB schema tests passed.

Review: API/access/consumer, DB/migration/validation, and React/boundary/test reviewers examined the change. Their findings were fixed and the follow-up reviews report no remaining concrete issues. Regression coverage now includes deterministic default scope, submission child tags, duplicate group/prize names, and full inventory deletion preserving group configuration.

Live KH8 verification: created, renamed, and deleted a temporary group; confirmed first-time and individual MLH children are absent from filters while their tags remain visible. Opened local judging and inspected the AeroMouse scoring dialog showing Best First Time Hack under General. No score was submitted. The modal created an empty autosaved draft; that exact unchanged test draft was removed, and group setup is editable again. Judging remains open. Browser screenshots were inspected.

Final validation: root format, lint, typecheck, and React analysis; 53 API regression tests, 52 Blade project tests, and three DB schema tests. Migration generation reports no pending schema changes. The final MLH-default review caught first-import bootstrap overriding an organizer choice; the fix and regression test preserve that choice.

Work is split into database, API/configuration, and Blade UI commits on fix/first-time-hacker-room-tagging. Remaining: publish the issue and PR once GitHub authentication is available. GitHub SSH access works, but the internal browser is signed out; the user has been asked to sign in for issue/PR publication. GitHub CLI is not installed.

PR/issue: pending GitHub authentication.

Follow-up: dropAll retains group rows and initialization history. Hackathon creation initializes General/MLH before import; data-only migration 0055 backfills never-initialized hackathons without recreating deleted groups. Validation pending.
