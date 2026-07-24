# Guild Collective Status

Current phase: Implementation complete; local review

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-24: Standardized missing public taglines after live human review.
  Legacy null, empty-string, and whitespace-only values now normalize to `null`
  at the Guild API boundary and consistently use the same presentation
  fallback. Current profile writes were already normalized by shared member
  validation, so no migration is required.
- 2026-07-24: Anchored graduation and member-since metadata to the bottom of the
  fixed identity block after screenshot review. One- and two-line taglines no
  longer change the metadata row's vertical position relative to the
  role/alumni band.
- 2026-07-24: Expanded the Alumni treatment to the full affiliation width after
  live human review so its visual weight matches team bands.
- 2026-07-24: Strengthened alumni identity after live human review. Alumni
  directory cards now use a gold card edge and a dedicated gold `Alumni` tag in
  the same affiliation slot as team tags; graduation year remains separate
  metadata beneath the tagline.
- 2026-07-24: Restored legacy `Member Since` semantics for public discovery.
  Guild now derives a public join-year cohort from `Member.dateCreated`, shows
  compact `Since YYYY` history metadata on cards and month/year tenure on
  profiles, and exposes visible-data-derived member-since year filters.
- 2026-07-24: Replaced the textual `Class of` line with compact, accessible
  Lucide calendar-and-year metadata after live human review. The year now
  follows the actual tagline instead of a reserved two-line gap. Non-team cards
  no longer render an empty role band; academic content moves into that space
  while footer and card height remain stable.
- 2026-07-24: Standardized graduation placement after live human review. Every
  card now shows current/alumni metadata beneath its fixed-height tagline.
  Team roles use the following fixed-height band; profiles without a role leave
  that band visually empty without collapsing it, reserving the space for
  future opportunity treatments.
- 2026-07-24: Separated graduation state from team identity after live human
  review. The configured-color team band now contains only the role; current
  class information is neutral academic metadata outside it, while alumni
  retains the reserved gold treatment.
- 2026-07-24: Removed the directory masthead's separate gradient slab and
  border so Blade's fine grid reads continuously through the page. Guild
  branding accents now use Blade purple instead of Guild blue. Team cards keep
  their full-width configured-color band, but current/alumni metadata now sits
  beneath the role in one left-aligned identity block instead of a right-hand
  partition.
- 2026-07-24: Re-researched the live legacy Guild, local Blade canvas, and
  current Guild through side-by-side browser screenshots after human review.
  Guild now reuses Blade's fine full-shell grid with restrained purple/blue
  depth. Team identity moved from a small role pill into a fixed-height,
  configured-color band with a secondary current/alumni line while preserving
  the established card geometry.
- 2026-07-24: Corrected the viewport-bounded profile wrapper so the back action
  aligns with the profile card's left edge instead of stretching and centering.
- 2026-07-24: Bounded desktop member profiles to the viewport below the sticky
  Guild header after live human review. Long editorial details now scroll
  within the main profile column while the identity column stays stable;
  mobile keeps natural page flow.
- 2026-07-24: Fixed `Load more` card entrances after live human review.
  Appended cards now restart the capped stagger for their batch and animate on
  viewport entry, while existing cards remain settled and reduced-motion
  behavior remains preference-aware.
- 2026-07-24: Added human-requested LinkedIn, GitHub, and portfolio quick links
  to the stable directory-card action row. The links are accessible sibling
  actions rather than invalid nested anchors. Team cards now reinforce the
  existing role pill with a stronger configured-color marker, border, and
  restrained top edge without changing card geometry.
- 2026-07-24: Refined directory-card standardization after another live human
  review. Every combination now shares fixed identity, two-line tagline, tag,
  academic, employer, and footer slots. Compact role/current/alumni pills are
  restored within that geometry; role color remains a tinted dot/outline and
  alumni remains distinctly gold.
- 2026-07-24: Completed a human-directed public Guild design pass after live
  co-working review. Guild now uses the Knight Hacks wordmark and Blade member
  dashboard surface hierarchy with restrained blue/purple page color, without
  the rejected grid, orbit graphic, floating directory pill, glass sheen,
  icon-heavy labels, or uppercase profile/team eyebrows.
- 2026-07-24: Standardized directory identity rows with fixed two-line tagline
  space and one shared role/status strip. Team labels use `Team`, KH IX uses
  `Organizer`, alumni/current status uses the same visual hierarchy, and only
  graduation, employer, and résumé retain Lucide glyphs.
- 2026-07-24: Added short Framer Motion entrance/interaction behavior with a
  35ms card stagger capped at 420ms, two-pixel hover travel, and
  preference-aware reduced-motion handling without hydration branching.
- 2026-07-24: Added the human-requested team-members-only filter using an API
  `EXISTS` check against eligible code-owned roles, and preserved the active
  directory query when navigating into and back from a member profile.
- 2026-07-24: Completed the Guild Collective implementation across the Member
  schema/migration, validators, public Guild API, Blade owner controls, Guild
  directory/profile/SEO surfaces, Issues rollout-flag removal, and focused
  automated coverage.
- 2026-07-24: Final implementation review added duplicate opportunity-status
  rejection, safe normalization/omission for malformed Legacy social links,
  a popup-safe résumé preview flow, sanitized public URL parameters, and
  branded Guild unavailable/error states.
- 2026-07-24: Guild Playwright now owns its Blade/Guild dev harness and keeps
  both servers on the same `localhost` origin. This fixed a false
  non-hydration failure caused by Next blocking a `127.0.0.1` dev-resource
  request from a `localhost` page.
- 2026-07-24: PostgreSQL was restarted through the repository Docker Compose
  stack and migration `0017_nice_vulture.sql` was applied successfully.
- 2026-07-23: Human approved the complete test-case bundle and explicitly
  authorized implementation.
- 2026-07-23: Started implementation using the repository Next.js, React,
  TypeScript, Playwright, React Analyzer, and frontend-design skills. The
  planned sequence is focused tests, domain/data/API implementation, Blade
  controls, Guild frontend, then automated and visual validation.

- 2026-07-23: Created branch `reforge/guild-collective` from clean local
  `reforge/main`.
- 2026-07-23: Human selected Guild Collective as the next proper
  non-hackathon Legacy carryover and explicitly requested restored APIs, a
  complete frontend revamp, and a larger role for Guild in the product.
- 2026-07-23: Re-read the repository artifact workflow, Forge engineering
  principles, frontend design guidance, Blade design system, repository
  conventions, database guide, contribution guide, setup guide, and GitHub
  etiquette before feature work.
- 2026-07-23: Selected Spec Miner, Forge Spec Writer, and Frontend Design as
  the intake-stage skills. SRD and test-case skills remain gated on approval
  of the product spec.
- 2026-07-23: Instantiated the standard four-file feature bundle with
  `pnpm forge:feature guild-collective "Guild Collective"`.
- 2026-07-23: Confirmed that commit `d5fdaac4` moved the former Guild router
  into `legacy/` while leaving current `apps/guild` and `apps/club` consumers
  in place. The missing current router is therefore a Reforge carryover gap,
  not evidence that Guild was intentionally removed.
- 2026-07-23: Confirmed Legacy Guild behavior: visible-profile discovery,
  search, pagination, current/alumni filtering, profile cards, a limited
  public Club-team roster, and public short-lived resume links.
- 2026-07-23: Confirmed the current Guild frontend is a single public
  directory with a filter dock, animated card grid, detail dialogs, social
  links, and resume actions. It has no Guild tests and its three expected
  `api.guild` procedures are absent from the current API root.
- 2026-07-23: Identified a privacy conflict that must not be inherited:
  Legacy exposes opted-in profiles and resume links publicly, while the
  approved Reforge onboarding contract says private profiles remain visible
  to sponsors and Knight Hacks staff and public profiles are additionally
  visible to members.
- 2026-07-23: Identified an authentication gap: Guild is a separate subdomain,
  current auth is Blade-based, and no sponsor-specific Guild permission or
  authenticated sponsor surface currently exists.
- 2026-07-23: Existing Guild data remains on `Member`; no schema change has
  been approved.
- 2026-07-23: Human confirmed Guild browsing is public and must not require
  authentication.
- 2026-07-23: Human confirmed Blade remains the editing experience; Guild may
  provide a quick link back to Blade for edits.
- 2026-07-23: Human rejected a Guild-specific private/sponsor permission or
  authenticated recruiting workspace. Guild itself is public.
- 2026-07-23: Human approved a separate public Guild résumé toggle, defaulted
  on. Knight Hacks will announce the public-by-default policy and let members
  opt out.
- 2026-07-23: Human confirmed Guild profile visibility remains default-on with
  opt out.
- 2026-07-23: Human described Guild as the member's LinkedIn-like public
  identity. Major, company, and available résumé therefore belong in the
  public profile; sensitive non-profile fields still require an explicit
  confirmation before the field matrix is closed.
- 2026-07-23: Human scoped the first release to community discovery with
  incidental sponsor/recruiter discovery, not messaging, feeds, jobs,
  endorsements, or analytics.
- 2026-07-23: Human approved stable shareable profile pages and indefinite
  opted-in alumni visibility.
- 2026-07-23: Human removed the Club public-team roster from this feature
  bundle.
- 2026-07-23: A schema change is now expected for the independent résumé
  visibility setting; the exact field and migration behavior belong in the
  SRD after product-spec approval.
- 2026-07-23: Human confirmed that “all public” means Guild-professional
  fields such as major, company, and available résumé. Sensitive onboarding,
  demographic, Discord, and account fields remain excluded.
- 2026-07-23: Human deferred skills/technology tags as out of scope.
- 2026-07-23: Human approved an optional public opportunity status configured
  from the Blade member dashboard. Its controlled choices and selection model
  remain open.
- 2026-07-23: Human approved compact cards with identity, current/alumni
  state, academic/work context, and a richer shareable profile destination.
- 2026-07-23: Human approved search across public professional fields and
  filters for status, graduation year, school, major, résumé availability,
  and opportunity status, excluding the deferred skills filter.
- 2026-07-23: Human approved both browser preview and download for public
  résumés.
- 2026-07-23: Human approved an always-visible link from Guild to Blade member
  editing without adding Guild auth awareness.
- 2026-07-23: Human rejected a separate member-spotlight section.
- 2026-07-23: Human directed Guild to use Blade's design system and product
  family while specifically avoiding a SaaS-like interface.
- 2026-07-23: Human approved one public Knight Hacks role callout based on the
  member's highest current role: specific officer title first, specific
  director title next, otherwise the team label.
- 2026-07-23: Human directed the unfiltered home directory to randomize
  profiles while prioritizing the most complete presentations, especially
  profile picture and tagline.
- 2026-07-23: The opportunity status adds another expected member schema and
  Blade editing change; exact representation remains an SRD decision after
  the product vocabulary is approved.
- 2026-07-23: Human approved a maximum of three public opportunity statuses:
  internships, full-time roles, freelance/contract work, project
  collaboration, offering mentorship, and seeking mentorship.
- 2026-07-23: Human approved up to two opportunity labels on directory cards,
  the full selection on profile pages, and opportunity-status filtering.
- 2026-07-23: Human approved direct opportunity-status editing through a
  compact Blade member-dashboard dialog plus the normal profile settings
  surface.
- 2026-07-23: Human approved profile completeness based on profile picture,
  tagline, biography, company, and at least one external link. Résumé
  visibility, opportunity status, and organizational role are explicitly
  excluded from the score.
- 2026-07-23: Human chose refresh-scoped rather than daily randomization. Each
  fresh unfiltered homepage load gets a new completeness-prioritized order,
  while `Load more` must preserve that order for the active page session.
- 2026-07-23: Human approved `Load more` and removal of the current page-size
  selector and numbered pagination.
- 2026-07-23: Human approved role priority as specific officer, then specific
  director, then team. Same-tier conflicts use configured role order and
  aggregate-only roles display `Officer` or `Director`.
- 2026-07-23: Human approved configured role/team color as a restrained
  callout accent within the Blade surface system.
- 2026-07-23: Product reverse-prompting has no remaining open questions;
  `spec.md` is ready for human approval.
- 2026-07-23: Human approved `spec.md`.
- 2026-07-23: Began the Forge SRD Writer workflow and re-read the approved
  product spec, status tracker, SRD template, API/data boundaries, member
  validators, storage ownership helpers, and current role model.
- 2026-07-23: Confirmed current profile pictures and résumés are persisted as
  private MinIO object names owned by the member's user ID. Public Guild
  responses must never expose those object names and must gate any short-lived
  media URL on current Guild visibility.
- 2026-07-23: Confirmed the current role schema has name, permissions, and a
  display color but no durable Guild callout label/tier/order. A role-name
  mapping would require developer changes as roles evolve.
- 2026-07-23: Confirmed public reads can remain `publicProcedure`, while
  opportunity and visibility writes must remain owner-scoped
  `protectedProcedure`; no Guild permission procedure is required.
- 2026-07-23: Human approved keeping Guild fields on `Member`, adding
  default-true public résumé visibility and a validated opportunity-status
  array, and avoiding a separate Guild table.
- 2026-07-23: Human approved canonical `/members/[memberId]` routes backed by
  the existing immutable member UUID.
- 2026-07-23: Human approved public `guild.listProfiles`,
  `guild.getProfile`, `guild.getResumeUrl`, and
  `guild.getFilterOptions` procedures plus owner-only
  `member.updateGuildPreferences`. The Club roster procedure remains absent.
- 2026-07-23: Human approved server-generated refresh seeds, opaque
  cursor-based progressive loading, parameterized relevance search, and
  visible-data-derived filter options without a PostgreSQL search extension.
- 2026-07-23: Human approved one-hour signed profile-picture URLs and
  click-generated ten-minute résumé URLs supporting view/download. Storage
  object names remain server-only.
- 2026-07-23: Human approved the access policy: unauthenticated visible Guild
  reads, owner-only preference writes, no officer override, and
  indistinguishable hidden/missing profile behavior.
- 2026-07-23: Human rejected new configurable role metadata. Guild role
  eligibility, precedence, and display remain code-owned from existing role
  labels and `@forge/consts` mappings for this release.
- 2026-07-23: Human approved code-owned opportunity status vocabulary in
  `@forge/consts`.
- 2026-07-23: Human rejected a Guild rollout flag and directed the feature to
  be enabled when deployed.
- 2026-07-23: Human additionally directed removal of any existing rollout
  flags. Repository inspection found one active flag:
  `ISSUES_FEATURE_ENABLED` in Blade, cron, Turbo environment passthrough, and
  Blade Playwright configuration. Removing it means authorized Issues
  navigation is always available and issue reminders always schedule.
- 2026-07-23: Human approved indexable public profile pages, canonical
  metadata/sitemap coverage, and no-index treatment for short-lived résumé
  destinations.
- 2026-07-23: Human approved app-owned Guild composition using `@forge/ui`,
  Geist, and Blade semantic design rules, plus Guild guidance in
  `apps/blade/DESIGN_SYSTEM.md`, without a broad shared-theme refactor.
- 2026-07-23: Human approved a default-on public résumé switch in member
  signup; opportunity status remains dashboard/settings-only.
- 2026-07-23: Human approved atomic full-settings persistence plus a narrow
  owner-only Guild preference mutation for dashboard quick edits.
- 2026-07-23: Human approved additive migration and code-rollback
  compatibility without reversing the migration.
- 2026-07-23: Human approved code-owned role-label projection, compact
  server-first directory controls, Dialog-based filtering, semantic card
  links, editorial profiles, sitemap projection, and resilient media fallback.
- 2026-07-23: Human confirmed full removal of `ISSUES_FEATURE_ENABLED` and
  always-scheduled issue reminders.
- 2026-07-23: Drafted `srd.md` from the approved technical reverse prompt. It
  is ready for human review.
- 2026-07-23: Human approved `srd.md`.
- 2026-07-23: Began the Forge Test Case Writer workflow and reviewed the
  repository test-generation guidance, recent Reforge test-case bundles, and
  existing validators/API/Blade/cron test harnesses.
- 2026-07-23: Coverage calibration: Mobile Member Experience has 11 cases,
  Role Management has 19, Club Analytics has 30, and the substantially larger
  Issues platform has 50. Guild spans a migration, public API, storage,
  Blade, a standalone app, SEO, and one flag-removal regression; roughly
  28–32 behavioral cases is proportionate.
- 2026-07-23: Confirmed automated MinIO behavior is already tested through
  deterministic client mocks, while local Docker provides PostgreSQL but not
  MinIO.
- 2026-07-23: Confirmed Guild currently has no test files or Playwright
  configuration, so this feature needs the smallest app-owned Vitest and
  Playwright harness rather than placing Guild UI tests under Blade.
- 2026-07-23: Human approved the approximately thirty-case coverage level,
  owning package/app placement, a Guild Playwright harness that launches Blade
  and Guild, and deterministic automated MinIO mocks.
- 2026-07-23: Human delegated the remaining test-detail decisions. Retained
  existing DB migration commands instead of adding a migration framework,
  kept one optional manual live-storage smoke, selected focused desktop/mobile
  visual and keyboard coverage, and required red-before-implementation runs
  where practical.
- 2026-07-23: Drafted 32 observable cases in `test-cases.md` (26 primary and 6
  negative/regression cases), calibrated between the recent Analytics and
  Issues bundles. The artifact is ready for human review.

## Open questions

- None for the test-case artifact.

## Task list

- [x] Create `reforge/guild-collective` from `reforge/main`.
- [x] Instantiate `.forge/features/guild-collective/`.
- [x] Re-read repository workflow, artifact, API, database, and frontend
      guidance.
- [x] Mine Legacy Guild API behavior and current Guild/Club consumers.
- [x] Identify audience, authentication, and resume privacy conflicts.
- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Add Guild constants, strict public DTO/input validators, and Member
      preference validation.
- [x] Add and apply the default-on résumé visibility and opportunity-status
      migration.
- [x] Restore public Guild discovery, profile, résumé, filter, and sitemap
      procedures without restoring the Club roster.
- [x] Add owner-only Guild preference editing to Blade dashboard and settings.
- [x] Rebuild Guild as a compact, public, editorial directory with stable
      profile pages and no SaaS rail, detail modal, or animated filter panel.
- [x] Remove `ISSUES_FEATURE_ENABLED` and preserve permission-only Issues
      access/reminder scheduling.
- [x] Add focused validator, API, Blade, Guild unit, and Guild Playwright
      coverage.
- [x] Run migration, formatting, tests, lint, typecheck, production build,
      React analysis, desktop/mobile Playwright, and vision review.

## Validation / commands

- `git switch -c reforge/guild-collective`: passed.
- `pnpm forge:feature guild-collective "Guild Collective"`: passed.
- `git log` / `git show` around `d5fdaac4`: confirmed the Guild router moved
  to Legacy while current consumers remained.
- Static source inspection: confirmed no `guild` key exists in
  `packages/api/src/root.ts`.
- `pnpm db:migrate`: passed; migration `0017_nice_vulture.sql` is applied.
- `pnpm --filter @forge/validators test`: 9 files / 82 tests passed.
- `pnpm --filter @forge/api test`: 41 files / 260 tests passed.
- `pnpm --filter @forge/blade test`: 40 files / 139 tests passed.
- `pnpm --filter @forge/guild test`: 1 file / 2 tests passed.
- `pnpm --filter @forge/guild e2e`: 4 Playwright flows passed, covering
  anonymous discovery, client-side `Load more`, dialog filters and URL state,
  team-members-only filtering, filter-preserving profile return, semantic
  member routes, branded unavailable profiles, and 320px overflow.
- Focused lint and typecheck for consts, database, validators, API, Blade,
  Guild, and cron: passed.
- `NODE_ENV=production pnpm --filter @forge/guild build`: passed; `/`,
  `/members/[memberId]`, and `/sitemap.xml` build as intended.
- `pnpm analyze:react:changed --base=reforge/main`: passed for all tracked
  changed React files. Full Guild analysis parsed every new Guild component;
  its only reported failure is the unchanged analyzer parser limitation in
  `src/trpc/react.tsx`, also present before this feature.
- Playwright screenshots and vision review at 1440×900, 1024×768, 390×844,
  and 320px confirmed the compact masthead, readable card density, editorial
  profile hierarchy, aligned identity rows, Knight Hacks wordmark, mobile fit,
  reduced-motion behavior, and absence of document-level overflow.
- `rg ISSUES_FEATURE_ENABLED` outside Legacy: no matches.
- `git diff --check`: passed.
- Known unrelated baseline: Blade's production build compiles and then fails
  while prerendering the pre-existing `/admin/forms/sections` route. Focused
  Blade tests, lint, and typecheck pass.

## Links

- PRs:
- Issues:
- Discord/thread context:
