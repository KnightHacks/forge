# KHIX Dashboard Interface Guidelines Status

Current phase: Complete

## Decision log

- 2026-08-26: Apply the supplied guidelines as interaction/accessibility rules,
  not as Vercel visual branding.
- 2026-08-26: Preserve KHIX identity and data behavior; make shared-shell changes
  inherit across all dashboard routes.
- 2026-08-26: The user’s explicit implementation request approves this scoped bundle.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Treat the explicit request as approval for the documented implementation.
- [x] Implement shared dashboard interaction/accessibility improvements.
- [x] Verify every dashboard route across desktop, mobile, and ultra-wide.

## Validation / commands

- `pnpm --filter=@forge/khix format` — passed.
- `pnpm --filter=@forge/khix typecheck` — passed.
- `pnpm --filter=@forge/khix lint` — passed with 0 errors and 23 existing
  warnings.
- `pnpm analyze:react:changed` — passed with 0 failures.
- `pnpm --filter=@forge/khix exec vitest run src/lib/venue-floor-plans.test.ts src/lib/venue-map.test.ts`
  — 31 tests passed.
- `pnpm --filter=@forge/khix build` — passed.
- `git diff --check` — passed.
- Playwright — all six dashboard routes have route-specific titles, one h1,
  one current navigation item, and no horizontal overflow at 320×700,
  390×844, 1440×900, or 2560×900.
- Playwright — mobile drawer focus entry, reverse-tab containment, Escape,
  focus return, and reduced-motion behavior passed; browser console reported 0
  errors.

## Links

- PRs:
- Issues:
- Discord/thread context: User request in Codex task on 2026-08-26.
