# Blade Reforge Migration Strategy

Status: Draft.

This document owns production data continuity.

## Principles

- Production data preservation is a first-class requirement.
- Migration behavior must be dry-runnable before cutover.
- Any archival or dropped data must be explicit.
- Rollback must be documented before irreversible production changes.

## Migration requirements

- BR-MIG-001: Migration plans SHALL identify source records, target records, and mapping rules.
- BR-MIG-002: Migration dry-runs SHALL report counts and validation failures.
- BR-MIG-003: Existing user/profile/application/hackathon associations SHALL be preserved unless an archival rule says otherwise.
- BR-MIG-004: Cutover SHALL include backup and rollback procedures.

## To define

- Current production schema inventory
- Target schema or compatibility model
- Field mapping
- Archival policy
- Dry-run script behavior
- Validation checks
- Rollback plan
