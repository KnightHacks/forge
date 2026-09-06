# Blade responsive navigation SRD

## Implementation

Follow `docs/agentic-development/forge-engineering-principles.md` and `apps/blade/DESIGN_SYSTEM.md`. Keep all implementation within `apps/blade`.

Replace the existing timer/event-based route link with Next Link's `onNavigate` and a root React transition provider. Route imperative push/replace/refresh calls through the same Blade-local hook. React owns pending lifetime and optimistic destination rollback; avoid timers, event patching, new dependencies and duplicate routing state. Preserve Next prefetch, normal link behavior, navigation cancellation, history and scroll options.

Use a narrow violet indeterminate progress bar, a polite status announcement and optimistic rail highlighting. Keep existing route skeletons and add a root fallback for missing leaf fallbacks and asynchronous layouts. Stop pulse/progress animation for reduced motion.

GET search/filter forms use the same transition router and retain their native no-JavaScript fallback. Issue filter dialogs close when a search starts.

In-page selected views may update optimistically while navigation is pending. Preserve server data ownership, URL state, permissions and current mutations.

## Access and data compatibility

Public routes remain public, member routes retain session gates, officer routes retain permission gates and judging retains its existing access gates. No APIs, validation rules, schemas, persisted data, Discord operations or environment configuration change. No migration. Rollback removes Blade UI changes. No annual configuration is introduced.

## Verification

Targeted Vitest regressions, Blade typecheck/lint, React analysis, repository format/lint/typecheck, and delayed-navigation Playwright checks with desktop and 320px screenshots. Record exact failures and limitations in status.md.
