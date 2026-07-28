# Codebase Maintainability Status

Current phase: Phases 0-4 complete on `reforge/refactor`; awaiting human review and
merge. Component splits stopped after Tier 2 by design — see Deferred.

## Final state — 2026-07-27

All five gates green, forced and uncached: `format` 19/19, `lint` 25/25,
`typecheck` 27/27, `test` 23/23, `build` 16/16. Clean tree. 36 commits.

517 files changed, +28,781 / -22,013 against `reforge/main`.

Tests grew from a suite that could not verify a refactor to **205 files and 1,211
tests**. Blade alone went from 56 files / 178 tests to 93 / 514 — most of that is
coverage for logic that had never been reachable by any test, not new features.

Three of four gates were red on committed code when this started, and `build`
was red too but nobody had run it. All five now pass, and the reasons they were
red are fixed rather than suppressed.

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

## Standing decisions — 2026-07-27, authorized for autonomous work

The owner stepped away and authorized completing the project without further
questions. Where a new decision arises, resolve it by having 2-3 agents argue it
out and record the outcome here.

**Process**

- All work lands on one branch, `reforge/refactor`. Do not push. Do not merge to
  `reforge/main`; the owner merges everything on return.
- Definition of done: maintainable, readable, beginner-friendly, and
  agent-friendly. Loop until that holds, not until a task list empties.

**Scope**

- Full scope, through docs and skills, including moving organizational state
  into admin-managed tables. This answer is the explicit schema-change approval
  `AGENTS.md` requires.
- Org state to migrate: **Discord IDs and role mappings** (39 snowflakes, 6 team
  director role IDs). Those change with the server and the officer team.
- Hackathon state is **deleted, not migrated**. Hackathon work is intentionally
  deferred — the owner finished Club work and paused to refactor before the
  high-risk hackathon phase. Reforge has little or no hackathon notion in new
  Blade; where it does (the Knight Hacks VIII class/role map, the `HACKATHONS`
  namespace), scrap it. Old hackathon behavior is preserved in `legacy/`.
- Dues price, semester boundary dates, and event tag points/colors were not
  selected for migration. Event tag data is already superseded by the
  `knight_hacks_event_tag` table, so that constant is a delete, not a move.
- `legacy/` will be deleted at cutover. Code whose only consumers are there is
  dead. This unblocks delete tiers 3 and 4.

**Behavior**

- Divergent implementations may be consolidated. Choose the safest behavior per
  family, argue it with agents, and land each as its own PR with a test pinning
  the choice. `catalogValue` is data integrity, not style: one of the four
  already differs and stored form responses may already mismatch their options —
  investigate as a possible live bug.
- Timezone: `America/New_York` everywhere via `EVENTS.CALENDAR_TIME_ZONE`, with
  an explicit UTC formatter for true date-only columns.
- Mutation feedback: toast plus `mutation.isPending` everywhere, through one
  `useFeatureMutation` wrapper. Inline errors only for field-level validation.
- Forms respondent state: wire the tested 7-state implementation in and retire
  the 3-state inline one, as its own PR. Respondents should learn why a form is
  unavailable rather than always seeing "closed".
- `pnpm build` is red on `apps/2025` and `apps/gemiknights`; fix it. It gates
  safe dependency removal.

**Access and audit**

- Move the resume-bundle gate into `packages/api` and keep `READ_CLUB_DATA`. The
  platform function must not trust its caller.
- Audit every `permProcedure` mutation, plus any `protectedProcedure` mutation
  that deletes data or moves money. Enforce it in the coverage guardrail so the
  next gap fails. Self-service deletion is audited too.
- Register `member-admin` as `api.memberAdmin.*` and update call sites. The API
  surface snapshot catches anything missed.

**Skills**

- Delete the seven vendored skills. Replace with a few Forge-authored,
  codebase-specific ones: `forge-react`, `forge-api`, `forge-placement`, plus the
  existing three artifact writers, `frontend-design`, `deslop`, and a new
  scope-derived `forge-review` swarm skill. Nothing a generic tutorial would say.

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

## User-visible changes

Everything else in this branch preserves appearance. These two do not, and both
are consequences of work that was asked for rather than incidental drift.

1. **The Club team tab strip is absent while the roster loads.** _Owner accepted
   2026-07-28, with a follow-up: "we will just need to make a proper skeleton
   loader or good SSR for the club team member fetch since it isnt at build time
   anymore."_

   It previously rendered all eight tabs at count 0, because the team list was
   compiled into the static export from `TEAM.CLUB_TEAM_DEFINITIONS`. Making the
   team list officer-managed data means `apps/club` cannot know it at build time
   — `output: "export"` has no server runtime and no database access — so the
   list now arrives with the roster. During the deferred fetch the heading reads
   "Our Teams" and the tab strip is empty, then both populate.

   The gap is unavoidable while the list is configurable; only its presentation
   is in play. Being addressed now — see the loading-state entry in the task
   list.

2. **`roles.ts` no longer guesses `eventFeedbackExcluded` when a Discord role is
   linked.** It set the flag by matching the new role's _name_ against the same
   18 strings this work exists to delete. A role being linked has no
   classification yet, so there is nothing to derive an honest answer from. The
   durable source, `auth_roles.event_feedback_excluded`, is untouched and
   already correct for all 19 live roles. Only the relink-a-staff-role path
   changes, and the toggle belongs in the same deferred admin UI as the Discord
   config's.

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

### Phase 3 — components and routers

- [x] `memberAdmin` registered as its own namespace; audit keys now name a real
      client path (`3f53a258`).
- [x] `event.ts` and `email.ts` split; `analytics` and `discord-archive`
      reunified; `utils/forms/platform.ts` split by concern.
- [x] `HydrateClient` deleted from all 25 boundaries and from `trpc/server.ts`;
      six `initialData` bridges converted to server props (`b303b639`).
- [x] Tier 1 pure-code extraction from the five largest components.
- [x] Tier 2 hook extraction from the same five (`7dbf5cc2`).
- [x] Visual baselines built and proven (`5098166e`). Nine `toHaveScreenshot`
      assertions across two viewports — the only ones in the repo. Proven by
      mutation: collapsing two siblings of a `space-y-3` container leaves
      typecheck, lint and 515 unit tests green while failing two baselines with
      a 12px height delta, exactly the deleted gap. Confirmed not to fire on
      harmless nesting.
- [x] **Tier 3 — JSX movement, on the two components the baselines cover.**
      `admin-form-builder.tsx` 1,747 → 450 across eleven siblings (`d988b73d`);
      `issue-workspace.tsx` 1,308 → 249 across four (`655621d7`). 3,055 lines of
      JSX moved. Baselines re-run by hand afterwards: 9/9 pass, zero pixels
      moved. Both were verified a second way before that — the form builder by
      diffing `document.body.innerHTML` against a checked-out copy of the
      pre-refactor file across eleven scenarios, the issue workspace by
      comparing `className` and JSX-tag multisets and proving every original
      line was carried over exactly once.
- [ ] **Six components remain oversized, and they stay that way on purpose.**
      `analytics-dashboard.tsx` (2,210), `member-detail-dialog.tsx` (1,596),
      `email-portal-workspace.tsx` (1,593), `role-management-dashboard.tsx`
      (1,285), `event-admin-dashboard.tsx` (1,222) and one more have **no
      visual baseline**. Splitting their JSX without one is precisely the
      unverified change this effort exists to prevent, and the rule does not
      get to bend because the remaining files are the annoying ones.

      Two of them cannot be baselined without new infrastructure: the analytics
      dashboard and the email portal both read the database unfiltered (1,124
      real members against a 13-member fixture) and compute rolling 365-day
      windows server-side, where `page.clock` cannot reach. A generated
      baseline literally read "322 of 365 active days". The unblocking work is
      a migrated disposable database for visual runs, not more careful
      screenshotting.

      I initially recorded `member-detail-dialog.tsx` as the cheap next one,
      because the dialog is URL-driven (`?member=<id>`) and the admin members
      table already has a baseline. That was wrong, and the correction is the
      useful part.

      `getMemberDiscordEngagement(userId, now = new Date())` computes
      `activityEndDate` from the **server** clock, which `page.clock` cannot
      reach. With zero Discord messages the activity tracker does not disappear:
      `firstActivityDate` falls back to `activityEndDate`, so the loop emits one
      month, labelled from the server clock, whose day grid is
      `activityEndDate.slice(8, 10)` cells long — today's day-of-month. That
      baseline would drift **daily**, not monthly. Worse than analytics, not
      cheaper.

      **The real unlock, and it is one thing, not three.** Every blocked surface
      is blocked on a server-side `new Date()`. The seam already exists —
      `getMemberDiscordEngagement` takes `now` as a defaulted parameter — and
      the repo already has a server-side E2E switch, `isBladeE2E`, used by
      `utils/audit/service.ts` to pin an event id. Pinning "now" behind that
      same flag makes the member dialog baselineable outright and removes half
      of what blocks analytics; the other half is the unfiltered read, which
      needs the migrated disposable database.

      Deliberately not built here. It is a product-code change in
      `packages/api` whose failure mode is a wrong clock in production, so it
      wants its own bundle, its own review, and a test proving the override is
      inert when the flag is off. It should not ride along inside a refactor
      whose whole premise is that unverified changes are how this repo got
      here.

### Phase 4 — docs and skills

- [x] Seven vendored skills deleted (10,462 lines); three Forge-authored ones
      written, plus `forge-review` (`cbd5a6b7`, `187ef884`).
- [x] Skill descriptions made pushier after running skill-creator's optimizer;
      the measurement was inconclusive and the reasons are recorded (`366c2afc`).
- [x] `docs/API-AND-PERMISSIONS.md` rewritten against the code (`e4b8b87c`).
- [x] `docs/ARCHITECTURE.md` corrected (`3d3daf0e`).
- [x] `docs/REPO-CONVENTIONS.md` updated for the removed HydrateClient pattern
      and the server-read-to-props rule.

### Deferred — own feature track, not this change

- [ ] Move organizational state out of `@forge/consts` into admin-managed tables.
- [ ] The behavior-changing consolidations listed in the decision log.

## What this turned out to be about

The recurring shape was not missing tooling. Forge builds good guardrails and
then routes around them. CI is well designed — lint, format, test, typecheck,
build, three migration jobs including a prod-like upgrade smoke test — and it has
never run on a single line of Reforge code, because `push` triggers only on
`main` and all 88 commits arrived by local merge. The audit coverage test is
genuinely clever and scanned 10 of 18 routers. Sherif was wired into postinstall
and caught a dependency mistake within seconds of being given one.

The most expensive problems were invisible rather than hard. `pnpm build` failed
for every Next app because of one line in a local `.env`, which Next warned about
on the first line of every build. `pnpm.overrides` was ignored with a warning on
every pnpm invocation, leaving the React version pins inert. Both had been
shouting for months.

And the sharpest lesson for the process itself: the feature-bundle framework
recorded the Club roster deferral perfectly — three times, plus a test enforcing
it — and still could not catch that `apps/club` was left calling a procedure that
no longer existed. The artifacts were not wrong. Nothing in the process asked
_who else calls this_. That check is now a permanent rule in `forge-review`.

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
