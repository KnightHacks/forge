# Project judging scheduler status

Current phase: Local verification complete, preparing pull request
Last updated: 2026-09-07

## Discovery decision log

This section records the conversation in order. Later decisions supersede earlier open questions; the current contract is in spec.md and srd.md.

- 2026-09-07: The owner requested a rich feature bundle for scheduling project judging and deep reverse-prompting before implementation.
- 2026-09-07: Work is scoped to /Users/dvidal1205-mini/.codex/worktrees/b509/forge. The starting checkout was clean and detached at 4b19ad05.
- 2026-09-07: Created task branch codex/project-judging-scheduler and instantiated the four templates through pnpm forge:feature.
- 2026-09-07: Captured explicit owner requirements in draft spec.md. Open questions and candidate technical/test work are not accepted decisions.
- 2026-09-07: Sponsor priority, mandatory hacker gaps, building-aware rooms, monitoring, repair, timed evaluations, incomplete submission handling, and time sorting come from the owner's brief.
- 2026-09-07: Asked the first reverse-prompt round about competing scheduling objectives, presentation units/team attendance, timer deadlines, completion, and reopening.

- 2026-09-07: Owner confirmed priority order: sponsors, earliest overall finish, then hacker breaks within that finish. Schedule A wins.
- 2026-09-07: Owner confirmed one General presentation and one per opted-in challenge, divided among that challenge's rooms. Sponsors do not own multiple challenges. Presenter identity/attendance remains intentionally absent.
- 2026-09-07: Owner confirmed submission at 12:08 for a 12:00–12:10 slot, green after one complete evaluation, and reopening during a current room gap.
- 2026-09-07: Asked the next round about sponsor metrics/staffing, hard gaps/capacity/overflow, publication/delivery, and reassignment scope.

- 2026-09-07: Owner approved objective order: earliest last-sponsor finish, fewer sponsor idle gaps, earliest overall finish, then hacker breaks. General can run concurrently with sponsors.
- 2026-09-07: Owner confirmed the project, across all challenge appointments, is the hacker/team scheduling unit. No individual presenter model.
- 2026-09-07: Owner confirmed room staffing means a guest or organizer is currently joined, reusing existing Command Center logic. Staffing changes after generation remain open.

- 2026-09-07: Owner allowed relaxing the twenty-minute cross-building gap to the ten-minute baseline only if the strict schedule is genuinely undoable. Alert an organizer if the fallback is also infeasible.
- 2026-09-07: Owner requested fewer building trips across each project's appointments. Ranking this preference is pending.
- 2026-09-07: Owner deferred all schedule publication and hacker reach to the final slice. Internal generation/save and judge/organizer use remain here.
- 2026-09-07: Asked about building-change priority, acknowledgment of relaxed travel gaps, and unresolved-work handling. Corrected the pending question's publication wording to internal saving after the owner deferred publication.

- 2026-09-07: Owner confirmed fewer building trips rank after sponsor/overall finish objectives and before maximizing breaks.
- 2026-09-07: Owner approved listing reduced-travel-gap projects for acknowledgment before internal saving, and displaying unresolved work while blocking use of an incomplete schedule. Publication remains deferred.
- 2026-09-07: Asked the live-operation round about reassignment scope/notice, answer persistence and late starts, and incomplete-evaluation status/eligibility.

- 2026-09-07: Owner required appointment isolation: smart/manual moves affect only the selected reservation, with no reshuffling or swaps. Immediate starts are allowed and organizers contact missed teams manually.
- 2026-09-07: Owner approved progress saving while typing and retention across closed browsers. Never-opened forms remain missing. Late arrivals keep the fixed deadline and no additional time is allowed.
- 2026-09-07: Owner approved future-neutral/current-yellow/expired-missing-red/expired-incomplete-yellow/complete-project-and-challenge-green states. Incomplete work stays out of scoring, score unlocks, completion, Deliberation, and feedback release, and leaves the author's default Projects queue.
- 2026-09-07: Owner asked to continue deep reverse-prompting until the bundle is ready and to explicitly report when ready.
- 2026-09-07: Asked about saved-schedule isolation and source edits, teardown/gap editing rules, and scheduled versus untimed judging access.

- 2026-09-07: Owner approved preview before first Save, no bulk changes afterward, individual moves for future and missed appointments, and blocking source edits that would invalidate bookings. Room staffing loss only warns.
- 2026-09-07: Owner requires a slower judge-project heartbeat for reservation updates.
- 2026-09-07: Owner confirmed teardown blocks old-submission editing; gap end saves and locks the editor. The appointment room governs complete/incomplete auto-submissions, with no room-switch or officer bypass.
- 2026-09-07: Owner confirmed manual opening of only the current room's evaluation while scheduled, free browsing, and no forced modal. No-schedule judging retains existing behavior.
- 2026-09-07: Asked the configuration/scale round covering building catalog and physical uniqueness, window/timing/sponsor settings, and solver workload/runtime expectations.

- 2026-09-07: Owner approved a shared building catalog seeded with ENG, BA, HEC, and HS, plus Other, with trimmed case-insensitive duplicate prevention. Building + room is unique per hackathon. Existing rooms retain IDs/QRs and require building selection before scheduling.

- 2026-09-07: Owner confirmed one judging window per hackathon and default 2/6/2 timing, proposed configurable whole-minute phases, and rejected second-based starts. Total/grid validation remains open.
- 2026-09-07: Owner supplied upper scale of 200–250 projects, roughly twelve challenges and twelve rooms, with varying opt-ins. Generation happens about thirty minutes before judging and may take under five minutes.
- 2026-09-07: Owner added MLH normalization: collapse MLH-containing labels into MLH Challenges, preserve original project opt-ins as readable context, permit MLH rooms and Blade judging, and exclude MLH challenge/rooms from the scheduler.
- 2026-09-07: Flagged the arithmetic capacity limit: twelve rooms provide 288 ten-minute appointments over four hours, with 250 General entries consuming most of that. Actual room split remains to be clarified.
- 2026-09-07: Asked about MLH matching/history/untimed access, configurable phase totals, and realistic General/sponsor room capacity.

- 2026-09-07: Owner approved any whole-minute phase total, including seven/twelve minutes, and configurable same-/different-building breaks. Defaults remain 2/6/2 and ten/twenty. Precise lower bounds remain open.
- 2026-09-07: Owner added an explicit Drop schedule action to compare configurations before the first judge result, after which Drop locks. This is a deliberate exception to ordinary reservation isolation; exact result-state/MLH/history trigger is pending.
- 2026-09-07: Owner confirmed twelve total rooms includes one unscheduled MLH room, with typical projects opting into one to five challenges. They can change rooms/window before Save and drop before results to reconsider configuration.
- 2026-09-07: Owner agreed to case-insensitive MLH matching, dedicated original-label display, and untimed MLH room judging. Historical migration policy and score aggregation remain open.
- 2026-09-07: Asked the lock/configuration/MLH compatibility round: Drop trigger, duration/gap bounds and grid, new-import-only policy, and MLH aggregate behavior.

## Context reviewed

- AGENTS.md, README.md, CONTRIBUTING.md, getting-started guidance, GitHub etiquette, repository conventions, database guidance, agentic workflow/principles, feature templates, and test-generation instructions.
- Worktree skills live in .claude/skills. The session catalog points to .agents/skills in the primary checkout, which is not this worktree's layout.
- Reviewed spec/SRD/test-case authoring instructions, placement guidance, prose guidance, and frontend guidance relevant to this intake.
- Reviewed the project-judging, judging-magic-access, judging-scores-and-deliberation, and judging-discord-comms product bundles.
- Queried the owner's last five merged PRs: #535, #532, #529, #527, and #524. The first four form the judging sequence; #524 concerns legacy hackathon archives.
- Inspected current room, project-member, and evaluation schemas, evaluation save validation, dialog state, and scoring consumers to identify questions grounded in current behavior.
- Researched an external solver but withdrew it after the owner restricted execution to Blade. No external dependency was installed; only an unused scratch venv was created at /tmp/forge-judging-solver-venv.
- Reviewed CI, package verification scripts, and local commit hooks. No workflow settings were changed.

## Durable exit condition

Work continues until the full slice works end to end, every required verification check passes, Forge review completes with a maximum depth of five, a GitHub issue and PR exist with the repository body template and extensive screenshots, and CodeRabbit approves the latest revision after all findings are addressed, pushed, replied to, and resolved. Screenshots are hosted only in GitHub discussion and never committed. Do not merge or deploy.

The active Codex goal contains the same exit condition. This status file is the durable implementation handoff across compaction.

## Current implementation decisions

- 2026-09-07 scope clarification: Blade and its necessary API/DB/validator packages only. The owner permits solver packages if confined to Blade, but prefers an in-repo implementation. Proceeding with bounded TypeScript search and request/heartbeat reconciliation. No Cron or other app changes.

- All product questions are resolved. The owner approved proceeding on 2026-09-07.
- Drop locks on the first submitted scheduled result, including incomplete auto-submissions. Typing saves, MLH results, and unrelated history do not lock it. Drop clears only the eligible schedule and unsent drafts.
- Normalize only new imports into MLH Challenges. Preserve historical imports/results; exclude legacy MLH labels from scheduling. MLH uses the existing rubric and counts in overall rating once per consolidated evaluation.
- Ordinary reservation operations remain isolated. Explicit pre-result Drop is the only approved bulk reset.
- Finish technical contracts and behavioral cases, then implement without another broad product question round.

## Task list

- [x] Inspect requested worktree and establish task branch.
- [x] Review relevant workflow, skills, recent judging context, and existing behavior.
- [x] Instantiate the four-file bundle.
- [x] Capture the original brief and maintain unanswered decisions.
- [x] Complete reverse-prompting for spec.md.
- [x] Complete reverse-prompting for srd.md.
- [x] Complete reverse-prompting for test-cases.md.
- [x] Obtain human approval to finish technical details and proceed with implementation/test generation.
- [x] Link implementation issue #544.
- [x] Consolidate implementation SRD and final behavioral cases.
- [x] Implement and verify scheduling model, solver, and independent candidate validator.
- [x] Implement building data, MLH import normalization, schedule persistence, and migrations.
- [x] Implement evaluation drafts, deadline enforcement, completion filtering, and recovery.
- [x] Implement Command Center schedule and judge refresh/timer views.
- [x] Verify guest/member/officer flows, desktop/mobile states, and screenshot evidence.
- [ ] Pass all required local checks and CI.
- [x] Complete Forge review, standard scope review in three rounds, maximum five.
- [ ] Create issue and PR with template and extensive hosted screenshots.
- [ ] Address CodeRabbit findings, push, reply, resolve, and repeat until approval.

## Current verification

- `pnpm verify:precommit`: passed React changed analysis, format, lint, and all workspace typechecks, 33 tasks. Final static run includes the solver boundary and status-color fixes.
- `pnpm test`: passed all 29 workspace tasks. API 924, Blade 829, DB 156, validators 314 tests. An unrelated webhook test timed out during simultaneous tests/builds; the clean full rerun passed without changing that test. The final solver delta adds one 32-project case; all ten solver/oracle cases pass. All 17 judge privacy/editor cases pass.
- `pnpm build`: passed all 21 workspace build tasks. Later changes passed affected package compilation through the static gate and browser dev compilation.
- `pnpm db:generate`: no schema changes after generated migration 0051. Real disposable PostgreSQL tests applied the migration and passed scheduler concurrency, expiry, access, recovery, MLH aggregation, backup classification, and lineage checks. No shared or production database was migrated.
- Visible Playwright checks passed organizer configuration, preview, Save, timelines/agendas, isolated moves and team contacts, Drop confirmation/lock, fixed deadline warning/expiry, incomplete submissions, room-gap recovery, restored drafts, MLH judging, guest opt-in, and 320-pixel layout without document overflow.
- Screenshots remain outside the repository under `/tmp/forge-judging-scheduler-pr`. Completed cards were visually corrected to the existing chart-2 green token, confirmed as rgb(46,184,138) in the browser. Missing cards use readable red.
- Forge review ran with access/API, solver/DB/validation, and React/test reviewers. All findings closed within three rounds. Corrections include fresh editor initialization, exact-candidate acknowledgment, backup classifications, sponsor search quality at both 32 and 200 projects, and visible result colors.
- CI and CodeRabbit approval remain outstanding until the PR is open. No merge or deployment is authorized by this task.

## Links

- [Implementation issue #544](https://github.com/KnightHacks/forge/issues/544)

- [Project import PR #527](https://github.com/KnightHacks/forge/pull/527)
- [Room access PR #529](https://github.com/KnightHacks/forge/pull/529)
- [Scoring and deliberation PR #532](https://github.com/KnightHacks/forge/pull/532)
- [Judging communications PR #535](https://github.com/KnightHacks/forge/pull/535)
- [Project intent](spec.md)
- [Technical intake](srd.md)
- [Candidate behavioral cases](test-cases.md)

## Final implementation decisions

- Bounded TypeScript search runs in Blade's existing API runtime. It uses a sponsor lower-bound probe followed by unrestricted resumable search. A failed probe or timeout never proves infeasibility. Exact small-model oracles verify soundness.
- The adversarial 200-project fixture reaches the 90-minute sponsor and 230-minute overall capacity bounds, compared with the original 110-minute sponsor result after a full 290-second search. The 32-project boundary reaches minute 90 for both sponsor and overall finish. These fixtures do not imply every inventory fits or that every result is globally optimal.
- Candidate hashes bind Save and reduced-travel acknowledgment to the reviewed placements. Fresh source validation and transaction locks preserve schedule isolation.
- Persisted drafts reconcile against fixed deadlines on relevant requests and heartbeats. No Cron, external worker, solver dependency, or other app change was introduced.
- Guest opt-in and existing rubric visibility policies remain unchanged. Mandatory-sharing copy is authenticated-only. Sharing is a flag for the deferred feedback-distribution slice.
- GitHub uploads use the signed-in in-Codex browser. Screenshots are discussion attachments, never repository files.
