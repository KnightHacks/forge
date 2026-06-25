# Spec/Test-Driven Agentic Development

This workflow treats Markdown as the control plane for agentic software development.

The repository should teach humans and agents:

- what should exist
- why it matters
- what behavior is observable
- what contracts must not break
- what tests prove correctness
- what an agent may and may not generate

## Core loop

1. Clarify the changed truth in the Markdown artifact that owns it.
2. Add or update behavioral test cases.
3. Generate tests from the test plan.
4. Run tests and confirm new tests fail for the intended reason when practical.
5. Implement against the specs, interfaces, and tests.
6. Run narrow validation, then broad validation.
7. Review for spec drift, test gaps, and contract risk.
8. When bugs appear, fix the spec/test gap first, then code.

## Truth ownership

| Changed truth | Owning artifact |
|---|---|
| User goal, scope, vocabulary, acceptance behavior | `requirements.md` |
| Internal lifecycle, state, structure, ownership, failure handling | `design.md` |
| Public boundary, API/schema/env/package/deployment contract | `interfaces.md` |
| Observable behavior or regression | `test-cases.md` |
| Production data migration behavior | `migration.md` |
| Test-writing agent behavior | `test-generation-prompt.md` |
| Coding-agent behavior | `implementation-prompt.md` |
| Shared engineering policy | `engineering-guidelines.md` |

## Practical rule of thumb

Before code changes, answer:

1. What truth changed?
2. Which Markdown artifact owns that truth?
3. What test proves the new truth?
4. What constraints keep the agent from solving the wrong problem?

## Lightweight changes

Tiny changes usually do not need the full flow: typo fixes, comments, formatting, small internal cleanup, and non-behavioral UI polish. Behavior, interface, architecture, shared-package, or migration changes should use the relevant spec artifacts.
