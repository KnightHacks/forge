# Status

Phase: verified; ready for PR review.

PR: [#550](https://github.com/KnightHacks/forge/pull/550). Issue: [#549](https://github.com/KnightHacks/forge/issues/549).
Branch: `fix/first-time-hacker-room-tagging`.

Completed behavior:

- Editable groups with independent every-project membership, scheduling, MLH import defaults, and tag colors.
- Imported challenges retain organizer grouping choices across re-imports. Child tags remain visible while child/every-project filters stay hidden.
- Dropping projects preserves groups and initialization history. New and previously uninitialized hackathons receive starter groups; deliberate deletions remain respected.
- Existing permission, audit, saved-schedule, evaluation, and membership guards remain in place.

PR cleanup: four unpublished migrations and their four full snapshots accounted for most of the 57,669 added lines. Consolidated 0053–0056 into `0053_challenge_groups.sql` and one final snapshot. Preserved the SQL backfill order and all migrations already on main. Updated lineage and initialization regression tests. No application behavior changed during cleanup.

Local data: the original implementation used KH8 for authorized import/judging tests. This cleanup uses disposable databases and synthetic screenshot fixtures. No participant data appears in the screenshots; no scores were submitted. Shared and production databases have not been migrated by this work. See the SRD for legacy MLH import and local migration-history caveats.

Validation for cleanup:

- DB: 30 files, 157 tests passed, including migration lineage and fresh-database tests.
- API: 5 focused files, 26 tests passed, including grouping, initialization, scheduling/access, import, and drop behavior.
- `pnpm db:generate`: no schema changes.
- Browser: inspected group controls, inherited first-time tags, MLH red tags, and hidden child/every-project filter choices. Screenshots are in `screenshots/`.
- Blade: 13 project test files and 52 tests passed.
- Upgrade comparison: original and consolidated migrations produce identical columns, constraints, and group defaults/memberships for empty, General-only, and legacy MLH inventories. The final snapshot matches original 0056 except its predecessor link.
- `pnpm db:migrate`: applied all 54 migrations on a fresh disposable database; a second run was a no-op.
- `pnpm verify:precommit`: React analysis, formatting, lint, and 33 workspace typechecks passed. Lint reported existing warnings, with no errors.
- Preview server stopped and disposable test databases removed. Screenshot deliverables are retained in the feature bundle.

Review follow-up:

- Human decision: restore main's add-only imports after scheduling. Replacement stays blocked; existing projects and memberships remain unchanged. Updated the spec and tests to match.
- Both import entry points respect their disabled state, including a replacement dialog already open when a schedule appears.
- Project tags choose black or white text from relative luminance in the directory, project details, and evaluation dialog. Room and rubric locks explain the saved schedule and where to drop it.
- Duplicate copies of unchanged opt-in IDs no longer trip the feedback lock. Group/challenge updates record changed fields and before/after values; stale entities and malformed tag colors have specific error messages.
- Retained independent group/prize identities when labels match, as required by the SRD. Regression coverage verifies re-import preserves that distinction. Deletion already rejects saved schedules and feedback before touching memberships; added coverage for those controlled errors.
- CI run 34288075925 failed because the API surface snapshot omitted the four new group/challenge procedures. Reproduced the failure and updated only those four entries.
- Full-suite validation also exposed a webhook test timeout: importing the shared API module inside the test used most of its five-second budget. Moved that import to collection without changing assertions or payment behavior. All 849 Blade tests pass.
- `pnpm verify:precommit` passes React analysis, formatting, lint, and all 33 workspace typechecks. Lint reports existing warnings, with no errors.
- `CI=true pnpm exec turbo run test --filter='!@forge/db'` passes all 28 tasks, including 938 API tests and 849 Blade tests. `CI=true` matches GitHub's environment; without it, this local checkout lacks `NEXT_PUBLIC_BLADE_URL` for the existing production-mode Discord config test.
- GitHub run 34290298700 passed the application test job but exposed a separate 15-second timeout in the whole-schema truncate/restore database test. Increased only that test's timeout to 60 seconds, matching its migration setup budget; retained every ledger, tag, and orphan check. All 157 DB tests pass locally. No restore code or migrations changed.
- Refreshed project screenshots and added add-only import and room-lock screenshots using disposable synthetic data. Verified the room lock at desktop and 320px widths; preview server and database removed afterward.
