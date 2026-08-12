# Whitespace-Aware Form Character Limits Status

Current phase: Complete / ready for review

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-11: The user explicitly approved remaking PR #482 from current
  `main` and pushing `alex/forms-ignore-whitespace-count`.
- 2026-08-11: Count spaces, tabs, and line breaks as whitespace and preserve
  submitted text exactly.
- 2026-08-11: Port the intent into the current forms platform instead of
  cherry-picking deleted legacy files.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Add failing validator and Blade regression tests.
- [x] Implement shared counting, validation, and counters.
- [x] Run targeted and repository validation.
- [ ] Commit and push the task branch.

## Validation / commands

- `pnpm forge:feature forms-ignore-whitespace-count "Whitespace-Aware Form Character Limits"`: passed after allowing its required temporary IPC pipe.
- Pre-implementation `pnpm --filter=@forge/validators test`: failed on the missing counter helper as expected.
- Pre-implementation focused Blade test: failed on missing counters and raw `maxLength` as expected.
- `pnpm --filter=@forge/validators test`: passed, 255 tests.
- Focused `pnpm --filter=@forge/blade test -- generic-form-response-form.test.tsx`: passed, 4 tests.
- `pnpm --filter=@forge/validators typecheck`: passed.
- `pnpm analyze:react:changed`: passed, 2 files analyzed with 0 failures.
- `pnpm format`: passed.
- `pnpm lint`: passed with existing repository warnings only.
- `pnpm typecheck`: passed.
- Full Blade test run: 700 passed; one unrelated Stripe webhook test timed out while the production build ran concurrently. The timed-out test passed 3/3 when rerun alone.
- `pnpm --filter=@forge/blade build`: compilation passed; page-data collection was blocked by missing local `DATABASE_URL`, Discord/Auth/Blade URL, and MinIO environment variables.

## Links

- PRs: https://github.com/KnightHacks/forge/pull/482 (superseded legacy implementation)
- Issues:
- Discord/thread context:
