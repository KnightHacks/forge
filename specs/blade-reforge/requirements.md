# Blade Reforge Requirements

Status: Draft.

## Purpose

Blade Reforge preserves and matures Blade as Knight Hacks' unified member and hacker platform. It should reduce maintainability risk, preserve production data, and prepare future contributors to build with spec/test-driven agentic workflows.

## Durable truths

- Blade exists so Knight Hacks does not rebuild full-stack hackathon infrastructure every year.
- Reusable profiles across hackathon cycles are core to the product vision.
- Production user/profile/application/hackathon data must be preserved unless an explicit migration policy archives or drops it.
- Current Forge delivery must remain unblocked during Reforge development.
- Reforge implementation must not live beside production Blade on `main` before cutover.

## Requirements

- BR-REQ-001: The system SHALL preserve reusable identity/profile workflows across club and hackathon contexts.
- BR-REQ-002: The system SHALL preserve production data required for current and historical Knight Hacks operations unless explicitly archived.
- BR-REQ-003: The system SHALL support incremental feature specs that can be built and reviewed independently.
- BR-REQ-004: The system SHALL define public interfaces and compatibility boundaries before replacing shared package behavior.
- BR-REQ-005: The system SHALL use behavioral tests, contract tests, characterization tests, or migration tests to prove important behavior.
- BR-REQ-006: The current `main` branch SHALL remain available for time-sensitive delivery while Reforge work proceeds on `reforge/main`.

## Non-goals

- Rewriting all Forge apps at once.
- Breaking current hackathon delivery timelines.
- Force-pushing over `main` or rewriting public branch history.
- Treating generated code as trusted without tests and review.
