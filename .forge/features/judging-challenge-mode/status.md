# Judging Challenge Mode Status

Current phase: In review

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-10-08: Use three organizer-facing modes: Scheduled, Unscheduled, and Remote.
- 2026-10-08: Remote is hidden only from hackers; authorized judges can evaluate it without an appointment time.
- 2026-10-08: Keep existing authorization, assignment, scope, and judging-state guards.
- 2026-10-08: Preserve existing rows by adding a non-remote default and retaining `isScheduled` for scheduler compatibility.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human supplied and approved the behavior contract in the task conversation.
- [x] Add shared mode vocabulary, schema field, and generated migration.
- [x] Update validators and API mappings.
- [x] Exclude Remote from hacker itinerary output.
- [x] Replace the Blade checkbox with a mode selector.
- [x] Add responder-access and regression tests.
- [x] Run required checks and browser verification.
- [x] Open the issue.
- [x] Open the pull request with screenshots.

## Validation / commands

- `pnpm analyze:react apps/blade/src/app/_components/judging/challenge-configuration-panel.tsx`: passed (1 component, 0 failures).
- `pnpm db:generate`: passed; generated migration 0061.
- `pnpm db:migrate`: passed against the local development database.
- Focused API integration suite: 4 files, 23 tests passed.
- Focused Blade suite: 2 files, 10 tests passed.
- Focused validator suite: 1 file, 3 tests passed.
- `pnpm verify:precommit`: passed (format, lint, typecheck, React analysis).
- `pnpm build`: passed (21 tasks).
- Browser verification: desktop 1278x719 and mobile 388x2256 screenshots captured.

## Links

- PRs: https://github.com/KnightHacks/forge/pull/605
- Issues: https://github.com/KnightHacks/forge/issues/604
- Discord/thread context:
