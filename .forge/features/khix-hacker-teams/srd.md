# KHIX Hacker Teams SRD

Status: Approved behavior; implementation decisions recorded from existing architecture

## Scope and ownership

KHIX and Blade are clients. Shared validators and portal DTOs live in @forge/validators; participant hooks/contracts in @forge/hacker-sdk; queries, mutations, authorization, and class allocation in @forge/api. @forge/db owns schema and generated migration only. Reuse the configured hackathon/class records, so future hackathons do not require hard-coded class changes.

## Persistence and lifecycle

Add a hackathon-scoped team with name, together preference, frozen timestamp, and persistent selected class. Add membership/request rows keyed by attendee, with pending/member/owner state. Composite foreign keys enforce matching hackathons; one owner index prevents duplicate owners. Mutations enforce four accepted members, one membership/request, and owner succession. Remove application memberships through the same departure rules before application deletion and when organizer status changes revoke confirmed/checked-in eligibility. The attendee FK uses NO ACTION to prevent account cascades from orphaning teams; account deletion requires leaving teams and cancelling requests first.

## Consistency and access

Serialize membership changes and primary check-in with the existing per-hackathon allocation advisory lock, acquired before attendee locks. Read participant identity from the authenticated portal session, never client-supplied actor IDs. Require confirmed or checked-in status. Only confirmed, never-checked-in hackers may create/request/join unlocked teams. Leaving remains available after check-in. Freeze and selected class are durable even after departures.

Blade reads require explicit READ_HACKERS or EDIT_HACKERS; mutations require explicit EDIT_HACKERS. Do not grant an officer-only bypass. Owner and organizer actions use shared workflows. Audit mutations using the existing audit service and declare router coverage.

## API and UI

Add typed participant team read/action contracts and an organizer team router. Keep reads paginated and search escaped. Participant DTOs expose names and class/check-in state, not emails or Discord identifiers. Owners see requests; other users do not. Use existing mutation feedback, confirmation dialogs, Blade tokens, and KHIX forest styling. Page files stay server components.

## Check-in and Discord

Choose the least-populated eligible ordinary class. Together follows stored class; separate first minimizes teammate occupancy, then total checked-in occupancy. Persist team freeze/class inside the same check-in transaction. Existing check-in role delivery uses the selected class; no new external call or role type. Legacy bulk status check-in rejects attendees with team memberships or pending requests and directs organizers to Hackathon Check-in.

## Rollout and verification

Generate an additive migration, apply to disposable local PostgreSQL, classify new tables for sanitized backups, and update migration lineage expectations. Apply migrations before deploying API/UI. No production data changes or deployments in this task. Verify API, SDK, validators, DB, Blade, and KHIX consumers; run static gate, builds, concurrency and access tests, and real desktop/mobile browser checks. Attach screenshots to the PR, never commit images.
