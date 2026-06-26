# Frontend Design Skill

Source inspiration: Anthropic Claude Code `frontend-design` skill, adapted for Forge instead of copied verbatim.

Use this for meaningful UI creation or reshaping in Forge, whether the agent is Codex, Claude, Cursor, or another provider.

For Blade work, read [`apps/blade/DESIGN_SYSTEM.md`](../../apps/blade/DESIGN_SYSTEM.md) before changing layouts, colors, cards, forms, dashboard surfaces, navigation, icons, animation, or upload/profile UI. Treat it as the active visual contract for Blade.

## Operating stance

Work like a product designer with engineering taste. The goal is not a generic "nice" screen; the goal is an interface that feels specific to Knight Hacks, Blade, and the workflow in front of the user.

## Before building

- Name the page's job, audience, and the existing Forge/Blade patterns it must respect.
- Identify the design system tokens and UI primitives already present before inventing new styles. For Blade, start from `apps/blade/DESIGN_SYSTEM.md`.
- Choose a compact direction: color roles, type scale, layout structure, and one signature interaction or visual motif.
- Review that direction against the generic AI defaults: bland gradient hero, single-color dark page, or decorative cards everywhere. Revise anything that could fit any random SaaS dashboard.

## While building

- Keep layout meaningful. Put controls where the task naturally happens, not where a template would put them.
- Make cards visibly raised from the page background when they are cards. Do not nest cards inside cards.
- On Blade dashboards, follow the surface hierarchy in `apps/blade/DESIGN_SYSTEM.md`: top-level panels should read as the lighter raised `bg-card` layer, while compact tiles, link rows, and inset status blocks inside those panels should share a darker `bg-background/60`-style surface with subtle borders.
- Let typography carry hierarchy. Use hero-scale type only for true page-level headers.
- Use real product/domain assets where available. For Blade, prefer the Knight Hacks mark, Tech Knight assets, grid language, and purple system accents already present in legacy Blade.
- Write direct interface copy. Controls should say what they do.
- Respect accessibility: keyboard focus, readable contrast, responsive mobile layout, and reduced-motion friendliness.

## Before finishing

- Run the relevant React/type/lint checks.
- Use screenshots for desktop and mobile when visual changes are meaningful.
- Critique the result against the brief and fix spacing, hierarchy, and token drift before reporting done.
