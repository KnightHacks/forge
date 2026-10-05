# KHIX Dashboard Interface Guidelines Test Cases

Status: Approved for implementation

## Scope

Shared dashboard interaction, metadata, focus management, responsive controls,
and regressions across Status, Events, Map, My Hack, Lore, and Profile. API and
database behavior are excluded.

## Test placement plan

- Owner: `apps/khix`.
- Static checks: KHIX format/typecheck/lint/build and changed React analysis.
- Browser proof: Playwright against the local KHIX dashboard.

## Test cases

### TC-001: Mobile navigation manages focus

Setup:

- A signed-in user opens any dashboard route at mobile width.

Action:

- Open the menu, press Tab/Shift+Tab, then Escape.

Expected observations:

- Focus enters the drawer, remains inside it, Escape closes it, and focus returns
  to the menu trigger. Background dashboard content cannot receive focus while
  the drawer is open.

### TC-002: Dashboard controls expose visible focus

Setup:

- Open each available dashboard destination.

Action:

- Navigate interactive controls with the keyboard.

Expected observations:

- Every available link, button, form field, map destination, and event marker
  shows a visible focus indication that is not covered by sticky UI.

### TC-003: Mobile controls remain forgiving

Setup:

- Open Status, Events, Map, My Hack, Lore, and Profile at 320–390 px width.

Action:

- Inspect and operate navigation, buttons, filters, and editable fields.

Expected observations:

- Touch targets are at least 44 px, form text is at least 16 px, safe areas are
  respected, and no horizontal document overflow appears.

### TC-004: Browser context identifies the active page

Setup:

- Navigate among all dashboard routes.

Action:

- Read the document title after each navigation.

Expected observations:

- The title includes the active destination and Knight Hacks IX.

## Negative / regression cases

### TC-NEG-001: Reduced motion does not remove usability

Setup:

- The operating system requests reduced motion.

Action:

- Open pages, the mobile drawer, and the map.

Expected observations:

- Non-essential animation is disabled while navigation, focus, and all controls
  remain usable.

## Open questions

- None.
