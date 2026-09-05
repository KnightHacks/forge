# Judging scores and deliberation spec

Status: Approved

## User-facing purpose

Judges need one place to find projects, record scores and feedback, correct their own submissions, and organize finalists before deliberation. Officers need to configure that experience without a code change each year.

This feature turns the existing project directory into the judging workspace while preserving the restricted guest flow added by `judging-magic-access`.

## Users and actors

- Guest judge: a sponsor or invited judge using a room QR session. They remain locked to the room's challenge.
- Member judge: a signed-in Blade user whose role grants judge access. They can change challenge filters and optionally join a room.
- Officer: a signed-in Blade user with `IS_OFFICER`. Officers configure judging, import projects, manage rooms, and control result visibility.

## User-visible interface

### Judge workspace

`/judge/projects` has three tabs.

- `Projects` keeps the searchable project table as the primary judging view. It adds the selected challenge's rating and a judging action to each project.
- `Submissions` lists the current judge's evaluations, feedback, score, challenge, and last edit time. A judge can open and edit an evaluation while judging is open.
- `Deliberation` explains that private sections help a judge compare projects before award discussions. Judges can create, rename, reorder, and delete sections, add projects they have judged, and drag projects into their preferred order.

The URL stores the active tab and member challenge filter so refresh, back, and forward navigation preserve the workspace.

### Evaluation form

The project evaluation opens in a viewport-safe dialog or mobile drawer. It shows the project and challenge before the questions.

- Each quantitative rubric item uses an integer scale from 1 through 5.
- The rubric may contain any number of quantitative items.
- The rubric may contain short-response items.
- The form explains who can read each short response before the judge submits it.
- If a guest response is optional-public, the guest chooses whether officers and authenticated judges may read it. It remains private to that guest otherwise.
- Authenticated member-judge responses are public to the judging team.

A saved evaluation closes the form, updates the row, and appears in `Submissions`. Editing replaces the current response while retaining its revision history for officers.

### Scores

For a project in a selected challenge:

- A judge sees `(?)` until they have evaluated that project in that challenge.
- After they submit, they see the average score from all evaluations for that project and challenge.
- An officer can enable `Display all results` so authenticated member judges see available scoped results before submitting. The switch never expands guest access.
- Guest judges only receive scores for their room's challenge.
- Authenticated member judges may also see an `Overall rating` column. It averages every evaluation for the project across all challenge scopes.

Empty aggregates display `(?)`, not zero.

### Project command center

The officer judging page becomes the project command center. It combines the current project import and room controls with:

- judging state: `Draft`, `Open`, or `Closed`;
- rubric setup and ordering;
- the `Display all results` switch for authenticated member judges;
- project inventory and add-only Devpost import;
- room provisioning, QR creation and revocation, and the live room roster.

The existing project-admin URL remains usable and leads to the projects section of the command center.

### Judging state

- `Draft`: officers configure the rubric and inventory. Judges can browse projects but cannot submit evaluations.
- `Open`: judges can create and edit evaluations and manage deliberation lists.
- `Closed`: evaluations and deliberation lists are read-only. Officers can reopen judging.

The rubric requires at least one quantitative item before judging opens. Once the first evaluation exists, officers cannot change the rubric or replace the imported inventory.

## Scope

### In scope

- Officer-configured, hackathon-specific judging rubrics.
- Any number of 1 through 5 quantitative questions and short-response questions.
- Guest and member evaluation creation with server-enforced challenge scope.
- One editable evaluation per judge, project, and challenge.
- Personal submissions history.
- Scoped and overall score calculation and display rules.
- Personal deliberation sections with pointer and keyboard reordering.
- Draft, Open, and Closed judging states.
- Result visibility control for authenticated member judges.
- A combined project command center for projects, rubric, judging controls, and room operations.
- Import and deletion safety once judging data exists.
- Server-rendered initial data, matching loading skeletons, responsive layouts, and accessible controls.

### Out of scope

- Choosing award winners or publishing results to hackers.
- Assigning projects to presentation time slots.
- Scheduling routes through judging rooms.
- Judge calibration or score normalization.
- Shared deliberation boards or live collaborative sorting.
- Viewing another judge's private responses.
- Deleting an evaluation.

## Vocabulary

- `Evaluation`: one judge's answers for one project in one challenge.
- `Quantitative item`: a rubric question answered with an integer from 1 through 5.
- `Short-response item`: a rubric question answered with text and an explicit visibility rule.
- `Scoped rating`: the mean evaluation score for one project and one challenge.
- `Overall rating`: the mean evaluation score for one project across every challenge and judge.
- `Submission`: the judge-facing record of an evaluation.
- `Deliberation section`: a private named and ordered list of projects created by one judge.
- `Project command center`: the officer workspace for project inventory, rubric, judging state, result visibility, and rooms.

## Acceptance criteria

- Officers can build and reorder a hackathon rubric without changing code.
- Officers cannot open judging until the rubric contains at least one quantitative item.
- Each quantitative answer accepts only integers from 1 through 5.
- The evaluation score is the arithmetic mean of all quantitative answers in that evaluation.
- The scoped rating is the arithmetic mean of evaluation scores for the exact project and challenge.
- The overall rating is the arithmetic mean of all evaluation scores for the project. Every evaluation has equal weight.
- A judge can submit one evaluation for the same project in each eligible challenge and can edit each evaluation while judging is open.
- A judge sees `(?)` for a scoped aggregate until they submit in that scope, unless they are an authenticated member judge and an officer enabled `Display all results`.
- Guests never receive results or projects outside their configured challenge.
- The evaluation form states the audience for each short response and applies that rule on every read.
- `Submissions` shows only the current judge's evaluations and supports editing while Open.
- `Deliberation` accepts only projects the current judge has evaluated.
- Pointer drag, keyboard movement, and explicit move controls provide equivalent ordering behavior.
- Draft blocks evaluation submission. Closed makes evaluations and deliberation read-only. Reopening restores edits.
- The first evaluation locks rubric changes and full inventory replacement. Add-only import remains available for unseen normalized Devpost URLs.
- Projects referenced by evaluations or deliberation entries cannot be hard deleted. Soft-deleted projects remain visible in personal records as unavailable.
- The project command center combines project import, rubric, judging controls, and room operations without removing existing bookmarked admin entry points.
- Server-side authorization enforces every guest, member, and officer distinction. Hidden controls are not the security boundary.
- Initial route data renders on the server. Loading states use skeletons that match the loaded layout on desktop and mobile.

## Open questions

None. Product decisions approved on 2026-09-05.
