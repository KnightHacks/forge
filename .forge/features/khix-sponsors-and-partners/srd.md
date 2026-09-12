# Sponsor and Partner Technical Requirements

- Scope implementation to apps/2026 and this feature bundle.
- Extend existing homepage arrays and reuse the tier renderer.
- Preserve rock sprites, engraved filters, hover/focus treatment, mobile drift,
  and reduced-motion behavior from the existing CSS modules.
- Use existing/official brand assets with provenance; do not invent brand marks.
- Keep new assets local under the app's public directory.
- Correct icon-only Codex with a horizontal icon and wordmark.
- Tune logo dimensions for tall emblems and wide wordmarks.
- Give taller sponsor content enough clearance from the Team heading, separator,
  and profile cascade; prefer content-based clearance over fragile offsets.
- Preserve accessible organization names and external-link behavior.
- No schema, dependency-version, environment-file, or shared-package changes.

Validation: changed React analysis, formatting/lint/type checks, existing app
tests, real desktop/mobile screenshots, intermediate breakpoint checks, image
loading, links, overflow, and team clearance.
