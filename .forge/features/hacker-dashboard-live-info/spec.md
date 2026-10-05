# Hacker Dashboard Live Information

Status: Implemented and locally validated

## Purpose and scope

Fill the plain hacker dashboard below the résumé with useful current information, using the existing open layout, cream/lilac typography, and forest background. Show only events happening now, plus a clear empty state. Add emergency and incident-reporting contacts. Improve résumé availability and feedback.

## Confirmed decision

On 2026-10-05, the user explicitly selected “Allow changes during the event” when asked about the existing résumé upload cutoff. Uploads and replacements remain available until the configured event end. No application editing policy changes are requested.

## Acceptance criteria

- Live events include names, event-local times and locations; past/future events do not appear.
- Events update as start/end times pass, with loading, error/retry and empty states.
- Existing checked-in access restrictions remain enforced.
- 911 is clearly for emergencies; UCF Police is non-emergency; MLH is conduct reporting.
- Each phone number opens a confirmation dialog before offering the explicit Call action. Cancel receives initial focus.
- Résumé upload/replacement uses the existing SDK flow and remains usable during the event.
- Layout works on desktop and narrow mobile screens without new card nesting.

## Out of scope

Other dashboard pages, global styles, auth, schema changes, dependencies, deployment, and changes to the shared local preview scenario. No external messages or emergency calls.
