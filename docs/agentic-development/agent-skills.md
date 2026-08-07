# Agent Skills

Forge maintains repo-level skills under `.claude/skills/`. Use them when the task
matches. Canonical process truth still lives in `docs/agentic-development/*`,
`AGENTS.md`, and the feature artifacts.

Every skill here is Forge-authored and describes this codebase. If a skill tells
you something a generic tutorial for the same library would also tell you, that
is a bug in the skill.

## Artifact skills

Used during spec/SRD/test-case work. All three reverse-prompt the human rather
than guessing.

- `forge-spec-writer` — `spec.md`, non-technical product intent
- `forge-srd-writer` — `srd.md`, technical constraints and access policy
- `forge-test-case-writer` — `test-cases.md`, the behavioral oracle

## Implementation skills

- `forge-placement` — where code goes: constants, helpers, components, package
  boundaries. Read this whenever you are unsure which file or package owns
  something.
- `forge-api` — tRPC procedure anatomy, the capability and scope access tiers,
  audit coverage, transactions, and when workflow logic belongs in
  `utils/<domain>/`.
- `forge-react` — components, state classification, hooks, the server/client
  boundary, mutation UX, and how to split a large component without changing
  pixels.
- `frontend-design` — meaningful UI work. Pairs with `apps/blade/DESIGN_SYSTEM.md`.
- `deslop` — prose and comment review; removes AI-sounding filler.

## Verification skills

- `forge-review` — scope-derived review of a diff or branch. Runs the static
  gate first and refuses to spend agents on a red diff; complements CI with
  judgment-heavy review selected from the changed surface.
- `react-analyzer` — React component surface analysis; pairs with the
  `pnpm analyze:react` scripts.
- `playwright-skill` — agent-driven browser verification for high-value flows.

## Agent surface compatibility

The framework should work across Claude, Codex, Cursor, and other agents.

- Claude-compatible skills live in `.claude/skills/*`.
- Codex and other repo-aware agents follow `AGENTS.md` plus the prompt docs here.
- Cursor rules live in `.cursor/rules/*` and point back to the same docs.

Do not encode unique process truth in only one agent surface.

## On the removed vendored skills

Seven third-party skills (`react-expert`, `nextjs-developer`, `typescript-pro`,
`test-master`, `playwright-expert`, `spec-miner`, `architecture-designer`) were
vendored from an external repository and have been deleted — 10,462 lines.

They were removed because they taught code that throws on this stack, not merely
because they were generic. Every one of `nextjs-developer`'s thirteen
`params`/`searchParams` examples used the synchronous pre-Next-15 form, which
Next 16 removed; its `cookies().set(...)` example is synchronous for the same
reason; and it imported `experimental_useOptimistic`, which React 19 dropped. Its
462-line server-actions guide is inapplicable to an app with zero server actions
and 112 `useMutation` calls. Just under half of `react-expert` taught
class-component migration for a repo containing two class declarations, and its
`use()` example creates a promise in the render body — which react.dev flags as
causing a repeating Suspense fallback.

The override mechanism did not help. All seven `FORGE_NOTES.md` files were
byte-identical past their first line: 126 lines of boilerplate asserting that
Forge principles win, naming no actual conflict.

The lesson worth keeping is that a merely generic skill wastes tokens, while a
confidently outdated one produces broken code. Prefer fewer skills that describe
the code actually in front of you.
