# KHIX Homepage Memory Optimization Status

Current phase: Complete

## Decision log

- 2026-09-11: User requested a broad homepage optimization rather than a literal
  checklist implementation of issue #562. Visual quality and interactions must
  be preserved or improved while performance improves dramatically.
- 2026-09-11: Scope is limited to `apps/2026` homepage behavior and assets; no
  shared packages, dependencies, data, auth, or portal behavior will change.
- 2026-09-11: Use transparent VP9 video plus existing static fallbacks for large
  decorative animation. Make all autoplay work viewport-, visibility-, and
  reduced-motion-aware.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md` from issue #562 and user scope.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Record user approval of the broad performance/quality direction.
- [x] Finish desktop and mobile baseline profiling.
- [x] Generate and verify optimized transparent video assets.
- [x] Implement responsive image and media lifecycle changes.
- [x] Implement viewport-aware animation, timer, data, and audio lifecycles.
- [x] Run scoped validation and the 2026 app formatting gate.
- [x] Complete desktop/mobile/browser lifecycle verification.

## Validation / commands

- `pnpm install --frozen-lockfile`: passed.
- `pnpm forge:feature homepage-memory "KHIX Homepage Memory Optimization"`:
  first attempt failed because dependencies were absent; passed after install.
- Live desktop Lighthouse baseline: performance 62, LCP 11.7 s, 87 requests,
  19,334 KiB transferred, with about 7,116 KiB estimated image-delivery savings.
- Observed Chrome memory on the same full-page test fell from approximately
  1.3 GB to 450 MB after the rendering and media lifecycle changes.
- Media inspection: the nine largest static/animated suspects represent roughly
  1.34 GiB of worst-case RGBA frame data; `extended-front.webp` alone is
  3840x12000 (175.8 MiB decoded), and the animated WebPs contain 5-20 frames.
- Final desktop Lighthouse: performance 87, LCP 2.3 s, 57 requests, and 2.30
  MiB transferred. Compared with production, transfer fell 87.8%, LCP fell
  80.2%, and the performance score rose 25 points.
- Final mobile Lighthouse: performance 63, LCP 7.5 s, 53 requests, and 1.30
  MiB transferred. Compared with production, transfer fell 88.1%, LCP fell
  64.6%, total blocking time fell 64.6%, and the score rose 21 points.
- `pnpm --filter=@forge/2026 test`: passed (14 tests).
- `pnpm --filter=@forge/2026 typecheck`: passed with a 4 GiB Node heap after
  the default 2 GiB process exhausted its heap.
- `pnpm analyze:react:changed`: passed (0 failures).
- Production `@forge/2026` build: passed with local non-secret environment
  placeholders.
- In-app browser checks: desktop and mobile composition preserved, no
  horizontal overflow, no runtime console errors, responsive video sources
  selected correctly, and only near-viewport video/ambient work became active.
- Final architecture follow-up: replaced the desktop hero's nine decoded image
  layers with one AVIF composition and one merged transparent ambient video;
  replaced 154 animated waterfall DOM nodes with one viewport-bound canvas;
  and limited the waterfall to one active, centered video stream at a time.
- Final in-app browser hero sample: 567 DOM nodes, one active 1280x720 ambient
  video, no active canvas, and approximately 12.1 MiB of decoded in-DOM imagery.
- `pnpm --filter @forge/2026 format`: passed.

## Links

- PRs:
- Issues: https://github.com/KnightHacks/forge/issues/562
- Discord/thread context:
