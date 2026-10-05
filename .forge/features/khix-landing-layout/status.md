# KHIX landing page layout status

Current phase: complete; validated for the requested direct main delivery.

## Decisions

- 2026-10-05: User requested working on main and explicitly authorized pushing
  this change to main after reviewing the preview.
- Use a separate main checkout to preserve the map branch and uncommitted work.
- Retain all sponsor/partner/team content and existing artwork. Fix content sizing
  and CTA placement through three CSS modules.

## Progress

- [x] Inspect existing styles and supplied screenshots.
- [x] Fix artwork sizing, team clearance, and mobile Apply placement.
- [x] Validate screenshots and layout bounds across desktop/mobile sizes.
- [x] Run app checks and review final scope.

## Changed files

- `apps/2026/src/app/_components/sections/hero/Hero.module.css`
- `apps/2026/src/app/_components/sections/sponsor-team/SponsorTeamSection.module.css`
- `apps/2026/src/app/page.module.css`

## Validation

- Repo-wide `pnpm format`, `pnpm lint`, and `pnpm typecheck`: passed before
  committing. Lint reports existing warnings without errors.

- `pnpm --filter=@forge/2026 format`: passed.
- `pnpm --filter=@forge/2026 lint`: passed with 20 existing warnings.
- `pnpm --filter=@forge/2026 typecheck`: passed.
- `pnpm analyze:react:changed`: passed; no changed React files (CSS-only fix).
- Feature bundle formatting and `git diff --check`: passed.
- Playwright Chromium screenshots inspected at 1440, 1952, 768, 402, and 320px.
  Current content: 22 sponsors, nine partners, 29 team members. No horizontal
  overflow or gap between the artwork and scene bottom at any checked width.
- Temporary browser-only 60-person roster: full artwork coverage; last avatar
  clears the FAQ divider by 70px at 1440px. Fixture removed by reloading.
- At 402x750 with a simulated 874px physical screen, Apply is at y=540–592.
  At 320x568 with a simulated 667px screen, Apply is at y=409–457. Both remain
  inside the first viewport and link to `/apply`. Reduced motion checked.
- Keyboard focus selects a team profile. The user's Zen browser also shows
  continuous artwork and an unobscured final avatar on the updated preview.
- Authentication is outside scope; the preview uses a placeholder portal client
  ID, so its session request returns 403. Public roster and artwork load normally.

## Delivery

Direct main delivery requested; no PR or issue created. Map PR remains untouched.
Local screenshots and measurements are retained in `output/playwright/`.
