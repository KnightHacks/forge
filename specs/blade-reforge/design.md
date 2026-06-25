# Blade Reforge Design

Status: Draft.

## Architecture direction

Blade Reforge should rebuild the platform in slices. The design should make product behavior, interface contracts, and migration rules explicit before implementation.

## Development architecture

- `main` continues to serve current Forge delivery.
- `reforge/main` is the integration branch for Reforge.
- Short-lived `reforge/*` branches are reviewed into `reforge/main`.
- The final merge into `main` is a planned cutover event, not first-pass implementation review.

## Implementation direction

Reforge may replace Blade and supporting platform layers, but shared package behavior must be versioned, adapted, or explicitly cut over. Avoid breaking current consumers without documented compatibility decisions.

## Design questions

- Should the Reforge branch build a new app path first or replace `apps/blade` within the branch?
- Which shared package contracts need v2 surfaces or compatibility adapters?
- Which workflows need characterization tests before redesign?
- Which production data structures are canonical vs historical persistence shapes?
