# Agentic Framework Audit Guide

Use this before any Blade Reforge feature work begins.

## Reading order

1. [`README.md`](./README.md)
2. [`engineering-guidelines.md`](./engineering-guidelines.md)
3. [`test-generation-prompt.md`](./test-generation-prompt.md)
4. [`implementation-prompt.md`](./implementation-prompt.md)
5. [`agent-skills.md`](./agent-skills.md)

## Main audit question

Is this framework lean enough for student contributors but strict enough to keep agents from inventing scope or weakening tests?

## Specific questions

### Artifact model

- Is `spec.md` clearly non-technical/user-facing?
- Is `srd.md` the right place for technical design, interfaces, data, rollout, and migration notes?
- Are separate `design.md`, `interfaces.md`, and `migration.md` intentionally optional rather than default?
- Is `test-cases.md` clear as the behavioral oracle?

### Prompts

- Does the test-generation prompt say where tests should be placed and how they should be validated?
- Does the implementation prompt include enough git/diff mechanics?
- Are we correct to defer separate bugfix/review prompts until we see real repeated friction?

### Forge fit

- Do guidelines reference real Forge commands and docs?
- Do guidelines allow changing old patterns through an SRD instead of blindly preserving current debt?
- Does branch policy keep Reforge off `main` until cutover?

## Approval checklist

- [ ] Dylan approves the artifact model.
- [ ] Dylan approves the maintained prompt set.
- [ ] Dylan approves branch/cutover policy.
- [ ] Dylan approves initial agent skills or marks them for revision.
- [ ] Only then do we create the first Reforge change folder.
