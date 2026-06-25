# Test Generation Prompt

Use this prompt for agents that generate tests from specs.

## Goal

Generate tests from behavioral test cases without implementing product behavior.

## Required inputs

Read the relevant:

- `requirements.md`
- `design.md`
- `interfaces.md`
- `migration.md` if persistence/data migration is involved
- `test-cases.md`
- existing test utilities and patterns

## Rules

- Do not implement product code.
- Do not change requirements to make tests easier.
- Do not rewrite or weaken existing valid tests.
- Prefer public interfaces over private implementation details.
- Use isolated fixtures and temporary state.
- Do not mock the behavior being tested unless the interface explicitly requires a mock boundary.
- Each important test should reference a test-case ID.
- Negative tests should assert the failure class or observable failure, not merely “something failed.”

## Completion criteria

- Tests map back to test-case IDs.
- Tests are black-box where appropriate.
- Tests fail clearly for the intended reason before implementation when practical.
- The required validation command is documented and has been run or the blocker is reported.
