# Saicharan Blade Dev Application Spec

Status: Approved

## User-facing purpose

Present Saicharan Ramineni's developer application as a focused cinematic experience inside Blade. Reviewers see the Tech Knight entrance, Saicharan's name, and one intentional handoff into his personal website rather than a duplicate biography or portfolio.

## Users / actors

- Knight Hacks Dev Lead and application reviewers
- Knight Hacks members and public visitors

## User-visible interface

A single public page at `/saicharan-ramineni` with an automatic 3D Tech Knight arrival and a minimal closing action. Selecting that action replaces the Blade application surface with a full-viewport, sandboxed frame of `saicharanramineni.com`. Browser Back restores the application. The site borrows only the cinematic ambition of Saicharan's existing portfolio.

## Scope

### In scope

- Responsive portfolio presentation at `/saicharan-ramineni`
- A custom modeled Tech Knight delivered as a real-time WebGL scene
- A Celestial-inspired reverse-departure entrance built from true 3D geometry and the live GLB, with no image placeholder
- A direct résumé link and a final transition into the personal site
- A fixed-source server bridge for the personal site because its upstream response denies direct framing
- Motion that respects reduced-motion preferences

### Out of scope

- Authentication, persistence, forms, or API work
- Changes to other Blade routes or shared packages
- A separate deployed site

## Acceptance criteria

- The route visibly identifies Saicharan Ramineni and his engineering focus.
- The opening establishes the singularity and energy field before any Tech Knight geometry becomes visible, then materializes and advances the real model.
- Scrolling during the entrance skips cleanly to the settled state; scrolling afterward changes the 3D camera composition.
- No raster stand-in is shown while the Tech Knight loads.
- The final action replaces the application with a full-viewport personal-site frame, and Back returns to the application.
- The layout remains usable on desktop and 320px-wide screens.
- Motion and hover effects do not hide information or block reduced-motion users.

## Open questions

- None. The user granted creative control and explicitly limited the existing portfolio reference to cinematic feeling rather than content or composition.
