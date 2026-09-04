# Blade Refinements Status

Current phase: R-19, R-25, and R-30 complete; draft PR open

## Decision log

- 2026-09-04 (R-03 through R-06 compatibility): Audited the three pages added
  by PRs #527 and #529. Projects, Project import, and Judging rooms remain
  independently permission-gated entries in the Hackathon navigation group,
  with correct active-route matching. All three use the shared compact admin
  header, so their eyebrow props do not render and their descriptions appear
  only through the accessible page-info control. Their main panels contain no
  repetitive configuration subtitles. Updated the Judging rooms loading page
  to use the same compact header skeleton as the two project pages, and added
  regression coverage for the three navigation entries and loading state.
- 2026-09-04 (R-19, R-25): Implemented managed issue images and managed form
  banners. Issue images support picker, paste, and drop insertion, durable
  references, accessible alt text, authorized reads, strict raster validation,
  retention limits, and cleanup. Forms support one responsive 4:1 banner with
  add, replace, remove, alt-text editing, respondent rendering, authorized
  reads, and cleanup. The additive database migration was regenerated as
  `0045_soft_makkari` after merging PR #529's `0044_open_mikhail_rasputin`.
  The migration was generated, tested, and applied to the local development
  database on 2026-09-04.
- 2026-09-04 (integration and review): Merged PR #529 from `origin/main` into
  the local branch as merge commit `71b755bb`. The only merge conflict was the
  admin navigation, resolved by retaining the established domain grouping and
  adding Judging rooms to the Hackathon group. Nine review passes ran before
  the human stopped the loop. Every reported finding was fixed; the ninth-pass
  direct-upload authorization fix was not submitted to a tenth review. Future
  review-agent fix-and-review loops are capped at five passes unless the human
  sets another limit. Tracking is in [issue #530](https://github.com/KnightHacks/forge/issues/530)
  and [draft PR #512](https://github.com/KnightHacks/forge/pull/512).
- 2026-09-04 (R-30): Added a root `.worktreeinclude` with the ignored `.env`
  rule. Codex and Claude Code both document the same root convention for
  copying matching ignored files into new supported managed worktrees. It does
  not retroactively populate existing worktrees, and plain `git worktree`
  commands do not process it; support in other tools depends on the tool. This
  existing task worktree was populated separately from the local checkout;
  verification checks only that the destination exists and is byte-identical.
  `.env` remains ignored and untracked. References: [Codex worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)
  and [Claude Code worktrees](https://code.claude.com/docs/en/worktrees).
- 2026-09-04 (R-19, R-25): Dylan confirmed that both managed-media
  refinements must ship before the refinements branch is ready. R-26 and R-27
  remain deferred. DVidal1205 claimed R-19 and R-25, including the additive
  schema and migration work required to give issue images durable ownership and
  form banners a distinct attachment purpose. Implementation will reuse the
  Forms direct-upload, finalization, authorized-download, and cleanup flow.
- 2026-09-03 (R-16): Confirmed in Chromium that the admin members page's
  `key={input.query}` replaced the search input after each debounced server
  result, dropping focus and discarding subsequent keyboard input. Removed only
  that query-derived remount boundary; the existing 300 ms debounce,
  `router.replace` URL state, server filtering, and pagination reset remain
  unchanged. A Playwright regression now types a partial member name, waits for
  filtered results, continues typing through the page keyboard without
  refocusing, and verifies the final value, URL, result, focus, and caret. The
  test failed on the original code and passed after the fix; the complete admin
  member dashboard suite passed 6/6. Validation also passed `pnpm format`
  (24/24 tasks), `pnpm lint` (31/31 tasks, 0 errors; existing warnings remain),
  `pnpm typecheck` (33/33 tasks), the R-16-scoped React analyzer (1 file, 0
  failures), and `git diff --check`. The default `pnpm analyze:react:changed`
  scan remains blocked by an analyzer exception in the already-committed R-15
  `employment-history-editor-focus.test.tsx`; the R-16 page itself analyzes
  successfully. No API, database, schema, dependency, permission, or visual
  styling changed.
- 2026-09-03 (R-15): Implemented in the Blade member-settings career flow.
  Validation remains submit-triggered initially, revalidates live after the
  first failed save, shows all inline field errors with only the first issue in
  the form summary, and reserves legacy guidance for entries with an unknown
  imported status.
- 2026-09-03 (R-13): Implemented on the shared
  `MemberResumeUpload` path used by signup, member dashboard, and member
  settings. Successful upload/replace shows an inline status for five
  seconds and waits for an explicit View action; admin resume upload is outside
  this refinement. Committed as `9c19bc4d`.
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
- 2026-09-01 (R-18): Claimed after reading the team Discord, which is the
  authoritative claim list for this task. As of 9/1 3:01 PM Spyderma9 holds
  R-01 through R-06, TacoLover holds R-20/R-22/R-23/R-24, and Eric12 holds
  R-13/R-15/R-16, leaving R-18 as the only unclaimed Ready row. R-18 touches
  `packages/ui/src/markdown-content.tsx` and the three issue call sites, which
  no one else's claim overlaps.
- 2026-09-01 (R-18): The cause is CommonMark, not the issue code. A lone `\n`
  is a soft break and renders as a space; only two trailing spaces or a
  backslash produce `<br>`. Issue descriptions are authored in a plain
  `Textarea`, so authors type chat-style newlines and lose them on save. The fix
  is `remark-breaks` behind a new opt-in `breaks` prop on
  `packages/ui/src/markdown-content.tsx`, switched on at the three issue call
  sites only. It is opt-in because the same component renders club and member
  event descriptions, where the standard soft-break behavior is correct, and
  R-18 forbids changing unrelated consumers. Preview and detail match by
  construction: both render the same component with the same prop.
- 2026-09-01 (R-17): Reproduced against the production-base code before
  changing it, as the SRD requires. The assignee filter was the only condition
  in `issues.list` built as a correlated `exists()` subquery comparing
  `IssuesToUsersAssignment.issueId` to `Issue.id`. Drizzle's relational query
  builder selects `from "knight_hacks_issue" "Issue"`, so that inner comparison
  compiled to the physical table name, which has no FROM-clause entry under the
  alias. Against a migrated Postgres seeded with three teams, three users, and
  eight issues, the exact failure was `error: invalid reference to FROM-clause
entry for table "knight_hacks_issue"`. The whole list query throws, so the
  admin issues page falls to its error boundary and shows the generic "Issues
  could not be loaded" instead of results, which is exactly the reported
  symptom. The repair mirrors `roleVisibilityPredicate`, which already solved
  this for issue visibility: a new exported `assigneeFilterPredicate` uses an
  uncorrelated `inArray(Issue.id, subquery)` so the outer column stays in the
  top-level predicate where the alias applies. Set semantics are unchanged.
  Verified on the seeded database that a user assigned across two teams returns
  all six of their issues, a single-assignment user returns one, an unassigned
  user returns a truthful empty result rather than an error, the filter still
  composes with the owning-team filter, and `pageSize: 2` pages 2 and 3 return
  the correct slices with `totalCount` 6. Access policy is untouched;
  `roleVisibilityPredicate` still runs as its own condition.
- 2026-09-01 (R-17, incidental repair): `pnpm-lock.yaml` was reformatted in
  commit 69d19dc7 because lefthook's pre-commit format job globs `*.yaml`, so
  staging the lockfile let prettier rewrite all 19,950 lines and requote every
  key. That broke `packages/api/src/tests/root/version-pins.test.ts`, whose
  parser only strips single quotes, and it was failing on the shared branch. The
  lockfile has been regenerated from the pre-commit state with
  `pnpm install --lockfile-only`; the diff is now only `remark-breaks@4.0.0` and
  its three transitive dependencies, with no importer or package removed.
  Anyone else who stages `pnpm-lock.yaml` on this repo will hit the same trap;
  committing it with `--no-verify` avoids it until the glob is narrowed.
- 2026-09-01 (inventory sync): This table lagged the team Discord by days, which
  is what caused the R-23 collision. Claims stated in the group DM are now
  recorded here: Eric12 took R-13, R-15, and R-16 on 9/1 at 3:01 PM, and
  TacoLover took R-20, R-22, R-23, and R-24 on 8/30 at 3:30 PM. Those are their
  own public statements written down, not assignments made for them. After this
  sync no Ready row is unclaimed; R-17, R-19, and R-25 are still Discovery and
  R-26 and R-27 are Deferred. Dylan's 8/28 ask about form-respondent text
  alignment still has no row; Spyderma9 said on 9/1 at 3:11 PM that he would try
  it after R-05 and R-06, so it is left to him rather than claimed here.
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
  token can reach the schema's 80-char max) with no width-shrinking treatment,
  plus the containing `div.mt-2.space-y-2` lacking `min-w-0`/`w-full`, so a
  flex item's default `min-width: auto` floor kept it from shrinking. The
  authenticated shell's `overflow-x-hidden` was silently clipping the
  overflow instead of scrolling it, which is why a plain
  `document.documentElement.scrollWidth` check could not see the bug — the
  reproduction test added an element-level concealed-overflow check
  (`scrollWidth > clientWidth` on an `overflow-x: hidden` ancestor) to catch
  it. First fixed with `break-words` (`overflow-wrap: break-word`) plus
  `min-w-0 w-full` on the container; superseded during the merge with R-12's
  `[overflow-wrap:anywhere]` plus `min-w-0` directly on the tagline/name
  elements, which R-12's investigation found is the version that actually
  reduces min-content sizing (`break-word` does not) — see the R-12 entries
  below. No other surface flagged by the new 320px/768px checks (resume
  dialog, QR dialog, settings) needed changes; scope was kept to what the
  failing test named, per plan.
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
- 2026-09-01 (R-05): The header description moves behind a Radix tooltip
  paired with an always-in-DOM `sr-only` span referenced by
  `aria-describedby`, so the text stays reachable by keyboard and screen
  reader and remains assertable in static markup tests. The old eyebrow
  copy is dropped rather than reused as tooltip text.
- 2026-09-01 (R-05): `eyebrow` and `icon` props stay on `AdminPageHeader`
  as accepted-but-unrendered rather than being stripped from the type and
  its ~27 call sites, keeping the diff to the component itself.
- 2026-09-01 (R-05): `AdminPageInfoTooltip` mounts its own
  `TooltipProvider`. No application-level provider exists — all six in
  the app are feature-local, and the desktop rail's provider does not
  wrap the admin header.
- 2026-09-01 (R-05): The `AuthenticatedShellSkeleton` reshape into
  clustered rows is cosmetic only, so the loading state resembles the
  grouped rail. The underlying gap — the skeleton cannot know whether a
  member has admin destinations — is unchanged and unsolved.
- 2026-09-01 (R-06): Of the nine configuration-panel `CardDescription`
  subtitles, only `hackathon-discord-event-config.tsx` was removed
  ("Configure the role granted at primary check-in and the channel used
  for this hackathon's event reminders."), as it restates the card title
  and the two visible fields below it. The other eight each state a real
  consequence — deletion behaviour, permission scope, migration
  behaviour, or a non-obvious data-model fact — and were kept. Scope was
  limited to configuration panels; the ~144 `DialogDescription` instances
  are a different surface and were not touched.
- 2026-09-02 (R-28): The misalignment comes from how browsers lay out
  `<legend>`. The whole legend box gets centered on the fieldset's top
  border, so a one-line prompt straddles it neatly while a three-line
  prompt puts most of itself above the card. The fix moves every prompt
  into the card's normal flow, which also drops the border-notch look
  for short prompts. Dylan had said those looked fine, but the text
  sitting on the card edge was the thing he flagged, so removing it is
  the point rather than a side effect.
- 2026-09-02 (R-28): Editing `forms/generic-form-response-form.tsx` is
  approved even though R-24 touched it. Different hunks — R-28 owns the
  question fieldset and legend, and leaves R-24's `InstructionMedia`
  extraction, inventory row, and `forms-platform.spec.ts` assertions
  alone. Mac Chrome stays a manual QA target here; if the border still
  crosses text after this, that's a separate finding.
- 2026-09-03 (R-28): Dropping `px-1` from the legend is intentional. The
  card's own padding now supplies the inset, and keeping another 4px
  would push the prompt out of line with the `Question N of M` text
  underneath it.
- 2026-09-03 (R-29): New row. Dylan reported Blade's scrollbar as "hella
  thick" on macOS Chrome and asked for a thin custom bar in the primary
  violet. macOS renders the classic 15px scrollbar whenever a mouse is
  attached or Appearance > Show scroll bars is set to Always, which is
  why the bar looks heavy on some machines and invisible on others. The
  styling lives in `apps/blade/src/app/globals.css` under `@layer base`
  so it applies to every scroll container in the app rather than one
  panel, and it uses `hsl(var(--primary))` rather than a hex value, per
  `DESIGN_SYSTEM.md`.
- 2026-09-03 (R-29): The Firefox fallback is wrapped in
  `@supports not selector(::-webkit-scrollbar)` on purpose. From Chrome
  121 on, setting `scrollbar-width` or `scrollbar-color` on an element
  makes Chrome discard every `::-webkit-scrollbar` rule for it and fall
  back to its own bar, so declaring both unguarded, the way
  `apps/2025/src/styles/globals.css` does, would throw away the sizing
  this row asks for on the exact browser Dylan reported. Verified in
  headless Chromium that `CSS.supports("selector(::-webkit-scrollbar)")`
  is `true` and that computed `scrollbar-width`/`scrollbar-color` stay
  `auto`, so Chrome keeps the webkit rules.
- 2026-09-03 (R-29): Verified visually against the running app. The first
  attempt used headless Chromium and measured a 0px scrollbar gutter with
  identical before/after screenshots, which was a harness artifact rather
  than a property of the fix: headless Chromium never paints a scrollbar
  here. Headed Chromium on the same machine reports an 8px gutter and
  renders the violet thumb, on both an isolated page and Blade's own
  landing page at `http://127.0.0.1:3100/`.
- 2026-09-03 (R-29): Narrowed the thumb from 8px to 6px, then to 2px. Dylan
  reviewed the first screenshot and asked for it "a smiiiiiiiidge thinner",
  which gave 6px; he reviewed the dashboard and sidebar captures at that
  width and asked "can we make it thinner?", and TacoLover suggested a 1px
  bar, so the visible thumb is now 2px. The Firefox `@supports` guard and the
  transparent track are untouched.
- 2026-09-03 (R-29): Tried and then dropped a wider drag target. The thumb
  briefly used `border: 4px solid transparent` with `background-clip:
padding-box` on a 10px bar, so it painted as a 2px hairline while hit
  testing used the full 10px box. Measured on `/member/dashboard` at 1440x900,
  that 10px is free on the page shell and the card columns but not on the
  collapsed sidebar rail, which is 47px wide: the rail's content box dropped
  to 37px and its icons sat 5px left of the rail's visual centre. Reverted to
  a plain 2px bar. Almost everyone scrolls Blade with a wheel or a trackpad,
  so the bar earns its width as a position indicator rather than as a drag
  handle, and the narrowest bar is the one that distorts the least layout.

- Merged `origin/main` into `forge/refinements` on 9/3/2026 at Dylan's request,
  after the Devpost project-import and judge-directory PR (#527) landed on main.
  The only conflict was `admin-navigation.ts`: main added `judgeProjects` and
  `projectAdmin` entries to the ungrouped list this branch had already replaced
  with the R-01 grouping map. Both new destinations were kept and given
  `group: "Hackathon"`, since project judging belongs to a hackathon and an item
  without a group is filtered out by `getAdminNavigationGroups`.

## Open questions

1. Technical reproduction: capture the exact production-base issue-assignee
   filter failure before selecting a repair.
2. Tooling: should `lefthook.yml` quote `{staged_files}` so commits touching
   Next.js route-group paths work without `--no-verify`?
3. Tooling: should the repository add a `.gitattributes` with
   `* text=auto eol=lf` so Windows contributors are not blocked by
   `pnpm format`?
4. Onboarding: should the shared Notion env document be updated for the
   nine environment variables this merge introduced? They are
   enumerated only in `.env.example`.
5. Cleanup: should the dead `ISSUES_FEATURE_ENABLED` entry be dropped
   from `.env.example`? No env schema declares it.
6. Local setup: should local dev use `db:push` or `migrate`? `push`
   skips the data backfills embedded in migration files, so seeds like
   `knight_hacks_discord_config` are missing and admin analytics throws;
   `migrate` then fails at `0001` because `push` already created
   `event_tag`.
7. Tooling: `pnpm --filter=<pkg> typecheck` skips the `^build` step the
   root turbo task declares, so it can report false type errors against
   stale generated `.d.ts` files. Should the per-package script depend on
   the build?
8. Tooling: `apps/blade`'s `test` script uses the POSIX prefix
   `NODE_ENV=test ...`, which fails in PowerShell. Should scripts be
   normalized with `cross-env`?
9. Cleanup: `admin-page-eyebrows.ts` (28 entries) is dead data after
   R-05 — still imported by 25 consumers and passed as props
   `AdminPageHeader` no longer renders. Remove in a follow-up?
10. Ownership: the `AuthenticatedShellSkeleton` permission gap has no
    remaining row to inherit it, since R-06 is the last claimed
    refinement. Who picks it up?
11. Coverage: R-28 has no automated browser regression. TC-022 is proven
    by manual QA only, because a Playwright test asserting legend and
    card geometry could not be executed locally — the browsers are not
    installed and the case is database-backed. Who adds it, and should it
    live in `forms-platform.spec.ts` alongside the R-23/R-24 assertions?

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

| ID   | Refinement                                                                                                                                                  | State    | Claim                     | Proof                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | ------------------------------------------- |
| R-01 | Keep `/` public for signed-in users, adapt its CTA, and make the product mark return there.                                                                 | Complete | Spyderma9 (8/31/2026)     | TC-001                                      |
| R-02 | Remove the sidebar for ordinary members; place Settings and Sign out together at the top right.                                                             | Complete | Spyderma9 (8/31/2026)     | TC-002                                      |
| R-03 | Replace hover expansion with a top-left admin rail opener; keep collapsed icons clickable, close after selection, and preserve mobile close-on-select.      | Complete | Spyderma9 (8/31/2026)     | TC-003, TC-NEG-001                          |
| R-04 | Group admin destinations into the approved Club, Team, Hackathon, and External map; omit empty groups and mark Guild/outbound destinations as external.     | Complete | Spyderma9 (8/31/2026)     | TC-004                                      |
| R-05 | Remove visible admin eyebrows/descriptions, expose description-only title help, and shrink matching skeletons.                                              | Complete | Spyderma9 (8/31/2026)     | TC-005                                      |
| R-06 | Remove repetitive configuration subtitles while preserving consequential guidance.                                                                          | Complete | Spyderma9 (8/31/2026)     | TC-005                                      |
| R-07 | Use one member-dashboard hierarchy and action set across mobile and desktop.                                                                                | Complete | azizu06 (9/1/2026)        | TC-007, TC-020                              |
| R-08 | Keep Guild prominent and editable; define Guild, separate public Guild data from private Blade data, and mark its public actions as external.               | Complete | azizu06 (9/1/2026)        | TC-007, TC-008                              |
| R-09 | Replace the isolated QR action with a compact Check in surface and View QR code action on every viewport.                                                   | Complete | azizu06 (9/1/2026)        | TC-007                                      |
| R-10 | Keep unpaid dues prominent; replace the paid tile with a green paid badge and accessible tooltip beside the Welcome name.                                   | Complete | azizu06 (9/1/2026)        | TC-006                                      |
| R-11 | Keep Previous forms as a small, low-emphasis action at the bottom of the dashboard.                                                                         | Complete | hector1128 (2026-08-14)   | TC-007                                      |
| R-12 | Align sparse and populated Guild/profile content and handle long names, links, companies, filenames, events, and empty states without clipping.             | Complete | azizu06 (9/1/2026)        | TC-008, TC-020                              |
| R-13 | Change resume upload/replace in signup and existing-member flows to success plus explicit View, without automatic preview.                                  | Complete | Claimed Eric12 (9/1/2026) | TC-009                                      |
| R-14 | Require confirmation before removing a saved profile picture.                                                                                               | Complete | hector1128 (2026-08-14)   | TC-010                                      |
| R-15 | Mark employment fields required and report/focus the precise invalid entry and field without mislabeling legacy validation.                                 | Complete | Claimed Eric12 (9/1/2026) | TC-011                                      |
| R-16 | Preserve admin member-search focus and keystrokes while debounced results and URL state update.                                                             | Complete | Claimed Eric12 (9/1/2026) | TC-012, TC-NEG-001                          |
| R-17 | Reproduce and fix the Issue assignee filter failure without breaking other filters, pagination, or access policy.                                           | Complete | azizu06 (9/1/2026)        | TC-013                                      |
| R-18 | Preserve author-entered issue-description line breaks in preview/detail without changing unrelated Markdown consumers.                                      | Complete | azizu06 (9/1/2026)        | TC-014                                      |
| R-19 | Add authorized managed issue images through picker, paste, and drag/drop with cursor insertion, alt text, approved limits, rendering, removal, and cleanup. | Complete | DVidal1205 (9/4/2026)     | TC-015, TC-NEG-002, TC-NEG-003              |
| R-20 | Prefer linked current Member full names in Issue history and Admin logs; fall back to stored Discord labels and preserve system actors.                     | Complete | TacoLover (2026-09-01)    | TC-016, TC-NEG-003                          |
| R-21 | Render issue reminders as linked `Title \| Chat` when a Discord thread exists and linked title alone otherwise.                                             | Complete | hector1128 (2026-08-14)   | TC-017                                      |
| R-22 | Prevent overlapping current/prior hackathon comparison labels while preserving the accessible text/table alternative.                                       | Complete | TacoLover (2026-09-01)    | TC-021                                      |
| R-23 | Fix reported Chrome/Zen member and shell overflow at 320 px, intermediate widths, and desktop without hiding content behind overflow rules.                 | Complete | TacoLover (2026-09-01)    | TC-020                                      |
| R-24 | Verify and polish existing Forms text/image/video instruction-card authoring, upload feedback, ordering, cleanup, and respondent rendering.                 | Complete | TacoLover (2026-09-01)    | TC-018, TC-NEG-003                          |
| R-25 | Add one managed form banner with upload/replace/remove, editable alt text, preview guidance, and responsive 4:1 `cover` presentation.                       | Complete | DVidal1205 (9/4/2026)     | TC-019, TC-NEG-002, TC-NEG-003              |
| R-26 | Knight Hacks member-benefits content/page.                                                                                                                  | Deferred | Unclaimed                 | Out of scope                                |
| R-27 | Grafana analytics replacement or observability infrastructure.                                                                                              | Deferred | Unclaimed                 | Out of scope                                |
| R-28 | Keep short and wrapped respondent question prompts inside their bordered question cards without colliding with the card border.                             | Complete | Spyderma9 (9/2/2026)      | TC-022                                      |
| R-29 | Replace the OS scrollbar across Blade with a thin custom scrollbar in the primary violet, without stealing layout width on overlay-scrollbar machines.      | Complete | azizu06 (9/3/2026)        | Manual QA                                   |
| R-30 | Copy the ignored local `.env` into new supported managed worktrees through a tracked root `.worktreeinclude`.                                               | Complete | DVidal1205 (9/4/2026)     | File existence, byte identity, ignore check |

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
- [x] Inspect attachment schema compatibility and document migration/no-migration
      decision before any schema change.
- [x] Contributors announce and record refinement-ID claims before editing
      implementation code.
- [x] Add and verify Codex managed-worktree environment-file inclusion without
      tracking or exposing `.env`.
- [x] Implement claimed slices in checkpoints and keep the inventory current.
- [x] Run focused verification, React analysis, `pnpm verify:precommit`, derived
      reviewers, browser QA, and `git diff --check`.

## Validation / commands

- 2026-09-04 (R-19, R-24, R-25 local upload recovery): `pnpm db:migrate`
  applied `0045_soft_makkari` successfully. Direct schema verification confirmed
  both issue-attachment tables exist and the form-attachment purpose constraint
  accepts `banner`, `instruction`, and `response`.
- 2026-09-04 (R-03 through R-06 compatibility): Audited `/judge/projects`,
  `/admin/projects`, and `/admin/judging` after merging PRs #527 and #529.
  Focused header, loading, and navigation coverage passed 15/15 tests. Strict
  React analysis passed for the changed loading page. `pnpm format` passed
  24/24 tasks, `pnpm lint` passed 31/31 tasks with no errors and existing
  warnings only, and `pnpm typecheck` passed 33/33 tasks.
- 2026-09-04 (R-19, R-25, PR #529 integration): `pnpm format`, `pnpm lint`
  (31/31 tasks, 0 errors; existing warnings remain), and `pnpm typecheck`
  (33/33 tasks) passed. Full tests passed for validators (23 files, 263 tests),
  database (29 files, 141 tests), API (109 files, 761 tests), and Blade (135
  files, 762 tests). The Blade production build passed with a temporary
  32-character `JUDGING_ACCESS_SECRET` test value required by PR #529; the
  copied local `.env` was not changed. The form-builder visual baseline passed
  1/1 after the merge. The targeted strict React analysis passed for 10 relevant
  files and 13 components. `pnpm verify:precommit` remains blocked only by the
  existing analyzer exception in
  `employment-history-editor-focus.test.tsx`; 46 of its 47 analyzed files
  passed. The generated migration lineage test ends at index 45 with
  `0045_soft_makkari`.
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
- 2026-09-01 (R-18) verification: `pnpm --filter=@forge/blade test` 126 files /
  723 tests passed, including the pre-existing `markdown-content.test.tsx`,
  which still asserts event-description rendering and is unaffected;
  `pnpm verify:precommit` 33/33 successful; `pnpm analyze:react:changed`
  18 files, zero not-ok; `git diff --check` clean.
  New file `apps/blade/src/tests/issues/issue-description-line-breaks.test.tsx`
  covers TC-014: adjacent plain lines render `<br/>`, a blank line still yields
  exactly two paragraphs rather than another break, links/inline code/lists
  survive, long unbroken content stays inside the `break-words` container, and
  a consumer that omits the prop still collapses the newline. The guard was
  proven non-vacuous by forcing `remarkPlugins` to `undefined` and watching it
  fail with "expected '<div class=\"min-w-0 break-words...' to contain
  '<br/>'".
  `remark-breaks@^4.0.0` was added to `packages/ui`, so `pnpm-lock.yaml`
  changed and teammates need one `pnpm install` after pulling.
  An early version of the test used a fixture starting `1. Open the admin
issues page`; that line begins an ordered list under CommonMark, so there was
  no soft break to render and the test failed against a working fix. The
  fixture now uses two adjacent prose lines.
  NOT COVERED: no Playwright case was added. TC-014 asks to compare edit preview
  against saved detail, and both paths render the same component with the same
  prop, so a browser case would exercise seeding rather than the behavior.
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
- 2026-09-01 (R-05, R-06): Blade Vitest (127 files, 729 tests, all
  passed), `pnpm --filter=@forge/blade typecheck` (clean),
  `pnpm verify:precommit` (exit 0 — format, lint 0 errors with 116
  pre-existing warnings, typecheck 33/33). Four stale eyebrow assertions
  were updated in existing tests; three of those files
  (`analytics-dashboard`, `email-portal-workspace`,
  `hackathon-analytics-dashboard`) are owned by other contributors, and
  only the assertion lines were changed — no production code in any
  teammate file was touched. Browser verification on localhost: admin
  page headers render the title, the info control, and actions only — the
  eyebrow row and the permanent description paragraph are gone. The info
  control opens its tooltip on hover and on keyboard focus and closes on blur.
  The page header skeleton no longer renders an eyebrow row.
  `hackathon-discord-event-config` has lost its subtitle, while the Portal
  configuration and Club classification subtitles remain. The R-04 grouped rail
  was re-confirmed in the expanded view (Dashboard, then Club, Team, Hackathon, External).
  The `AuthenticatedShellSkeleton` cluster reshape is covered by the
  component test but was not observed in the browser — it renders only
  during a full page load before `getPermissions()` resolves.
- 2026-09-02 (R-28): Implemented in the question `legend` hunk of
  `generic-form-response-form.tsx` only. `float-left` opts the legend out of
  native border positioning while retaining fieldset/legend semantics, and
  `[overflow-wrap:anywhere]` lets long unbroken prompts shrink within the card.
  The two focused form test files pass (13/13), Blade TypeScript is clean,
  focused lint reports 0 errors and the file's pre-existing max-lines warning,
  Prettier and `git diff --check` pass, and isolated 320 px Chrome/Edge geometry
  probes confirm short and four-line prompts stay inside the card, clear the
  following content, and create no document overflow. Human browser QA also
  passed at desktop and 320 px: short, three-line, required multi-line, and long
  unbroken URL prompts render inside their cards with correct required-marker
  placement, click-to-focus behavior, wrapping, and no horizontal overflow.
  This was not a routed Forms E2E run. The human ran
  `pnpm analyze:react:changed` successfully with every file reporting
  `ok: true`; `GenericFormResponseForm` props are unchanged and
  `InstructionMedia` remains intact. The earlier `uv_os_get_passwd returned
ENOMEM` result was local memory pressure, not an analyzer finding.
- 2026-09-03 (R-29): Implemented in `apps/blade/src/app/globals.css` only,
  inside `@layer base`. `pnpm --filter=@forge/blade build` exits 0 and the
  emitted stylesheet contains `::-webkit-scrollbar{width:2px;height:2px}`,
  the transparent track/corner, the `hsl(var(--primary))` thumb, and the
  `@supports not selector(::-webkit-scrollbar)` block wrapping
  `scrollbar-width: thin` / `scrollbar-color`, so the Firefox fallback
  survives minification with its guard intact. `pnpm verify:precommit`
  exits 0 (33/33 tasks, 0 lint errors), `pnpm --filter=@forge/blade test`
  passes 729/729 across 127 files, and `git diff --check` is clean.
  Headless Chromium reports `CSS.supports("selector(::-webkit-scrollbar)")`
  as `true` with computed `scrollbar-width`/`scrollbar-color` still `auto`,
  confirming Chrome keeps the webkit rules instead of the standard ones.
  Rendered appearance was verified in headed Chromium on Blade's landing
  page served by `next dev` on port 3100: with `HEAD~1`'s `globals.css`
  restored the document scrollbar measures 0px and paints the grey macOS
  overlay bar, and with this commit's `globals.css` it paints the violet
  thumb. Screenshots were captured at 1280x620 from the
  same page, browser, and scroll position with only that one file changed.
  This Mac is in overlay-scrollbar mode
  (`defaults read -g AppleShowScrollBars` unset, no mouse attached), so the
  15px classic bar Dylan reported is not what the "before" side shows; the
  fix replaces the OS bar with a fixed 2px custom bar in either mode.
  `apps/blade/src/tests/e2e/visual/visual-harness.ts` already forces
  scrollbars hidden with `!important`, so visual snapshots are unaffected.
- 2026-09-03 (R-29): Captured the two surfaces Dylan asked to see, the member
  dashboard and the admin sidebar, recaptured at 2px. A temporary Playwright
  spec under
  `apps/blade/src/tests/e2e/visual/` seeded `seedVisualFixture`, signed in as
  `VISUAL_USER_ID`, and screenshotted `/member/dashboard` at 1440x900 and
  `/admin/members` at 1440x700 in headed Chromium; the spec was deleted after
  the run and is not part of the diff. The violet thumb renders on the admin
  rail, the profile card, the dashboard column, and the document, which
  confirms the unprefixed `::-webkit-scrollbar` selector reaches nested
  scroll containers and not only the document. Blade has no Radix
  `ScrollArea` and no `scrollbar-width`/`scrollbar-color` utility anywhere in
  `apps/blade/src` or `packages/ui/src`, so every scroller on those screens is
  a native one this rule owns.
- 2026-09-03 (R-13): The shared member resume uploader now commits its local
  filename and preview only after upload and, for existing members, persistence
  succeed. Upload and replacement show distinct accessible success statuses for
  five seconds without opening the preview; View remains explicit and a failed
  replacement retains the prior saved resume. Added four jsdom regressions and
  extended signup, dashboard, and settings browser coverage. Validation passed:
  `pnpm --filter=@forge/blade test src/tests/member` (14 files, 87 tests), the
  three focused Playwright scenarios (3 passed), `pnpm analyze:react:changed`
  (38 files, 0 failures), `pnpm format` (24/24 tasks), `pnpm lint` (31/31 tasks,
  0 errors; existing warnings remain), and `pnpm typecheck` (33/33 tasks).
  Desktop signup and 320 px member-dashboard captures were inspected with no
  clipping or horizontal overflow. `git diff --check` passed. No API, database,
  dependency, or admin-upload behavior changed. Implementation and tests were
  committed as `9c19bc4d`.
- 2026-09-03 (R-15): Employment history now uses the shared employment schema
  to retain entry and field paths, marks Company, Position title, Experience
  type, and Employment status as required, and associates every inline issue
  with its exact input or compound control. The first failed Save scrolls to and
  focuses the first invalid control; subsequent edits revalidate every inline
  issue and advance the one-line form summary without stealing focus. Only rows
  whose persisted status is `unknown` receive imported-entry guidance, so a
  current row missing only its experience type is no longer mislabeled as
  legacy. Server persistence errors remain separate from client field errors.
  Validation passed: five focused Vitest files (38/38 tests), the full
  `member-field-editing.spec.ts` Playwright suite (10/10 tests), a focused R-15
  Playwright rerun after the final focus-state change (1/1),
  `pnpm analyze:react:changed` (42 files, 0 failures), `pnpm format` (24/24
  tasks), `pnpm lint` (31/31 tasks, 0 errors; existing warnings remain),
  `pnpm typecheck` (33/33 tasks), and `git diff --check`. Desktop and 320 px
  validation screenshots were inspected: required markers, inline errors,
  error-card emphasis, and the sticky save surface remain readable with no
  horizontal clipping. No API, database, schema, dependency, authentication,
  or upload behavior changed. Implementation is complete in the working tree
  and has not yet been committed.

## Links

- Triage artifact:
  `/Users/dvidal/Documents/Codex/2026-08-12/pleas/outputs/forge-refinements-triage.md`
- Worktree: `/Users/dvidal/Documents/forge-refinements`
- Branch: `forge/refinements`
- Remote branch: `https://github.com/KnightHacks/forge/tree/forge/refinements`
- Feature bundle: `.forge/features/blade-refinements/`
- PR: [GitHub #512](https://github.com/KnightHacks/forge/pull/512), `[#530]
Refine Blade navigation, member, issue, and form workflows` (draft)
- Issues: [GitHub #530](https://github.com/KnightHacks/forge/issues/530) for
  R-19/R-25, GitHub #503, GitHub #504, and the supplied
  Blade issue/thread context
- Discord/thread context: supplied in the Codex task on 2026-08-12
