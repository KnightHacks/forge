# Agentic Development Framework Audit Guide

This document is for reviewing the Blade Reforge agentic development framework before any feature work begins.

## Review goal

Confirm that the workflow, prompts, branch policy, and spec framework are sound enough to use for Blade Reforge.

Do **not** begin feature specs or implementation until this audit is complete.

## Recommended reading order

1. [`README.md`](./README.md) — philosophy, loop, truth ownership, lightweight-change rules.
2. [`engineering-guidelines.md`](./engineering-guidelines.md) — shared quality floor and monorepo safety rules.
3. [`test-generation-prompt.md`](./test-generation-prompt.md) — constraints for agents that write tests.
4. [`implementation-prompt.md`](./implementation-prompt.md) — constraints for agents that write code.
5. [`review-prompt.md`](./review-prompt.md) — constraints for agents that review diffs.
6. [`bugfix-prompt.md`](./bugfix-prompt.md) — repair loop for bugs/regressions.
7. [`agent-skills.md`](./agent-skills.md) — proposed reusable skill roles and when to use them.
8. [`../../specs/blade-reforge/README.md`](../../specs/blade-reforge/README.md) — how this framework maps to Blade Reforge.
9. [`../../specs/blade-reforge/development-flow.md`](../../specs/blade-reforge/development-flow.md) — Reforge-specific development loop.
10. [`../../specs/blade-reforge/tasks.md`](../../specs/blade-reforge/tasks.md) — current framework-first tasks.

## Audit questions

### Workflow

- Is the order correct: specs → test cases → generated tests → implementation → review?
- Does the process make bugs update specs/tests before code?
- Is the lightweight-change policy clear enough to avoid ceremony?

### Truth ownership

- Is it clear which artifact owns each kind of truth?
- Are any truths duplicated across multiple docs?
- Are any important truths missing an owning artifact?

### Agent constraints

- Are test-writing agents sufficiently blocked from implementing product code?
- Are implementation agents sufficiently blocked from changing tests to fit code?
- Are review agents checking the right risks?
- Are bugfix agents forced to create regression coverage?

### Monorepo safety

- Does the process protect current `main` delivery?
- Does it prevent confusing Reforge implementation with production Blade?
- Does it require shared package consumer analysis?
- Does it provide a sane final cutover model?

### Readiness to proceed

Before feature work begins, these should be true:

- [ ] Dylan has reviewed the agentic development docs.
- [ ] The dev lead agrees with branch policy.
- [ ] The team agrees that Reforge PRs target `reforge/main`, not `main`.
- [ ] The prompt docs are accepted or revised.
- [ ] The first pilot feature is intentionally selected.

## Feedback format

When reviewing, leave notes as:

```md
File: <path>
Section: <heading>
Concern: <what feels wrong or missing>
Suggestion: <proposed change>
Severity: blocker | should-fix | nice-to-have
```
