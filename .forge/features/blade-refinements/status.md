# Blade Refinements Status

Current phase: Bundle approved / ready for technical discovery

## Decision log

- 2026-08-12: Start from production `origin/main` in the isolated
  `/Users/dvidal/Documents/forge-refinements` worktree at `78857b85`.
- 2026-08-12: Forge is the current product/project name. Reforge is retired and
  must not be used for new branch or workflow naming. The shared branch is
  `forge/refinements`.
- 2026-08-12: Use one `blade-refinements` bundle for the long refinement slice;
  the human explicitly waived the preference to split unrelated small changes.
- 2026-08-12: Desktop admin navigation uses a top-left explicit opener, never
  hover expansion. Collapsed icons navigate directly; an expanded rail closes
  after selection. Mobile retains close-on-select.
- 2026-08-12: Ordinary members with only Dashboard and Settings get no sidebar;
  Settings and Sign out live together at the top right.
- 2026-08-12: Admin destinations are grouped by product domain rather than
  alphabetical order. The approved map is Club (Analytics, Members, Alumni,
  Companies, Events, Event Check-in), Team (Issues, Forms, Email, Roles, Discord
  archive, Admin logs), Hackathon (Hackathons, Hackers, Hackathon Events,
  Hackathon Check-in), and External (Guild), with Dashboard first and ungrouped.
- 2026-08-12: `/` stays public for authenticated visitors and adapts its CTA.
- 2026-08-12: Unpaid dues stays prominent at the top. Paid dues becomes a green
  badge beside the Welcome name with a hover/focus tooltip; no paid banner.
- 2026-08-12: Guild remains a prominent top-level member capability, and its
  profile/photo/resume/preferences controls are not moved into Settings as part
  of this slice. The dashboard must instead explain what Guild is and which data
  is public/external.
- 2026-09-01 (R-07): The member dashboard now renders one DOM order on every
  viewport instead of a desktop tree plus `lg:hidden` mobile duplicates. The
  shared order is the Member details card first (Welcome, dues, Check in,
  Events, Previous forms) and the Guild profile card second. The `order-*`
  and `hidden` utilities were removed rather than reshuffled, so desktop keeps
  Member details on the left and Guild on the right, which is what TC-020's
  existing bounding-box assertion already required.
- 2026-09-01 (R-12): Claimed after finishing R-07 through R-10. It cites
  TC-020, and the R-07 pass already added a Playwright overflow journey at
  320/390/768/1024/1440 plus long-name and sparse-profile browser QA, so it
  extends verified ground rather than opening a cold surface. R-12 covers
  Guild/profile parity between sparse and populated data. Per srd.md it may not
  be closed by adding `overflow-x-hidden` to conceal a layout bug.
- 2026-09-01 (R-23): Claimed and implemented in error, then reverted the same
  day. R-23 had been claimed verbally in the team Discord on 8/30 and that
  claim never reached this file, so the inventory read as unclaimed. The ticket
  is back to Ready and the two upload components are back to their prior state;
  the measurements taken while it was held are recorded below for its owner.
  This table is not proof a ticket is free while claims live in chat.
- 2026-09-01 (R-12): The defect was found by measuring computed style in a real
  browser, not by reading the markup. The member name heading computed
  `width: 500.203px` inside a 320 px viewport with `overflow-wrap: normal` and
  was clipped by an ancestor. `min-w-0` alone was not enough: it removes the
  flex `min-width: auto` floor but the element still sizes from an unshrinkable
  max-content. Only `overflow-wrap: anywhere` feeds back into intrinsic sizing,
  and because `break-words` sets the same property it had to be removed rather
  than stacked, matching `admin/members/member-detail-dialog.tsx:159`.
- 2026-09-01 (R-23, evidence only, not implemented here): while R-12 was being
  probed, the `Input` primitive used as a visually hidden file picker in
  `member-profile-picture-upload.tsx` and `member-resume-upload.tsx` measured as
  a real overflow source. Its own `w-full h-9` outrank `sr-only`'s 1 px box, so
  each input computed to `position: absolute; width: 1440px; height: 36px` and
  pushed `documentElement.scrollWidth` 363 px past a 320 px viewport, concealed
  only by the `overflow-x-hidden` on `authenticated-shell.tsx`. A bare
  `<input className="sr-only">` removes it. The same pattern also exists in
  `admin/members/member-detail-dialog.tsx` (twice) and
  `admin/companies/company-admin-detail.tsx`. Left for the R-23 owner.
- 2026-09-01 (R-07/R-11): On mobile, "Previous forms stays at the bottom" is
  satisfied as the bottom of the member panel, not literally the last element
  on the page. Moving it below the Guild card would put a private Blade action
  underneath the public Guild surface, which contradicts R-08's requirement to
  keep private Blade data visually separated from public Guild data. R-11's
  low-emphasis treatment (small outline button on a nested surface) is
  unchanged.
- 2026-08-12: Resume upload success must not auto-open preview and applies to
  signup plus existing-member flows. Success retains an explicit View action.
- 2026-08-12: Previous forms remains at the bottom as a small, low-emphasis
  action.
- 2026-08-12: Managed issue screenshot uploads are in scope despite the earlier
  `club-operations-issues` non-goal. The approved editor supports file picker,
  clipboard paste, and drag/drop with cursor insertion. It accepts PNG, JPEG,
  WebP, and GIF up to 10 MB each and 10 retained images per issue; animated GIFs
  are allowed and SVG is rejected.
- 2026-08-12: Forms already supports managed image/video instruction blocks in
  the active production platform. This slice verifies/polishes that behavior and
  adds the genuinely missing managed top banner image.
- 2026-08-12: Issue reminders use linked `Title | Chat`; Chat is omitted when no
  Discord thread exists.
- 2026-08-12: Issue history and Admin logs prefer linked current Member full
  names at read time, fall back to saved Discord identity, preserve system actors,
  and do not rewrite historical rows.
- 2026-08-12: Member benefits and Grafana are deferred.
- 2026-08-12: Remove visible admin-page eyebrows/descriptions centrally. Preserve
  the current description alone through an accessible title tooltip, omit the
  eyebrow from that tooltip, and reclaim matching skeleton space.
- 2026-08-12: Treat the Chrome and Zen clipping reports as responsive defects;
  do not dismiss them as browser-specific without standards-compliant evidence.
- 2026-08-12: Form banners use a responsive 4:1 `cover` frame with builder crop
  guidance, preview, and editable alt text.
- 2026-08-12: The human approved all five remaining product decisions and the
  spec/SRD/test-case bundle for implementation.
- 2026-08-12: Contributors may implement directly on the shared
  `forge/refinements` branch for this agent-first trial.
- 2026-08-12: Treat agent-assisted development as a first-class contribution
  experience. Agent use is encouraged, while each contributor remains responsible
  for the scope, code, decisions, validation, and result they submit. The bundle
  exists to reduce errors and miscommunication between developers and agents.
- 2026-08-12: The contributor entrypoint is the feature bundle. A developer may
  point an agent at it and let the agent load the repository instructions,
  relevant skills, and code context. Humans may read those materials themselves
  if useful, but are not expected to study agent skill files before contributing.
  - 2026-08-31 (R-01): The bundle does not specify the authenticated CTA
    copy on `/`. Approved wording: eyebrow "You're signed in", heading
    "Pick up in your dashboard", body "Events, dues, your check-in QR, and
    your Guild profile are in the member dashboard.", button "Go to your
    dashboard". The CTA always routes to `MEMBER_DASHBOARD_PATH` with no
    role branching, preserving the destination of the removed redirect.
- 2026-08-31 (R-01): `ClosingCallToAction` was adapted for authenticated
  visitors rather than left unchanged, so a signed-in reader does not see
  a sign-in prompt below a "go to your dashboard" hero.
- 2026-08-31 (R-02): The header Settings control is scoped to members
  with no admin destinations. Rendering it for admins would touch the
  admin shell, which belongs to R-03; that row should revisit it when
  Settings leaves the rail.
- 2026-08-31 (R-02): The skeleton rail gap is left as-is.
  `AuthenticatedShellSkeleton` renders only from route `loading.tsx`
  files, which are Suspense fallbacks that paint while the page's
  `getPermissions()` await is still pending and cannot receive props.
  The authorized-destination signal is therefore unreachable without new
  architecture that collides with R-03/R-05. An ordinary member briefly
  sees a skeleton rail that disappears when the real shell streams in
  (a fallback swap, not a hydration shift). Deferred to R-03/R-05.
- 2026-09-01 (R-01, R-02): Verification for this pass is component tests
  plus manual browser QA. No Playwright run was performed; stale
  ordinary-member expectations in `mobile-member-experience.spec.ts`
  were updated to the R-02/TC-002 contract for the next run.
- 2026-09-01 (R-03): Resolved the R-02 Settings handoff. Settings leaves the
  rail and drawer and renders in the header for every signed-in user, since
  the spec treats it as an account utility and the R-04 group map has no
  Settings entry. Ordinary members are behaviourally unchanged.
- 2026-09-01 (R-03): Rail expansion is `useState` inside
  `DesktopAdminNavigation`, which absorbed the `<aside>` so the opener and
  labels share one state. The shell stays a server component. Because it
  lives in a layout and survives navigation, the rail collapses on selection
  and on pathname change; nothing is persisted.
- 2026-09-01 (R-04): Group headings use the literal map names — Club, Team,
  Hackathon, External. Rail width is unchanged at `w-16` to `w-56`, and the
  opener reuses the existing PanelLeft icon in the rail header.

## Open questions

1. Technical discovery: confirm whether the existing attachment schema can gain
   Issue/Form-banner owners without a database migration.
2. Technical reproduction: capture the exact production-base issue-assignee
   filter failure before selecting a repair.
3. Tooling: should `lefthook.yml` quote `{staged_files}` so commits touching
   Next.js route-group paths work without `--no-verify`?
4. Tooling: should the repository add a `.gitattributes` with
   `* text=auto eol=lf` so Windows contributors are not blocked by
   `pnpm format`?
5. Onboarding: should the shared Notion env document be updated for the
   nine environment variables this merge introduced? They are
   enumerated only in `.env.example`.
6. Cleanup: should the dead `ISSUES_FEATURE_ENABLED` entry be dropped
   from `.env.example`? No env schema declares it.
7. Local setup: should local dev use `db:push` or `migrate`? `push`
   skips the data backfills embedded in migration files, so seeds like
   `knight_hacks_discord_config` are missing and admin analytics throws;
   `migrate` then fails at `0001` because `push` already created
   `event_tag`.

## Contributor coordination

- `forge/refinements` is the shared implementation branch and bundle source of
  truth. Contributors work and push directly on this branch for now.
- This is an agent-first development trial. Contributors are encouraged to use
  coding agents as real collaborators, not as an afterthought. The approved
  artifacts give the developer and agent the same product, technical, and test
  contract before code changes begin.
- The simplest way to start is to point an agent at
  `.forge/features/blade-refinements/`, give it the refinement IDs being claimed,
  and tell it to follow the repository's agent instructions. The agent should
  read the bundle, `AGENTS.md`, and any relevant repo skills or code context it
  needs. Contributors can read the bundle and supporting material themselves if
  they are curious or prefer to work without an agent; they are not expected to
  read skill files manually.
- Agent assistance does not transfer ownership. The contributor is responsible
  for understanding and reviewing the changes, keeping the work in scope, asking
  when the contract is unclear, and verifying the result.
- Before editing implementation code, announce the refinement IDs and expected
  file areas you intend to claim in the shared development thread. Replace
  `Unclaimed` below with your name/handle and claim date, set the row to
  `In progress`, and make the claim visible to the other contributors.
- If someone already owns an overlapping row or file set, coordinate before
  continuing.
- Keep changes limited to the claimed rows. If implementation reveals a spec,
  SRD, test-case, access, upload, or schema conflict, stop and record it under
  Open questions instead of silently changing the approved contract.
- Update each row to `In progress`, `Blocked`, or `Complete` as work moves, and
  record the checks and visual evidence used to verify completed work.

## Refinement inventory

| ID   | Refinement                                                                                                                                                  | State     | Claim                         | Proof                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- | ------------------------------ |
| R-01 | Keep `/` public for signed-in users, adapt its CTA, and make the product mark return there.                                                                 | Complete  | Spyderma9 (8/31/2026)         | TC-001                         |
| R-02 | Remove the sidebar for ordinary members; place Settings and Sign out together at the top right.                                                             | Complete  | Spyderma9 (8/31/2026)         | TC-002                         |
| R-03 | Replace hover expansion with a top-left admin rail opener; keep collapsed icons clickable, close after selection, and preserve mobile close-on-select.      | Complete  | Spyderma9 (8/31/2026)         | TC-003, TC-NEG-001             |
| R-04 | Group admin destinations into the approved Club, Team, Hackathon, and External map; omit empty groups and mark Guild/outbound destinations as external.     | Complete  | Spyderma9 (8/31/2026)         | TC-004                         |
| R-05 | Remove visible admin eyebrows/descriptions, expose description-only title help, and shrink matching skeletons.                                              | Ready     | Claimed Spyderma9 (8/31/2026) | TC-005                         |
| R-06 | Remove repetitive configuration subtitles while preserving consequential guidance.                                                                          | Ready     | Claimed Spyderma9 (8/31/2026) | TC-005                         |
| R-07 | Use one member-dashboard hierarchy and action set across mobile and desktop.                                                                                | Complete  | azizu06 (9/1/2026)            | TC-007, TC-020                 |
| R-08 | Keep Guild prominent and editable; define Guild, separate public Guild data from private Blade data, and mark its public actions as external.               | Complete  | azizu06 (9/1/2026)            | TC-007, TC-008                 |
| R-09 | Replace the isolated QR action with a compact Check in surface and View QR code action on every viewport.                                                   | Complete  | azizu06 (9/1/2026)            | TC-007                         |
| R-10 | Keep unpaid dues prominent; replace the paid tile with a green paid badge and accessible tooltip beside the Welcome name.                                   | Complete  | azizu06 (9/1/2026)            | TC-006                         |
| R-11 | Keep Previous forms as a small, low-emphasis action at the bottom of the dashboard.                                                                         | Complete  | hector1128 (2026-08-14)       | TC-007                         |
| R-12 | Align sparse and populated Guild/profile content and handle long names, links, companies, filenames, events, and empty states without clipping.             | Complete  | azizu06 (9/1/2026)            | TC-008, TC-020                 |
| R-13 | Change resume upload/replace in signup and existing-member flows to success plus explicit View, without automatic preview.                                  | Ready     | Unclaimed                     | TC-009                         |
| R-14 | Require confirmation before removing a saved profile picture.                                                                                               | Complete  | hector1128 (2026-08-14)       | TC-010                         |
| R-15 | Mark employment fields required and report/focus the precise invalid entry and field without mislabeling legacy validation.                                 | Ready     | Unclaimed                     | TC-011                         |
| R-16 | Preserve admin member-search focus and keystrokes while debounced results and URL state update.                                                             | Ready     | Unclaimed                     | TC-012, TC-NEG-001             |
| R-17 | Reproduce and fix the Issue assignee filter failure without breaking other filters, pagination, or access policy.                                           | Discovery | Unclaimed                     | TC-013                         |
| R-18 | Preserve author-entered issue-description line breaks in preview/detail without changing unrelated Markdown consumers.                                      | Ready     | Unclaimed                     | TC-014                         |
| R-19 | Add authorized managed issue images through picker, paste, and drag/drop with cursor insertion, alt text, approved limits, rendering, removal, and cleanup. | Discovery | Unclaimed                     | TC-015, TC-NEG-002, TC-NEG-003 |
| R-20 | Prefer linked current Member full names in Issue history and Admin logs; fall back to stored Discord labels and preserve system actors.                     | Ready     | Unclaimed                     | TC-016, TC-NEG-003             |
| R-21 | Render issue reminders as linked `Title \| Chat` when a Discord thread exists and linked title alone otherwise.                                             | Complete  | hector1128 (2026-08-14)       | TC-017                         |
| R-22 | Prevent overlapping current/prior hackathon comparison labels while preserving the accessible text/table alternative.                                       | Ready     | Unclaimed                     | TC-021                         |
| R-23 | Fix reported Chrome/Zen member and shell overflow at 320 px, intermediate widths, and desktop without hiding content behind overflow rules.                 | Ready     | Unclaimed                     | TC-020                         |
| R-24 | Verify and polish existing Forms text/image/video instruction-card authoring, upload feedback, ordering, cleanup, and respondent rendering.                 | Ready     | Unclaimed                     | TC-018, TC-NEG-003             |
| R-25 | Add one managed form banner with upload/replace/remove, editable alt text, preview guidance, and responsive 4:1 `cover` presentation.                       | Discovery | Unclaimed                     | TC-019, TC-NEG-002, TC-NEG-003 |
| R-26 | Knight Hacks member-benefits content/page.                                                                                                                  | Deferred  | Unclaimed                     | Out of scope                   |
| R-27 | Grafana analytics replacement or observability infrastructure.                                                                                              | Deferred  | Unclaimed                     | Out of scope                   |

## Task list

- [x] Fetch current `origin/main` and create the isolated worktree/branch.
- [x] Review repository skills, engineering principles, design guidance, existing
      feature artifacts, screenshots, issue reports, and production code paths.
- [x] Instantiate `.forge/features/blade-refinements/`.
- [x] Record the human's eight scoping/product decisions and later identity/
      reminder asks.
- [x] Discover that form image/video instruction media already exists and isolate
      form banner as the new capability.
- [x] Draft `spec.md`, `srd.md`, and `test-cases.md`.
- [x] Resolve the five focused product questions and amend all artifacts.
- [x] Human approves the artifact bundle before implementation/test generation.
- [ ] Reproduce issue-assignee filter failure and document evidence.
- [ ] Inspect attachment schema compatibility and document migration/no-migration
      decision before any schema change.
- [ ] Contributors announce and record refinement-ID claims before editing
      implementation code.
- [ ] Implement claimed slices in checkpoints and keep the inventory current.
- [ ] Run focused verification, React analysis, `pnpm verify:precommit`, derived
      reviewers, browser QA, and `git diff --check`.

## Validation / commands

- `git fetch origin main`: fetched production base successfully.
- Isolated worktree creation from `origin/main`: created
  `/Users/dvidal/Documents/forge-refinements` at `78857b85`.
- `/Users/dvidal/Documents/forge/node_modules/.bin/tsx scripts/create-forge-feature.ts blade-refinements "Blade Refinements"`:
  created the four-file bundle. The fresh worktree has no local `node_modules`, so
  the already-installed runtime from the source worktree was used without
  changing dependency files.
- Code/artifact inspection: confirmed centralized admin headers, hover/focus rail,
  ordinary member/admin projections, dashboard duplication, resume auto-preview,
  photo deletion without confirmation, search remount, employment error collapse,
  current issue reminder/thread data, actor snapshots, existing Forms instruction
  uploads, and lack of an active managed Forms banner field.
- `/Users/dvidal/Documents/forge/node_modules/.bin/prettier --no-config --write
.forge/features/blade-refinements/*.md`: all four Markdown files formatted; the
  repository config could not resolve from a fresh worktree without its own
  `node_modules`, so this artifact-only pass used Prettier defaults.
- `git diff --check --no-index /dev/null <bundle-file>` for all four files: passed.
- Direct Git object verification: worktree `HEAD` and `origin/main` both resolve
  to `78857b85`; that commit contains the Reforge shell, `.forge` artifacts,
  issue reminder code, and Forms platform inspected by this bundle.
- 2026-08-12 approval sync: updated all four artifacts with the five approved
  decisions, formatted them with Prettier, confirmed no stale product-question
  placeholders remain, and reran per-file whitespace checks successfully.
- `pnpm install --frozen-lockfile`: passed in the refinement worktree; pnpm
  reported only the repository's existing warning about moving `pnpm.overrides`
  to the newer settings location.
- `pnpm format`: passed across all 23 packages.
- `pnpm lint`: passed across all 27 tasks with 0 errors. Existing repository
  size/style warnings remain and are unrelated to this artifact-only commit.
- `pnpm typecheck`: passed across all 29 tasks.
- `pnpm verify:push`: passed after the contributor inventory and coordination
  instructions were added. It reran format, lint, and typecheck successfully.

- 2026-08-14: R-14 implemented. Confirmation now gates saved-photo removal in
  `MemberProfilePictureUpload` (used by the member dashboard and settings
  page), which is the only shared component behind that surface. The signup
  flow's `saveMode="deferred"` remove path is unaffected, since nothing is
  saved yet there and the SRD scopes confirmation to saved-photo removal.
  Cancel closes without a mutation call; confirm runs the existing
  `saveMemberProfilePicture` mutation once and returns focus to the upload
  file input (the only control still present after the remove button
  unmounts). Checks run: `pnpm format` (pass), `pnpm --filter=@forge/blade
typecheck` (pass), `pnpm --filter=@forge/blade lint` (0 errors; pre-existing
  unrelated file/function-length warnings only), `pnpm analyze:react:changed`
  (pass, prop API unchanged), and the two existing Vitest files that
  reference this component (`member-profile-settings-form.test.tsx`,
  `member-dashboard.test.tsx`, 8/8 passing — both mock the component and
  don't cover the new confirm flow). No automated browser/E2E verification
  was performed. Manual verification in a real logged-in session is still
  recommended before merge.
- 2026-08-14: `forge/refinements` was rebased onto latest `main` (through
  `dfac35c1`, "Adding Leetcode and /eightball responses #487") and
  force-pushed to origin at the human's explicit request, replacing an
  already-pushed merge commit (`9583bdb5`, "Merge branch 'main' into
  forge/refinements") with a linear history so `rename refinements branch
for forge` is the branch tip again. The merged content was verified
  byte-identical before rewriting history. Any other local clone of this
  branch (e.g. the `dvidal` worktree referenced below) will need to reset to
  the new tip rather than merge/pull normally.
- 2026-08-14: R-11 confirmed already satisfied by existing dashboard code
  (both the desktop `Card` and the mobile `lg:hidden` block already render
  Previous forms as a small `dashboardNestedSurfaceClass` row with a `size="sm"`
  outline button) and marked Complete; no code change was needed.
- 2026-08-14: R-21 implemented in `packages/api/src/utils/issues/reminders.ts`
  (`targetBlock`). The Discord discussion link changed from ` · [Discuss](url)`
  to ` | [Chat](url)`, appended after the bold linked-title heading only when
  `target.discordThreadUrl` is set; omitted entirely otherwise. No other
  reminder builder (events, hackathon events) shares this pattern, so the
  change is scoped to issue reminders only. Existing `[Discuss]` assertions in
  `packages/api/src/tests/issues/reminders.test.ts` were updated to `[Chat]`,
  and a new `TC-017` test was added covering both the threaded and
  threadless cases with a title containing a raw mention and a line break, to
  confirm the existing sanitize/escape behavior around the new separator is
  unchanged. Checks run: `pnpm --filter=@forge/api typecheck` (pass),
  `pnpm --filter=@forge/cron typecheck` (pass, only consumer of
  `deliverIssueReminders`), `pnpm --filter=@forge/api lint` (0 errors,
  pre-existing unrelated file-length warning only), and
  `packages/api/src/tests/issues/reminders.test.ts` (7/7 passing). No message
  was sent to a live Discord channel; the cron job that calls this
  (`apps/cron/src/crons/issue-reminders.ts`) was not run.
- 2026-08-31: Merged `origin/main` (through the 7 commits the branch was
  behind) into `forge/refinements` and pushed. Three environment issues
  surfaced and are recorded here so other contributors do not rediscover
  them. (1) The lefthook `pre-commit` hook fails on any commit that stages
  files under `apps/2026/src/app/(portal)/`: `{staged_files}` expands
  unquoted, so `sh` errors on the parenthesized route-group paths
  (`syntax error near unexpected token '('`). The same expansion breaks the
  `typecheck` job's `[ -n "$filters" ]` test. The merge was committed with
  the `--no-verify` escape hatch documented in `lefthook.yml`, and
  `pnpm verify:push` was run manually instead of skipped. (2) The repository
  has no `.gitattributes` and the Prettier config does not set `endOfLine`,
  so on Windows with `core.autocrlf=true` every file in all 24 packages
  fails `pnpm format`. Resolved locally with `git config core.autocrlf false`
  and a working-tree renormalization; this is a per-machine fix and does not
  travel with the branch. (3) After the merge, `packages/validators/dist`
  was stale while `packages/validators/package.json` resolves types from
  `./dist/index.d.ts`, so `@forge/db` build failed with seven TS2305 errors
  for members that do exist in source (`buildDuesAcademicYear`,
  `formatDuesAmount`, `getDuesAcademicYear`, `getDuesPayableYear`,
  `isLateDuesPaymentWindow`, `MEMBER_DUES_PRICE_CENTS`, `EventAdminQuery`).
  The 71 `no-unsafe-call` errors in `@forge/blade` tests were downstream of
  the same unresolved types. Clearing `dist` and `.cache` and rebuilding
  resolved both. Checks after the fix: `pnpm format` (pass, 24/24),
  `pnpm lint` (0 errors; pre-existing file-length and import-style warnings
  only), `pnpm typecheck` (pass). No code changes were made.
- 2026-09-01 (R-01, R-02): `pnpm --filter=@forge/blade test` (124 files,
  709 tests, all passed), `pnpm --filter=@forge/blade typecheck` (clean),
  `pnpm verify:precommit` (exit 0 — analyze:react:changed 7 files /
  8 components / 0 failures, format 24/24, lint 31/31 with 0 errors and
  113 pre-existing repo warnings, typecheck 33/33). An earlier
  verify:precommit run failed on format for three newly written files;
  resolved with prettier --write and re-run. One Vitest flake observed
  under full-suite load in member-dues-webhook.test.ts (Stripe webhook,
  unrelated to this diff); passed 3/3 in isolation.
  Browser verification on localhost: signed-in landing page stays at `/`
  with the "Go to your dashboard" CTA; signed-out landing page unchanged;
  product mark returns to `/`. TC-002 confirmed against a throwaway
  no-role member session via the e2e signin route on a side-port server —
  no desktop rail, no mobile drawer trigger, Settings and Sign out in the
  header at both widths. Admin account confirmed to still render the rail
  correctly. Scratch rows cleaned up afterward.
  No Playwright run performed. Stale ordinary-member assertions in
  mobile-member-experience.spec.ts (lines ~218-280) were updated to the
  R-02/TC-002 contract for the next run.
  Unauthenticated landing output is functionally identical and
  DOM-equivalent, but not verified at byte level.
- 2026-09-01 (R-03, R-04): `pnpm --filter=@forge/blade test` (125 files,
  714 tests, all passed, no flake this run), `pnpm --filter=@forge/blade
typecheck` (clean), `pnpm verify:precommit` (exit 0 —
  analyze:react:changed 11 files / 11 components / 0 failures, format
  24/24, lint 31/31 with 0 errors and 113 pre-existing Blade warnings,
  typecheck 33/33). Five new tests added: two grouping tests for TC-004
  and three rail-interaction tests for TC-003/TC-NEG-001 in
  `desktop-admin-rail.test.tsx`, using the already-present
  `@testing-library/react` and `user-event` (no dependency added).
  Browser verification on localhost as an admin: rail starts collapsed on
  load; hover does not expand it; the top-left PanelLeft opener toggles
  it; tabbing into a collapsed rail does not expand it; selecting a
  destination navigates and collapses the rail; back/forward leaves it
  collapsed; groups render as Dashboard, Club, Team, Hackathon, External
  with no empty headings; Guild opens in a new tab; Settings now appears
  in the header rather than the rail; the mobile drawer shows the same
  grouping and still closes on select.No Playwright run.
  `admin-member-dashboard.spec.ts` rail assertions (lines 580-585) were
  read and use an admin actor, so they remain valid and were not edited
  this pass. Hover-expansion classes (`hover:w-56`, `focus-within:w-56`,
  `group-hover:opacity-100`) confirmed absent from source by grep across
  `apps/blade/**`. Stale references in `DESIGN_SYSTEM.md` (line 465) and
  `visual-harness.ts` (line 86) were corrected. The `group-focus-within`
  usage in `form-choice-question-editor.tsx` is an unrelated form-builder
  feature and was left untouched.
- 2026-09-01 (R-07, R-08, R-09, R-10): Implemented in
  `apps/blade/src/app/_components/member/member-dashboard.tsx`,
  `dashboard-client.tsx` (skeleton kept in lockstep), and
  `member-qr-code-dialog.tsx`. R-07 removes all five `lg:hidden` mobile
  duplicate blocks and the `order-*`/`hidden` utilities so one DOM order
  serves every viewport; `DuesStatusTile`'s `compact` prop,
  `MemberQRCodeDialog`'s `variant` prop, `EventsOverview`'s `className`
  prop, and `GuildProfileCard`'s `attendance`/`duesStatus`/`events`/
  `eventsUnavailable`/`feedback` props were deleted once their only callers
  went away. R-09 adds a `CheckInTile` with a `View QR code` action; the
  dialog gained an optional `label` prop defaulting to `"QR code"` so the
  shared alumni dashboard is untouched. R-10 adds `PaidDuesBadge`, which
  wraps the existing `DuesStatusBadge` in the house tooltip pattern from
  `event-feedback-cta.tsx` and renders beside the Welcome name only when
  dues are paid; the unpaid tile keeps its prominent top position and its
  paid copy branch was removed as unreachable. R-08 adds a Guild explainer
  paragraph, marks `View Guild profile` external with an `sr-only`
  "(opens in a new tab)" suffix, and unhides the public/private visibility
  badge below 640px. The explainer deliberately does not claim the resume
  is public, because `guild-preferences-dialog.tsx` gates that behind a
  separate `guildResumeVisible` opt-in.
  Checks run: `pnpm format:fix` (24/24), `pnpm verify:precommit` (exit 0 —
  33/33 tasks: analyze:react:changed, format, lint with 0 errors, typecheck),
  `pnpm --filter=@forge/blade test src/tests/member` (13 files, 82/82
  passing), and `git diff --check` (clean).
  Tests updated: `member-dashboard.test.tsx` gained four cases covering the
  paid badge (TC-006), single shared order with no per-viewport duplicates
  and a single Check in action (TC-007), and the Guild explainer plus
  external marking (TC-008). Stale divergence assertions in
  `mobile-member-experience.spec.ts` were inverted to the new contract and
  two Playwright cases added (same sections on mobile and desktop; no
  horizontal overflow at 320/390/768/1024/1440).
  `member-dues-payment.spec.ts` now asserts the paid badge by role/name
  instead of the removed "Paid for the" tile copy.
  `member-onboarding.spec.ts` follows the `View QR code` trigger rename.
  Playwright RUN and green for the two specs this change owns:
  `pnpm --filter=@forge/blade e2e src/tests/e2e/mobile-member-experience.spec.ts
--reporter=list` reports `8 passed (12.6s)`, and the same command for
  `src/tests/e2e/member-dues-payment.spec.ts` reports `6 passed (7.3s)`.
  Getting there needed a local Postgres: Postgres.app holds port 5432 and
  fails with `error: Postgres.app failed to verify "trust" authentication /
DETAIL: You did not confirm the permission dialog.`, and the Docker daemon
  the repo compose setup expects is not running on this machine. A scratch
  cluster was created with `initdb` on port 55432 and `.env`'s `DATABASE_URL`
  pointed at it for the run only; `.env` was restored afterwards and is
  gitignored either way.
  The run found three real defects in the e2e edits, all fixed here.
  (1) The R-09 `View QR code` rename made the pre-existing bare
  `getByRole("button", { name: "View" })` resume matcher ambiguous, because
  substring matching now also hit the QR trigger; both call sites take
  `exact: true`. (2) `mobile-member-experience.spec.ts` never seeded a
  `DuesConfiguration` row, so the dashboard rendered "Payments paused"
  instead of a Pay dues action; `seedE2EData()` now seeds it the way
  `member-dues-payment.spec.ts` already did. (3) The desktop order test
  measured `boundingBox()` while the loading skeleton was still up, so it
  compared against a null box; it now awaits both cards' visibility first.
  The skeleton test was also reordered to assert the loaded heading's
  absence before waiting on loaded content, since waiting first let the
  3000ms `debugLatency` expire.
  PRE-EXISTING, NOT FIXED HERE:
  `member-onboarding.spec.ts:280` fails on its own with
  `strict mode violation: getByText('Your details') resolved to 2 elements`.
  Reproduced with `apps/blade/src/app/_components/member/` and
  `src/tests/e2e/` checked out at `HEAD~1`, so it predates this change; the
  only edit this commit makes to that file is the `View QR code` rename on a
  different test. `name` is UNIQUE on `knight_hacks_form_sections`, so it is
  not duplicate seed rows, and both candidate components
  (`member-signup-form.tsx:74` and `member-profile-settings-form.tsx:107`)
  render an identical `CardTitle`, so the two nodes could not be told apart
  from the failure output. Left for the R-01/R-02 owner rather than papered
  over with a scoped locator.
  Running `member-dues-payment.spec.ts` and `mobile-member-experience.spec.ts`
  in one command also fails, at a different test each way, and fails the same
  way at `HEAD~1`. That cross-file order dependence is pre-existing too.
  Browser QA was also done against a static harness: Tailwind compiled
  from `apps/blade/src/app/globals.css`, the dashboard rendered to HTML in
  three states (unpaid, paid, sparse profile with a very long name/company),
  served locally and inspected at 320, 390, 768, and 1440. Confirmed one
  shared section order at every width, `documentElement.scrollWidth ===
window.innerWidth` at all four widths in all three states, Member details
  left of Guild at 1440, and no clipping of the long name or company. This
  is a static render, so it does not exercise the tooltip or QR dialog
  popovers, tRPC data, or navigation; it is not a substitute for the
  Playwright run above. The harness file was deleted and is not committed.
- 2026-09-01 (R-12) verification: a throwaway Playwright probe rendered the
  member dashboard in long-value, sparse, and settings states at 320, 360, 390,
  768, 1024, and 1440 px. Every `overflow-x-hidden` / `overflow-hidden` ancestor
  was neutralized with an injected stylesheet first, because
  `authenticated-shell.tsx:76` otherwise hides exactly the bug srd.md forbids
  concealing. With both the R-12 heading fix and the (now reverted) R-23 input
  fix in place, all 18 cases reported `scrollWidth === clientWidth`; before them
  the file inputs overflowed by 363 px and the name heading measured 500.203 px.
  The probe spec was deleted and is not committed. Only the R-12 heading fix
  ships, so the file-input overflow described above is still present on the
  branch and belongs to R-23.
  The R-12 regression guard was proven non-vacuous by reverting the fix and
  watching it fail with "expected 'text-xl font-semibold tracking-normal...' to
  contain '[overflow-wrap:anywhere]'".
  Checks run after the R-23 revert: `pnpm verify:precommit` 33/33 successful;
  `pnpm --filter=@forge/blade test` 125 files / 719 tests passed;
  `pnpm --filter=@forge/blade e2e src/tests/e2e/mobile-member-experience.spec.ts`
  8 passed, `src/tests/e2e/member-dues-payment.spec.ts` 6 passed, and both in
  one command 14 passed. The first combined run on a freshly migrated scratch
  database failed once at `mobile-member-experience.spec.ts:219` and passed on
  every rerun, so it is recorded as a cold-start flake rather than a clean pass.
  `git diff --check` clean.
- 2026-09-01 (R-23 revert): R-23 was claimed here and implemented in
  `1cba6df8` before the team Discord was read. It had already been claimed
  there on 8/30. The two upload components and the TC-020 overflow-neutralizing
  stylesheet were reverted, the row is back to Ready/Unclaimed, and the
  measurements are kept above as evidence for its owner. `status.md` also
  carried a stray `|||||||` diff3 marker and a duplicated R-01/R-02 validation
  entry from the earlier rebase; both are removed here and the R-07 through
  R-10 validation entry, which the 8/31 merge had dropped, is restored to the
  top level of the list.

## Links

- Triage artifact:
  `/Users/dvidal/Documents/Codex/2026-08-12/pleas/outputs/forge-refinements-triage.md`
- Worktree: `/Users/dvidal/Documents/forge-refinements`
- Branch: `forge/refinements`
- Remote branch: `https://github.com/KnightHacks/forge/tree/forge/refinements`
- Feature bundle: `.forge/features/blade-refinements/`
- PRs: none
- Issues: GitHub #503, GitHub #504, and the supplied Blade issue/thread context
- Discord/thread context: supplied in the Codex task on 2026-08-12
