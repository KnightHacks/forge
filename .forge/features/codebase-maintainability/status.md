# Codebase Maintainability Status

Current phase: Phase 0 complete; Phase 1 harness complete; delete pass started

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Why this bundle exists

Seventeen feature bundles were built on separate `reforge/*` branches, merged into
`reforge/main`, and never human-reviewed. They work. This change adds no product
behavior — it converges the idioms those branches independently invented, and
writes the tiebreakers down so the next contributor and the next agent resolve them
the same way.

Two constraints bound everything here: refactors must preserve behavior, and they
must not change how pages look. Changing how a test invokes a route is allowed;
changing what it asserts about behavior is not.

## Decision log

- 2026-07-27: Discovery ran as three agent fleets — a 12-dimension meta-analysis,
  an 8-scout placement/topology audit with three competing target proposals, and a
  React research/dissection pass. The load-bearing claims below were verified by
  hand before being recorded here.
- 2026-07-27: **CI has never run on Reforge code.** `.github/workflows/ci.yml:6-7`
  triggers on push only for `main`, and `git log` shows 0 "Merge pull request"
  commits across 88 commits on `reforge/main`. This is intentional — `reforge/main`
  is a staging branch and the merge to `main` happens at the very end — so CI is
  **not** being changed. Enforcement moves to local gates and a review skill.
- 2026-07-27: Three of four quality gates were red on committed code. `pnpm test`
  and `pnpm format` are now fixed (`3921e365`, `4a7678e2`). `pnpm lint` remains red
  with 7 pre-existing errors; `pnpm typecheck` was already green.
- 2026-07-27: The test suite cannot serve as a refactoring safety net and is
  actively inverted: it false-alarms on component and layout changes while staying
  green through query, transaction, and permission-gate changes. 43 of 55 Blade
  test files use `renderToStaticMarkup`; no jsdom or Testing Library exists
  anywhere; 8 of 177 tRPC procedures are ever invoked, all against a mocked DB.
- 2026-07-27: Owner decided to fix the harness before touching product code — red
  baseline, then jsdom + Testing Library, then one Postgres-backed integration path
  extracted from the disposable-database harness already inside
  `packages/db/src/tests/event-management-migration.test.ts`.
- 2026-07-27: Owner decided to split all eleven 800+ line client components. This
  depends on jsdom landing first; splitting state-heavy components is unverifiable
  until then.
- 2026-07-27: Owner decided to delete `HydrateClient` from all 25 pages rather than
  adopt `.prefetch()`. `prefetch` is called zero times today, so every wrapper
  dehydrates an empty cache. The six `initialData` bridges and the member-dashboard
  client waterfall convert to server props.
- 2026-07-27: Owner decided to delete the seven vendored third-party skills and
  fold anything still correct into Forge-authored skills. The seven `FORGE_NOTES.md`
  files are byte-identical past line 1, so the override mechanism was never used.
- 2026-07-27: `apps/blade/src/lib` is not archaic — it holds 2 files and 62 lines.
  The helpers are real but scattered across 15 differently-named modules under
  `_components/**` (1,637 lines), none named `utils.ts`, so there is no name to
  grep for. This corrects the original hypothesis.
- 2026-07-27: `@forge/utils` is not a junk drawer that grew; it is a pre-reforge
  shelf that shrank. Roughly 75% of its LOC has zero consumers outside `legacy/`,
  while the drawer moved to `packages/api/src/utils` (74 files, 19,521 LOC).
- 2026-07-27: Three independent target-topology proposals, written under opposing
  priors, converged on eleven moves. Convergence under opposing priors is treated
  as the strongest available signal, so those eleven are the approved safe set.
- 2026-07-27: Router topology answer is "mostly no, decisively yes for three":
  keep the 17 namespaces, but register `member-admin` properly, split `event.ts`
  and `email.ts`, and reunify `analytics` with `discord-archive`.
- 2026-07-27: Behavior-changing consolidations are quarantined out of the refactor.
  The five CSV escapers, thirteen date formatters, four `catalogValue` copies,
  three search rankers, and the upload MIME allowlists each ship as their own
  feature PR with a test pinning the chosen behavior.
- 2026-07-27: Owner asked to harden DX tooling (lint rules, dead-code detection,
  React analysis) and to add commit hooks, since CI will not cover this branch.
- 2026-07-27: **Access policy is settled as two named tiers.** Tier one is
  _capability_: a union across all of a user's roles, gating whether a route or
  nav destination is reachable at all. Tier two is _scope_: an exact match against
  the granting role, gating which rows within it are readable or editable. Only
  `issues` and `forms` (including form sections) have a tier two today, and both
  already implement it — `issueAccessForRoles` matches the owning role,
  `evaluateFormSectionAccess` intersects role IDs against a section's editor and
  viewer lists. The remaining 87 procedures are tier one with nothing to scope.
  This is a naming and documentation change, not a behavior change. Where tier one
  passes but tier two yields nothing, the page should redirect server-side rather
  than render an empty screen.
- 2026-07-27: `packages/api/src/utils/<domain>/access.ts` is adopted as the
  standard home for both tiers. 7 of 15 domains already have one; the rest get one.
  `apps/blade/src/app/_components/admin/access.ts` is the _nav_ gate, not a server
  guard — it moves to `src/lib/` and gets a name that does not collide.
- 2026-07-27: Option B chosen for `packages/api/src/utils`. The rule is: extract
  when the logic can be tested without a tRPC context; keep it in the procedure
  when it cannot; a `utils/<domain>/` file holds one cohesive concern. An earlier
  draft of this rule forbade modules whose exports each have a single caller —
  that was withdrawn. `updatePlatformForm` (~170 lines) and
  `updatePlatformFormSettings` (~150) are substantial named workflows, and
  extracting them is the point of Option B, not a violation of it. The real defect
  in `utils/forms/platform.ts` is that one 1,132-line module covers forms,
  responses, sections, exports, and member history; it splits by concern instead.
- 2026-07-27: React findings corrected two earlier claims. The headline `useState`
  counts were per _file_: `email-portal-workspace.tsx` holds three components
  splitting 19/8/1, so the worst single component is 19, and the planned file split
  reduces these counts on its own. Re-measure per component after the split.
- 2026-07-27: `useReducer` is the wrong fix for most of Blade. 74 of 288 `useState`
  initializers are prop-seeded independent form fields, where a reducer only
  renames the setter. Exactly one reducer is warranted: the `questions` array in
  `admin-form-builder.tsx`. The house pattern for record-shaped forms is one
  `useState` holding the whole object plus a typed `update(key, value)`, copying
  `event-form-dialog.tsx:240`. react-hook-form is blocked until
  `packages/ui/src/form.tsx:26-35` stops pinning `ZodType<TIn, TIn>`.
- 2026-07-27: The React 19 Actions family is ruled OUT, and the measured zeros for
  `useActionState`, `useFormStatus`, and `useOptimistic` are correct rather than a
  deficiency. They are not server-action-gated, but Blade's fields are controlled
  Radix primitives, `<form action>` resets uncontrolled fields on success,
  `useFormStatus` needs a parent `<form>` that 161 `isPending` sites do not have,
  and Action errors escalate to `error.tsx` instead of the app's 136 toast sites.
  Mutation state stays on tRPC `useMutation`.
- 2026-07-27: Component splits proceed in three provability tiers, so work starts
  before jsdom exists. Tier 1 is pure code with no React import, provable under the
  vitest config that exists today (~400 lines can leave `analytics-dashboard.tsx`,
  ~500 `email-portal-workspace.tsx`). Tier 2 moves hooks while JSX stays put,
  provable by a byte-identical SSR HTML diff. Tier 3 moves JSX and is the only tier
  requiring jsdom, Testing Library, and screenshots.
- 2026-07-27: The chief appearance hazard is sibling-scoped Tailwind. Blade's
  `adminPageLayoutClassName` ends in `space-y-4 sm:space-y-6`, which is `> * + *`,
  so introducing one wrapper `div` silently removes a gap; `divide-y` and
  `first:border-l-0` fail the same way. An extracted child returns a fragment or
  the original single root, never a new wrapper. A submit button never leaves its
  `<form>`.
- 2026-07-27: `typescript: { ignoreBuildErrors: true }` stays. An earlier note
  called it a hole to close; that was wrong. Six apps set it, `typecheck` is a
  first-class Turbo task that passes 27/27, `verify:push` runs it, and CI's build
  job already lists it under `needs`. Turning it on only makes every `next build`
  re-run `tsc` for coverage that exists elsewhere.
- 2026-07-27: `eslint-plugin-react-hooks` 7.0.1 already runs `set-state-in-effect`,
  `set-state-in-render`, `purity`, and `immutability` at error, and all three
  mega-components lint clean. Verified by repro that `set-state-in-effect` does not
  fire for `useEffect(() => { setV(x) }, [x])`, the prop-mirroring form — so the
  existing rules give a false all-clear on the pattern that matters. Static checks
  must be verified against a repro before being trusted as coverage.

## Open questions

- Is `READ_CLUB_DATA` the intended bar for the all-member resume ZIP, and should
  that gate move into `packages/api`? Today the only check is `canAccessAnalytics`
  imported from a Blade nav helper.
- What is the house rule for mutation feedback? Currently 15 toast / 14 inline
  across 8 state-variable names, with the events feature split against itself.
- Do the ten unaudited mutations — including `member.deleteMember`, which hard
  deletes User, Member, Permissions and FormResponse rows — stay unaudited?
- Should the two tier-two mechanisms converge? `issues` matches the owning role
  directly; `forms` intersects role IDs against per-section editor and viewer
  lists. Both are correct for their domain, so this may stay as two shapes under
  one documented vocabulary rather than one implementation.

## Task list

### Phase 0 — gates and enforcement, no product code

Complete. Branch `reforge/phase-0-gates`, worktree `forge-reforge-phase-0`.

- [x] Fix the red test baseline in `@forge/api` (`3921e365`).
- [x] Fix repo-wide `pnpm format` (`4a7678e2`).
- [x] Clear the standalone lint errors in cron and validators (`f276e685`).
      The `@forge/tk` errors were stale-`node_modules` artifacts and did not
      reproduce after a clean install; the `@forge/club` errors were the Club
      roster regression below.
- [x] Restore `guild.getPublicClubTeamRoster` (`04d9797e`, ledger `28caeb9c`).
- [x] Discover audit-coverage routers from disk (`6d649151`).
- [x] Enforce the package boundary in lint and break the auth/utils cycle
      (`769c66df`).
- [x] Let the whole suite run without a local `.env` (`e8ce6f36`).
- [x] Add knip, report-only (`ce890725`).
- [x] Warn on oversized files and functions (`d3d9d69a`).
- [x] Add lefthook gates, opt-in via `pnpm hooks:install` (`e73c0dce`).

Deliberately not done in Phase 0:

- A per-component `useState` lint rule. The counts are per-file today and the
  planned splits change them, so the rule would be written against numbers that
  are about to move. Phase 3.
- A `--max-warnings` ratchet on the 171-warning baseline, for the same reason.
- Moving `packages/db/scripts/` to a root-level home. That is the real fix for
  its relative imports, which are exempted with a comment for now.

### Phase 1 — harness

- [x] Add jsdom + Testing Library, opt-in per file, scoped by a written rule to
      invariants that survive a redesign (`ba638d37`). Proven by mutation, not by
      passing.
- [x] Extract the disposable-Postgres harness into `@forge/db/testing`
      (`21e8c2cd`). Proven against a real database.
- [x] Strip the layout, pixel, and markup-anchor assertions (`734567af`). 132
      removed, 6 tests deleted, 3 over-removals caught by audit and fixed.
- [x] Pin the client-facing API surface instead of per-router contract tests
      (`40e9082d`). Cross-router moves are what Phase 3 changes, and a per-router
      file cannot see them.
- [ ] Second strip pass over the five unassigned files: `member-event-feedback`
      plus four e2e specs still hold the same patterns.

### Phase 1b — delete pass, pulled forward

Deletion is compiler-provable, so it does not depend on the weak suite, and every
dead symbol is a placement decision Phase 2 would otherwise pay for and discard.
Six scouts produced candidates with grep proof; six skeptics then attacked them
and refuted 8. Verified total: ~2,850 LOC across 22 files and ~80 exports.

- [x] Tier 2 — ten unreferenced app files (`00b8c530`).
- [ ] Tier 1 — declare ~25 undeclared dependencies. Includes real latent
      breakage: `apps/2025/next.config.js` top-level-awaits `jiti`, which it does
      not declare, and only resolves because of `node-linker=hoisted`.
- [ ] Tier 6, 9, 10 — zero-reference app-local exports, then dependency removal.
- [ ] Tier 3, 4, 7, 8 — hold pending the decisions below.
- [ ] Tier 5 — gated: deleting it removes ~388 lines of genuine unit tests for
      logic the live path re-implements untested. Needs a human answer on whether
      the extract-then-wire plan for `utils/forms/responses.ts` is abandoned.

### Phase 2 — the eleven converged moves

- [ ] Delete-only pass, with grep proof per removed symbol.
- [ ] Create the Blade shared component tier; move the six agreed files.
- [ ] Move `_components/admin/access.ts` to `src/lib/admin-access.ts`.
- [ ] Move the two loose alumni components into `_components/admin/alumni/`.
- [ ] Fix `packages/utils/src/discord.ts` relative import and missing `server-only`.
- [ ] Make `EVENTS.CALENDAR_TIME_ZONE` the single timezone source.
- [ ] Create `packages/api/src/utils/member/access.ts`; delete the duplicated gate.
- [ ] Extract the cross-process wire contracts (download cookie, storage keys).
- [ ] Merge the byte-identical duplicates that carry no behavior risk.

### Phase 3 — components and routers

- [ ] Split the eleven 800+ line client components. Needs Phase 1.
- [ ] Delete `HydrateClient` from 25 pages; convert the six `initialData` bridges.
- [ ] Register `member-admin` as its own namespace; fix the audit coverage keys.
- [ ] Split `event.ts` and `email.ts`; reunify `analytics` and `discord-archive`.

### Phase 4 — docs and skills

- [ ] Rewrite or delete `docs/API-AND-PERMISSIONS.md` and the stale half of
      `docs/ARCHITECTURE.md`; document the `createAdminAuditEvent` convention.
- [ ] Update `docs/REPO-CONVENTIONS.md` with the settled placement tiebreakers.
- [ ] Delete the vendored skills; write Forge-authored replacements.
- [ ] Add a scope-derived, tiered `forge-review` swarm skill.

### Deferred — own feature track, not this change

- [ ] Move organizational state out of `@forge/consts` into admin-managed tables.
- [ ] The behavior-changing consolidations listed in the decision log.

## Phase 1 findings

- **`pnpm build` is a fourth red gate.** `apps/2025` and `apps/gemiknights` fail
  prerendering `/_global-error` with a React `useContext` error. Confirmed
  pre-existing by stashing all local changes and rebuilding at HEAD. CI would
  have caught it; CI does not run here.
- **knip has three blind spots**, so it is not the delete list on its own:
  `ignoreExportsUsedInFile: true`, `packages/*/src/index.ts` treated as an entry,
  and `packages/ui`'s `"./*"` exports map making every file an auto-entry. It
  reported 0 of the 11 dead `packages/ui` files.
- **Most "duplicate exports" knip reported are live aliases**, not dead code —
  `ALUMNI_ROLE = PROD_ALUMNI_ROLE`, `eventTagArchiveSchema = eventTagIdSchema`.
  Eight candidates were refuted outright by the adversarial pass.
- **`EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES` is hand-copied** into
  `routers/roles.ts:90-109` rather than imported — a duplication finding that
  looked like a dead-export finding.
- **The explicit type annotation on `db` was hiding `$client`**, leaving the
  connection pool unreachable for shutdown. Writing a type out by hand can narrow
  away part of the value.
- **A test that only renders and does not throw is not coverage.** Six Blade
  tests asserted nothing but markup; one compared two counts that are equal by
  construction.

## Phase 0 findings

- `guild.getPublicClubTeamRoster` was deferred by Guild Collective with a test
  enforcing its absence, and nothing in that bundle mentions `apps/club`, which
  calls it. The feature bundle captured the decision faithfully and still could
  not catch the breakage, because no step asks who else calls a removed
  procedure. The review skill needs a cross-app consumer check.
- The package-boundary rule was silently dead in 13 packages, including
  `@forge/api` and `apps/blade`, because `restrictEnvAccess` redefines
  `no-restricted-imports` and ESLint rules replace rather than merge. A rule can
  be present, correct, and enforcing nothing.
- `packages/auth` and `packages/utils` were mutually dependent. The relative
  import was not sloppiness; it was load-bearing, because declaring the edge
  honestly makes Turbo reject the graph. The cycle existed only to type two dead
  exports whose sole callers are in `legacy/`.
- `pnpm lint` replayed a cached failure after the underlying error was fixed.
  A red gate is worth re-running with `--force` before believing it.
- Tests previously read whatever was in a developer's local `.env`, so the same
  commit could produce different results for different people.

## Validation / commands

- `pnpm test`: 23/23 Turbo tasks, 160 test files green as of `4a7678e2`.
- `pnpm --filter=@forge/api test`: 55 files / 323 tests, identical with and
  without `CI=true`. Before the fix, local reported 7 failing files and silently
  skipped 25 tests that CI ran.
- `pnpm format`: 19/19 green as of `4a7678e2`.
- End of Phase 0, on `reforge/phase-0-gates`, all four gates green together:
  `pnpm format` 19/19, `pnpm lint` 25/25 (forced, uncached), `pnpm typecheck`
  27/27, `pnpm test` 23/23 across 160 test files.
- `pnpm test` with `.env` removed entirely: 23/23. The suite no longer needs a
  local env file.
- New audit guardrail proven to fail for the intended reason: removing the
  `discord-archive.getHealth` declaration gives 1 failed / 323 passed; restoring
  it gives 324 passed.
- `npx lefthook run pre-commit`: 1.3s. `npx lefthook run pre-push`: 64.7s
  (verify 56.8s, test 8.0s). Both verified, then uninstalled — hooks are opt-in.
- `pnpm knip` baseline: 11 unused files, 28 unused exports, 3 unused exported
  types, 6 duplicate exports, 82 unused and 38 unlisted dependencies. The
  dependency counts are largely resolver noise and gate nothing yet.
- `max-lines` / `max-lines-per-function` baseline: 171 warnings — 69 files over
  500 lines, 102 functions over 200.
- Turbo rejects the graph as cyclic if `@forge/auth` declares `@forge/utils`
  while `@forge/utils` devDepends on `@forge/auth`; confirmed by making the
  change and reading the error, then breaking the cycle.

## Links

- PRs:
- Issues:
- Discord/thread context: Claude Code session, 2026-07-27
