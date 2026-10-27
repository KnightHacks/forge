# Stevin Dev Team Application Spec

Status: Active local review

## Purpose

Introduce Stevin George through one public Blade page that shows his work and lets reviewers explore a playful Lenny interaction.

## Interface

- The peach desktop page centers Stevin's name and introduction over a tree and grass scene.
- Resume and Portfolio are the two upper dropdowns. Both open into large rectangular preview cards. Resume shows the supplied one-page resume and opens that exact PDF. Portfolio reveals a recent screenshot of stevin.dev and opens the full site.
- GitHub and LinkedIn are lower direct links marked with outward arrows. They do not have dropdowns.
- Lenny can hop onto all four headings. Landing on Resume or Portfolio opens its dropdown. Landing on GitHub or LinkedIn highlights the link; a click or Enter opens it in a new tab. Landing alone never navigates.
- Mobile stacks the four destinations and omits the tree and Lenny.

## Scope

This application has no contact section, backend, account flow, automatic link navigation, or live iframe. The website and resume preview images are snapshots that can be refreshed when their sources change. No commit, pull request, or application submission is part of this local design batch.

## Acceptance criteria

- The desktop scene remains readable with either top dropdown open and both lower links visible.
- The resume preview matches the linked current PDF, and the portfolio preview comes from the live site.
- Every destination works by pointer and keyboard, with the two dropdowns remaining mutually exclusive.
- Lenny can reach each heading; social link landings require a deliberate action to navigate.
- The 320px mobile layout has no horizontal overflow and keeps all four destinations usable.
