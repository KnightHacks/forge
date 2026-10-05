# KHIX landing page layout SRD

Scope is three CSS modules in apps/2026: the sponsor/team section, the hero,
and the landing-page section stack. No shared packages or data contracts change.

Size the five waterfall/rock slices relative to the content-driven scene height,
preserving their existing overlap ratios and desktop crop. Stretch each slice's
background with its box so additional sponsor rows cannot expose the fallback
color. Share the FAQ overlap distance through a CSS variable and reserve that
distance plus breathing room after the team roster.

Position the mobile Apply button at 72svh, independently of the artwork's frozen
physical-screen-height unit, which includes space hidden by mobile browser bars.
Keep desktop placement, interactions, and reduced-motion behavior unchanged.

The page remains public. No authentication, API, database, dependency, deployment,
or environment configuration changes are needed. Reverting these three CSS
modules restores the previous presentation.
