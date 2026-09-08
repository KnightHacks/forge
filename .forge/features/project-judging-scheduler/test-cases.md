# Project judging scheduler test cases

Status: Accepted behavioral cases. Implementation and executable coverage are in progress.

## Scope

Cover generation, room locations, legal spacing, organizer monitoring and repair, timed judging, incomplete evaluations, and time sorting. MLH import consolidation and unscheduled judging are included. Publication and hacker delivery are deferred. Remaining emergency overrides and background expiry depend on product decisions.

## Test placement plan

- API package: scheduling constraints, ordering objectives, scoped reads, transactional repair, answer completion, and aggregate eligibility.
- Validators package: accepted time, room, building, assignment, and answer contracts.
- DB package: accepted constraints and additive upgrades from existing rooms/evaluations.
- Blade: timer and submission states, discovery sorting, organizer views, contact visibility, and keyboard/mobile interaction.
- Playwright: selected complete organizer and guest/member judge flows after case approval.

## Test cases

### TC-001: Minimum breaks

Setup: A single project requires presentations for different challenges in two rooms. The appointments share one project/team identity. Use default 2/6/2 timing and ten/twenty-minute breaks for this fixture. Its first slot runs 12:00–12:10.

Action: Generate a schedule or inspect manual replacement choices.

Expected observations: The next same-building slot starts no earlier than 12:20 and a cross-building slot no earlier than 12:30. Boundary cases below the configured same-building minimum are always rejected. Cross-building cases below twenty minutes are rejected in this default strict fixture; a genuinely infeasible strict schedule may fall back to the configured same-building baseline. Check both preceding and following appointments after a move.

### TC-002: Sponsor priority and hacker rest

Setup: A small synthetic inventory admits competing schedules with different sponsor completion times, hacker gaps, and overall finish times.

Action: Generate the schedule.

Expected observations: The owner approved preferring a 2:30 overall finish with 10–20 minute breaks over a 3:30 finish with 30–40 minute breaks when sponsors finish at 1:30 in both. Add a concrete inventory proving this preference. Competing schedules must prioritize earliest last-sponsor finish, then fewer sponsor idle gaps, then overall finish, then building changes, then hacker breaks. The exact idle-gap measurement remains open. Merely returning a feasible schedule does not prove the requested priorities.

### TC-003: Multiple rooms for a challenge

Setup: A challenge has several equivalent available rooms and more than one eligible project.

Action: Generate a schedule.

Expected observations: Projects use compatible rooms without collisions. Each project receives one presentation per scheduled non-MLH opted-in challenge and one for General; several rooms divide a challenge's work. General may run alongside sponsor judging. Only rooms with judges under the existing Command Center roster semantics qualify at generation time. Exact balancing and later staffing-loss behavior remain open.

### TC-004: Reusable buildings

Setup: An organizer configures a room and selects Other for the building.

Action: Save a new building and configure another room.

Expected observations: ENG, BA, HEC, and HS are initially selectable. A custom building becomes selectable across hackathons. Case/whitespace variants cannot create duplicates. Two rooms cannot share the same building and room identifier within one hackathon; the same room identifier in a different building is valid. Existing rooms retain identity and QR/thread relationships, and require organizer building selection before scheduling.

### TC-005: Live slot status

Setup: The schedule has future, active, expired, completed, and incomplete appointments.

Action: Advance server time and save qualifying evaluation records while Command Center is open.

Expected observations: One complete qualifying evaluation turns the card green. A soft submission alone does not. Future appointments are neutral, current appointments yellow, expired appointments with no evaluation red, and expired appointments with only incomplete work yellow. Green requires a complete evaluation for the project and challenge. Old/moved record attribution remains open, within the accepted refresh bound. Include an old evaluation, an unrelated challenge, an unrelated room, and a late record after reassignment.

### TC-006: Smart and manual reassignment

Setup: A future or missed appointment has compatible and incompatible openings, including openings that violate team travel spacing.

Action: Inspect choices and perform smart or manual reassignment.

Expected observations: Only accepted legal destinations are selectable. Only the selected appointment changes. Compare all other reservations before and after: their times, rooms, and assignments are identical. Immediate starts are allowed without a notice delay. Expose team names/emails to the authorized organizer for manual contact; no automatic outreach. History and individual fallback details remain open.

### TC-007: Deadline and warnings

Setup: A 12:00–12:10 appointment has a confirmed 12:08 submission deadline.

Action: Cross exactly three minutes, just below three minutes, exactly 90 seconds, just below 90 seconds, and zero remaining.

Expected observations: Warning transitions follow the strict below thresholds from the brief. Submission occurs at 12:08, reserving the last two slot minutes for teardown. Opening at 12:05 or refreshing must not grant a later deadline. An organizer cannot extend time. Reduced-motion users receive a steady red warning with the same deadline.

### TC-008: Complete and incomplete expiry

Setup: One judge has all required answers; another has only some. Neither has manually submitted.

Action: Reach the deadline.

Expected observations: Save both judges' progress while typing and preserve successfully persisted answers when the browser closes. Apply the fixed deadline to this work. The incomplete row is yellow and excluded from score calculation until completed. Do not invent missing scores or responses. Failed saves stay visible. Retrying cannot duplicate a result or extend its deadline.

### TC-009: Completion after expiry

Setup: A judge has an auto-submitted evaluation and their room has current or future appointments.

Action: Attempt to reopen during an occupied interval, a gap, and after the final slot.

Expected observations: A current room gap allows reopening without waiting for the final appointment. Teardown remains blocked. At gap end, progress saves and the editor closes/locks with a downtime message. Apply to complete and incomplete auto-submissions in UI and API. Room switching does not bypass the appointment-room restriction; officers have no exception. Completion enters scores once and retains revision history.

### TC-010: Time sorting and scope

Setup: Projects have multiple challenge appointments, same-challenge rooms, moved slots, and no appointment.

Action: Sort by time as a guest and as an authenticated judge with and without a room.

Expected observations: Use the selected room and active challenge appointment, or the earliest matching appointment with multiple challenge filters. Keep unscheduled entries last and preserve server pagination. Guest responses retain challenge scope and exclude team emails.

### TC-012: Saved reservation isolation and source changes

Setup: An organizer has a generated preview, then saves a schedule with several reservations.

Action: Before Save, generate another preview. After Save, attempt ordinary bulk regeneration, move one future appointment, remove a room's last judge, and edit a building/challenge in a way that would invalidate bookings. Exercise explicit Drop before and after the first-result trigger including incomplete auto-submissions but excluding typing, MLH, and unrelated historical results.

Expected observations: Preview regeneration works before Save. Saved reservations cannot be bulk reshuffled or swapped through ordinary operations. Explicit Drop before the first-result lock removes the schedule and permits configuration/regeneration; after that lock Drop is rejected. A legal individual move changes only its own reservation. Staffing loss warns while preserving bookings. Invalidating source edits are blocked. New projects require separate assignments.

### TC-013: Scheduled scoring and judge refresh

Setup: Two projects are scheduled in the same room at different times, and judges can browse both.

Action: Attempt to open their scoring forms before/during/after their appointment windows, change rooms, move a future appointment as organizer, and wait for the judge heartbeat.

Expected observations: Only the current booked project's new scoring form can open before the configured judging deadline in the selected scheduled room. MLH has an explicit untimed exception. Opening is manual. Browsing remains available. Schedule changes and scoring availability refresh without a manual reload. No-schedule hackathons retain untimed judging. Organizer state refreshes every five seconds and judge state every fifteen seconds.

### TC-011: Building changes across a project's schedule

Setup: A project has four challenge appointments in ENG and two in HEC. Competing feasible schedules have different numbers of building transitions.

Action: Generate the schedule.

Expected observations: Prefer ENG, ENG, ENG, ENG, HEC, HEC over ENG, HEC, ENG, HEC, ENG, ENG when higher-priority objectives tie. Sponsor finish, sponsor idle gaps, and overall finish outrank building changes; break maximization follows it. Apply the comparison to the project's entire appointment sequence.

### TC-014: MLH consolidation and exclusion

Setup: A synthetic import contains the eight MLH labels supplied by the owner, with some projects also entering ordinary sponsor challenges.

Action: Import, configure an MLH room, generate a schedule, and inspect projects as an MLH judge.

Expected observations: Match MLH case-insensitively anywhere in a challenge label and create one MLH Challenges entity for normalized imports, retain each project's original MLH opt-ins as readable context, and create no MLH appointments or capacity. General and non-MLH opt-ins remain eligible for scheduling. MLH judges can use untimed judging even with a hackathon schedule without seeing unrelated sponsor data. Only new imports normalize. Legacy records remain intact, and each complete consolidated MLH evaluation counts once in the existing overall score.

### TC-015: Generation budget and capacity

Setup: A representative fixture has up to 250 projects and about twelve challenge/room records, with a separately specified feasible room allocation. Another fixture has 250 General entries but fewer than eleven General rooms in a four-hour window at default timing.

Action: Generate schedules.

Expected observations: Return within the agreed overall budget of under five minutes. Report the infeasible General capacity in the second fixture; do not claim a heuristic timeout proves infeasibility. Validate any feasible candidate independently. A valid candidate without an optimality proof is labeled feasible. Exhausting the search tree or a sound capacity bound can prove infeasibility; a time limit cannot.

### TC-016: Configurable whole-minute timing

Setup: Use default 2/6/2 timing, then candidate configurations totaling seven and twelve minutes, with configurable same-building/cross-building breaks.

Action: Generate previews, save, attempt a timing change, and exercise the eligible Drop path.

Expected observations: Valid whole-minute totals need not be multiples of ten. No second-based input is accepted. Deadline follows setup + judging; teardown is reserved. Timing is immutable while a schedule is saved, and dropping an eligible schedule permits a new configuration. Setup and teardown are nonnegative, judging and same-building breaks are positive, and cross-building breaks are at least the same-building minimum. A submitted scheduled result locks Drop, including an incomplete auto-submission.

## Negative / regression cases

### TC-NEG-001: Insufficient capacity

Setup: A window cannot fit the required presentations and breaks, or an eligible challenge has no available room.

Action: Generate a schedule.

Expected observations: First attempt the full travel rules. Only when they genuinely cannot fit, retry with cross-building breaks reduced to the configured same-building baseline. If still infeasible, alert an organizer. Never reduce the configured same-building baseline or silently omit work. Solver timeout does not prove infeasibility. The relaxed preview lists affected projects and requires organizer acknowledgment before saving for use. If fallback still fails, unresolved work remains visible and an incomplete schedule cannot be used.

### TC-NEG-002: Stale organizer action

Setup: Two organizers choose the same open destination, or source data changes after preview.

Action: Submit both changes.

Expected observations: No double booking or silent overwrite. The stale actor receives the agreed conflict feedback and refreshed choices.

### TC-NEG-003: Missing browser or network

Setup: A judge has unsaved or persisted partial answers and loses connection, reloads, sleeps the device, or closes the browser before expiry.

Action: Pass the deadline and reconnect.

Expected observations: Successfully saved progress survives reload/browser closure and expires at the scheduled deadline. Never-opened forms remain missing rather than becoming empty submissions. A saved-success notice must correspond to persisted data. A never-opened form follows the agreed missed versus empty-record policy.

### TC-NEG-004: Unauthorized schedule access and repair

Setup: Anonymous, ordinary authenticated, guest, judge, and organizer callers attempt schedule operations and contact reads.

Action: Read, generate, save internally, reschedule, or reopen a submission.

Expected observations: Apply the SRD access matrix. Manipulated project, room, challenge, or hackathon identifiers cannot widen access.

### TC-NEG-005: Incomplete evaluation consumers

Setup: A project has only incomplete evaluations, then one becomes complete.

Action: Inspect Projects, Submissions, badges, score access, aggregates, feedback, and Deliberation.

Expected observations: Incomplete submissions leave the author's default Projects queue and remain yellow in Submissions. They do not count or unlock score access, completion badges, Deliberation, or feedback release until complete. Existing complete evaluations retain their approved behavior.

### TC-NEG-006: Source and lifecycle changes

Setup: A schedule exists with pending appointments and partial answers.

Action: Close judging, revoke a guest, archive a room, change a challenge, import projects, or soft-delete/restore a project.

Expected observations: Keep Closed judging read-only and reconcile persisted due answers before serving result state without orphaning appointments, losing saved answers, or expanding access.

### TC-NEG-007: Save and reassignment races

Setup: A manual save, auto-submit, reassignment, and late evaluation may occur around the same deadline.

Action: Deliver requests in different orders, including retries.

Expected observations: Preserve the agreed current answers and single evaluation identity. Keep the stable appointment identity and audit the selected appointment move. Never change another reservation.

## Resolved acceptance details

Product discovery is complete. Default timing is 2/6/2 with 10/20-minute breaks; configuration can use other whole-minute totals. Scale is at most 250 projects and generation must finish within five minutes. A stopped browser preserves only progress already received by the server.

TC-002 includes a deterministic quality fixture with 200 General projects, nine General rooms, two sponsor rooms, and nine teams entering both sponsors. At ten-minute intervals, sponsor finish at minute 90 with zero internal sponsor idle time must beat finish at minute 110 with 20 idle minutes. Both can finish all judging at minute 230. The first three values reach independent capacity lower bounds. Repeat with 32 projects and 50 total appointments; the sponsor and overall bound is minute 90. Small inventories must receive the same quality improvement.

Guest evaluation tests preserve the optional-sharing toggle, private default, and explicit opt-in flag. The authenticated mandatory-sharing notice must never appear for guests. No feedback distribution runs in this slice.

Regression coverage also checks that reopening an editor waits for fresh saved answers, heartbeats preserve in-progress typing, and saving a preview rejects a candidate that changed after organizer review. New schema tables must have explicit sanitized-backup rules.

### Mobile visual regression acceptance

Use guest QR entry on 320- and 390-pixel phone viewports. Complete a score, inspect its saved feedback, create a Deliberation section, and pick/add a judged project immediately after a success notice. Verify the picker option remains visible and receives the tap. Expand MLH labels, scroll the evaluation, and shorten the viewport to exercise limited keyboard space. Titles, tabs, dialogs, and footer actions remain within the viewport. Inspect a desktop directory and confirm participant names remain while the redundant Team size column is absent. Repeat after visual fixes and capture the final states.

### Organizer and directory follow-up verification

- Select a project with different-building reservations supplied out of order. Show all reservations chronologically, correct locations, complete/partial/future states, end-to-start gaps, and a reduced-break warning where applicable. Room/status filters cannot hide itinerary entries. Inspect or reassign one entry without changing another.
- At one millisecond before and exactly at the end of 7-, 10-, and 12-minute slots, hold the live window at the slot start, then advance to the next boundary. Browser cards retain their full width and dequeue after their slot. Manual navigation stays on the schedule's grid.
- Appointment results include complete and partial judge identities, completed responses, and a complete-only average scoped to that appointment ID. Reject unrelated hackathon and unauthorized reads.
- Room-only filtering defaults on for guests and authenticated judges. With several General rooms, results and pagination count only the selected room's assignments. Turning it off restores the permitted inventory. MLH remains untimed and challenge-scoped.
- Wrong-room and wrong-slot actions remain disabled. Hover and keyboard focus expose a reason without opening an evaluation dialog. Check 320 px and 390 px guest views, a short viewport, and desktop.
- Race two saves with the same expected draft revision. Exactly one succeeds. Put an invalid expired draft beside a valid one; retain the invalid answers and still materialize the valid result. Repeated autosave failures back off, stop automatic retries, and permit manual recovery without losing typed answers.

### TC-CP-001: Native model and proof ordering

Compare the eight-worker CP-SAT result with exhaustive enumeration for tiny schedules covering multiple rooms/buildings, empty inputs, non-grid breaks, sponsor idle, and three-stop project itineraries. All five objective values must match. Only proved earlier objectives may constrain later phases. A valid candidate without all five proofs remains feasible.

### TC-CP-002: Native failure, timeout, and cancellation

Cancel the native solve before and after a valid candidate. Retain only independently validated work; a missing native binding, invalid result, or time limit cannot claim infeasibility or enable reduced travel. Propagate cancellation and the remaining absolute deadline to the native solver. Node remains responsive while the solver runs.

### TC-CP-003: Leases, recovery, and checkpoint compatibility

Competing continuations may start only one native search per lease. Renew ownership while the solver works. Saving or superseding a job prevents any later worker write. After a restart, retain the original expiry, validated incumbent, and proved objective prefix when rebuilding the model. Existing DFS checkpoints remain readable and their candidates retain the same review hash. No saved schedule changes during generation.
