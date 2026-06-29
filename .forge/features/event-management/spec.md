# Event Management Spec

Status: Ready for human approval

> This file owns the non-technical user/product intent.

## User-facing purpose

Blade should be the one place Knight Hacks officers use to create and manage
club events. A correctly created event should appear consistently in Blade,
the Knight Hacks Discord calendar, the appropriate Google Calendar, and the
public Club site or member event experience when its audience permits.

The feature should also complete the member QR workflow: authorized operators
can quickly check members into an event, while readers and editors can inspect
attendance and members can review their own event history.

## Users / actors

- Public visitors viewing upcoming Knight Hacks events on the Club site.
- Signed-in members viewing events and their own attendance history.
- Dues-paying members eligible for dues-required events.
- Members whose linked Blade roles make them eligible for selected-role events.
- Event readers who inspect event configuration and attendance.
- Event editors who create, edit, duplicate, delete, synchronize, and repair
  events and manage event tags.
- Check-in operators who scan QR codes or use minimal manual member lookup.
- Officers, who can use every club event capability.
- The Club site and reminder worker, which consume safe event information.
- Discord Scheduled Events and Google Calendar, which receive event
  projections managed from Blade.

Hackathon event managers, hackers, judges, and event-feedback reviewers are not
actors in this first slice.

## User-visible interface

### Event administration

- Event administration lives at `/admin/events` in the existing Blade admin
  shell.
- URL-addressable views provide:
  - an event list;
  - a calendar;
  - member check-in; and
  - event-tag management.
- Check-in-only users land directly in Check-in and do not see the other event
  administration views.
- The default event list shows upcoming events in ascending start-time order.
  Past events remain available and default to newest first.
- Users can search event name, description, location, and tag.
- Users can filter by upcoming or past timing, date range, tag, audience,
  internal status, selected roles, and integration health. Dues paying is an
  audience option, not a second independent filter.
- Multi-selected tags, audiences, roles, and integration states use OR within
  their category. Search and different filter categories combine with AND.
- Search, filters, selected view, sort, page size, page, and selected event are
  reflected in URL parameters.
- Page-size choices are 25, 50, 100, 250, and 500, defaulting to 25.
- The list is paginated and sortable by start time, name, tag, and attendance.
  The calendar uses the same search/filters but returns every match in its
  visible date window rather than truncating a month to one list page. On narrow
  screens, it has a readable agenda-oriented presentation.
- Event detail is shareable through `?event=<event UUID>` and uses one clearly
  sectioned dialog on desktop and mobile.
- Desktop list rows show name, tag, audience, start time, location, attendance,
  Discord health, Google health, and available actions.
- Mobile cards prioritize name, start time, location, audience, integration
  health, and the appropriate check-in or detail action.
- Readers see event details, integration health, attendance totals, and a
  minimal attendee list. They do not see mutation controls.
- Editors use a large, sectioned dialog to create and edit events.
- An unfinished create form is preserved in the current browser so an
  accidental close, navigation, or refresh does not discard the entered data.
  The user can restore or discard it when returning.
- Duplicate opens a new create dialog with reusable event details prefilled,
  but requires a valid future date and creates new Discord and Google events.
- Creating an event in the past is not allowed. End time must be after start
  time. Timed single-day and multi-day events are supported.
- Submitted events target both Discord and Google Calendar. An event is not
  exposed outside administration until both initial integrations succeed.
- If one integration fails, the event remains in administration as
  `Needs attention`. Editors can retry or repair it without recreating a
  successful projection.
- Previously exposed events remain visible if a later update fails to reach one
  provider, while administration clearly shows which provider needs attention.
- A failed edit never broadens access prematurely. Until both providers accept
  a visibility-changing edit, the eligible audience is the safe overlap of the
  previous synchronized visibility and the new policy. Narrowing applies
  immediately; newly eligible viewers wait for successful synchronization.
- Blade is the source of truth. Sync or repair re-applies Blade's event details
  to Discord and Google Calendar.
- Events remain fully editable after they have occurred. Historical attendance
  keeps the points awarded at check-in even if the event's current points are
  later changed.
- An event with attendees cannot be deleted. An event without attendees may be
  deleted after explicit confirmation.
- Provider links may be shown when readily available, but provider health and
  repair actions are the required interface.

### Event details and audiences

- Event fields include name, tag, description, start and end, location,
  audience, internal status, points, and an internal Discord channel when
  applicable.
- Event times are presented in Knight Hacks' `America/New_York` timezone and
  handle daylight-saving changes.
- A nonexistent spring-forward local time is rejected. If a fall-back time
  occurs twice, the editor must choose the first or second occurrence; Blade
  shows each option with its UTC offset before submission.
- Every event selects exactly one audience:
  - `Public`;
  - `Dues paying`; or
  - `Selected roles`.
- A selected-role event is visible in Blade when the member holds any selected
  linked role. Cosmetic roles are valid audiences.
- A Blade role referenced by any selected-role event cannot be unlinked until
  it is removed from those events. Role management shows the event dependency
  rather than silently changing historical or future event visibility.
- `Internal event` is separate from audience. It controls the internal Google
  Calendar destination and channel-backed Discord behavior.
- Internal events never appear on the public Club site. Eligible signed-in
  members may still see them in Blade.
- A selected-role event may intentionally use the public Discord calendar.
  The editor warns that Discord will then expose it more broadly than Blade.
  Editors use Internal plus an access-controlled Discord channel when Discord
  visibility must be restricted.
- Discord and Google titles use `[TAG] Event name`; Blade presents the tag and
  plain event name separately.
- Discord and Google receive consistent generated copy including location and
  points.

### Configurable event tags

- Editors manage club event tags from the Tags view.
- A tag has a name, default point value, color, and active or archived state.
- Tag names are unique without regard to capitalization.
- Zero-point tags and zero-point events are valid.
- Selecting a tag supplies its default points. An editor may override the
  points for an individual event.
- Tag edits affect future event selections. Existing events preserve the tag
  presentation and points they were created with.
- A tag used by historical events is archived rather than removed from those
  events. Archived tags cannot be selected for new events.

### Public and member event discovery

- The public Club site receives upcoming, fully synchronized, non-internal
  club events with Public or Dues-paying audiences.
- Dues-paying events remain visible publicly and display a clear dues badge.
- The public feed does not expose selected-role events, internal events,
  provider identifiers, role identifiers, attendance, or administration data.
- Signed-in members can open `/member/events` from a quick link on their member
  dashboard.
- Members see upcoming Public events, Dues-paying events, and selected-role
  events for which they are eligible.
- Unpaid members see Dues-paying events in a locked state with a clear path to
  dues payment rather than having those events hidden.
- Ineligible selected-role events are absent. Internal events follow the same
  audience eligibility but remain absent from the public Club site.
- Members can review events they attended and the points awarded for those
  check-ins. Later role or dues changes do not erase their own history.

### Check-in and attendance

- Check-in is an isolated operational view. It does not reveal full event
  details, attendee lists, exports, or event editing.
- An operator selects an event by title, then repeatedly scans member account
  QR codes without closing and reopening the scanner.
- The scanner accepts current raw account-ID QR values and legacy `user:`
  values during the Reforge transition.
- Manual fallback searches by member name, Discord username, or email and
  returns only the minimal identity needed to choose the correct member.
- Current and recently ended events are easiest to select, but authorized
  operators are not restricted to a hard check-in window.
- Check-in verifies current effective dues for Dues-paying events and current
  Blade role eligibility for Selected-role events.
- Successful, already-recorded, unpaid, ineligible, malformed, and unknown
  member scans produce fast, unmistakable feedback suited to a check-in line.
- Repeated scans are idempotent. `Already checked in` is informative and does
  not award points twice.
- Event points are determined by Blade, not by the scanner or browser.
- Event readers and editors can open a minimal attendee viewer. Check-in-only
  operators cannot.
- Editors can remove a mistaken attendance record from the attendee viewer.
  Removing a Reforge check-in subtracts the exact points awarded by that
  check-in. A migrated legacy award is visibly marked Estimated; removing one
  requires an additional acknowledgement and subtracts that stored estimate.
- Authorized event readers can export the current event's minimal attendance
  data as CSV. Spreadsheet-safe escaping is required.

### Integrations, reminders, and historical events

- Public events use a Discord external-location scheduled event.
- Internal events use an eligible Discord voice or stage channel selected from
  a searchable live picker with a manual-ID fallback.
- Google destination is chosen by the Internal toggle: the public calendar or
  the deployment-defined internal/development calendar.
- Retrying, repairing, and deleting integrations is safe to repeat.
- If an external projection was manually removed, Repair can recreate it.
- Changing Internal moves both projections to their new destination/entity
  type through recoverable replacement. Blade never leaves both the old and
  new projection active automatically.
- An ambiguous Discord create is never matched automatically by similar title,
  time, or location. Repair asks an editor to link a reviewed live candidate
  or explicitly confirm creation of a new projection.
- An already-missing provider event counts as successfully removed during
  event deletion.
- An ambiguous Discord creation with no trusted ID must be resolved before
  deletion. An editor can link the reviewed live projection or, after a fresh
  live search, explicitly acknowledge that an unlinked Discord event could
  remain and confirm no projection.
- A temporary provider deletion failure leaves the event in administration for
  retry rather than silently orphaning external data.
- Existing public event reminders continue to consume eligible Public and
  Dues-paying events while excluding internal, selected-role, hackathon, and
  initially incomplete events. A later Google-only sync failure does not stop
  a reminder when the current Discord projection remains healthy; a missing,
  failed, or ambiguous Discord projection does.
- Pre-Reforge events remain available as legacy history without attempting to
  correct the legacy one-day timestamp workaround. They are visibly historical
  and are exempt from automatic provider-health and repair expectations. Their
  edits remain Blade-only and do not rewrite old provider projections.
- A malformed legacy row that requires dues and also names roles keeps that old
  combined meaning: check-in requires effective dues and any selected role.
  New events can never create this combination.

### States and accessibility

- Event, tag, integration, and attendance actions provide pending, success,
  safe error, empty, and retry states.
- Route-level loading keeps the server-rendered admin shell stable and avoids
  page shifts.
- Destructive actions are explicit and keyboard accessible.
- Dialogs, calendar controls, scanning feedback, tables, cards, badges, and
  menus support keyboard use, reduced motion, sufficient contrast, and
  touch-friendly mobile targets.

## Scope

### In scope

- Club event list, calendar, detail, creation, editing, duplication, and safe
  deletion.
- Browser-local unfinished create-form restoration.
- Database-configurable club event tags and default points.
- Public, dues-paying, selected-role, and internal visibility behavior.
- Discord Scheduled Event and Google Calendar creation, update, retry, repair,
  and deletion.
- Public Club-site event contract and existing public reminder compatibility.
- Member event discovery and personal attendance history.
- Member QR and manual check-in, attendance viewing/correction, points, and CSV.
- Existing club event permission vocabulary and officer override.
- Legacy event/history compatibility without timestamp correction.

### Out of scope

- Hackathon event management and hacker check-in.
- Event feedback forms, ratings, and response analytics.
- General club analytics beyond event attendance.
- Recurring and all-day events.
- Event registration, capacity, waitlists, refunds, or ticketing.
- Importing events created directly in Discord or Google Calendar.
- Continuous external-edit drift detection.
- Offline or queued check-in.
- Generic officer-managed calendar destinations.
- A real Discord/Google smoke test as a completion gate.
- A general Draft/Published/Cancelled/Completed lifecycle.

## Vocabulary

- `Audience`: The one Blade eligibility rule selected for an event: Public,
  Dues paying, or Selected roles.
- `Internal event`: An event sent to the internal Google Calendar and tied to a
  Discord voice/stage channel. Internal is separate from audience.
- `Fully synchronized`: Both initial Discord and Google projections were
  created and recorded successfully.
- `Needs attention`: Administration state indicating that a provider action
  failed or is incomplete and can be retried or repaired.
- `Repair`: Recreate or reapply the Blade event to a missing or failed provider
  projection.
- `Legacy event`: A pre-Reforge historical event whose old timestamp workaround
  is preserved and whose provider health is not automatically managed.
- `Points awarded`: The event-point value captured when a member checked in.
- `Estimated points`: A best-effort migrated award for a legacy attendance row
  whose client-supplied historical value cannot be reconstructed exactly.

## Acceptance criteria

- Authorized readers, editors, check-in operators, and officers reach only the
  event views and controls granted to them.
- Club event permissions never expose or mutate hackathon events, including by
  direct UUID.
- An editor can create a future single-day or multi-day event and see it appear
  in Blade, Discord, and the selected Google Calendar.
- A partial provider failure produces a recoverable admin-only event and Repair
  completes it without duplicating the successful projection.
- Public and member event surfaces enforce their documented audience and
  internal-event rules.
- A visibility-broadening edit reaches no new viewer until both provider
  projections accept that revision; a narrowing edit takes effect immediately.
- Configurable tags supply default points, support per-event override, and
  preserve historical event presentation when tags later change or archive.
- List/calendar filters, URL state, pagination, shareable detail, responsive
  layouts, and browser-local form restoration behave consistently.
- Check-in accepts current and legacy QR payloads, enforces effective dues and
  role eligibility, prevents duplicate points, and supports minimal manual
  lookup.
- Attendance correction subtracts the captured award, CSV is safe, and members
  can see their own history. Migrated estimated awards are labeled and require
  explicit acknowledgement before correction.
- An event with attendance cannot be deleted. An empty event is removed only
  after both provider projections are absent or confirmed already missing.
- Existing public reminders remain compatible, and legacy events remain
  available without being treated as broken active integrations.

## Open questions

- None.
