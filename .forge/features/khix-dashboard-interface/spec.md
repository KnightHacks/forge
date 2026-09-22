# KHIX Dashboard Interface Guidelines Spec

Status: Approved for implementation

## User-facing purpose

Hackers should be able to operate every KHIX dashboard page with a keyboard,
mouse, trackpad, or touch device without losing context, encountering obscured
focus, or fighting controls that are too small. The dashboard should retain its
enchanted KHIX identity while following the supplied Web Interface Guidelines.

## Users / actors

- Signed-in Knight Hacks IX applicants and participants.
- Keyboard, screen-reader, reduced-motion, and mobile users.

## User-visible interface

- Shared desktop rail and mobile navigation drawer.
- Dashboard status, Events, Map, My Hack, Lore, and Profile pages.
- Dialogs, forms, loading/error/locked states, and actionable controls.
- Page titles that identify the current dashboard destination.

## Scope

### In scope

- Visible, unobscured focus across every interactive dashboard surface.
- Keyboard-managed mobile navigation with focus containment and restoration.
- Mobile-safe touch targets, form text sizing, safe areas, and scrolling.
- Reduced-motion behavior and explicit, compositor-friendly transitions.
- Accurate titles and concise, action-oriented recovery states.

### Out of scope

- Changing KHIX brand direction, page content strategy, or information architecture.
- Changing authentication, Hacker SDK behavior, database data, event dates, or permissions.
- Restyling the public KHIX site or the application form.

## Vocabulary

- `Dashboard`: The signed-in KHIX participant routes under `/dashboard`.
- `Working surface`: The primary content for a dashboard destination.

## Acceptance criteria

- Every dashboard route has a context-specific browser title.
- Keyboard users can see focus and operate all available controls.
- Opening the mobile menu moves focus inside it; Tab remains contained; Escape
  closes it; closing restores focus to the menu button.
- Mobile controls are at least 44 px and editable fields use at least 16 px text.
- Safe areas, browser zoom, reduced motion, and long content remain supported.
- Existing KHIX data behavior and visual identity are unchanged.

## Open questions

- None. The user explicitly requested applying the supplied guidelines to the
  entire KHIX dashboard.
