# Club Event Details and Date Layout Spec

Status: Approved

## User-facing purpose

Visitors should be able to scan upcoming Club events quickly and open any event
to read its complete description. Dates should read as a single unit instead of
splitting the month and weekday away from the day number.

## Users / actors

- Public visitors browsing Knight Hacks Club events.
- Members deciding whether an event is relevant to them.

## User-visible interface

- Homepage Upcoming Events rows.
- Calendar event cards on the Events page.
- Upcoming Events rows on the Events page.
- Each event keeps a compact two-line preview and gains a `View details` action.
- The details view shows the event name, full description, date, time, location,
  event type, and access requirement.
- Dates appear in one block ordered as abbreviated month, large day number, then
  abbreviated weekday.

## Scope

### In scope

- Full event descriptions are available without relying on hover.
- A consistent date treatment is used across all public Club event surfaces.
- Existing event metadata, tags, access badges, loading states, error states,
  filtering, and pagination remain intact.

### Out of scope

- Editing events or event descriptions from Club.
- Adding registration, check-in, or per-event Blade links.
- Changing Blade, the Forge API, database schemas, or event data contracts.
- Reworking the broader Club page layout or resizing cards around one event.

## Vocabulary

- `Event preview`: The compact event summary shown directly in an event row.
- `Event details`: The secondary view containing the event's complete public
  information.

## Acceptance criteria

- Every populated Club event row exposes a visible `View details` action.
- Activating `View details` reveals the full description and existing public
  metadata while preserving the visitor's place on the page.
- The details view supports keyboard operation and normal dismissal.
- The month, day number, and weekday read as one date block in that order.
- The behavior works on desktop and mobile without document overflow.

## Open questions

- None. The behavior and non-goals were confirmed in issue #518 and the
  follow-up implementation request.
