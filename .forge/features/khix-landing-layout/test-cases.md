# KHIX landing page layout checks

- At 1440px and 1952px desktop widths, inspect the current 22 sponsors, nine
  partners, and public team roster. The waterfall continues to the FAQ divider;
  the final team row stays entirely above the divider.
- At 320px and phone widths, all sponsor/partner links and team avatars fit the
  document width and remain accessible.
- At a phone viewport with browser controls taking up screen space, Apply is
  fully visible on initial load, above the bottom controls, and still links to
  /apply. Desktop Apply placement is unchanged.
- Use a temporary browser-only 60-record roster to confirm added content expands
  both the artwork and reserved FAQ clearance without clipping.
- Check sponsor links and team selection with keyboard focus. Reduced motion
  retains the same geometry.
- Run apps/2026 format, lint, typecheck, and changed React analysis; inspect saved
  desktop and mobile screenshots. Do not change map PR files.
