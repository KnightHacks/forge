# Acceptance Checks

- Zen desktop: compare Lore and every dashboard section for consistent headings, colors, surfaces and padding.
- Zen320px: Dashboard, Teams, Events and Judging wrap without overflow; the QR stays compact.
- Open representative dialogs without submitting changes. Theme follows portals and dialogs stay bounded.
- Long labels and existing loading/empty/error/locked states stay legible.
- Class accents and success/error indicators remain distinguishable; decorative motion respects reduced motion.
- Run typecheck, lint, tests, scoped formatting, React analysis and app production build; record actual results and limits.
- Page navigation: sections reveal in a short sequence; content remains visible after completion. Focus/blur and list updates must not restart the page entrance. The admission QR must remain outside moving elements. Audit the no-preference media guard and portalled-dialog boundaries.
- Codex browser: capture opening soon, applications open, applications closed, pending review, accepted, accepted at capacity, confirmation closed, confirmed, checked in, waitlisted, denied and withdrawn on desktop and at a 390px mobile layout width. Verify primary actions and lifecycle labels in the real rendered UI.
- Confirmation: required agreement controls whether Confirm my seat is enabled; optional agreement does not block it. Inspect without submitting. Check dialog bounds at 720px and mobile. At 320px, accepted status and primary action stay readable without horizontal overflow.
- Judging: check both scheduled time endpoints on desktop and mobile, preserving timezone formatting.
- Refresh: black screen and white logo replace the old loading message, then disappear to reveal the current dashboard. Inspect computed overlay opacity/visibility after the fade. Review reduced-motion CSS and keep session redirects/retry behavior unchanged.
- Open layouts: audit Teams, Events, Judging, Printing, Profile, My Hack and Merch on desktop/mobile. Preserve useful form/dialog boundaries. Merch shows exactly one availability message per item; My Hack omits age/access.
- Mobile pass: centered identity, metadata, résumé and QR at 320×568 and 390×844; equal gutters; no horizontal overflow. Live/help sections remain accessible below.
- Phone contacts: first click on each number opens a named dialog, initially focused on Cancel. Only its explicit Call link uses the matching tel destination. Cancel and Escape close safely. Inspect without actually dialing, including at 320px.
- Guide: zero outer padding and full available-height iframe. Distinguish frame verification from third-party document availability.
