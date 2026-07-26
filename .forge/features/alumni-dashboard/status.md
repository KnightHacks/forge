# Alumni Dashboard Status

Current phase: Complete

## Decision log

- 2026-07-25: Build from `reforge/main` on `reforge/alumni-dashboard`.
- 2026-07-25: A passed graduation date triggers a required, non-dismissible
  Blade confirmation. The member must confirm graduation or choose a future
  term and year.
- 2026-07-25: Guild alumni labels and Discord alumni role assignment remain
  automatic from `Member.gradDate`.
- 2026-07-25: Confirmed alumni receive a private Blade dashboard that replaces
  the current member dashboard.
- 2026-07-25: The dashboard prioritizes donation, alumni Discord, career
  history, current officer contacts, personal recap, QR, and settings.
- 2026-07-25: Donation replaces dues in the high-priority dashboard position
  and preserves the four legacy Stripe choices.
- 2026-07-25: Current officers come from President, Vice President, Secretary,
  and Treasurer role assignments. Officer cards use role email and Discord
  actions, without Guild profile links.
- 2026-07-25: Recap always shows member-since and class year. Optional Club
  attendance and point statistics disappear when no meaningful value exists.
- 2026-07-25: The bulletin uses independent cards with no category. Cards
  support Markdown, one image, and one external or Blade-form action.
- 2026-07-25: Officers can draft, schedule, order, publish, expire, archive,
  restore, and preview bulletin items.
- 2026-07-25: `MANAGE_ALUMNI_DASHBOARD` controls bulletin administration, with
  the normal officer bypass.
- 2026-07-25: The desktop action region stays visible inside the viewport.
  Bulletin content occupies the remaining bottom space and scrolls inside its
  container. Mobile uses normal page scrolling.
- 2026-07-25: The feature does not add a bulletin or global admin activity
  feed.
- 2026-07-25: Upcoming events, event history, recent forms, photo nostalgia,
  hackathon history, Guild promotion, and graduation email are out of scope.
- 2026-07-25: Human approved `spec.md`, `srd.md`, and `test-cases.md`.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Generate failing validator, API, DB, and Blade tests.
- [x] Implement the database schema and migration.
- [x] Implement alumni and bulletin validators and API behavior.
- [x] Implement graduation confirmation and alumni dashboard selection.
- [x] Implement the screen-height alumni dashboard and responsive mobile
      layout.
- [x] Implement Alumni Admin bulletin management and preview.
- [x] Run static, migration, unit, integration, React, browser, and visual
      validation.

## Validation / commands

- `pnpm forge:feature alumni-dashboard "Alumni Dashboard"`: blocked because the
  desktop shell exposed pnpm 11 while Forge pins pnpm 9; no files were created.
- `tsx scripts/create-forge-feature.ts alumni-dashboard "Alumni Dashboard"`
  with the bundled Node runtime: created the feature bundle from the repository
  templates.
- `prettier --check .forge/features/alumni-dashboard/*.md`: passed.
- `git diff --check`: passed.
- Artifact review confirmed the approved graduation, bulletin, officer, recap,
  career, donation, access, exclusion, and screen-height layout decisions are
  represented in `spec.md`, `srd.md`, and `test-cases.md`.
- Targeted Vitest run for the new validator, API, database, and Blade suites:
  failed at the expected pre-implementation boundaries (missing alumni modules,
  table, column, migration, and components). This establishes the TDD red
  baseline.
- `drizzle-kit migrate`: applied the additive alumni migration successfully to
  the development database.
- Package Vitest run: 67 suites passed, with 411 tests passing and 9 existing
  skips.
- Blade Vitest run: 47 suites and 152 tests passed.
- Consts, validators, database, UI, API, and Blade TypeScript checks passed.
- ESLint passed for every changed TypeScript/TSX file. The initial lint process
  exhausted its default heap; the unchanged command passed with an 8GB Node
  heap.
- React analyzer inspected five changed component surfaces, found six exported
  components, and reported zero failures.
- Playwright verified the required graduation decision and the complete
  bulletin create, edit, archive, restore, image upload/display/removal
  lifecycle.
- A final storage-invariant audit confirmed that deleting a linked Blade form
  can safely null its bulletin reference without blocking the foreign-key
  action. Normal validator/API writes still reject a CTA label without a
  target. The focused validator and database suites passed with 12 and 4 tests,
  respectively, and both packages passed typecheck, lint, and formatting.
- Vision review passed at 1440×900, 1280×720, and 390×844. At 1280×720 the
  document remained exactly 720px tall while the bulletin owned its internal
  overflow; mobile used normal document scrolling.
- `next build` compiled the application successfully. The repository's static
  export then stopped on the pre-existing `/admin/forms/sections` prerender
  error, outside this feature; all changed packages and Blade still pass their
  explicit typechecks.

## Links

- PRs:
- Issues:
- Discord/thread context:
