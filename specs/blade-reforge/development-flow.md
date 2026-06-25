# Blade Reforge Development Flow

## Feature flow

1. Write or update `requirements.md` for changed intent.
2. Write or update `design.md` for structure/lifecycle/failure behavior.
3. Write or update `interfaces.md` for contracts.
4. Write or update `test-cases.md` for observable proof.
5. Generate tests using `docs/agentic-development/test-generation-prompt.md`.
6. Confirm new tests fail for the intended reason when practical.
7. Implement using `docs/agentic-development/implementation-prompt.md`.
8. Validate with targeted and broad checks.
9. Review using `docs/agentic-development/review-prompt.md`.

## Brownfield flow

For existing Blade behavior, characterize first:

1. Document observed behavior in `current-behavior.md`.
2. Decide what is preserved, changed, or intentionally dropped.
3. Add characterization, contract, or regression test cases.
4. Implement only after the behavior and proof are clear.

## Bug flow

Bugs are missing or incorrect specifications until proven otherwise. Update the owning artifact and regression test before fixing code.
