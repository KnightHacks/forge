# KHIX Map Room Access and Active HEC

Status: Approved for implementation (issue #581)

## Purpose and users

Officers configure the rooms hackers may use during a hackathon in Blade. Hackers see that configuration in the existing KHIX venue map and navigate directly to buildings and rooms.

## Accepted behavior

- One room list per hackathon: building, room number, optional name, and a separately saved restriction toggle.
- Preparing the list does not enable restrictions. Missing configuration means restrictions off.
- Known bathrooms stay blue. With restrictions on, unlisted rooms are muted red without numbers or names. Permitted rooms are gray, bright green during live activity, or green outlined when activity starts within 60 minutes. Live wins over upcoming activity.
- Locate can find any mapped room, including unlisted rooms; focusing never changes its access appearance.
- Selecting a building with floor plans opens its first supported floor. Locating a known room opens its floor.
- HEC is an active venue, event destination, and Locate choice. Until verified plans exist, indoor requests focus its campus footprint and say “Indoor plan unavailable.”
- Seed bathroom metadata only from existing ENG2 MEN/WOMEN labels. Other bathrooms remain unclassified until verified data arrives.
- Optional configured room names accompany permitted room numbers.
- Live rooms use green highlighting without repeated LIVE badges. Event details and selection outlines retain activity and navigation feedback.
- The campus overview omits per-event circular markers. Building activity highlights and LIVE counts remain; the events panel opens rooms or buildings.
- Event details and the events panel reuse the map overlay surface and portal typography. A labeled X in the event card dismisses it; long descriptions scroll while the close control remains visible.

## Boundaries

This controls map presentation, not physical access. Events are expected to use permitted rooms and never grant permission automatically. No event-creation, judging, or separate schedule behavior changes. Keep the established Blade and KHIX visual systems. No invented HEC geometry or bathroom classifications.
