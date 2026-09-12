# KHIX Homepage Memory Optimization Spec

Status: Approved

## User-facing purpose

The public Knight Hacks IX homepage should retain its illustrated, animated
experience while loading quickly and remaining responsive throughout a visit.
Scrolling through the full page or leaving it open must not cause browser memory
to climb toward gigabyte-scale usage.

## Users / actors

- Prospective hackers, sponsors, speakers, and community members visiting the
  public homepage on desktop or mobile.
- Visitors who prefer reduced motion or use a lower-powered device.

## User-visible interface

- The full `/` homepage: hero, About, Tracks, Speakers, Sponsors, Team, FAQ, and
  footer.
- The existing parallax, gallery, speaker carousel, waterfall, ambient creature,
  cave-note, and Lenny interactions remain recognizable.
- Reduced-motion visitors receive complete static artwork without decorative
  autoplay motion.

## Scope

### In scope

- Replace memory-intensive decorative animation delivery with bounded,
  viewport-aware media while preserving transparent artwork and motion.
- Serve static raster artwork at dimensions appropriate to its rendered size.
- Defer below-the-fold media and data until it is near the viewport.
- Pause timers, media, and CSS animation when their section or browser tab is not
  active.
- Reuse browser audio resources across cave-note interactions.
- Improve initial hero discovery and paint without changing the visual hierarchy.

### Out of scope

- Portal, dashboard, application, credits, and other non-homepage routes.
- Changes to event copy, sponsor data, team membership, or authentication.
- A visual redesign or removal of the KHIX illustrated theme.
- CDN deployment or changes to external asset storage.

## Vocabulary

- `ambient media`: decorative looping motion that is not required to understand
  or operate the page.
- `viewport-aware`: active only while the relevant section is visible or close to
  visible.
- `static fallback`: the existing non-animated art shown when motion is disabled
  or video playback is unavailable.

## Acceptance criteria

- The homepage keeps its layered hero, moving water, atmospheric motion, gallery,
  speaker carousel, interactive tracks, cave notes, and blinking Lenny.
- Animated assets no longer retain every full-resolution WebP frame in browser
  image memory.
- Images with small rendered dimensions do not download/decode their original
  multi-megapixel sources.
- Below-the-fold autoplay work is idle before the visitor approaches it and
  pauses after it leaves the viewport or the document becomes hidden.
- Repeated cave-note interactions share one audio context.
- Desktop and mobile layouts remain visually coherent at current breakpoints.
- The page remains fully usable with `prefers-reduced-motion: reduce`.

## Open questions

- None. The user explicitly requested a broad homepage pass that preserves or
  improves visual quality while dramatically improving performance.
