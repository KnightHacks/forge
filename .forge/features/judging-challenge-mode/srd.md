# Judging Challenge Mode SRD

Status: Accepted

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Represent three mutually exclusive judging modes while preserving the existing scheduling model. Scheduled and Unscheduled retain their current meaning; Remote behaves as untimed for judge access and is excluded from hacker itinerary output.

## Relevant principles

- Apps remain thin clients; mode normalization and hacker visibility live in `@forge/api`.
- Shared mode vocabulary lives in `@forge/consts`; validation lives in `@forge/validators`.
- Database invariants prevent contradictory scheduling flags.
- Existing authorization and lifecycle guards remain authoritative.

## Access policy

No access-policy change. Existing project challenge configuration permissions control mutations. Existing judging scope, authentication, assignment, and judging-state checks control evaluation access. Hacker itinerary access remains tied to an authenticated claimed project.

## Architecture / data flow

- `@forge/consts` exports the three mode values.
- `@forge/db` adds a persisted `isRemote` flag alongside `isScheduled`.
- `@forge/validators` accepts a single `judgingMode` value for challenge and group mutations.
- `@forge/api` maps that value to database flags, exposes the derived mode to Blade, excludes remote challenges from hacker itinerary output, and keeps remote evaluations untimed.
- Blade renders a dropdown and submits the selected mode.
- The 2026 hacker UI needs no branching because the API omits remote challenges.

## tRPC/API behavior

`createGroup`, `updateGroup`, and `updateChallenge` accept `judgingMode` instead of the checkbox-shaped `isScheduled` input. Mode mapping is exhaustive:

- `scheduled` -> `isScheduled=true`, `isRemote=false`
- `unscheduled` -> `isScheduled=false`, `isRemote=false`
- `remote` -> `isScheduled=false`, `isRemote=true`

Challenge configuration reads return `judgingMode`. Hacker itinerary reads exclude remote root challenges before producing scheduled or unscheduled output. Judge evaluation access continues to treat every non-scheduled challenge as untimed.

## Validation

Use a shared enum schema. Reject unknown modes. API mapping must not accept contradictory boolean combinations from callers.

## Data / migration / compatibility

Add `is_remote boolean not null default false` to project challenges and a check constraint forbidding `is_scheduled=true` with `is_remote=true`. Existing rows remain behaviorally identical because they migrate as non-remote. Generate and commit the Drizzle migration and metadata. Resetting judging configuration restores Scheduled and clears Remote.

## Discord integration

Not applicable.

## Configurability review

Would this require a developer change next year?

- Answer: No. Modes are stable workflow semantics; individual challenges remain organizer-configurable.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned? Not applicable.

## React / frontend constraints

Keep the existing client component boundary. Replace each schedule checkbox with the existing styled native select pattern. Preserve loading and disabled behavior, including inherited read-only values for collapsed children. Do not add local state when form state already owns the selection.

## Testing / verification strategy

- Validator tests cover all valid values and reject invalid values.
- API integration tests cover persisted flag mapping, hacker visibility, inherited group mode, and judging reset.
- Judge-access integration tests prove a Remote challenge can open and submit a response outside any appointment window while existing guards remain active.
- Blade component tests cover dropdown labels, defaults, mutations, and disabled inherited mode.
- Browser verification captures organizer desktop and mobile states plus hacker omission where fixture data permits.

## Open questions

- None.
