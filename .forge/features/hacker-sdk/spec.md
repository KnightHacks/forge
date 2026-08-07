# Hacker SDK Spec

Status: Approved

## User-facing purpose

Knight Hacks should be able to build a new themed hackathon frontend without
rebuilding participant accounts, application rules, data storage, or event
systems. Each hackathon site owns its visual design and participant experience.
Forge owns the durable hacker profile, each hackathon application, status
changes, files, attendance, points, and operational integrations.

The SDK gives Forge React apps a stable set of participant actions and state.
It should make a new hacker portal fast to build without prescribing the page's
theme, layout, components, or form steps.

Knight Hacks IX is the sole live SDK consumer in this release. Ended hackathon
sites retain their historical presentation, but their application calls to
action and participant/auth routes are removed silently so they do not depend
on either the SDK or retired legacy APIs.

This feature also gives officers explicit control over whether a hackathon's
events appear in Discord and Google Calendar. Officers can prepare a complete
schedule privately in Forge, then publish or remove the full calendar without
editing every event.

## Users / actors

- Hackers applying to and attending a Knight Hacks hackathon.
- Forge developers building a yearly themed hackathon frontend.
- Officers who configure hackathons, manage applications, and control calendar
  publication.
- Check-in volunteers who use the existing Hackathon Check In experience.
- Discord users and public calendar viewers who see published hackathon events.
- Forge's reminder service, which announces published Discord events.

Club members and club dues are not part of this experience. A hacker may also
be a club member, but membership is never required to apply or use the hacker
portal.

## User-visible interface

### Yearly hackathon sites

Each site may design its own pages and flows while using the same participant
capabilities:

- Sign in through Forge and return to the same hackathon site.
- Start an application with reusable profile details prefilled.
- Choose a school from the shared catalog or enter its name when it is not
  listed.
- Submit the base Knight Hacks application and the current hackathon's
  first-time-hacker answer.
- Return to an existing application without creating a duplicate.
- Edit application and profile details until the hackathon starts.
- Upload, replace, download, and remove a PDF resume.
- See application status and the actions currently available.
- Confirm attendance after acceptance.
- Withdraw an eligible application before the event starts.
- Retrieve a check-in QR code without joining the club.
- After whole-hack check-in, see the schedule, timeline, personal event
  attendance, point history, total points, and leaderboard.

The SDK supplies state and actions, not rendered components. The themed site
owns copy, layout, animation, form grouping, and styling, except that it must
present required legal text and destructive confirmations accurately.

### Withdrawal

Pending, waitlisted, accepted, and confirmed hackers may withdraw before the
hackathon starts. The site must show a confirmation dialog which says the
withdrawal is irreversible. The action does not offer a self-service undo.
Denied and checked-in hackers cannot withdraw. Officers retain their existing
correction tools.

### Status and participant data

One hacker profile is reused across hackathons. Reusable values prefill a new
application. First-time status is asked again for each hackathon and never
copied from the reusable profile.

Profile edits apply to all applications for hackathons that have not started.
When a hackathon starts, the participant information used by organizers and
sponsors for that hackathon stops changing. An overlapping future hackathon
remains editable until its own start.

Age is calculated from date of birth at the relevant time. Forge does not store
a copied age. Minors may apply and confirm; organizers see the minor flag, and
the existing prominent under-18 check-in warning remains.

### Schedule, points, and leaderboard

The participant schedule is sourced from Hackathon Events and remains hidden
until the hacker is checked in to the whole hackathon. Public Discord or Google
calendars may reveal events earlier; that does not unlock the private SDK
schedule.

Confirmed and checked-in hackers can view the hackathon leaderboard. It uses
only Hackathon Event points and supports the configured number of classes. It
shows first name plus last initial, highlights the signed-in hacker, and offers
overall and class views. VIP hackers remain in their assigned class ranking.

Checked-in hackers can see their own attendance occurrences, including repeats,
and the points awarded for each occurrence. A repeated check-in may appear in
history but never awards the same event's points again.

### Calendar publication controls

The Hackathon Events page shows independent Discord and Google Calendar
publication switches beside the selected hackathon's event actions. Only
officers who can edit Hackathon Events may change them.

For a new hackathon, both providers start off. Events can be created, edited,
duplicated, and deleted in Forge without appearing in either external calendar.
Provider-specific content rules are still enforced so the complete schedule can
be published later without preventable validation failures.

Enabling a provider publishes every event for the selected hackathon, including
its primary check-in event, and keeps later changes synchronized. Disabling a
provider removes every external event for that hackathon while retaining the
Forge records.

Disabling requires a confirmation dialog that names the provider and number of
external events Forge expects to remove. Once confirmed, the requested switch
state remains visible while Forge reports removal progress.

Bulk publication and removal may complete gradually. The page shows counts for
completed, pending, failed, and manually blocked events. Forge retries safe
failures automatically and provides an immediate retry action. Ambiguous
Discord outcomes use the existing candidate review instead of risking duplicate
events.

Discord announcement reminders are independent of Discord Scheduled Event
publication. When the calendar is off, the configured announcement channel
still receives the reminder and configured hackathon-role ping from Forge's
database event. The reminder omits the Scheduled Event link. Google Calendar
publication has no effect on Discord reminders.

## Scope

### In scope

- A Forge-monorepo React SDK and first-class React hooks.
- A Blade-hosted participant API and an opinionated site-side auth adapter.
- Registered `*.knighthacks.org` sites and any registered localhost port in
  development.
- Sign-in, callback, session restoration, retry, and sign-out behavior.
- Reusable hacker profiles and one application per user per hackathon.
- Base application submission, prefill, editing, and duplicate-safe retries.
- Per-hack first-time status.
- Versioned Knight Hacks and MLH agreements and acceptance records.
- Confirmation and irreversible self-withdrawal.
- PDF resume upload, replacement, download, and removal.
- Hacker QR retrieval independent of club membership.
- Status-gated schedule/timeline, personal attendance, points, and leaderboard.
- Independent Discord and Google Calendar publication controls for Hackathon
  Events.
- Bulk reconciliation, progress, durable retry, and manual repair visibility.
- Safe migration of existing hackathons and external events.
- SDK documentation and an example consumer suitable for future yearly sites.
- A complete Knight Hacks IX consumer, with its checked-in schedule sourced
  from Hackathon Events.
- The complete current Knight Hacks IX frontend from regular `main`, including
  its landing page, navigation, themed application, dashboard, responsive
  interactions, credits, and assets. Its legacy platform integration is
  replaced by the SDK without substituting an older KH IX presentation.
- Static historical KH VIII, GemiKnights, and BloomKnights sites with dead
  application entry points and legacy participant dependencies removed.

### Out of scope

- A styled component library, theme, required layout, or fixed application-step
  flow.
- Support for repositories outside Forge, non-React frameworks, or arbitrary
  production domains.
- Officer-authored custom application questions in this release. The contract
  may reserve a future extension point.
- Past-hackathon history in the participant portal.
- Team-based leaderboards or points outside Hackathon Events.
- Changes to officer application review, primary check-in, class assignment,
  VIP behavior, or club event attendance.
- Automatic legal or participation rejection based only on age.
- Retrofitting ended hackathon sites with the SDK.

## Vocabulary

- `Hacker profile`: reusable person-level information owned by the signed-in
  user.
- `Application`: the hacker's participation record for one hackathon.
- `Participant API`: Forge's authenticated interface for a yearly hackathon
  site.
- `Site adapter`: the Forge-provided server integration that completes sign-in
  and calls the participant API for one configured hackathon.
- `First-time hacker`: a self-declared answer stored for one hackathon, not a
  permanent profile trait.
- `Profile revision`: a recorded version of reusable profile details.
- `Pinned profile`: the profile revision retained for one hackathon when that
  hackathon starts.
- `Publication`: the desired presence of a hackathon's events in one external
  calendar provider.
- `Converged`: every event matches the selected provider's requested state.
- `Degraded`: publication is requested but at least one event needs retry or
  manual repair.
- `Primary check-in`: the single event that admits a confirmed hacker to the
  whole hackathon and sets the checked-in status.

## Acceptance criteria

- A new Forge React hackathon site can implement its own application and hacker
  dashboard without importing Forge database, admin API, auth secrets, storage,
  email, or Discord clients.
- Authentication returns the hacker to the requesting registered site and
  restores a site-scoped session on registered production and localhost origins.
- The server, not a browser-supplied hackathon name, determines which hackathon
  every participant request belongs to.
- A retry or double submission cannot create a second application for the same
  user and hackathon.
- A returning hacker receives reusable profile prefill but must answer
  first-time status again.
- A school missing from the shared catalog can be entered, saved, prefilled,
  and edited like a catalog school.
- A hacker can edit allowed data until the hackathon starts. The pinned
  organizer/sponsor view for a started hackathon does not change afterward.
- Confirmation, withdrawal, resume, QR, status, schedule, attendance, points,
  and leaderboard behavior follows the rules in this spec.
- The withdrawal action cannot run without the themed site presenting the
  irreversible confirmation.
- The SDK does not reveal blacklist state, internal notes, provider IDs,
  operator-only check-in details, storage object names, or private audit data.
- A new hackathon's events remain database-only until an officer enables a
  provider.
- Existing hackathons retain their current external publication behavior after
  rollout.
- Enabling either provider reconciles all existing events and future changes;
  disabling it removes only that provider's projections and never deletes the
  Forge events.
- Publication progress and provider errors remain visible across refreshes.
- Safe failures retry automatically. Ambiguous Discord writes do not create
  duplicates and remain actionable for an officer.
- Discord reminders still run from Forge data while Discord publication is
  disabled, without a Scheduled Event link.
- All meaningful participant and publication mutations are auditable without
  recording sensitive payloads.

## Open questions

None. The owner delegated remaining decisions for this feature on 2026-08-06.
