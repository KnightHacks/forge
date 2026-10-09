# Dashboard Atmosphere Performance Test Cases

1. With normal motion enabled, open the dashboard. Fog, canopy glow, and all eight
   wisps remain visible and static, including their pseudo-elements. Those layers
   have no CSS blur or drop-shadow filters. All 24 fireflies retain their movement
   and the atmosphere retains its existing color blending.
2. Compare steady-state Chrome performance recordings before and after the
   override at the same viewport. Record GPU-main-thread task activity and the
   recording duration; do not report those values as hardware GPU utilization.
3. Inspect desktop and 320 px mobile screenshots. Existing forest styling,
   content, and controls remain visible, with no new horizontal overflow.
4. Open and close the mobile navigation, then visit another dashboard destination
   and return. Navigation remains functional and the atmosphere stays static.
5. Under the reduced-motion preference, fireflies and the other atmosphere layers
   remain static.

Run repository format, lint, typecheck, React analysis, and diff checks. Use
manual browser verification for this small CSS change rather than adding tests
that duplicate the selector implementation.
