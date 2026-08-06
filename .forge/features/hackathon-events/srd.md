# Hackathon Events SRD

Status: Draft after owner approval; awaiting adversarial reconciliation

> This file owns technical implementation constraints for the approved
> Hackathon Events product spec.

## Technical purpose

Add a hackathon-scoped event capability on the shared Event model without
weakening any Club-event fence. The capability owns event administration,
provider projection, reminders, whole-hack admission, ordinary event
attendance, points, class/VIP handling, Discord role repair, operational
history, and per-hack first-time-hacker snapshots.

The implementation must support multiple check-in stations concurrently,
preserve existing hackathon events for later analytics, and remove every
year-specific class, role, channel, and reminder constant from the active
workflow.

## Relevant principles

This feature follows:

- [Product and architecture philosophy](../../../docs/agentic-development/forge-engineering-principles.md#productarchitecture-philosophy)
- [Sharing and package boundaries](../../../docs/agentic-development/forge-engineering-principles.md#sharing-and-package-boundaries)
- [tRPC and API principles](../../../docs/agentic-development/forge-engineering-principles.md#trpc-and-api-principles)
- [Database principles](../../../docs/agentic-development/forge-engineering-principles.md#database-principles)
- [Auth, Discord, and permission principles](../../../docs/agentic-development/forge-engineering-principles.md#auth-discord-and-permission-principles)
- [Configurability principles](../../../docs/agentic-development/forge-engineering-principles.md#configurability-principles)
- [React and Next.js principles](../../../docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles)
- [Testing principles](../../../docs/agentic-development/forge-engineering-principles.md#testing-principles)

The current Event provider orchestration and Club attendance workflow are the
starting implementation patterns. Legacy hackathon code supplies behavioral
evidence only; its tag convention, client-supplied points, fixed classes,
hard-coded webhook/role, and one-day timestamp workaround are forbidden.

## Access policy

Access remains capability-based and server-enforced. Client navigation and
hidden controls are UX only.

### Unauthenticated

- No hackathon event administration, check-in, history, configuration,
  attendance, first-time status, or reminder capability is public.
- Existing public Club event procedures continue excluding every Event with a
  non-null `hackathonId`.

### Logged-in without hack-event permission

- No hackathon event administrative data is returned.
- Direct event, hackathon, attendee, attempt, attendance, or repair identifiers
  return the same safe not-found/forbidden behavior as list navigation.
- Hacker-facing QR retrieval remains outside this slice and belongs to the
  future dashboard SDK.

### Permission-aware access

- `READ_HACK_EVENT` or `EDIT_HACK_EVENT` permits hackathon event lists,
  calendar, detail, integration health, minimal attendance, history without
  DOB, and CSV export.
- `EDIT_HACK_EVENT` permits event/tag mutation, provider retry/repair,
  attendance correction for ordinary events, and provider-safe deletion.
- `CHECKIN_HACK_EVENT` permits the dedicated check-in route, minimal hacker
  search, QR/manual attempts, DOB-bearing results, shared recent attempt
  history, and Discord role retry.
- Officers bypass each capability check.
- General hacker role, announcement channel, class, and VIP configuration stay
  officer-only with the existing hackathon configuration surface.
- Existing hacker management remains officer-only. Its first-time badge/filter
  and event panel do not broaden `READ_HACKERS` or add a second access path.

The admin layout and both pages must have matching server gates. A volunteer
holding only `CHECKIN_HACK_EVENT` sees and enters Hackathon Check-in but cannot
enter Hackathon Events or receive event-management payloads. A reader/editor
without check-in permission cannot receive DOB-bearing check-in results.

## Architecture / data flow

### Package ownership

- `@forge/db` owns additive schema, constraints, relations, migrations,
  preflight checks, and generated types. It owns no product query or Discord
  call.
- `@forge/validators` owns reusable hackathon-event, station, check-in, history,
  reminder/config, first-time filter, and repair contracts.
- `@forge/api` owns the `hackathonEvent` router, access helpers, transactions,
  provider scope adapters, reminder selection/delivery planning, Discord role
  workflows, CSV, and audits.
- `apps/blade` owns thin server pages, route gates, navigation, forms, scanner
  composition, persistent result/history UI, and the hacker-panel presentation.
- `apps/cron` invokes a server-side `@forge/api` hackathon-reminder capability.
  It does not query Event directly or contain role/channel constants.
- Existing scope-neutral provider gateways remain in `@forge/api`. No new
  package is created.

### Shared Event model with explicit scope

- Event remains the common provider-projected schedule record.
- Add an explicit nullable hackathon event purpose with values `event` and
  `primary_check_in`.
- Club events have `hackathonId = null` and no hackathon purpose.
- New hackathon events require `hackathonId` and a purpose.
- Backfill existing hackathon events to `event`; do not infer purpose from tag,
  name, description, or location.
- A partial unique database index permits at most one `primary_check_in` Event
  per hackathon.
- Club procedures retain `assertClubEvent` and every query-level
  `hackathonId IS NULL` condition.
- Add a separate `hackathonEvent` router and explicit hack-scope assertions.
  Hack procedures never call a Club procedure by suppressing or bypassing its
  scope guard.
- Refactor provider orchestration only below the scope-policy boundary. The
  Club adapter must continue asserting Club scope on every load; the hack
  adapter asserts the requested hackathon on every load and write.
- Hack event creation does not provision Club feedback and never encodes Club
  dues/selected-role audience policy. Hackers are the audience; station class
  gates are check-in inputs, not Event visibility fields.

### Event and check-in flow

1. An editor creates or updates a hackathon Event through the hack-scoped
   router. Blade reserves the Event revision and provider state transactionally.
2. Discord/Google calls run after the reservation transaction through the
   existing gateways. Scope-specific orchestration records success, ambiguous
   state, or repairable failure.
3. A check-in operator loads only selectable hackathons, events, classes, and
   minimal station data.
4. Check-in validates the event, attendee, status, called class, repeat policy,
   and configuration on the server. Browser-supplied points and hackathon scope
   are never trusted.
5. The database transaction locks the attendee and, for primary admission, a
   per-hackathon allocation lock. It records status/class/points, attendance,
   the attempt result, expected Discord grants, and audit state atomically.
6. Discord role calls run after commit. Their durable rows transition to synced
   or error and the returned attempt shows the resulting role health.
7. Reopening history reads the stored attempt/result facts. It never replays a
   scan or awards points.

## Data model

### Hackathon and Event configuration

Add to `Hackathon`:

- nullable `generalHackerRoleId` as a validated 17-20 digit Discord snowflake;
- nullable `eventAnnouncementChannelId` as a validated 17-20 digit Discord
  snowflake.

Officers choose both through live configured-guild lookup with manual ID
fallback matching existing Discord selection patterns. The stored value is a
channel/role ID, not a webhook URL. Discord credentials remain deployment
secrets.

Add to `Event`:

- non-null `purpose` using a database enum `event | primary_check_in`, default
  `event` for compatibility with existing Club, Legacy, and hackathon rows.

Database constraints require:

- `primary_check_in` requires hackathon scope;
- at most one primary event per hackathon; and
- non-legacy hackathon events have non-negative resolved points and the same
  provider creation/sync invariants as non-legacy Club events.

Add nullable `EventTag.hackathonId`. Club tags remain null-scoped; hackathon
tags belong to exactly one hackathon. Name uniqueness is partial per Club scope
and scoped per hackathon. Hack editors cannot view or mutate Club or another
hackathon's tag catalog. Event tag, color, and points remain immutable snapshots
for attendance history.

### Whole-hack attendee state

Add to `HackerAttendee`:

- nullable timezone-aware `checkedInAt`;
- nullable `checkedInBy` User reference with `ON DELETE SET NULL`;
- nullable boolean `isFirstTime` with no database default.

`status = checkedin` remains the admission state. New primary admission writes
status, timestamp, operator, class, points, and attendance in one transaction.
Nullable check-in metadata is retained for Legacy compatibility only.

`isFirstTime` means the applicant's answer for this hackathon to whether this
is their first hackathon anywhere. It is not derived from Knight Hacks history.

### Hackathon event attendance occurrences

Extend `HackerEventAttendee` with:

- timezone-aware nullable `checkedInAt`;
- nullable `checkedInBy` User reference;
- nullable `pointsAwarded`;
- nullable `isInitialAttendance` (`null` means Legacy/unknown);
- nullable soft-correction fields `voidedAt`, `voidedBy`, and `voidReason`.

Add indexes in both `(eventId, hackerAttId)` and `(hackerAttId, eventId)` order.
Do not add blanket uniqueness on attendee/event because approved scanner repeat
mode creates multiple occurrences. Add a partial unique index for one active
`isInitialAttendance = true` occurrence per attendee/event. New first
occurrences snapshot Event points; later occurrences snapshot zero.

Enforce cross-hack integrity with composite candidate keys/references or an
equivalent database constraint: attendance.hackathonId must match both the
selected Event and HackerAttendee. API validation alone is insufficient.

### Check-in attempt history

Add `HackerCheckInAttempt` for every resolved primary or ordinary attempt:

- UUID, hackathon, event, operator, and timezone-aware attempt time;
- nullable resolved HackerAttendee and created attendance occurrence, with the
  attempt owning this one-way optional reference after occurrence insertion;
- source `scanner | manual`;
- outcome enum covering success, repeat success, already attended, malformed,
  unknown hacker, wrong status, not admitted, and wrong class;
- nullable called class plus request-scoped repeat flag;
- resolved class ID/name/color snapshot, VIP snapshot, points awarded, and
  `minorAtCheckIn` snapshot when identity resolved;
- aggregate role state `not_applicable | pending | synced | error`;
- no QR payload, DOB snapshot, email, phone, Discord handle, or raw provider
  error.

Successful attempts are durable operational/audit history. Failed or rejected
attempts are deleted after 30 days by a bounded cleanup capability. History
queries are cursor-paginated, newest first, and scoped to a permitted hackathon.

### Discord role delivery

Add one current logical `HackerDiscordRoleGrant` per attendee and role kind
`general | class | vip`. It stores the current desired role ID, delivery state,
attempt count, timestamps, safe error, and a short retry lease. Append
`HackerDiscordRoleGrantAttempt` for each outbound call with role/user snapshots,
actor, timing, outcome, and sanitized error.

The role table is an outbound-delivery ledger, not Blade permission state.
Repair recomputes the current expected general/class/VIP targets. A changed
configuration updates the logical target while its append-only attempts retain
the previously attempted role IDs. This slice does not revoke obsolete roles;
configuration readiness warns officers about that operational limitation.

### Reminder delivery

Add `HackathonEventReminderDelivery`:

- event and hackathon references;
- fixed window key `fifteen_minutes`;
- channel and mentioned role snapshots;
- state `pending | sent | error | unknown`;
- lease token/expiry, attempts, safe error, Discord message ID, and sent time.

Unique `(eventId, windowKey)` enforces one logical delivery even after Event
edits, cron restarts, or concurrent cron replicas. Destination, role, content,
and event-time snapshots freeze before the first provider attempt. An ambiguous
network/5xx result becomes `unknown` and is not automatically retried, avoiding
a duplicate ping when Discord may have accepted the message. Existing Club
reminder delivery and selection remain unchanged.

## Primary check-in transaction

Primary check-in accepts only a scanner/manual identity and event identifier.
It does not accept points, class assignment, role IDs, attendee status, or
hackathon scope from the client.

Inside one transaction:

1. Resolve and lock the Event and HackerAttendee; verify matching hackathon and
   primary purpose.
2. Return an idempotent already-admitted attempt when status is already
   checkedin. Preserve the original class, admission timestamp, and points.
3. Reject any first admission whose status is not confirmed.
4. Validate a configured general role and at least one normal class whose role
   ID is valid. A VIP attendee also requires a configured VIP entry.
5. Acquire one transaction-scoped advisory/allocation lock for the hackathon.
   Count checked-in attendees by configured normal class and choose the smallest
   count; break ties by stable class UUID order.
6. Compute age on the local calendar date in `America/New_York`; persist only
   the resulting `minorAtCheckIn` fact in attempt history.
7. Set status, checked-in metadata, and class. Insert the primary attendance
   occurrence and add the Event point snapshot to HackerAttendee points.
8. Create the successful attempt and expected general/class/VIP role grant rows.
9. Apply the first-time compatibility rule below.
10. Write the admin audit event without PII.

The per-hack allocation lock serializes class selection only for primary
admission. Ordinary event check-ins for the same hackathon do not wait on it.

After commit, attempt Discord role grants. Missing linked Discord identity or
partial provider failure does not roll back admission. Return
`checked_in` plus role health `error`; authorized check-in operators can retry.

There is no primary-admission undo in this slice.

Existing single and bulk hacker-status mutations must reject any transition
whose current status is `checkedin`. This closes the otherwise undeclared undo
path that would strand attendance, class, points, and roles.

## Ordinary event check-in transaction

- Verify hackathon/event scope and ordinary purpose.
- Require `HackerAttendee.status = checkedin`.
- `calledClassId = null` means All classes. A non-null class must be a normal
  class configured for the selected hackathon.
- Permit a matching assigned class or VIP. Wrong-class attempts create history
  but no attendance/points.
- Manual source always behaves with repeat disabled.
- Scanner repeat defaults false and is request-scoped. With repeat disabled,
  an existing attendance returns already attended and creates no occurrence.
- With repeat enabled, insert a new zero-point occurrence after the first.
- Lock the attendee/event attendance set before deciding whether the attempt is
  first, so concurrent stations cannot both award points.
- Add points and attendance/attempt history in one transaction. The client
  cannot influence the award.

Attendance correction is editor-only and allowed only for ordinary events. It
soft-voids an occurrence and subtracts that row's exact non-null stored award.
A legacy row with unknown award remains visible but uncorrectable. Removing a
zero-point repeat changes no total. If an editor targets the point-bearing first
occurrence while active repeats remain, the API refuses the single-row
correction until all occurrences are corrected; it never creates a new chance
to award points. Primary attendance cannot be removed by this flow.

## First-time-hacker compatibility

Long-term behavior:

- `HackerAttendee.isFirstTime` is canonical.
- Future dashboard SDK application intake requires a fresh explicit Yes/No
  answer for each hackathon and writes that attendee only.
- Application correction may update only that hackathon's attendee snapshot and
  must be audited.
- After dashboard cutover, remove profile fallback and later drop
  `Hacker.isFirstTime` in the documented cutover window.

Temporary bridge for pre-cutover attendees:

- API output exposes `firstTimeStatus = first | returning | unknown` and may
  include an internal source `attendee | legacy_profile | unrecorded`.
- Every Reforge read prefers `HackerAttendee.isFirstTime`. It falls back to the
  linked current profile only while the attendee value is null and the bridge
  remains active.
- On first successful primary admission, under the attendee lock, copy the
  current profile boolean only when the attendee snapshot is null.
- If the frozen snapshot is true, update only the linked/current Hacker profile
  to false for Legacy's future prefill. Never update all Hacker rows for the
  User and never restore the profile during a correction/failed role grant.
- Repeat primary scans never change either value.

Migration uses the already approved conservative history rule, partitioned by
stable User identity: for people whose most recent profile currently declares
true, mark the earliest known checked-in attendance true and later checked-in
attendances false; leave all other historical rows null. Do not interpret a
Legacy default false as an answered No.

Roster/detail/check-in presentation uses the API status. First gets the
prominent badge; Returning is explicit in detail; Unknown reads `Not recorded`.
The roster filter accepts `first | returning | unknown`; it never coalesces
unknown into returning. The check-in result shows the first-time badge as a
fact and adds no volunteer instruction copy.

## tRPC/API behavior

Add a separately registered `hackathonEvent` client namespace. Procedure names
must receive concise JSDoc or Zod `.describe()` metadata for future generated
API context. Update the API surface snapshot and audit coverage registry.

### Administrative reads

- `listAdminEvents`: hackathon-scoped list/calendar query with Club-parity
  filters, pagination, sort, and provider health.
- `getAdminEvent`: one event with explicit hackathon assertion.
- `listEventTags`: tags scoped to the selected hackathon.
- `listAttendees`: minimal per-event occurrence rows.
- `exportAttendance`: spreadsheet-safe event attendance CSV.
- `listDiscordRepairCandidates`: hack-scoped provider reconciliation.
- `listConfiguredChannels` and `listConfiguredRoles`: officer configuration
  lookup against the configured guild.

### Administrative mutations

- `createEvent`, `updateEvent`, `deleteEvent`.
- `retrySync`, `repairIntegration`, `resolveDiscordProjection`.
- `removeAttendance` for ordinary event occurrences only.
- Hack-scoped tag CRUD always predicates on the selected hackathon; hack access
  never implies Club or other-hack tag access.
- Hackathon configuration update accepts general role and announcement channel
  under officer access.

### Check-in reads and mutations

- `listCheckInHackathons`: minimal permitted hackathon choices.
- `listCheckInEvents`: minimal events/classes/config readiness for one
  hackathon.
- `searchCheckInHackers`: bounded name/Discord/email lookup returning minimal
  identity.
- `checkInHacker`: typed primary/ordinary attempt result.
- `listCheckInHistory`: cursor-paginated shared history; check-in callers receive
  DOB by joining the current hacker profile only for resolved permitted rows.
- `getCheckInAttempt`: reopen one complete permitted result.
- `retryDiscordRoles`: recompute and retry current expected grants.

### Internal cron capabilities

- `selectHackathonReminderCandidates(now)`: only non-legacy, published,
  non-deletion-pending ordinary hackathon events starting within the approved
  fifteen-minute window, with a current synced Discord projection.
- It excludes primary check-in events and never calls or broadens
  `selectClubReminderCandidates`.
- `planHackathonReminderDelivery`: atomically acquires the unique delivery/lease
  row and returns channel/role/event payload data.
- `completeHackathonReminderDelivery` and `failHackathonReminderDelivery`
  persist outcome without exposing credentials.
- `cleanupExpiredCheckInAttempts`: bounded removal of rejected/failed attempts
  older than 30 days.

Use standard `TRPCError` for authorization, invalid input, not-found, conflict,
and total failure. Check-in uses a typed result because rejected operational
outcomes are expected line states, not transport failures. Raw Discord/Google
payloads, webhook URLs, credentials, QR values, and stack traces are never
returned.

## Validation

Reusable `@forge/validators` contracts cover:

- hackathon UUID plus event UUID scope;
- event purpose and the one-primary invariant surfaced as a conflict;
- Club-parity event form fields, provider limits, DST/offset rules, tags,
  non-negative points, internal channel, creation key, and revisions;
- 17-20 digit general role and announcement channel IDs;
- station event, called normal class or All, source, and scanner-only repeat;
- raw UUID and `user:<UUID>` QR compatibility without retaining payloads;
- bounded manual hacker lookup;
- first-time filter `first | returning | unknown`;
- history cursor/page limits and attempt/attendance/repair IDs;
- role repair mode and safe output state;
- CSV-safe values.

The API revalidates Event/HackerAttendee/Class hackathon equality, event
purpose, class kind, attendee status, provider config, active tag, Discord
guild resources, first/repeat attendance, points, and role targets. UI
validation is never authoritative.

## Discord and Google integration

### Event projections

- Reuse the existing scope-neutral gateways and reconciliation engine through
  explicit Club and hack scope adapters.
- Non-internal hack events use Discord External plus the public Google Calendar.
- Internal hack events use an eligible configured-guild voice/stage channel
  plus the internal Google Calendar.
- Primary check-in receives normal Discord/Google projection and health/repair
  behavior but is excluded from the hack reminder selector.
- Provider identity, revision, lease, ambiguous-create, repair, replacement,
  safe-delete, and applied-destination behavior match the approved Club Event
  contract.
- No migration calls Discord or Google.

### Primary Discord roles

- Use the linked `User.discordUserId`; typed handles and avatars are not role
  identity.
- Expected roles are current general plus assigned class plus VIP when set.
- Calls run after database commit and are idempotent at the Discord boundary.
- Missing Discord identity, missing permissions, rate limits, and provider
  failures set ledger error and return safe role health. Admission remains
  successful.
- Retry is available to `CHECKIN_HACK_EVENT`, `EDIT_HACK_EVENT`, and officers.

### Reminder delivery

- Officers configure a Discord channel ID, not a webhook secret.
- The cron runtime uses the deployment-owned bot credential to send one message
  to that channel and mention the hackathon's configured general role.
- Validate at configuration/save and again at delivery that resources belong to
  the configured guild and the bot can use them.
- The message links the current Discord Scheduled Event and includes event time
  and location. It never pings `@everyone` or the Club reminder role.
- Durable delivery acquisition prevents duplicates across replicas and reruns.

## Data migration / compatibility

The migration is additive and preserves production-shaped data:

- Backfill all existing `Event.hackathonId IS NOT NULL` rows to purpose `event`.
- Do not designate a primary event from Legacy's `Check-in` tag. An editor
  creates/designates the explicit primary after deployment.
- Existing hack Events keep Legacy provider/timestamp treatment and remain
  available for later analytics.
- Existing HackerEventAttendee rows receive null time/operator/points/initial
  state. No award is guessed; these rows are visible and uncorrectable.
- Existing status checkedin attendees keep null overall timestamp/operator.
- Apply the conservative first-time backfill described above; retain the profile
  column and compatibility fallback through dashboard cutover.
- Add cross-hack constraints only after preflight reports and resolves any
  malformed production rows. Never silently delete or reassign them.
- Seed no year-specific role, channel, class, or primary Event.
- Perform no Discord role grants and send no reminders during migration.

Migration tests cover duplicate attendance, cross-hack mismatch, multiple
Legacy `Check-in` tags, checked-in rows without metadata, first-time profile
drift, existing provider IDs, and arbitrary class counts.

Rollout order:

1. additive schema/migration and preflight;
2. validators/API with nav/routes still unavailable;
3. Blade administration/check-in/hacker panels;
4. configure and validate each active hackathon's role/channel/classes/primary
   event;
5. enable the hack reminder schedule last.

Rollback disables routes and cron first. Additive columns/tables remain so
attendance, first-time snapshots, provider state, and analytics history are not
lost. Provider side effects are repaired operationally rather than reversed by
database rollback.

## Configurability review

Would this require a developer change next year?

- Creating a hackathon, choosing arbitrary classes, linking general/class/VIP
  roles, selecting the announcement channel, creating events, choosing the
  primary event, tags, points, provider destinations, and operating check-in do
  not require a developer.
- The fixed event purposes, one-primary rule, fifteen-minute reminder window,
  provider types, and 30-day rejected-attempt retention are product policy and
  intentionally require engineering to change.
- Discord/Google credentials and Google calendar IDs remain infrastructure
  configuration, not routine officer state.
- The future dashboard SDK will remove the temporary first-time profile bridge;
  no annual constant is introduced in the meantime.

## React / frontend constraints

- Add separate server-first pages `/admin/hackathon-events` and
  `/admin/hackathon-check-in`, each with independent auth, permission redirects,
  loading/error boundaries, metadata, and client roots.
- Hackathon Events receives only read/edit data. Hackathon Check-in receives
  only minimal hackathon/event/class/config choices and check-in capabilities.
- Add distinct Lucide icons and access keys to shared navigation. The desktop
  primary item container becomes `min-h-0 flex-1 overflow-y-auto`; Settings
  remains pinned/reachable. Preserve mobile drawer scrolling and 44px targets.
- Reuse Club event administration components by extracting stable scope-neutral
  Blade composition on the second consumer. Keep scope-specific API hooks and
  copy at the edge; do not clone the entire Event admin tree or add domain
  components to `@forge/ui`.
- Pages never carry `use client`. Server-read data flows into client roots as
  props. Client-fetched history uses query invalidation; RSC-prop mutation flows
  use `router.refresh()` inside a transition.
- Check-in station state is local to one mounted workspace: event, called class,
  scanner/manual mode, and allow repeat. Repeat resets off on page reload and is
  unavailable for Manual or primary check-in.
- Scanner prevents a stationary QR from firing repeatedly until it leaves the
  frame. Pending attempts disable conflicting station actions.
- Every resolved attempt opens an accessible result Dialog. It never
  auto-dismisses, returns focus to the scanner/manual trigger, supports keyboard
  close, and shows compact outcome treatment, class/color, VIP, name, DOB, and
  the minor warning. Points, first-time status, recorded time, operator, and role
  health remain outside this dialog by owner request.
- Shared history is cursor-paginated and can reopen the same Dialog. Error and
  empty states never discard the scanner workspace.
- Minor warning uses destructive/high-contrast treatment without animation-only
  meaning. No configurable routing copy is rendered.
- Complete the hacker detail event panel through the existing lazy detail read.
  Show separate repeat occurrences and legacy unknown fields honestly.
- Add the prominent first-time badge to roster rows and detail. Unknown is not
  rendered as Returning; the filter exposes all three states.
- Event/check-in list, dialogs, table, scanner, history, and navigation must be
  checked at desktop and 320px width against Blade's design system.

## Testing / verification strategy

- `@forge/db`: schema/migration/preflight tests for purpose uniqueness,
  cross-hack constraints, first-time backfill, Legacy preservation, and ledger
  indexes/checks.
- `@forge/validators`: event scope/purpose, config snowflakes, station inputs,
  QR/manual identity, repeat-source restriction, first-time tri-state, history,
  and repair contracts.
- `@forge/api` unit/integration: access matrix, direct-ID isolation, event CRUD,
  provider scope adapters, primary concurrency, class balance, status guards,
  first-time bridge, points idempotency, repeats/removal, attempt retention,
  role failure/repair, reminder selection/dedupe, CSV, and audit coverage.
- `apps/cron`: separate hack candidate/executor tests proving Club selectors stay
  unchanged, the configured role/channel are used, primary is excluded, and
  concurrent/rerun delivery is deduplicated.
- `apps/blade`: navigation visibility/scroll, route isolation, first-time
  badge/filter/detail, form purpose, station settings, persistent dialog,
  history reopen, minor warning, role error/retry, and hacker event panel.
- Playwright: officer event CRUD/provider-repair fake, check-in-only route
  isolation, concurrent-shaped primary workflow, ordinary class/All/repeat,
  manual idempotency, history recovery, and desktop/320px screenshots.

No test calls live Discord or Google. Provider and Discord-role gateways use
deterministic injected fakes.

Required completion commands:

```bash
pnpm db:generate
pnpm --filter=@forge/db test
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/cron test
pnpm --filter=@forge/blade test
pnpm analyze:react:changed
pnpm --filter=@forge/blade e2e
pnpm verify:precommit
pnpm verify:push
pnpm build
```

Database and provider commands are reported only when actually run.

## Open questions

- None. Remaining design disagreements are resolved by the three adversarial
  reviews authorized by the owner and recorded in `status.md` before code
  implementation.
