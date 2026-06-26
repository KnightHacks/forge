# Agent Skills

Forge maintains repo-level skills under `.claude/skills/`. Use them when the task matches; canonical process truth still lives in `docs/agentic-development/*`, `AGENTS.md`, and feature artifacts.

Implementation agents should follow the skill registry in [`implementation-prompt.md`](./implementation-prompt.md). Spec/SRD/test-case work uses the Forge-native writer skills below.

## Forge-native artifact skills

- `.claude/skills/forge-spec-writer` — reverse-prompt for `spec.md`; do not guess missing product intent.
- `.claude/skills/forge-srd-writer` — reverse-prompt for `srd.md`; do not guess technical constraints.
- `.claude/skills/forge-test-case-writer` — reverse-prompt for `test-cases.md`; do not generate implementation tests.

## Repo-level implementation and validation skills

- `.claude/skills/deslop` — prose/comment review to remove AI-sounding filler.
- `.claude/skills/react-analyzer` — React component surface analysis; pair with `pnpm analyze:react` scripts.
- `.claude/skills/playwright-skill` — agent-driven browser verification for high-value flows.
- `.claude/skills/spec-miner` — map legacy or undocumented code before changing behavior.

## Agent surface compatibility

The framework should work across Claude, Codex, Cursor, and other agents.

- Claude-compatible skills live in `.claude/skills/*`.
- Codex and other repo-aware agents should follow `AGENTS.md` plus the prompt docs in `docs/agentic-development/*`.
- Cursor rules live in `.cursor/rules/*` and point back to the same canonical docs.

Do not encode unique process truth in only one agent surface. Agent-specific files should route back to the shared Markdown framework.

## Vendored third-party skills

Installed from `Jeffallan/claude-skills` as supporting expertise, not canonical process truth:

- `.claude/skills/react-expert`
- `.claude/skills/nextjs-developer`
- `.claude/skills/typescript-pro`
- `.claude/skills/test-master`
- `.claude/skills/playwright-expert`
- `.claude/skills/spec-miner`
- `.claude/skills/architecture-designer`

These skills are useful for React/Next/TypeScript/testing/architecture support, but they must follow Forge's canonical docs and any local `FORGE_NOTES.md` inside the skill directory. Forge-native spec/SRD/test-case skills should be used first for Reforge artifact creation.
