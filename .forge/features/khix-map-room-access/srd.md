# KHIX Map Room Access SRD

## Architecture

Extend origin/khix-map, aligned with main. Blade owns organizer editing; KHIX owns geometry, room presentation, and map navigation. Shared stable building identities live in @forge/consts; validation lives in @forge/validators. Business reads/writes stay in @forge/api. @forge/db owns schema and migrations only.

## Persistence and interfaces

One approved HackathonMapConfiguration table with hackathonId primary/FK (cascade), restrictionsEnabled default false, typed JSON rooms [{buildingId, roomNumber, name}], and updatedAt. Missing rows read as disabled/empty. Normalize trimmed room numbers to uppercase; reject duplicate building/room entries. Validate optional names and known building identities. Save the whole list and toggle atomically under a hackathon row lock.

hackathon.get includes map configuration. hackathon.saveMapConfiguration uses the existing officer-only platform configuration gate and records an audit event in the same transaction. Participant getMapConfiguration reads only the session hackathon and requires confirmed/checked-in status plus the hackathon's opening calendar day in its configured timezone. A shared SDK lifecycle helper keeps the server rule and KHIX navigation/direct-route presentation aligned; the API uses server time and stored application status. The map hook refreshes every 30 seconds while mounted. Preserve getSchedule and its current eligibility.

## Frontend

Blade follows apps/blade/DESIGN_SYSTEM.md and docs/agentic-development/frontend-design-skill.md. A compact section with a bounded scrollable room list, explicit Save, and separate toggle joins hackathon details. Errors preserve edits; successful saves refresh server-read props.

KHIX inherits the current map design. Classify bathroom room polygons explicitly; known ENG2 label coordinates provide the evidence for the initial metadata. Bathroom and restricted appearance take precedence over events and selection. Activity classification uses all matching events and the current clock, independently of selection. Keep color-independent status text and a legend. An initial configuration failure shows Retry rather than assuming restrictions are disabled. On refresh failure, retain the last successful policy and display the error.

Buildings with plans open their first supported floor on selection. Room lookup searches supported floors rather than trusting number-based floor inference. HEC uses only its joined first floor; known room identities without verified geometry retain a building-level fallback.

The mobile follow-up separates event presentation into `MapEventsDock`; list and selected-event detail occupy one measured surface. `ResizeObserver` supplies its height to floating controls and fits rotated floor bounds into the unobscured viewport through pure camera helpers. Gesture updates preserve the fitted center, anchor two-finger translation to the initial gesture, and interrupt animated navigation at its displayed position. Room presentation and label-collision calculations are memoized independently of camera updates. These changes remain within `apps/2026` and do not change room permissions, schemas, or SDK behavior.

An app-local event-room directory supplies the owner's 47 event locations, optional Student Union and BA1 Atrium names, and canonical number/name matching. Per the owner's follow-up, this roster bounds KHIX room presentation even when organizer restrictions are off; enabled organizer restrictions can further narrow it. Rooms outside the roster and unverified room envelopes receive an SVG hatch, no activity or event interaction, and a building-level lookup fallback. Known bathrooms and circulation remain identifiable. BA1 Atrium uses source anchor 128 on floor 1; the source-defined 101/102 hallways and 127 stair core retain their numbers without unavailable hatching. Verified room numbers remain visible on all rooms, including unavailable rooms and shared outlines. Native source captions retain numbers and wayfinding; temporary IDs and non-event business/office names stay hidden. This event-specific constraint stays in KHIX; the shared organizer editor and saved configuration retain their existing contracts. Organizer room entries and event locations use the same alias matching for presentation: leading zeros are equivalent, a combined ballroom covers its sections, and a single section does not cover its neighbors. The importer adds verified Engineering II floor 3 and overlays the owner-provided SU 232 number at the existing Starbucks source anchor. It does not assign the four unverified HEC numbers to arbitrary polygons.

## Migration and rollout

Generate the additive migration; verify fresh installation and upgrade from the preceding schema in disposable loopback databases. No production backfill is needed. Deploy API/schema before the frontend using the new SDK method. Disabling organizer restrictions restores the booked KHIX roster without losing the saved configuration. Rolling back application code leaves the additive table safely unused.
