# Dashboard Atmosphere Performance SRD

## Implementation

Add one grouped CSS rule in the 2026 portal's `khix-dashboard.module.css` after
the wisp definitions. Set `animation: none` on the fog pseudo-elements, canopy
glow and its pseudo-elements, and wisps and their pseudo-elements. Also set
`filter: none` on those layers: static filtered layers still kept the GPU thread
busy while fireflies moved. Keep the existing gradient and sprite backgrounds,
color blending, opacity, transforms, and responsive rules. Glows are slightly
crisper without the extra CSS blur and drop-shadow passes.

Leave the fireflies and the existing reduced-motion rule unchanged. No shared
package, JavaScript, dependency, API, or persisted-data changes are needed.

## Evidence and validation

Earlier Chrome MILLION recordings measured GPU-main-thread task activity at
98.2% with normal animation, 2.2% with all CSS animations paused, and 4.0% with
only the atmosphere hidden. Those recordings isolate the atmosphere but do not
measure this narrower change. Local production-build recordings subsequently
measured 98.2% with only the animations disabled, 99.1% with normal blending and
filters retained, 31.3% with filters and blending removed, and 26.0% with filters
removed and the existing blending retained. Retain the latter variant and
inspect desktop and mobile rendering.

## Rollout and rollback

The change takes effect with the next deployment of the 2026 app. Removing the
grouped override restores the current atmosphere animations.
