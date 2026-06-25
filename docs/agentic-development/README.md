# Agentic Development Framework

This branch is still in framework-design mode. Do not start Blade Reforge feature specs or implementation until Dylan approves this workflow.

## What this is

Spec/test-driven agentic development treats Markdown as the control plane for AI work:

```txt
specs clarify intent → test cases define proof → tests constrain implementation → agents write code → failures improve specs/tests
```

The goal is not to maintain many documents. The goal is to make the important truths explicit before an agent writes code.

## Lean artifact model

For each meaningful change, prefer a small folder with only the artifacts it needs:

```txt
<change>/
  spec.md          # non-technical user/product intent
  srd.md           # technical system requirements and implementation constraints
  test-cases.md    # behavioral oracle
  notes.md         # optional scratch/open questions; not a source of truth
```

Global prompts live in `docs/agentic-development/` and are reused across changes.

### `spec.md` — user-facing product spec

Owns the non-technical truth:

- what user-visible behavior should exist
- who uses it
- vocabulary
- scope and non-goals
- acceptance criteria

It should not contain package layout, private implementation details, database mechanics, or test code.

### `srd.md` — technical implementation spec / SRD

Owns technical truth needed to build safely:

- system requirements
- architecture/flow decisions
- state/lifecycle rules
- data ownership and persistence expectations
- API/package/schema/interface contracts when relevant
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

## Prompt files

Current maintained prompts:

- [`test-generation-prompt.md`](./test-generation-prompt.md)
- [`implementation-prompt.md`](./implementation-prompt.md)

We are intentionally **not** maintaining separate bugfix/review prompts yet. Bugfix and review behavior should be handled by the implementation prompt, engineering guidelines, and human review until we see repeated friction worth extracting.

## Development loop

1. Update `spec.md` if user-visible behavior/scope changed.
2. Update `srd.md` if technical behavior, contracts, data, rollout, or implementation constraints changed.
3. Update `test-cases.md` for observable behavior or regressions.
4. Generate tests using `test-generation-prompt.md`.
5. Confirm new tests fail for the intended reason when practical.
6. Implement using `implementation-prompt.md`.
7. Validate with narrow checks, then broader checks.
8. Review the diff against `spec.md`, `srd.md`, and `test-cases.md`.

## Efficiency rule

Do not update every Markdown file for every change.

| Changed truth | Update |
|---|---|
| User-visible behavior, scope, vocabulary | `spec.md` |
| Technical architecture, contracts, data behavior, rollout constraints | `srd.md` |
| Observable behavior, bug/regression, acceptance proof | `test-cases.md` |
| Agent mechanics or validation expectations | prompt/guideline docs |

Tiny non-behavioral changes may not need this workflow.

## Reforge branch policy

- `main` remains current production/current dev-team delivery.
- Reforge implementation stays off `main` until cutover.
- Reforge work targets `reforge/main` through reviewed `reforge/*` branches.
- The eventual merge to `main` is a release/cutover review, not first-pass implementation review.
