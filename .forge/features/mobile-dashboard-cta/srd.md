# Mobile Dashboard CTA SRD

Status: Validated locally

## Technical purpose

Adjust mobile foreground overlap and hero CTA placement within `apps/2026`.

## Relevant principles

Follow [Forge engineering principles](../../../docs/agentic-development/forge-engineering-principles.md) and the existing frontend design contract: scoped app changes, existing assets, clear controls, responsive verification.

## Access policy

The homepage link is public. The existing dashboard route retains all session and permission handling.

## Architecture / data flow

- `page.module.css` owns the foreground/About overlap.
- `Hero.module.css` owns CTA placement and presentation.
- `Hero.tsx` keeps the interactive desktop CTA exposed to assistive technology.
- `HeroTitle.tsx` uses the portal configuration's dashboard route and the requested label.
- Keep the existing parallax, reduced-motion behavior, art, and stable viewport handling.

## React / frontend constraints

Visual direction: keep the full-bleed fantasy forest and dominant logo, with one calm, readable action on the lower grassy foreground. Preserve existing animation and hover/focus interaction. Geometry changes are limited to the mobile hero breakpoint; shared label changes apply on desktop too.

## Compatibility / configurability

No API, database, dependency, environment configuration, or authentication changes. The route comes from existing portal configuration. The positioning is intentionally specific to the 2026 artwork. Reverting these source changes restores the prior presentation.

## Testing / verification strategy

Use Playwright screenshots at representative mobile widths including 320px and desktop. Inspect foreground continuity, button bounds, text contrast, focus, and dashboard navigation. Run formatting, lint, typecheck, and changed React analysis. No new implementation-mirroring test files are needed for this small visual change.

## Open questions

None.
