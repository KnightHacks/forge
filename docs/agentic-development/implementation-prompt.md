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

**When a skill matches the work, read its `SKILL.md` first and follow it.** Skills add domain expertise and repo-specific commands; they do not override `spec.md`, `srd.md`, `test-cases.md`, `AGENTS.md`, or `forge-engineering-principles.md`. Vendored skills may include `FORGE_NOTES.md`; read that too before applying third-party guidance.

### Implementation-phase skills

Use these during code implementation and validation. Do not substitute spec/SRD/test-case writer skills for implementation work.

| Skill | Path | Use when |
| --- | --- | --- |
| Spec miner | `.claude/skills/spec-miner` | The SRD points at legacy or undocumented code and you need to map real behavior before editing. |
| React analyzer | `.claude/skills/react-analyzer` | Before or after meaningful React/TSX changes; pair with `pnpm analyze:react <path>` or `pnpm analyze:react:changed`. |
| React expert | `.claude/skills/react-expert` | Building or refactoring components, hooks, client/server boundaries, Suspense, forms, or interactive UI. |
| Next.js developer | `.claude/skills/nextjs-developer` | App Router pages, RSC, server actions, route handlers, `loading.tsx`/`error.tsx`, middleware, or streaming SSR. |
| TypeScript pro | `.claude/skills/typescript-pro` | tRPC procedures, Zod validators, advanced types, or end-to-end type-safety changes. |
| Test master | `.claude/skills/test-master` | Fixing or extending generated tests, mocking strategy, or test harness work tied to the SRD. |
| Playwright expert | `.claude/skills/playwright-expert` | Writing, debugging, or extending Playwright E2E tests and fixtures. |
| Playwright skill | `.claude/skills/playwright-skill` | Agent-driven browser verification of implemented UI flows, forms, responsive behavior, or runtime UX. |
| Architecture designer | `.claude/skills/architecture-designer` | The SRD requires an architectural decision, ADR, or cross-package boundary review before coding. |
| Deslop | `.claude/skills/deslop` | Reviewing user-facing copy, comments, or `status.md` prose for AI-sounding filler. |

### Out of scope for this prompt

These skills own earlier phases of the loop. If implementation reveals spec/SRD/test-case gaps, stop and route back instead of silently rewriting artifacts:

- `.claude/skills/forge-spec-writer` — `spec.md`
- `.claude/skills/forge-srd-writer` — `srd.md`
- `.claude/skills/forge-test-case-writer` — `test-cases.md`

Test generation from `test-cases.md` uses [`test-generation-prompt.md`](./test-generation-prompt.md), not the implementation prompt.

### Skill usage rules

1. Match skills to touched surfaces, not every file in the diff. One frontend feature may need `react-analyzer` + `react-expert` + `nextjs-developer`; a tRPC-only change may need only `typescript-pro`.
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

3. Read matching skills from `.claude/skills/` (and any `FORGE_NOTES.md`) before editing.
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

Before pushing Reforge work, `pnpm verify:push` should pass unless a blocker is explicitly documented. Before committing meaningful React changes, run `pnpm analyze:react:changed`; use `pnpm analyze:react <path>`, `pnpm analyze:react:all`, or filtered package scripts for broader frontend analysis. For high-value UI flows, run the owning app's `e2e` script or use the Playwright skill for targeted browser verification. Do not claim a command passed unless it actually ran and passed.
