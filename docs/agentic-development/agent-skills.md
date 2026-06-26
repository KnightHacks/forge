# Proposed Agent Skills

Skills are paused for now. Do not configure or expand permanent skills until the core framework and engineering principles are approved.

This file only records likely future operating modes.

## Likely core skills later

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

- Review Agent, if reviews repeatedly miss spec drift, test gaps, or contract changes.
- Bugfix Agent, if bug repairs repeatedly skip regression/spec updates.
- Main Sync Auditor, once `reforge/main` diverges and recurring merge triage becomes meaningful.

## Repo-level installed skills

- `.claude/skills/deslop` — use for prose/comment review to remove AI-sounding filler and keep writing human-readable.
- `.claude/skills/react-analyzer` — use with `pnpm analyze:react <path>` and `pnpm analyze:react:changed` for React component surface analysis before frontend refactors or UI SRDs.
- `.claude/skills/playwright-skill` — use for agent-driven browser verification, high-value user-flow validation, screenshots, forms, responsive behavior, and runtime UX checks.

## Agent surface compatibility

The framework should work across Claude, Codex, Cursor, and other agents.

- Claude-compatible skills live in `.claude/skills/*`.
- Codex and other repo-aware agents should follow `AGENTS.md` plus the prompt docs in `docs/agentic-development/*`.
- Cursor rules live in `.cursor/rules/*` and point back to the same canonical docs.

Do not encode unique process truth in only one agent surface. Agent-specific files should route back to the shared Markdown framework.
