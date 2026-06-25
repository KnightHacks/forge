# Blade Reforge Specs

Blade Reforge is a spec/test-driven, agent-assisted rebuild of Blade and its supporting Forge platform layers.

The goal is to preserve the original Forge/Blade vision — reusable profiles, shared hackathon infrastructure, and durable internal tooling — while addressing accumulated technical debt, undocumented behavior, and maintainability risk.

This is not a rejection of the current Blade implementation. Blade proved that Knight Hacks benefits from a reusable platform instead of rebuilding full-stack hackathon apps every year. Reforge exists because Blade became important enough to require stronger foundations.

## Branch policy

Reforge implementation does not live on `main` until cutover.

- `main`: current production/current dev-team delivery
- `reforge/main`: long-lived integration branch for Reforge
- `reforge/<task>`: short-lived branches reviewed into `reforge/main`

The eventual `reforge/main -> main` PR is a release/cutover review. Normal implementation review happens incrementally through PRs into `reforge/main`.

## Spec map

- `requirements.md` — project-level product truths and non-goals
- `design.md` — project-level architecture direction
- `interfaces.md` — cross-component contracts and compatibility boundaries
- `migration.md` — production data continuity strategy
- `test-cases.md` — project-level behavioral and release-readiness test cases
- `current-behavior.md` — observed legacy behavior
- `inventory.md` — monorepo/package/app inventory
- `risks.md` — risks, mitigations, and decision points
- `tasks.md` — current Reforge task plan
- `features/` — independently iterable feature specs
- `migration/` — detailed data migration specs
- `cross-cutting/` — shared concerns such as auth, shared packages, testing, deployment
