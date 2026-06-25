# Proposed Agent Skills

This document defines reusable agent roles for Blade Reforge. These are not feature specs. They are operating modes/prompts we may turn into Hermes/Codex/Claude skills later.

## Skill: Spec Writer

### Purpose

Convert messy notes, issues, or meeting discussion into a scoped feature or project spec.

### Inputs

- User prompt, issue, meeting notes, or current behavior notes
- Relevant existing specs
- Product context

### Outputs

- `requirements.md`
- open questions
- explicit assumptions

### Rules

- Focus on user-visible intent, vocabulary, scope, and non-goals.
- Do not design implementation unless required to clarify scope.
- Add open questions instead of guessing.
- Use stable requirement IDs when requirements become concrete.

## Skill: Current Behavior Characterizer

### Purpose

Document how current Forge/Blade behaves before replacing or rewriting it.

### Inputs

- Current code
- Existing docs
- Runtime behavior when available
- Known bugs or team notes

### Outputs

- `current-behavior.md`
- characterization test candidates
- preservation/drop recommendations

### Rules

- Separate observed facts from assumptions.
- Do not improve behavior while characterizing it.
- Identify behavior that seems accidental or undocumented.

## Skill: Interface Mapper

### Purpose

Identify contracts between apps, packages, APIs, schemas, env vars, and integrations.

### Inputs

- Import graph
- Package exports
- API routers/routes
- Database schemas
- Deployment/env docs

### Outputs

- `interfaces.md`
- affected consumer list
- compatibility questions

### Rules

- Treat shared package exports as contracts if multiple apps consume them.
- Do not silently redefine public behavior.
- Flag breaking changes and versioning/adaptation options.

## Skill: Test Case Writer

### Purpose

Convert requirements and interfaces into behavioral test cases.

### Inputs

- `requirements.md`
- `design.md`
- `interfaces.md`
- `current-behavior.md` when relevant

### Outputs

- `test-cases.md`

### Rules

- Use setup/action/expected observations.
- Prefer black-box behavior.
- Include negative and regression cases.
- Avoid private implementation details.

## Skill: Test Generator

### Purpose

Generate actual test files from `test-cases.md`.

### Inputs

- `test-cases.md`
- existing test utilities
- `docs/agentic-development/test-generation-prompt.md`

### Outputs

- test files
- fixture updates
- validation command notes

### Rules

- Do not implement product code.
- Tests must map to test-case IDs.
- Tests should fail for the intended reason before implementation when practical.

## Skill: Implementation Agent

### Purpose

Implement the smallest code change that satisfies accepted specs and tests.

### Inputs

- accepted specs
- generated tests
- `docs/agentic-development/implementation-prompt.md`

### Outputs

- scoped code changes
- validation output
- notes on blockers or spec ambiguity

### Rules

- Do not rewrite tests to fit implementation.
- Do not invent behavior.
- Do not broaden scope.
- Report ambiguous or conflicting specs.

## Skill: Review Agent

### Purpose

Review diffs against specs, tests, interfaces, and branch policy.

### Inputs

- git diff
- relevant specs
- generated tests
- validation output
- `docs/agentic-development/review-prompt.md`

### Outputs

- blockers
- warnings
- suggested fixes
- required spec updates

### Rules

- Do not make speculative product changes.
- Focus on spec drift, missing tests, contract risk, and scope creep.

## Skill: Bugfix Agent

### Purpose

Turn bugs into durable specs/tests before fixing code.

### Inputs

- bug report or reproduction
- relevant specs/tests
- `docs/agentic-development/bugfix-prompt.md`

### Outputs

- updated owning artifact
- regression test case
- minimal fix after test exists

### Rules

- Do not weaken tests.
- Do not silently change contracts.
- Do not perform broad rewrites.

## Skill: Main Sync Auditor

### Purpose

When merging `main` into `reforge/main`, classify conflicts and production changes.

### Inputs

- merge diff/conflicts
- recent `main` commits
- Reforge specs

### Outputs

- updated `specs/blade-reforge/main-sync-log.md`
- ported production fixes or documented drops
- new spec/test follow-ups when production fixes reveal missing behavior

### Rules

- Reforge may win for intentionally replaced code, but production fixes must be triaged.
- Do not blindly discard `main` changes.
- Document every meaningful conflict resolution.
