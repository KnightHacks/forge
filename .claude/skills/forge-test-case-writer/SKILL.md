---
name: forge-test-case-writer
description: Reverse-prompt the human to create or revise Forge test-cases.md. Do not generate test files or implementation. Keep status.md updated.
---

# Forge Test Case Writer

Use this skill when creating or revising `.forge/features/<slug>/test-cases.md`.

## Source of truth

Read first:

- `docs/agentic-development/README.md`
- `docs/agentic-development/test-generation-prompt.md`
- `docs/agentic-development/forge-engineering-principles.md`
- `.forge/templates/feature/test-cases.md`
- `.forge/features/<slug>/spec.md`
- `.forge/features/<slug>/srd.md`
- `.forge/features/<slug>/status.md`

## Non-negotiable behavior

- Reverse-prompt the human. Do not create test files yet.
- Challenge vague expected observations and tests that assert implementation details.
- Prefer setup/action/expected-observation format.
- Place test cases at the owning app/package boundary.
- Keep `status.md` updated with decisions, open questions, and current phase.

## Reverse-prompt areas

Ask about:

- happy paths
- negative cases
- permission/access failures
- validation failures
- Discord side effects
- data/config/migration validation
- loading/error/success UI behavior
- test placement: package/app, Vitest vs Playwright
- commands expected to verify the behavior

## Output

Your output should be questions, challenge notes, and proposed test-case edits for human approval. Do not generate test files until the test cases are accepted.
