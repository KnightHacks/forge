# Blade Refinements Status

Current phase: Bundle approved / ready for technical discovery

## Decision log

- 2026-08-12: Start from production `origin/main`, not `reforge/main` or an
  existing dirty worktree. Created `/Users/dvidal/Documents/forge-refinements`
  on `reforge/refinements` at `78857b85`.
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
  `reforge/refinements` branch for this agent-first trial.
- 2026-08-12: Treat agent-assisted development as a first-class contribution
  experience. Agent use is encouraged, while each contributor remains responsible
  for the scope, code, decisions, validation, and result they submit. The bundle
  exists to reduce errors and miscommunication between developers and agents.
- 2026-08-12: The contributor entrypoint is the feature bundle. A developer may
  point an agent at it and let the agent load the repository instructions,
  relevant skills, and code context. Humans may read those materials themselves
  if useful, but are not expected to study agent skill files before contributing.

## Open questions

1. Technical discovery: confirm whether the existing attachment schema can gain
   Issue/Form-banner owners without a database migration.
2. Technical reproduction: capture the exact production-base issue-assignee
   filter failure before selecting a repair.

## Contributor coordination

- `reforge/refinements` is the shared implementation branch and bundle source of
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

| ID   | Refinement                                                                                                                                                  | State     | Claim     | Proof                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ------------------------------ |
| R-01 | Keep `/` public for signed-in users, adapt its CTA, and make the product mark return there.                                                                 | Ready     | Unclaimed | TC-001                         |
| R-02 | Remove the sidebar for ordinary members; place Settings and Sign out together at the top right.                                                             | Ready     | Unclaimed | TC-002                         |
| R-03 | Replace hover expansion with a top-left admin rail opener; keep collapsed icons clickable, close after selection, and preserve mobile close-on-select.      | Ready     | Unclaimed | TC-003, TC-NEG-001             |
| R-04 | Group admin destinations into the approved Club, Team, Hackathon, and External map; omit empty groups and mark Guild/outbound destinations as external.     | Ready     | Unclaimed | TC-004                         |
| R-05 | Remove visible admin eyebrows/descriptions, expose description-only title help, and shrink matching skeletons.                                              | Ready     | Unclaimed | TC-005                         |
| R-06 | Remove repetitive configuration subtitles while preserving consequential guidance.                                                                          | Ready     | Unclaimed | TC-005                         |
| R-07 | Use one member-dashboard hierarchy and action set across mobile and desktop.                                                                                | Ready     | Unclaimed | TC-007, TC-020                 |
| R-08 | Keep Guild prominent and editable; define Guild, separate public Guild data from private Blade data, and mark its public actions as external.               | Ready     | Unclaimed | TC-007, TC-008                 |
| R-09 | Replace the isolated QR action with a compact Check in surface and View QR code action on every viewport.                                                   | Ready     | Unclaimed | TC-007                         |
| R-10 | Keep unpaid dues prominent; replace the paid tile with a green paid badge and accessible tooltip beside the Welcome name.                                   | Ready     | Unclaimed | TC-006                         |
| R-11 | Keep Previous forms as a small, low-emphasis action at the bottom of the dashboard.                                                                         | Ready     | Unclaimed | TC-007                         |
| R-12 | Align sparse and populated Guild/profile content and handle long names, links, companies, filenames, events, and empty states without clipping.             | Ready     | Unclaimed | TC-008, TC-020                 |
| R-13 | Change resume upload/replace in signup and existing-member flows to success plus explicit View, without automatic preview.                                  | Ready     | Unclaimed | TC-009                         |
| R-14 | Require confirmation before removing a saved profile picture.                                                                                               | Ready     | Unclaimed | TC-010                         |
| R-15 | Mark employment fields required and report/focus the precise invalid entry and field without mislabeling legacy validation.                                 | Ready     | Unclaimed | TC-011                         |
| R-16 | Preserve admin member-search focus and keystrokes while debounced results and URL state update.                                                             | Ready     | Unclaimed | TC-012, TC-NEG-001             |
| R-17 | Reproduce and fix the Issue assignee filter failure without breaking other filters, pagination, or access policy.                                           | Discovery | Unclaimed | TC-013                         |
| R-18 | Preserve author-entered issue-description line breaks in preview/detail without changing unrelated Markdown consumers.                                      | Ready     | Unclaimed | TC-014                         |
| R-19 | Add authorized managed issue images through picker, paste, and drag/drop with cursor insertion, alt text, approved limits, rendering, removal, and cleanup. | Discovery | Unclaimed | TC-015, TC-NEG-002, TC-NEG-003 |
| R-20 | Prefer linked current Member full names in Issue history and Admin logs; fall back to stored Discord labels and preserve system actors.                     | Ready     | Unclaimed | TC-016, TC-NEG-003             |
| R-21 | Render issue reminders as linked `Title \| Chat` when a Discord thread exists and linked title alone otherwise.                                             | Ready     | Unclaimed | TC-017                         |
| R-22 | Prevent overlapping current/prior hackathon comparison labels while preserving the accessible text/table alternative.                                       | Ready     | Unclaimed | TC-021                         |
| R-23 | Fix reported Chrome/Zen member and shell overflow at 320 px, intermediate widths, and desktop without hiding content behind overflow rules.                 | Ready     | Unclaimed | TC-020                         |
| R-24 | Verify and polish existing Forms text/image/video instruction-card authoring, upload feedback, ordering, cleanup, and respondent rendering.                 | Ready     | Unclaimed | TC-018, TC-NEG-003             |
| R-25 | Add one managed form banner with upload/replace/remove, editable alt text, preview guidance, and responsive 4:1 `cover` presentation.                       | Discovery | Unclaimed | TC-019, TC-NEG-002, TC-NEG-003 |
| R-26 | Knight Hacks member-benefits content/page.                                                                                                                  | Deferred  | Unclaimed | Out of scope                   |
| R-27 | Grafana analytics replacement or observability infrastructure.                                                                                              | Deferred  | Unclaimed | Out of scope                   |

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
- `git worktree add -b reforge/refinements /Users/dvidal/Documents/forge-refinements origin/main`:
  created isolated worktree at `78857b85`.
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

## Links

- Triage artifact:
  `/Users/dvidal/Documents/Codex/2026-08-12/pleas/outputs/forge-refinements-triage.md`
- Worktree: `/Users/dvidal/Documents/forge-refinements`
- Branch: `reforge/refinements`
- Remote branch: `https://github.com/KnightHacks/forge/tree/reforge/refinements`
- Feature bundle: `.forge/features/blade-refinements/`
- PRs: none
- Issues: GitHub #503, GitHub #504, and the supplied Blade issue/thread context
- Discord/thread context: supplied in the Codex task on 2026-08-12
