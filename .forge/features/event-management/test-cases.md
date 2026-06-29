# Event Management Test Cases

Status: Ready for human approval

> This file owns observable proof. Do not generate implementation tests until
> the human approves these cases.

## Scope

These cases prove club event administration, configurable tags, public/member
visibility, Discord and Google projection behavior, permission isolation,
check-in, attendance/points, CSV, reminders, legacy compatibility, responsive
Blade UX, and the Club-site contract.

They intentionally exclude hackathon event UI, hacker check-in, recurrence,
all-day events, feedback/forms, event registration, generic analytics,
external-event import, continuous drift detection, offline check-in, and live
Discord/Google writes.

## Test placement plan

- `packages/validators/src/tests`: event/tag/query/QR/date/audience schemas.
- `packages/api/src/tests/events`: router/workflow/database integration tests
  with deterministic Discord/Google gateways.
- `packages/db`: migration validation where the existing harness permits;
  otherwise a focused migration verification script invoked by API/DB tests.
- `apps/blade/src/tests`: component/rendered-contract tests for permission
  controls, URL state, calendar/list/dialogs, local form restoration, tags,
  scanner states, and responsive information density.
- `apps/club/src/tests`: public tRPC contract normalization and dues badge.
- `apps/cron/src/tests`: public reminder selection and timestamp behavior.
- `apps/blade/src/tests/e2e`: high-value Playwright workflows.

Expected commands include:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/api test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/club test`
- `pnpm --filter=@forge/cron test`
- focused and full `pnpm --filter=@forge/blade e2e`

## Test cases

### TC-001: Public Club feed includes eligible public and dues events

Setup:

- Create fully synchronized future club events with Public, Dues-paying, and
  Selected-role audiences.
- Include an Internal event, partial-sync event, deletion-pending event,
  legacy event, ended event, and hackathon event.

Action:

- Call the public Club-event query and render the Club events consumer.

Expected observations:

- Only future, fully synchronized, non-internal Public and Dues-paying club
  events appear.
- The dues event includes and renders a dues badge.
- Provider IDs, role IDs, attendance, and admin state are absent.
- Results are ordered by ascending start time and obey the bounded limit.

### TC-002: Member event discovery applies audience and Internal rules

Setup:

- Create a signed-in unpaid member with one linked cosmetic role.
- Create Public, Dues-paying, matching-role, other-role, and Internal variants.

Action:

- Open `/member/events`.

Expected observations:

- Public and eligible Internal/Public-audience events appear.
- The Dues-paying event appears locked with a dues action.
- Matching-role events appear; other-role events are absent.
- No provider-health or admin data appears.

### TC-003: Paid member unlocks Dues-paying events through effective dues

Setup:

- Give a member effective academic-year dues, including coverage for an active
  legacy calendar-year-compatible row.
- Create a Dues-paying event.

Action:

- Load member events and attempt check-in.

Expected observations:

- The event is unlocked and check-in succeeds.
- Stale/inactive dues alone do not unlock it.

### TC-004: Member attendance history survives current eligibility changes

Setup:

- Record attendance with captured points for a member at a selected-role event.
- Revoke the member's selected role and make the event past.

Action:

- Open the member's attendance history.

Expected observations:

- The attended event and captured points remain visible to that member.
- The event no longer appears as an upcoming eligible selected-role event.

### TC-005: Admin route selects only authorized views

Setup:

- Prepare users with Read, Edit, Check-in, Officer, and no event capabilities.

Action:

- Open `/admin/events` and direct `?view=list|calendar|check-in|tags` URLs.

Expected observations:

- Readers see List/Calendar and read-only detail.
- Editors additionally see mutation and Tags controls.
- Check-in-only users land in Check-in and cannot render other views.
- Officers see every view.
- Unauthorized users redirect to `/member/dashboard`.

### TC-006: List and calendar share query-backed state

Setup:

- Create enough events to span tags, audiences, dates, integration states, and
  more than one page.

Action:

- Search, combine filters, sort, change page size, paginate, and switch between
  List and Calendar.

Expected observations:

- Search covers name, description, location, and tag.
- Search is normalized case-insensitive substring matching. Different filter
  categories combine with AND; multi-selected tags, audiences, roles, and
  health states combine with OR within their category.
- Page sizes are exactly 25, 50, 100, 250, and 500.
- Search/filter/page-size changes return to page one.
- URL parameters preserve state across reload and view changes.
- Start/name/tag/attendance sorts use Event UUID as a stable tie-breaker.
- Calendar returns every matching event intersecting its bounded visible window
  without list pagination; switching back restores the list page/page size.

### TC-007: Shareable event detail uses one responsive hierarchy

Setup:

- Create a complete event with audience, tag/points, integration health, and
  attendance.

Action:

- Open `?event=<UUID>` directly on desktop and a 320px viewport.

Expected observations:

- The same event opens in a sectioned dialog.
- Reader/editor controls reflect permission.
- Mobile content neither clips nor overflows horizontally.
- Closing returns focus to the invoking row/card when one exists.

### TC-008: Unfinished create form restores only in the browser

Setup:

- Open Create and enter event details without submitting.

Action:

- Close/reopen and refresh, then choose Restore; repeat and choose Discard.

Expected observations:

- Restore recovers the unfinished fields and creation key.
- Discard clears them.
- No Blade, Discord, or Google record exists before explicit submission.
- Successful or partial submitted creation clears the browser draft.

### TC-009: Successful event creation publishes to both providers

Setup:

- Configure active tag, future single-day and multi-day inputs, and successful
  Discord/Google gateways.
- Prepare two concurrent submissions with the same creation key.
- Prepare the same key with a different canonical payload, plus lease-owner
  crashes before and after a durable outbound-attempt marker.

Action:

- Submit Create normally, then race the same creation-key request.

Expected observations:

- Exactly one Blade row and one projection per provider exist.
- Title/copy, location, points, times, calendar destination, and Discord entity
  type match the selected fields.
- Google carries the Blade Event UUID/creation key in private extended
  properties.
- The event becomes visible to its eligible non-admin consumers only after both
  provider IDs are durable.
- Repeated and concurrent same-key requests return the same event. The atomic
  sync lease permits only one provider-creation workflow and creates no
  duplicate projection.
- Reusing the key with changed normalized input returns `CONFLICT` and does not
  mutate the original row or either provider.
- A crash before an attempt marker can be resumed safely. A crash after the
  marker enters provider-specific ambiguous recovery and never blindly sends a
  second create.
- A replaced/expired lease cannot commit stale state. If a durable outbound
  attempt exists without an ID, recovery follows ambiguous resolution instead
  of issuing another create.

### TC-010: Internal event uses internal calendar and channel-backed Discord

Setup:

- Select Internal, a supported live voice/stage channel, and each audience type
  in separate events.

Action:

- Create the events and inspect their provider requests and consumer visibility.

Expected observations:

- Google targets the internal/development calendar.
- A selected voice channel uses `GuildScheduledEventEntityType.Voice`; a stage
  channel uses `GuildScheduledEventEntityType.StageInstance`.
- Internal events are absent from the public Club feed.
- Eligible signed-in members see them according to Blade audience.

### TC-011: Role-restricted public Discord event warns about broader visibility

Setup:

- Select Selected roles while Internal is off.

Action:

- Review and submit the create/edit form.

Expected observations:

- A warning explains that Discord visibility is broader than Blade eligibility.
- Submission remains allowed.
- Blade/member visibility stays role-restricted while Discord uses an external
  public scheduled event.

### TC-012: Partial creation is retained and repaired

Setup:

- Configure Discord success and Google failure, then reverse the provider
  failure in a second scenario.

Action:

- Create, inspect administration/public/member surfaces, then Retry/Repair.

Expected observations:

- The successful provider ID remains durable and the failed provider is marked
  Needs attention.
- The event is admin-only before both initial providers succeed.
- Repair touches only the failed/missing provider and creates no duplicate.
- Successful repair publishes the event automatically.

### TC-013: Ambiguous provider timeout does not blindly duplicate

Setup:

- Simulate Google accepting create with Blade private identity metadata but the
  client receiving an ambiguous timeout without a stored ID.
- Separately, simulate Discord accepting create before an ambiguous timeout.
- Expire the owning lease while the fake Discord request is still unresolved;
  let the old owner complete after a successor observes the attempt marker.

Action:

- Retry/Repair repeatedly. For Discord, review the candidate picker, choose
  Link existing, then repeat with Confirm create new only when no candidate is
  the accepted projection.

Expected observations:

- Provider health is Unknown/Needs attention after each ambiguous result.
- Google adopts only the projection carrying the exact private Blade identity.
- Discord never auto-adopts a title/time/location match and never creates
  again without the editor's explicit resolution.
- The successor sends no overlapping create, the expired owner cannot commit
  fenced state, and late completion still leaves exactly one live candidate for
  explicit resolution.
- Link existing rejects missing, wrong-entity-type, or already-linked
  candidates; a valid link records the reviewed Discord ID and reapplies Blade
  state. Confirm create new is an explicit acknowledgement of duplicate risk.
  Ordinary retry creates no second projection.

### TC-014: Update keeps Blade authoritative across partial provider failure

Setup:

- Create a published event, then make one provider fail updates.

Action:

- Change descriptive fields, tag/points, audience, and dates in place.
- Toggle Internal with successful replacement, then exercise old-projection
  deletion failure and target-projection creation failure.
- Restart orchestration between replacement steps, and release an older slow
  provider update only after a newer Blade revision exists.

Expected observations:

- Blade retains the approved edit and increments its revision.
- The successful provider receives matching generated data.
- The failed provider shows Needs attention; the already-published event is not
  unpublished.
- Same-destination/entity edits patch the existing projection.
- An Internal change deletes the old projection before creating the new
  calendar/entity-type projection. Failed old deletion retains its ID and does
  not create the target; failed target creation leaves the old ID cleared and
  a repairable missing projection.
- Applied calendar/entity/channel metadata lets restart recovery target the old
  projection correctly instead of guessing from current Internal state.
- A stale older sync completion cannot mark a newer edit synchronized. The
  newest revision is reapplied after the prior operation is terminal, and the
  final external payload plus applied revision match current Blade state.
- Narrowing access applies immediately. Internal-to-public or any other
  broadening remains unavailable to newly eligible viewers until both providers
  synchronize the new visibility revision.
- Repair applies the current Blade revision.

### TC-015: Duplicate creates an independent event

Setup:

- Open Duplicate on an existing event.

Action:

- Select a new future time and submit.

Expected observations:

- Reusable fields are prefilled.
- New Blade, Discord, and Google identifiers are created.
- Attendance, provider IDs, integration state, and creation key are not copied.

### TC-016: Tag administration supports creation, editing, and archive

Setup:

- Sign in with edit access and open Tags.

Action:

- Create a mixed-case tag with color/default points, edit its future defaults,
  archive it, and attempt a capitalization-only duplicate.

Expected observations:

- The valid tag appears as an active creation option.
- New events receive its current defaults.
- Archived tags disappear from new-event selection but remain visible on
  historical events.
- The duplicate normalized name is rejected safely.

### TC-017: Event tag and points are historical snapshots

Setup:

- Create one event using tag defaults and one with a point override.

Action:

- Rename/edit/archive the tag and inspect both events.

Expected observations:

- Existing event tag presentation and resolved points do not change.
- Future creation uses the updated active tag values.
- Zero default and zero override remain valid.

### TC-018: Current raw QR check-in succeeds

Setup:

- Select an eligible event and a member whose QR payload is the raw User UUID.

Action:

- Scan the QR.

Expected observations:

- One attendance row records server time, acting operator, and server-derived
  event points.
- Member points increase exactly once.
- The scanner remains ready for the next member and displays clear success.

### TC-019: Legacy-prefixed QR remains temporarily compatible

Setup:

- Use the same member with `user:<UUID>` payload.

Action:

- Scan the QR.

Expected observations:

- The server normalizes the payload and performs the same check-in contract.
- New QR generation remains raw UUID only.

### TC-020: Manual check-in lookup is minimal and usable

Setup:

- Grant only check-in access and create members searchable by name, Discord
  username, and email.

Action:

- Search each field and select a member.

Expected observations:

- Results identify the correct member using only the approved minimal fields.
- Full Member profiles, event configuration, attendees, and exports are absent.
- Selecting a member can complete check-in without camera access.

### TC-021: Dues and role check-in requirements are enforced

Setup:

- Prepare unpaid/paid members and matching/nonmatching role assignments.

Action:

- Scan them into Dues-paying and Selected-role events.

Expected observations:

- Effective paid and matching-role members succeed.
- Unpaid and nonmatching members receive specific operational rejection copy.
- Rejected scans create no attendance and award no points.
- Eligibility comes from Blade dues/assignments, not client data or live Discord.

### TC-022: Duplicate and concurrent scans are idempotent

Setup:

- Submit sequential and concurrent check-ins for the same member/event pair.

Action:

- Await all outcomes.

Expected observations:

- Exactly one attendance record and one point increment exist.
- Other outcomes report Already checked in rather than a generic failure.

### TC-023: Reader attendee view and CSV expose only approved fields

Setup:

- Create attendance with current and migrated-null time/operator cases and
  values containing commas, quotes, line breaks, and spreadsheet prefixes.
- Include one migrated attendance row with an estimated points backfill.

Action:

- Open attendees and download CSV as an authorized reader.

Expected observations:

- UI/CSV contain only UUID, name, Discord username, check-in time/operator when
  available, and points awarded.
- Missing legacy metadata is shown safely.
- The migrated award is explicitly labeled Estimated in the UI and CSV.
- CSV escapes delimiters, quotes, line breaks, and spreadsheet formulas.
- Check-in-only and unauthorized users cannot read or export it.

### TC-024: Attendance correction reverses captured points

Setup:

- Check in a member, then change the event's current tag/points.
- Include a migrated legacy attendance row with a stored estimated award.

Action:

- Remove the Reforge attendance from the attendee viewer as an editor. Attempt
  the legacy removal, acknowledge its estimate warning, and confirm.

Expected observations:

- The attendance row is removed.
- Blade subtracts the originally captured points instead of the event's new
  value.
- The legacy removal cannot proceed through the ordinary confirmation. After
  explicit estimate acknowledgement, it subtracts the stored estimate.
- Check-in-only users do not see the removal control.

### TC-025: Event with attendees cannot be deleted

Setup:

- Create an event with one or more attendance rows.
- Create an empty event and pause concurrent delete/check-in transactions on
  opposite sides of the Event-row lock.

Action:

- Attempt deletion as editor/officer. Race deletion against a valid check-in in
  both lock orders.

Expected observations:

- Deletion returns a conflict explaining that attendance must be resolved.
- Blade, provider projections, attendance, and member points remain unchanged.
- If check-in locks first, deletion later observes attendance and conflicts. If
  deletion intent locks first, check-in is rejected before attendance or points.
  No cascade can leave awarded Member points without its attendance row.

### TC-026: Empty event deletion is recoverable and idempotent

Setup:

- Create a published event without attendance.

Action:

- Delete it with both providers succeeding or returning Not found.

Expected observations:

- The event disappears from non-admin surfaces once deletion begins.
- Both projections are absent and the Blade row is deleted.
- Repeated cleanup does not fail on provider Not found.

### TC-027: Provider deletion failure retains an admin retry path

Setup:

- Create an empty event and make one provider deletion fail transiently.
- Pause a provider Repair while deletion begins.

Action:

- Delete, inspect administration/public/member surfaces, then retry.

Expected observations:

- The Blade row remains admin-only with Needs attention.
- The successful provider is not recreated.
- Repair and deletion never issue overlapping writes. Deletion waits for the
  shared sync lease, reevaluates applied metadata, and deletion intent prevents
  any new Repair from starting.
- Retry removes the remaining projection and then the Blade row.

### TC-028: Public reminders use the corrected event capability

Setup:

- Create Public, Dues-paying, Internal, selected-role, partial, legacy,
  hackathon, and ended events around reminder windows.
- For previously published eligible events, add one later Google-only sync
  failure and current-revision Discord states `synced`, `pending`, `error`,
  `unknown`, and missing.

Action:

- Run reminder candidate selection with a fixed `America/New_York` clock.

Expected observations:

- Only eligible Public and Dues-paying club events are selected.
- A healthy Discord projection remains eligible after a Google-only failure.
  Missing, Pending, Error, and Unknown Discord projections are excluded even
  when an old Discord ID is present.
- Their tag, Discord ID, date, and time are correct without a plus-one-day
  workaround.
- Existing schedule/copy grouping remains compatible.

### TC-029: Legacy events remain historical without automatic repair

Setup:

- Migrate pre-Reforge events with old timestamps, provider IDs, attendance, and
  no reconstructable check-in time/operator.

Action:

- Open admin history and member attendance history, inspect integration
  controls, edit a Legacy event, and inspect provider gateways.

Expected observations:

- Timestamp conversion treats stored fields as `America/New_York` wall-clock
  values without a plus/minus-one-day correction, independent of DB session
  timezone.
- Events are labeled Legacy and remain readable.
- Provider health/Repair does not treat them as active broken projections.
- Legacy edits remain Blade-only and issue no provider request.
- Member history remains connected to legacy attendance.

### TC-030: Route shell, loading, error, and responsive layouts remain stable

Setup:

- Exercise List, Calendar, Check-in, Tags, and detail on desktop and 320px
  mobile with delayed and failed reads.

Action:

- Navigate between views and open dialogs/scanner states.

Expected observations:

- The server-rendered admin rail/header remains mounted without page shift.
- Skeletons resemble loaded geometry.
- Empty and safe error states offer relevant recovery.
- No document-level horizontal overflow occurs.
- Mobile controls meet touch sizing; keyboard focus and reduced motion work.

### TC-031: Event audiences participate in role-unlink dependencies

Setup:

- Link a Blade role and reference its UUID from current and historical Event
  audience arrays.
- Prepare an Event create/update racing role unlink, plus an out-of-scope
  hackathon Event reference.

Action:

- Read role dependencies and attempt to unlink the role. Remove every Event
  reference and retry. Exercise both lock orders in the concurrent race.

Expected observations:

- The dependency result includes the Event references and the role-management
  UI identifies them as blockers.
- Unlink returns a conflict while any reference remains and changes no event.
- A hackathon Event reference is labeled as a maintenance-only blocker rather
  than silently removed.
- If the Event reference locks first, unlink waits and then conflicts. If unlink
  deletes first, Event validation rechecks the Role and fails before commit.
- Unlink may proceed only after every Event reference is removed.

### TC-032: Check-in event selection has no hard time window

Setup:

- Create current, recently ended, older published, Legacy, initially
  incomplete, deletion-pending, and hackathon events.
- Grant only `CHECKIN_CLUB_EVENT`.

Action:

- Open Check-in, search the Older-events group, and check an eligible member
  into an older club event.

Expected observations:

- Current and recent events are prioritized.
- Older published and Legacy club events are reachable by explicit search and
  remain check-in eligible under the normal audience rules.
- Incomplete, deletion-pending, and hackathon events are absent.
- Choices contain only UUID and title/grouping data.

### TC-033: Reader, editor, check-in, and officer APIs stay separated

Setup:

- Prepare callers with only `READ_CLUB_EVENT`, only `EDIT_CLUB_EVENT`, only
  `CHECKIN_CLUB_EVENT`, `IS_OFFICER`, and no event capability.

Action:

- Call every public/member/admin read, event/tag/integration mutation,
  attendance correction/export, and check-in procedure for each caller.

Expected observations:

- Read can use admin reads, attendees, and CSV but cannot mutate or check in.
- Edit implies reader behavior and can mutate events/tags/integrations and
  remove attendance, but does not imply Check-in.
- Check-in can use only its three minimal procedures.
- Officer can use every club event procedure. No-capability calls fail with the
  documented auth code and no protected payload.

### TC-034: Unknown no-ID Discord creation blocks deletion until resolved

Setup:

- Leave an empty Event in Discord `unknown` state after an ambiguous create with
  no trusted Discord ID.

Action:

- Attempt deletion, then exercise Link existing and Confirm no projection in
  separate scenarios. For Confirm no projection, refresh live candidates and
  enter both incorrect and exact acknowledgement phrases.

Expected observations:

- Initial deletion conflicts before deletion intent or provider cleanup.
- A valid linked candidate is overwritten from Blade and can then be deleted
  normally.
- Confirm no projection rejects stale candidate data and incorrect copy. The
  exact phrase persists/audits the orphan-risk acknowledgement and permits
  deletion without pretending Discord returned Not found.

## Negative / regression cases

### TC-NEG-001: Authentication and permission failures are distinct

Setup:

- Prepare unauthenticated and authenticated unauthorized callers.

Action:

- Call protected/member/admin/check-in procedures and open admin URLs.

Expected observations:

- Unauthenticated protected calls return `UNAUTHORIZED`.
- Authenticated permission failures return `FORBIDDEN`.
- Admin pages redirect according to the access policy.
- No protected data is returned before failure.

### TC-NEG-002: Club permissions cannot cross into hackathon events

Setup:

- Create a hackathon event and a user with every club event capability but no
  hackathon capability.

Action:

- Supply its UUID to club detail, update, delete, attendance, export, check-in,
  sync, and repair procedures.

Expected observations:

- Every operation behaves as not found/forbidden and changes nothing.

### TC-NEG-003: Invalid date windows and past creation are rejected

Setup:

- Prepare starts in the past, equal/reversed end times, malformed timestamps,
  unsupported all-day input, and recurrence fields.
- Prepare an `America/New_York` spring-forward time that does not exist, both
  explicit offsets for a repeated fall-back time, and a valid multi-day event
  crossing each DST boundary.

Action:

- Validate and submit creation.

Expected observations:

- Inputs fail before Blade or provider mutation with field-specific safe copy.
- Valid timed multi-day input succeeds.
- The nonexistent local time is rejected. An ambiguous local time is rejected
  until the first/second occurrence is chosen; each choice persists its correct
  instant/offset. Valid cross-DST durations and provider instants remain correct.

### TC-NEG-004: Invalid audience combinations are rejected

Setup:

- Submit dues plus roles, Selected roles with no roles, malformed role UUIDs,
  missing linked roles, and client-supplied hackathon ID.

Action:

- Create/update an event.

Expected observations:

- The operation is rejected with no partial DB/provider changes.

### TC-NEG-005: Internal event requires a valid eligible Discord channel

Setup:

- Omit channel, select text/unsupported channel, use malformed/manual unknown
  ID, and simulate live channel lookup failure.

Action:

- Submit or preview Internal creation.

Expected observations:

- Invalid choices are rejected safely.
- The picker has clear loading/error/manual-fallback states.

### TC-NEG-006: Invalid or archived tags cannot create events

Setup:

- Use missing, archived, malformed, duplicate-normalized, and concurrently
  archived tag inputs.

Action:

- Create/update tags or events.

Expected observations:

- The server rejects stale/invalid choices without provider writes.
- Existing events using the archived tag remain intact.
- In a create-versus-archive race, shared/update tag-row locking yields either a
  committed event snapshot before archive or a stale-tag rejection after it;
  no event commits from an already archived tag.

### TC-NEG-007: Client cannot choose awarded points during check-in

Setup:

- Send extra/forged point or eligibility fields with a check-in request.

Action:

- Submit the strict input.

Expected observations:

- Unknown forged fields are rejected/ignored according to the strict schema.
- Award and eligibility are derived server-side.

### TC-NEG-008: Malformed and unknown QR values fail safely

Setup:

- Scan arbitrary text, malformed UUID, unsupported prefix, unknown User UUID,
  and a valid non-member User UUID.

Action:

- Attempt check-in.

Expected observations:

- Each produces specific safe feedback with no attendance/point mutation.
- The scanner recovers for the next scan.

### TC-NEG-009: Null legacy award cannot be guessed during removal

Setup:

- Retain a deliberately unrecoverable migrated attendance row with null
  `pointsAwarded`.

Action:

- Attempt attendance removal.

Expected observations:

- Removal is blocked with a safe consistency message.
- Attendance and member points remain unchanged.

### TC-NEG-010: Migration preserves production-shaped event data

Setup:

- Seed old enum tags, club/hackathon events, shifted timestamps, provider IDs,
  attendance, duplicate member/event attendance pairs, and a legacy row with
  both dues and roles.

Action:

- Apply the migration and run its validation report.

Expected observations:

- All event/tag/hackathon references remain readable.
- No timestamp receives an implicit plus/minus-one-day correction.
- Existing rows are Legacy; new defaults are non-legacy.
- Legacy timestamp conversion explicitly interprets stored fields in
  `America/New_York` and is unaffected by the migration session timezone.
- Tag templates are seeded and event tags are preserved as text snapshots.
- Every legacy tag receives its explicit seeded hex color and every Event gets
  the matching color snapshot.
- Legacy sync/publication/creation/lease/attempt/applied/visibility/deletion
  metadata has the documented null/zero backfill while provider IDs remain.
- New-row defaults begin at revision 1 with pending states, null operational
  metadata, and enforce the synced-ID/applied-revision invariants.
- Attendance points backfill from stored event points/former tag defaults;
  those awards are marked Estimated, while unknown actor/time remain null.
- The conflicting legacy audience is labeled and enforced as dues AND any
  selected role; validators cannot create the combination for a new row.
- Duplicate attendance is reported and not silently deleted.

### TC-NEG-011: Provider fixtures never escape test/support boundaries

Setup:

- Run automated event suites without live Discord/Google credentials.

Action:

- Exercise success, not-found, validation error, transient error, ambiguous
  timeout, stale revision, and partial result.

Expected observations:

- Tests are deterministic and make no network writes.
- Production router/workflow code contains no hard-coded synthetic event IDs or
  E2E-only provider behavior.

### TC-NEG-012: Audit transport failure does not corrupt committed state

Setup:

- Make audit delivery fail after successful event/tag/check-in/attendance work
  and after a provider partial failure.

Action:

- Complete each operation.

Expected observations:

- Product/provider state follows the documented operation outcome.
- Audit failure is recorded server-side without exposing PII or rolling back
  committed work.

### TC-NEG-013: Check-in capability cannot call adjacent event APIs

Setup:

- Grant only `CHECKIN_CLUB_EVENT` to a signed-in caller.

Action:

- Call admin detail/list, attendee list/export, tag reads/mutations,
  create/update/delete, integration sync/repair, and attendance-removal
  procedures directly, then call the three documented Check-in procedures.

Expected observations:

- Every adjacent procedure returns `FORBIDDEN` without data or mutation.
- Event choices, minimal member search, and check-in remain available with
  their documented minimal payloads.

## Open questions

- None.
