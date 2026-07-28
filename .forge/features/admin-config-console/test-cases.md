# Admin Config Console Test Cases

Status: Draft — awaiting owner approval

> This file owns observable proof. Do not generate implementation tests until
> the human approves these cases.

## Scope

These cases prove the officer-only console at `/admin/roles/config`: the
server-side gate, editing the fourteen `knight_hacks_discord_config` rows, the
inert/live distinction, the `guild` confirmation, honest propagation copy,
classifying `knight_hacks_club_team_role` rows including a first-time
classification, the effect of every classification field on
`getVisiblePublicClubRoster()` and on the Guild profile badge, the absence of
create and delete in all three tables, audit coverage, and concurrent editing.

They also cover the `event_feedback_excluded` switch added to the role detail
dialog on `/admin/roles`, its past-events warning count, and the element-scoped
visual baseline of that dialog, recorded **before** the switch is added to it.

They intentionally exclude: creating or deleting Discord config rows, teams or
classifications (their _absence_ is asserted, their behaviour is not); editing
teams; a new permission key; teaching `getDependencyCounts` about
`ClubTeamRole`; changing when `event_feedback_excluded` is evaluated; live
Discord traffic; and cross-process convergence of the config cache in
`apps/cron` and `apps/tk`, which is stated as copy rather than exercised.

## Levels

Every case names one of four levels. The rule is the cheapest level that can
actually observe the claim.

- **pure unit** — Vitest, no DOM, no database. Exported functions and
  input schemas. Fast enough to be exhaustive, so the combinatorial matrices
  live here.
- **jsdom** — Vitest with `jsdom`/`renderToStaticMarkup` in
  `apps/blade/src/tests`. Rendered markup, dialogs, copy, disabled states,
  pending states, and page/route modules with `~/server/auth` and
  `~/trpc/server` mocked. Precedent: `resume-bundle-route.test.ts`,
  `event-check-in-loading.test.tsx`.

  **Neither environment loads CSS.** No case here can observe a height, a
  width, or which of two renderings a viewport shows: `hidden md:block` and
  `md:hidden` are both in the tree at once, and every element measures zero.
  Where a claim needs one of those, this file does one of two things and says
  which:
  - **class contract** — asserts that a named class token is present on a named
    element. It is a statement about the contract with Tailwind, not about
    pixels, and it is worth writing only where the token _is_ the decision
    (`min-h-11` encodes the 44px hit target `DESIGN_SYSTEM.md` requires; the
    `md:` pair encodes "two renderings, not one").
  - **visual baseline** — where the claim is genuinely about pixels.

  Both are deliberate. `apps/blade/src/tests/setup.ts:22-30` names raw Tailwind
  class assertions as this suite's existing failure mode, in ~34 places, so a
  new one is not written by accident and never stands in for a behavioural
  assertion. Everything that can be reached by role and accessible name is
  reached that way instead.

- **Postgres integration** — Vitest against a disposable database from
  `@forge/db/testing` (`provisionDisposableDatabase`, guarded by
  `describe.runIf(canRunDatabaseTests())`). Precedent:
  `packages/api/src/tests/integration/database-harness.test.ts`. Required
  wherever the claim is about SQL: `FOR UPDATE`, `ON DELETE cascade`, check
  constraints, transaction boundaries, and the joins in `loadClubTeamConfig`
  and `getVisiblePublicClubRoster`. `getVisiblePublicClubRoster()` closes over
  the module-scope `db`, so these tests must point `DATABASE_URL` at the
  disposable database **before** importing `@forge/db/client`.
- **Playwright** — `apps/blade/src/tests/e2e`, macOS-only, does not run in CI.
  Every case placed here carries its justification. The bar: the claim is about
  bytes the server sends, or about pixels, and no cheaper level can see it.
  Where a Playwright case exists, a CI-runnable counterpart exists too, except
  for the pixel baselines, which have no counterpart by construction.

## Test placement plan

- `packages/validators/src/tests` — input schemas for both console namespaces,
  the reused `/^\d{17,20}$/` snowflake schema, and the new
  `AUDIT_ACTION_CATALOG` / `AUDIT_TARGET_TYPES` entries.
- `packages/api/src/tests/config` — new. Procedure surface, gate behaviour with
  the caller factory, and the inert/live derivation.
- `packages/api/src/tests/guild` — extends `club-roster.test.ts` and
  `role-callout.test.ts` with the classification-change and label-fallback
  matrices against `createClubTeamConfig` fixtures.
- `packages/api/src/tests/integration` — disposable-Postgres cases: roster
  round trip, concurrency, cascade, check constraints, feedback count.
- `packages/api/src/tests/audit/coverage.test.ts` — already auto-discovers
  `permProcedure` declarations from every file in `src/routers`; the new
  routers must satisfy it without the test being weakened.
- `packages/api/src/tests/root/__snapshots__/api-surface.test.ts.snap` — the
  179-path snapshot, updated in the same commit.
- `packages/utils/src/tests/discord-config.test.ts` — the cache's own behaviour,
  driven by calling `invalidateDiscordConfigCache()` directly. It cannot observe
  a console mutation: `@forge/utils` does not depend on `@forge/api`
  (`packages/utils/package.json`), and not inverting that dependency is why the
  read path lives in `@forge/utils` in the first place. Anything that has to go
  through the mutation belongs in `packages/api/src/tests/integration`.
- `apps/blade/src/tests/admin` — page module, console sections, dialogs,
  confirmations, toasts, per-row pending state, absent affordances, loading
  skeleton, eyebrow uniqueness.
- `apps/blade/src/tests/e2e/role-management.spec.ts` — extended, not replaced.
- `apps/blade/src/tests/e2e/visual` — baselines and fixtures.

Expected commands:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/api test`
- `DATABASE_URL=postgres://…@127.0.0.1:5432/postgres pnpm --filter=@forge/api test`
  (the integration cases skip without a loopback URL)
- `pnpm --filter=@forge/utils test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/blade e2e` (macOS only, not CI)
- `pnpm --filter=@forge/blade e2e --update-snapshots` when recording baselines

## Test cases

### TC-001: The officer gate runs before the reads and the data never leaves the server

Setup:

- An officer (`IS_OFFICER`), a `CONFIGURE_ROLES`-only user, an
  `ASSIGN_ROLES`-only user, a signed-in member with no role capability, and an
  unauthenticated request.
- Discord config rows whose `productionId` values are recognisable literals, and
  at least one classification with a distinctive `rosterLabel`.

Action:

- Request `/admin/roles/config` as each caller.

Expected observations:

- Every non-officer, including `CONFIGURE_ROLES`-only, is redirected to
  `/admin/roles`. The unauthenticated request is redirected to `/`.
- `redirect()` is reached **before** any console read is awaited: with
  `~/trpc/server` mocked, the console read mocks record zero calls for every
  non-officer. `api.roles.getPermissions()` is the only call made.
- No snowflake literal, label, description or `rosterLabel` from the fixture
  appears anywhere in the bytes of the redirect response or of the
  `/admin/roles` page that follows it.
- The officer renders the console.

Level:

- jsdom for the page module — mock `~/server/auth` and `~/trpc/server`, assert
  the thrown `redirect` target and the zero call counts. This is the primary,
  CI-runnable proof and it is stronger than a navigation assertion, because it
  proves the _ordering_ rather than the outcome.
- Playwright for the last observation, added to the existing
  `role-management.spec.ts` capability test. Justified: "a non-officer never
  gets the data rather than merely not seeing it" is a claim about the bytes on
  the wire, including the RSC flight payload. A module test with a mocked tRPC
  client cannot see a payload that a future refactor serialises through a
  different path; a rendered response body can.

### TC-002: Both console namespaces refuse every non-officer caller

Setup:

- The caller shapes from TC-001, built with `createCallerFactory` and a mocked
  `@forge/db/client`, following `packages/api/src/tests/admin/permission-procedure.test.ts`.

Action:

- Call every query and mutation in both console namespaces directly.

Expected observations:

- Authenticated non-officers receive `FORBIDDEN`; unauthenticated callers
  receive `UNAUTHORIZED`.
- `CONFIGURE_ROLES` alone is not sufficient for any of them. The console is
  officer-only, not role-admin-only, and the two are easy to conflate because
  the parent route accepts either.
- No procedure returns partial data before failing, and no mutation reaches the
  database.

Level: pure unit.

### TC-003: A Discord snowflake change persists and survives a reload

Setup:

- An officer, and the `vip_role` row.
- **Save and restore.** `knight_hacks_discord_config` is seeded by migration
  0025 and no e2e fixture creates, deletes or resets it. The fourteen rows are
  shared global state on the developer's own Postgres, which every other spec
  and their running dev Blade also read, so an unrestored edit is permanent.
  The spec reads the row's four editable columns in `beforeAll`, and writes
  them back in `afterAll` — unconditionally, so a failed assertion still
  restores. It asserts the restore, rather than assuming it.
- **An inert key, not a live one.** `vip_role` is read by nothing (TC-005), so
  a leaked value is inert too. `alumni_role` is not a safe choice despite being
  a role row: `apps/cron/src/crons/alumni-assign.ts:18` resolves it nightly to
  grant and revoke a real Discord role. `guild` is worse still.

Action:

- Open `/admin/roles/config`, edit `productionId` and `developmentId`, press
  Save, then reload the page.

Expected observations:

- The saved values are the ones rendered after the reload.
- The values arrive as resolved props from the server component; there is no
  client query holding them and no `initialData` seeding, so the reloaded
  values cannot come from a cache.
- Editing `productionId` alone leaves `developmentId` untouched, and clearing
  `developmentId` stores `NULL` rather than an empty string — the pair is one
  row and the fallback rule in `resolveDiscordConfigId` depends on the
  difference.

Level: Playwright, extending `role-management.spec.ts`. Justified: AC2 is
literally "see the new value after a reload", and a reload of an RSC route is
the mechanism under test. jsdom cannot render an async server component, and
the Postgres case (TC-020) proves persistence but not what the second render
reads. The `NULL`-versus-empty-string assertion is duplicated at pure unit in
TC-NEG-006 so it is checked in CI.

### TC-004: Inert keys are structurally distinct from live keys

Setup:

- All fourteen rows as props, with `description` text made deliberately
  identical between one live and one inert key.

Action:

- Render the Discord configuration section once. Both renderings are in the tree
  at the same time; jsdom loads no CSS, so there is no "at mobile width" to
  render at.

Expected observations:

- The four live keys (`guild`, `log_channel`, `recruiting_channel`,
  `alumni_role`) and the ten inert ones are told apart by a rendered element —
  a badge, an `aria-label`, or a `data-` attribute — not by their description
  text. Reached by accessible name, so it survives a rebuild of the markup.
- The distinction appears twice, once per rendering. The two containers are
  located by their `hidden md:block` and `md:hidden` tokens, which is a **class
  contract**: those tokens are the entire mechanism by which one rendering is
  shown and the other hidden, and nothing else in a CSS-less environment
  distinguishes them.
- The distinction is announced, not colour-only: an assistive-technology name or
  description states it.

Level: jsdom.

### TC-005: The live-key marking is derived from what code actually reads

Setup:

- The constant the UI marks live from, and the repository sources under
  `packages/*/src` and `apps/*/src`.

Action:

- Scan for `getDiscordConfigId("<key>")` and `getKnightHacksGuildId()` calls,
  excluding test and support files, and compare the derived key set with the
  constant.

Expected observations:

- The two sets are equal. Today that is exactly `guild`, `log_channel`,
  `recruiting_channel`, `alumni_role`.
- The scan itself is guarded: it asserts it found at least one call site, so a
  broken regex cannot compare two empty sets and pass.

Level: pure unit. AC3 is a claim that decays — the first code change that reads
`vip_role` makes a hand-maintained list a lie, and the console's whole point is
that an officer should not have to guess which rows are inert. Precedent for
source-scanning tests: `packages/api/src/tests/audit/coverage.test.ts` and
`packages/db/src/tests/club-team-classification.test.ts`.

### TC-006: The `guild` row confirmation names every consumer

Setup:

- The `guild` row in an edit dialog with a changed `productionId`.

Action:

- Press Save.

Expected observations:

- A confirmation appears before the mutation fires. The mutation mock records
  zero calls until it is confirmed.
- Its copy names the Discord archive, role sync, event projection, the T.K. bot
  and the crons. All five, asserted individually.
- Cancelling closes it, fires nothing, and leaves the draft intact so the edit
  is not lost.
- Confirming fires exactly one mutation with the edited values.

Level: jsdom.

### TC-007: Non-guild rows save without a confirmation

Setup:

- A live non-guild row (`log_channel`) and an inert one (`vip_role`).

Action:

- Edit each and press Save.

Expected observations:

- The mutation fires directly. No confirmation is rendered for either.
- Inertness does not change the save path; an inert row saves exactly like a
  live one.

Level: jsdom.

### TC-008: Success copy states convergence, not liveness

Setup:

- A successful Discord config mutation.

Action:

- Complete a save and read the toast.

Expected observations:

- The copy states the approximately sixty-second window for other Blade
  instances and `apps/cron`, and states that the T.K. bot needs a restart
  because it resolves the guild id once at module scope.
- The copy does **not** contain "live", "now live", "applied everywhere",
  "immediately", or "updated everywhere". Asserted as a negative match, because
  this is the sentence a future copy edit will quietly soften.
- The classification success copy makes no such claim in either direction —
  `loadClubTeamConfig` is uncached, so there is nothing to warn about, and a
  warning copied across from the Discord section would be a false one.

Level: jsdom.

### TC-009: The writing process sees its own Discord write immediately

Setup:

- A populated config cache in the current process — `getDiscordConfigId("guild")`
  called once so the snapshot is warm.

Action:

- Commit a change to the `guild` row through the console mutation, then call
  `getKnightHacksGuildId()` again without advancing the clock.

Expected observations:

- The second call returns the new value. The sixty-second TTL is not waited on.
- The invalidation is unconditional per commit: a mutation that changes only
  `label` or `description` also invalidates, because a future consumer reading
  a label must not be served a stale one.

Level: Postgres integration, in `packages/api/src/tests/integration`. The claim
spans a console mutation and the cache module, and `@forge/api` is the only
package that can import both — `@forge/utils` does not depend on `@forge/api`
(`packages/utils/package.json`), so this case cannot live in
`packages/utils/src/tests/discord-config.test.ts` where an earlier draft put it.
That file keeps what it can see on its own: the TTL, and
`invalidateDiscordConfigCache()` called directly. Both modules are imported
_after_ `DATABASE_URL` points at the disposable database, because
`@forge/db/client` builds its pool at module load
(`packages/api/src/tests/integration/database-harness.test.ts:25-28`). The
ordering claim — invalidation after the commit, not before — is TC-NEG-004.

### TC-010: First-time classification reaches the public roster without a script

Setup:

- A migrated disposable database with the eight teams, an `auth_roles` row
  linked after migration and therefore **unclassified**, a `User` and a `Member`
  for a holder of that role with `guildProfileVisible = true`, and no
  `knight_hacks_club_team_role` row for it.
- `pnpm db:club-roles` is not run.

Action:

- Call `getVisiblePublicClubRoster()`, then classify the role through the
  console mutation as `kind: "team"` with a `teamId`, then call
  `getVisiblePublicClubRoster()` again in the same process.

Expected observations:

- The first call places the holder nowhere.
- The second call places them in the named team with no restart, no deploy, no
  cache invalidation call, and no script run. `loadClubTeamConfig` queries on
  every call by design; the test asserts there is no invalidation seam to
  forget.
- Exactly one `knight_hacks_club_team_role` row exists afterwards. The
  `roleId` unique constraint means a second classification of the same role must
  update, not insert.
- The role is now shown as classified in the console's own read.

Level: Postgres integration. The join in `loadClubTeamConfig` between
`ClubTeamRole`, `Roles` and `ClubTeam`, and the four-way join in
`getVisiblePublicClubRoster`, are the thing under test; a mocked `db` verifies
none of it.

### TC-011: Changing `kind` moves the roster bucket and the badge category

Setup:

- A `ClubTeamConfig` fixture: an `executive` bucket, a `director` bucket, and a
  `design` team (`label: "Design"`, `displayOrder: 3`). One classified role held
  by one member.

Action:

- Evaluate `getClubRoleBuckets`, `buildPublicClubRoster` and
  `getGuildRoleCallout` with the role's `kind` set to `team`, then `director`,
  then `executive`, holding every other column constant.

Expected observations:

- `team` places the holder in the team named by `teamId`.
- `director` places them in the `director`-kind bucket, and additionally at the
  front of `teamId`'s team if `teamId` is set — the lead rule, which is exactly
  `kind <> 'team' AND team_id IS NOT NULL`.
- `executive` behaves the same against the `executive`-kind bucket.
- The Guild badge `category` follows: `executive` → `officer`, `director` →
  `director`, `team` → `team`. The badge `label` changes at the same time,
  because a null `calloutLabel` resolves through `kind` (TC-014).
- Buckets are found by `kind`, not by the literal slugs `executive` or
  `directors`, so renaming those team rows does not break the placement.

Level: pure unit for the matrix; one Postgres integration case that performs
one `kind` change through the mutation and re-reads
`getVisiblePublicClubRoster()`, proving the column the UI writes is the column
the reader reads.

### TC-012: Changing `teamId` moves a team role between teams

Setup:

- A `team`-kind classification in team A, with a visible holder.

Action:

- Change `teamId` to team B through the mutation and re-read the roster.

Expected observations:

- The holder appears under B and no longer under A.
- Their roster card label follows the new team when `rosterLabel` is null — the
  label is a function of the team, not stored copy, so a move renames them.
- The Guild badge follows to `"B Team"` when `calloutLabel` is null.
- The member's `id` in the roster payload is `${slug}-${memberId}`, so it
  changes with the slug. Anything keying off it must not assume stability
  across a reclassification.

Level: pure unit for the label consequences; Postgres integration for the move
itself, because `teamId` is `ON DELETE restrict` and the join is the point.

### TC-013: Changing `rank` reorders the roster but not the badge

Setup:

- Two `executive` classifications, ranks 1 and 2, each with a visible holder.
- Two `team` classifications in the **same** team, at different ranks, held by
  **different** visible members. One team bucket with one holder cannot show an
  ordering, and one member holding both cannot either — `buildPublicClubRoster`
  keeps one assignment per bucket per member, the lowest `rolePriority`.
- A third member holding `team` classifications in two different teams with
  different `displayOrder`, for the badge-priority half.

Action:

- Swap the two executive ranks. Separately, swap the two same-team ranks.

Expected observations:

- The executive bucket reorders; ties break on member name.
- The same-team bucket reorders too: `getClubRoleBuckets` returns
  `rolePriority: role.rank` for `team`-kind roles
  (`packages/api/src/utils/guild/club-team-config.ts:169-175`), so `rank` orders
  rank-and-file members within their team exactly as it orders officers within
  theirs.
- It changes **nothing** about the Guild badge. `getClubCalloutPriority`
  (`:147-154`) returns the team's `displayOrder` when the team resolves — the
  third member's badge follows the tab strip, not either rank. The `?? role.rank`
  tail is the unresolved-team fallback, asserted separately at pure unit with a
  `teamSlug` no team carries; it is not evidence that `rank` reaches the badge in
  the normal case.
- The console must therefore not describe `rank` as "badge priority" for team
  roles. Asserted against the rendered field help text.

Level: pure unit, plus jsdom for the help text.

### TC-014: Label-override fallbacks — null versus set, team member versus officer

Setup:

- A `ClubTeamConfig` with team `design` (`label: "Design"`).
- A team member: role name `"KH IX Team"`, `kind: "team"`, `teamId: design`.
- An officer: role name `"Officers"`, `kind: "executive"`, `teamId: null`.

Action:

- Evaluate `getClubRosterLabel` and `getClubCalloutLabel` across the matrix.

Expected observations:

| classification | `rosterLabel`   | roster card            | `calloutLabel` | Guild badge   |
| -------------- | --------------- | ---------------------- | -------------- | ------------- |
| team member    | `null`          | `Design` (team label)  | `null`         | `Design Team` |
| team member    | `"Design Crew"` | `Design Crew`          | `null`         | `Design Team` |
| team member    | `null`          | `Design`               | `"Designer"`   | `Designer`    |
| team member    | `"Design Crew"` | `Design Crew`          | `"Designer"`   | `Designer`    |
| officer        | `null`          | `Officers` (role name) | `null`         | `Officers`    |
| officer        | `"Officer"`     | `Officer`              | `null`         | `Officers`    |
| officer        | `null`          | `Officers`             | `"Officer"`    | `Officer`     |

- The two overrides are **independent**. Setting `rosterLabel` alone never
  changes the badge; setting `calloutLabel` alone never changes the roster card.
  This is the row an officer will get wrong, because the console shows both
  fields together and the spec calls them "the two label overrides".
- For a non-`team` kind the team's label never contributes, even when `teamId`
  is set. A lead named `"Hack Lead"` reads `Hack Lead` in both of its buckets,
  never `Hackathon`.
- A team role whose `teamSlug` does not resolve falls back to the role name
  rather than rendering an empty label.

Level: pure unit. Exhaustive and free; every row is a call to two exported
functions.

### TC-015: A lead appears in two buckets and leads the team it names

Setup:

- `kind: "executive"`, `rank: 4`, `teamId: hackathon`, one visible holder, plus
  two plain `team`-kind members of `hackathon` at rank 100.

Action:

- Build the roster.

Expected observations:

- The lead appears in the executive bucket at `rolePriority = rank`, and in the
  hackathon bucket at `rolePriority = 0`, ahead of every plain member
  regardless of their rank.
- Clearing `teamId` through the console removes the second bucket and nothing
  else. The lead stays in their own tier.
- Setting `teamId` on a `director` classification creates the second bucket the
  same way.

Level: pure unit, plus one Postgres integration case that clears `teamId` and
re-reads the roster — `teamId` is nullable only for non-`team` kinds and the
check constraint is what enforces that (TC-NEG-005).

### TC-016: Promoting a role out of `team` suppresses its holders' rank-and-file memberships

Setup:

- One member holding two classified roles: `"Design"` (`kind: "team"`, team
  design) and `"Marketing Lead"` (`kind: "team"`, team marketing).

Action:

- Change `"Marketing Lead"` to `kind: "director"` through the console and
  re-read the roster.

Expected observations:

- Before: the member appears under both design and marketing.
- After: `holdsClubLeadershipRole` is true for that member, so **every**
  `team`-kind classification they hold is suppressed. They disappear from design
  as well, even though nothing about the design classification changed.
- They appear in the director bucket, and at the front of marketing only if
  `teamId` is set.

Level: pure unit for the suppression rule; Postgres integration for one
end-to-end pass. This is the case an officer will file as a bug: they edited
one role and a different team lost a person. It should be provable in one test,
and the console should show the holder count it is about to affect.

### TC-017: Teams are read-only context

Setup:

- The console rendered with all eight teams.

Action:

- Inspect every team-related control.

Expected observations:

- Team `label`, `heading`, `slug`, `kind` and `displayOrder` render as text, not
  as inputs. No control writes to `knight_hacks_club_team`.
- The team selector on a classification is a chooser over existing teams only;
  it offers no "create team" option and no free-text entry.
- No console procedure accepts a team field other than an existing `teamId`;
  strict input schemas reject `label`, `heading`, `slug`, `displayOrder`.

Level: jsdom for the rendering, pure unit for the schemas.

### TC-018: No create or delete affordance exists in the UI

Setup:

- The console rendered with fourteen Discord rows, eighteen classifications,
  one unclassified role, and eight teams.

Action:

- Enumerate every `button`, `link`, `menuitem` and `form` in the rendered tree.
  Both the table and the card rendering are in that tree at once; jsdom applies
  no CSS, so there is no second width to enumerate at.

Expected observations:

- **Positive control, asserted first.** The enumeration finds the controls that
  _should_ be there: an edit control for each of the fourteen Discord rows, one
  for each classified role, and the "Classify" control for the unclassified one
  — in both renderings, so at least twice each. Without this, a component that
  throws, renders nothing, or is passed the wrong props produces an empty tree,
  and every assertion below passes for the worst possible reason. TC-005 guards
  its scan the same way; this file adds the same guard here because a
  pure-negative assertion silently passing on an empty result has already
  happened once on this branch.
- No accessible name matches `/\b(add|create|new|delete|remove|unclassify|reset)\b/i`
  in any of the three domains, in either rendering.
- The unclassified role's control is "Classify", and its dialog is titled for
  classification, not creation — the one place where creating a row is the
  correct behaviour and must not be worded as creation of anything an officer
  could later want to undo.
- No destructive-confirmation component is mounted anywhere in the console.

Level: jsdom. AC8 says "no affordance anywhere", which is an assertion about
the whole tree, so it is enumerated rather than spot-checked. Locating the two
renderings by their `hidden md:block` and `md:hidden` tokens is a **class
contract** (see Levels).

### TC-019: No create or delete procedure exists in the API

Setup:

- Both console routers.

Action:

- Read `Object.keys(router._def.procedures)` for each.

Expected observations:

- Each equals its documented list exactly. A future `create*` or `delete*`
  procedure fails the assertion before it fails review.
- Every mutation input schema is strict, so an unknown `key`, `slug` or `id`
  field cannot smuggle an insert through an update path.
- Update procedures address rows by existing identifier only. Nothing accepts a
  `key` for `knight_hacks_discord_config` as a value to be written.

Level: pure unit.

### TC-020: No console operation changes a row count in any of the three tables

Setup:

- A migrated disposable database with fourteen Discord rows, eight teams and a
  known number of classifications.

Action:

- Run every console mutation with valid input — every Discord field, every
  classification field, and a first-time classification.

Expected observations:

- `knight_hacks_discord_config` still holds fourteen rows with the same
  fourteen `key` values.
- `knight_hacks_club_team` still holds eight rows, byte-identical apart from
  nothing — `updated_at` included, since the console never writes to it.
- `knight_hacks_club_team_role` grows by exactly one, from the first-time
  classification, and never shrinks.
- Every mutation advanced its row's `updated_at`, so the `$onUpdate` hook is
  wired.

Level: Postgres integration. AC8 is asserted at the storage layer as well as
the UI layer, because "no affordance" and "no write" are different claims.

### TC-021: The feedback switch matches the section it sits beside

Setup:

- The role detail dialog on `/admin/roles` for a role with
  `eventFeedbackExcluded: false`, rendered once for an officer and once for a
  `CONFIGURE_ROLES`-only user.

Action:

- Inspect the new section against the Team email audience section at
  `role-detail-dialog.tsx:340-383`.

Expected observations:

- Local `useState` seeded from the prop; a `Switch` with an `aria-label`; an
  explicit Save disabled until the value differs from the prop or the mutation
  is pending; a `Loader2` while pending; a toast on settle; and the parent's
  `onChanged()` called on success.
- Toggling the switch alone writes nothing. The mutation mock records zero calls
  until Save.
- The switch row and its Save button carry an explicit `min-h-11`. This is a
  **class contract**, not a measurement: jsdom loads no CSS and every element
  measures zero, so what is asserted is that the token overriding the `h-9`
  default (`packages/ui/src/button.tsx:26`) is present. The 44px claim itself
  belongs to the dialog visual baseline.
- The section renders wherever the dialog itself renders — for a
  `CONFIGURE_ROLES` holder as well as an officer. It is **not** gated like the
  console: `roles.updateEventFeedbackExclusion` uses `requireConfigure`, beside
  the `updateEmailAudience` it mirrors, and `srd.md` argues that case at length.
  Rendered for both actors, asserted for both. A case pinning officer-only here
  would pin a contract the API does not have.
- The same column is not writable from `/admin/roles/config`. One column, one
  write path (TC-NEG-010).

Level: jsdom.

### TC-022: Turning the feedback flag on warns with an accurate past-event count

Setup:

- Six events carrying the role. Three are past, non-hackathon and hold an
  `EventFeedbackConfig` — these are the ones the count is about. The other three
  each fail exactly one clause, everything else held equal: one is past,
  non-hackathon and has **no** feedback config; one is in the future; one is a
  past hackathon event.
- A seventh: past, non-hackathon, holding a feedback config, and carrying a
  **second** role that is already `eventFeedbackExcluded`. It fails no clause
  except the last one, which is the point — it is already unreadable.

Action:

- Compute the warning count, then toggle the switch on and press Save.

Expected observations:

- The count is **three**, out of seven attached events. The definition asserted,
  in full: past (`end_datetime <= now()`), `hackathon_id IS NULL`,
  `roles @> ARRAY[roleId]`, holding a feedback config, **and no other role on
  the event already flagged `eventFeedbackExcluded`**.
- That last clause is why the seventh event does not count, and it is the one an
  implementation is most likely to omit. `isQualifyingEvent`
  (`packages/api/src/utils/events/feedback.ts:231-239`) fails on _any_ protected
  role, so that event is already unreadable for analytics and export today.
  Counting it would bill this toggle for a loss that has already happened, and
  the number an officer is agreeing to has to be "events that stop qualifying
  because of this", not "events touching this role".
- A confirmation appears before the mutation, states the count, and says that
  those events stop being readable for feedback analytics and CSV export
  because eligibility is re-checked against the live role set rather than the
  set that applied when the feedback was collected.
- Cancelling fires nothing and leaves the switch showing its saved value.
- A count of zero still confirms, and says zero rather than hiding the dialog —
  the officer is agreeing to a rule change, not only to a number.
- Turning the flag **off** does not confirm.

Level: Postgres integration for the count query — the predicate spans a text
array containment, a timestamp comparison, a null check and a negated join back
to `auth_roles` for the other-flagged-role clause, and a mocked `db` cannot
verify any of them. jsdom for the confirmation copy, given a count.

### TC-023: The feedback flag round-trips and restores readability

Setup:

- The role from TC-022 and a `createDbEventFeedbackService` built from the live
  table.

Action:

- Flag the role, exercise the feedback service, then unflag it and repeat.

Expected observations:

- While flagged: `isQualifyingEvent` is false for its events, so analytics,
  export, member opportunities and `provisionForEvent` all treat them as
  unavailable. Collection of _new_ feedback stops too, not only reading of old
  feedback — the console copy must not imply the effect is retrospective only.
- No `FormResponse` row is deleted. The data is hidden, not destroyed.
- After unflagging, the same events and their existing responses are readable
  again and the previous analytics values are unchanged.

Level: Postgres integration.

### TC-024: Every console mutation writes an audit event naming actor, row and change

Setup:

- An officer actor and one edit per mutation.

Action:

- Run each mutation and read `knight_hacks` audit rows inside the same
  transaction boundary.

Expected observations:

- One audit event per mutation, written by `createAdminAuditEvent(..., tx)`
  inside the transaction, so an aborted write leaves no audit row and an audit
  failure leaves no product change (TC-NEG-011).
- The actor is captured before the transaction, as `roles.updateEmailAudience`
  does.
- `changes` carries a `before`/`after` pair per edited column and omits columns
  that did not change, so an audit row reads as a diff rather than a snapshot.
- Subjects use `role` for classification and feedback-flag events — the only
  reusable target type — and the new `AUDIT_TARGET_TYPES` member for a Discord
  config row. `targetLabel` is human-readable: the role name, or the config
  `key` plus `label`.
- `metadataKeys` and `changeFields` are declared in `AUDIT_ACTION_CATALOG` for
  every new action, and the existing catalog test's shape assertions pass.
- Snowflakes appear only in `changes`, never duplicated into `metadata`.

Level: pure unit for the catalog declarations; Postgres integration for the
transaction boundary and the persisted rows.

### TC-025: Every new procedure is declared in audit coverage under its router file name

Setup:

- The new router files in `packages/api/src/routers`.

Action:

- Run `packages/api/src/tests/audit/coverage.test.ts` unchanged.

Expected observations:

- `discoverPermissionProcedures()` finds every new `permProcedure`, so each is
  declared in exactly one of the audited, hybrid or excluded lists.
- The declarations use **router file names** (`discord-config.update`),
  while the api-surface snapshot uses **client namespaces**
  (`discordConfig.update`). Both are asserted, and the mismatch is
  deliberate; a test that reconciles them by rewriting one to look like the
  other would hide a genuine naming divergence.
- Every audited declaration resolves to a `createAdminAuditEvent` call by the
  existing static walk. Procedures must be declared at two-space indent
  directly in the router file — a spread or a nested sub-router would make
  discovery miss them and the coverage assertion pass vacuously.
- The existing `expect(discovered.length).toBeGreaterThan(100)` and
  `scanned.length >= 18` guards are not weakened.

Level: pure unit.

### TC-026: The api-surface snapshot gains exactly the new paths

Setup:

- The 179-path snapshot at
  `packages/api/src/tests/root/__snapshots__/api-surface.test.ts.snap`.

Action:

- Regenerate and diff.

Expected observations:

- The diff adds only the console paths, under two namespaces rather than one,
  and removes nothing.
- The Discord-config and club-classification paths do not share a namespace.
  This is what makes the split permanent: the snapshot is where a later
  "just add it to the other router" is caught.
- The snapshot is updated in the same commit as the routers.

Level: pure unit.

### TC-027: The roles dashboard links to the console

Setup:

- The roles dashboard rendered for an officer, and for a `CONFIGURE_ROLES`-only
  user.

Action:

- Inspect the header actions.

Expected observations:

- The officer sees a `<Link href="/admin/roles/config">` in the header actions,
  matching how `admin-forms-dashboard.tsx:125` links to
  `/admin/forms/sections`: `Button asChild`, `min-h-11 gap-2`, an icon marked
  `aria-hidden`.
- The non-officer does not see it. The link is hidden and the route is gated;
  neither substitutes for the other.
- No sidebar entry is added, and none of the six nav/layout/test files changes.
  Asserted by the nav tests continuing to pass untouched.

Level: jsdom.

### TC-028: The route shell matches the admin page contract

Setup:

- The console route and its `loading.tsx`.

Action:

- Render both. One render each: jsdom has no viewport to re-render at.

Expected observations:

- The page is an async server component with no `"use client"`; it awaits
  `auth()`, `api.roles.getPermissions()`, the gate, then the reads, and returns
  one client component with resolved props. The client component owns `<main>`.
- `AdminPageHeader` receives all four of `description`, `eyebrow`, `icon` and
  `title`. Layout uses the three exported class-name strings; there is no
  `AdminPage` wrapper.
- The new eyebrow key exists in `apps/blade/src/consts/admin-page-eyebrows.ts`
  and the existing uniqueness assertion still passes. It is not a near-miss of
  "Access control", "Discord operations" or "Feedback configuration".
- `loading.tsx` exists, exposes an accessible loading label, and its skeleton
  mirrors the real markup structurally — same section count, same table-versus-
  card split — so the visual harness's `.animate-pulse` guard is meaningful.
- Tabular data renders twice: a `hidden md:block` `<Table>` and a `md:hidden`
  card list. Both carry every column an officer needs to act; neither is a
  reduced version of the other without that being deliberate. The _contents_ are
  compared by accessible name; the _pairing_ is a **class contract** on the two
  container tokens.
- Every input, select, switch row and button carries an explicit
  `h-11`/`min-h-11` token rather than inheriting the `h-9` default
  (`packages/ui/src/input.tsx:13`, `select.tsx:27`, `button.tsx:26`). **Class
  contract.** The 44px and 14px numbers behind those tokens are pixels and are
  not asserted here.

Level: jsdom for all of it, following `admin-page.test.tsx` and
`event-check-in-loading.test.tsx`. The two class contracts above are the only
class assertions in this case; everything else is by role and accessible name.

### TC-029: Saved data refreshes through `router.refresh()`

Setup:

- The console client component with mocked `useRouter` and `startTransition`.

Action:

- Complete a successful mutation.

Expected observations:

- `startTransition(() => router.refresh())` runs on success.
- No `utils.*.invalidate()` call is made — the data arrived as RSC props, so
  there is no query to invalidate and an invalidation would be a no-op that
  looks like a refresh.
- Nothing is written to local state before the server responds. There are zero
  optimistic updates in `apps/blade` and this does not introduce the first: the
  rendered value during the pending window is still the old one.

Level: jsdom.

### TC-030: Row-level pending state is per row

Setup:

- Two Discord rows and two classifications, one mutation object shared across
  rows.

Action:

- Start a save on the first row.

Expected observations:

- Only the first row shows its `Loader2` and disabled Save. The second row's
  controls stay enabled.
- The pending row is tracked by a `useState<string | null>` id, not by
  `mutation.isPending` alone, which is shared and would light up every row.
- The pending id clears on both success and error, so a failed save does not
  strand a row.

Level: jsdom.

### TC-031: The three `kind` groups are labelled regions in both renderings

Setup:

- The Discord configuration section rendered with all fourteen rows in the order
  the server sends them: one `guild`, two `channel` (`log_channel`,
  `recruiting_channel`), eleven `role`.

Action:

- Query the rendered tree by role and accessible name.

Expected observations:

- Three groups exist, one per `kind`, each an addressable region with an
  accessible name. `spec.md` asks for the rows "grouped by `kind` (guild,
  channel, role)", which is a claim about structure: a `kind` column that happens
  to be sorted satisfies neither a screen reader nor the sentence.
- The fourteen rows partition across them 1 / 2 / 11, and every row belongs to
  exactly one group.
- Group order is the server's — guild, then channel, then role — and within a
  group the order is `DISCORD.CONFIG_KEYS` declaration order, which is not
  alphabetical (`admin_role` follows `officer_role`). The client does not
  re-sort. Asserted against the rendered order, because "ordering is server-side
  and fixed" is only true until someone adds a convenience sort.
- Membership follows the row's `kind` column, not its key text. A row keyed
  `guild` and a row keyed `*_director_role` land where their column says, so
  renaming a key never silently regroups the table.
- Both renderings carry the grouping. The two containers are located by their
  `hidden md:block` and `md:hidden` tokens (**class contract**); the group names
  and their memberships are asserted by accessible name.

Level: jsdom.

## Negative / regression cases

### TC-NEG-001: Malformed snowflakes are rejected by the shared validator

Setup:

- Malformed values for both `productionId` and `developmentId`: sixteen digits,
  twenty-one digits, non-numeric, an interior space, and the `<@&123…>` mention
  form.
- A padded but otherwise valid snowflake, `" 990000000000000001 "`, for both.
- The empty forms — `""` and `"   "` — for both.

Action:

- Validate and submit.

Expected observations:

- Every malformed value is rejected before any database work, by the existing
  `/^\d{17,20}$/` schema in `packages/validators` — not by a sixth copy of the
  pattern, and not by the Postgres check constraint. Asserted by the error
  shape being a validation failure, not a database error.
- The padded snowflake is **accepted** and stored as its digits.
  `configSnowflakeSchema` puts `.trim()` in front of the shared pattern because
  the officer path is a paste out of Discord, and the schema comment on
  `knight_hacks_discord_config_production_id_check`
  (`packages/db/src/schemas/discord-config.ts:57-60`) names a trailing space as
  the realistic way this table gets broken. Normalising it is the behaviour; a
  case expecting a rejection here would be pinning the wrong contract.
- The check constraints
  `knight_hacks_discord_config_production_id_check` and
  `…_development_id_check` remain as the backstop and are proven to still
  reject a direct SQL insert of a bad value.
- **The empty forms are settled at the schema boundary, and they are not
  symmetric.** `productionId` is `notNull` with no fallback behind it, so `""`
  and `"   "` are rejected. `developmentId` coerces both to `null` and never
  rejects them: `NULL` is the documented "reuse `productionId`" value
  (`packages/db/src/schemas/discord-config.ts:45-46`), so an officer clearing
  the field is expressing that rule, not making a mistake, and the check
  constraint explicitly permits `IS NULL` (`:67-70`). TC-NEG-006 asserts the
  identical rule for `rosterLabel` and `calloutLabel`; all three nullable
  columns coerce rather than reject, and no case anywhere in this file expects
  an empty `developmentId` to fail.

Level: pure unit for the schema, Postgres integration for the constraints.

### TC-NEG-002: Two officers editing the same Discord row serialize on the row lock

Setup:

- The `log_channel` row at value `X`.
- **A is a raw session, not the mutation.** A second connection to the
  disposable database opens a transaction, takes `SELECT … FOR UPDATE` on the
  row, writes `Y`, and holds the transaction open. The mutation offers no seam
  to pause inside — its body is a single `db.transaction(...)` call that returns
  only when it has committed — so "let A pause before committing" cannot be
  written against it. A raw session can hold the lock for exactly as long as the
  assertion needs, which is the whole requirement.
- **B is the real mutation**, called normally, asking for `Z`.

Action:

- Open A, take the lock, write `Y`, leave it open. Start B without awaiting it.
  Confirm B is blocked. Commit A. Await B.

Expected observations:

- B does not complete while A holds the lock. Asserted positively: B's promise is
  still pending, and `pg_stat_activity` shows its backend waiting on a lock.
  "It finished eventually" is not the claim.
- The committed value is `Z`, and **B's audit event records `before = Y`** — A's
  committed value — not `before = X`. This is the assertion that matters: an
  implementation that reads the row _before_ opening its transaction produces
  the same final value and a lying audit trail, and only this assertion tells the
  two apart.
- Exactly one audit event comes out of this scenario. A is raw SQL and writes
  none; the `X → Y → Z` chain is reconstructed from A's write plus B's
  `before`/`after` pair. Two chained audit events from two real mutations need no
  lock contention and are asserted by running the mutation twice in sequence.
- No `expectedRevision` is involved. Neither table has a revision column and a
  stale-write `CONFLICT` is deliberately not the behaviour here.

Level: Postgres integration. `FOR UPDATE` has no observable behaviour without a
real database and two real sessions.

### TC-NEG-003: Two officers classifying the same role serialize on the row lock

Setup:

- One unclassified role, and two concurrent first-time classifications with
  different `kind` values. Separately, two concurrent edits to one existing
  classification.

Action:

- Run each pair concurrently.

Expected observations:

- For the existing classification: the same lock, chain and audit assertions as
  TC-NEG-002, in the same shape — a raw session holds the lock, the mutation is
  the contender.
- For the two first-time classifications: exactly one row exists afterwards.
  The `roleId` unique constraint decides; the loser either updates the winner's
  row or fails with a conflict, but never inserts a second row and never leaves
  the role classified twice.
- The roster after both settle reflects one classification, not a blend of the
  two.

Level: Postgres integration.

### TC-NEG-004: Cache invalidation follows the commit and does not follow a rollback

Setup:

- A warm config cache. Two scenarios: a mutation that commits, and one that
  aborts after the update but before commit.

Action:

- In the committing scenario, race a `getKnightHacksGuildId()` read against the
  window between the write and the commit. In the aborting scenario, complete
  the rollback.

Expected observations:

- `invalidateDiscordConfigCache()` runs **after** the commit. If it ran before,
  a concurrent read would repopulate the snapshot from the pre-commit value and
  the writing process would serve a stale id for the full sixty seconds — the
  exact failure the invalidation exists to prevent.
- After a rollback, the cached value still matches the database. An invalidation
  here is harmless but a _write_ to the cache would not be; nothing repopulates
  from uncommitted state.
- The invalidation is not inside the transaction callback.

Level: Postgres integration, with the cache module imported against the
disposable database.

### TC-NEG-005: A `team` classification with no team is refused before Postgres refuses it

Setup:

- `kind: "team"` with `teamId: null`; and an existing `team` classification
  edited to clear `teamId`.

Action:

- Submit both.

Expected observations:

- Rejected by the input schema with copy naming the field, not by
  `knight_hacks_club_team_role_team_check` surfacing as an opaque database
  error. The check constraint is proven still to reject a direct SQL insert.
- The reason matters and should be in the message: a `team` role with no team
  produces zero buckets from `getClubRoleBuckets`, so its holders vanish from
  the roster with no error anywhere. That is the failure this whole table
  exists to end.
- Changing `kind` from `executive` to `team` while `teamId` is null is refused
  as one operation, not applied halfway.

Level: pure unit for the schema, Postgres integration for the constraint.

### TC-NEG-006: Blank and whitespace-only overrides are stored as NULL

Setup:

- `rosterLabel` and `calloutLabel` submitted as `""`, `"   "`, `"\t"`, a
  64-character string, and a 65-character string.

Action:

- Save each.

Expected observations:

- `""` and whitespace-only values are trimmed and stored as `NULL`. A stored
  `""` renders identically to `NULL` through `if (role.rosterLabel)` but is a
  different row, and a whitespace-only value is _truthy_, so it would render a
  blank label on the public site with no error.
- 64 characters is accepted; 65 is rejected by the schema before
  `varchar(64)` truncates or errors.
- Clearing an override in the console genuinely restores the fallback: after
  clearing, a team member reads the team label again and an officer reads the
  role name again.
- The same rule applies to `developmentId`: empty means `NULL`, and `NULL`
  means "reuse `productionId`".

Level: pure unit for the schema, Postgres integration for what is stored.

### TC-NEG-007: Unknown key, role and team inputs fail as NOT_FOUND and change nothing

Setup:

- A well-formed but absent config row id, an absent `roleId`, an absent
  `teamId`, and a `roleId` belonging to a role that exists but was unlinked
  between the page render and the save.

Action:

- Submit each.

Expected observations:

- `NOT_FOUND` with a safe message. No row is created to satisfy the request.
- The unlinked-role case is the realistic one: the console was rendered from a
  server read and an officer on `/admin/roles` unlinked the role in between.
  The mutation must fail, not resurrect a classification for a role that no
  longer exists.
- No audit event is written for a failed mutation.

Level: Postgres integration.

### TC-NEG-008: A classification whose kind has no bucket disappears silently

Setup:

- A `ClubTeamConfig` with no `director`-kind team row, and a `director`
  classification with `teamId: null`.

Action:

- Build the roster and the badge.

Expected observations:

- `getClubRoleBuckets` returns an empty array, so the holder appears nowhere on
  the public site. `getGuildRoleCallout` still returns a `director` badge, so
  the two surfaces disagree.
- This pins existing behaviour rather than proposing a change. Teams are
  read-only in this console, so it cannot be fixed here — but it is the one
  classification an officer can make that produces nothing, and the console
  should at minimum show the bucket a classification resolves to so it is
  visible before Save. See Open questions.

Level: pure unit.

### TC-NEG-009: Unlinking a classified role still removes its classification

Setup:

- A classified role with a visible holder, unlinked from `/admin/roles`.

Action:

- Unlink, then read the roster.

Expected observations:

- `club_team_role.role_id` cascades, so the classification row disappears and
  the holder leaves the team, with no warning from `getDependencyCounts` —
  which checks events, form responses, form sections, issues and issue
  visibility, and not `ClubTeamRole`.
- This is the recorded known gap, pinned so it is not mistaken for a
  regression introduced here, and so that closing it later has a failing test
  to start from.
- The console's mitigation is asserted separately: a classified role shows its
  classification, so an officer can see it before unlinking.

Level: Postgres integration for the cascade, jsdom for the mitigation.

### TC-NEG-010: Console inputs cannot reach `event_feedback_excluded`

Setup:

- Every console mutation input, with an extra `eventFeedbackExcluded` field.

Action:

- Submit.

Expected observations:

- Rejected by the strict schemas.
- No console procedure reads or writes `Roles.eventFeedbackExcluded`, asserted by
  a source scan of the console routers and their helpers.
- **Positive control, asserted first**, on both halves. The strict-schema half
  submits a known-_valid_ input for every schema and asserts it parses, so a
  typo'd fixture cannot make every rejection trivially true. The scan half
  asserts it read a non-empty set of files, and that the same scanner _does_
  find `eventFeedbackExcluded` in `packages/api/src/routers/roles.ts`, which is
  the one router legitimately allowed to touch the column. A scan that finds
  nothing anywhere proves nothing, and this file has already been bitten once by
  a pure-negative assertion passing on an empty result.
- One column, one write path. Two write paths is how the flag drifted before.

Level: pure unit.

### TC-NEG-011: Audit failure aborts the whole config write

Setup:

- `createAdminAuditEvent` made to throw, once for a Discord edit and once for a
  classification edit.

Action:

- Run each mutation.

Expected observations:

- The transaction aborts. The config row and the classification row are
  unchanged, and no audit row exists.
- `invalidateDiscordConfigCache()` does not run, because there was no commit.
- The caller receives an error rather than a success toast.
- This differs deliberately from the event domain, where audit failure cannot
  undo committed external state. Here there is no external side effect, so the
  whole operation is one transaction and rolling back is the honest outcome.

Level: Postgres integration.

### TC-NEG-012: A wrapper `<div>` in the role detail dialog fails the visual baseline

Setup:

- The recorded role-detail-dialog baselines from the section below.

Action:

- Wrap the run of siblings inside the `Team email audience` section in a single
  `<div>` and run the visual suite.

Expected observations:

- The region baseline fails. Type-check, lint and every unit test still pass,
  which is the entire reason the baseline exists: `space-y-*`, `gap-*`,
  `divide-*` and `first:`/`last:` all key off direct children.
- The failure diff localises to the wrapped run.
- The wrap must be _inside_ a captured region for this to fail. That is the
  honest limit of an element-scoped baseline and the reason the section below
  also asserts section order: a wrapper introduced between two captured regions
  translates them without changing either, and pixels alone would not see it.

Level: Playwright. Justified: this regression class has no other detector, and
`DESIGN_SYSTEM.md` already records the macOS-only tradeoff for the existing
baselines. This case is executed once, by hand, when the baselines are first
recorded — it proves the baseline is load-bearing, not that the product works.

### TC-NEG-013: `label` is required and blank does not mean anything

Setup:

- `discordConfigUpdateSchema` with `label` as `""`, `"   "`, a 128-character
  string, a 129-character string, and omitted entirely.

Action:

- Validate each. Submit the blank case through the dialog as well.

Expected observations:

- `""` and `"   "` are rejected, with the issue on `label`. This is the
  asymmetry that makes this case worth writing next to TC-NEG-001 and TC-NEG-006:
  `developmentId`, `rosterLabel` and `calloutLabel` coerce blank to `NULL`
  because `NULL` has a documented meaning for each of them, and `label` has
  none. It is `notNull varchar(128)`
  (`packages/db/src/schemas/discord-config.ts:39-40`) and it is the only
  human-facing name a row has; a blank one leaves an officer editing an unnamed
  row. Blank must reject, not normalise. `description` is `notNull` too and
  follows the same rule.
- 128 characters is accepted; 129 is rejected by the schema, before
  `varchar(128)` truncates or errors.
- An omitted `label` is rejected. `discordConfigUpdateSchema` is not partial —
  the dialog submits the whole row — so a missing field is a client bug and not
  a request to leave the column alone.
- Save is disabled while `label` is blank, so schema rejection is not the first
  feedback an officer gets.

Level: pure unit for the schema; jsdom for the disabled Save.

## Role detail dialog visual baseline

AC11 requires an **element-scoped** baseline of the role detail dialog, recorded
**before** the feedback switch is added to it. Specified here because "add a
baseline" is not actionable without the URL, the fixture, the viewport and — new
in this feature — the element.

Not a full-page `/admin/roles` capture. `roles.listLinks`
(`packages/api/src/routers/roles.ts:81-85`) takes no input and returns every row
in `Roles`, so nothing in the URL can scope the page and a working Blade
database holds real roles. It is worse than ambient rows: under the e2e Discord
override the list sorts on `position: 50 - index` derived from an **unordered**
`db.select().from(Roles)`
(`packages/api/src/tests/support/role-management-discord.ts:104-120`), so even a
fixed set of rows has no guaranteed order. The dialog has neither problem — it
is server-rendered from `?role=<uuid>`
(`apps/blade/src/app/admin/roles/page.tsx:54-56`) and renders exactly one role.

### Where it goes

`apps/blade/src/tests/e2e/visual/visual-baselines.spec.ts`, extending the
existing fixture and harness. `preparePage`, `signInAs` and `settle` are used
unchanged; the fixed clock, the scrollbar-suppressing stylesheet and the parked
pointer (the admin rail is `w-16 hover:w-56`) all apply.

The one addition is `expectElementVisualBaseline(locator, name)` in
`visual-harness.ts`, beside the page-scoped `expectVisualBaseline` (`:141-154`).
It keeps the same `maxDiffPixels: 120` budget and 30s timeout and drops
`fullPage`, which means nothing for an element. `srd.md` owns its shape.

### Fixture state

Extend `visual-fixtures.ts`. Do not rename the four existing roles — the issue
baselines render their names as team filter chips.

**One mechanism: the fixture role is addressed by its UUID, and what renders is
its stored `Roles.name`.** An earlier draft asked for both a collision-proof
_name prefix_ to filter the list by and `discordRoleId` values taken from the
e2e gateway's hard-coded set. Those two instructions cancel each other out, and
the reason is worth writing down because it is not visible from either file:

- `buildLinkedRoleViews` renders `name: live?.name ?? role.name`
  (`packages/api/src/utils/roles/service.ts:402`) — the Discord name wins over
  the stored one whenever the gateway knows the role.
- The e2e override's `getGuildRoles` builds its list **from the database**,
  echoing each linked row's stored name and `teamHexcodeColor` back
  (`role-management-discord.ts:104-120`), then overlays seven hard-coded roles,
  last write winning in the `Map` (`:122-124`).
- So a fixture role given `990000000000000001` renders as **"Role Management
  E2E"** and a stored-name prefix matches nothing. A fixture role given any
  other id renders its stored name, with a colour from `teamHexcodeColor` and
  `syncState: "available"`.

Therefore:

- Follow the convention the file already uses:
  `discordRoleId: "visual-baseline-<name>-role"`. Never reuse one of the seven
  ids the override hard-codes.
- The claim that a non-snowflake id renders "Missing" is **false** under the
  override. The only id that does is `990000000000009999`, the one
  `getGuildRoles` filters out (`:112`). If a degraded-state baseline is ever
  wanted, that is the id for it; this feature wants the normal state.
- No `roleQuery` anywhere. The list behind the dialog is ambient and
  deliberately uncaptured, which is what the element scope buys.

The dialog's fixture role:

- One **Access** role with a fixed permission bitstring. No second Cosmetic
  capture — inside the captured regions it would differ by one badge word.
- `emailAudienceEnabled` false, issue reminders off, `eventFeedbackExcluded`
  false — the dialog's default state.
- Held by exactly one fixture user, so `Blade assignments` and the override's
  `getRoleCounts` — which derives from `Permissions` rows (`:128-150`) — are
  fixed numbers rather than ambient ones.
- Referenced by nothing else in the fixture, so every `getDependencyCounts`
  figure in the summary grid is 0. In particular it is **not** one of
  `ISSUE_TEAM_IDS`, which already carry seeded issues.
- No events seeded for it. If the past-events count ever rendered in the section
  description rather than only in the confirmation, the dialog would become a
  function of ambient event data. It must live in the confirmation.
- Re-record every existing baseline in the same commit and confirm the issues
  and members baselines are byte-identical. That check is the point of adding
  rows to a shared fixture.

### URL, elements and viewports

One URL: `/admin/roles?view=roles&role=<fixture-uuid>`. Both parameters are read
by `parseRoleManagementSearchParams`, and `role` is honoured only for a
Configure-capable actor, so the actor is the fixture officer.

Viewports are the harness constants: `DESKTOP_VIEWPORT` 1440x1000 and
`MOBILE_VIEWPORT` 390x844. The mobile captures are not narrower renderings of
the desktop ones — the dialog's own layout switches at `sm:` — so they are
separate baselines, not a resize.

| Baseline                                 | Element                                                | Viewport |
| ---------------------------------------- | ------------------------------------------------------ | -------- |
| `role-detail-identity-desktop.png`       | dialog header block (`role-detail-dialog.tsx:134-155`) | desktop  |
| `role-detail-identity-mobile.png`        | same                                                   | mobile   |
| `role-detail-email-audience-desktop.png` | `Team email audience` region (`:340-383`)              | desktop  |
| `role-detail-email-audience-mobile.png`  | same                                                   | mobile   |

Both elements are located by accessible role and name — the `dialog`, and the
`region` named "Team email audience" — never by class or test id.

### Before-and-after semantics

- **Both regions pass byte-identical after the switch lands. Nothing is
  re-recorded.** That is the whole of AC11, and it is achievable only because
  the new `<section>` goes _after_ the email-audience section inside
  `<div className="space-y-5 …">` (`:157`): it grows the dialog and must leave
  both captured boxes untouched.
- **Section order is asserted in the same test, before the captures.** A
  `toHaveScreenshot` on a locator is relative to that element's own box, so a
  region merely pushed down the page still passes. Reading the dialog's section
  headings in document order — Downstream use, Issue reminders, Team email
  audience, the new one, Blade permissions — is what catches a section inserted
  above rather than below. TC-NEG-012 records the same limit.
- **The console link is in no captured region.** `spec.md` AC11 lands it in an
  earlier commit so it sits inside the reference regardless; with an element
  scope that ordering is belt and braces rather than load bearing.

Recording order: the link commit, then the baseline commit, then the switch. The
baselines are captured on a commit that predates the switch, so it is a genuine
reference; recording them alongside the change would prove only that the change
matches itself.

`/admin/roles/config` gets no baseline in this change. It is new, so there is no
"before" to compare against and a baseline could only certify the first
implementation. Adding one afterwards, as a new baseline rather than a
regression proof, is reasonable and is left to the implementer.

## Automation mapping

Filled in with concrete test names when the tests are generated. The identifiers
above are the stable reference; test files cite `TC-0xx` in their describe or it
strings, as `role-management` and `event-management` do.

## Open questions

- **The past-events count definition.** TC-022 pins it as past, non-hackathon
  events carrying the role that hold a feedback config and are not already
  excluded by some other flagged role. The alternative — every past event
  carrying the role — is a larger, scarier and less true number.
  Should the copy also state how many of those already hold collected
  responses, which is the number an officer actually loses?
- **A classification with no bucket.** TC-NEG-008 pins that a `director`
  classification produces nothing when no `director`-kind team row exists, and
  that the roster and the badge then disagree. Teams are read-only here, so the
  console cannot fix it. Should the classification dialog show the bucket a
  classification will resolve to before Save, so the officer sees "no bucket"
  rather than discovering it on the public site?
- **The holder count on a reclassification.** TC-016 shows that changing one
  role's `kind` can remove a member from an unrelated team. Should the
  classification dialog state how many visible members the change affects, the
  way the feedback confirmation states its count?
