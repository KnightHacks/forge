# Blade Reforge Test Cases

Status: Draft.

This document owns project-level behavioral and release-readiness test cases. Feature-level cases live under `features/<feature>/test-cases.md`.

## Test principles

- Test observable behavior through public interfaces where practical.
- Avoid private implementation details unless they are part of a documented contract.
- Use isolated deterministic fixtures.
- Trace important tests to requirement, interface, migration, or test-case IDs.

## Project-level cases

### BR-TC-001: Current delivery remains unblocked

Setup: Current production delivery continues from `main`.  
Action: Reforge work proceeds on `reforge/main`.  
Expected: Reforge implementation does not appear on `main` before cutover, and current delivery PRs can continue targeting `main`.

### BR-TC-002: Final cutover is release-reviewed

Setup: Reforge implementation has been reviewed incrementally into `reforge/main`.  
Action: A cutover PR promotes Reforge to `main`.  
Expected: The PR includes reviewed PR links, latest-main sync info, validation results, migration/rollback notes if applicable, and release approval checklist.
