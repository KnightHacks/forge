# Judging Command Center Reset Test Cases

Status: Approved

## Scope

Prove reset isolation, full-reset completeness, destructive guards, checklist navigation/readiness, and non-shifting scheduler/announcement alerts.

## Test placement plan

- API/database: `packages/api/src/tests/integration/judging-reset.test.ts`
- Blade components: `apps/blade/src/tests/projects/*judging*.test.tsx`
- Browser: local Blade command center at desktop and mobile widths.

## Test cases

### TC-001: Drop evaluations only

Given a saved schedule with a submitted evaluation and draft, dropping evaluations removes their answers/revisions and clears the schedule's first-result lock while preserving the schedule, projects, and rooms.

### TC-002: Delete one room

An unreserved room is permanently deleted with its access rows. A room referenced by an appointment is rejected.

### TC-003: Full judging reset

Given populated judging data, full reset removes every hackathon-scoped judging resource, restores starter groups/default toggles, and preserves the hackathon/global buildings/audit history.

### TC-004: Granular dependency safety

Room/setup/project cleanup reports a specific precondition error when downstream records still depend on it.

### TC-005: Launch checklist

Each step links to its owning tab/section. Completed or ready steps are green and the displayed count matches the readiness data.

### TC-006: Non-shifting alerts

An infeasible/incomplete schedule opens a dismissible error dialog once for that job. Routine judging announcements appear as compact neutral notifications; urgent announcements require explicit acknowledgement in a dialog.

## Negative / regression cases

- Wrong typed confirmation deletes nothing and writes no audit event.
- A reset for one hackathon does not change another hackathon.
- Judges cannot call destructive officer procedures.
- Existing project/schedule drop flows remain available.

## Open questions

- None.
