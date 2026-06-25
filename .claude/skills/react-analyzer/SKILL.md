---
name: react-analyzer
description: Analyze React/TSX component structure, props, and component boundaries before frontend refactors, SRD reviews, UI implementation, or agent verification. Use when changing React components, auditing component APIs, checking props, or preparing frontend context for an LLM.
---

# React Analyzer Skill

Use this skill for static React component analysis in Forge.

## Purpose

Forge uses `react-analyzer` to extract structured information from React/TSX files. This helps agents and humans understand component surfaces before editing UI code.

Use it when:

- reviewing or refactoring React components
- checking component props and exported component names
- preparing context before frontend implementation
- verifying that a UI change did not unexpectedly alter component surfaces
- auditing Blade component boundaries for an SRD

## Repo command

From repo root:

```bash
pnpm analyze:react <files-or-directories>
```

Examples:

```bash
pnpm analyze:react apps/blade/src/app/_components
pnpm analyze:react apps/blade/src/app/_components/admin/analytics/dashboard.tsx
pnpm analyze:react apps/blade/src
```

## Rules

- Treat the output as static analysis context, not proof of runtime correctness.
- Pair this with `pnpm lint`, `pnpm typecheck`, tests, and human review.
- Use it before broad frontend rewrites so the diff preserves intended component APIs.
- If the analyzer fails on a file, report the file and error instead of guessing.

## Output expectations

Summarize:

- analyzed file count
- exported components found
- important props and optionality
- wrapper patterns like memo/forwardRef where detected
- suspicious or unexpected component surfaces
