# Judging Command Center Reset Spec

Status: Approved

## User-facing purpose

Give officers a clear, ordered path from project import to live judging, plus safe ways to undo test data before the hackathon starts.

## Users / actors

- Officers who can manage project judging.
- Judges and hackers are affected by resets but cannot run them.

## User-visible interface

- The command center follows a numbered flow: Projects, Rubric, Rooms, Schedule, then Launch.
- A launch checklist links to each required section and marks steps green when complete or ready.
- Evaluations can be dropped without changing the project inventory, rooms, schedule, or launch settings.
- The Reset tab exposes granular cleanup for each judging slice and one full reset.
- Individual rooms can be permanently deleted when they have no saved appointments.
- Scheduler failures use a dialog instead of inline warning cards. Routine judging announcements use a compact neutral notification; urgent announcements remain blocking dialogs.

## Scope

### In scope

- Hackathon-scoped judging projects, groups, rubric, rooms/access, schedules, evaluations, deliberation, claims, announcements, judges, and toggle settings.
- Typed confirmation for destructive actions.
- Audit records for every new destructive operation.

### Out of scope

- Deleting the hackathon.
- Deleting global judging buildings.
- Deleting or archiving Discord threads that already exist outside Forge.

## Acceptance criteria

- Full reset returns the selected hackathon to starter General/MLH groups with all judging toggles at their defaults.
- Full reset is atomic and includes all data removed by granular actions.
- Granular reset operations preserve unrelated judging slices and explain dependency order when blocked.
- Room deletion removes its Blade link, guest sessions, presence, and announcement but refuses while appointments reference it.
- The checklist opens the relevant tab/section and accurately reflects imported projects, configured setup, linked rooms, schedule readiness/save, judging state, and claim-link delivery.
- Failed scheduler generation and refresh messages do not shift the schedule layout.

## Open questions

- None. The user delegated deletion order and layout details in the implementation request.
