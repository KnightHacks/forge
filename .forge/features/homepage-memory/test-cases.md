# KHIX Homepage Memory Optimization Test Cases

Status: Approved

## Scope

Homepage media loading, autoplay lifecycle, responsive image delivery, cave-note
audio reuse, and visual/interactive regressions. Portal and non-homepage routes
are excluded.

## Test placement plan

- App-level lifecycle tests in `apps/2026` where behavior can be isolated.
- Browser and Lighthouse verification against the production build.
- Commands: `pnpm --filter=@forge/2026 test`, `lint`, `typecheck`, `build`, plus
  `pnpm analyze:react:changed`.

## Test cases

### TC-001: Initial hero is discoverable before hydration

Setup:

- Load `/` on a fresh desktop or mobile navigation.

Action:

- Inspect the initial document and first visual paint.

Expected observations:

- A viewport-appropriate base hero image is present immediately.
- Only that critical base image receives high fetch priority.
- The remaining layers appear without a layout shift.

### TC-002: Ambient animation uses bounded video decoding

Setup:

- Load `/` with normal motion preferences.

Action:

- Visit the hero, waterfall, and footer regions.

Expected observations:

- Water and Lenny motion remain visible through transparent looping video.
- The previous animated WebP resources are not requested.
- Existing static layers remain visible if video is unavailable.

### TC-003: Ambient work follows viewport and tab activity

Setup:

- Load `/` with normal motion preferences.

Action:

- Scroll each animated section in and out of range, then hide and restore the
  document.

Expected observations:

- Video, decorative CSS animation, gallery rotation, and speaker rotation run
  only when relevant and pause while offscreen or hidden.
- User controls still work immediately when a section is visible.

### TC-004: Static raster images are responsive

Setup:

- Load `/` at desktop and mobile widths.

Action:

- Inspect requested image URLs and intrinsic dimensions after scrolling through
  the page.

Expected observations:

- Hero layers, track characters/leaves, speaker art, and other small rendered
  rasters use responsive image variants instead of full original dimensions.
- Artwork remains crisp at its rendered size.

### TC-005: Cave-note audio resources are reused

Setup:

- Load the FAQ and activate multiple gemstone/hotspot notes.

Action:

- Trigger notes repeatedly, including overlapping notes.

Expected observations:

- Notes remain audible and responsive.
- A single reusable audio context is used, and completed node graphs disconnect.

### TC-006: Interactive homepage behavior is preserved

Setup:

- Load `/` and scroll through the full page.

Action:

- Use hero/apply navigation, gallery controls, tracks reveal, speaker controls,
  sponsor/team links, FAQ categories/questions, and footer links.

Expected observations:

- Controls remain keyboard accessible and visually coherent.
- No horizontal overflow or material layout shift is introduced.

## Negative / regression cases

### TC-NEG-001: Reduced-motion preference

Setup:

- Enable `prefers-reduced-motion: reduce` before loading `/`.

Action:

- Scroll through the full page and use all controls.

Expected observations:

- Decorative video and CSS autoplay motion remain paused/hidden.
- Static hero, waterfall, speaker, and Lenny artwork remains complete.
- User-triggered controls continue to work without animated transitions where
  applicable.

### TC-NEG-002: Video playback is unavailable

Setup:

- Simulate an unsupported or failed WebM source.

Action:

- Visit each video-enhanced section.

Expected observations:

- The underlying static art prevents blank or broken scene regions.
- No unhandled promise rejection is logged.

## Open questions

- None.
