# Club Event Details and Date Layout Status

Current phase: Draft PR open

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-26: Scope confirmed from issue #518 and Chris's request to begin
  implementation.
- 2026-08-26: Keep two-line previews and disclose the complete event in a
  Club-styled dialog using the shared Radix primitive.
- 2026-08-26: Present dates as month, large day number, then weekday in one
  reusable Club date block.
- 2026-08-26: Keep the work inside `apps/club`; no Blade, API, database,
  dependency, or environment changes.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves issue-backed direction and requests implementation.
- [x] Add focused automated coverage.
- [x] Implement the shared date block and event details dialog.
- [x] Apply both components to all three Club event surfaces.
- [x] Run local automated and browser validation.
- [x] Chris reviews the local UI before commit/PR preparation.

## Validation / commands

- `pnpm --filter=@forge/club test`: passed, 4 files and 11 tests.
- `pnpm analyze:react <four changed TSX files>`: passed, 4 files and 0
  failures.
- `pnpm verify:precommit`: passed React analysis, formatting, lint, and
  typecheck. Lint completed with existing repository warnings and 0 errors.
- `pnpm --filter=@forge/club build`: passed, including static generation of all
  14 Club routes.
- Local Playwright at 1440x1000 and 375x812: confirmed `SEP 04 FRI` order, full
  description recovery, Escape/close dismissal, focus restoration, 44px action
  targets, and no page or dialog horizontal overflow.

## Links

- PRs: https://github.com/KnightHacks/forge/pull/519
- Issues: https://github.com/KnightHacks/forge/issues/518
- Discord/thread context:
  - User reported truncated descriptions and disjoint date ordering with
    screenshots from the public Home and Events pages.
