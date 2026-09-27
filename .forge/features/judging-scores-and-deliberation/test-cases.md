# Judging scores and deliberation test cases

Status: Approved

## Scope

These 20 cases cover rubric configuration, judging lifecycle, member and guest evaluation access, score calculation and disclosure, editable submissions, response hacker visibility, personal deliberation, import safety, and the combined officer command center. Scheduling, winner selection, the hacker-facing feedback view and delivery process, and collaborative deliberation are excluded.

## Test placement plan

- `@forge/validators`: unit tests for rubric, answer, visibility, section, and reorder payloads.
- `@forge/api`: unit and disposable-database integration tests for principals, lifecycle, score math, visibility, persistence, revision history, import locks, and authorization.
- `@forge/db`: schema and migration tests for constraints, fresh migration, and prod-like upgrades.
- `@forge/blade`: component tests and targeted Playwright coverage for the three tabs, dialogs, command center, keyboard reordering, responsive layouts, and skeletons.

## Test cases

### TC-001: Officer creates a configurable rubric

Setup:

- A hackathon is in Draft with no evaluations.
- An officer opens the project command center.

Action:

- Add three required rating items and two short-response items, edit labels and descriptions, set the short-response required flags and response policies, reorder them, and save.

Expected observations:

- The saved order and configuration survive refresh.
- Rating items always use the 1 through 5 scale.
- Stable item IDs survive editing and reordering.
- A non-officer cannot call the same mutation.

### TC-002: Rubric validation rejects malformed configuration

Setup:

- A hackathon is in Draft with no evaluations.

Action:

- Submit empty or overlong labels, duplicate IDs, a visibility policy on a rating item, a missing policy on a short response, and malformed order data.

Expected observations:

- The validator or API returns `BAD_REQUEST` with field-level errors.
- No partial rubric update reaches the database.

### TC-003: Opening judging requires a quantitative item

Setup:

- A Draft rubric contains only short-response items.

Action:

- An officer changes the state to Open.

Expected observations:

- The API returns `CONFLICT` or `BAD_REQUEST` with a plain explanation.
- Adding one rating item allows the transition and records `openedAt`.

### TC-004: Lifecycle controls judge writes

Setup:

- A valid rubric and eligible project exist.

Action:

- Attempt an evaluation in Draft, submit and edit in Open, close judging, attempt another edit and deliberation reorder, then reopen.

Expected observations:

- Draft rejects evaluation writes.
- Open permits evaluation and deliberation writes.
- Closed shows read-only data and rejects writes server-side.
- Reopening restores allowed edits without losing data.

### TC-005: Member saves one evaluation per project and challenge

Setup:

- A member judge can access two challenges assigned to one project.
- Judging is Open.

Action:

- Submit the project once in each challenge, then attempt a second create in the first challenge.

Expected observations:

- Two evaluations exist, one per challenge.
- The second save in the first challenge edits the existing evaluation instead of creating a duplicate.
- The unique database constraint prevents races from creating duplicates.

### TC-006: Guest scope cannot be widened

Setup:

- A valid guest session belongs to a room assigned to Challenge A.
- Projects exist in Challenge A, Challenge B, and General.

Action:

- Read projects and scores, then tamper with evaluation and list inputs to send Challenge B or another hackathon.

Expected observations:

- Only Challenge A projects and aggregates are returned.
- The API derives Challenge A from the session and rejects out-of-scope projects without confirming their existence.
- No overall rating field is returned.

### TC-007: Evaluation answers match the active rubric

Setup:

- The active rubric has three required rating items, one required response, and one optional response.

Action:

- Submit values below 1, above 5, non-integers, missing required items, duplicate item IDs, extra IDs, wrong-kind answers, and an overlong response.

Expected observations:

- Every malformed payload is rejected.
- A complete payload with integer ratings from 1 through 5 succeeds atomically.

### TC-008: Scoped score uses evaluation means

Setup:

- In one project and challenge, Judge A answers `5, 5`, Judge B answers `1, 3`, and Judge C answers `4, 2` across two rating items.

Action:

- Read the scoped aggregate.

Expected observations:

- Evaluation means are `5`, `2`, and `3`.
- The scoped result is `3.33` when displayed and has count `3`.
- The system does not sum raw criteria or store a rounded aggregate.

### TC-009: Overall score weights every evaluation equally

Setup:

- Project P has two evaluations in Challenge A with means `5` and `3`, plus one evaluation in Challenge B with mean `1`.

Action:

- An authenticated member judge reads the overall rating.

Expected observations:

- The overall result is `3.00` with count `3`.
- It is not `2.50`, which would incorrectly give each challenge equal weight.
- A guest response omits this field.

### TC-010: Result disclosure waits for the judge's submission

Setup:

- Other judges have rated a project in the selected challenge.
- `Display all results` is off.

Action:

- A member judge and a guest judge view the project before and after saving their own evaluations.

Expected observations:

- Both see `(?)` before saving and the scoped aggregate after saving.
- The API omits or nulls the hidden value rather than sending it for client-only concealment.
- The submitted project leaves that judge's default Projects view. `See previously judged` restores it without changing `Submissions`.

### TC-011: Officer reveal applies only to authenticated member judges

Setup:

- Aggregates exist and neither viewer has rated the project.

Action:

- An officer enables `Display all results`, then a member judge and guest judge refresh.

Expected observations:

- The member sees the scoped aggregate immediately.
- The guest still sees `(?)` and receives no widened result data.
- Disabling the setting restores the member's own-submission gate.
- Members can sort by the always-visible cross-challenge `Rating`. `Challenge rating` sorting is available only while the scoped results are revealed.

### TC-012: Empty scores display as unknown

Setup:

- A project has no evaluations in the selected challenge and no evaluations overall.

Action:

- Open the project table as an eligible member and as a guest.

Expected observations:

- Available score cells render `(?)`, not `0`, `NaN`, or an empty string.
- Counts do not claim that an evaluation exists.

### TC-013: Editing preserves one current evaluation and revision history

Setup:

- A judge has a saved evaluation at revision 1 while judging is Open.

Action:

- Change ratings and feedback from `Submissions` and save.

Expected observations:

- The current evaluation becomes revision 2 with an updated timestamp.
- The prior and current complete snapshots remain available to authorized officer inspection.
- Generic audit metadata contains IDs and revision numbers but no feedback text.

### TC-014: Submissions are private to the current judge

Setup:

- Two judges have submissions in the same hackathon.

Action:

- Judge A opens `Submissions` and tampers with identifiers to request or edit Judge B's evaluation.

Expected observations:

- Judge A sees only their own records.
- Reads and edits for Judge B return `NOT_FOUND` or `FORBIDDEN` without leaking answer content.
- Officers do not gain an accidental edit-as-judge path.

### TC-015: Short-response visibility follows judge type and item policy

Setup:

- The rubric has public, public-optional, and private short-response items for guests. Member items use the KH IX public policy.

Action:

- A member submits feedback. A guest submits public-optional feedback once private and once public, plus public and private item responses.

Expected observations:

- The form states the audience before submission.
- Member responses persist as eligible for hacker sharing.
- Guest public and private items ignore tampered visibility inputs.
- Guest public-optional responses use the explicit hacker-sharing choice and default to not shared.
- Authenticated judges and officers can review every response. Guests cannot read other judges' responses.

### TC-016: Judge manages private deliberation sections

Setup:

- A judge has evaluated three projects.

Action:

- Create and rename two sections, reorder the sections, add the same project to both, and remove it from one.

Expected observations:

- Section names and order survive refresh.
- A project appears at most once per section but may appear in several sections.
- Removing an entry does not change its evaluation.
- Another judge cannot read or mutate these sections.

### TC-017: Deliberation ordering is accessible and durable

Setup:

- A section contains three evaluated projects.

Action:

- Reorder with pointer drag, then use keyboard movement and explicit up or down controls at desktop and 320px widths.

Expected observations:

- All methods produce the same stored order.
- Focus remains usable, controls have accessible names and 44px targets, and no document-level horizontal overflow appears.
- A partial, duplicate, foreign, or stale reorder payload is rejected without changing the prior order.

### TC-018: Deliberation accepts only evaluated projects

Setup:

- The judge has evaluated Project A but not Project B. Project C was evaluated and later soft deleted.

Action:

- Add all three projects to a section and attempt a duplicate add.

Expected observations:

- Project A succeeds, Project B is rejected, and a duplicate A is rejected.
- Existing Project C entries remain visible as unavailable and cannot open an evaluation editor.

### TC-019: First evaluation locks rubric and destructive inventory changes

Setup:

- An Open hackathon has an unlocked inventory and valid rubric.

Action:

- Save the first evaluation, then try to edit the rubric, fully replace the Devpost inventory, and hard delete its project. Run an ordinary import containing one unseen normalized Devpost URL.

Expected observations:

- The evaluation and inventory lock commit in one transaction.
- Rubric edits and full replacement return `CONFLICT`.
- Hard delete is blocked by the evaluation reference.
- Add-only import inserts only the unseen project and leaves existing rows untouched.

### TC-020: Command center and judge workspace render complete responsive flows

Setup:

- A hackathon has projects, rubric items, several rooms, QR states, live judges, submissions, and deliberation data.

Action:

- Load the project command center and all three judge tabs as officer, member judge, challenge guest, and General guest at desktop and mobile sizes. Exercise refresh, back, forward, loading, empty, error, and success states.

Expected observations:

- The command center combines project import, rubric, lifecycle, member result visibility, rooms, QR controls, and live roster.
- `/admin/projects` reaches the projects section without losing bookmarked access.
- Judge tabs are named `Projects`, `Submissions`, and `Deliberation`; the last includes a short purpose explanation.
- Guests retain the minimal shell and fixed challenge. Members retain Blade navigation and optional room selection.
- Guest rows omit the Challenges column and challenge badges. Member rows retain them, and each badge turns green after the first evaluation in that scope.
- Server HTML contains initial data, and skeletons match loaded geometry without flashing an empty client shell.
- Screenshots show intentional hierarchy, readable score columns, viewport-safe evaluation forms, and no sensitive team or private-feedback data.

## Negative and regression coverage

Negative and regression behavior is integrated into TC-002, TC-003, TC-004, TC-006, TC-007, TC-009 through TC-012, TC-014, TC-015, and TC-017 through TC-020 so the approved count remains exactly 20.

## Open questions

None. The human approved these 20 cases on 2026-09-05.
