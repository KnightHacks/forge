# KHIX Map Room Access Test Cases

- TC01: Missing config reads disabled/empty. Save a list with restrictions off; reload preserves it without enabling restrictions. Save toggle and list together; no partial state appears.
- TC02: Trim and uppercase room numbers, trim names, reject duplicate building/room entries and invalid building IDs; the same number in different buildings is valid.
- TC03: Non-officers cannot save. Participant reads are session-scoped, unavailable without authentication, and available before confirmation/check-in.
- TC04: Fresh and upgrade migrations create defaults and the FK. Deleting a hackathon removes its configuration; failed transactional writes leave prior config unchanged.
- TC05: Bathrooms stay blue through restrictions, activity, and selection. Unlisted rooms stay red without labels even when located. With restrictions off, ordinary rooms are permitted; enabled empty config restricts ordinary rooms.
- TC06: Idle is gray. Live is bright green. Upcoming exactly 60 minutes away is green outlined; one millisecond later is gray. Ended events do not highlight. Live wins over overlapping upcoming events regardless of order/selection.
- TC07: HEC and L3Harris aliases plot at the HEC footprint. Locate includes HEC; no floor selectors or invented room coordinates appear. Indoor requests say the plan is unavailable.
- TC08: Building selection enters its first supported floor; locating a room searches available geometry, opens its floor, and preserves access colors.
- TC09: Loading configuration shows a pending state. Initial failure offers Retry and does not assume unrestricted access. Refetch failure retains last good policy. SDK contracts reject invalid responses.
- TC10: Blade save errors retain edits; successful saves refresh configuration. Keyboard controls, long names, 60 rows, reduced motion, desktop and 320px layouts remain usable without document overflow.
- TC11: Multiple live rooms retain green highlighting, numbers, accessible activity descriptions, and event selection without repeated room-level LIVE badges. Building dropdowns use Blade's shared Select; initial and refresh errors use the established map message and overlay surfaces.
- TC12: Multiple events do not add circular markers to the campus overview. Building LIVE counts and activity highlights remain, and selecting an event from Explore events still opens its mapped room or building.
- TC13: At desktop and 320px widths, the event card shares the map overlay surface and portal typography. Its in-card X has an accessible Close event label and a 44px target. Closing removes the details; Explore events can reopen them. Time/location/floor remain readable, and long descriptions scroll without hiding the close control.
