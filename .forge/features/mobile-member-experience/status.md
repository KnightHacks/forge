# Mobile Member Experience Status

Current phase: Implemented / validated

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision Log

- 2026-06-26: Created branch `reforge/mobile-member-experience-spec` from clean `reforge/main`.
- 2026-06-26: Selected mobile member experience as the next Blade Reforge feature after member editing.
- 2026-06-26: Scoped the feature to the existing member flow: landing/sign-in, member signup, member dashboard, and member settings.
- 2026-06-26: Accepted that mobile should be compact and information-dense, not a desktop layout stacked into a phone viewport.
- 2026-06-26: Chose Guild/social profile information as the first mobile dashboard priority.
- 2026-06-26: Chose compact disclosure sections for lower-priority dashboard/form content where useful.
- 2026-06-26: Chose a sticky bottom primary action for mobile member settings update.
- 2026-06-26: Chose to keep the dashboard/settings page transition on mobile.
- 2026-06-26: Chose to move the settings cog into the Guild/profile area on both desktop and mobile.
- 2026-06-26: Accepted natural scroll on mobile, while preferring meaningful first-screen density where practical.
- 2026-06-26: Accepted skeleton parity as a requirement: loading layouts should match loaded layout structure and height closely.
- 2026-06-26: Human approved the lightweight artifact direction and requested implementation.
- 2026-06-26: Implemented Guild-first mobile dashboard ordering while preserving desktop left-details/right-Guild order.
- 2026-06-26: Moved the member settings cog into the Guild/profile card on both desktop and mobile.
- 2026-06-26: Rejected desktop dashboard disclosure controls after review; desktop member details should be visible in normal panels.
- 2026-06-26: Revised mobile dashboard to be lighter: large profile picture, tagline/company context, profile links, and resume action only.
- 2026-06-26: Removed the mobile `Welcome`/member-details block from the dashboard because it made the mobile social profile feel crowded.
- 2026-06-26: Changed member dashboard/settings route transitions to opacity-only. Removing transform/filter keeps mobile fixed action bars anchored to the viewport and reduces animation jank.
- 2026-06-26: Added fixed mobile save bars for settings while preserving desktop sticky behavior.
- 2026-06-26: Review pass changed member signup create to a normal bottom-of-form action so new users do not think there are hidden sections below the sticky bar.
- 2026-06-26: Split settings profile deletion into a separate destructive section so it stays available without crowding the mobile fixed save bar.
- 2026-06-26: Restored `/settings` and `/settings/profile` redirect shims to `/member/settings`.
- 2026-06-26: Review pass revised the mobile dashboard again: no desktop drawers, no mobile `Welcome`/member-details block, larger mobile profile picture, one resume surface in the Guild card, and extra dirty-dialog/delete spacing on settings.
- 2026-06-26: Final CTA pass kept edit/settings actions sticky and moved signup/create back into the form flow at the bottom.
- 2026-06-26: Final mobile dashboard polish made the single Guild/profile card fill the available phone screen height and moved company into a nested inset card.
- 2026-06-26: Skeleton review pass aligned the mobile Guild loading card with the loaded card's avatar controls, company inset, link rows, resume controls, and 3-second debug latency path.

## Open Questions

- None currently.

## Artifact Task List

- [x] Create `.forge/features/mobile-member-experience/`.
- [x] Reverse-prompt on mobile dashboard priority, compact sections, sticky actions, transition behavior, settings cog placement, and scroll expectations.
- [x] Read `docs/agentic-development/README.md`.
- [x] Read `docs/agentic-development/frontend-design-skill.md`.
- [x] Read `apps/blade/DESIGN_SYSTEM.md`.
- [x] Draft `spec.md`.
- [x] Draft `srd.md`.
- [x] Draft `test-cases.md`.
- [x] Human review of artifact direction.
- [ ] Commit artifact branch after implementation validation.

## Implementation Task List

- [x] Inspect current mobile screenshots for `/member/dashboard`, `/member/settings`, and `/form/member-signup`.
- [x] Move dashboard settings cog into the Guild/profile area.
- [x] Rework mobile dashboard to prioritize Guild/social profile content.
- [x] Keep desktop dashboard details out of disclosure controls.
- [x] Simplify mobile dashboard to the lightweight Guild/social profile surface.
- [x] Make the single mobile Guild/profile card fill the available phone screen height.
- [x] Render mobile company as an inset card instead of floating text.
- [x] Add mobile sticky save action to settings.
- [x] Keep signup create action at the bottom of the form.
- [x] Align signup mobile upload treatment with settings.
- [x] Update mobile dialogs for resume, dirty changes, deletion, and upload states.
- [x] Update skeletons to match loaded mobile layout structure.
- [x] Preserve dashboard/settings route transition on mobile with opacity-only motion.
- [x] Update `apps/blade/DESIGN_SYSTEM.md` with mobile density and skeleton guidance.
- [x] Add/extend Blade component tests.
- [x] Add Playwright mobile e2e coverage.
- [x] Run Blade typecheck/test/e2e validation.
- [x] Run final Blade lint/format and changed React analyzer.

## Validation / Commands

- 2026-06-26: `pnpm forge:feature mobile-member-experience "Mobile Member Experience"` created the artifact bundle.
- 2026-06-26: `pnpm analyze:react apps/blade/src/app/_components/member apps/blade/src/app/member apps/blade/src/app/form apps/blade/src/hooks` passed, 12 files analyzed, 0 failures.
- 2026-06-26: `pnpm --filter=@forge/blade test -- member-dashboard member-profile-settings-form` passed, 2 files / 4 tests.
- 2026-06-26: `pnpm --filter=@forge/blade typecheck` passed.
- 2026-06-26: `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test mobile-member-experience.spec.ts` passed, 6 tests.
- 2026-06-26: `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test member-onboarding.spec.ts member-field-editing.spec.ts mobile-member-experience.spec.ts` passed, 28 tests.
- 2026-06-26: `pnpm --filter=@forge/blade lint` passed.
- 2026-06-26: `pnpm --filter=@forge/blade format` passed.
- 2026-06-26: `pnpm analyze:react:changed --base=reforge/main` passed, 7 files analyzed, 0 failures.
- 2026-06-26: `git diff --check` passed.
- 2026-06-26: Review pass: `pnpm --filter=@forge/blade test -- member-dashboard member-profile-settings-form`, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/blade format`, `pnpm analyze:react:changed --base=reforge/main`, and `git diff --check` passed.
- 2026-06-26: Review pass: `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test mobile-member-experience.spec.ts` passed, 6 tests.
- 2026-06-26: Review pass: `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test member-onboarding.spec.ts member-field-editing.spec.ts mobile-member-experience.spec.ts` passed, 28 tests.
- 2026-06-26: Final CTA pass re-ran the same static/unit/mobile/full-member e2e validation after changing signup create to a bottom-of-form action.
- 2026-06-26: Mobile dashboard height/company pass: `pnpm --filter=@forge/blade test -- member-dashboard member-profile-settings-form`, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/blade format`, `pnpm analyze:react:changed --base=reforge/main`, `git diff --check`, targeted mobile e2e, and full member e2e passed.
- 2026-06-26: Skeleton review pass: `pnpm --filter=@forge/blade test -- member-dashboard member-profile-settings-form`, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/blade format`, `pnpm analyze:react:changed --base=reforge/main`, `git diff --check`, and `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test mobile-member-experience.spec.ts` passed.

## Links

- PRs:
- Issues:
- Discord/thread context:
