# Test Generation Prompt

Use this for agents that generate tests from `test-cases.md`.

## Goal

Create tests that prove observable behavior described in `test-cases.md`. Do not implement product code.

## Required inputs

Read:

- `spec.md`
- `srd.md`
- `test-cases.md`
- `status.md`
- existing test patterns/utilities in the affected app/package
- relevant Forge docs from `docs/REPO-CONVENTIONS.md` and `docs/DATABASE-USAGE.md` when applicable

## Test placement

Place tests at the boundary that owns the behavior:

- UI/user flow behavior → app-level tests near the app or established e2e location once one exists.
- API/tRPC behavior → API/package-level integration tests near `packages/api` or the established test harness.
- Shared package behavior → tests in the owning package.
- DB/migration behavior → DB package tests or migration validation scripts.
- Cross-app contract behavior → contract tests that exercise the documented public interface.

If Forge does not yet have an established harness for the needed level, propose the smallest harness in the owning package/app and document the command in `status.md` or the PR. Do not scatter ad-hoc tests in unrelated locations.

## Rules

- Do not implement product behavior.
- Do not change specs to make tests easier.
- Do not rewrite or weaken existing valid tests.
- Prefer public interfaces over private implementation details.
- Avoid asserting private file layout, exact implementation helpers, or private DB details unless the SRD defines them as contracts.
- Use deterministic isolated fixtures.
- Each important test should reference a test-case ID.
- Negative tests should assert a specific failure class or observable result.

## Failure check

When practical, run the new tests before implementation and confirm they fail for the intended reason. If they pass immediately, explain whether behavior already exists or the test is too weak.

## Output expected

- Test files or a clearly scoped test harness proposal.
- Mapping from test files to test-case IDs.
- Exact commands run and results.
- Any blockers preventing reliable test generation.
- `status.md` updated with test generation progress and validation status.
