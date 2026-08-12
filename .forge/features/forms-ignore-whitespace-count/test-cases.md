# Whitespace-Aware Form Character Limits Test Cases

Status: Approved

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

Test short-text and paragraph counting/validation across whitespace kinds and
the configured maximum. Non-text questions and persisted-data migration are
excluded because their behavior and storage do not change.

## Test placement plan

- `packages/validators/src/tests/forms-platform.test.ts`
- `apps/blade/src/tests/forms/generic-form-response-form.test.tsx`
- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/blade test`

## Test cases

### TC-001: Counters ignore whitespace

Setup:

- A short-text or paragraph question has a configured maximum.

Action:

- The respondent enters text containing spaces, tabs, and line breaks.

Expected observations:

- The displayed count includes only non-whitespace characters.
- The field does not use the browser's raw `maxLength` constraint.

### TC-002: Boundary response is accepted unchanged

Setup:

- A text question has a maximum of three characters.

Action:

- Validate `a b c`.

Expected observations:

- Validation succeeds because the non-whitespace count is three.
- The returned response remains exactly `a b c`.

## Negative / regression cases

### TC-NEG-001: Non-whitespace overflow is rejected

Setup:

- A text question has a maximum of three characters.

Action:

- Validate `a b c d`.

Expected observations:

- Validation rejects the response with a message that identifies the
  three-character limit.

## Open questions

- None.
