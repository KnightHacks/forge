# KHIX Map Location Links Test Cases

1. Open `/map?location=HEC101`: reach `/dashboard/map` with the query intact,
   select HEC on campus, and disclose that its indoor plan is unavailable.
2. Open a known room link such as `ENG1224` or `BA1145A`: show the floor found
   in the actual geometry, center the destination, and highlight its outline.
3. Accept uppercase/lowercase codes, spaces, hyphens, building-only links,
   and room suffix letters across the map's supported buildings.
4. Unknown, malformed, or empty destinations must not crash or invent rooms.
   Unknown rooms in known buildings show the building with a missing-room notice.
   Hidden ENG2 rooms must remain unavailable.
5. Delay map configuration: wait for readiness before focusing the destination.
   Clock updates and schedule refreshes must not undo later user navigation.
6. Navigate between location query values and use browser history: the new
   location applies. Removing the query returns to the overview.
7. Open a destination with a saved indoor spot: preserve that spot and its
   local-storage value. Room restriction styling remains unchanged.
8. Check desktop and 320px layouts for room focus, fallback copy,
   clipping, and page overflow. Preserve the existing sign-in return query.

Unit tests belong beside the floor-plan helpers. Browser verification uses
fixture SDK responses and does not write database records. Run KHIX tests,
React analysis, root format/lint/typecheck, and a KHIX production build.
