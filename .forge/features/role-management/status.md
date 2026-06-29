# Role Management Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-06-27: Work targets Blade Reforge on the
  `reforge/role-management` branch from local `reforge/main`.
- 2026-06-27: Human wants the production role-management capability rebuilt
  for Reforge: link Blade roles to Discord roles and configure their permission
  items.
- 2026-06-27: Roles with no effective permission bits must be valid first-class
  cosmetic roles.
- 2026-06-27: Code archaeology confirmed production currently separates role
  configuration (`CONFIGURE_ROLES`) from user-role assignment
  (`ASSIGN_ROLES`), synchronizes linked role membership with Discord, and uses
  the existing `Roles` and `Permissions` tables plus permission bitstrings.
- 2026-06-27: Human approved one `/admin/roles` page with URL-addressable Roles
  and Assignments tabs, capability-specific visibility, and no admin landing.
- 2026-06-27: Discord discovery uses a searchable eligible-role picker plus a
  manual-ID fallback. Blade uses the exact Discord name, and the link is
  immutable.
- 2026-06-27: Cosmetic state is inferred from zero selected permissions without
  a migration; cosmetic roles remain assignable, synchronized, and available
  to future role-aware features.
- 2026-06-27: Roles are unpaginated with search/filtering. Assignment users use
  AND role filters and page sizes 25/50/100/250/500.
- 2026-06-27: Creation syncs immediately and each role has `Sync now`. Batch
  assignment is Discord-first per pair; Discord failure leaves Blade unchanged.
- 2026-06-27: Unlink removes only the Blade link/assignments after the fixed
  phrase, never changes Discord, and protects final administrative access.
  Dependency-management UI and audit transport are deferred; dependency reads
  may block unsafe unlinking.
- 2026-06-27: Human approved the completed spec, SRD, test cases, and immediate
  implementation on this branch.
- 2026-06-28: A one-to-one coverage audit found that the first implementation
  over-relied on helper tests and one broad browser happy path. The suite now
  exercises approved Discord preview, access/cosmetic creation, reconciliation,
  URL state, partial assignment failure, duplicate-row revoke, missing-role,
  dependency, and final-administrator behavior against persisted test data.
- 2026-06-29: Human removed the assignment-table Email column and requested
  consistent desktop toolbar alignment. Both tab toolbars now use matching
  44px search, action, and filter controls.
- 2026-06-29: Role management was split into a thin procedure router, a
  production Discord gateway, and reusable role workflows. Synthetic Discord
  roles, membership states, and failure behavior now live under
  `packages/api/src/tests/support`; production code retains only a guarded
  non-production adapter seam.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Generate validator, API, Blade, and Playwright tests.
- [x] Implement role configuration and Discord reconciliation.
- [x] Implement assignment, safe unlinking, and final-admin protection.
- [x] Implement the responsive `/admin/roles` dashboard and admin navigation.
- [x] Map every approved test case to an automated assertion.
- [x] Add router/database integration coverage for negative and reconciliation
      paths.
- [x] Remove the assignment Email column and align both desktop search
      toolbars.
- [x] Extract role workflows and all synthetic Discord behavior from the
      router.
- [x] Complete targeted and repository validation.

## Validation / commands

- `pnpm forge:feature role-management "Role Management"`: created the feature
  bundle from repository templates.
- Production `main`/`legacy` hash comparison: confirmed the legacy role router,
  configure UI, assignment UI, and both role pages exactly match current
  production behavior.
- Code archaeology covered the auth role/permission schema, permission
  constants and unioning, Discord helpers, daily role sync cron, role bootstrap,
  downstream form/issue references, and the current Reforge admin shell.
- The approved `TC-001` through `TC-013` and `TC-NEG-001` through
  `TC-NEG-006` cases have a maintained one-to-one automation map in
  `test-cases.md`.
- The 6 focused validator tests pass, including exact page sizes, cosmetic
  permission input, strict mutation objects, immutable Discord metadata, URL
  state, batch limits, malformed Discord IDs, and the unlink phrase.
- The 16 focused API role tests pass for permission mapping, discovery and
  count failure, every supported assignment identity, role-filter AND
  semantics, reconciliation planning, final-admin protection, Discord-first
  grant/revoke behavior, and DB compensation in both directions.
- Blade component tests pass for capability-specific tabs and controls, URL
  state, grouped permissions, role detail sectioning, dependencies, cosmetic
  and missing states, and permission-aware admin navigation.
- Focused Playwright role management suite passes all 13 workflows. It now
  includes direct HTTP calls through the real tRPC router plus database
  assertions for access-role initial sync, metadata/membership reconciliation,
  assignment partial failure, duplicate-row revoke, duplicate creation,
  malformed unlink, dependencies, missing Discord roles, and final-admin
  protection. Desktop and phone screenshot workflows remain covered.
- React analyzer passes all 4 new role-management components with zero
  failures. The repository-wide analyzer still reports its pre-existing parser
  failures in current and legacy `trpc/react.tsx` files.
- `pnpm exec tsx scripts/analyze-react-changed.ts --base=reforge/main`: 8
  tracked files, 2 components, and 0 failures. The 4 untracked role-management
  components were analyzed separately with 0 failures.
- `pnpm test`: all 19 Turbo tasks pass. This includes 30 validator tests, 83
  API tests, and 32 Blade tests.
- `pnpm --filter=@forge/blade e2e`: all 50 Playwright scenarios pass, including
  the 13 role-management scenarios and all 37 pre-existing Blade scenarios.
- Validator, API, and Blade typechecks, lint, and formatting pass; `git diff
--check` passes.
- `pnpm --filter=@forge/api build`: passed.
- `NODE_ENV=production pnpm --filter=@forge/blade build`: passed; the route
  manifest includes `/admin/roles`.
- `pnpm verify:push`: formatting and lint pass across the monorepo, and every
  feature-touched package typechecks. The workspace typecheck remains blocked
  only by unchanged `apps/guild` references to the absent `api.guild` router.
- `pnpm verify:precommit`: its default analyzer compares against `origin/main`
  instead of this feature's `reforge/main` base and fails on the unchanged
  current and legacy Blade tRPC wrappers. Targeted feature analysis and changed
  analysis against `reforge/main` pass.
- `pnpm build`: the exact command reaches unchanged application builds and
  fails while the ignored local environment supplies a non-production
  `NODE_ENV`. With `NODE_ENV=production`, Blade and the other reached apps
  build, then the workspace stops at unchanged `apps/club` code that references
  the absent `api.event` router. No file in `apps/club`, `apps/guild`,
  `apps/2025`, or either failing tRPC wrapper differs from `reforge/main`.
- `git diff --check`: passed.

## Links

- PRs:
- Issues:
- Discord/thread context:
