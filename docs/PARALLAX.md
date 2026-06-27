# Parallax Implementation Notes

Temporary handoff for agents working on KHIX or future Forge parallax sections.
This documents the Chromium fix from Carlos's `39fc6795` commit so it can be
reused without rediscovering the same failure mode.

## What Broke

The KHIX hero parallax broke when the art stack was treated like a page
background instead of a normal hero section. The problematic shape was:

- a long or sticky scroll zone that made the hero behave like a background;
- a large transformed `.art` container using `scale(...)`;
- per-layer parallax values that did not account for that container scale;
- unthrottled pointer writes fighting Chromium's rendering pipeline.

The visible symptoms were rapid inline style churn in DevTools, unstable
Chromium parallax, and the hero reading as the entire page background instead
of a section that can scroll away.

## Carlos's Fix

Keep the hero itself as a normal section:

- `section#home` owns the hero and stays in document flow.
- `.stage` is `position: relative`, not sticky, for a normal hero.
- The hero is `100vh` / `100svh`; extra page scroll should come from following
  sections, not from a fake hero scroll zone.

Keep the artwork full-bleed inside the hero without scaling the whole `.art`
container:

- Store the old visual scale as `--khix-art-motion-scale: 0.64`.
- Use a smaller art inset, currently `inset: -6.32svh -3.76vw`.
- Do not put `transform: scale(...)` on `.art`.
- Apply `--khix-art-motion-scale` inside each layer's parallax transform math.

Scope motion variables to the stage and throttle writes:

- Write `--khix-hero-pointer-x`, `--khix-hero-pointer-y`, and
  `--khix-hero-scroll-progress` on the hero stage.
- Coalesce pointer movement with `requestAnimationFrame`.
- Only write motion values when they changed by a meaningful epsilon.
- Cancel pending pointer frames during cleanup and when reduced motion is
  enabled.

## Reusable Pattern

For future parallax components:

1. Make the section normal page flow first. Avoid sticky or oversized scroll
   zones unless the design explicitly calls for pinned storytelling.
2. Keep the art stack visually oversized with insets, not by scaling the whole
   container.
3. If the art needs a visual scale, put that number in a CSS variable and
   multiply the pointer and scroll offsets by it.
4. Put all layer movement on `transform: translate3d(...)` and keep depth
   values as CSS vars on each layer.
5. Use one local stage for motion vars. Do not inject global `:root` motion
   state for a component-specific parallax.
6. Throttle pointer writes with `requestAnimationFrame`; throttle scroll writes
   too, and skip writes when the value barely changed.
7. Respect `prefers-reduced-motion` by resetting pointer and scroll progress to
   `0` and disabling nonessential animated layers.

## Verification Checklist

Before handing off a parallax change:

- The hero/section scrolls away like a normal section when content follows it.
- The stage is not sticky unless pinned scroll storytelling is the requirement.
- Chrome/Chromium DevTools does not show unrelated title/glow/art nodes
  constantly changing inline `style` attributes.
- Pointer movement still changes layer transforms differently by depth.
- Scroll changes `--khix-hero-scroll-progress` without causing layout shifts.
- `pnpm --filter=@forge/khix lint` and
  `pnpm --filter=@forge/khix typecheck` pass for KHIX changes.
