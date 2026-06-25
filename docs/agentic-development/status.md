# Agentic Development Framework Status

This file tracks progress on the Blade Reforge agentic development framework over time.

Current priority: settle the framework and engineering principles before creating Blade Reforge specs, feature folders, implementation branches, or permanent skills.

## Current phase

Framework design and audit.

## Active decisions

- [x] Use `reforge/main` as the Reforge integration branch.
- [x] Keep Reforge implementation off `main` until cutover.
- [x] Remove premature `specs/` tree until the framework is approved.
- [x] Keep the default artifact model lean: `spec.md`, `srd.md`, `test-cases.md`, plus optional `notes.md`.
- [x] Treat `spec.md` as non-technical/user-facing.
- [x] Treat `srd.md` as the technical implementation/system requirements document.
- [x] Keep `test-cases.md` as the behavioral oracle.
- [x] Do not maintain separate `bugfix-prompt.md` or `review-prompt.md` yet.
- [ ] Define ideal Blade/Future Forge engineering principles before feature work.
- [ ] Decide when separate docs like `interfaces.md`, `design.md`, or `migration.md` are justified.
- [ ] Decide what test harnesses and test placement should look like in ideal Forge.

## Paused

- [ ] Agent skills are paused for now. Do not configure or expand skills until the core framework and engineering principles are clearer.

## Open framework tasks

- [ ] Dylan audits `docs/agentic-development/README.md`.
- [ ] Dylan audits `docs/agentic-development/engineering-guidelines.md`.
- [ ] Dylan audits `docs/agentic-development/test-generation-prompt.md`.
- [ ] Dylan audits `docs/agentic-development/implementation-prompt.md`.
- [ ] Revise engineering guidelines into ideal-world Blade/Future Forge engineering principles.
- [ ] Revise test-generation prompt after deciding test architecture and placement.
- [ ] Revise implementation prompt after deciding how agents should use specs, SRDs, tests, and git diffs.
- [ ] Revisit `agent-skills.md` only after framework approval.

## Engineering principles topics to decide

These should be discussed before rewriting `engineering-guidelines.md`:

- [ ] React/server/client component philosophy.
- [ ] Route/page structure and feature organization.
- [ ] tRPC/API paradigm.
- [ ] Where business logic should live.
- [ ] Database access patterns.
- [ ] Schema/migration philosophy.
- [ ] Validation and type-safety boundaries.
- [ ] Auth/session/permissions model.
- [ ] Testing strategy and test placement.
- [ ] UI/component system boundaries.
- [ ] Error handling and observability.
- [ ] Background jobs/cron/integration boundaries.
- [ ] Migration/cutover strategy for production data.
- [ ] Agent workflow mechanics and diff discipline.

## Next intended step

Reverse-prompt Dylan heavily on the ideal technical architecture before writing new engineering principles. The next revision should describe the future we want, not merely preserve the current repo. Current Forge docs and code will enrich the principles after we define the target.

## Change log

- 2026-06-25: Created status tracker. Skills paused. Next step is technical architecture reverse-prompting before revising engineering principles.
