# KnightHacks IX Guild Profile Images Status

Current phase: Review / PR

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-20: Repair the shared Guild public roster contract instead of special-casing Estefanie in KHIX.
- 2026-08-20: Support both legacy absolute URLs and current object-name references through the existing ownership resolver.
- 2026-08-20: Remove Lena Tran from KHIX only; preserve her Guild profile and roles.
- 2026-08-20: Deliver on a task branch through one draft PR.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approved the plan before implementation/test generation.
- [x] Implement shared public profile-picture signing.
- [x] Resolve public roster picture references before returning them.
- [x] Remove Lena from KHIX featured designers.
- [x] Add and run regression tests.
- [x] Complete repository validation.
- [ ] Open the draft PR and confirm CI is green.

## Validation / commands

- `pnpm exec vitest run packages/api/src/tests/guild/profile-picture.test.ts packages/api/src/tests/guild/club-roster.test.ts` — passed (21 tests).
- `pnpm --filter=@forge/khix exec vitest run src/app/_components/team-cascade/team-roster.test.ts` — passed (1 test).
- `pnpm --filter=@forge/api test` — passed (585 tests; 148 skipped).
- `pnpm --filter=@forge/khix test` — passed (15 tests).
- `pnpm --filter=@forge/api typecheck` — passed.
- `pnpm --filter=@forge/khix typecheck` — passed.
- `pnpm --filter=@forge/club typecheck` — passed.
- `pnpm --filter=@forge/guild typecheck` — passed.
- `pnpm --filter=@forge/blade build` — passed.
- `pnpm --filter=@forge/khix build` — passed.
- `pnpm analyze:react:changed` — passed (no changed TSX files to analyze).
- `pnpm format` — passed.
- `pnpm lint` — passed with existing repository warnings and no errors.
- `pnpm typecheck` — passed (29 tasks).
- Local browser contract verification — passed: all 29 rendered portraits loaded, Estefanie was present, and Lena was absent.

## Links

- PRs:
- Issues:
- Discord/thread context:
