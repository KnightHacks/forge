# Hackathon Events Spec

Status: Approved 2026-08-05. First-time-hacker compatibility and primary-event
reminder behavior remain follow-ups for the SRD.

> This file owns the non-technical user/product intent. It records the owner's
> stated requirements and keeps unresolved policy visible rather than guessing.

## User-facing purpose

Officers need one place to create and operate a hackathon's schedule, attendance,
points, Discord events, Google Calendar events, and reminders without mixing
those events into the Club event feed.

The same feature must run two related check-in workflows:

- **Primary check-in** admits a confirmed applicant to the hackathon as a whole,
  records who admitted them and when, assigns their configured class, grants the
  hackathon's Discord roles, and gives the volunteer the identity, class, and
  VIP facts used during the line.
- **Event check-in** records attendance at a workshop, meal, ceremony, or other
  event during the hackathon. A station can call one configured class or all
  classes and can deliberately permit repeat attendance without awarding points
  more than once.

Primary check-in is explicit. It is never inferred from an event name, tag, or
other magic text.

## Users / actors

- Hackathon event readers who inspect events, integration health, attendance,
  and check-in history.
- Hackathon event editors who create, edit, duplicate, delete, synchronize, and
  repair hackathon events.
- Hackathon check-in operators who scan hackers and need fast, persistent,
  line-friendly results without receiving unrelated event-management access.
- Officers, who can configure the per-hackathon Discord role and announcement
  destination and use every hackathon event capability.
- Confirmed applicants arriving for primary check-in.
- Checked-in hackers attending ordinary hackathon events.
- Discord Scheduled Events, Google Calendar, and the reminder worker, which
  receive or deliver hackathon event information managed from Blade.

Club members browsing or checking into Club events are not hackathon-event
actors. Hackathon event access must not broaden Club event access, and Club event
access must not grant hackathon event access.

## User-visible interface

### Hackathon event administration

- A selected hackathon has an Events workspace in its existing administration
  area. Every event shown there belongs to that hackathon; events from another
  hackathon or the Club feed never appear.
- Readers and editors receive the same core event-management experience already
  established for Club events: list, calendar, shareable detail, search,
  filters, upcoming/past views, attendance totals, integration health, and
  responsive desktop and mobile layouts.
- Editors can create, edit, duplicate, and safely delete events. Event details
  include name, tag, description, start and end, location, points, internal
  status, the applicable Discord channel, and an explicit purpose of `Event` or
  `Primary check-in`.
- A hackathon can have at most one primary-check-in event. The purpose control,
  not the event's tag or name, determines that behavior.
- Hackathon event tags and points follow the established event behavior:
  configurable tag defaults may be overridden per event, zero points are valid,
  and later event edits never rewrite points already awarded.
- Event points are determined by Blade. A scanner, browser, or volunteer never
  supplies or changes the award during check-in.
- Readers can inspect the minimal attendance list and export it safely. Editors
  can correct mistaken ordinary-event attendance while preserving an exact
  points history.
- Event management provides pending, success, empty, error, retry, and repair
  states suitable for a live hackathon.
- Blade navigation has separate `Hackathon Events` and `Hackathon Check-in`
  entries with distinct icons and independent permission visibility. The
  desktop navigation rail scrolls when its entries exceed the viewport while
  keeping Settings reachable; the mobile drawer retains its existing scrolling
  behavior.

### Hackathon configuration additions

The selected hackathon's configuration screen adds:

- one **general hacker Discord role**, granted to every hacker admitted through
  primary check-in and used to ping that hackathon's hackers;
- one **event announcement channel**, where that hackathon's event reminders are
  delivered; and
- the already established arbitrary list of classes and optional VIP entry,
  each with its linked Discord role and display color.

These values are configured per hackathon. No class count, class name, role, or
announcement destination is hard-coded for a particular year.

The configuration screen makes readiness clear before doors open. It identifies
missing general-role, announcement-channel, class-role, or VIP-role links that
would prevent the requested check-in or reminder behavior.

### Discord, Google Calendar, and reminders

- Blade is the source of truth for each hackathon event and manages a matching
  Discord Scheduled Event and Google Calendar event with the same create,
  update, health, retry, repair, replacement, and safe-delete behavior as Club
  events.
- The established Internal behavior is preserved: a non-internal event uses an
  external-location Discord Scheduled Event and the public Google Calendar; an
  internal event uses an eligible Discord voice/stage channel and the internal
  Google Calendar.
- A failed initial projection keeps the event in administration as needing
  attention rather than exposing an incomplete event as healthy.
- A later provider failure remains visible and repairable without duplicating a
  projection that already succeeded.
- Hackathon projections do not make the event a Club event and do not expose it
  through Club discovery, Club attendance, or Club permissions.
- The normal Club reminder selector continues to reject every event tied to a
  hackathon. Hackathon events use a separate reminder path.
- Upcoming hackathon-event reminders are sent to the announcement channel
  configured for that hackathon and ping that hackathon's general hacker role.
  They never use one global, year-specific webhook or role.
- The reminder names and links the matching Discord Scheduled Event and includes
  the event's timing and location.
- The proposed first-slice cadence preserves the current hackathon operation: a
  reminder approximately fifteen minutes before an event begins, delivered at
  most once for that event and reminder window.
- A reminder is not sent when its current Discord event cannot be linked safely
  or its delivery channel or hacker role is missing. Administration surfaces the
  configuration or integration problem instead of silently sending elsewhere.

### Check-in workspace

- Check-in operators use a dedicated hackathon check-in workspace that does not
  expose event editing, full applications, exports, or provider controls.
- The operator selects the hackathon and event, then uses Scanner or Manual
  check-in. Scanner remains ready for a line of QR codes; Manual lookup requires
  an explicit Check in action.
- Only events belonging to the selected hackathon are selectable.
- The selected event makes it unmistakable whether the station is admitting a
  hacker to the whole hackathon or recording attendance at an ordinary event.
- A station has a mutable **Called class** control containing every class
  configured for that hackathon plus `All classes`. The operator can change it
  at any time without editing the event.
- An ordinary-event station also has an explicit **Allow repeat attendance**
  setting. It is off by default and belongs to that station's current operating
  session, not to the event.
- The workspace stays compact and touch-friendly on a phone or tablet and keeps
  event choice, called class, repeat state, scanner/manual mode, and the latest
  result easy to reach.

### Primary hackathon check-in

- Only an applicant whose current status is `Confirmed` can complete a first
  primary check-in.
- First primary check-in changes the applicant to `Checked in` and records the
  check-in time and operator.
- The hacker is assigned exactly one configured class with the smallest current
  headcount. Ties are resolved consistently. The number of classes is arbitrary:
  six is a normal configuration, not a coded limit.
- Class assignment is safe when several stations admit hackers at the same time;
  the resulting split must not be based on stale counts.
- VIP remains independent of class. A VIP still receives a normal class and is
  visibly identified as VIP.
- A successful primary check-in grants the hackathon's general hacker Discord
  role, the assigned class role, and the VIP role when the hacker is already
  marked VIP.
- Primary check-in also records attendance and awards the primary event's points
  once.
- Scanning an already checked-in hacker is informative and awards no additional
  points, changes no class assignment, and grants no duplicate attendance. It
  returns the existing assignment and VIP status so a volunteer can
  recover from an accidental dialog close.
- Applicants in Pending, Accepted, Waitlisted, Denied, or Withdrawn status are
  refused with a prominent result that names the status without changing it.

### Ordinary hackathon event check-in

- A hacker must already be checked into the hackathon before they can be checked
  into one of its ordinary events.
- When one class is called, a hacker in that class may check in. A hacker marked
  VIP may check in regardless of their assigned class. Other classes receive a
  clear class-eligibility result and no attendance or points.
- When `All classes` is called, any checked-in hacker may attend.
- With repeat attendance off, another scan of the same hacker reports
  `Already checked in` and changes neither attendance nor points.
- With repeat attendance on, each deliberate accepted rescan records another
  attendance occurrence, but only the first attendance for that hacker and
  event awards the configured points. Every later occurrence awards zero.
- Changing the called class or repeat setting affects later attempts only. It
  never rewrites earlier attendance.
- Manual check-in remains idempotent and does not create repeat occurrences by
  merely choosing the same hacker again.

### Persistent result dialog and check-in history

- Every resolved primary or ordinary check-in opens a high-visibility result
  dialog designed for a noisy check-in line.
- The dialog never closes itself. Only the check-in operator dismisses it.
- The result is intentionally compact: outcome treatment, assigned class
  name/color and VIP status at the top, then the hacker's full name and date of
  birth. Points, first-time status, recorded time, operator, and role-delivery
  detail stay out of this volunteer-routing dialog.
- When the hacker is under 18 at the actual time of check-in, calculated from
  their date of birth, the dialog displays an unmistakable high-severity minor
  warning above the identity and class details. A Discord avatar or username is never
  presented as identity proof.
- Unknown, malformed, wrong-status, not-yet-admitted, wrong-class, already
  attended, integration-error, and successful results use distinct language and
  visual treatment. A volunteer should not need to infer what happened from a
  generic toast.
- Closing the dialog never loses the result. Authorized operators can open a
  recent check-in history, choose an attempt, and reopen its complete result.
- History is newest first and identifies the event, outcome, hacker, operator,
  timestamp, class/VIP status, points from that attempt, and any unresolved
  Discord-role problem.

The result does not contain configurable routing or volunteer-instruction copy.
Knight Hacks handles those instructions in volunteer briefings; Blade supplies
only the identity, age, class, and VIP facts needed to route the hacker.

### First-time hacker status

- `First-time hacker` is a fact about one hacker's application to one
  hackathon. Editing or reusing the hacker profile for a later hackathon must
  not rewrite an earlier hackathon's badge, filter result, or future analytics.
- Hacker management reads the selected hackathon's first-time value for its
  roster filter, applicant badge, and detail field.
- The compatibility period may fall back to the profile answer when the
  selected hackathon's attendee record has no snapshot. Once a per-hackathon
  answer exists, it wins over the mutable profile value.
- A successful primary check-in must not leave a first-time attendee looking
  like a first-timer forever on later hackathons. The exact compatibility write
  point and migration rule are settled in the SRD before implementation.
- Historical rows whose answer cannot be reconstructed remain unknown rather
  than being labeled Returning.

### Hacker detail event panel

- The pending **Hackathon events** panel in the hacker detail dialog is completed
  in this slice.
- It shows attendance only for the hackathon currently being managed, never the
  Club event feed or another hackathon.
- The panel distinguishes primary admission from ordinary event attendance and
  shows event name, occurrence time, points awarded, and the operator where
  available.
- Repeat ordinary attendance remains visible as separate occurrences, including
  zero-point repeats, so the panel explains the hacker's real event history.
- Empty, loading, unavailable, and error states are explicit; the existing
  placeholder copy is removed.

## Scope

### In scope

- Hackathon-scoped event list, calendar, detail, creation, editing, duplication,
  safe deletion, tags, points, attendance, and CSV export.
- Explicit ordinary-event and primary-check-in purposes with one primary event
  per hackathon and no magic tag convention.
- Discord Scheduled Event and Google Calendar projection with health, retry,
  repair, replacement, and safe-delete behavior.
- Per-hackathon general hacker Discord role and announcement-channel
  configuration.
- Per-hackathon reminders delivered to that channel and pinging that role.
- Whole-hackathon admission from Confirmed to Checked in with time, operator,
  class assignment, VIP visibility, and Discord role grants.
- Arbitrary configured class counts, least-populated assignment, per-station
  class calling, `All classes`, and VIP class-boundary bypass.
- Ordinary event attendance, first-attendance points, deliberate zero-point
  repeats, and attendance correction.
- Persistent operator-controlled results and reopenable check-in history.
- Full name and date of birth for line-side identity verification and a
  prominent date-derived under-18 warning.
- Completion of the hackathon-event attendance panel in hacker details.
- Per-hackathon first-time-hacker storage plus roster badge, filter, and detail
  compatibility during the profile-field cutover.
- Separate Hackathon Events and Hackathon Check-in navigation entries and a
  viewport-safe scrollable admin navigation rail.
- Existing hackathon event permissions and officer override, wired without
  broadening Club permissions.

### Out of scope

- Removing or weakening the Club-event hackathon fence.
- Showing hackathon events in Club public discovery, member event history, Club
  analytics, Club feedback, or Club reminders.
- Hacker or class leaderboards.
- Judging, team formation, project submission, prizes, or hacker-event feedback.
- Assigning VIP during the scanning action; check-in consumes the hacker's
  existing VIP status.
- Hard-coded class names, a fixed six-class limit, a global hacker role, or a
  global hackathon-reminder webhook.
- Offline or queued check-in.
- Treating a Discord account, avatar, or role as government-ID verification.
- A general-purpose announcement campaign system beyond event reminders.
- The hacker-facing account QR. The future dashboard SDK/hackathon dashboard
  slice owns QR retrieval; this slice only accepts the resulting account QR.
- Configurable volunteer routing or instruction copy.

## Vocabulary

- `Hackathon event`: An event owned by one hackathon and excluded from the Club
  event domain.
- `Event purpose`: The explicit choice between an ordinary hackathon `Event` and
  `Primary check-in`.
- `Primary check-in`: The one event that admits a Confirmed applicant to the
  hackathon as a whole and records their initial attendance.
- `Called class`: The class a scanner station is currently admitting to an
  ordinary event, or `All classes`.
- `Class`: One configured themed logistics group. A hacker receives exactly one
  at primary check-in.
- `VIP`: An independent hacker flag that bypasses called-class boundaries and
  grants the configured VIP role in addition to a normal class role.
- `General hacker role`: The per-hackathon Discord role granted to every admitted
  hacker and pinged by that hackathon's event reminders.
- `Repeat attendance`: An operator-enabled ordinary-event mode that permits
  additional attendance occurrences while awarding points only on the first.
- `Check-in history`: Reopenable operational results retained so closing a result
  does not lose identity, class/VIP, points, or role-delivery information.
- `First-time hacker`: The applicant's answer for one hackathon, preserved on
  that hackathon's attendee record rather than treated as a timeless profile
  fact.

## Acceptance criteria

- Hackathon event readers, editors, and check-in operators reach only the
  surfaces and actions their hackathon permissions grant.
- Club event queries, pages, reminders, check-in, analytics, and permissions do
  not reveal or mutate hackathon events, including by direct event identifier.
- An editor can create an ordinary or primary hackathon event and manage its
  Blade, Discord, and Google Calendar state without using a magic tag.
- No hackathon can have more than one primary-check-in event.
- Reminders use the selected hackathon's announcement channel and general hacker
  role, and the same event never produces duplicate reminders for one window.
- Only Confirmed applicants complete first primary check-in. Success records
  Checked in status, operator, time, class, attendance, and points together.
- Concurrent primary check-ins assign one of any number of configured classes
  from current headcounts without exceeding a coded six-class model.
- Primary check-in grants the general and class roles plus VIP when applicable,
  and the result states the health of those grants.
- A primary rescan preserves the original status, assignment, time, and points
  while returning the class and VIP information again.
- Ordinary check-in enforces the station's current called class, permits VIP
  bypass and All classes, and requires whole-hack admission first.
- Repeat mode creates visible additional ordinary-event occurrences with zero
  additional points; default and manual repeat attempts remain idempotent.
- Every resolved attempt presents a dialog that stays open until dismissed and
  can later be reopened from check-in history.
- The result gives volunteers full name, date of birth, class/color, and VIP,
  with an unmistakable warning when the hacker is under 18 at that moment.
- The hacker detail panel shows only that hacker's attendance for the selected
  hackathon and explains repeat occurrences and awarded points.
- Hacker management's first-time badge, detail, and filter use the selected
  hackathon's preserved answer; later profile edits do not rewrite prior
  hackathons, and unrecoverable history is not mislabeled Returning.
- Hackathon Events and Hackathon Check-in appear as separate permission-aware
  navigation entries, and every permitted entry remains reachable when the
  desktop rail exceeds the viewport.
- Hacker and class leaderboards remain absent from this slice.

## Open questions

- None. Primary-check-in events receive ordinary Discord/Google projection but
  never enter the reminder selector. The temporary first-time bridge snapshots
  the profile answer on first successful admission, reads attendee-first with a
  profile fallback, and represents unrecoverable history as `unknown`.
