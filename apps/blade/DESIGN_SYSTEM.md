# Blade Design System

> The visual language behind **Blade**: the centralized platform for all things Knight Hacks.

![Stack](https://img.shields.io/badge/shadcn%2Fui-000?style=flat-square&logo=shadcnui&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-0EA5E9?style=flat-square&logo=tailwindcss&logoColor=white)
![Font](https://img.shields.io/badge/Geist_Sans_%2F_Mono-111?style=flat-square)
![Theme](https://img.shields.io/badge/Dark--first-030712?style=flat-square)

Blade is built on **shadcn/ui** primitives, styled with **Tailwind v4** design tokens, and typeset in **Geist**. It ships **dark-first** (`<html class="dark">`) with a violet primary and the Knight Hacks gold as a reserved brand accent.

- **Component library:** [`@forge/ui`](../../packages/ui/src) (Radix + CVA)
- **Tokens:** [`apps/blade/src/app/globals.css`](./src/app/globals.css)
- **Icons:** [`lucide-react`](https://lucide.dev) and [`react-icons`](https://react-icons.github.io/react-icons/)
- **Charts:** [`recharts`](https://recharts.org)

## Table Of Contents

1. [Principles](#principles)
2. [Color](#color)
3. [Typography](#typography)
4. [Spacing And Radius](#spacing-and-radius)
5. [Elevation](#elevation)
6. [Iconography](#iconography)
7. [Components](#components)
8. [Patterns And Conventions](#patterns-and-conventions)
9. [Refinements](#refinements)
10. [Contributing](#contributing)

## Principles

1. **Dark-first.** Every surface is designed against the near-black canvas first. Light theme is a supported mirror, not the default.
2. **Tokens over hex.** Components reference semantic CSS variables (`--primary`, `--muted`, `--border`) instead of raw colors. Theme by swapping variables, not classes.
3. **Gold is precious.** Violet is the working primary. Knight Hacks gold (`#DBC049`) is reserved for brand moments: awards, live states, prize highlights, and special identity moments. Used everywhere, it stops meaning anything.
4. **Borders do the work.** On the dark canvas, hierarchy comes from `1px` borders, stable surfaces, and subtle elevation, not heavy shadows or gradients.
5. **Accessible by default.** Use 14-16px+ body copy, status text plus color, visible focus rings, and 44px+ hit targets.

## Color

Tokens are declared as space-separated HSL channels and consumed via `hsl(var(--token))`. They are defined in [`globals.css`](./src/app/globals.css).

### Dark Theme

| Token                      | Swatch                                                             | HSL                 | Approx Hex |
| -------------------------- | ------------------------------------------------------------------ | ------------------- | ---------- |
| `--background`             | ![](https://img.shields.io/badge/-030712-030712?style=flat-square) | `224 71.4% 4.1%`    | `#030712`  |
| `--foreground`             | ![](https://img.shields.io/badge/-F8FAFC-F8FAFC?style=flat-square) | `210 20% 98%`       | `#F8FAFC`  |
| `--card`                   | ![](https://img.shields.io/badge/-0B1020-0B1020?style=flat-square) | `224 45% 8%`        | `#0B1020`  |
| `--primary`                | ![](https://img.shields.io/badge/-6D28D9-6D28D9?style=flat-square) | `263.4 70% 50.4%`   | `#6D28D9`  |
| `--primary-foreground`     | ![](https://img.shields.io/badge/-F8FAFC-F8FAFC?style=flat-square) | `210 20% 98%`       | `#F8FAFC`  |
| `--secondary` / `--accent` | ![](https://img.shields.io/badge/-1E293B-1E293B?style=flat-square) | `215 27.9% 16.9%`   | `#1E293B`  |
| `--muted`                  | ![](https://img.shields.io/badge/-111827-111827?style=flat-square) | `220 24% 14%`       | `#111827`  |
| `--muted-foreground`       | ![](https://img.shields.io/badge/-94A3B8-94A3B8?style=flat-square) | `217.9 10.6% 64.9%` | `#94A3B8`  |
| `--destructive`            | ![](https://img.shields.io/badge/-7F1D1D-7F1D1D?style=flat-square) | `0 62.8% 30.6%`     | `#7F1D1D`  |
| `--border` / `--input`     | ![](https://img.shields.io/badge/-26334A-26334A?style=flat-square) | `223 25% 20%`       | `#26334A`  |
| `--ring`                   | ![](https://img.shields.io/badge/-6D28D9-6D28D9?style=flat-square) | `263.4 70% 50.4%`   | `#6D28D9`  |

### Light Theme

| Token                                  | Swatch                                                             | HSL                 | Approx Hex |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------- | ---------- |
| `--background`                         | ![](https://img.shields.io/badge/-FFFFFF-FFFFFF?style=flat-square) | `0 0% 100%`         | `#FFFFFF`  |
| `--foreground`                         | ![](https://img.shields.io/badge/-030712-030712?style=flat-square) | `224 71.4% 4.1%`    | `#030712`  |
| `--card`                               | ![](https://img.shields.io/badge/-FFFFFF-FFFFFF?style=flat-square) | `0 0% 100%`         | `#FFFFFF`  |
| `--primary`                            | ![](https://img.shields.io/badge/-7C3AED-7C3AED?style=flat-square) | `262.1 83.3% 57.8%` | `#7C3AED`  |
| `--secondary` / `--muted` / `--accent` | ![](https://img.shields.io/badge/-F1F5F9-F1F5F9?style=flat-square) | `220 14.3% 95.9%`   | `#F1F5F9`  |
| `--muted-foreground`                   | ![](https://img.shields.io/badge/-6B7280-6B7280?style=flat-square) | `220 8.9% 46.1%`    | `#6B7280`  |
| `--destructive`                        | ![](https://img.shields.io/badge/-EF4444-EF4444?style=flat-square) | `0 84.2% 60.2%`     | `#EF4444`  |
| `--border` / `--input`                 | ![](https://img.shields.io/badge/-E5E7EB-E5E7EB?style=flat-square) | `220 13% 91%`       | `#E5E7EB`  |

### Brand Accent

| Name              | Swatch                                                             | Value     | Use                                                                           |
| ----------------- | ------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| Knight Hacks Gold | ![](https://img.shields.io/badge/-DBC049-DBC049?style=flat-square) | `#DBC049` | Awards, live/active states, prize highlights, the member pass. Use sparingly. |

### Chart Palette

Consumed by Recharts as `--chart-1` through `--chart-5`.

| Token       | Swatch                                                             | HSL           |
| ----------- | ------------------------------------------------------------------ | ------------- |
| `--chart-1` | ![](https://img.shields.io/badge/-2563EB-2563EB?style=flat-square) | `220 70% 50%` |
| `--chart-2` | ![](https://img.shields.io/badge/-2DB78A-2DB78A?style=flat-square) | `160 60% 45%` |
| `--chart-3` | ![](https://img.shields.io/badge/-E0922A-E0922A?style=flat-square) | `30 80% 55%`  |
| `--chart-4` | ![](https://img.shields.io/badge/-A855F7-A855F7?style=flat-square) | `280 65% 60%` |
| `--chart-5` | ![](https://img.shields.io/badge/-E11D74-E11D74?style=flat-square) | `340 75% 55%` |

```tsx
// Always reference tokens, never raw values.
<div className="border-border bg-card text-card-foreground" />
<Button className="bg-primary text-primary-foreground" />
```

## Typography

**Geist Sans** is used for UI and copy. **Geist Mono** is used for tokens, IDs, code, and numeric data. Fonts load through `geist/font` in [`layout.tsx`](./src/app/layout.tsx) and are exposed as `font-sans` and `font-mono`.

| Role           | Size | Weight | Tailwind                                 |
| -------------- | ---- | ------ | ---------------------------------------- |
| Display        | 60px | 600    | `text-6xl font-semibold tracking-normal` |
| H1             | 36px | 600    | `text-4xl font-semibold tracking-normal` |
| H2             | 30px | 600    | `text-3xl font-semibold`                 |
| H3             | 24px | 600    | `text-2xl font-semibold`                 |
| Body           | 16px | 400    | `text-base`                              |
| Small          | 14px | 500    | `text-sm font-medium`                    |
| Caption / data | 13px | 500    | `text-[13px] font-mono`                  |

- Keep letter spacing neutral in application UI. Avoid negative tracking in compact panels, cards, sidebars, dashboards, and tool surfaces.
- Use `text-balance` / `text-pretty` for marketing headings and lead paragraphs when supported.
- Minimum body size is 14px. Do not set user-facing UI text below it.

## Spacing And Radius

Spacing follows Tailwind's 4px scale (`gap-2` = 8px, `p-4` = 16px, `p-6` = 24px). Lay out sibling groups with `flex` or `grid` plus `gap`, not margins on each sibling.

Radius derives from `--radius: 0.5rem`.

| Token          | Value | Usage                                                      |
| -------------- | ----- | ---------------------------------------------------------- |
| `rounded-md`   | 6px   | Buttons, inputs, badges, compact dashboard surfaces        |
| `rounded-lg`   | 8px   | Tabs lists, small surfaces                                 |
| `rounded-xl`   | 12px  | Larger cards only when the surrounding system calls for it |
| `rounded-full` | 999px | Avatars, pills, switches                                   |

Blade application cards should usually stay at `rounded-md` to `rounded-lg`. Avoid soft oversized radii on operational dashboards.

## Elevation

Hierarchy is border-led. Shadows stay subtle and stable.

| Level                   | Treatment                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Page canvas             | `bg-background`                                                                          |
| Top-level card / panel  | `border border-white/10 bg-card/95 shadow-xl` or `shadow-2xl` for major dashboard panels |
| Nested tile / inset row | `border border-white/10 bg-background/60`                                                |
| Popover / dropdown      | Elevated surface plus `shadow-lg`                                                        |

### Dashboard Surface Hierarchy

Use this pattern for Blade dashboard pages:

- **Highest-level cards/panels** use the lighter raised gray surface: `bg-card/95`, subtle white border, and page-level shadow.
- **Content inside those panels** uses the darker gray/purple inset surface: `bg-background/60` with the same subtle border.
- Link rows, status rows, summary tiles, and inset cards inside a dashboard panel should share that darker inset treatment.
- When a workflow genuinely requires multiple persistent panels, top-align
  their content. Do not infer that a left/right or two-thirds/one-third split is
  the default dashboard structure.
- Do not use a full nested `Card` component inside another card. Use a simple `div` with the nested surface treatment.

Current member dashboard examples:

```tsx
const panel = "border-white/10 bg-card/95 shadow-2xl shadow-black/25";
const inset = "rounded-md border border-white/10 bg-background/60";
```

### Mobile Member Experience

Member-facing Blade pages should be intentionally mobile-first, not only stacked desktop layouts.

- Prioritize the Guild/social profile on mobile member dashboards. It is the member's identity surface, so it should appear before lower-priority account details on phone viewports.
- Keep the profile settings action attached to the Guild/profile surface. A small cog inside that profile area is preferred over a detached page-level edit button.
- Keep mobile member dashboards lightweight. The first mobile screen should focus on profile picture, name, tagline, company, social/profile links, and resume actions; move heavier member/account details to desktop or settings surfaces instead of stacking everything on mobile.
- Do not use disclosure sections as the default desktop dashboard layout. Desktop member dashboards should show stable, scan-friendly panels and inset surfaces without making ordinary profile details feel hidden.
- When the mobile member dashboard is intentionally a single Guild/profile card, let that top-level card fill the available screen height. Keep company, links, resume, and status values as nested inset surfaces instead of loose floating text.
- Mobile signup and settings forms should use tighter card padding than desktop while keeping 44px touch targets for inputs, selects, switches, buttons, and upload controls.
- Use sticky bottom primary actions for long mobile edit forms where members may change fields across sections. Signup/create forms should keep the final create action at the bottom of the form so users understand there are no more required sections below it.
- Keep skeletons structurally close to loaded content on both desktop and mobile. Skeleton cards should appear in the same order, width, and approximate height as the loaded cards.
- Prefer route-level transitions for member dashboard/settings navigation. Avoid card-by-card entrance motion when content replaces skeletons.

## Iconography

- **Library:** [`lucide-react`](https://lucide.dev) first, `react-icons` when needed.
- **Default size:** `16`-`18` inline, `20`-`24` for feature/section icons.
- **Stroke:** inherit `currentColor`; accent icons use `text-primary` or the gold accent.
- Do not mix icon families within a single view.

```tsx
import { Award, Calendar, QrCode } from "lucide-react";

<Award className="size-4 text-primary" />;
```

## Components

All primitives live in [`@forge/ui`](../../packages/ui/src) and are imported per file.

```tsx
import { Button } from "@forge/ui/button";
```

### Button

Source: [`button.tsx`](../../packages/ui/src/button.tsx)

Variants: `primary` (default), `destructive`, `outline`, `secondary`, `ghost`, `link`.

Sizes: `sm` (`h-8`), `md` (`h-9`, default), `lg` (`h-10`), `icon` (`size-9`).

```tsx
<Button variant="primary">Save changes</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="ghost" size="icon">
  <Plus className="size-4" />
</Button>
```

### Badge

Source: [`badge.tsx`](../../packages/ui/src/badge.tsx)

Variants: `default`, `secondary`, `destructive`, `outline`. Use badges for status and pair color with a text label.

```tsx
<Badge>Active</Badge>
<Badge variant="outline">Draft</Badge>
```

### Card

Source: [`card.tsx`](../../packages/ui/src/card.tsx)

Use `Card` plus `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter`.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Knight Hacks VIII</CardTitle>
    <CardDescription>36-hour flagship hackathon</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

Cards represent top-level grouped surfaces. For repeated rows or nested content inside a card, use the nested surface treatment instead of another `Card`.

### Form Controls

| Component    | File                                                       | Notes                                        |
| ------------ | ---------------------------------------------------------- | -------------------------------------------- |
| `Input`      | [`input.tsx`](../../packages/ui/src/input.tsx)             | `h-9`, transparent background, ring on focus |
| `Textarea`   | [`textarea.tsx`](../../packages/ui/src/textarea.tsx)       | Resizable                                    |
| `Select`     | [`select.tsx`](../../packages/ui/src/select.tsx)           | Radix select                                 |
| `Checkbox`   | [`checkbox.tsx`](../../packages/ui/src/checkbox.tsx)       | Pair with visible label                      |
| `RadioGroup` | [`radio-group.tsx`](../../packages/ui/src/radio-group.tsx) | Use for mutually exclusive options           |
| `Switch`     | [`switch.tsx`](../../packages/ui/src/switch.tsx)           | `data-[state=checked]:bg-primary`            |
| `Slider`     | [`slider.tsx`](../../packages/ui/src/slider.tsx)           | Use for numeric ranges                       |
| `Label`      | [`label.tsx`](../../packages/ui/src/label.tsx)             | Pair with every field                        |
| `Form`       | [`form.tsx`](../../packages/ui/src/form.tsx)               | React Hook Form plus zod                     |

### Navigation And Overlays

Use `Tabs`, `NavigationMenu`, `DropdownMenu`, `Dialog`, `Drawer`, `Sheet`, `Popover`, `Command`, `Pagination`, `Accordion`, `Tooltip`, and `Toast` from `@forge/ui` where available.

### Data Display

Use `Table`, `Avatar`, `Skeleton`, `Separator`, `Chart`, `Calendar`, `DatePicker`, and `TimePicker` from `@forge/ui` where available.

## Patterns And Conventions

### Status Pills

Map semantic colors to reusable pills.

| Status         | Foreground         | Background          |
| -------------- | ------------------ | ------------------- |
| Paid / success | `chart-2` green    | `chart-2 / 15%`     |
| Due / error    | `destructive`      | `destructive / 15%` |
| Pending        | `muted-foreground` | `secondary`         |

### Member Pass

The gold-accented gradient card is the one place gold leads. It signals identity and belonging.

### Empty And CTA States

Lead with plain language and one obvious primary action rather than raw counts or multiple competing choices.

### Layout

Prefer `flex` / `grid` plus `gap` for sibling groups so spacing survives reordering and deletion.

#### Workspace Composition

- Primary admin workspaces should normally use the available content width.
- Avoid a fixed one-third side rail for settings, creation, filters, or
  occasional inspection. Use `Dialog` on desktop and `Drawer` or a
  viewport-safe dialog on mobile when the task is secondary and bounded.
- Reserve a persistent secondary column for information users must reference
  continuously while working in the primary surface.
- Dense repeated configuration should use compact grids or rows. Full-width,
  single-column cards are not the default for short repeated records.
- Workspace selectors should normally live with the tabs or archive/current
  controls they affect, apply immediately, and use URL state when the selected
  workspace must survive refresh, back/forward navigation, or sharing.

#### Forms And Builders

- Mine the legacy flow before replacing a mature form or builder. Retain useful
  interaction patterns while translating the visuals and accessibility to the
  current Blade system.
- `Add question` creates a sensible default question. Put the type selector in
  the question editor instead of beside the creation action.
- Question types share a compact shell but receive type-specific editors:
  choice types use individual option rows with Enter-to-add and multiline-paste
  support; scales expose their minimum and maximum; file types expose limits;
  and link, boolean, numeric, and text types show relevant constraints.
- Reorderable builders provide pointer drag-and-drop, keyboard-accessible
  movement, and explicit fallback controls. Stable question IDs, not prompts,
  carry identity through reordering and edits.
- Use dialogs or drawers for bounded secondary creation and settings. Keep the
  ordered question list in the primary workspace and avoid a persistent
  one-third configuration rail.
- Render submitted answers by type. Choice objects display labels, booleans
  display Yes/No, links remain clickable, and authorized uploads expose a
  download action in both admin inspection and the submitter's receipt.

#### Dense Data And Analytics

- Put summary metrics and distributions before raw records.
- Heterogeneous question analytics should share a consistent full-width panel
  with divided sections. Do not use a two-column equal-row card grid when one
  question's content can stretch an unrelated card or leave an empty grid cell.
- Small single-choice sets may use a donut or pie chart. Use sorted horizontal
  bars when labels are long or categories are numerous. Always show category,
  count, and percentage in text.
- Multiple-choice checkbox results use sorted bars or a count table based on
  respondent count. Do not use a pie chart because selections are not mutually
  exclusive and percentages may exceed 100%.
- Scale and numeric questions show average, response count, and ordered
  distribution.
- Boolean questions show a Yes/No count and percentage distribution. Link
  responses stay clickable, and file responses expose authorized download
  actions rather than filenames alone.
- Text, file, and other non-aggregate answers use a compact table or list in a
  bounded `overflow-y-auto` region. Preserve the complete value through
  the table, expansion, or a detail dialog; never render dozens of full answers
  into page flow or create a card for every answer.
- Tables wider than their surface use a labeled `overflow-x-auto` container.
  Scroll regions need a visible boundary, keyboard reachability, and a mobile
  layout that does not trap scrolling.
- At 320px, Blade pages must not create document-level horizontal overflow.
  Controls keep 44px targets, long labels wrap, dialogs fit the viewport, and
  charts retain textual or tabular alternatives.

#### Compact Actions And State

- Prefer a familiar Lucide icon with an accessible label and tooltip for
  repeated compact actions such as event feedback. Add visible text only when
  the action is not clear from its context.
- Represent unavailable actions with a muted disabled control and tooltip,
  without reserving a large block for explanatory anti-condition copy.
- Represent completion with a success surface plus a muted glyph so completed
  and unavailable states cannot be confused.
- Keep urgency adjacent to the action. A compact destructive `!` marker with a
  tooltip is preferred over repeating a long due-date sentence in every card.
- Successful modal submissions close the overlay, toast the outcome, and
  invalidate the source data so the completed state appears immediately.

For profile/dashboard layouts:

- Top-align primary panel content unless the panel is intentionally centered around one object.
- Keep skeletons structurally close to loaded content.
- Do not add entrance animation to content that replaces a skeleton; direct replacement is less jarring.
- Keep upload/remove affordances attached to the object they modify.

## Refinements

Improvements layered on top of the stock shadcn tokens:

1. **Elevated card surface:** `--card` sits a step above the near-black `--background` for clearer hierarchy in dense dashboards.
2. **Nested dashboard surface:** inner tiles, links, and status blocks use `bg-background/60` with subtle borders so they feel inside the panel without becoming separate cards.
3. **Formalized gold accent:** `#DBC049` is promoted from logo-only to a named, documented accent.
4. **Status color system:** `chart-2` green plus `destructive` red map into reusable Paid / Due / Pending pills.
5. **Unified focus ring:** `1px` ring plus border in `--ring` across interactive controls.

## Contributing

- Add primitives to `packages/ui/src` through the shadcn CLI (`components.json`), then re-export.
- Never hardcode colors. Add or use a token in `globals.css`.
- Keep both `:root` and `.dark` blocks in sync when adding tokens.
- Run `pnpm lint` and `pnpm format` before opening a PR.
