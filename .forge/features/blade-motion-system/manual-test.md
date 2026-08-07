# Blade Loading and Motion Manual Test Map

Use the Blade dev server at <http://localhost:3000>. Test once with ordinary motion and once with the operating system's **Reduce motion** setting enabled. Reduced motion should preserve all state and feedback while removing spatial movement, pulsing, spinning, and injected drawer animations.

## Public pages

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Landing page](http://localhost:3000/) | Load, then scroll through the page | Hero content enters as one coordinated group. Lower sections reveal once as they enter the viewport. No content is hidden without JavaScript. |
| [Sponsor page](http://localhost:3000/sponsor) | Load, then scroll through the sponsor information | Heading and overview enter together; later sections reveal once without replaying while scrolling back. |
| [404 page](http://localhost:3000/this-page-does-not-exist) | Open an unknown URL; test both actions at desktop and mobile widths | Blade-branded 404 renders with a real HTTP 404 status. The home and dashboard paths remain clear, and the entrance becomes immediate under Reduce motion. |

## Member routes and route fallbacks

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Member dashboard with artificial latency](http://localhost:3000/member/dashboard?debugLatency=3000) | Navigate here from another authenticated member page | Navigation shell stays in place. A structural dashboard skeleton replaces the content, then content appears directly. |
| [Member settings with artificial latency](http://localhost:3000/member/settings?debugLatency=3000) | Navigate here and wait for the profile | Navigation shell stays in place. The settings form has a structural skeleton rather than a centered spinner or blank page. |
| [Member dues](http://localhost:3000/member/dues) | Cold-navigate to the payment page | Payment layout gets a structural skeleton. Payment mutation feedback remains local to the action. |
| [Member signup form](http://localhost:3000/form/member-signup) | Cold-navigate, then move through the long form | Authenticated shell and form-shaped fallback remain stable; signup sections use the existing gentle reveal. |
| [Member events](http://localhost:3000/member/events) | Open an available feedback dialog and submit feedback | Submission disables the action and shows contained pending feedback without moving the dialog. |

## Hacker administration

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Hacker roster](http://localhost:3000/admin/hackers) | Cold-load; change hackathon, status, and other filters; open a hacker | Cold load uses a roster skeleton. Same-hack filters retain and lightly dim current rows. Changing hackathons cannot flash rows from the previous hack. Filter choices show skeleton/error feedback. Hacker and attendance details use structural dialog skeletons. |
| [Club analytics](http://localhost:3000/admin/analytics) | Open a member detail from a report | Detail content has a structural skeleton while the profile loads. |
| [Hackathon analytics](http://localhost:3000/admin/analytics) | Switch to hackathon analytics and open a hacker | Hacker detail has a structural skeleton rather than a blank dialog. |
| [Admin audit log](http://localhost:3000/admin/logs) | Change filters, then open a row | Existing results remain visible and dim while refetching. The detail sheet has a structural skeleton. |

## Club and hackathon events

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Club events list](http://localhost:3000/admin/events?view=list) | Search/filter/paginate; open an event with feedback | Existing results stay visible and dim during refetch. Event feedback uses a structural loading state. |
| [Club events calendar](http://localhost:3000/admin/events?view=calendar) | Switch between list and calendar and move between date ranges | The workspace remains stable and communicates updating instead of blanking. |
| [Feedback templates](http://localhost:3000/admin/events/feedback-template) | Navigate here from either event workspace | Route transition is short and the surrounding admin shell remains stable. |
| [Hackathon events list](http://localhost:3000/admin/hackathon-events?view=list) | Select a hackathon; filter/paginate; import previous tags | List/table structure is preserved while loading. Tag import rows show skeletons. |
| [Hackathon events calendar](http://localhost:3000/admin/hackathon-events?view=calendar) | Switch views and date ranges | Calendar data remains in place and dims while same-hack data updates. |
| [Hackathon tags](http://localhost:3000/admin/hackathon-events?view=tags) | Open the tags view and import tags | Tag controls and import results use structural loading states. |
| [Hackathon publication](http://localhost:3000/admin/hackathon-events?view=list) | Toggle Discord or Google Calendar publication on a configured hack | Each provider exposes a determinate progress bar. A zero-event job says it is preparing instead of reporting false completion. |

## Check-in and operational workspaces

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Hackathon check-in](http://localhost:3000/admin/hackathon-check-in) | Select a station; switch scanner/manual mode; scan or submit a hacker; close the result | Station and history cold loads have structural skeletons. Tabs crossfade, the camera container fades without sliding, result identity enters as one semantic block, and the newest history row gets a short highlight. Scanner state remains usable. |
| [Member administration](http://localhost:3000/admin/members) | Search, filter, or paginate | Current rows remain visible and lightly dim while updated results load. |

## Issues and form building

| Route | Interaction to test | Expected behavior |
| --- | --- | --- |
| [Issue list](http://localhost:3000/admin/issues/list) | Switch among list, kanban, and calendar | The selected workspace crossfades without animating every issue row. |
| [Issue kanban](http://localhost:3000/admin/issues/kanban) | Drag a card between lanes | Dragged card lifts; the target lane responds; the final card location settles cleanly. |
| [Issue calendar](http://localhost:3000/admin/issues/calendar) | Enter from another issue view | The view crossfades while the dock and page geometry stay stable. |
| [New form](http://localhost:3000/admin/forms/new) | Add several questions and reorder them | Dragged question lifts and the insertion target responds. Reduce motion removes the sortable transition. |
| [Respondent form](http://localhost:3000/form/member-signup) | Exercise instruction media or searchable preset questions, where configured | Media and remote option areas reserve their final space with skeletons and show explicit error states. |

## Shared interaction audit

These primitives changed centrally and should be spot-checked anywhere convenient:

- Dialogs, sheets, dropdowns, selects, popovers, tooltips, accordions, switches, and buttons: ordinary interaction stays crisp; Reduce motion removes transforms and entrance/exit animation.
- Mobile searchable combo boxes: remote searches show four option-row skeletons with a busy state; Reduce motion removes the Vaul drawer animation and background scaling.
- Skeletons: pulse normally and become static under Reduce motion.
- Navigation between member/admin routes: the outgoing page only dims for the short transition window; there is no old long blank/fade delay.

## Intentional non-animation

- Tables and analytics charts do not animate every row or sweep chart values on load.
- Scanner video does not move spatially.
- Success does not trigger confetti or decorative celebration.
- Local save/delete/payment operations retain direct button-level pending feedback.
