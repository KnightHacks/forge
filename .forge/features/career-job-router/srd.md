# Career Job Router SRD

Status: Implemented for PR 1 of #651. References: #633, #646, #647, #648, #650.

## Technical purpose

Add the `jobBoard` tRPC namespace over the Career job tables. A separate router
rather than more `career.*` procedures: `career` is Guild companies and
employment history, and the consts, validators and schema for this feature are
already named `job-board`.

## Relevant principles

`docs/API-AND-PERMISSIONS.md` and the `forge-api` skill: guard first, validators
from `@forge/validators`, typed return shapes, extracted logic in
`utils/<domain>/`, transactions for multi-table writes.

## Access policy

- Unauthenticated: none.
- Signed-in without a member profile: `FORBIDDEN` from every procedure
  (`requireJobBoardMember`).
- Member: all eight procedures. Writes are scoped to the caller's `Member.id`;
  another member's application answers `NOT_FOUND`.
- Officer: no additional access. Officers do not see private applications.
- No `permProcedure`, so nothing is added to `utils/audit/coverage.ts`.

## Architecture / data flow

- `routers/job-board.ts`: procedures only.
- `utils/job-board/access.ts`: the member guard.
- `utils/job-board/search.ts`: filter and sort building, listing columns,
  locations and sources.
- `utils/job-board/community.ts`: the single projection for other members'
  applications. It applies `visibility = 'community'` and never selects
  `privateNotes`.
- `utils/job-board/applications.ts`: save, update and remove.

## tRPC/API behavior

| Procedure             | Kind     | Notes                                                            |
| --------------------- | -------- | ---------------------------------------------------------------- |
| `searchJobs`          | query    | Paged. Inactive excluded unless `includeInactive`.               |
| `getJob`              | query    | Listing, locations, sources, people in process, own application. |
| `getCompany`          | query    | By company key; up to 200 listings, open first, with applicants. |
| `listPeopleInProcess` | query    | Paged community applications with member identity.               |
| `listMyApplications`  | query    | Own applications with notes, visibility and timeline.            |
| `saveApplication`     | mutation | `CONFLICT` if already tracking; `NOT_FOUND` for an unknown job.  |
| `updateApplication`   | mutation | Partial. Rechecks round and label against the stored stage.      |
| `removeApplication`   | mutation | Deletes the row; history cascades.                               |

Listings never expose delivery state, identity keys or raw source data.

Application writes:

- Save and update write `JobApplication` and a `JobApplicationHistory` snapshot
  in one transaction. History is written on the initial save and when stage,
  round or interview label changes, not for notes or visibility.
- `occurredAt` is stored as `JobApplicationHistory.changedAt`. Sending it
  without a progress change is `BAD_REQUEST`.
- Leaving `interviewing` clears round and label, as the table checks require.
- Removal writes the audit event `job_board.application.removed` inside the
  transaction before the delete. The event carries the member and no job
  details, because officers read the audit log and the application may be
  private.

## Validation

`applicationSaveInputSchema` and `applicationUpdateInputSchema` gain
`interviewLabel` (trimmed, at most `MAX_APPLICATION_INTERVIEW_LABEL_LENGTH`,
only while interviewing) and `occurredAt` (not in the future). Other inputs
reuse the #646 schemas unchanged.

## Data / migration / compatibility

No schema or migration change. `changedAt` already accepts an explicit value.
One audit action key is added to the catalog. No existing procedure is renamed
or removed.

## Discord integration

None. Member identity includes `Member.discordUser` (a username) for display
only; it is never used for mentions.

## Configurability review

Would this require a developer change next year?

- Answer: No. Stages, tracks, categories and limits come from `JOB_BOARD`.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned? N/A.

## React / frontend constraints

None in this slice.

## Testing / verification strategy

- `packages/validators/src/tests/job-board.test.ts`: label and date rules.
- `packages/api/src/tests/integration/job-board.test.ts`: access, privacy,
  history and ownership against disposable PostgreSQL.
- `packages/api/src/tests/job-board/router-contract.test.ts` and the API surface
  snapshot pin the procedure names.

## Open questions

- See spec.md. Search returns rows only once #649's ingestion lands.
