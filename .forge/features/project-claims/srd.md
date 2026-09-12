# Project claims and hacker judging SRD

Implementation authorized on 2026-09-11. Product decisions are in [spec.md](./spec.md); validation and delivery progress are in [status.md](./status.md).

## Ownership and contracts

Blade owns officer controls; KHIX is the first hacker UI. Event identity comes from the configured portal session, never a KHIX constant. Existing Hacker SDK transport exposes `getProjectClaim`, `claimProject`, `inviteProjectMember`, `getJudging`, and `searchJudgingProjects`. Strict input/output schemas live in validators. Workflow helpers live in API `utils/project-claims`; officer procedures extend the existing judging router.

Every hacker operation requires check-in to the session's event. Officers use the existing project-management capability guard. Mutating officer controls write audit events without recording credentials. SDK responses omit organizer contact fields and judge identities.

## Persistence and concurrency

Migration 0054 adds ProjectClaim, ProjectClaimLink, ProjectMember.invitedUserId, and per-event publication/emergency/first-claim/claim-page-URL fields to judging configuration. Existing projects begin unclaimed and unpublished.

ProjectClaim's member primary key and event/user unique constraint enforce one hacker per member and one project per hacker per event. The claim mutation does not retry automatically because consumed credentials cannot replay. Claimed projects cannot be soft-deleted. Oversized rosters cannot receive links until corrected. Composite foreign keys enforce member/project/event scope. Claims preserve imported name/email provenance; linked profiles supply the displayed name and officer Discord contacts.

A random 256-bit token belongs to each recipient slot. An imported recipient may select any available imported member of that project. Invitation tokens are restricted to their intended account and reserved slot. GET previews do not consume tokens. Successful claims consume them in the transaction, erase the recoverable token, and permanently set the first-claim/import lock. Replays return a conflict without changing the claim.

Unused tokens are recoverable only through officer controls and expire at event end. Copy/resend follows credential consumption, even if a different recipient selected the original slot. Used credentials are never regenerated.

Claims, invitation creation, project edits, and imports reuse the hackathon row lock. Invitations immediately occupy one of four slots. Acceptance links that slot rather than appending a person. Duplicate invitation retries reuse the existing member/link. An existing hacker profile email must resolve unambiguously; both sender and recipient must be checked in. Recipient availability failures use one message. Limit each caller/event to ten invitation attempts per minute per Blade process. A shared limiter is needed if Blade runs multiple replicas.

First claim prevents replacement imports permanently. Add-only imports preserve existing claims/invitations. Oversized incoming Devpost projects are rejected and reported individually, consistent with the existing parser contract; valid projects in that file can still import. Existing oversized projects cannot claim/invite until corrected. Officer edits preserve an unchanged roster and reject roster replacement after links or claims exist.

## Publication and privacy

Claims do not depend on scheduling or rooms. Open schedule requires a saved schedule and independently gates both normal and emergency timings. Emergency mode exposes a bounded project-name search to checked-in hackers and one selected itinerary at a time. It suppresses all scores/feedback, including the viewer's own, and exposes no roster contacts.

`claimsOpen` reports whether any active project recipient has a sent email. The KHIX rail requires check-in and this flag; a valid direct claim link still works before the rail opens. Locked route visits return to the dashboard. Schedule publication separately controls times.

Normal reads return only the hacker's claimed project. The itinerary uses saved appointment times and the scheduler's status helper. It includes relevant child challenge labels, building/room destinations, and unscheduled challenges at the bottom with guidance to visit during available time.

Completed member-judge evaluations expose individual rubric label/value pairs and written responses, with no judge name or identifier. Guest and incomplete evaluation content is excluded. Guest completion still contributes to scheduler-compatible appointment status. Later judge edits appear on subsequent reads.

The shared SDK query polls every 120 seconds and discards inactive itinerary cache entries. KHIX additionally schedules a final server request after the next appointment end. The server reconciles expired judging drafts before calculating status; the browser never declares a miss from its clock alone. Errors hide stale itinerary content and offer retry. An authoritative own-project query tracks publication mode, so disabling emergency restores the personal query without a reload.

Missed appointment dialog: “You missed your judging appointment. Expect a message from an organizer. You must respond to avoid disqualification across all challenges.” Dismissal acknowledges the current page's appointment attempt; the persistent warning stays. No rescheduling offer, automated message, invented deadline, or automatic disqualification.

## Email and officer controls

Reuse the existing email provider and send after database commit. Delivery failures retain the reserved slot and unused credential for retry. Bulk delivery skips already-sent or consumed links; individual delivery retries the same unused link. Each request delivers at most five messages concurrently and audits its results. The Blade action continues through bounded requests, reports progress, and continues past recipient failures using a per-run member cursor. A new run retries unsent recipients. Transactional sends and their template lookups abort after ten seconds per HTTP request.

Use a branded HTML email with a generic Knight Hacks hackathon header, project card, primary claim button, check-in/single-use explanation, and judging publication guidance. Imported text and URLs are escaped. The per-event configured claim URL allows HTTPS or local development HTTP and excludes credentials, query strings, and fragments.

Command Center provides publication settings, emergency search, explicit bulk-send confirmation, recipient search, individual resend/copy, and linked Discord contacts. Contacts retain imported email and expose available stable Discord ID and profile handle to authorized officers only.

## Frontend and validation

Follow Blade's existing components/tokens and KHIX's portal shell/CSS variables. The domain-specific presentation is a chronological project itinerary with destination and challenge details. Member selection is direct, with no second confirmation step. Use KHIX portal dialog overrides for invite, missed, and per-challenge feedback. Completed appointment cards open feedback dialogs. Unscheduled challenges use the same itinerary card layout, with "When you have time - unscheduled" in the time area. Remove decorative eyebrow headings; give the persistent missed warning a solid red background and bottom spacing. Keep text alongside status colors, accessible labels, and mobile stacking.

Database integration checks cover check-in, event isolation, single-use consumption, arbitrary member selection, recovery, capacity, concurrent claims, import protection, and anonymous completed feedback. Shared contract tests pin SDK procedures and malformed input handling. Browser checks exercise real local API/database-backed flows on desktop and mobile, including mode restoration and dialogs. Email is checked after actual delivery in Zoho.

Apply the additive migration before deploying API/consumers. Roll back clients without dropping claim records or the permanent import lock. No dependency or environment-variable additions. Mistaken-claim correction and invitation cancellation are outside this slice.

Published emergency mode bypasses the email-delivery navigation lock so a total provider outage cannot disable the fallback. Check-in and schedule publication remain required.
