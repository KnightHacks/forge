# Saicharan Blade Dev Application Spec

Status: Approved

## User-facing purpose

Present Saicharan Ramineni's developer application as one continuous cinematic handoff inside Blade. Reviewers first meet Tech Knight at full scale, watch a black hole pull him out of the scene, and see Saicharan's live portfolio emerge from the same singularity rather than reaching it through a separate content section.

## Users / actors

- Knight Hacks Dev Lead and application reviewers
- Knight Hacks members and public visitors

## User-visible interface

A single public page at `/saicharan-ramineni` with an automatic, full-viewport 3D sequence. Tech Knight begins fully present, a black hole forms behind him and pulls the live model into its core, and the full-viewport sandboxed frame of `saicharanramineni.com` expands outward from that core. The site borrows only the cinematic ambition of Saicharan's existing portfolio.

## Scope

### In scope

- Responsive portfolio presentation at `/saicharan-ramineni`
- A custom modeled Tech Knight delivered as a real-time WebGL scene
- A black-hole departure built from true 3D geometry, shaders, particles, post-processing, and the live GLB, with no image placeholder
- A direct résumé link, a visible intro-skip control, and an automatic singularity transition into the personal site
- A fixed-source server bridge for the personal site because its upstream response denies direct framing
- Motion that respects reduced-motion preferences

### Out of scope

- Authentication, persistence, forms, or API work
- Changes to other Blade routes or shared packages
- A separate deployed site

## Acceptance criteria

- The route visibly identifies Saicharan Ramineni and his engineering focus.
- The opening shows the real Tech Knight model at full scale before the departure begins.
- A black hole forms behind Tech Knight, visibly bends the surrounding field, and pulls the live model into its core with a readable sense of depth and acceleration.
- No raster stand-in is shown while the Tech Knight loads.
- The personal-site frame is already loading behind the cinematic and is revealed outward from the black-hole core as one continuous transition.
- A visible skip control reveals the portfolio without trapping visitors in the animation.
- The layout remains usable on desktop and 320px-wide screens.
- Motion and hover effects do not hide information or block reduced-motion users.

## Open questions

- None. The user granted creative control and explicitly limited the existing portfolio reference to cinematic feeling rather than content or composition.
