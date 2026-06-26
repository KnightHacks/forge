# Reforge Branch Notice

This branch is the Blade Reforge development branch. Do not assume files here match production `main`. Current production Blade maintenance should happen on `main`, not this branch. Reforge work follows `docs/agentic-development/README.md` and `docs/agentic-development/forge-engineering-principles.md`. When changing shared packages, document compatibility with current `main`. For meaningful React changes, run `pnpm analyze:react:changed` before committing.

---

## Reforge feature artifacts

For Reforge feature/change planning, use `.forge/features/<feature-slug>/` bundles:

```txt
.forge/features/<feature-slug>/
  spec.md
  srd.md
  test-cases.md
  status.md
```

Instantiate a bundle with:

```bash
pnpm forge:feature <feature-slug> "<Feature Name>"
```

Before filling or implementing a bundle, read `docs/agentic-development/README.md`. Keep the feature's `status.md` updated with phase, decisions, open questions, task progress, validation, and PR/issue links. Spec/SRD/test-case work should reverse-prompt and challenge the human rather than guessing missing details.

## Frontend design work

For meaningful UI work, follow `docs/agentic-development/frontend-design-skill.md` before implementation. For Blade UI work, read `apps/blade/DESIGN_SYSTEM.md` as the active design contract before changing layouts, colors, cards, forms, dashboards, navigation, icons, animation, or profile/upload UI. Treat the active design system as a product constraint: use the existing tokens, components, and visual language first, then make one deliberate domain-specific move that fits Knight Hacks. Check real screenshots before calling UI work done.

# Forge Agent Instructions

Instructions for AI coding agents working in Forge, including Codex, Claude Code, and similar tools.

Forge is a public Knight Hacks monorepo. Treat agent output as production-quality contribution work, not throwaway code.

## Before editing

Read the relevant project context first:

- `README.md`
- `CONTRIBUTING.md`
- `docs/GETTING-STARTED.md`
- `docs/GITHUB-ETIQUETTE.md`
- `docs/REPO-CONVENTIONS.md` for Blade and `packages/*` placement/boundary rules
- `docs/DATABASE-USAGE.md` before changing DB schemas, DB queries, or table semantics
- Any task-relevant files in `docs/`

Search for existing patterns before adding new helpers, components, dependencies, routes, schema fields, or workflows. Follow `docs/REPO-CONVENTIONS.md` when deciding where constants, utilities, tRPC routers, DB code, and UI components belong. Follow `docs/DATABASE-USAGE.md` when deciding what a table or ambiguous column represents.

## Reverse-prompt and branch first

Before non-trivial edits, restate the task back to the human:

- goal
- intended app/package scope
- likely files involved
- planned checks
- assumptions, tradeoffs, or unclear requirements

Prefer plan mode or an explicit written plan for multi-file, cross-package, database, dependency, or UI behavior changes. Ask for clarification when scope is ambiguous.

As soon as changes are proposed or approved, create a task branch before editing. Do not work directly on `main`.

## Keep scope tight

Make the smallest change that correctly accomplishes the task.

Forge is a monorepo. A PR should usually be scoped to one `apps/*` app plus only the `packages/*` changes that app truly needs.

- `apps/club` changes should not alter Blade behavior.
- `apps/blade` changes should not alter Club behavior.
- Do not touch other apps unless the task explicitly names them.
- Put shared behavior in `packages/*` only when multiple consumers need it.
- If changing `packages/*`, consider and test the affected consumers.

Use the diff constantly to police scope:

```bash
git diff --stat
git diff --name-only
git diff
```

Remove unrelated edits before committing. Do not bundle cleanup, formatting churn, renames, refactors, dependency upgrades, or opportunistic fixes with the requested change.

## Preserve existing behavior

Follow existing project patterns. Avoid speculative architecture or future-proofing unless the issue explicitly calls for it.

Get explicit human approval before changing:

- database schemas or generated Drizzle migrations
- dependencies
- environment variables
- authentication, authorization, payments, email, uploads, or deployment behavior
- repo-wide tooling, lint, formatter, or CI settings

Never commit secrets, `.env` files, tokens, credentials, private keys, production data, or sensitive generated artifacts.

## Required checks before committing

Before any commit, run from the repo root:

```bash
pnpm format
pnpm lint
pnpm typecheck
```

If relevant, also run targeted checks such as:

```bash
pnpm build
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/club typecheck
pnpm db:generate
pnpm db:migrate
```

Do not claim a check passed unless it actually ran and passed. If blocked, report the exact command and error.

## Commit and PR hygiene

Follow `docs/GITHUB-ETIQUETTE.md` for branch names, commits, PR titles, labels, and issue references.

If auto-committing AI-assisted work, include an LLM co-author trailer:

```text
Co-authored-by: Codex <codex@openai.com>
Co-authored-by: Claude <claude@anthropic.com>
```

Use the accurate tool/model name when different.

Agent-assisted PRs should summarize:

- what changed
- what scoped the work
- checks run and results
- screenshots/video for UI changes
- assumptions, limitations, or follow-up work

## Communication expectations

Be explicit about uncertainty. Ask technical questions early instead of guessing. Encourage discussion when multiple reasonable approaches exist, especially for shared packages, schema design, permissions, or UX behavior.

Final updates should include files changed, key decisions, checks run, and anything intentionally left out of scope.

## Hard rules

Do not:

- fabricate test results, screenshots, logs, or command output
- mark PR checklist items as complete unless true
- bypass type or lint errors with `any`, broad casts, `eslint-disable`, or ignored promises unless justified
- edit unrelated apps/packages to make a change appear to work
- delete or rewrite migrations casually
- commit secrets or local-only config
- leave debug logging, dead code, or commented-out experiments behind
