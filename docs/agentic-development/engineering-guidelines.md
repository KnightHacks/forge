# Engineering Guidelines for Agentic Work

## General rules

- Prefer existing Forge conventions unless a spec explicitly changes them.
- Keep changes scoped to the task and owning spec.
- Avoid unrelated refactors, formatting churn, dependency upgrades, or opportunistic cleanup.
- Do not log secrets, credentials, tokens, private user data, or production data.
- Do not fabricate test results, logs, screenshots, or command output.

## Dependencies

- Do not add production dependencies without human approval.
- Pin versions where reproducibility matters.
- Prefer repo-standard tooling and package-manager commands.

## Testing

- Add tests at the same level as the behavior.
- Prefer black-box behavioral tests for user-visible behavior and contracts.
- Use isolated, deterministic fixtures.
- Run narrow tests first, then broader validation.
- Tests should reference requirement/test-case IDs when possible.

## Monorepo scope

Shared package changes must identify affected consumers. A change to `packages/*` should explain which `apps/*` depend on it and which checks were run.
