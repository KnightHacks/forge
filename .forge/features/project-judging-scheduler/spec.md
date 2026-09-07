# Project judging scheduler spec

Status: Product decisions accepted on 2026-09-07. Implementation authorized after reverse-prompting.

## User-facing purpose

Assign where and when projects present during a judging window. Sponsors should finish promptly with little idle time. Hackers need breaks between presentations and more travel time when changing buildings. Organizers want judging finished early enough to keep the remaining window available for overflow and emergencies.

The organizer has lost three sponsors after poor judging waits. Sponsor experience is the first optimization priority. The owner confirmed the optimization order: earliest finish of the last sponsor challenge, then fewer sponsor idle gaps, then earliest overall judging finish, then fewer building changes, then better hacker breaks within that finish. Improve breaks within that earliest finish; do not extend judging to create extra rest. The same-building minimum is mandatory and configurable, default ten minutes. The cross-building minimum is also configurable, default twenty minutes. Only when the full schedule genuinely cannot fit may generation retry using the same-building minimum for cross-building travel. Use nonnegative whole minutes for setup and teardown, positive whole minutes for judging and the same-building break, and a cross-building break no shorter than the same-building break. If the relaxed problem still cannot fit, alert an organizer. Minimize building changes across each project's schedule after sponsor and overall-finish priorities, before maximizing breaks. A relaxed schedule must list affected projects and require organizer acknowledgment before saving for use. If the relaxed problem is still infeasible, display unresolved work and block using an incomplete schedule.

## Users / actors

- Organizers configure the window and rooms, generate the schedule, monitor progress, and repair missed presentations.
- Sponsor judges and authenticated judges review projects in their rooms, use the timed evaluation dialog, and finish incomplete submissions later.
- Hackers receive assigned presentation times and locations. They do not choose slots. Publication and delivery to hackers are deferred to a separate final slice.

## User-visible interface

### Command Center scheduling

The existing project Command Center is the intended organizer workspace. Each hackathon has one judging window with a start and end time. Target scale is 200–250 projects, roughly twelve challenges and twelve rooms, with varying challenge opt-ins. Generation normally starts about thirty minutes before judging and must finish in under five minutes per run. Capacity still depends on the number of presentations per challenge and assigned rooms; these figures are not a claim that every inventory fits. The example is Sunday from noon to 4 p.m.; that date and window are not fixed event configuration. Setup, judging, and teardown durations are configurable whole minutes, defaulting to 2/6/2. Their total may be any whole number of minutes, including seven or twelve. Same-building and cross-building break durations are also configurable, defaulting to ten and twenty minutes. Slots begin at the window start plus multiples of the configured total. Remaining minutes that cannot contain a full slot stay unused. Setup and teardown may be zero; judging and same-building breaks must be positive, and cross-building breaks cannot be shorter than same-building breaks. No second-based start such as 3:30:30 is allowed.

The organizer wants both a moving 60-minute view across rooms and a room schedule view. Organizers may generate and inspect previews freely before the first Save. Once saved, individual operations cannot bulk regenerate, swap, or automatically reshuffle reservations. The owner explicitly allows a separate Drop schedule action before the first judge result, so organizers can compare configurations and regenerate. The first submitted result tied to a scheduled appointment permanently locks Drop, including an incomplete auto-submission. Typing autosaves, MLH results, and unrelated historical evaluations do not lock it. An eligible Drop removes only that schedule and its unsent drafts; submitted evaluations remain intact. Organizers can move individual future or missed appointments. New projects need separate assignments. Block room/building/challenge changes that would invalidate saved reservations until affected reservations are handled individually. Losing the last judge flags a warning while retaining the room's bookings. Use a Schedule tab in Command Center with a live 60-minute room view and a full room agenda. Keep room/project search, manual time navigation, return-to-now, and missed/incomplete filtering near the schedule. Publication is deferred to the final slice.

Each assigned card identifies its project, challenge, and location. The owner approved these states:

| Condition                                                      | Card state |
| -------------------------------------------------------------- | ---------- |
| Future appointment with no evaluation                          | Neutral    |
| Current appointment awaiting completion                        | Yellow     |
| Expired appointment with no evaluation                         | Red        |
| Expired appointment with only incomplete evaluation work       | Yellow     |
| At least one complete evaluation for the project and challenge | Green      |

One complete evaluation is enough to establish that the project was judged in that challenge. Incomplete work alone does not qualify. Keep the appointment identity and move history when rescheduling. A result remains attached to the appointment attempt and room where judging occurred; it must not silently cancel or rewrite a replacement reservation.

### Buildings and rooms

Rooms identify both a building and a room. The building catalog is shared across hackathons and starts with ENG, BA, HEC, and HS. A dropdown includes Other; entering a building adds it for later use. Trim input and prevent case-insensitive duplicates. Each building-and-room combination is unique within a hackathon so different challenges cannot double-book the same physical room. Existing rooms keep their IDs and QR links; an organizer must assign a building before they can be scheduled. Do not infer a building from an existing free-text room name.

### Missed presentations

An organizer can open a future appointment or red missed card and either request smart reassignment using the scheduling priorities or manually choose an open existing interval. Choices must belong to the relevant challenge and exist within the schedule. Smart reassignment moves only the selected project/challenge appointment. No operation on a reservation may shift, swap, or otherwise change a different reservation. Apply the same isolation to manual moves. An opening starting immediately is eligible; there is no required notice period. Use existing grid intervals whose start is at or after the operation time. There is no added notice delay; do not create a shortened slot inside an interval that already started.

The reassignment view prominently displays imported team members' full names and emails so organizers can contact them. Organizers contact missed teams manually, case by case. Automated hacker contact is deferred.

### MLH import and unscheduled judging

Challenge labels containing MLH are excluded from scheduling. During import, flatten their project memberships into one challenge entity named MLH Challenges. Preserve the original opted-in MLH labels as project information so MLH judges can see the specific entries inside the project or evaluation modal. They must not remain separate challenge entities for new normalized imports.

An organizer may create a room assigned to MLH Challenges. Neither that challenge nor its rooms generate scheduled slots or consume scheduler capacity. Projects opting into MLH still receive General and their non-MLH appointments. Organizers verbally direct teams to visit MLH when free.

MLH judges may use Blade for their own judging. Their exception to scheduled scoring must preserve challenge-scoped access and expose the original MLH entry names. Use case-insensitive contains matching and a dedicated read-only list of original labels inside project/evaluation modals. MLH rooms retain untimed judging even when the hackathon has a schedule. Normalize new imports only; existing projects, rooms, challenge records, and results remain intact. Exclude legacy MLH-labeled challenges and rooms from scheduling too. The consolidated MLH scope uses the normal rubric and contributes one evaluation per judge/project to the existing overall rating. Do not recompute historical results under a new grouping. Publication and automated hacker delivery remain deferred.

The owner supplied eight examples: MLH - Best Domain Name from GoDaddy Registry, MLH - Best Use of Arm, MLH - Best Use of DigitalOcean Gradient™ AI, MLH - Best Use of ElevenLabs, MLH - Best Use of Gemini 2.5 Computer Use, MLH - Best Use of Gemini API, MLH - Best Use of Snowflake API, and MLH - Best Use of Vultr.

### Timed evaluations

The evaluation dialog clearly displays a timer. It turns yellow below three minutes and blinks red below 90 seconds. For a 12:00–12:10 slot, it submits the current answers at 12:08 to reserve two minutes for teardown. The deadline stays fixed for early or late arrivals. Once scheduled, there are no time extensions, including organizer extensions. With non-default phases, the deadline is slot start plus the configured setup and judging durations; teardown remains protected. Save progress while the judge types, retain persisted work through reload or browser closure, and apply the scheduled deadline independently of reopening the form. A never-opened evaluation stays missing rather than becoming an empty submission. Work typed without a successful network save cannot be guaranteed on another device; Show failed saves and retries without claiming unsaved work survived.

If required answers are missing, the system still preserves the partial submission. Its row in Submissions is yellow and it does not count until completed. Incomplete evaluations do not unlock scores or Deliberation, turn challenge completion badges green, or release written feedback. They leave that judge's default Projects queue so the judge can focus on the next team and finish incomplete work through Submissions. A short explanation should direct judges to finish it in Submissions when free. After expiry, show a dismissible explanation that distinguishes Submitted from Saved incomplete and directs the judge to Submissions during downtime. Saving failures remain visible and must not claim success.

A judge cannot reopen an auto-submitted project until there are no currently booked slots in their room. The owner confirmed that a current gap is enough; judges do not have to wait until the room's final presentation. Teardown counts as booked time. If a gap ends while an old submission is open, save its progress and close/lock the editor with a short downtime message. The restriction follows the room attached to that appointment, applies to complete and incomplete auto-submissions, and has no officer override. Switching rooms cannot bypass it.

### Mobile judging

Most guest judges use phones after scanning a room QR. Verify entry, project browsing, details, timed and MLH evaluations, Submissions, and Deliberation at 320- and 390-pixel widths. Keep tabs inside their available width, compact typography, and touch controls at least 44 pixels. Evaluation headers and footers must leave usable scrolling space, including short viewports. Put long MLH opt-in lists in an expandable part of the scrolling body. Save notices must not cover the mobile project picker. Remove the redundant Team size column and mobile count badge from the project directory; participant names remain visible.

### Project discovery

Add sorting by presentation time so judges can inspect upcoming projects. Refresh the judge project view through a heartbeat slower than Command Center so reservation changes appear without a manual reload.

When a schedule exists, judges must be in the assigned room to open a new evaluation for its current project from slot start until its configured judging deadline, minute eight with default timing. Judges start the evaluation themselves; never force-open the form. Browsing all otherwise-permitted projects remains available, but another project's scoring form cannot open during the current booking. Without a schedule, preserve existing untimed judging behavior. Display the appointment for the active challenge and selected room where applicable. Outside a room, use the active challenge appointment; with multiple challenge filters, use the earliest matching appointment. Put unscheduled rows last and label MLH as unscheduled. Preserve server sorting and pagination, and show room labels so projects in another same-challenge room remain distinguishable.

## Scope

### In scope from the brief

- Organizer-generated schedules with assigned times, rooms, and challenges.
- Sponsor-first optimization and distribution across multiple rooms for a challenge. Each project presents once for General and once for each scheduled opted-in challenge, in a room with judges for that challenge. Each challenge is unique; one sponsor does not own several challenges.
- Configurable whole-minute setup/judging/teardown with default 2/6/2. Any whole-minute total is permitted; second-based scheduling is not.
- Configurable same-building/cross-building breaks with defaults ten/twenty minutes. Same-building breaks are positive whole minutes; cross-building breaks are at least that minimum.
- Explicit Drop schedule and regeneration before the first judge result; Drop locks after the first submitted schedule-linked result, including incomplete auto-submissions.
- Import consolidation into MLH Challenges, preservation of individual MLH labels for judge context, and exclusion of that challenge and its rooms from scheduling.
- A mandatory configured same-building break between presentations. Use the configured cross-building minimum first; relax it to the same-building minimum only when the full schedule genuinely cannot fit, then alert an organizer if it still cannot fit.
- Minimize building changes across a project's appointments, such as ENG, ENG, ENG, ENG, HEC, HEC rather than alternating buildings. Sponsor priorities and overall finish outrank this preference; longer breaks follow it.
- Earliest overall finish after sponsor optimization, followed by the best hacker breaks within that finish time.
- Building and room configuration with reusable custom building options.
- Organizer schedule views and frequently refreshed status.
- Smart and manual reassignment of missed presentations.
- Prominent organizer access to team contact details during reassignment.
- Timed evaluation submission, incomplete submissions, and restricted reopening.
- Presentation-time sorting in the judge directory.

### Scope boundaries

Participating rooms use the full window. Separate sponsor availability/lunch windows and a fixed overflow reserve are outside this slice. Unused time remains overflow. Add newly imported projects individually without changing existing reservations. Preserve existing officer permissions, guest challenge scope, and Draft/Open/Closed judging lifecycle.

Feedback sharing remains a stored flag for later distribution. Authenticated judge responses use the existing mandatory-sharing policy. Guest responses preserve the existing optional toggle and rubric visibility policies. The mandatory-sharing notice appears only for authenticated judges.

Schedule publication and hacker reach are explicitly deferred to the final slice. This includes hacker-facing lookup, delivery, and distribution workflows. No new hacker portal or messaging delivery belongs to this slice. Schedule export/distribution is also deferred. Technical solver and execution choices are documented in srd.md.

Presenter identity and individual attendance tracking are intentionally excluded. The owner accepts a judged project when it has at least one valid judging record, even if some team members do not attend. A single project is the hacker/team unit for scheduling. Every challenge appointment for that project shares the same conflict and break constraints. Do not create separate scheduling identities per challenge or infer individual attendance from contact records.

Implementation and test generation were authorized on 2026-09-07. Completion requires end-to-end verification, all required checks, Forge review capped at depth five, an issue and PR with hosted screenshot evidence, and CodeRabbit approval after addressing findings. Do not merge or deploy.

## Vocabulary

- Judging window: the organizer-selected interval available for judging.
- Slot: an interval in one room associated with that room's challenge. Its duration is the sum of the configured setup, judging, and teardown minutes.
- Appointment: a project's assignment to a slot, with a stable identity across individual moves.
- Hacker/team: the project as a whole, across all of its challenge appointments.
- Staffed room: a room with a guest or organizer currently joined, using the existing Command Center roster behavior.
- Break: time between the end of one full presentation slot, including teardown, and the start of the next. Default minimums are ten minutes in the same building and twenty across buildings. The configured minimum is measured from the full slot end to the next start.
- Soft submission: preserved incomplete answers that do not count as a completed evaluation.
- Overflow: time remaining after scheduled judging finishes, available for exceptions.

## Acceptance criteria captured from the brief

These criteria summarize the accepted behavior. The SRD defines technical enforcement and the test cases define its observable proof.

- AC01: Organizers provide one judging window per hackathon and generate assignments; hackers do not select their own times. Timing is configurable in whole minutes with default 2/6/2 and any whole-minute total. Same-building/cross-building breaks are configurable with default ten/twenty minutes. Inputs must not introduce seconds or violate the phase/break bounds above.
- AC02: Each project receives one General presentation and one per scheduled opted-in challenge. Multiple rooms divide a challenge's presentations. Optimize the last sponsor finish first, sponsor idle gaps second, overall finish third, building changes fourth, and hacker breaks within that finish last. General can run concurrently with sponsor judging. Use rooms with currently joined judges under the existing Command Center logic.
- AC03: Hackers never receive back-to-back presentations. The configured same-building minimum is mandatory; cross-building breaks use their configured higher minimum unless the strict schedule genuinely cannot fit. Retry with the same-building minimum before alerting an organizer. Defaults remain ten/twenty minutes.
- AC04: Rooms identify their building and room. A cross-hackathon catalog starts with ENG, BA, HEC, and HS and supports Other with trimmed case-insensitive duplicate prevention. Building-and-room combinations are unique per hackathon. Existing room IDs and QR links survive; building assignment is required before scheduling.
- AC05: Organizers can inspect judging across rooms over a 60-minute span and inspect an individual room's schedule.
- AC06: Future appointments are neutral, current appointments are yellow, expired appointments without evaluations are red, and expired appointments with only incomplete work remain yellow. One complete project/challenge evaluation makes the card green.
- AC07: A missed presentation supports smart reassignment and manual selection of valid open challenge-compatible slots. Only that appointment may change. No operation shifts or swaps another reservation. Immediate starts are eligible and organizers handle contact manually.
- AC08: Reassignment makes team names and emails easy for organizers to read.
- AC09: The evaluation timer shows the requested warning thresholds and submits at slot start plus setup and judging durations, reserving the configured teardown. With default 2/6/2, that is minute eight of ten. Late arrival does not change the deadline. No one may extend it. Progress saves while typing, survives reload/browser closure once persisted, and a never-opened form remains missing.
- AC10: An incomplete auto-submission remains available in Submissions, appears yellow, and does not count until completed. It leaves the author's default Projects queue but does not unlock scores, Deliberation, challenge completion, or feedback release.
- AC11: Judges may reopen auto-submitted evaluations only during a current gap in the appointment's room. Teardown stays blocked; switching rooms and officer access do not bypass the rule. When the gap ends, preserve progress and lock the old editor with a downtime message.
- AC12: Judges can sort projects by presentation time and receive reservation updates through a slower judge heartbeat.
- AC13: With a schedule, scheduled-room judges manually open new evaluations only for the current project in their assigned room during the allowed judging window. MLH requires an explicit unscheduled exception. Browsing stays available. Without a schedule, existing untimed behavior remains.
- AC14: Saving a schedule locks timing and ordinary bulk reshuffling. The explicit Drop schedule action permits a fresh configuration before the first-result lock; the first submitted scheduled result, including an incomplete auto-submission, locks it permanently. Individual future/missed appointments may move; source edits cannot invalidate unrelated reservations. Staffing loss warns without moving bookings.

- AC15: Import consolidates MLH labels into one MLH Challenges entity while preserving original per-project opt-ins for MLH judge context. MLH challenges and rooms are excluded from scheduling; General and non-MLH entries remain scheduled.
- AC16: A run returns within five minutes for the accepted upper workload, with truthful feasible, infeasible, or search-timeout outcomes. Do not claim every inventory is schedulable or every result globally optimal.

## Open product questions

None. Drop locking and MLH historical/scoring behavior were confirmed in the final reverse-prompt round. Remaining implementation details follow the constraints in srd.md.

### Organizer and judge refinements accepted during implementation

Organizers can select a project and audit all of its reservations in chronological order, with building, room, challenge, status, and end-to-start breaks. The itinerary shows every reservation regardless of room/status filters and flags reduced travel breaks. Appointment inspection links to the same itinerary.

The moving room board advances at appointment boundaries. A current card keeps its full width until the appointment ends, then leaves and the remaining cards shift forward. For durations that do not divide an hour, include enough complete slots to cover at least 60 minutes. Respect reduced-motion preferences.

Clicking an appointment shows judges who submitted complete or partial evaluations. Organizers can inspect completed responses and see the mean of complete judge scores attached to that appointment. Partial evaluations do not contribute to the mean; unrelated historical results are not part of this session average.

Judge buttons remain disabled for the wrong room, wrong slot, teardown, and other timing restrictions. Explain the reason on a hoverable and keyboard-focusable wrapper; do not open a denial dialog from an intentionally blocked action. A "Show in room only" filter defaults on for authenticated and guest judges. Apply it before pagination using the selected room's reservations when a schedule exists. MLH rooms keep their unscheduled challenge inventory. Turning the filter off restores permitted project browsing.
