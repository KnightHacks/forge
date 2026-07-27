# Codebase Maintainability Status

Current phase: Discovery complete; direction partly decided; implementation not started

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

## Open questions

- Which of the three permission semantics is intended? A permission key currently
  means union-across-roles (87 procedures), per-granting-role (issues, 14), or
  union-plus-section-membership (forms, 24). Officers grant all three from one
  checkbox list, and the Blade nav gates assume the union model for all of them.
- Is `READ_CLUB_DATA` the intended bar for the all-member resume ZIP, and should
  that gate move into `packages/api`? Today the only check is `canAccessAnalytics`
  imported from a Blade nav helper.
- What is the house rule for mutation feedback? Currently 15 toast / 14 inline
  across 8 state-variable names, with the events feature split against itself.
- Should `packages/api/src/utils` extraction be blessed (testability is a real
  reason the principles never listed) or reversed toward fat routers? The docs
  say one thing and 19,521 lines say the other.
- Do the ten unaudited mutations — including `member.deleteMember`, which hard
  deletes User, Member, Permissions and FormResponse rows — stay unaudited?

## Task list

### Phase 0 — gates and enforcement, no product code

- [x] Fix the red test baseline in `@forge/api` (`3921e365`).
- [x] Fix repo-wide `pnpm format` (`4a7678e2`).
- [ ] Fix the 7 pre-existing `pnpm lint` errors in club, cron, tk, validators.
- [ ] Widen `packages/api/src/tests/audit/coverage.test.ts` to discover routers
      from the filesystem instead of the hand-maintained 10-entry list, and
      declare `discordArchive.getHealth`.
- [ ] Enable `import/no-relative-packages` and `import/no-extraneous-dependencies`
      in `tooling/eslint/base.js`; raise `consistent-type-imports` to error.
- [ ] Add dead-code detection and wire it into the gate.
- [ ] Add pre-commit and pre-push hooks so the gate runs without CI.

### Phase 1 — harness

- [ ] Add jsdom + Testing Library and prove one interaction test fails correctly.
- [ ] Extract the disposable-Postgres harness into a reusable integration path.
- [ ] Strip the Tailwind-class and exact-pixel assertions that will false-alarm.
- [ ] Add `*.contract.test.ts` for `event`, `email`, `forms`, `member-admin`,
      `roles` before any router move. Four routers already have this file.

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

## Validation / commands

- `pnpm test`: 23/23 Turbo tasks, 160 test files green as of `4a7678e2`.
- `pnpm --filter=@forge/api test`: 55 files / 323 tests, identical with and
  without `CI=true`. Before the fix, local reported 7 failing files and silently
  skipped 25 tests that CI ran.
- `pnpm format`: 19/19 green as of `4a7678e2`.
- `pnpm lint`: RED. 7 errors — `apps/club/src/app/teams/team-roster.ts:8` (3
  unsafe-return/call/member-access), `apps/tk/src/index.ts:62,66` (2 unsafe any),
  `apps/cron/src/crons/issue-reminders.ts:25` (auto-fixable), and
  `packages/validators/src/tests/discord-archive.test.ts:52`, which is a false
  positive: the literal intentionally exceeds `MAX_SAFE_INTEGER` to prove the
  schema rejects numeric snowflakes.
- `pnpm --filter=@forge/api typecheck`: passed.
- Audit coverage blind spot: `coverage.test.ts:11-22` scans 10 of 18 routers. 131
  permProcedures sit inside the guardrail; 1 sits outside it and is undeclared
  (`discordArchive.getHealth`).

## Links

- PRs:
- Issues:
- Discord/thread context: Claude Code session, 2026-07-27
