# KHIX Map Location Links SRD

Extend the map in PR [#594](https://github.com/KnightHacks/forge/pull/594), as
requested by the owner after confirming it is not yet on main. Implementation
belongs in `apps/2026`; no shared packages or persisted data change.

- `/map` redirects to `/dashboard/map`, preserving query parameters.
- The canonical server page reads `location`; repeated parameters use the first
  value. The map component owns session hooks and interactive state.
- Parse destination codes against existing building metadata. Reuse
  `findVenueRoom` and the existing room camera logic, which handles real floor
  geometry and rotation. Keep schedule parsing behavior unchanged.
- Apply each changed location after dashboard/configuration readiness. Clock
  ticks, data refreshes, and manual panning must not reapply it.
- Reuse selected-room styles, retaining restriction colors and room access
  semantics. Do not write the destination to local storage or request GPS.
- Keep portal authentication and schedule permissions unchanged. The short
  route redirects into the existing authenticated layout.

The implementation follows the [engineering principles](../../../docs/agentic-development/forge-engineering-principles.md)
and existing map design. Building metadata remains the source for future venue
changes. Rollback removes the alias, parser, and query integration; no migration
is needed.
