# Parallax Implementation Notes

Temporary handoff for agents working on KHIX or future Forge parallax sections.
This documents the Chromium fix from Carlos's 39fc6795 commit so it can be
reused without rediscovering the same failure mode.

## What Broke

The KHIX hero parallax broke when the art stack was treated like a page
background instead of a normal hero section. The problematic shape was:

- a long or sticky scroll zone that made the hero behave like a background
- a large transformed `.art` container using `scale(...)`
- per-layer parallax values that did not account for that container scale
- unthrottled pointer writes fighting Chromium's rendering pipeline

The visible symptoms were rapid inline style churn in DevTools, unstable
Chromium parallax, and the hero reading as the entire page background instead
of a section that can scroll away.

## Carlos's Fix

Keep the hero itself as a normal section:

- `section#home` owns the hero and stays in document flow
- `.stage` is `position: relative`, not sticky, for a normal hero
- the hero is `100vh` / `100svh`; extra page scroll should come from following
  sections, not from a fake hero scroll zone

Keep the artwork full-bleed inside the hero without scaling the whole .art
container:

- store the old visual scale as `--khix-art-motion-scale: 0.64`
- use a smaller art inset, currently `inset: -6.32svh -3.76vw`
- do not put `transform: scale(...)` on `.art`
- apply `--khix-art-motion-scale` inside each layer's parallax transform math

Scope motion variables to the stage and throttle writes:

- write `--khix-hero-pointer-x`, `--khix-hero-pointer-y`, and
  `--khix-hero-scroll-progress` on the hero stage
- coalesce pointer movement with `requestAnimationFrame`
- only write motion values when they changed by a meaningful epsilon
- cancel pending pointer frames during cleanup and when reduced motion is
  enabled

## Reusable Pattern

For future parallax components:

- make the section normal page flow first; avoid sticky or oversized scroll
  zones unless the design explicitly calls for pinned storytelling
- keep the art stack visually oversized with insets, not by scaling the whole
  container
- if the art needs a visual scale, put that number in a CSS variable and
  multiply the pointer and scroll offsets by it
- put all layer movement on `transform: translate3d(...)` and keep depth values
  as CSS vars on each layer
- use one local stage for motion vars; do not inject global `:root` motion state
  for a component-specific parallax
- throttle pointer writes with `requestAnimationFrame`; throttle scroll writes
  too, and skip writes when the value barely changed
- respect `prefers-reduced-motion` by resetting pointer and scroll progress to
  `0` and disabling nonessential animated layers

## Verification Checklist

Before handing off a parallax change:

- the hero/section scrolls away like a normal section when content follows it
- the stage is not sticky unless pinned scroll storytelling is the requirement
- Chrome/Chromium DevTools does not show unrelated title/glow/art nodes
  constantly changing inline style attributes
- pointer movement still changes layer transforms differently by depth
- scroll changes `--khix-hero-scroll-progress` without causing layout shifts
- `pnpm --filter=@forge/khix lint` and
  `pnpm --filter=@forge/khix typecheck` pass for KHIX changes
