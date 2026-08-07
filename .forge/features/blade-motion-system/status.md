# Blade Loading and Motion System Status

Current phase: Manual UI review

## Decision log

- 2026-08-07: User approved the full loading and motion audit for implementation in an isolated worktree.
- 2026-08-07: Use the existing CSS/Tailwind/Radix/Intersection Observer foundation; do not add Framer Motion to Blade.
- 2026-08-07: Preserve calm, stable authenticated workspaces. Motion is limited to public reveals, direct interaction, retained loading, and semantic progress.
- 2026-08-07: Shared `@forge/ui` changes are limited to reduced-motion hygiene and overlay timing.
- 2026-08-07: Shared-package compatibility preserves every ordinary-motion primitive default except the explicitly approved faster Sheet timing; Drawer changes activate only for reduced-motion users, and combobox skeletons preserve the existing API.
- 2026-08-07: Route fallbacks that own their authenticated shell include a shell-shaped skeleton so navigation chrome remains stable.
- 2026-08-07: Hacker roster queries retain same-hackathon results during filter refetches and remount on hackathon changes to prevent cross-hack stale rows.
- 2026-08-07: Member signup keeps its existing section fade, now using the shared progressive-enhancement primitive; authenticated dashboard skeleton replacements remain direct.

## Open questions

- None.

## Task list

- [x] Complete and approve `spec.md`, `srd.md`, and `test-cases.md` from the user-approved audit.
- [x] Add missing route and component skeletons.
- [x] Add Blade motion primitives and public reveals.
- [x] Add reduced-motion hygiene to shared animated primitives.
- [x] Add check-in, publication, retained-table, tab, submission, and drag feedback.
- [x] Run React analysis, targeted tests, lint, typecheck, and visual QA.
- [x] Produce linked manual-test checklist.

## Validation / commands

- `pnpm forge:feature blade-motion-system "Blade Loading and Motion System"`: blocked because the isolated worktree has no `node_modules`; artifacts created from checked-in templates instead.
- `pnpm install --offline --frozen-lockfile`: passed.
- `pnpm format`: passed.
- `pnpm lint`: passed with existing repository warnings and no errors.
- `pnpm typecheck`: passed, 29 tasks.
- `pnpm --filter=@forge/blade test`: passed, 116 files and 677 tests.
- `pnpm --filter=@forge/blade exec vitest run src/tests/loading/loading-skeletons.test.tsx src/tests/events/event-feedback-dialog.test.tsx`: passed, 10 tests after integration review fixes.
- `pnpm analyze:react:changed`: passed after integration review, 44 files / 88 components / 0 failures.
- Public landing and sponsor visual QA: passed at 1440px and 390px with ordinary and reduced motion.
- Targeted hackathon Playwright: blocked before UI assertions because the configured Postgres database could not be reached during fixture cleanup.

## Links

- PRs:
- Issues:
- Discord/thread context: Codex task, 2026-08-07
