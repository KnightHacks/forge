# KHIX Venue Map SRD

Status: Approved for first implementation slice

## Technical purpose

Add a KHIX-only interactive venue map that composes the existing participant
schedule with static, sourced campus geometry and local UI state.

## Relevant principles

- React/frontend constraints: keep the route thin and isolate interaction in a
  focused client component.
- Configurability: event placement is derived from the admin-managed event
  `location`; yearly service markers remain in one KHIX-owned configuration.
- Frontend design: preserve the existing KHIX dashboard visual language and use
  a full-width working canvas rather than a dashboard-card grid.

## Access policy

- Unauthenticated: existing portal auth boundary redirects to sign-in.
- Development and production use the same portal session boundary; local
  preview requires a working Blade session.
- Any signed-in dashboard user may load the venue map.
- Confirmed and checked-in participants may load its live schedule markers.
  Pending and accepted participants cannot read the schedule. Attendance and
  judging remain checked-in-only.
- No new organizer/admin permission is introduced.

## Architecture / data flow

`apps/2026` owns the venue geometry, location parser, map interaction, and route.
The component consumes `useHackerDashboardFlow({ schedule: true })`; schedule
content continues to come from the Hacker SDK and existing platform API. No
new database, validator, or dependency is required. The restored API/SDK
schedule policy includes confirmed participants, as approved on 2026-09-08.

## tRPC/API behavior

The existing `getSchedule` procedure supplies event names, times, tags,
purposes, and free-text locations. Its status guard, participant capabilities,
and SDK query gate allow confirmed and checked-in participants consistently.

## Validation

No contract change. Map parsing treats event location as untrusted free text:
known building aliases are normalized; unknown locations are never plotted.

## Data / migration / compatibility

No schema, migration, environment variable, or production-data change. Removing
the route/nav/component cleanly rolls back the feature.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: venue geometry changes by event/year, while event locations already
  remain admin-configurable through the existing schedule workflow.
- The first slice centralizes KHIX venue/service configuration in one file.
  A future admin venue editor is appropriate only after the interaction and
  location vocabulary are validated during a live event.

## React / frontend constraints

- Route page remains a small client wrapper, matching sibling dashboard routes.
- New map interaction lives outside the already-large dashboard component.
- Visual thesis: an enchanted field map drawn in luminous survey ink over the
  existing KHIX forest palette.
- Content plan: live status/header, map workspace, filter rail/detail surface.
- Interaction thesis: semantic zoom reveals room detail; active markers pulse;
  selection smoothly focuses the relevant building.
- Support wheel/pinch/buttons, keyboard-operable controls, reduced motion, and
  a non-map textual event list.
- Schedule refreshes every 30 seconds while this surface is mounted.

## Testing / verification strategy

- Unit-test building alias/location parsing, floor inference, event state, and
  deterministic marker placement in `apps/2026`.
- Component-test loading, locked, error, and populated states where practical.
- Run KHIX tests/typecheck/lint, changed React analysis, and KHIX build.
- Capture desktop and 320px mobile screenshots.

## Open questions

- Confirm final event-week food/help rooms before production deployment.
- Reconstructed floor geometry is checked in as TypeScript runtime data. Source
  PDFs, tracing scripts, and intermediate exports remain in the recovery stash;
  running the app does not require them.
