# Project judging scheduler status

Current phase: CP-SAT pushed; Guild build fix validated and ready to push
Last updated: 2026-09-08

## Discovery decision log

This section records the conversation in order. Later decisions supersede earlier open questions; the current contract is in spec.md and srd.md.

- 2026-09-07: The owner requested a rich feature bundle for scheduling project judging and deep reverse-prompting before implementation.
- 2026-09-07: Work is scoped to the scheduler task branch. The starting checkout was clean and detached at 4b19ad05.
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
- [x] Create issue and PR with template and extensive hosted screenshots.
- [ ] Address CodeRabbit findings, push, reply, resolve, and repeat until approval.

## Current verification

- `pnpm verify:precommit`: passed React changed analysis, format, lint, and all workspace typechecks, 33 tasks. Final static run includes the solver boundary and status-color fixes.
- `pnpm test`: passed all 29 workspace tasks. API 924, Blade 829, DB 156, validators 314 tests. An unrelated webhook test timed out during simultaneous tests/builds; the clean full rerun passed without changing that test. The final solver delta adds one 32-project case; all ten solver/oracle cases pass. All 17 judge privacy/editor cases pass.
- `pnpm build`: passed all 21 workspace build tasks. Later changes passed affected package compilation through the static gate and browser dev compilation.
- `pnpm db:generate`: no schema changes after generated migration 0051. Real disposable PostgreSQL tests applied the migration and passed scheduler concurrency, expiry, access, recovery, MLH aggregation, backup classification, and lineage checks. No shared or production database was migrated.
- Visible Playwright checks passed organizer configuration, preview, Save, timelines/agendas, isolated moves and team contacts, Drop confirmation/lock, fixed deadline warning/expiry, incomplete submissions, room-gap recovery, restored drafts, MLH judging, guest opt-in, and 320-pixel layout without document overflow.
- Screenshots remain outside the repository under `/tmp/forge-judging-scheduler-pr`. Completed cards were visually corrected to the existing chart-2 green token, confirmed as rgb(46,184,138) in the browser. Missing cards use readable red.
- Forge review ran with access/API, solver/DB/validation, and React/test reviewers. All findings closed within three rounds. Corrections include fresh editor initialization, exact-candidate acknowledgment, backup classifications, sponsor search quality at both 32 and 200 projects, and visible result colors.
- The original pushed revision passed CI. CodeRabbit requested changes; the follow-up below addresses them. No merge or deployment is authorized by this task.

## Links

- [Pull request #545](https://github.com/KnightHacks/forge/pull/545)
- [Hosted screenshot walkthrough](https://github.com/KnightHacks/forge/pull/545#issuecomment-5575093270)

- [Implementation issue #544](https://github.com/KnightHacks/forge/issues/544)

- [Project import PR #527](https://github.com/KnightHacks/forge/pull/527)
- [Room access PR #529](https://github.com/KnightHacks/forge/pull/529)
- [Scoring and deliberation PR #532](https://github.com/KnightHacks/forge/pull/532)
- [Judging communications PR #535](https://github.com/KnightHacks/forge/pull/535)
- [Project intent](spec.md)
- [Technical intake](srd.md)
- [Candidate behavioral cases](test-cases.md)

## Original implementation decisions (before CP-SAT follow-up)

- Bounded TypeScript search runs in Blade's existing API runtime. It uses a sponsor lower-bound probe followed by unrestricted resumable search. A failed probe or timeout never proves infeasibility. Exact small-model oracles verify soundness.
- The adversarial 200-project fixture reaches the 90-minute sponsor and 230-minute overall capacity bounds, compared with the original 110-minute sponsor result after a full 290-second search. The 32-project boundary reaches minute 90 for both sponsor and overall finish. These fixtures do not imply every inventory fits or that every result is globally optimal.
- Candidate hashes bind Save and reduced-travel acknowledgment to the reviewed placements. Fresh source validation and transaction locks preserve schedule isolation.
- Persisted drafts reconcile against fixed deadlines on relevant requests and heartbeats. No Cron, external worker, solver dependency, or other app change was introduced.
- Guest opt-in and existing rubric visibility policies remain unchanged. Mandatory-sharing copy is authenticated-only. Sharing is a flag for the deferred feedback-distribution slice.
- GitHub uploads use the signed-in in-Codex browser. Screenshots are discussion attachments, never repository files.

- Implementation commit beafdfbe is pushed. All commit hooks passed with a larger process-local Node heap after the default staged-lint process ran out of memory. No hook was bypassed or repository setting changed.

- Owner added phone-focused visual review across guest judging and requested removal of the redundant Team size column. Mobile passes found oversized fixed evaluation sections, dense tab/filter layouts, and save notices overlaying the Deliberation picker. The current follow-up compacts those views, keeps the picker above notices, and preserves the existing feedback opt-in flags.
- Final deadline replay found the desktop Submissions Edit button omitted the existing room lock condition. Added the condition and a downtime message to both layouts, with a regression that locks and unlocks every edit control. The server timing guard was already enforced.

### Organizer follow-up views and mobile review

The owner requested a project itinerary with all reservations in chronological order, locations, and end-to-start gaps. Added a searchable project selector and a shortcut from appointment inspection. Room and status filters do not hide itinerary appointments. The 60-minute board now advances by whole slots and rounds its visible span up to include full appointments for arbitrary durations. Current cards keep their width until their end boundary, then leave the window.

Three guest mobile browser passes covered 320 and 390 px widths, short keyboard-sized viewports, entry, discovery, details, scoring, MLH opt-ins, submissions, feedback, Deliberation and picker stacking. The third pass passed. Removed the redundant Team size column. All 830 Blade tests passed before the itinerary addition. The desktop/mobile itinerary and whole-slot browser checks passed; final static checks and follow-up Forge review remain pending.

CodeRabbit requested changes on the initial implementation with 12 inline findings, nine additional comments, and seven nitpicks. Follow-up fixes are in progress. No approval claimed yet.

### Review follow-up checkpoint

CodeRabbit inline findings addressed in the working diff, pending final checks and replies:

- Desktop Edit respects reservation locks, with regression coverage.
- Draft writes lock the existing row before checking revisions. The disposable PostgreSQL test proves exactly one concurrent save succeeds.
- Deadline processing isolates each draft in a savepoint, retains stale answers, and records an error code without answers. A malformed draft no longer blocks a valid incomplete auto-submission. The disposable PostgreSQL regression passed.
- Organizer contact reads emit an audit event. Events identify schedule jobs, schedules, appointments, and buildings correctly; late assignment includes room and start time.
- Saved schedule reads index tasks, rooms, and results rather than repeatedly scanning the whole inventory.
- Sponsor classification uses one helper for generation and moves. General is a canonical import-created label and has no rename API.
- Move choices reject unavailable existing locations before constructing candidates.
- Member writes recheck the active hackathon under a transaction lock.
- Replaced the arbitrary phase and break caps with PostgreSQL integer storage limits. A 1,440-slot-per-room grid bound prevents unbounded candidate enumeration while allowing longer windows with longer appointments. Whole-minute and window-fit checks remain.

Other review changes include expired generation-job cleanup, retry backoff with manual recovery, one pure MLH matcher exported through a browser-safe API subpath, corrected nested headings, specific room-location conflict messages, clearer overflow wording, and schedule reads only on the Schedule tab. Solver tests name the rejecting rule and allow bounded continuation under loaded CI. Absolute local paths were removed from this public status file.

Validation checkpoint: targeted API/audit/solver/root and disposable PostgreSQL integration passed 35 tests across nine files. Draft retry and whole-slot boundary unit tests passed five tests. The room-only default filter and appointment-result details requested by the owner are being implemented in parallel by GPT-5.6 Sol subagents. All changes remain uncommitted until the combined static gate, browser checks, and next Forge review pass.

Round four found resource/storage limits missing after removing the original caps, manual navigation stepping by a fixed hour instead of a full rendered grid, an inactive room filter appearing checked, and stale unsent search text after filter navigation. Those fixes are implemented with targeted regressions. API access/privacy review had no findings. Final round five and a clean full-suite rerun remain pending. The full-suite run exposed an integration-test import ordering issue in the new room-filter fixture; fixing that fixture and cleaning its own synthetic records are in progress.

### Final follow-up verification

The owner additions are complete: appointment-scoped complete/partial judge details and complete-only averages, disabled Judge controls with reasons, room-only discovery enabled by default for both judge types, project itineraries, and whole-slot cards. Room filtering happens before count and pagination; MLH stays untimed.

Forge review completed through round five, the requested maximum. Access/API, validation, and React reviewers report no remaining actionable findings. The final static gate passed all 33 tasks. The clean full test run passed all 29 tasks, including API 927, Blade 842, DB 156, and validators 316 tests. The full build passed all 21 tasks. Browser checks passed mobile judging, room filtering, disabled-control reasons, complete/partial appointment details, itineraries, and whole-card timelines.

The new room-filter integration fixture originally initialized a database client before selecting its disposable database. Its import order and module isolation are corrected. Only the synthetic records created by that test in the configured local database were removed. No migration ran there. The clean API and workspace reruns passed.

[Final 17-screenshot walkthrough](https://github.com/KnightHacks/forge/pull/545#issuecomment-5575596405) supplements the original gallery. All screenshots remain GitHub discussion attachments. Final push, CodeRabbit replies/resolutions, fresh approval, and CI verification are the remaining exit steps. No merge or deployment.

### CodeRabbit closure follow-up

The review of 50dce23e returned three inline findings and one minor comment. Failed deadline drafts now retain a durable failure timestamp and code, and later heartbeat probes skip them. A valid user save clears that marker. Migration 0052 adds the nullable fields without changing existing evaluations. Contact discovery catches audit-store failures and logs identifiers without contact data. The scale test timeout exceeds its bounded search loop, and MLH explains why room filtering is unavailable. Regression coverage exercises both audit failures and repeated stale-draft reconciliation.

The previous revision passed every GitHub CI check. The closure commit requires a fresh review and CI run before completion.

Closure verification passed all 33 static tasks, 29 workspace test tasks, and 21 build tasks. API 927, Blade 842, DB 156, and validators 316 tests passed. Migration lineage now includes 0052. The appointment-results fixture selects an appointment with neither evaluations nor retained drafts, so its independent judge list is deterministic. Fresh CodeRabbit approval and CI remain the final external gates.

### Human review nits

Chris reviewed the screenshots in the Dev Discord pull-request channel. The owner accepted removing the redundant timeline time-header row, using "Emergency reassignment" for the existing appointment's smart selection action, and removing repeated authenticated sharing notices under each response. The owner explicitly kept the timeline as the default. Guest sharing choices and saved flags are unchanged.

Human-review follow-up verification passed the 33-task static gate, all 20 judge privacy tests, and visible desktop/mobile checks. Quick Forge review found no actionable issues. Updated screenshots are attached to PR #545.

### CP-SAT follow-up

The owner approved CP-SAT with eight workers after a benchmark of the supplied KH VIII CSV, then required the implementation to run through TypeScript in the Node process. The final benchmark inventory has 188 projects and 437 appointments, with 16 sponsor rooms, eight General rooms, and 25 ten-minute slots. The eight-worker CP-SAT prototype found a validated candidate in 3.85 seconds and proved sponsor finish 220 minutes, zero sponsor idle, and overall finish 240 minutes. It returned 107 building changes after 60 seconds. The previous solver returned 230/280/250 minutes and 124 changes after 290 seconds. These measurements used the Python prototype; the TypeScript port is verified for correctness without another performance benchmark.

The implementation pins `@ortools-node/cp-sat` at `9.15.0-node.0-rc.2`. TypeScript builds the model and handles callbacks, while the native CP-SAT engine runs asynchronously with eight threads inside Node. Next keeps the binding external and includes the platform binaries and libraries in standalone output. No Python, subprocess, external service, Docker runtime change, schema migration, or UI change is included. The binding is a third-party release candidate; exact model, cancellation, loading, and packaging checks are required.

- [x] Trace import eligibility, constraints, scoring, checkpoints, and UI consumers.
- [x] Replace DFS with the TypeScript model and eight-worker native solver.
- [x] Preserve leases, deadline, recovery, preview hashes, and Save semantics.
- [x] Verify native callbacks, failure/cancellation, objective proofs, and legacy recovery.
- [x] Pass required root static checks and affected consumer checks.
- [x] Build and smoke-test native loading in Blade's standalone container.
- [x] Prepare the local implementation commit for owner review.
- [x] Push to PR #545 after owner approval. No merge or deployment.

Only project/challenge memberships and declared room/timing configuration enter the model. The original CSV and participant data remain outside the repository. Python implementation checks are superseded by validation of this TypeScript replacement.

The TypeScript port passed all 29 workspace test tasks, including API 933, Blade 842, DB 156, and validators 316 tests. The full command used `NEXT_PUBLIC_BLADE_URL=http://localhost:3000 pnpm exec turbo run test --concurrency=1 -- --maxWorkers=4`; the URL satisfies an existing production-mode Discord configuration test. Auth retained its five existing skipped tests. The scheduler's 18 focused tests cover oracle equality, travel fallback, failure/cancellation, leases, supersession, recovery, and scale regressions.

Incorporated the existing PR's UI-only follow-up c9466d4f before preparing this commit. Its changes remain intact. After integration, all 28 judging privacy/display tests passed, along with root `pnpm format` (24 tasks), `pnpm lint` (31 tasks, warnings only), and `pnpm typecheck` (33 tasks). No new UI code is part of the CP-SAT change.

The Node-only Blade Docker build passed. A network-disabled smoke test ran the actual compiled TypeScript scheduler in that standalone image as UID 1000, proved all five objectives on a small fixture, and independently validated the candidate with no Python installed. Frozen offline pnpm installation accepted the pinned lockfile. No additional performance benchmark was run.

### Native parity and solver selection

The owner subsequently requested direct proof of TypeScript/Python parity, improvements if needed, and a choice between CP-SAT and a supplied MCMF local-search prototype. New runs use the identical CSV-derived input hash, eight workers, seed one, and 60 seconds each, with solvers running sequentially and no imported solution hints.

Three runs of the original TypeScript port returned 109/107/108 building changes, versus Python's 107/106/108. Every run proved sponsor finish 220 minutes, sponsor idle zero, and overall finish 240 minutes. Python's 106-change run also proved that fourth objective optimal. The port changed variable numbering and construction order relative to the prototype. Restoring the benchmarked order gave 107 changes in all three new native runs and reduced median first-candidate time from 6.95 to 3.97 seconds; Python's median was 4.08 seconds. All candidates passed the unchanged independent validator and scorer with strict travel.

Serialized-model comparison confirms identical 8,509 variables and 14,546 constraints, plus the first objective, after normalizing commutative linear-term order and the default objective display scaling. Tests retain exhaustive objective comparisons and now cover reordered equivalent rooms and unused rooms. The small run sample supports comparable performance on this fixture, not identical timings or universal runtime guarantees. The native runs still have one unproved building change above the lower bound, and their final team-break objective was not reached.

Selected CP-SAT for production. The supplied MCMF result independently validates at 220/0/240 minutes, 107 changes, and 17,370 aggregate team-break minutes, with a reported 72 ms first candidate. It beats the native 60-second results on team breaks and preview latency. Its current constructor requires each challenge's rooms to share a building, and its outer local search cannot certify strict infeasibility, which the accepted travel fallback requires. CP-SAT covers those cases and provides objective proofs within the existing sub-five-minute generation budget. No MCMF implementation or hybrid is included. Commit and owner review precede any push.

Verification of this construction-order correction passed all 19 focused solver/engine/scale/integration tests, the reproducible model-equivalence check, and root format (24 tasks), lint (31 tasks, warnings only), and typecheck (33 tasks). Full benchmark sources, every run, model comparison, and the decision report remain outside the repository; no CSV or participant records are committed. The prepared CP-SAT commit awaits owner review before push.

### Guild CI build follow-up

After the owner approved and pushed the CP-SAT commits, CI run 34183671357 failed in Guild's Turbopack build. Guild imports the shared API through its server tRPC caller and sitemap, so it also reaches the native solver. Only Blade had configured that package as external. Reproduced Guild's `Module not found: Can't resolve <dynamic>` failure using the CI example environment before editing.

Guild now uses the same external-package and standalone tracing settings as Blade. Comments in both configs identify the required pairing. No solver, UI, dependency, schema, or CI workflow changes are included. The owner explicitly authorized fixing CI and pushing this follow-up.

Validation passed: Guild's production build with `.env.example`; an optimal eight-worker CP-SAT solve from Guild's standalone files in a read-only, network-disabled Node 24 container; and root `pnpm format` (24 tasks), `pnpm lint` (31 tasks, warnings only), and `pnpm typecheck` (33 tasks). The container could not access repository dependencies. CI verification will follow the push.

### Faris timeline axis follow-up

The organizer timeline remains the default view. Rooms now run across columns with shared header height and sticky headings; appointments run downward through time. The current-time marker runs horizontally, and the window navigation uses up/down arrows. Whole-slot advancement, appointment inspection, room agendas, and project itineraries retain their behavior. Dhruv's CP-SAT commits through `8daa1a59` are included unchanged.

Validation passed: `pnpm verify:precommit`, including React analysis, format, lint, and all 33 typecheck tasks. Desktop and 390px mobile browser checks covered column alignment, chronological vertical placement, sticky room headings while scrolling, appointment inspection, switching to agendas, and containment of horizontal scrolling within the board. Reviewed desktop, scrolled, and mobile screenshots; the image files remain outside the repository.

Quick Forge review found no actionable issues in this UI diff. Solver implementation and benchmarking were outside this review's scope.

### Continuous scrolling and live room activity

The owner's follow-up replaces hourly navigation with a continuous timeline from judging start through end. Cards stay at fixed schedule positions. Native scrolling covers both axes, left/right buttons navigate room columns, and Now scrolls to the live clock without resetting the selected horizontal position. Rooms and the room dropdown sort by building, then natural room-number order. Missing buildings sort last.

The saved-schedule header shows rooms in a slot, rooms without a current slot, and total scheduled rooms. Counts use the server-aligned clock and all saved appointments independently of view filters. Setup and teardown occupy the room; the exact end releases it. MLH is excluded. No API, database, or solver changes are included.

Validation passed: `pnpm verify:precommit` with all 33 typecheck tasks, four focused room activity/sorting tests, and a quick Forge review with no actionable findings. Visible browser checks used the isolated fixture plus read-only response expansion to 25 rooms. They verified native horizontal scrolling, left/right controls, full-window vertical scrolling, Now preserving horizontal position, building order, filter-independent totals, appointment inspection, and 390px mobile containment. Desktop and phone screenshots were inspected and remain outside the repository.
