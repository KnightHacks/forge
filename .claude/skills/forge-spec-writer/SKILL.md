---
name: forge-spec-writer
description: Reverse-prompt the human to create or revise a Forge feature spec.md. Do not fill the spec from guesses. Use .forge templates and keep feature status.md updated.
---

# Forge Spec Writer

Use this skill when creating or revising `.forge/features/<slug>/spec.md`.

## Source of truth

Read first:

- `docs/agentic-development/README.md`
- `docs/agentic-development/forge-engineering-principles.md`
- `.forge/templates/feature/spec.md`
- the feature's `.forge/features/<slug>/status.md` if it exists

## Non-negotiable behavior

- Reverse-prompt the human. Do not fill the spec from guesses.
- Challenge vague scope, hidden users, missing non-goals, and user-visible interface gaps.
- Keep `spec.md` non-technical. Technical design belongs in `srd.md`.
- Keep `status.md` updated with decisions, open questions, and current phase.
- If the feature folder does not exist, instantiate templates with:

```bash
pnpm forge:feature <feature-slug> "<Feature Name>"
```

## Reverse-prompt areas

Ask about:

- user-facing purpose
- actors/users
- user-visible surfaces: pages, forms, admin screens, Discord interactions, messages, states
- scope and non-goals
- vocabulary
- acceptance criteria
- what should be configurable by non-devs
- what should explicitly not be solved now

## Output

Your output should be questions, challenge notes, and proposed edits for human approval. Do not silently complete the spec.
