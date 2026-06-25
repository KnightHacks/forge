# Engineering Guidelines

These guidelines are for agentic work on `reforge/main`. They should reference real Forge mechanics while allowing Reforge to intentionally improve old patterns through specs/SRDs.

## Branch and review policy

- Current production work targets `main`.
- Reforge work targets `reforge/main` through reviewed `reforge/*` branches.
- Do not put Reforge implementation on `main` until cutover.
- Regularly merge `main` into `reforge/main` and document meaningful conflict decisions.

## Existing docs to read

Before editing code, read the relevant current Forge docs:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/REPO-CONVENTIONS.md`
- `docs/DATABASE-USAGE.md` before schema/table/query semantics changes
- the relevant `spec.md`, `srd.md`, and `test-cases.md` for Reforge work

## Important nuance: preserve behavior, not debt

Current Forge conventions are the baseline for understanding the repo. They are not automatically the desired Reforge design.

- Preserve current behavior unless the spec/SRD explicitly changes it.
- Do not copy known debt just because it exists.
- If changing an old pattern, document the new intended pattern in `srd.md`.
- If changing a shared package contract, document affected consumers and validation.

## Real Forge commands

From repo root:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

Useful targeted checks:

```bash
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/club typecheck
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db typecheck
pnpm db:generate
pnpm db:migrate
```

Database commands require appropriate local environment setup. Do not claim they passed unless actually run.

## Git/diff discipline

Use diffs constantly:

```bash
git status --short
git diff --stat
git diff --name-only
git diff --check
git diff
```

Before committing, the diff should answer:

- Which spec/SRD/test case does this implement?
- Which apps/packages are touched?
- Which shared consumers could be affected?
- Which tests/checks were run?
- What is intentionally out of scope?

## Shared package safety

For `packages/*` changes, identify affected consumers. At minimum, inspect imports/usages and run targeted typechecks for impacted apps/packages when practical.

## Security and data hygiene

- Never commit secrets, `.env` files, tokens, credentials, private keys, or production data.
- Do not log secrets or sensitive user data.
- Do not alter auth, permissions, payments, email, uploads, deployment, or database schema without explicit SRD coverage and human approval.
