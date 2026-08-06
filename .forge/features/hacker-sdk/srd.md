# Hacker SDK SRD

Status: Approved

## Technical purpose

Add a versioned participant platform boundary for Forge-hosted React hackathon
sites. Blade remains the only process that can reach participant data, Better
Auth, storage, email, Discord, Google Calendar, and operational audit systems.
Yearly sites use a same-origin adapter and a headless SDK instead of mounting
Forge's backend packages.

This feature also changes Hackathon Event projection from always-on inline
synchronization to per-hack, per-provider desired state with durable
reconciliation. External calendar health must not control whether a Forge event
can be checked into or read through the checked-in participant schedule.

## Relevant principles

- Follow [Forge Engineering Principles](../../../docs/agentic-development/forge-engineering-principles.md),
  especially package boundaries, tRPC, server-authoritative access, database
  ownership, configurability, and testing.
- Follow `.claude/skills/forge-api/SKILL.md` for participant and publication
  procedures, audit coverage, transactions, DTOs, and external side effects.
- Follow `.claude/skills/forge-placement/SKILL.md`. The SDK is a justified new
  package because KH IX and Bloom are independent consumers of a stable
  cross-app contract.
- Follow `.claude/skills/forge-react/SKILL.md` and the Blade design system for
  the admin controls. Hooks own reusable server-state orchestration; they do not
  own form steps, dialogs, theme copy, animation, or layout.
- Preserve explicit hack scope, configured classes, orthogonal VIP, primary
  check-in ownership of `checkedin`, separate hacker points, and the club-event
  fence.

## Access policy

### Public portal scope

An enabled portal client may read only a participant-safe hackathon descriptor:
identity, application window, event dates, legal agreement definitions, support
links, and public capabilities. The portal client, not an input hackathon name,
selects the hackathon.

### Authenticated participant scope

A valid portal session may read and mutate only the signed-in user's canonical
profile and application for the portal-bound hackathon.

- Profile/application editing requires the hackathon not to have started and an
  active editable status.
- Resume access and participant lifecycle actions require ownership.
- QR access requires `confirmed` or `checkedin`.
- Leaderboard access requires `confirmed` or `checkedin`.
- Schedule/timeline access requires `checkedin`.
- Personal attendance and points never expose another hacker's private data.
- No participant procedure returns blacklist state, internal notes, status-mail
  health, operator identifiers, raw storage object names, audit details, or
  Discord/Google projection details.

Every participant procedure checks portal and user scope on the server. Client
capabilities are presentation hints, not authorization.

### Officer scope

- Publication health reads require `READ_HACK_EVENT` or `EDIT_HACK_EVENT` via
  `requireHackathonEventRead`.
- Provider enablement, disablement, manual retry, and Discord ambiguity repair
  require `EDIT_HACK_EVENT` via `requireHackathonEventEdit`.
- `CHECKIN_HACK_EVENT` alone does not grant event edits or publication changes.
- Portal provisioning and agreement/capacity configuration use the existing
  hackathon configuration authority.

Every permission-aware mutation writes an admin audit event and is declared in
the audit coverage catalog.

## Architecture / data flow

### Package ownership

- `packages/hacker-sdk` owns the versioned participant contract, explicit DTO
  types, stable domain error parsing, pure lifecycle/capability helpers, the
  React provider/hooks, and the opinionated Next.js adapter.
- `@forge/hacker-sdk` must not depend on `@forge/api`, `@forge/db`,
  `@forge/auth`, storage, Discord, Google, or email.
- `@forge/hacker-sdk/contracts` exposes the `v1` tRPC contract and DTOs.
- `@forge/hacker-sdk/react` exposes the provider and focused hooks.
- `@forge/hacker-sdk/next` exposes one catch-all Next route handler factory for
  sign-in, callback, sign-out, participant tRPC proxying, and resume transfer.
- `@forge/validators` owns shared runtime schemas for application/profile
  input, lifecycle commands, agreement acceptance, auth protocol payloads, and
  participant DTO validation.
- `@forge/api` owns participant queries, lifecycle workflows, idempotency,
  profile revision propagation, leaderboard computation, and event publication
  reconciliation.
- `@forge/auth` owns authorization-code, PKCE, and portal-session token helpers.
- `@forge/db` owns only schemas, relations, migrations, and the client.
- Blade hosts protocol routes and officer UI. Cron invokes the API-owned
  reconciliation and auth-cleanup workers.

The dependency direction is `apps -> hacker-sdk -> validators` and
`api -> hacker-sdk contracts + validators`. The SDK never imports the complete
admin router.

### Versioned participant transport

Blade mounts a narrow participant router at `/api/hacker/v1/trpc`. The yearly
site's catch-all adapter exposes a same-origin `/api/hacker-sdk/*` surface and
forwards the opaque portal session server-to-server. Browser code never receives
the portal token and never calls Blade cross-origin.

The network contract uses explicit DTO schemas and ISO-8601 strings. It does
not expose Drizzle row types. The `v1` endpoint permits backward-compatible
optional additions. Renames, removals, changed meaning, or newly required fields
require a `v2` contract.

Private responses set `Cache-Control: private, no-store`. The adapter validates
same-origin mutation requests and forwards only expected methods, headers, and
content types.

### Authentication handoff

The portal uses an OAuth public-client-style flow without a client secret:

1. Blade provisions one enabled portal client for a hackathon with a public
   client ID and exact production origin.
2. The Next adapter creates a random state value and PKCE verifier in
   short-lived host-only, HttpOnly, SameSite=Lax cookies.
3. Blade validates the client and callback. If the browser lacks a Better Auth
   session, Blade performs Discord sign-in and returns to the authorization
   request.
4. Blade issues a hashed, one-use, short-lived authorization code bound to the
   user, Better Auth session, portal client, hackathon, redirect URI, and PKCE
   challenge.
5. The adapter exchanges the code server-to-server, verifies state, and stores
   opaque access and refresh tokens in host-only HttpOnly cookies.
6. The adapter forwards the access token to the participant API. On one
   `SESSION_EXPIRED` response it refreshes and retries once. A second failure
   clears both cookies and returns the stable auth error without redirecting in
   a loop.
7. Sign-out revokes the portal session and clears both site cookies.

Production accepts only the exact registered HTTPS origin under
`*.knighthacks.org`. Development accepts `http://localhost` and IP loopback
origins on any port only when Blade itself runs in development. Callback paths
remain relative to that validated origin. State, PKCE, one-use consumption,
expiry, and audience binding prevent callback substitution and code replay.

Portal sessions store token hashes, never plaintext. They reference the Better
Auth session so central revocation invalidates the derived portal session. Cron
removes expired codes and sessions.

### Reusable profile and per-hack snapshot

`HackerProfile` is the canonical reusable profile and is unique by `userId`.
`HackerProfileRevision` stores immutable sponsor-visible revisions without a
copied age. `HackerAttendee` references the canonical profile and the revision
used by that hackathon.

Legacy `Hacker` rows remain during mixed-version operation because production
`main` still writes and reads per-application rows. New SDK application writes
also create or update the compatibility `Hacker` snapshot required by current
officer screens. No unique constraint is added to `Hacker.userId` in this slice.

A participant profile edit runs in one transaction:

1. Lock the canonical profile and compare the expected revision.
2. Use database time to confirm the requesting hackathon has not started.
3. Insert an immutable revision and update the canonical profile.
4. Move every application whose hackathon has not started to the new revision.
5. Update those applications' compatibility `Hacker` snapshots.
6. Leave started hackathons pinned to their prior revision and legacy row.

First-time status, survey answers, agreement acceptance, marketing consent,
status, confirmation, class, VIP, check-in, and points remain per hackathon. The
SDK never prefills first-time status. Age is derived from revision DOB at the
relevant server timestamp.

### Event publication

`HackathonEventPublication` stores one row per hackathon and provider:
`discord | google`, desired enabled state, a monotonic configuration revision,
request actor/time, and reconciliation timestamps.

`EventPublicationWork` stores durable work per event/provider with the target
enabled state, event revision, publication revision, state, attempt count,
next-attempt time, safe last error, and lease. The existing Event projection
columns remain the provider identity/fencing record. Projection state adds
`disabled`, meaning the configured provider is intentionally absent.

The toggle request commits desired state and work rows in one transaction, then
returns current aggregate health. It never loops through provider calls inside
the HTTP request. A bounded cron worker claims due work, reacquires the existing
event/provider fences, re-reads current event and publication revisions, calls
one provider outside the transaction, and persists the result only if both
revisions still match.

Definite retryable failures use capped exponential backoff with jitter. Manual
retry requeues safe failed work immediately. An ambiguous Discord mutation is
`blocked` and never recreated automatically. Existing candidate-link and
confirm-absent repair resolves it. Google may recover by private identity.

Desired off plus no remote projection is healthy and converged. Desired on plus
a current applied projection is healthy and converged. Aggregate health is one
of `off`, `removing`, `on`, `publishing`, `degraded`, or `blocked`, with counts
for converged, pending, error, and unknown work.

Forge event readiness is independent of projection health. Hackathon check-in,
the checked-in SDK schedule, attendance, and point rules use the database event
even when both providers are off or degraded. Club event behavior remains
unchanged.

## tRPC/API behavior

### Participant `v1` contract

The isolated participant router exposes:

- `getPublicHackathon`
- `getSession`
- `getApplicationContext`
- `submitApplication`
- `updateProfile`
- `updateApplication`
- `getDashboard`
- `confirmAttendance`
- `withdrawApplication`
- `getCheckInPass`
- `getSchedule`
- `getMyAttendance`
- `getMyPoints`
- `getLeaderboard`
- `getResume`
- `removeResume`

Multipart resume upload/download use the Blade protocol route because binary
transfer is not a tRPC business payload. API-owned functions enforce participant
scope, PDF signature/type/size, storage ownership, profile revision changes,
and audit behavior before the route writes or returns data.

Every mutation accepts an idempotency key. Command records bind user,
hackathon, operation, key, and payload hash. Repeating the same command returns
the recorded result; reusing a key with different input returns `CONFLICT`.
Database uniqueness remains the final application-duplication barrier.

Stable domain failures include `code`, `requestId`, `retryable`, and optional
field issues. Required codes include unauthenticated/session expiry, forbidden
status, application closed, application locked, duplicate application, stale
profile revision, confirmation closed, capacity reached, invalid agreement,
invalid resume, and idempotency conflict.

### Lifecycle rules

- Application submission is allowed only inside the configured application
  window. It atomically creates/updates the reusable profile, immutable revision,
  compatibility Hacker snapshot, attendee, per-hack answers, agreement records,
  audit event, and notification enqueue.
- A unique `(profileId, hackathonId)` constraint prevents duplicate
  applications under concurrency.
- Profile/application edits are allowed before hack start for active statuses.
  Denied, withdrawn, and checked-in applications are read-only to the hacker.
- Confirmation locks the hackathon/application, requires `accepted`, checks the
  confirmation deadline, configured capacity, and current confirmation
  agreement, then sets `confirmed`, timestamps it, and queues status mail in one
  transaction.
- Pending, waitlisted, accepted, and confirmed applications may withdraw before
  start. The input requires the exported irreversible acknowledgement literal.
  A successful withdrawal is terminal for participant self-service and revokes
  the QR pass. Exact network retries return the same result.
- Denied, withdrawn, checked-in, and post-start applications cannot withdraw.
- Only primary check-in can write `checkedin`.

### Dashboard and event reads

- Dashboard returns status, safe timestamps, class/VIP, derived age/minor flag,
  allowed actions with stable reason codes, resume metadata, and check-in state.
- QR is a versioned opaque hackathon-scoped pass. Scanner resolution accepts the
  new pass and retains temporary legacy UUID support. It always rechecks the
  selected hackathon and confirmed/checked-in eligibility.
- Schedule returns safe Hackathon Event identity, name, description, tag,
  location, start/end, purpose, and points in chronological order only after
  whole-hack check-in.
- Attendance returns only the current hacker's active occurrence history.
  Repeats may appear with zero awarded points; void/operator repair details do
  not.
- Points and leaderboard totals derive from active initial Hackathon Event award
  occurrences. Club points, repeats, voided attendance, and unrelated manual
  totals do not contribute.
- Leaderboards use competition ranking, overall and configured-class scopes,
  first name plus last initial, and a current-user marker. VIP remains in its
  assigned class. Confirmed viewers without check-in/class may view but are
  returned as unranked.

### Officer publication procedures

Add to `hackathonEvent`:

- `getPublicationHealth`
- `setPublicationDesiredState`
- `retryPublication`

The set mutation includes provider, desired state, expected publication
revision, and the confirmation's expected remote count when disabling. A stale
count/revision returns `CONFLICT` so the UI refreshes before asking again.

Event create/edit/duplicate/delete enqueue or refresh work for both provider
rows according to current desired state. Disabled providers make no external
create/update call. Event deletion retains deletion intent until any known
remote projections are absent, regardless of current toggle state.

Hackathon display-name edits revalidate Discord payload limits and enqueue
Discord work for all hack events because the display name is part of every
Discord description.

## Validation

- Add `@forge/validators/hacker-portal` schemas for all participant inputs and
  DTOs. Shared profile fields use one schema so application and edit rules
  cannot diverge.
- Date of birth and graduation date are date-only values. Age calculations have
  leap-day and exact-birthday coverage and use the relevant configured timezone.
- Required agreement versions come from active database definitions, never a
  client constant.
- Withdrawal accepts one exported acknowledgement literal. The server treats it
  as an explicit destructive command, not proof of UI rendering.
- Resume validation retains the existing PDF signature and 5,000,000-byte
  policy without base64 expansion.
- Provider title/description/location limits remain enforced on create/edit
  while publication is off and when a hackathon display name changes.
- Portal DTO schemas strip or reject unknown internal fields at the boundary.

## Data / migration / compatibility

### New data

- `HackerProfile`
- `HackerProfileRevision`
- attendee references to profile and revision
- attendee-scoped fixed application answers where legacy `Hacker` mixed them
- `HackathonAgreementDefinition`
- `HackerAgreementAcceptance`
- participant command/idempotency records
- opaque check-in pass identity
- configurable hacker confirmation capacity
- `HackathonPortalClient`
- portal authorization codes and portal sessions
- `HackathonEventPublication`
- `EventPublicationWork`
- provider state `disabled` and required retry/health indexes

### Expand/backfill/switch sequence

1. Add new tables, enum values, and nullable references without dropping legacy
   columns or endpoints.
2. Preflight duplicate applications by `(Hacker.userId, hackathonId)`, orphan
   attendees, and missing users. Abort with actionable rows; never choose a
   duplicate winner silently.
3. Create one canonical profile per user. Create an immutable revision for each
   legacy Hacker row and attach each attendee to the revision that represents
   its application. Select the latest legacy profile as current while preserving
   every historical revision.
4. Backfill first-time from the attendee snapshot already introduced by
   Hackathon Events. Do not restore it from mutable Hacker profile state.
5. Preserve legacy agreement provenance. Existing MLH booleans may be marked
   `legacy_unversioned`; missing server evidence remains unknown rather than
   fabricating an acceptance.
6. Backfill both publication providers enabled for hackathons containing
   nonlegacy Hackathon Events, preserving the prior always-publish intent.
   Hackathons without those events and all newly created hackathons start off.
   Existing remote IDs and applied revisions remain untouched.
7. Deploy participant auth, v1 reads, event writers, and the worker before
   exposing portal or publication UI.
8. Provision KH IX and Bloom clients, migrate both consumers, then expose
   publication controls.
9. Keep legacy Hacker columns and the old participant surface through the
   proving window. Destructive contract cleanup belongs to a later cutover.

Rollback is safe before publication toggles are exposed. After a provider has
been disabled, an old Reforge binary would republish on event edit. At that
point use a forward fix, or freeze event writes and intentionally re-enable and
reconcile before rolling back. Down migrations must never discard desired
state, projection IDs, profile revisions, agreement evidence, or auth history.

The separate hack-analytics worktree is expected to conflict around
Hacker/HackerAttendee reads. Integration must preserve revision-backed
historical data and the analytics branch's behavior rather than choosing one
side mechanically.

## Discord integration

- Forge owns Discord Scheduled Event publication. Yearly sites have no Discord
  credentials or scheduled-event code.
- Enabling Discord enqueues every hack event, including primary check-in.
- Disabling deletes every known Discord projection and leaves Forge events.
- Ambiguous creates/deletes remain blocked until candidate review proves the
  projection or an officer confirms absence.
- Hack event announcement reminders remain separate from Scheduled Event
  publication. The configured channel and hackathon role still receive the
  reminder when publication is off; the message is built from the database and
  omits the Scheduled Event link.
- Primary check-in remains excluded from reminder announcements.
- The normal Club reminder selector never reads hackathon events.
- Reminder sends retain their current at-most-once/unknown quarantine rules.

## Configurability review

Would this require a developer change next year?

- A new themed React site requires frontend code by design.
- Routine hackathon setup does not require platform code changes. Blade owns
  dates, capacity, portal origin/client provisioning, agreement versions,
  application URL, event tags, events, class/VIP configuration, roles, reminder
  channel, and provider publication state.
- Custom application questions remain the approved exception for this slice.
  The contract reserves no required renderer behavior, and a later feature may
  add revisioned question definitions and answers without changing base profile
  fields.

## React / frontend constraints

### SDK

- `HackerSdkProvider` owns the participant client and TanStack Query client.
- Focused hooks expose server state and mutations. They do not prescribe form
  steps, components, CSS, theme assets, copy, modal state, or animation.
- Hooks use stable portal-scoped query keys and invalidate only related data.
- Mutation results expose pending/success/error state and stable domain errors.
- Server helpers support initial reads without putting hooks in Next pages.
- The SDK includes documentation and two small themed test consumers proving
  that identical primitives can render different markup.

### Blade publication UI

- Keep the Hackathon Events page server-first. Add a client component to the
  existing selected-hack action row, beside the selector/create/feedback
  actions, without another card.
- Use existing Blade Switch, Badge, Dialog, Button, Popover, and toast patterns.
- Switch checked state shows requested state. Adjacent text shows `Off`,
  `Removing x/y`, `On`, `Publishing x/y`, `Degraded`, or `Blocked`; color is not
  the only signal.
- Disabling opens a confirmation dialog naming the hackathon, provider, and
  current remote projection count. A stale confirmation refreshes rather than
  applying silently.
- A compact detail surface lists failed/blocked events, safe error text, next
  retry, and an accessible Retry action.
- Poll while work is pending, then stop. Use mutation `isPending`, toasts,
  server refresh or query invalidation according to the data source, and focus
  restoration after dialogs.
- Verify 1440px desktop and 320px mobile with a long hackathon name, partial
  failure states, and at least 60 events. Controls keep 44px mobile targets and
  create no document-level overflow.

KH IX and Bloom migration must preserve their themed presentation. The SDK
replaces data/auth plumbing, not their pixels.

## Testing / verification strategy

- `packages/hacker-sdk`: Vitest contract, error, client, query-key, lifecycle
  helper, hook/provider, and two-renderer tests.
- `packages/validators`: Vitest application/profile, agreement, withdrawal,
  date/age, resume metadata, auth protocol, and DTO leakage tests.
- `packages/auth`: Vitest/integration PKCE, state, exact-origin, loopback,
  code-use, token hashing/expiry/rotation, revocation, and cleanup tests.
- `packages/api`: integration tests for portal scope, application concurrency,
  revisions, lifecycle, capacity, QR, resume, schedule, attendance, points,
  leaderboard privacy, audit, and notification transactions.
- Event orchestration tests use fake gateways for enable/disable, races,
  backoff, fencing, unknown outcomes, reminders without projection links, and
  operational readiness while providers are off.
- `packages/db`: migration preflight/backfill and schema invariant validation.
- Blade Vitest/Playwright: access, compact controls, confirmation, pending and
  degraded states, keyboard behavior, and desktop/mobile visual QA.
- Run targeted package tests while implementing, then `pnpm
verify:precommit`, relevant E2E, `pnpm verify:push`, and `pnpm build` before
  Forge Review.
- Forge Review uses the deep tier because the diff touches auth, migrations,
  uploads, public contracts, cron, API access, and UI.

## Open questions

None. Three independent Forge-skilled architecture passes completed on
2026-08-06. Their two-to-one reminder decision and unanimous auth/profile/package
recommendations are recorded above under the owner's delegated approval.
