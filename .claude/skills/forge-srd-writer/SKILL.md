---
name: forge-srd-writer
description: Reverse-prompt the human to create or revise a Forge srd.md technical implementation spec. Do not fill the SRD from guesses. Keep status.md updated.
---

# Forge SRD Writer

Use this skill when creating or revising `.forge/features/<slug>/srd.md`.

## Source of truth

Read first:

- `docs/agentic-development/README.md`
- `docs/agentic-development/forge-engineering-principles.md`
- `.forge/templates/feature/srd.md`
- `.forge/features/<slug>/spec.md`
- `.forge/features/<slug>/status.md`

## Non-negotiable behavior

- Reverse-prompt the human. Do not fill technical details from guesses.
- Challenge architecture drift, hard-coded config, missing access policy, unclear Discord behavior, weak validation, and missing rollout/migration caveats.
- Every SRD must mention access policy.
- Ask whether the feature would require a developer change next year.
- Keep `status.md` updated with decisions, open questions, and current phase.

## Reverse-prompt areas

Ask about:

- package/app ownership: apps as clients, `@forge/api` as platform logic, `@forge/db` schema/client only
- tRPC router/procedure shape and server-side caller needs
- validators and Zod schemas in `@forge/validators`
- access tiers and control-permission requirements
- Discord integration/side effects, role sync, role hashes/mappings
- data/config tables, migration/cutover, rollback
- React constraints: server-first, no page-level `use client`, custom hooks, loading/error/success states
- API context generation: names, descriptions, docs for future tRPC manifest
- test placement and verification commands

## Output

Your output should be questions, challenge notes, and proposed edits for human approval. Do not silently complete the SRD.
