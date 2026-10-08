# Judging Challenge Mode Test Cases

Status: Accepted

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

The tests cover mode validation, persistence, organizer configuration, hacker visibility, judge timing access, group inheritance, and reset compatibility. They do not change or re-test the full authorization, rubric, assignment, or judging lifecycle systems.

## Test placement plan

- `@forge/validators`: schema unit tests.
- `@forge/api`: project challenge, project claim, judging schedule, and judging reset integration tests.
- `@forge/blade`: challenge configuration component tests.
- Playwright: organizer and hacker browser verification with screenshots.

## Test cases

### TC-001: Scheduled remains the default

Setup:

- An organizer creates a new judging group without changing the mode selector.

Action:

- Submit the form.

Expected observations:

- The group is stored as scheduled and non-remote.
- The challenge is eligible for appointment generation and hacker schedule display.

### TC-002: Unscheduled remains hacker-visible

Setup:

- A root challenge is configured as Unscheduled.

Action:

- A hacker with a claimed project loads the judging itinerary.

Expected observations:

- The challenge appears in the unscheduled list with its location.
- No appointment time is required.

### TC-003: Remote is absent from the hacker itinerary

Setup:

- A root challenge is configured as Remote.

Action:

- A hacker with a claimed project loads the judging itinerary.

Expected observations:

- The challenge appears in neither scheduled appointments nor the unscheduled list.
- Other scheduled and unscheduled entries are unchanged.

### TC-004: Remote responses are editable without a time slot

Setup:

- Judging is open.
- An authorized judge can evaluate a Remote challenge.
- No judging appointment exists for the project and challenge.

Action:

- The judge opens the responder view outside every scheduled judging window and submits a valid response.

Expected observations:

- Evaluation access reports untimed and editable.
- The response submission succeeds and is persisted.

### TC-005: Collapsed children inherit mode

Setup:

- A challenge is collapsed into a Remote parent group.

Action:

- An organizer views the child configuration.

Expected observations:

- The child displays Remote in a disabled selector.
- The child cannot override the parent mode.

### TC-006: Existing data keeps its behavior

Setup:

- Existing scheduled and unscheduled rows receive the migration default.

Action:

- Read their derived modes and reset a modified judging configuration.

Expected observations:

- Existing scheduled rows derive as Scheduled.
- Existing unscheduled rows derive as Unscheduled.
- Reset restores Scheduled and clears Remote.

## Negative / regression cases

### TC-NEG-001: Unknown mode is rejected

Setup:

- A caller supplies a mode outside Scheduled, Unscheduled, or Remote.

Action:

- Validate or invoke a challenge configuration mutation.

Expected observations:

- Validation fails before any database write.

### TC-NEG-002: Existing locks still apply

Setup:

- A user lacks judging access, challenge scope, or the judging state is closed.

Action:

- The user attempts to open or submit a Remote evaluation.

Expected observations:

- The existing authorization or lifecycle guard denies the operation. Remote only removes the appointment-time requirement.

## Open questions

- None.
