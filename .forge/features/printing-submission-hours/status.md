# Printing Submission Hours Status

## Phase

Implementation complete; ready for review.

## Decisions

- Missing config defaults to closed for new submissions.
- Admins get a flexible enabled toggle plus optional open/close timestamps.
- Existing jobs remain visible/manageable while new uploads/submits are closed.

## Validation

- Passed: `pnpm format`.
- Passed: `pnpm lint` (repo has existing warnings only).
- Passed: `pnpm typecheck`.
- Passed command / skipped by environment: `pnpm --filter=@forge/api test -- src/tests/integration/printing.test.ts` (20 database integration tests skipped because the local test environment did not enable the disposable database suite).
