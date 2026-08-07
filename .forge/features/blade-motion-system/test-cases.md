# Blade Loading and Motion System Test Cases

Status: Approved

## Scope

Observable loading geometry, interaction feedback, and accessibility behavior in Blade. Business behavior and API contracts are regression-only.

## Test placement plan

- Blade component/unit tests under `apps/blade/src/tests`.
- Existing Blade Playwright visual and workflow tests for high-value routes.
- Static review of shared `@forge/ui` state classes.

## Test cases

### TC-001: Async routes provide representative loading content

Setup:

- Navigate cold to member dashboard, dues, settings, a respondent form, or the hacker roster.

Action:

- Delay server data resolution.

Expected observations:

- The route immediately displays a skeleton that approximates the final header, panels, controls, and desktop/mobile ordering.
- The page does not remain blank or show only a centered spinner.

### TC-002: Client queries preserve final geometry while loading

Setup:

- Open Hackathon Events, Hackathon Check-in, or a large detail dialog on a cold query cache.

Action:

- Wait for the client query.

Expected observations:

- Representative rows/panels are visible while pending and the surrounding workspace does not collapse.

### TC-003: Public content reveals once

Setup:

- Open the Blade landing or sponsorship page with ordinary motion preferences.

Action:

- Scroll a content panel into view, out of view, and back again.

Expected observations:

- The panel enters with a short opacity/vertical transition once and remains visible thereafter.

### TC-004: Filtered results remain usable during refetch

Setup:

- Load a populated supported admin table.

Action:

- Change a filter or page.

Expected observations:

- Existing rows remain mounted, the surface visibly indicates it is updating, and the region exposes `aria-busy` until fresh data arrives.

### TC-005: Check-in feedback is immediate and persistent

Setup:

- Open a check-in station with recent history.

Action:

- Open the scanner, complete a check-in, close the result, and inspect history.

Expected observations:

- The scanner container reveals without moving the live video.
- The result status enters clearly and does not auto-dismiss.
- The newest history row receives one short highlight without forced scrolling.

### TC-006: Publication progress is legible

Setup:

- Enable or disable an event publication integration with multiple events.

Action:

- Observe polling while remote state converges.

Expected observations:

- A determinate progress indicator reflects completed versus total events and errors/retries remain available.

### TC-007: Drag operations expose lift and target state

Setup:

- Open the form builder or issue Kanban.

Action:

- Drag an item over a valid target and release it.

Expected observations:

- The dragged object is visually lifted and the receiving target is distinguishable without changing the underlying workflow.

## Negative / regression cases

### TC-NEG-001: Reduced motion is honored

Setup:

- Enable `prefers-reduced-motion: reduce`.

Action:

- Navigate, open overlays, scroll public pages, and use animated controls.

Expected observations:

- Content appears immediately, continuous animation stops, transforms are disabled, and navigation is not delayed.

### TC-NEG-002: Motion does not replay after skeleton replacement

Setup:

- Navigate to an authenticated route with delayed data.

Action:

- Allow the route skeleton to resolve.

Expected observations:

- Loaded cards replace their skeletons directly without individual entrance staggers.

### TC-NEG-003: Existing operational behavior remains unchanged

Setup:

- Use check-in, publication retry, filters, feedback submission, and drag/drop.

Action:

- Complete each operation.

Expected observations:

- Existing mutations, routing, persistence, dialogs, and toasts behave as before.

## Open questions

- None.
