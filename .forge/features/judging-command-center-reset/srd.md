# Judging Command Center Reset SRD

Status: Approved

## Technical purpose

Add audited, officer-only judging reset procedures and reorganize the Blade command center around the actual launch sequence.

## Relevant principles

- [Authorization and permissions](../../../docs/agentic-development/forge-engineering-principles.md#6-authorization-and-permissions)
- [Data and transaction boundaries](../../../docs/agentic-development/forge-engineering-principles.md#7-data-and-transaction-boundaries)
- [React and Next.js](../../../docs/agentic-development/forge-engineering-principles.md#8-react-and-nextjs)

## Access policy

Every reset/delete procedure uses `permProcedure` and `assertCanManageProjects`. Judges, hackers, and unauthenticated callers are rejected before a transaction begins.

## Architecture / data flow

- `@forge/validators` owns typed destructive inputs and audit catalog entries.
- `@forge/api` locks the selected hackathon or room, validates confirmation and dependencies, deletes in foreign-key-safe order, and writes an aggregate audit event in the same transaction.
- Blade renders dialogs and refreshes server-owned command-center data after success.

## tRPC/API behavior

- `judging.dropEvaluations`: deletes drafts/evaluations and clears `firstResultAt` so the saved schedule can be dropped again.
- `judging.dropRooms`: deletes all rooms and room-scoped access data after the schedule is gone.
- `judging.resetProjects`: deletes deliberation entries, claims, projects, and non-group challenges, and clears inventory-lock metadata after downstream judging data is gone.
- `judging.resetSetup`: restores starter groups and clears the rubric after downstream rooms, schedules, and feedback are gone.
- `judging.resetLaunch`: clears claims/claim links and restores publication, visibility, and judging-state defaults.
- `judging.resetHackathon`: performs the full reset atomically.
- `judging.deleteRoom`: permanently deletes one unreserved room.

## Validation

Hackathon resets require the exact hackathon display name. Room deletion requires the exact room name. Inputs are length-bounded UUID/name schemas.

## Data / migration / compatibility

No schema or migration is required. Full reset preserves the Hackathon, global JudgingBuilding rows, users, and append-only admin audit data. Existing Discord threads are not modified.

## Discord integration

Reset deletes Forge room/thread references and room access data. It does not make external Discord deletion calls inside the database transaction.

## Configurability review

No annual code change is required. Starter judging groups continue to come from the existing default group configuration.

## React / frontend constraints

The admin page remains server-first. Client components own dialogs, optimistic tab navigation, and mutations. Existing Blade tokens/components and 44px controls are retained. Error dialogs open once per scheduler job/error key and do not alter page flow.

## Testing / verification strategy

- Disposable PostgreSQL integration coverage for granular evaluation cleanup, room deletion constraints/cascades, exact confirmation, and full reset defaults.
- Blade component tests for affected room/setup fixtures and browser testing of desktop/mobile command-center states.
- API surface, audit coverage, React analysis, lint, typecheck, build, and precommit gates.

## Open questions

- None.
