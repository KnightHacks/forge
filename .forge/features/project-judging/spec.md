# Project Judging Spec

Status: Approved on 2026-08-31; Discord contact fields removed by owner revision

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Officers need to import the submitted projects from a Devpost export into a
specific hackathon, correct the imported project inventory, and decide when it
is ready for judges to inspect.

Judges need a fast, mobile-friendly directory of every imported project in the
active hackathon so they can find projects, understand what each team built,
and contact team members when necessary. Scoring and judging responses are not
part of this slice.

## Users / actors

- **Officer:** imports and replaces a hackathon's Devpost project inventory,
  edits imported projects, deletes individual projects, and can preview the
  judge experience outside an active hackathon.
- **Judge:** an authenticated member whose effective role permissions include
  `IS_JUDGE`. A judge can view projects while the selected hackathon is active.
- **Authenticated member without judge or officer access:** cannot view or
  manage imported projects.
- **Unauthenticated visitor:** must authenticate before reaching either
  project surface.

## User-visible interface

### Officer project management

`/admin/projects` is the officer-only project management surface. It lets an
officer:

- choose an existing hackathon;
- upload a Devpost CSV for that hackathon;
- replace that hackathon's imported project inventory with the submitted
  projects in the uploaded export;
- see a useful import result, including skipped or rejected records;
- view and edit individual imported projects;
- soft-delete one project at a time; and
- restore a soft-deleted project; and
- open the judge-facing project experience for setup and testing even when the
  hackathon is not currently active.

A replacement import is intentionally authoritative. It drops the selected
hackathon's prior imported project inventory and inserts the projects from the
new export. It does not present merge-conflict resolution or preserve manual
project edits.

### Judge project directory

`/judge/projects` shows projects for the hackathon that is currently active.
It includes:

- project title;
- Devpost link;
- challenge tags derived from Devpost opt-in prizes, with `General` first.

The directory supports title search, sorting, pagination consistent with other
Forge tables, and filters including challenge and participant count.

Selecting a project opens a responsive modal containing:

- the project's Markdown-rendered description when supplied;
- Devpost, demo, and video links when present;
- technologies used;
- challenges;
- team member names and email addresses;
- universities or schools; and
- submission time.

## Scope

### In scope

- Officer selection of an existing hackathon before import.
- Import of submitted projects from the provided family of Devpost CSV exports.
- Authoritative full replacement of one hackathon's imported projects.
- Challenge creation from Devpost opt-in prize values.
- Authoritative replacement of the selected hackathon's imported challenge
  list on re-import.
- A `General` challenge applied to every imported project.
- Officer editing of approved project and team-contact fields.
- One-at-a-time soft deletion and restoration of imported projects.
- Judge/officer project discovery, filtering, and responsive project details.
- Judge access to team names and email addresses.
- Safe handling of duplicate submission URLs and variable-width team data in
  Devpost exports.

### Out of scope

- Scores, feedback, or any other judge response.
- Judge assignments, rooms, or judging sessions.
- Ranking and winner selection.
- Hacker-to-project matching.
- A public project gallery.
- Devpost API synchronization.
- Batch deletion outside the authoritative replacement import.
- Import conflict resolution or preservation of manual edits across re-import.
- Event-specific questionnaire answers.

## Vocabulary

- **Active hackathon:** the hackathon currently running according to its
  configured start and end dates: its start is at or before the current time
  and its end is at or after the current time.
- **Challenge:** a judging category derived from a Devpost opt-in prize value,
  plus the `General` challenge applied to every project.
- **General challenge:** the default judging category shared by every imported
  project for a hackathon.
- **Participant count:** the number of people attached to an imported project.
- **Replacement import:** an import that removes the selected hackathon's
  existing imported project inventory and inserts the submitted projects from
  the uploaded Devpost export.
- **Soft-delete:** remove a project from the active project inventory without
  immediately destroying its stored record.

## Acceptance criteria

- An officer can select an existing hackathon and upload a supported Devpost
  project CSV from `/admin/projects`.
- An authenticated non-officer cannot import, replace, edit, delete, or enable
  judging for projects.
- Import includes only submitted projects and excludes drafts and incomplete
- A Devpost record counts as submitted when its project status is a submitted
  status; differences in gallery visibility or pending publication do not turn
  it into a draft.
- Confirming an import replaces only the selected hackathon's prior imported
  project inventory.
- Re-importing does not ask the officer to resolve field conflicts and does not
  preserve prior manual project edits.
- Devpost opt-in prize values become challenges for the selected hackathon.
- Imported challenge labels retain the value supplied by the Devpost export;
  labels are not merged merely because capitalization, whitespace, or
  punctuation differs.
- Every imported project belongs to the `General` challenge in addition to its
  imported opt-in challenges.
- A replacement import also replaces the selected hackathon's prior imported
  challenge list so minor challenge changes in a later export take effect.
- The import does not create duplicate projects when the export repeats a
  submission URL or expands team-member data across variable-width rows.
- After import, the officer receives a useful result that distinguishes
  imported projects, excluded drafts, collapsed duplicate submission URLs, and
  malformed or rejected records.
- An officer can edit the project title, Devpost URL, optional description,
  challenge assignments, demo and video links, technologies, universities,
  team member names, email addresses, and participant count. Team contacts use
  separate repeatable name/email fields with email validation.
- An officer can soft-delete one project at a time after an explicit
  confirmation.
- An officer can restore an individually soft-deleted project.
- A judge visiting `/judge/projects` sees the currently active hackathon.
- A judge cannot select an inactive hackathon or view its projects.
- An officer can open the judge experience for the hackathon whose start date
  is the nearest upcoming start when no hackathon is active, for setup and
  testing.
- The judge directory exposes project title, Devpost link, and challenge tags.
  `General` is always displayed first.
- A judge can search by project title, sort and paginate the directory, and
  filter by challenge and participant count.
- Selecting a project opens a desktop- and mobile-friendly detail modal with
  its Markdown-rendered description and the approved project, link, technology,
  team-contact, school, and submission details.
- Judges can see team member names and email addresses, but cannot see Discord
  handles or event-specific questionnaire answers.
- `IS_JUDGE` grants judge access, and existing `IS_OFFICER` bypass behavior
  grants officers access to the judge experience.
- An unauthenticated visitor is redirected to authenticate.
- An authenticated user without judge or officer access receives a forbidden
  state, and judge navigation is hidden from that user.
- No scoring, feedback, assignment, room, judging-session, ranking, or winner
  controls are presented as part of this slice.

## Open questions

- None blocking product-spec approval.
