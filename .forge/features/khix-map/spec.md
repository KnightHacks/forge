# KHIX Venue Map Spec

Status: Approved for first implementation slice

## User-facing purpose

Checked-in Knight Hacks IX hackers need one map inside their dashboard that
shows the event footprint, what is happening now, and where food, help, and
other hack services are located. It should reduce the need to cross-reference
the schedule with a separate campus map.

## Users / actors

- Checked-in Knight Hacks IX hackers navigating the venue.
- Organizers indirectly, through the existing published event schedule.

## User-visible interface

- A `Map` destination in the Hacker dashboard navigation.
- A zoomable and pannable campus map centered on Engineering I, Business
  Administration I/II, Student Union, and L3Harris Engineering Center.
- Engineering I and Business Administration I/II are identified as the KHIX
  venue; Student Union and HEC are orientation landmarks.
- Live and upcoming events appear at their schedule locations with clear
  current/upcoming states.
- Filters help hackers find events, food, help, and other destinations.
- A selected destination opens concise details and a direct focus action.
- Browser location may orient the hacker outdoors. Indoor location is explicitly
  set by the hacker because browser GPS cannot reliably identify a room/floor.

## Scope

### In scope

- Dashboard map route and navigation.
- Semantic zoom from campus buildings to venue/room labels.
- Mouse, trackpad, touch, and keyboard zoom/pan controls.
- Existing schedule data refreshed while the map is open.
- Event, food, help, landmark, and current-location markers.
- Responsive desktop and mobile layouts.

### Out of scope

- Turn-by-turn indoor routing.
- Automatic room-level positioning, Bluetooth beacons, or Wi-Fi triangulation.
- Editing venue locations or event locations from KHIX.
- Claiming unverified architectural floor plans are exact.
- Adding Engineering II to the KHIX occupied footprint.

## Vocabulary

- `Venue building`: Engineering I, Business Administration I, or Business
  Administration II.
- `Landmark`: Student Union or L3Harris Engineering Center, shown for campus
  orientation but not represented as KHIX-occupied space.
- `Live event`: An event whose start/end range contains the current time.
- `Indoor position`: A hacker-selected building/floor/room label.

## Acceptance criteria

- Every signed-in Hacker dashboard user can open Map; check-in is not required.
- The initial view shows all five researched UCF buildings in their correct
  relative campus positions.
- Hackathon-occupied buildings are visually distinct from landmarks.
- Users can zoom, pan, reset, and focus a selected destination.
- Schedule locations matching ENG1, BA1, or BA2 appear on the map.
- Live events are distinguishable without relying on color alone.
- Unsupported or TBA locations remain available in the event list without being
  plotted at a fabricated location.
- Indoor position is never inferred from inaccurate GPS.
- The feature is usable at 320px width and with reduced motion enabled.

## Open questions

- Exact room/floor diagrams can replace the first-slice schematic when organizers
  provide approved floor plans.
- Food/help service markers begin as clearly labeled event-week configuration;
  organizers should confirm final rooms before production deployment.
