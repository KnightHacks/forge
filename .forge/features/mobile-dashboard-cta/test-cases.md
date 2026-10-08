# Mobile Dashboard CTA Test Cases

Status: Manual/browser verification planned

## Scope

The 2026 public homepage's grass transition and dashboard CTA. Existing email tests and delivery state are independent.

## Test cases

1. At phone widths including 320px, load the homepage: grass appears substantially higher, the button is lower on the grass, and the full label fits without document overflow.
2. Inspect the CTA: text has at least 4.5:1 contrast, the target is at least 44px tall, and keyboard focus is visible.
3. Activate the CTA: navigation reaches the existing `/dashboard` flow without changing its authentication policy.
4. Scroll into About: no uncovered seam or new overlap with About content.
5. At desktop widths: preserve hero artwork and title placement; the new label fits the existing button.
6. With reduced motion: CTA remains readable and actionable; scroll/viewport changes preserve alignment with the foreground.

## Verification placement

Screenshots and ad hoc browser checks under `output/playwright/mobile-dashboard-cta/`. Run app checks and `pnpm analyze:react:changed`; no new test suite required for these reversible styling changes.

## Open questions

None.
