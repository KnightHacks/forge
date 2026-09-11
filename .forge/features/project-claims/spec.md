# Project claims and hacker judging spec

Status: Implementation authorized on 2026-09-11 after four clarification rounds.

## User-facing purpose

Provide a hackathon-agnostic, configurable claiming and judging capability. KHIX is the first portal consumer, not a hard-coded eligibility rule. Officers manage each hackathon's publication, emergency mode, and claim delivery independently.

Give hackers their project's judging itinerary without exposing other projects' appointments or judge assignments. They need to know when and where to present and which pitches to prepare. Claimed project members can read eligible results and feedback after judging.

## Users / actors

- Hackers claim imported memberships using links sent to Devpost emails and their signed-in hacker accounts.
- Organizers operate delivery and recovery from Blade's project Command Center.
- Authenticated judges supply the results and feedback this view distributes. Guest feedback is excluded.

## User-visible interface

### Claim entry

Send links to imported Devpost email addresses. Blade and Devpost emails need not match. Do not offer a self-entered email form as proof of project membership.

The link opens a team-member selector. Selecting an available member claims that identity immediately, without a second confirmation step. The user accepts team self-selection and does not want recipient-bound selection. Each hacker can claim only one project per hackathon, and each member can be claimed only once. Rough name matching remains optional and must not automatically select or claim anyone.

Provide an Invite hacker button accepting an email for teammates who forgot to join the Devpost submission. Any claimed teammate may invite an existing hacker account by email. The recipient accepts through an emailed link while signed in, and joins using their hacker profile name. Teams have a fixed maximum of four members for every hackathon. Imported members, pending invitations, and claimed members share the same four roster slots. Sending an invitation occupies a slot immediately. Claiming replaces that slot's displayed Devpost identity with the linked hacker profile; it never adds a second person. Block Devpost teams larger than four. Do not silently truncate their roster. Entering an invite email must not itself claim an account.

### Hacker portal judging tab

Add Judging using the existing portal's locked-navigation pattern. Claiming is available before schedule generation or room assignment. Organizers separately use Open schedule to publish timings to hackers. This action is independent of emergency lookup. The initial tab is locked. Every hacker action requires check-in to the relevant event, including claiming, sending or accepting teammate invitations, viewing results, and emergency search. Claiming may precede scheduling but never check-in. The navigation unlocks after check-in and at least one claim email has been sent for the event, independently of schedule publication. Direct claim links remain usable by checked-in hackers before email delivery, including officer-shared links. Other visits to the locked judging route return to the dashboard.

Once available, show only the claimed project's chronological itinerary. Each appointment identifies its time, building and room, challenge, and relevant collapsed sub-challenges. Do not expose other projects' appointments or judge rosters.

| Appointment condition                   | Appearance          |
| --------------------------------------- | ------------------- |
| Future without completed evaluation     | Neutral, upcoming   |
| Current, awaiting completion            | Yellow, in progress |
| Expired with incomplete evaluation only | Yellow, incomplete  |
| Expired without evaluation              | Red, missing result |
| At least one completed evaluation       | Green, judged       |

Pair color with text. A completed judging card opens a themed feedback dialog instead of adding a separate feedback card. Release written feedback and individual rubric scores from completed authenticated-judge evaluations. Show no judge names, guest scores, or guest feedback. Aggregates and rankings are not part of the requested results view. Later judge edits appear on the next successful refresh.

Use a two-minute hacker-view heartbeat. Feedback is eligible immediately upon completed submission and appears on the next successful read. After an appointment ends, make a final verification request before displaying red or opening the missed-appointment dialog. Failed verification must not present a stale assumption as a confirmed missed appointment.

Use KHIX-themed dialogs and remove decorative eyebrow headings. After final verification confirms a missed appointment, show a prominent dialog and a solid red warning with space before the itinerary. Use this message:

> You missed your judging appointment. Expect a message from an organizer. You must respond to avoid disqualification across all challenges.

Do not offer or promise rescheduling. Any reassignment is at officer discretion through the existing organizer workflow. The warning covers all challenges, not only the missed challenge. No automatic disqualification mechanism or response deadline has been requested. Dialog dismissal behavior remains to be settled.

List unscheduled challenges at the bottom as ordinary itinerary cards with their rooms and relevant child entries. Their time reads "When you have time - unscheduled". Do not invent appointment times.

### Command Center recovery

Provide an explicit bulk Send claim links action and individual resend/copy actions. Email styling is shared across Knight Hacks hackathons, with generic project-claim copy. Distinguish linked team membership from recipient email delivery in the officer table. Claim links are single-use. No revoke or rotate controls are required. Issue a separate link per emailed recipient. Each link permits selecting any available member of its project. Consume it only after successful member selection. Resend/copy returns the same unused link. A used link cannot create another claim.

Organizers can search for a person and copy their claim link for manual Discord or text delivery. Once a hacker claims, add their linked Discord contact to the project contact information so organizers can message them quickly. Preserve existing name/email contacts and handle missing Discord information honestly. This does not send messages automatically.

The first successful claim blocks replacement imports for the hackathon and changes imports to add-only mode. Preserve existing claims and invited members.

Emergency mode replaces claim-based entry with a searchable project dropdown. Selecting a project reveals its itinerary without claiming. Show only one project's itinerary at a time. Never show a combined schedule or feedback in this mode. Only officers can control this mode in Command Center. It hides all scores as well as feedback; switching it off restores normal claimed access. Any hacker checked in to the relevant hackathon may search through that event's portal. Open schedule is required for both normal and emergency itineraries. Enabling emergency mode never bypasses publication.

## Scope

### In scope

- Email claim delivery, direct member selection, teammate invitations, and organizer recovery.
- Reusable per-hackathon behavior, with initial navigation and itinerary UI in KHIX.
- Relevant grouped challenge labels and existing scheduler states.
- Immediate eligible results and feedback, and missed-appointment guidance.
- Organizer-controlled emergency project lookup without claiming or feedback.

### Out of scope from the brief

- A hacker-visible full schedule or judge roster.
- Hacker-selected appointment times.
- Self-entered Devpost email as ownership proof.
- Guest feedback distribution.

## Vocabulary

- Claim: association between a signed-in hacker and project membership. One project per hacker per hackathon and one hacker per member. Officer correction of mistaken claims is outside this slice; used links are never reset.
- Claim link: emailed invitation to establish the association, not a live Devpost account integration.
- Emergency lookup: project search without ownership proof.
- Results: written feedback and individual rubric scores from completed authenticated-judge evaluations, without judge names.

## Acceptance criteria

- AC01: Different Blade and Devpost emails do not prevent a valid claim.
- AC02: Member selection claims immediately without a second step. Enforce one project per hacker per hackathon and one claim per member. Typed email alone grants nothing.
- AC03: Normal access returns only the hacker's project itinerary and relevant grouped sub-challenges.
- AC04: Status meanings match the scheduler and remain readable without color.
- AC05: Completed authenticated written feedback and individual rubric scores are available without judge names. Guest scores and feedback are excluded.
- AC06: Refresh every two minutes and verify once after appointment end before turning red. The dialog says to expect an organizer message and requires a response to avoid disqualification across all challenges. It offers no rescheduling.
- AC07: Organizers can find and copy individual claim links.
- AC08: Officer-controlled emergency search requires no claim and returns one itinerary at a time without scores or feedback. Disabling it restores normal claimed access.
- AC09: Checked-in hackers can claim before scheduling. Open schedule gates both normal and emergency timings; the emergency switch only changes how projects are selected.
- AC10: Any claimed teammate may invite an existing hacker account by email. Imported, pending-invited, and claimed members share a fixed four-slot capacity. Claiming never increases roster size. Block over-limit Devpost teams.
- AC11: First claim permanently blocks replacement imports and preserves existing memberships through add-only import.
- AC12: Organizers see linked Discord contacts alongside existing project contact details.
- AC13: Unscheduled challenges appear at the bottom with room guidance to visit during available time.

- AC14: Require check-in to the matching event for all hacker claim, invitation, itinerary, feedback, and emergency operations. Check-in to a different event grants nothing.
- AC15: Configure and run the capability for another hackathon without changing domain logic or hard-coded event identifiers.

## Open questions

Implementation was authorized on 2026-09-11. See [status.md](./status.md) for rollout progress and deferred scope.

Published emergency mode bypasses the email-delivery navigation lock so a total provider outage cannot disable the fallback. Check-in and schedule publication remain required.
