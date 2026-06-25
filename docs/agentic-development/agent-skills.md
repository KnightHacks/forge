# Proposed Agent Skills

These are candidate reusable operating modes. We should not turn all of them into permanent skills immediately. Promote a skill only after the pattern repeats.

## Core skills to start with

### Spec/SRD Writer

Creates or revises:

- `spec.md` for non-technical user/product intent
- `srd.md` for technical requirements, architecture, contracts, data, and rollout constraints

Rules:

- Keep `spec.md` user-facing and non-technical.
- Put technical decisions and interface details in `srd.md`.
- Mark assumptions and open questions instead of guessing.

### Test Case Writer

Creates or revises `test-cases.md`.

Rules:

- Use setup/action/expected observations.
- Prefer black-box behavior.
- Include negative and regression cases.
- Reference requirement or contract IDs when useful.

### Test Generator

Uses `test-generation-prompt.md` to create actual tests.

Rules:

- Do not implement product code.
- Place tests at the owning boundary.
- Map tests back to test-case IDs.

### Implementation Agent

Uses `implementation-prompt.md` to implement code.

Rules:

- Work from specs and tests.
- Use git diff mechanics.
- Keep changes scoped.
- Report ambiguity instead of inventing behavior.

## Possible later skills

### Review Agent

Do not maintain a separate prompt yet. If reviews repeatedly miss spec drift, test gaps, or contract changes, extract a review skill later.

### Bugfix Agent

Do not maintain a separate prompt yet. For now, bugfix behavior is part of the normal loop: update spec/SRD/test-cases, add regression, then implement.

### Main Sync Auditor

Likely useful once `reforge/main` diverges. It would document merges from `main` into `reforge/main`, conflict decisions, and production fixes that need to be ported.
