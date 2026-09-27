# Club Event Details and Date Layout Test Cases

Status: Approved

## Scope

Test public event date readability, complete-description recovery, dialog
accessibility, and preservation of existing metadata. API contracts, event
editing, registration, and database behavior are excluded.

## Test placement plan

- Vitest tests live under `apps/club/src/tests` and run with
  `pnpm --filter=@forge/club test`.
- Browser acceptance uses the local Club server at `http://localhost:3001`.

## Test cases

### TC-001: Event dates read as one ordered block

Setup:

- A public event has a valid start date.

Action:

- Club renders the event date component.

Expected observations:

- The abbreviated month appears before the two-digit day number.
- The abbreviated weekday appears after the day number.
- Assistive technology receives one complete date label.

### TC-002: A visitor opens complete event details

Setup:

- A public event has a description longer than two preview lines and includes
  the existing public metadata.

Action:

- The visitor activates `View details`.

Expected observations:

- A dialog opens without navigating away or changing the selected calendar day.
- The full description is readable without a line clamp.
- The event name, date, time, location, type, and access badge are present.

### TC-003: A visitor dismisses event details

Setup:

- The event details dialog is open.

Action:

- The visitor presses Escape or activates the close control.

Expected observations:

- The dialog closes and focus returns to the originating `View details` control.

## Negative / regression cases

### TC-NEG-001: Preview density and existing states remain intact

Setup:

- Events include a long Markdown description, and the event feed can still be
  loading, empty, or unavailable.

Action:

- The visitor browses Home, Calendar, and Upcoming Events at desktop and mobile
  widths.

Expected observations:

- Event rows retain compact previews and do not overflow the document.
- Markdown links remain usable in the details dialog.
- Existing loading, empty, and error states render unchanged.

## Open questions

- None.
