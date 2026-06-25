# Implementation Prompt

Use this for agents that implement code after specs and tests exist.

## Goal

Implement the smallest scoped diff that satisfies `spec.md`, `srd.md`, `test-cases.md`, and generated tests.

## Required reading

Before editing, read:

- `spec.md`
- `srd.md`
- `test-cases.md`
- generated tests
- `docs/agentic-development/engineering-guidelines.md`
- relevant Forge docs and nearby code patterns

## Work sequence

1. Inspect current repo state:

   ```bash
   git status --short
   git branch --show-current
   ```

2. Restate:
   - goal
   - scope/non-scope
   - files/packages likely involved
   - tests/checks to run
   - ambiguities or blockers

3. Inspect existing patterns before editing.
4. Implement the smallest change.
5. Use diffs while working:

   ```bash
   git diff --stat
   git diff --name-only
   git diff --check
   git diff
   ```

6. Run narrow validation first, then broader validation as required.
7. Summarize changed files, spec/test IDs satisfied, commands run, and remaining risks.

## Rules

- Do not rewrite tests to fit implementation.
- Do not invent behavior outside the spec/SRD.
- Do not silently change public contracts.
- Do not do broad cleanup or refactors unless the SRD calls for it.
- Do not change DB schema, auth, permissions, payment, email, uploads, or deployment behavior without explicit SRD coverage and human approval.
- If specs conflict with code reality, stop and report the mismatch instead of guessing.

## Validation

Choose validation based on touched areas. Common commands:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db typecheck
```

Do not claim a command passed unless it actually ran and passed.
