# Mobile Dashboard CTA Status

Current phase: Validated locally; ready for review

## Decisions

- 2026-10-08: User requested a readable “Log into Dashboard” CTA over the mobile foreground, then asked to show more TK and purple canopy.
- Final adjustment: raise both grass and CTA by 10svh from the lowered revision. Keep the extra canopy space above the mobile logo.
- Keep work on `emailfix`, preserving the existing email fixes.
- Reuse the original art and configured dashboard route. Use an opaque dark green mobile button for reliable contrast.
- Remove the decorative wrapper's `aria-hidden` because it also contained the interactive desktop CTA; individual decorative images remain unnamed.

## Progress

- [x] Inspect screenshot, source, and existing design instructions.
- [x] Record requested scope and verification cases.
- [x] Implement responsive placement, label, and dashboard destination.
- [x] Run formatting, lint, typecheck, and changed React analysis.
- [x] Verify keyboard focus, label fit, and mobile touch targets in the browser.

## Validation

- `pnpm --filter=@forge/2026 format`: passed.
- `pnpm --filter=@forge/2026 lint`: passed with 28 existing warnings, zero errors.
- `pnpm --filter=@forge/2026 typecheck`: passed.
- `pnpm analyze:react:changed`: four changed React files analyzed, zero failures (includes preserved email work).
- `git diff --check`: passed.
- Browser widths 320, 390, 430, and 1024: label fits on one line, no document overflow, dashboard link exposed to assistive technology, keyboard focus visible. Mobile targets are 56px tall; white on #16372b has 13:1 contrast.
- Browser click reaches `/dashboard`. Full sign-in was not tested: local preview uses a process-only placeholder portal client ID and the session endpoint returns 403. No configuration files changed.
- Inspected fully loaded 320px and 390px mobile screenshots and 1280px desktop screenshot; About transition remains continuous. Screenshot timing retries were needed for async art loading.
- Screenshots and check logs: `output/playwright/mobile-dashboard-cta/`. Desktop 1024px has a pre-existing foreground/CTA overlap; desktop layout geometry was left unchanged.

## Open questions / links

Tracked with the email work on the user-requested `emailfix` branch in [issue #598](https://github.com/KnightHacks/forge/issues/598). [PR #599](https://github.com/KnightHacks/forge/pull/599) runs the requested hosted CI checks. No deployment or merge has occurred. Final root format, lint, typecheck, React analysis, full build, and all 3,011 unit/integration tests passed. The 2026 E2E script has a pre-existing discovery issue: it attempts to run Vitest files through Playwright. Mobile and desktop screenshots are included in this bundle's `screenshots/` directory.
