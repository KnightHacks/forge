# Frontend Design Skill

Source inspiration: Anthropic Claude Code `frontend-design` skill, adapted for Forge instead of copied verbatim.

Use this for meaningful UI creation or reshaping in Forge, whether the agent is Codex, Claude, Cursor, or another provider.

For Blade work, read [`apps/blade/DESIGN_SYSTEM.md`](../../apps/blade/DESIGN_SYSTEM.md) before changing layouts, colors, cards, forms, dashboard surfaces, navigation, icons, animation, or upload/profile UI. Treat it as the active visual contract for Blade.

## Operating stance

Work like a product designer with engineering taste. The goal is not a generic "nice" screen; the goal is an interface that feels specific to Knight Hacks, Blade, and the workflow in front of the user.

## Before building

- Name the page's job, audience, and the existing Forge/Blade patterns it must respect.
- Identify the design system tokens and UI primitives already present before inventing new styles. For Blade, start from `apps/blade/DESIGN_SYSTEM.md`.
- When replacing an existing workflow, inspect the legacy interaction flow and
  recent user feedback before designing. Preserve the parts that made the old
  workflow fast or obvious, then restyle and simplify them within the current
  design system; do not assume a rewrite should also reinvent the interaction
  model.
- Choose a compact direction: color roles, type scale, layout structure, and one signature interaction or visual motif.
- Review that direction against the generic AI defaults: bland gradient hero, single-color dark page, or decorative cards everywhere. Revise anything that could fit any random SaaS dashboard.

## While building

- Keep layout meaningful. Put controls where the task naturally happens, not where a template would put them.
- Design the information hierarchy before arranging cards. Give the primary
  workflow the full working width unless another surface must remain visible to
  complete it.
- Do not default to an asymmetric two-thirds/one-third rail. Put secondary
  configuration, creation, inspection, and destructive actions in a dialog,
  drawer, sheet, expandable row, or dedicated route. A persistent rail needs a
  workflow-specific reason and a responsive collapse plan.
- Every user-generated or repeated collection needs an explicit density
  strategy: aggregation, pagination or virtualization across records, bounded
  scroll within a category, and drill-in for full detail. Do not allow one
  response, question, log, role list, or text-answer collection to determine
  the height of the page.
- Use dialogs for bounded secondary tasks that preserve the user's place. Do
  not put a long primary workflow, large data set, or side-by-side comparison
  inside a dialog.
- Analytics are aggregate-first. Map each data type to an honest presentation,
  keep compact raw-data previews, and disclose complete records on demand.
- Do not place heterogeneous analytics cards in an equal-row grid when their
  content heights differ. Prefer one consolidated panel with divided sections,
  or another layout where a tall item cannot create empty space beneath an
  unrelated short item.
- Repeated qualitative answers normally belong in a bounded table. Avoid a
  card per answer and avoid a detail dialog when the complete value can remain
  readable inside the table's scroll region.
- Choose pagination, bounded scrolling, search, or virtualization from the
  workflow rather than by reflex. Do not add pagination merely to hide an
  oversized layout; a searchable, height-bounded table may be the clearest way
  to inspect a moderate complete set.
- Prefer create-first flows when a sensible default exists. Create the object,
  then configure its type and details in context instead of requiring an
  abstract type choice beside the create action.
- Give structurally different types purpose-built editors and summaries. A
  shared shell is useful, but choice options, ranges, files, links, booleans,
  and text each need controls and response presentations that match their
  semantics.
- Make low-risk selectors apply immediately. Persist tabs, sections, filters,
  and other navigable workspace state in the URL when returning or sharing the
  view matters; avoid a redundant `View` or `Apply` step.
- Keep unavailable states compact. Prefer a disabled or muted affordance with
  accessible tooltip text over a large explanatory row for an anti-condition.
  Completed actions need a distinct success treatment, not only disabled text.
- On successful dialog submission, close the dialog, show a concise toast, and
  update the originating surface immediately. Do not leave users staring at a
  stale completed form inside the modal.
- Use icon-only actions only for familiar, repeated controls with an accessible
  name and tooltip. Do not combine an icon, label, status copy, and deadline
  when one compact control plus contextual urgency marker communicates the same
  action.
- Make cards visibly raised from the page background when they are cards. Do not nest cards inside cards.
- On Blade dashboards, follow the surface hierarchy in `apps/blade/DESIGN_SYSTEM.md`: top-level panels should read as the lighter raised `bg-card` layer, while compact tiles, link rows, and inset status blocks inside those panels should share a darker `bg-background/60`-style surface with subtle borders.
- Let typography carry hierarchy. Use hero-scale type only for true page-level headers.
- Use real product/domain assets where available. For Blade, prefer the Knight Hacks mark, Tech Knight assets, grid language, and purple system accents already present in legacy Blade.
- Write direct interface copy. Controls should say what they do.
- Respect accessibility: keyboard focus, readable contrast, responsive mobile layout, and reduced-motion friendliness.

## Before finishing

- Run the relevant React/type/lint checks.
- Use screenshots for desktop and mobile when visual changes are meaningful.
- Test representative worst-case data, not only empty and happy-path fixtures:
  long labels, long text, many categories, and at least 60 repeated records when
  the domain permits it.
- Inspect desktop and 320px mobile screenshots for document overflow, excessive
  page height, nested-scroll behavior, truncated-content recovery, dialog
  sizing, chart text alternatives, touch targets, and keyboard access.
- Verify each saved data type in both author and respondent views. Labels must
  not degrade into serialized objects; links remain actionable, uploaded files
  remain available to authorized viewers and submitters, and boolean/choice
  summaries expose their actual distribution.
- Critique the result against the brief and fix spacing, hierarchy, and token drift before reporting done.
