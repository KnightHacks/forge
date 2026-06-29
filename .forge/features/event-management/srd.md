# Event Management SRD

Status: Ready for human approval

> This file owns technical implementation constraints.

## Technical purpose

Add a club-event capability to `@forge/api` and thin clients in Blade, Club,
and the reminder worker. Blade owns event truth; Discord Scheduled Events and
Google Calendar are durable projections with explicit health, retry, repair,
and deletion semantics.

The same capability owns member event eligibility, QR/manual check-in,
attendance correction, point awards, attendance export, configurable event
tags, and compatibility with historical production event data.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: platform/API
  ownership, server-first React, tRPC, permission gates, Discord integration,
  configurability, validation, testing, and migration discipline.
- `docs/REPO-CONVENTIONS.md`: Blade composition, router registration, package
  boundaries, and server-only integration placement.
- `docs/DATABASE-USAGE.md`: `Event`, `EventAttendee`, `Member`, `DuesPayment`,
  `Roles`, and `Permissions` semantics.
- `apps/blade/DESIGN_SYSTEM.md`: authenticated shell, raised surfaces, inset
  controls, responsive density, dialogs, feedback, and skeleton parity.

## Access policy

| Actor / capability   | Allowed behavior                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated      | Read the safe public Club-event feed only.                                                                                                              |
| Signed-in member     | Read eligible upcoming events and their own attendance history.                                                                                         |
| `READ_CLUB_EVENT`    | Read all club event configuration, provider health, aggregate attendance, minimal attendee identity, and attendance CSV.                                |
| `EDIT_CLUB_EVENT`    | All reader behavior plus event/tag mutation, sync/repair, deletion, attendee removal, and CSV.                                                          |
| `CHECKIN_CLUB_EVENT` | Read only grouped event UUID/title choices, search minimal member identity, and add attendance. No event details, attendees, export, tags, or mutation. |
| `IS_OFFICER`         | Override every club event capability.                                                                                                                   |

Additional rules:

- Unauthenticated admin/API access returns `UNAUTHORIZED`.
- An authenticated user lacking a required capability receives `FORBIDDEN` at
  the API boundary and redirects from admin pages to `/member/dashboard`.
- Admin event access does not require the acting user to have a `Member` row.
- Edit access implies read access. Check-in access does not imply read access.
- Every club event procedure verifies `Event.hackathonId IS NULL` or constructs
  a query that cannot return a hackathon event. A supplied hackathon-event UUID
  behaves as not found to a club capability.
- Client-side control hiding is only UX; every query and mutation enforces the
  same policy server-side.
- Attendee output is restricted to member UUID, name, Discord username,
  check-in time, operator identifier/display name where available, and points
  awarded plus its Estimated flag. It does not return phone, demographics,
  resume, address-like data, or the full Member record.

## Architecture / data flow

- `apps/blade` owns `/admin/events`, `/member/events`, the dashboard quick link,
  URL parsing, server-side page gates/initial reads, list/calendar/dialog UI,
  local unfinished-form restoration, scanner UI, and user feedback.
- `apps/club` remains a thin public consumer of the safe event tRPC contract.
  Its contract may change with the router as long as both sides change in the
  same feature.
- `apps/cron` imports a shared server-side reminder selector from `@forge/api`
  instead of calling an authenticated tRPC procedure or duplicating event
  eligibility and timestamp rules. The internal capability requires no new
  HTTP endpoint or secret.
- `@forge/api` owns event/tag queries, eligibility, provider orchestration,
  sync state, check-in, attendance correction, CSV, and reminder selection.
- `@forge/validators` owns reusable event, tag, query-parameter, check-in,
  audience, date-window, and destructive-action schemas.
- `@forge/db` owns only schema, relations, migration, types, and the client.
- Existing Discord and Google clients remain server-only. Event-specific
  provider gateways live in `@forge/api` so orchestration is reusable and
  deterministic in tests.
- No REST business endpoints are added. Club continues to call Blade tRPC.
- No package dependency is added. The existing QR-scanner, Discord REST, and
  Google APIs are reused.
- No new secret is required. The deployment-defined public Google calendar and
  existing development calendar remain the Public and Internal destinations.

### Administrative discovery

- List search is case-insensitive normalized substring matching across event
  name, description, location, and tag. Structured filters run in SQL.
- Multi-selected tag, audience, role, and provider-health values use OR within
  one category; search and different categories use AND.
- List mode returns page rows, total count, and page count for exact page sizes
  `25 | 50 | 100 | 250 | 500`, default 25. Search/filter/page-size changes reset
  to page one.
- Sorts are start time, normalized name, tag, and attendance count, each with
  direction and stable Event-UUID tie-breaking. Upcoming defaults to start
  ascending; past defaults to start descending.
- Calendar mode requires a bounded visible start/end window and returns every
  filtered match intersecting that window. It does not apply list pagination;
  list page/page-size parameters remain in the URL for a return to List.
- Distinct tag, role, audience, and health choices are returned through bounded
  filter-option queries rather than full event records.

### Browser-local unfinished form

- Opening Create assigns a stable client creation key and stores unfinished
  values in browser-local storage.
- Closing, navigating, or refreshing before submission does not create a DB or
  provider record.
- Returning offers Restore and Discard.
- Successful creation clears the local entry. A failed/partial provider sync
  has already created an admin record and therefore clears the local entry too.
- The creation key is submitted and provides request idempotency.

### Event creation and publication

1. Validate permission, creation key, club-only scope, active tag, audience,
   selected roles, internal channel, and date window.
2. Reject `start <= now` and `end <= start`. Resolve the event's tag snapshot,
   tag color, and final non-negative integer points on the server.
3. Canonicalize the validated create payload and hash it with Node's built-in
   crypto support. Under one transaction, lock/recheck the active tag and every
   referenced Role, then reuse the existing row only when creation key and hash
   both match, continuing from its durable sync state. A reused key with
   different normalized input returns `CONFLICT`. Otherwise insert a Blade
   event with nullable provider IDs, provider state `pending`, and
   `publishedAt = null`.
4. Acquire an atomic Event-scoped sync lease before provider work. Concurrent
   create requests receive the same row, and only the lease owner may create
   projections; followers return current state. Before every outbound call, the
   owner durably records a provider-specific attempt token. After lease expiry,
   a missing ID with an attempt token is ambiguous rather than safe to recreate.
   The lease is fenced by token/revision and is not an ordinary data transaction
   held open across network I/O.
5. Create/reconcile Discord, persist the returned ID/state immediately, then
   create/reconcile Google and persist its ID/state immediately. Provider order
   may be sequential because each success is durable; neither provider call is
   placed inside a DB transaction.
6. When both provider IDs are durably recorded with `synced` state, set
   `publishedAt` and the first synchronized-visibility snapshot. Only then may
   public/member/reminder queries expose the event.
7. A partial or ambiguous result remains admin-only and returns a typed
   integration summary. Partial success is not converted into a generic total
   failure because the row and one projection may be durable.

### Event update, retry, and repair

- Blade changes commit first under an event-scoped DB lock, increment a sync
  revision, and set both provider states `pending`. Reconciliation acquires the
  same atomic sync lease and works against that immutable revision snapshot.
- A failed update marks only that provider `error` or `unknown`; it does not
  roll back Blade and does not clear `publishedAt` from an already-published
  event.
- A completion from an older revision cannot mark a newer revision synchronized.
- A completion from an expired/replaced lease cannot write state. Recovery may
  retry only when no outbound-attempt token was recorded or the gateway proved
  the request was never accepted. An attempted create with no durable ID follows
  the provider-specific ambiguous-resolution policy below.
- Create, update, retry/repair, Internal replacement, and deletion all acquire
  the same Event sync lease. The owner heartbeats while a provider request is
  active. Expiry with a durable in-flight attempt becomes `unknown`; a successor
  never issues an overlapping provider write.
- If a provider ID exists, same-destination/entity sync updates it. Provider
  not-found clears the ID and Repair recreates it.
- Changing Internal changes the Google calendar and Discord entity type, so it
  uses replacement rather than update. Delete the old projection first. If
  deletion fails, retain its ID/error and do not create the target projection.
  After confirmed deletion, clear the ID and create the target. A failed target
  create remains missing/Needs attention and Repair resumes from that state.
- Every provider success atomically records the applied event revision and its
  applied destination: Google Public/Internal plus the actual calendar ID, or
  Discord entity type and channel where applicable. Recovery uses this
  server-only metadata, never current desired state or newly changed deployment
  configuration, to locate and delete an old projection after restart.
- Google create always writes a private extended property containing the Blade
  Event UUID and creation key. After an ambiguous Google timeout, reconciliation
  may adopt only the exact projection carrying that identity.
- Discord has no equivalent private identity field. After an ambiguous Discord
  create timeout, mark the projection `unknown`; never auto-adopt a candidate
  based on title, time, location, or description, and never blindly create a
  second projection. Repair lists live candidates and requires an editor to
  choose `Link existing` or explicitly `Confirm create new`. Link validates
  that the configured-guild candidate still exists, has the required current
  entity type, and is not linked to another Blade Event, then overwrites it
  with the current Blade revision.
- Ordinary repeated clicks and tRPC retries are idempotent. Sync/repair is
  serialized by Event UUID and revision.
- If a stale operation reaches a provider before its result is fenced out, the
  event remains unsynchronized and the lease owner must reapply the newest
  revision after the prior attempt is terminal. Health becomes `synced` only
  after a final read/update proves the external payload and applied metadata
  match the current revision.
- Blade does not continuously poll for external drift. A deliberate Sync or
  Repair overwrites external edits with Blade state.
- Updating a completed non-legacy event remains allowed. Provider rejection is
  represented by provider health without undoing the Blade edit.
- After both providers synchronize the current revision, persist its visibility
  snapshot. Before that promotion, effective public/member eligibility is the
  intersection of current desired visibility and the last fully synchronized
  snapshot: narrowing applies immediately, while broader audience/role access
  and Internal-to-public exposure wait. Descriptive edits do not hide an event
  from viewers already eligible under both snapshots.

### Event deletion

1. Require edit access and a club event.
2. In one transaction, lock the Event row `FOR UPDATE`. This is the
   serialization boundary shared with check-in.
3. Under that lock, recheck attendance and integration preconditions. Any
   attendance returns `CONFLICT`. Discord `unknown` from create with no trusted
   ID also returns `CONFLICT` unless the editor first resolves it through Link
   existing or Confirm no projection. The latter requires a fresh
   configured-guild search, typing
   `I understand an unlinked Discord event may remain`, a persisted
   acknowledgement, and an audit attempt. Only then set deletion intent.
4. Deletion acquires the Event sync lease. Deletion intent blocks new
   update/repair/check-in work; a deletion racing an active repair waits and
   then reevaluates current applied metadata.
5. Delete both provider projections using their applied destination metadata.
   Provider not-found is success. A transient or ambiguous failure persists
   provider state and retains the admin-only Blade row.
6. Delete the Blade row only after both projections are confirmed absent or an
   unknown no-ID Discord projection has the explicit absence acknowledgement.
7. A final DB failure is retry-safe because repeated provider not-found results
   are successful.

- A legacy event without attendance may be deleted locally without attempting
  to modify completed legacy provider projections. A legacy event with
  attendance remains protected by the same conflict rule.

### Public and member event flow

- New audience storage reuses the existing fields with one valid encoding:
  Public is `dues_paying=false, roles=[]`; Dues paying is
  `dues_paying=true, roles=[]`; Selected roles is
  `dues_paying=false, roles=[...]`. Validators reject every other new-write
  combination.
- While an update is not fully synchronized, public/member queries evaluate the
  safe intersection of current desired visibility and the last synchronized
  visibility snapshot. For example, Internal-to-public remains off the Club
  site, Public-to-Dues requires dues immediately, Dues-to-Public retains the
  dues lock, and a changed role set admits only members in both sets. When both
  providers synchronize, the snapshot advances and current visibility applies.
- The public Club query applies that effective visibility and returns only
  events that are:
  - club events;
  - not legacy;
  - initially fully synchronized (`publishedAt` is present);
  - not pending deletion;
  - not Internal;
  - Public or Dues-paying audience; and
  - not ended.
- Its output contains event UUID, plain name, tag snapshot/color, description,
  start/end ISO instants, location, and `requiresDues`. It excludes provider
  IDs, selected role IDs, integration state, points administration,
  attendance, and auth/member identifiers.
- Member discovery uses the same active/published and effective-visibility
  rules but permits Internal events and applies the signed-in member's
  eligibility:
  - Public: any signed-in member;
  - Dues paying: visible to every member, with effective dues determining
    unlocked state;
  - Selected roles: visible only when Blade `Permissions.roleId` intersects
    the selected role UUID array.
- Role matching is OR and uses Blade assignments, including cosmetic roles. It
  does not call Discord live.
- A Legacy row with both `dues_paying=true` and a nonempty roles array is
  displayed as `Legacy: dues + selected roles` and requires effective dues AND
  membership in any selected role for check-in. Legacy rows remain absent from
  upcoming public/member discovery.
- The role-management dependency query counts every Event whose roles array
  references the Blade Role UUID, including historical or currently
  out-of-scope event rows. Unlinking that Role returns a conflict until those
  references are removed.
- Event create/update holds shared locks on every referenced Role through the
  Event-row commit. Role unlink locks its Role row for update before dependency
  counting/deletion, so a concurrent reference either commits and blocks unlink
  or observes the deleted Role and fails safely.
- An out-of-scope hackathon Event dependency is intentionally a maintenance-only
  blocker until hackathon event management exists; role unlink never silently
  erases that reference.
- Own history joins through attendance and may include completed and legacy
  events even when current dues/role eligibility changed.

### Attendance and points flow

- The scanner submits only event UUID and QR payload/member choice. It never
  submits points or eligibility claims.
- Accepted QR payloads are a UUID or `user:<UUID>`. The server normalizes both
  to the raw User UUID.
- Check-in loads a club event, target Member, effective dues status, and Blade
  role assignments as needed.
- In the check-in transaction, first take a shared lock on the Event row and
  reject deletion intent, then take the pair-scoped PostgreSQL advisory lock for
  `(memberId,eventId)`. Under both locks, recheck attendance and eligibility,
  insert server-derived points/time/actor, and increment Member points. Event
  deletion takes the conflicting Event lock, so either check-in commits first
  and deletion observes attendance, or deletion intent wins and check-in stops.
- No schema-level `(memberId,eventId)` uniqueness constraint is added by human
  decision. The second existence check under the pair lock is mandatory.
- Duplicate attendance returns a typed `already_checked_in` success-like state
  and never increments points.
- Removal requires edit access and runs attendance deletion plus exact point
  subtraction in one transaction for a Reforge check-in. A migrated row marked
  estimated requires a separate explicit acknowledgement and subtracts its
  stored estimate. A row whose migrated `pointsAwarded` is unexpectedly null
  returns a safe conflict rather than guessing at runtime.
- Changing an event's tag or points does not rewrite existing attendance
  snapshots.
- Check-in event selection is computed server-side and returns only UUID/title
  groups. It prioritizes current and recently ended fully published events;
  older published and Legacy club events remain reachable through an explicit
  Older-events search because there is no hard operator window. It excludes
  hackathon, deletion-pending, and initially incomplete events. Grouping may
  use timestamps internally but does not expose configuration to check-in-only
  clients.
- Manual member search returns only member UUID, user UUID needed by the
  mutation, name, Discord username, and email.

## Data / migration / compatibility

One reviewed Drizzle migration is expected.

### Configurable tag storage

Add a club event tag template table with:

- UUID primary key;
- display name and normalized name with case-insensitive uniqueness;
- non-negative integer default points;
- validated hex color;
- active boolean;
- created/updated timestamps.

Seed every current enum value from the hard-coded tag/default-point map and a
checked-in valid-hex color map that preserves the existing badge color family.
The migration contains an explicit color for every legacy tag; it does not parse
Tailwind class names or choose colors at runtime. Tag rows are creation templates,
not mutable historical truth.

Convert `Event.tag` from the PostgreSQL enum to text while preserving every
stored value. Add an event tag-color snapshot. `Event.tag`, tag color, and
resolved `Event.points` are snapshots used by existing and future consumers;
there is intentionally no FK that lets a tag rename/archive rewrite history.
Archive only affects future tag selection.

Event create/update locks and rechecks the selected active tag through the Event
snapshot commit. Tag archive takes the conflicting tag-row update lock; a race
therefore produces either a completed snapshot followed by archive or a safe
stale-tag rejection, never an event created from an already archived tag.

### Event integration and compatibility fields

Add or change fields sufficient for:

- nullable `discordId` and `googleId`;
- independent nullable Discord/Google sync states (`pending`, `synced`, `error`,
  or `unknown`), where null is legacy-only;
- nullable `publishedAt`;
- nullable deletion-intent timestamp;
- nullable unique creation/idempotency key and nullable canonical-payload hash;
- sync revision with a default;
- nullable sync-lease token and expiry timestamp;
- per-provider nullable outbound-attempt token and timestamp;
- per-provider nullable applied revision and destination metadata: Google
  Public/Internal plus actual calendar ID; Discord entity type and applied
  channel;
- nullable last-synchronized visibility revision plus dues, roles, and Internal
  snapshots;
- nullable Discord no-projection acknowledgement time and actor;
- legacy boolean with a default of false; and
- timezone-aware start/end timestamps for new writes.

Migration behavior:

- Mark every pre-feature Event row legacy.
- For every legacy row, set sync states, `publishedAt`, creation key/hash, lease,
  attempt, applied-destination/revision, visibility-snapshot, deletion-intent,
  and Discord-absence-acknowledgement fields to null; set sync revision to 0.
  Preserve existing provider IDs as unverified historical references.
- Seed tag templates as active and backfill every Event tag-color snapshot from
  the same exhaustive checked-in color map.
- Convert the existing timestamp-without-time-zone columns with an explicit
  `AT TIME ZONE 'America/New_York'` interpretation, preserving their legacy
  Eastern wall-clock fields without applying `+1 day` or `-1 day`. This is a
  deterministic type conversion, not a claim that the historical date was
  correct.
- Legacy rows remain readable for admin history, member attendance history, and
  attendance references. Admin UI labels them Legacy.
- Legacy rows are excluded from active provider-health and automatic Repair.
- Editing a Legacy row changes Blade history only and never syncs or repairs
  its old provider projections.
- New events alone use the corrected UTC-instant storage/display contract.
- New Event creation explicitly sets `legacy=false`, revision 1, both sync
  states `pending`, a non-null creation key/hash, and null provider/lease/attempt/
  applied/visibility/deletion fields. Resolved points, including zero, are
  non-null for new club events.
- For non-legacy rows, `synced` requires a provider ID, current applied revision,
  and compatible applied destination metadata. `publishedAt` requires that both
  initial projections succeeded and that a visibility snapshot exists. Service
  invariants and migration tests reject impossible combinations.
- Preserve hackathon event rows and `hackathonId`; club APIs simply do not
  expose them. Converting tag values to text must not lose hackathon tags.

### Attendance fields

Add nullable migration-compatible fields to `EventAttendee`:

- `checkedInAt` as a timezone-aware timestamp;
- `checkedInBy` as a nullable User reference with safe deletion behavior;
- `pointsAwarded` as a nullable integer;
- `pointsAwardedEstimated` as a boolean defaulting to false.

All new application writes require values for all four. Existing rows backfill
`pointsAwarded` from the event's stored points, falling back to the former
hard-coded tag map where needed, and set `pointsAwardedEstimated = true`.
Legacy check-in trusted a client-supplied award, so this backfill is explicitly
best effort rather than exact. Existing check-in time and actor remain null
because they cannot be reconstructed honestly. New check-ins set
`pointsAwardedEstimated = false`.

Do not add an attendee uniqueness constraint. Migration validation must report
pre-existing duplicate member/event pairs rather than silently deleting them.

### Rollout and rollback

- Migration tests use production-shaped legacy rows, custom tags, partial
  provider rows, attendance, and hackathon events.
- Apply the migration before deploying API/UI consumers of the new fields.
- Update Club and cron consumers in the same rollout as the event router.
- A rollback must preserve legacy Event and EventAttendee data. Provider side
  effects created after rollout are not rolled back by a database migration;
  operational cleanup uses the event admin repair/delete flow.
- No live Discord/Google migration or smoke operation is required.

## tRPC/API behavior

Procedure names may be refined for existing router conventions, but the router
must expose these typed capabilities and add `.describe()` metadata or concise
JSDoc suitable for future generated API context.

### Public and member queries

- `event.getPublicClubEvents`: safe bounded public query used by Club.
- `event.listMemberEvents`: eligible upcoming event list plus dues-lock state.
- `event.listMemberAttendance`: signed-in member's own history only.

### Administrative reads

- `event.listAdminEvents`: paginated list mode or bounded visible-window
  calendar mode with shared search/filter/sort semantics.
- `event.getAdminEvent`: complete club event detail and integration health.
- `event.listDiscordRepairCandidates`: editor-only configured-guild candidate
  metadata for resolving an ambiguous Discord creation.
- `event.listEventTags`: active/all modes gated for the caller's use.
- `event.listAttendees`: minimal attendee output.
- `event.exportAttendance`: spreadsheet-safe CSV across the selected event.

### Administrative mutations

- `event.createEvent`
- `event.updateEvent`
- `event.retrySync` / `event.repairIntegration`
- `event.resolveDiscordProjection`: Link existing, Confirm create new, or
  phrase-gated Confirm no projection after a fresh candidate read.
- `event.deleteEvent`
- `event.createTag`
- `event.updateTag`
- `event.archiveTag`
- `event.removeAttendance`

Duplicate is a UI composition over create with a new creation key, not a server
copy that could accidentally reuse provider identifiers.

### Check-in surface

- `event.listCheckInEvents`: UUID/title groups only.
- `event.searchCheckInMembers`: bounded fuzzy minimal-identity lookup.
- `event.checkInMember`: normalized QR/manual check-in with typed outcome.

### Internal reminder capability

- The existing reminder worker uses a server-side event capability returning
  eligible public reminder records, including Discord ID but excluding
  internal, role-restricted, legacy, initially incomplete, deletion-pending,
  hackathon, and ended events.
- A previously published event remains reminder-eligible after a later
  Google-only sync failure when its Discord projection is present and `synced`.
  Discord must be `synced` for the current event revision; missing, `pending`,
  `error`, or `unknown` state suppresses the reminder even if an old Discord ID
  remains stored.
- Reminder schedule and established copy/webhooks remain out of scope except
  where timestamp/tag contract changes require compatibility edits.

### Error and partial-result behavior

- Use standard `TRPCError` codes for auth, permission, validation, not-found,
  conflict, and total internal failure.
- Creation/update/delete provider orchestration may return a typed integration
  summary because partial durable success is an explicit product state.
- User-facing errors are safe. Raw provider payloads, credentials, calendar
  identifiers, and stack traces are server-log only.

## Validation

Reusable validators in `@forge/validators` cover:

- exact page sizes `25 | 50 | 100 | 250 | 500`;
- list/calendar URL state, sorting, date ranges, filters, UUID detail, and
  malformed values;
- audience discriminators and mutually exclusive dues/role encoding;
- selected-role UUIDs and non-empty role audience;
- event name/description/location constrained to the strictest supported
  provider limits;
- future create start, ordered start/end, timed multi-day events, and no
  all-day/recurrence inputs;
- explicit-offset ISO instants whose displayed local fields round-trip through
  `America/New_York`; reject nonexistent spring-forward times and require the
  editor's explicit first/second offset choice for a repeated fall-back time;
- active tag selection, normalized unique tag name, non-negative integer
  default points, and valid color;
- optional non-negative integer per-event point override;
- Internal channel requirement and Discord snowflake/manual fallback;
- creation key and event UUID;
- QR UUID / `user:<UUID>` compatibility;
- bounded check-in member search;
- deletion and attendance identifiers;
- Discord-resolution mode, compatible candidate ID, and the exact
  no-projection acknowledgement phrase; and
- CSV-safe values.

The server revalidates live roles, tags, channels, event scope, dues, and
attendance state. UI validation is not authoritative.

## Discord integration

- Public/non-internal events use `GuildScheduledEventEntityType.External` with
  location metadata.
- Internal events use an eligible voice or stage channel. The picker queries
  live guild channels, filters unsupported/inaccessible channels, and retains a
  validated manual-ID fallback.
- A voice channel maps to `GuildScheduledEventEntityType.Voice`; a stage channel
  maps to `GuildScheduledEventEntityType.StageInstance`.
- Discord visibility is channel-controlled only for Internal events. A
  selected-role non-internal event is allowed but the UI displays the approved
  broader-Discord-visibility warning.
- Scheduled-event title is `[TAG] Name`.
- Description is deterministic from Blade description, location, and resolved
  points and stays within provider limits.
- Provider gateway operations cover create, update, get/list for reconciliation,
  and delete with not-found classification.
- Audit logging is attempted for create, update, sync/repair/ambiguous
  resolution, delete, check-in, attendance removal, and tag mutation using
  actor/event/member UUIDs without profile PII. Audit transport failure is
  logged server-side and does not roll back committed product state.

## Google Calendar integration

- Internal false targets the deployment's public calendar.
- Internal true targets the existing development/internal calendar by explicit
  human decision.
- Request content mirrors the generated Discord title/copy and uses corrected
  start/end instants with `America/New_York` presentation semantics.
- Private extended properties must carry the Blade Event UUID and creation key
  so ambiguous create reconciliation can identify the exact projection.
- Gateway operations cover create, update, get/list for reconciliation, and
  delete with not-found classification.
- Calendar destinations remain deployment configuration and are not editable
  by officers in this slice.

## Configurability review

Would this require a developer change next year?

- Event creation, audience, internal destination choice, role selection,
  points override, and tag/default-point/color management do not require a
  developer.
- Adding a new club event tag does not require a PostgreSQL enum or code change.
- Adding a new calendar destination, audience type, or provider still requires
  engineering and is intentionally outside this slice.
- Discord/Google credentials and destination IDs remain infrastructure
  configuration rather than routine organizational data.

## React / frontend constraints

- Pages stay server components and own auth, redirects, permission gates,
  initial reads, query parsing, and high-level composition.
- The admin layout is extended server-side so its rail/header persist through
  event loading and errors.
- Focused client components own URL navigation, calendar controls, dialogs,
  browser-local form persistence, scanner/camera behavior, and mutations.
- Use the current authenticated shell and admin rail; add Events only for users
  with read, edit, check-in, or officer access.
- Event views use Blade's raised-card and inset-surface hierarchy. Do not copy
  legacy's oversized headings, flat card grids, or client-only whole-page load.
- Large dialogs have named sections and mobile full-screen treatment. Selected
  event focus returns to its opener when closed.
- Calendar has keyboard navigation and an agenda representation at narrow
  widths. List/calendar share the same query-backed dataset and filters.
- Camera denial, unavailable camera, malformed scans, pending scans, repeated
  scans, and manual fallback have explicit states.
- Check-in-only code must not receive hidden detail/attendee data in props or
  prefetched caches.
- Route loading/error boundaries render inside the stable shell. Skeletons
  match the loaded list/calendar geometry.
- Use current raised-card themed toast/feedback treatment and 44px mobile
  targets. Respect reduced motion.

## Testing / verification strategy

- `@forge/validators` Vitest: event/tag/query/check-in schemas and URL parsing.
- `@forge/api` Vitest/integration tests: permissions, scope, DB behavior,
  eligibility, provider gateways/orchestration, tags, attendance, points, CSV,
  reminders, migration-shaped compatibility, locking/idempotency, and audits.
- `@forge/blade` component tests: control visibility, list/calendar/detail,
  filters/URL state, form restoration, dialogs, tags, scanner states, and
  responsive density.
- `@forge/club` contract tests: public payload and dues badge rendering.
- `@forge/cron` tests: reminder candidate compatibility and corrected times.
- Playwright: high-value reader/editor/check-in/officer/member/public flows,
  provider failure/repair through deterministic fakes, QR/manual check-in,
  deletion constraints, URL sharing, and desktop/320px QA.
- Provider fakes and synthetic failure state live under test/support paths, not
  production routers. No automated or manual test writes to live Discord or
  Google are required.
- Generate tests from the approved `test-cases.md` before implementation and
  confirm meaningful failures where practical.
- Required completion commands include targeted tests/typechecks/lint,
  `pnpm analyze:react` on event surfaces,
  `pnpm analyze:react:changed`, focused and full Blade E2E,
  `pnpm verify:precommit`, `pnpm verify:push`, and `pnpm build`.

## Open questions

- None.
