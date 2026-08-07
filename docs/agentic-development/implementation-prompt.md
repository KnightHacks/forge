# Implementation Prompt

Use this for agents that implement code after specs and tests exist.

## Goal

Implement the smallest scoped diff that satisfies `spec.md`, `srd.md`, `test-cases.md`, generated tests, and `status.md`.

## Required reading

Before editing, read:

- `spec.md`
- `srd.md`
- `test-cases.md`
- `status.md`
- generated tests
- `docs/agentic-development/forge-engineering-principles.md`
- relevant Forge docs and nearby code patterns

## Skill registry

Forge ships repo-level agent skills under `.claude/skills/`. The full registry and agent-surface notes live in [`agent-skills.md`](./agent-skills.md).

**When a skill matches the work, read its `SKILL.md` first and follow it.** Skills add repo-specific expertise and commands; they do not override `spec.md`, `srd.md`, `test-cases.md`, `AGENTS.md`, or `forge-engineering-principles.md`.

### Implementation-phase skills

Use these during code implementation and validation. Do not substitute spec/SRD/test-case writer skills for implementation work.

| Skill            | Path                              | Use when                                                                                                                       |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Forge placement  | `.claude/skills/forge-placement`  | Adding a helper, constant, type, or component, or unsure which file or package owns something. Read it before creating a file. |
| Forge API        | `.claude/skills/forge-api`        | Adding or changing a tRPC procedure, access guard, audit event, or anything under `packages/api`.                              |
| Forge React      | `.claude/skills/forge-react`      | Building or changing components, client state, hooks, mutation UX, or splitting a large component.                             |
| Frontend design  | `.claude/skills/frontend-design`  | Any meaningful UI creation, reshaping, dashboard, form, data-display, responsive, or interaction work.                         |
| React analyzer   | `.claude/skills/react-analyzer`   | Before or after meaningful React/TSX changes; pair with `pnpm analyze:react <path>` or `pnpm analyze:react:changed`.           |
| Playwright skill | `.claude/skills/playwright-skill` | Agent-driven browser verification of implemented UI flows, forms, responsive behavior, or runtime UX.                          |
| Forge review     | `.claude/skills/forge-review`     | Reviewing a diff or branch before committing meaningful work, before a PR, or before merging.                                  |
| Deslop           | `.claude/skills/deslop`           | Reviewing user-facing copy, comments, or `status.md` prose for AI-sounding filler.                                             |

### Out of scope for this prompt

These skills own earlier phases of the loop. If implementation reveals spec/SRD/test-case gaps, stop and route back instead of silently rewriting artifacts:

- `.claude/skills/forge-spec-writer` — `spec.md`
- `.claude/skills/forge-srd-writer` — `srd.md`
- `.claude/skills/forge-test-case-writer` — `test-cases.md`

Test generation from `test-cases.md` uses [`test-generation-prompt.md`](./test-generation-prompt.md), not the implementation prompt.

### Skill usage rules

1. Match skills to touched surfaces, not every file in the diff. One frontend feature may need `forge-react` + `frontend-design` + `react-analyzer`; a tRPC-only change may need only `forge-api`. `forge-placement` applies whenever a new file is created.
2. Read the skill before improvising. Do not paraphrase a skill from memory.
3. Run the skill's repo commands when it documents them (`pnpm analyze:react:changed`, app `e2e` scripts, Playwright flows, etc.).
4. If multiple skills apply, read all relevant `SKILL.md` files up front, then implement once.
5. If no skill fits, follow nearby code patterns and the SRD. Do not invent a new workflow.

## Work sequence

1. Inspect current repo state:

   ```bash
   git status --short
   git branch --show-current
   ```

2. Restate:
   - goal
   - scope/non-scope
   - current phase from `status.md`
   - files/packages likely involved
   - skills to read from the registry above
   - tests/checks to run
   - ambiguities or blockers

3. Read matching skills from `.claude/skills/` before editing.
4. Inspect existing patterns before editing.
5. Implement the smallest change.
6. Use diffs while working:

   ```bash
   git diff --stat
   git diff --name-only
   git diff --check
   git diff
   ```

7. Run narrow validation first, then broader validation as required.
8. Update `status.md` with completed tasks, validation status, and follow-ups.
9. Summarize changed files, spec/test IDs satisfied, skills used, commands run, and remaining risks.

## Rules

- Do not rewrite tests to fit implementation.
- Do not invent behavior outside the spec/SRD.
- Do not silently change public contracts.
- Do not do broad cleanup or refactors unless the SRD calls for it.
- Do not create separate service files just for architectural purity; tRPC procedures may own focused workflow logic unless the SRD says otherwise.
- Do not add REST routes for business logic; use tRPC. Route handlers are only for protocol-mandated external boundaries.
- Every SRD-backed operation must implement the documented access policy.
- Mutations should include responsive UX handling: pending/loading, success, error, and safe user-facing messages where applicable.
- If a change hard-codes routine organizational state, stop and ask whether it should be admin-configurable instead.
- If a change adds or reshapes tRPC procedures, consider whether Zod descriptions/JSDoc/procedure naming should be improved for generated API/LLM context.
- Do not change DB schema, auth, permissions, payment, email, uploads, or deployment behavior without explicit SRD coverage and human approval.
- If specs conflict with code reality, stop and report the mismatch instead of guessing.

## Validation

Choose validation based on touched areas. Common commands:

```bash
pnpm verify:push
pnpm format
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db typecheck
```

Before pushing, `pnpm verify:push` should pass unless a blocker is explicitly documented. Before committing meaningful React changes, run `pnpm analyze:react:changed`; use `pnpm analyze:react <path>`, `pnpm analyze:react:all`, or filtered package scripts for broader frontend analysis. For high-value UI flows, run the owning app's `e2e` script or use the Playwright skill for targeted browser verification. Do not claim a command passed unless it actually ran and passed.
