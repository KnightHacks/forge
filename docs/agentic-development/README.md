# Agentic Development Framework

This branch is still in framework-design mode. Do not start Blade Reforge feature implementation until Dylan approves this workflow and the engineering principles.

## What this is

Spec/test-driven agentic development treats Markdown as the control plane for AI work:

```txt
specs clarify intent → test cases define proof → tests constrain implementation → agents write code → failures improve specs/tests
```

The goal is not to maintain many documents. The goal is to make important truths explicit before an agent writes code.

## Lean artifact model

For each meaningful feature/change, create a bundle under `.forge/features/`:

```txt
.forge/features/<feature-or-change>/
  spec.md          # non-technical user/product intent
  srd.md           # technical system requirements and implementation constraints
  test-cases.md    # behavioral oracle
  status.md        # maintained task/progress tracker for this feature/change
```

Instantiate a bundle from templates with:

```bash
pnpm forge:feature <feature-slug> "<Feature Name>"
```

### `spec.md` — user-facing product spec

Owns the non-technical truth:

- what user-visible behavior should exist
- who uses it
- vocabulary
- scope and non-goals
- acceptance criteria
- the interface the user sees or uses

It should not contain package layout, private implementation details, database mechanics, or test code.

### `srd.md` — technical implementation spec / SRD

Owns the technical truth needed to build consistently:

- system requirements
- app/package boundary decisions
- state/lifecycle rules
- data ownership and persistence expectations
- tRPC/API procedure expectations
- validator/schema expectations
- compatibility constraints
- rollout/cutover notes
- migration constraints if production data is involved

A separate `interfaces.md`, `design.md`, or `migration.md` should exist only when that concern becomes too large for the SRD.

### `test-cases.md` — behavioral oracle

Owns observable proof:

- setup/action/expected-observation cases
- negative cases
- regression cases
- contract cases
- migration validation cases when relevant

These are not implementation tests yet. They are the source for generated/handwritten tests.

### `status.md` — maintained progress tracker

Owns the living checklist for the feature/change:

- current phase
- accepted decisions
- open questions
- tasks and owners when useful
- links to related PRs/issues
- validation status

This replaces scratch `notes.md`. Notes can exist locally or temporarily, but `status.md` is the maintained artifact that survives context loss.

## Prompt files

Current maintained prompts:

- [`test-generation-prompt.md`](./test-generation-prompt.md)
- [`implementation-prompt.md`](./implementation-prompt.md)

We are intentionally not maintaining separate bugfix/review prompts yet. Bugfix and review behavior should be handled by the normal loop, implementation prompt, engineering guidelines, and human review until repeated friction proves they are worth extracting.

## Development loop

1. Update `spec.md` if user-visible behavior/scope changed.
2. Update `srd.md` if technical behavior, contracts, data, rollout, or implementation constraints changed.
3. Update `test-cases.md` for observable behavior or regressions.
4. Update `status.md` with decisions, tasks, and current progress.
5. Generate tests using `test-generation-prompt.md`.
6. Confirm new tests fail for the intended reason when practical.
7. Implement using `implementation-prompt.md`.
8. Validate with narrow checks, then broader checks.
9. Review the diff against `spec.md`, `srd.md`, `test-cases.md`, and `status.md`.

## Efficiency rule

Do not update every Markdown file for every change.

| Changed truth                                                         | Update                |
| --------------------------------------------------------------------- | --------------------- |
| User-visible behavior, scope, vocabulary                              | `spec.md`             |
| Technical architecture, contracts, data behavior, rollout constraints | `srd.md`              |
| Observable behavior, bug/regression, acceptance proof                 | `test-cases.md`       |
| Progress, task state, open questions, PR links                        | `status.md`           |
| Agent mechanics or validation expectations                            | prompt/guideline docs |

Tiny non-behavioral changes may not need this workflow.

## Reforge branch policy

- `main` remains current production/current dev-team delivery.
- Reforge implementation stays off `main` until cutover.
- Reforge work targets `reforge/main` through reviewed `reforge/*` branches.
- The eventual merge to `main` is a release/cutover review, not first-pass implementation review.
