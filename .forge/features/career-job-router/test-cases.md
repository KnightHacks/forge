# Career Job Router Test Cases

Status: Implemented. Kept to the key rules, per the small-slice testing guidance.

## Scope

Member access, privacy of applications and notes, dated history, ownership, and
the default search filter. Preferences, digests, UI and ingestion are excluded.

## Test placement plan

- `pnpm --filter @forge/validators exec vitest run src/tests/job-board.test.ts`
- `pnpm --filter @forge/api with-env vitest run src/tests/integration/job-board.test.ts src/tests/job-board src/tests/root/api-surface.test.ts`
  (the integration file needs a local PostgreSQL and skips without one)

## Test cases

### TC-001: Search hides closed listings by default

Setup: one active and one inactive job for the same company.

Action: search by company, then with `includeInactive`.

Expected observations: one job, then two; unknown company or other track returns none.

### TC-002: Progress is dated, notes edits are not

Setup: a member saves a job as applied on a past date.

Action: move to interviewing round 1 with a label and a later past date, then edit notes only.

Expected observations: two history entries carrying the supplied dates; the notes edit adds none; moving to offer adds a third and clears round and label.

### TC-003: Community views show identity and no notes

Setup: one community application with notes, one private application.

Action: read the job view, company view and people-in-process list as the private owner.

Expected observations: only the community application, with name, Discord username and stage; no notes anywhere. The owner's own list and job view show their private application and notes.

### TC-004: Stage date and interview label input rules

Action: parse a label while interviewing and while applied; parse a past and a future date.

Expected observations: label kept only while interviewing; future date rejected.

## Negative / regression cases

### TC-NEG-001: No member profile

Action: a signed-in user without a member profile searches or saves.

Expected observations: `FORBIDDEN`.

### TC-NEG-002: Duplicate and misplaced input

Action: save the same job twice; set a round on an application that is not interviewing.

Expected observations: `CONFLICT`; `BAD_REQUEST`.

### TC-NEG-003: Another member's application

Action: update and remove someone else's application, then the owner removes it.

Expected observations: `NOT_FOUND` for the other member; the owner's removal deletes the row and its history and writes one audit event with no job details.

## Open questions

- None beyond spec.md.
