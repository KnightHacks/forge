# Blade Reforge Risks

Status: Draft.

## Technical risks

- Long-lived branch drift from `main`.
- Shared package changes breaking other apps.
- Production data migration complexity.
- Agents implementing undocumented scope.
- Tests mirroring implementation instead of behavior.

## Organizational risks

- Reforge blocking hackathon-critical delivery.
- Contributors becoming confused about whether to use `main` or `reforge/main`.
- Rewrite losing momentum or becoming too large to cut over.
- Current maintainers feeling criticized by rewrite framing.

## Mitigations

- Keep current delivery on `main`.
- Keep Reforge implementation off `main` until cutover.
- Review Reforge incrementally into `reforge/main`.
- Merge `main` into `reforge/main` regularly.
- Maintain `main-sync-log.md`.
- Use specs/tests/prompts to constrain agents.
- Cut over only with validation, migration dry-run where relevant, and rollback.
