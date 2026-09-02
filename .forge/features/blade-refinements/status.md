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
- 2026-09-01 (R-20): Implemented as read-time enrichment only. New
  `packages/api/src/utils/member/display-name.ts` batch-resolves current
  Member names by Member id (Admin logs' `actorMemberId`) and by User id
  (Issue history's `actorId`), called from `listAdminAuditEvents` and
  `listHistory`. The stored `actorLabel`/`actorDisplayName` snapshot columns
  are untouched and remain the fallback for deleted/unlinked/system actors.
  No schema change, no permission change, no client changes (both UIs already
  render the field the server returns).
- 2026-09-01 (R-22): Fixed via deterministic label placement, not a
  collision-detection library: current-hackathon deadline markers render on
  `insideTopLeft`, prior/comparison markers on `insideBottomLeft` with the
  existing `--chart-4` token color, and "Prior app deadline"/"Prior confirm
  deadline" were shortened to "Prior app"/"Prior confirm" so the two rows fit
  at narrow widths. The table alternative below the chart is unchanged.
- 2026-09-01 (R-23): Root cause was `member.tagline` (an unbreakable single
  token can reach the schema's 80-char max) missing `break-words`, plus the
  containing `div.mt-2.space-y-2` lacking `min-w-0`/`w-full`, so a flex
  item's default `min-width: auto` floor kept it from shrinking. The
  authenticated shell's `overflow-x-hidden` was silently clipping the
  overflow instead of scrolling it, which is why a plain
  `document.documentElement.scrollWidth` check could not see the bug — the
  reproduction test added an element-level concealed-overflow check
  (`scrollWidth > clientWidth` on an `overflow-x: hidden` ancestor) to catch
  it. Fixed by adding `break-words` to the tagline and name, and
  `min-w-0 w-full` to their container. No other surface flagged by the new
  320px/768px checks (resume dialog, QR dialog, settings) needed changes;
  scope was kept to what the failing test named, per plan.
- 2026-09-01 (R-24): Verification-only, as scoped — the schema, builder, and
  respondent-render code already worked. Added the missing regression
  coverage (round-trip of the draft-instruction helpers, and loading/error/
  success rendering of `InstructionMedia`) rather than a full upload E2E
  flow through real object storage, which was judged disproportionate to a
  verification slice; flagging this scope call here rather than silently
  deciding it. No import of the legacy `FormSchemaValidator`/
  `InstructionValidator` was introduced (grep-guarded).
- 2026-09-01 (R-24 follow-up): Manual QA found the "Add instruction image"
  and "Add instruction video" file inputs in `form-builder-details-card.tsx`
  were visually identical — same size, no icon, no visible text, only an
  `aria-label` difference — which fails the spec's "editors can see that
  capability... without needing hidden knowledge" requirement. Added a
  visible `Image`/`Video` `Label` above each input, matching the
  Label+Input convention already used elsewhere in the same card. No
  behavior change; `aria-label`s kept as-is so nothing else regresses.

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
| R-03 | Replace hover expansion with a top-left admin rail opener; keep collapsed icons clickable, close after selection, and preserve mobile close-on-select.      | Ready     | Claimed Spyderma9 (8/31/2026) | TC-003, TC-NEG-001             |
| R-04 | Group admin destinations into the approved Club, Team, Hackathon, and External map; omit empty groups and mark Guild/outbound destinations as external.     | Ready     | Claimed Spyderma9 (8/31/2026) | TC-004                         |
| R-05 | Remove visible admin eyebrows/descriptions, expose description-only title help, and shrink matching skeletons.                                              | Ready     | Claimed Spyderma9 (8/31/2026) | TC-005                         |
| R-06 | Remove repetitive configuration subtitles while preserving consequential guidance.                                                                          | Ready     | Claimed Spyderma9 (8/31/2026) | TC-005                         |
| R-07 | Use one member-dashboard hierarchy and action set across mobile and desktop.                                                                                | Ready     | Unclaimed                     | TC-007, TC-020                 |
| R-08 | Keep Guild prominent and editable; define Guild, separate public Guild data from private Blade data, and mark its public actions as external.               | Ready     | Unclaimed                     | TC-007, TC-008                 |
| R-09 | Replace the isolated QR action with a compact Check in surface and View QR code action on every viewport.                                                   | Ready     | Unclaimed                     | TC-007                         |
| R-10 | Keep unpaid dues prominent; replace the paid tile with a green paid badge and accessible tooltip beside the Welcome name.                                   | Ready     | Unclaimed                     | TC-006                         |
| R-11 | Keep Previous forms as a small, low-emphasis action at the bottom of the dashboard.                                                                         | Complete  | hector1128 (2026-08-14)       | TC-007                         |
| R-12 | Align sparse and populated Guild/profile content and handle long names, links, companies, filenames, events, and empty states without clipping.             | Ready     | Unclaimed                     | TC-008, TC-020                 |
| R-13 | Change resume upload/replace in signup and existing-member flows to success plus explicit View, without automatic preview.                                  | Ready     | Unclaimed                     | TC-009                         |
| R-14 | Require confirmation before removing a saved profile picture.                                                                                               | Complete  | hector1128 (2026-08-14)       | TC-010                         |
| R-15 | Mark employment fields required and report/focus the precise invalid entry and field without mislabeling legacy validation.                                 | Ready     | Unclaimed                     | TC-011                         |
| R-16 | Preserve admin member-search focus and keystrokes while debounced results and URL state update.                                                             | Ready     | Unclaimed                     | TC-012, TC-NEG-001             |
| R-17 | Reproduce and fix the Issue assignee filter failure without breaking other filters, pagination, or access policy.                                           | Discovery | Unclaimed                     | TC-013                         |
| R-18 | Preserve author-entered issue-description line breaks in preview/detail without changing unrelated Markdown consumers.                                      | Ready     | Unclaimed                     | TC-014                         |
| R-19 | Add authorized managed issue images through picker, paste, and drag/drop with cursor insertion, alt text, approved limits, rendering, removal, and cleanup. | Discovery | Unclaimed                     | TC-015, TC-NEG-002, TC-NEG-003 |
| R-20 | Prefer linked current Member full names in Issue history and Admin logs; fall back to stored Discord labels and preserve system actors.                     | Complete  | TacoLover (2026-09-01)        | TC-016, TC-NEG-003             |
| R-21 | Render issue reminders as linked `Title \| Chat` when a Discord thread exists and linked title alone otherwise.                                             | Complete  | hector1128 (2026-08-14)       | TC-017                         |
| R-22 | Prevent overlapping current/prior hackathon comparison labels while preserving the accessible text/table alternative.                                       | Complete  | TacoLover (2026-09-01)        | TC-021                         |
| R-23 | Fix reported Chrome/Zen member and shell overflow at 320 px, intermediate widths, and desktop without hiding content behind overflow rules.                 | Complete  | TacoLover (2026-09-01)        | TC-020                         |
| R-24 | Verify and polish existing Forms text/image/video instruction-card authoring, upload feedback, ordering, cleanup, and respondent rendering.                 | Complete  | TacoLover (2026-09-01)        | TC-018, TC-NEG-003             |
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
  - 2026-09-01 (R-20, R-22, R-23, R-24): claimed by TacoLover.
    `pnpm format` (pass, all packages), `pnpm lint` (0 errors across all
    files touched; pre-existing max-lines/import-type warnings only, same
    as before this diff), `pnpm typecheck` (pass, 33/33 tasks),
    `pnpm analyze:react:changed` (`ok: true` for both changed React files). - R-20: `pnpm --filter=@forge/api test -- actor-display-enrichment`
    (new integration test against a disposable Postgres database, 4/4
    passed) proves the resolver returns the linked Member's _current_
    name, leaves unresolved ids out of the map so callers keep their
    stored snapshot, and batches in one query. - R-22: new Playwright case in `admin-hackathon-analytics.spec.ts`
    (a fixture hackathon whose deadline offsets land a day apart from the
    current one). Confirmed it fails without the fix (`Prior app` label
    not found) and passes with it; bounding-box assertion proves the
    current/prior labels no longer share a row, and the table alternative
    still shows a `Comparison cumulative` column. - R-23: new 320px/768px Playwright cases in
    `mobile-member-experience.spec.ts`. Reproduced the reported
    Chrome/Zen clipping with an 80-char unbreakable tagline: a plain
    `scrollWidth` check passed even though content was being clipped,
    because the shell's `overflow-x-hidden` absorbs the overflow instead
    of scrolling it — so the test also checks for any `overflow-x:hidden`
    element whose own content exceeds its box. Confirmed failing before
    the fix (screenshot showed the tagline visually clipped), passing
    after `break-words`/`min-w-0` were added. Re-ran the full spec 3x to
    confirm the one other failure seen (`keeps desktop dashboard order...`)
    is a pre-existing flake, not a regression: it fails intermittently on
    unmodified `main` too (1/3 baseline runs), and passes in isolation
    every time. - R-24: `pnpm --filter=@forge/blade test -- admin-form-builder
  generic-form-response-form` (11/11 passed) — added round-trip
    coverage for the draft-instruction helpers (text/image/video survive
    save, blank textarea drops only the text block, removing one media
    item drops only that block) and loading/error/success rendering for
    `InstructionMedia`. No new E2E upload flow was added (see decision
    log); `grep -rn "FormSchemaValidator\|InstructionValidator"
  apps/blade/src` returns nothing from this diff.
    Diff scope: `packages/api/src/utils/member/display-name.ts` (new),
    `packages/api/src/routers/issues.ts`,
    `packages/api/src/utils/audit/queries.ts`,
    `packages/api/src/tests/integration/actor-display-enrichment.test.ts`
    (new), `apps/blade/src/app/_components/admin/analytics/
hackathon-analytics-dashboard.tsx`,
    `apps/blade/src/app/_components/member/member-dashboard.tsx`,
    `apps/blade/src/tests/e2e/admin-hackathon-analytics.spec.ts`,
    `apps/blade/src/tests/e2e/mobile-member-experience.spec.ts`,
    `apps/blade/src/tests/forms/admin-form-builder.test.ts`,
    `apps/blade/src/tests/forms/generic-form-response-form.test.tsx`.
  - 2026-09-01 (R-23, follow-up): Manual QA on a real populated form
    (`/admin/forms/<id>`) found the admin form builder overflowed at 320px
    even with trivial short field values — a different bug than the dashboard
    tagline fix above. `admin-form-builder.tsx`'s `<div className="grid
gap-5">` had no `grid-template-columns`, so its implicit column
    auto-sized to its content's min-content width (measured 652.9px in a
    real 320px-viewport browser) instead of the viewport. The same trap
    recurred at every nested `grid gap-N`/`flex gap-N` boundary down to the
    Title/Slug/Description fields, so `min-w-0` was added at each boundary in
    `admin-form-builder.tsx`, `form-builder-details-card.tsx`,
    `form-builder-questions-section.tsx`, and `form-sortable-question-card.tsx`.
    Reproduced with `documentElement.scrollWidth - innerWidth` plus a
    bounding-rect scan for elements whose `right` exceeds the viewport
    (`grid-template-columns` computed via `getComputedStyle` confirmed the
    exact 652.9px track before the fix, 296px after). New assertion added to
    `forms-platform.spec.ts`'s existing save step; confirmed it fails against
    the unfixed layout (via `git stash`) and passes after.
  - 2026-09-01 (R-23, sr-only file input — root cause, from the reverted
    8/30 attempt's evidence): the earlier reverted R-23 work measured the
    `sr-only` file-picker `<Input>` in `member-profile-picture-upload.tsx`
    and `member-resume-upload.tsx` computing to `position: absolute; width:
1440px`, pushing `scrollWidth` 363px past a 320px viewport. Root cause:
    `@forge/ui/input.tsx` bakes `h-9 w-full` into every `Input` via
    `cn()`/`twMerge`, and `twMerge` doesn't treat `sr-only` as conflicting
    with `h-*`/`w-*` (different class groups), so both survive and the
    visible sizing wins the cascade. Fixed by swapping the styled `Input` for
    a bare native `<input>` on all three affected file pickers (the two above
    plus the two new instruction-media pickers added for R-24 this session,
    which had the same latent bug). `packages/ui/src/input.tsx` itself was
    left unchanged — fixing the shared primitive's class-merge behavior is a
    larger, higher-blast-radius change (every `Input` consumer) than this
    slice's scope; noting it here rather than fixing silently or expanding
    scope unilaterally. Verified via `getBoundingClientRect` in a real
    browser: both file inputs now measure `1×1px`, `position: absolute`,
    zero page overflow. The same `sr-only`-on-`Input` pattern still exists,
    unfixed, in `admin/members/member-detail-dialog.tsx` (×2) and
    `admin/companies/company-admin-detail.tsx` per the original evidence —
    those are outside member/forms scope and left for whoever owns that
    surface.
  - 2026-09-01 (R-24, follow-up): manual QA requested visible previews for
    uploaded instruction media (previously just a text row: "Image:
    filename"). Extracted the respondent view's inline `InstructionMedia`
    into a shared `apps/blade/src/app/_components/forms/instruction-media.tsx`
    (fetch + loading/error state), reused by the builder's media list via a
    `compact` thumbnail mode; respondent view is visually unchanged (same
    default sizing). Also, on request: the image/video select boxes are
    `h-20` on mobile / `h-32` at `sm:` and up (was fixed `h-32`), and the
    media-list row hides the filename text below `sm:` (thumbnail + trash
    icon only), matching R-23's mobile-density direction.
    `pnpm --filter=@forge/blade test` (124 files, 713 passed),
    `pnpm --filter=@forge/api test` (101 files, 733 passed), `pnpm format`,
    `pnpm lint` (0 errors, pre-existing warnings only),
    `pnpm --filter=@forge/blade typecheck` all clean. `form-builder-desktop.png`
    visual baseline regenerated deliberately (taller media boxes, icon-only
    remove button); the fixture form has no media items, so the thumbnail
    preview isn't visible in that baseline.
  - 2026-09-01: `TacoLover` is this session's own claim handle (confirmed by
    the human) — the apparent R-20/R-22/R-23/R-24 claim collision surfaced by
    `sync Discord ticket claims into the refinements inventory` on origin was
    the same person, not two contributors. No coordination conflict.
    Merging the 14 commits origin gained meanwhile (R-03/R-04, R-07 through
    R-12, R-17, R-18, and the reverted R-23 attempt) before pushing.

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
