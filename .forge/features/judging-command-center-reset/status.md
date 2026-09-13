# Judging Command Center Reset Status

Current phase: Awaiting owner UI approval

## Decision log

- 2026-09-13: The user approved a numbered command-center flow, granular destructive operations, and a full judging reset.
- 2026-09-13: Full reset preserves the Hackathon, global buildings, audit history, and external Discord threads.
- 2026-09-13: Routine alerts must not occupy document flow; urgent announcements remain blocking dialogs.
- 2026-09-13: Project inventory, visibility, import, deletion, search, and filters share one compact control surface.
- 2026-09-13: Every granular destructive action is a direct Reset action; navigation-only tiles were removed.

## Open questions

- None.

## Task list

- [x] Confirm product scope and destructive boundaries.
- [x] Document API/data order and observable test cases.
- [x] Implement reset procedures and initial command-center layout.
- [x] Complete component, integration, and browser validation for judging scope.
- [x] Complete final Forge review after the owner's layout refinements.
- [ ] Show desktop/mobile screenshots to the user before opening the PR.

## Validation / commands

- `pnpm --filter=@forge/api test -- src/tests/integration/judging-reset.test.ts`: passed (4 tests).
- `pnpm --filter=@forge/blade test -- src/tests/projects/judging-announcement-editor.test.tsx`: passed (4 tests).
- `pnpm verify:precommit`: passed after the owner's layout refinements (React analysis, format, lint, and 33 workspace typecheck tasks).
- `pnpm build`: passed (21 workspace build tasks).
- Targeted API validation: 178 tests passed across judging reset, hacker guards, access, and API surface coverage.
- Targeted Blade validation: 41 tests passed across reset routing, hacker actions, filtering, room announcements, and challenge setup.
- Manual local browser QA passed for desktop/mobile command-center layout, checklist/reset dialogs, scheduler failures, room deletion, and routine announcements. Captures remain outside the repository under `/tmp`.
- Production browser QA confirmed the authenticated judge project page, historical hackathon dropdown, and guest activation redirect to the public Blade origin.
- Manual browser QA passed for the compact project toolbar and six consistently labelled granular Reset actions.
- Final review caught and resolved schedule-preview cleanup, locked project reset, project claim/deliberation FK ordering, stale lock attribution, reset availability, and destructive-action grouping. The follow-up review found no remaining production issues.

## Links

- PRs:
- Issues:
- Discord/thread context:
