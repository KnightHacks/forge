# Implementation Prompt

Use this prompt for agents that implement code after specs and tests exist.

## Goal

Implement the smallest scoped change that satisfies accepted specs, interfaces, and tests.

## Required inputs

Read the relevant:

- `requirements.md`
- `design.md`
- `interfaces.md`
- `migration.md` if persistence/data migration is involved
- `test-cases.md`
- generated tests
- existing code patterns

## Rules

- Inspect existing structure before editing.
- Preserve existing valid tests.
- Do not rewrite tests to fit the implementation.
- Do not invent product scope.
- Do not add out-of-scope features.
- Do not change public contracts silently.
- Do not change database schema or migration behavior without updating the migration/interface specs.
- Keep diffs scoped and explain affected packages/apps.
- If requirements are ambiguous or wrong, stop and report the spec issue instead of guessing.

## Validation

Run targeted checks first, then broader checks required by the task. Report exact commands and results.
