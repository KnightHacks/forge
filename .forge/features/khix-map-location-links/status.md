# KHIX Map Location Links Status

Current phase: Implementation and validation complete

## Scope and decisions

- Branch: `2026/map-location-links`, based on map PR #594 at `7edf88a7`.
  The owner approved this base because the map is not yet on main.
- Changes are limited to KHIX routes, map interaction, parsing, tests, and this
  required feature bundle. No shared package or persisted-data changes.
- Reuse existing room geometry and camera controls. HEC remains a building-only
  destination until an indoor plan exists.
- Preserve authentication, room restrictions, and the visitor's saved location.
- Initialize SVG controls when map data becomes ready; measure the viewport
  before applying a linked destination. Later polling does not move the camera.
- No open product questions.

## Validation

- KHIX unit suite: 98 tests passed across seven files.
- Browser suite: nine tests passed using fixture SDK responses, including
  delayed loading, desktop/mobile framing, query/history navigation, and saved
  location preservation. No page errors. Live Blade authentication was not tested.
- Repository `pnpm format`, `pnpm lint`, and `pnpm typecheck` passed; existing
  lint warnings remain.
- React analysis passed for the changed components and new alias page.
- KHIX production build passed with command-only local values for the existing
  portal client/origin settings, which are absent locally. No environment files
  changed. Separate typecheck covers the build's existing type-validation skip.

## Links

- Base PR: https://github.com/KnightHacks/forge/pull/594
- Base map issue: https://github.com/KnightHacks/forge/issues/581
