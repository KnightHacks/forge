# KHIX Homepage Memory Optimization SRD

Status: Approved

## Technical purpose

Bound the KHIX homepage's decoded media, compositor, DOM-animation, timer, and
audio costs without reducing the site's art direction. Issue #562 supplies the
initial suspects; profiling the full homepage determines the implementation.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles`
- `docs/agentic-development/forge-engineering-principles.md#readability-and-colocation`
- `docs/agentic-development/forge-engineering-principles.md#testing-principles`
- `docs/agentic-development/frontend-design-skill.md`

## Access policy

The homepage remains public and unauthenticated. This work adds no logged-in or
permission-based behavior.

## Architecture / data flow

- Changes stay in `apps/2026` and its public assets.
- Decorative animated WebPs are transcoded to transparent VP9 WebM. Existing
  static scene layers remain underneath as fallbacks.
- A small app-local ambient-video component owns intersection, document
  visibility, and reduced-motion playback lifecycle.
- Homepage components independently pause section-specific timers or CSS
  animation when inactive.
- No shared package or new dependency is required.

## tRPC/API behavior

No API contract changes. The existing public team-roster request keeps its
contract but begins only when the Team section approaches the viewport.

## Validation

No new data validation. Media elements retain accessible fallbacks, and all
decorative video remains hidden from assistive technology.

## Data / migration / compatibility

- No database or migration changes.
- Transparent WebM is an enhancement over existing static scene art. Browsers
  that cannot play it still render the static fallback.
- Rollback consists of restoring the prior WebP references and component
  lifecycles.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: Only when yearly artwork itself changes, as it already does.
- The media lifecycle component is generic within the 2026 app; event and roster
  content remain untouched.

## React / frontend constraints

- Keep `page.tsx` server-side and isolate browser lifecycle behavior in focused
  client components/hooks.
- Preserve server-rendered initial hero art so LCP discovery does not depend on
  hydration.
- Set explicit responsive `sizes` and use Next image optimization for raster
  images that do not need original-file delivery.
- Do not keep permanent `will-change` hints on large inactive surfaces.
- Honor reduced motion and document visibility in every autoplay lifecycle.
- Maintain existing semantic controls, labels, focus behavior, and static art.

## Testing / verification strategy

- Static regression tests cover viewport-activity rules where practical.
- Run `pnpm --filter=@forge/2026 test`, `lint`, `typecheck`, and `build`.
- Run `pnpm analyze:react:changed` for the meaningful React changes.
- Compare production-mode Lighthouse desktop/mobile reports before and after.
- Inspect the live and local page at desktop and mobile breakpoints, including
  reduced motion and interactive controls.
- Verify generated media metadata, transparency, dimensions, and file sizes.

## Open questions

- None.
