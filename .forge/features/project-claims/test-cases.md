# Project claims and hacker judging test cases

Status: Accepted behavior implemented; automated and browser validation recorded in status.md.

## Scope

Claims, restricted itineraries, eligible feedback, missed-appointment guidance, and organizer recovery. Award decisions and scheduler generation changes are excluded.

## Test placement plan

API cases in `packages/api`, SDK contracts in `packages/hacker-sdk`, hacker flows in `apps/2026`, and organizer flows in `apps/blade`. Final commands depend on the approved SRD.

## Test cases

### TC-001: Different account emails

Setup: An imported member receives a link and has a hacker account with a different email.

Action: Open the link, sign in, and select an available team member.

Expected observations: The selected association succeeds without email equality or a second confirmation step. The link is not restricted to its emailed recipient identity.

### TC-002: Private itinerary and grouped pitches

Setup: Two projects have appointments. The claimed project opted into some children of a judging group.

Action: Open its judging view.

Expected observations: Show its times, buildings, rooms, challenges, and relevant child entries. Omit the other project's appointments and judge roster.

### TC-003: Scheduler states

Setup: Future, current, expired-without-evaluation, incomplete-only, and completed appointments exist.

Action: View them as the claimed hacker as time advances.

Expected observations: Neutral, yellow, red, yellow, and green respectively, with text labels. Incomplete work never counts as judged solely because its deadline passed.

### TC-004: Feedback eligibility

Setup: Complete authenticated feedback, incomplete work, and guest feedback exist.

Action: Read project feedback after completion.

Expected observations: Eligible authenticated feedback appears without waiting for the event to finish. Return individual rubric scores and written feedback without judge names or identity fields. Guest scores, guest feedback, and incomplete work are absent.

### TC-005: Organizer recovery

Setup: A recipient reports failed delivery.

Action: An authorized organizer finds the person and copies a claim link.

Expected observations: The link works for manual delivery. Copying does not itself send a Discord message or text.

### TC-006: Emergency lookup

Setup: An organizer enables emergency mode.

Action: An eligible viewer selects a project, then another.

Expected observations: No claim required, one selected itinerary at a time, no combined schedule or feedback. All scores and feedback are absent even for already-claimed hackers. Disabling the mode restores their normal access. Only hackers checked in to the requested hackathon may use its emergency search through that event's portal. Open schedule must already be enabled. Anonymous users and hackers checked in only to another event are denied.

### TC-007: Claim before scheduling

Setup: Imported projects and checked-in hackers exist without room assignments or a schedule.

Action: Claim a member, then have an organizer save a schedule and separately open it to hackers.

Expected observations: Claiming succeeds before scheduling. Saving a schedule alone does not publish its timings. Emergency lookup is a separate control.

### TC-008: Missing teammate invitation

Setup: A teammate is absent from the Devpost roster.

Action: Use Invite hacker with their email.

Expected observations: An invitation flow is available. No account is claimed solely by entering an email. A claimed teammate can invite an existing hacker account. Acceptance uses the signed-in recipient and their profile name. Creating the invitation immediately consumes one roster slot. Imported, invited, and claimed members count together toward four. Concurrent invitations cannot reserve a fifth slot. Acceptance links the reserved slot to the hacker profile without increasing roster size.

### TC-009: Officer control

Setup: An officer and an ordinary hacker are signed in.

Action: Each attempts to enable or disable emergency mode directly.

Expected observations: Only the officer succeeds. Search viewer eligibility is a separate policy.

## Negative / regression cases

### TC-NEG-001: Cross-project access

Setup: A hacker owns project A in normal mode.

Action: Directly request project B's itinerary or feedback.

Expected observations: Server denies access without exposing protected data.

### TC-NEG-002: Credentials and competing claims

Setup: Invalid, expired, consumed, wrong-event, or already-claimed links; two accounts also compete for one identity.

Action: Attempt to claim by selecting a member.

Expected observations: At most one account claims the member, and one hacker cannot claim two projects in the same hackathon. A losing claim returns a conflict without consuming its unused link.

### TC-NEG-003: Missed versus incomplete

Setup: An expired appointment lacks evaluations; another has incomplete judge work.

Action: Open or refresh the itinerary.

Expected observations: Verify once with the server after the appointment ends before showing red and the warning. Completed results resolve green; incomplete work resolves yellow. Failed verification does not assert a miss. The dialog says the appointment was missed, tells the hacker to expect organizer contact, and requires a response to avoid disqualification across all challenges. It contains no rescheduling offer or guarantee. Dismissal behavior remains open.

### TC-NEG-004: Mode and schedule changes

Setup: A client stays open while an organizer changes release/emergency mode or moves an appointment.

Action: Refresh or receive the agreed live update.

Expected observations: Current server policy and itinerary apply. Emergency lookup exposes no stale feedback. The regular heartbeat is two minutes. Existing claims survive emergency mode and become usable again when it is disabled.

### TC-010: Single-use delivery

Setup: A claim email contains an unused link.

Action: A mail scanner opens it, then a hacker opens it and successfully selects a member. Another account attempts to reuse it.

Expected observations: Preview does not consume the link. Successful claiming consumes it atomically. Reuse cannot claim a second identity. Resend/copy returns the same unused recipient link. Separate recipient links allow other teammates to claim. A repeated successful claim returns a conflict; the association remains unchanged.

### TC-011: Claim protects imports

Setup: An imported project receives the hackathon's first claim, before any rooms exist.

Action: Attempt replacement import, then import unseen projects through add-only mode.

Expected observations: Replacement is blocked. New projects can be added without losing claims or invited members. A concurrent replacement/claim cannot leave a successful claim pointing at deleted membership.

### TC-012: Organizer Discord contacts

Setup: One project member claims with a linked Discord account; another lacks one.

Action: An organizer opens project contact details and the rescheduling flow.

Expected observations: The linked member has usable Discord contact information alongside existing email details. Missing Discord is not fabricated. Hacker and emergency responses do not expose organizer-only contacts.

### TC-013: Unscheduled visits and feedback edits

Setup: A project has scheduled and unscheduled challenges and a completed authenticated evaluation.

Action: View the itinerary, then refresh after the judge edits the evaluation.

Expected observations: Unscheduled entries appear at the bottom with rooms and guidance to visit during available time. No appointment time is invented. Eligible edited rubric scores and text replace earlier values without revealing the judge.

### TC-014: Event check-in across all hacker operations

Setup: An anonymous viewer, an unchecked-in hacker, a hacker checked in only to another event, and a hacker checked in to the target event.

Action: Attempt claim preview/selection, invitation sending/acceptance, normal itinerary/feedback, and emergency search directly through the API/SDK.

Expected observations: Every operation enforces target-event check-in. The eligible hacker still needs the applicable link, project membership, and publication state. A denied claim does not consume its link.

### TC-015: Emergency mode does not publish

Setup: A saved schedule exists with Open schedule off and emergency mode on.

Action: A checked-in hacker requests either itinerary view, then an officer opens the schedule.

Expected observations: Neither view leaks timings before publication. After publication, emergency search returns only the selected itinerary without scores or feedback.

### TC-016: Reuse across hackathons

Setup: Two configured hackathons with separate projects, claims, publication, and emergency settings. Use a second event distinct from KHIX.

Action: Exercise claims and judging reads through each event's configured Hacker SDK client and change one event's settings.

Expected observations: Both events work through the same platform capability without hard-coded KHIX checks. Data, check-in, claims, and settings stay isolated. A hacker can claim one project in each event when checked in to both.

### TC-017: Four shared roster slots

Setup: A project has three imported members, including both claimed and unclaimed identities, and one pending invitation.

Action: Invite a fifth person, claim an imported member, then accept the pending invitation.

Expected observations: The fifth invitation is rejected. Both claims reuse existing slots; the roster remains four people. Linked hacker profiles replace the corresponding displayed imported/pending identities without losing organizer contact provenance.

### TC-018: Oversized Devpost team

Setup: An incoming Devpost project reports five or more members.

Action: Validate/import that project in replacement and add-only modes.

Expected observations: The project is rejected as over the fixed four-person limit. Do not truncate, quietly admit it, or alter an existing team's claims. Final batch failure behavior follows the approved importer contract.

## Open questions

Validation results are in [status.md](./status.md). Mistaken-claim correction and invitation cancellation are outside this slice; token rotation/revocation remains excluded.
