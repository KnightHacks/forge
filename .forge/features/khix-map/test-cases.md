# KHIX Venue Map Test Cases

Status: Approved for first implementation slice

## Scope

Test venue parsing, live state, marker stability, access states, zoom controls,
and responsive presentation. Indoor routing and physical GPS accuracy are
excluded.

## Test placement plan

- Owner: `apps/2026`.
- Unit/component tests: `pnpm --filter=@forge/2026 test`.
- Quality: KHIX lint/typecheck/build and changed React analysis.

## Test cases

### TC-001: Known event locations plot in the correct venue building

Setup:

- Schedule events use aliases such as `ENG1 224`, `Engineering I`, `BA1`, and
  `Business Administration II 101`.

Action:

- Normalize the event locations for map display.

Expected observations:

- Each event resolves to ENG1, BA1, or BA2; room/floor information is retained
  when present.

### TC-002: Live and upcoming event state is accurate

Setup:

- Events occur before, across, and after a fixed current timestamp.

Action:

- Derive map event state.

Expected observations:

- Events are labeled upcoming, live, or ended at the correct boundaries.

### TC-003: Map interaction remains operable without pointer gestures

Setup:

- A checked-in hacker opens the populated map.

Action:

- Use zoom in, zoom out, and reset controls; select a building/event.

Expected observations:

- View changes are visible, controls expose accessible labels, and selection
  presents the same destination detail available to pointer users.

### TC-004: Indoor position is explicit

Setup:

- Browser location is available near campus.

Action:

- Request location, then choose an indoor venue location.

Expected observations:

- GPS appears only as an approximate campus marker; room/floor position appears
  only after the hacker chooses it.

### TC-005: Map keeps the portal session and schedule access boundaries

Setup:

- Run KHIX against Blade in development or production.

Action:

- Open `/dashboard/map` signed out, then as a signed-in participant.

Expected observations:

- Signed-out visitors follow the existing sign-in flow; no preview bypass exists.
- Signed-in participants can use the map.
- Only confirmed and checked-in participants can load the schedule.
- Judging and attendance still require check-in.

## Negative / regression cases

### TC-NEG-001: Unknown schedule location is not fabricated

Setup:

- An event location is blank, TBA, online, or names an unsupported building.

Action:

- Render the map and event list.

Expected observations:

- The event remains in the textual list with its original/TBA label and no fake
  marker is added to a venue building.

### TC-NEG-002: Location permission denied

Setup:

- Browser geolocation permission is denied or unavailable.

Action:

- Hacker selects `Locate me`.

Expected observations:

- The map remains usable and explains that the hacker can set an indoor
  location manually.

## Open questions

- Final event-week food/help rooms must be confirmed by organizers.
