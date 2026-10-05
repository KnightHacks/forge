# KHIX Map Room Access and Active HEC

Status: Approved for implementation (issue #581)

## Purpose and users

Officers configure the rooms hackers may use during a hackathon in Blade. Hackers see that configuration in the existing KHIX venue map and navigate directly to buildings and rooms.

## Accepted behavior

- Map stays visible but locked in dashboard navigation until the first day of the hackathon in its local timezone (Friday, October 9 for KHIX). Only confirmed and checked-in participants unlock it. The direct map route and participant configuration API enforce the same eligibility; all other statuses remain locked.
- One room list per hackathon: building, room number, optional name, and a separately saved restriction toggle.
- Preparing the list does not enable restrictions. Missing configuration means restrictions off.
- Known bathrooms stay blue. Only the owner's 43-room event roster receives available-room styling and activity highlights. Other room outlines retain their verified numbers, with muted diagonal stripes and an Unavailable legend entry. Organizer restrictions can further narrow the roster. Event rooms are gray, bright green during live activity, or green outlined when activity starts within 60 minutes. Live wins over upcoming activity.
- Locate opens mapped event rooms; other numbers show a building-level fallback explaining that the room is not part of Knight Hacks. Focusing never changes access appearance. Stairs, elevators, hallways and check-in remain identifiable.
- Selecting a building with floor plans opens its first supported floor. Locating a known room opens its floor.
- HEC is an active venue, event destination, and Locate choice with one continuous first-floor plan. Requests for rooms without verified positions show the building and explain that the exact room location is unavailable.
- Seed bathroom metadata only from existing ENG2 MEN/WOMEN labels. Other bathrooms remain unclassified until verified data arrives.
- Optional configured room names accompany permitted room numbers.
- Live rooms use green highlighting without repeated LIVE badges. Event details and selection outlines retain activity and navigation feedback.
- The campus overview omits per-event circular markers. Building activity highlights and LIVE counts remain; the events panel opens rooms or buildings.
- Event details and the event list share one bottom drawer using the map overlay surface and portal typography. Live now and Upcoming remain available indoors. A labeled X dismisses details; long content scrolls while the close control remains visible.
- Mobile keeps a compact building/floor bar and 44px controls. The room key and location form open on demand, with only one secondary surface open at a time. No permanent gesture hint covers the map.
- Floor plans fit the visible space between the controls and drawer. Pinching out stops at the floor overview; Back returns to campus. Opening the event drawer preserves manual camera position.
- Room suggestions cover the owner's 43 unique event rooms. Lookup accepts leading zeros and Student Union names/combined ballroom numbers. Engineering II includes its verified third-floor rooms. The owner clarified that booking hours are context only and should not appear on the map.

## Boundaries

This controls map presentation, not physical access. Events are expected to use permitted rooms and never grant permission automatically. No event-creation, judging, or separate schedule behavior changes. Keep the established Blade and KHIX visual systems. No invented HEC geometry or bathroom classifications.
