# Technical Requirements

App-local changes in apps/2026. Share theme tokens on dashboard and portalled controls via an exported theme class. Use Lore’s existing heading shadows, common text/panel/control tokens and responsive utility title scales. Keep Lore’s story-page scale.

Parent owns primitives, spacing, Dashboard, Printing, Profile, Merch and integration. Agents own Teams, Events and Judging. Teams/Events deliver patches for the shared stylesheet, applied by parent; Judging owns its separate module. Parent audits screenshots together.

No new API, database, dependency, authorization, upload or deployment changes for this visual work. Avoid duplicate gutters and override piles. Preserve responsive wrapping, touch targets, bounded dialogs and reduced motion.

Motion follow-up: reuse Lore's ContentRise/ToolWake keyframes in the shared dashboard stylesheet. Section-level entrances last 660ms with 80/160/240ms stagger, only for no-preference motion. Export pageReveal for Printing, Judging and admission details; use existing page classes elsewhere. Page content mounting replays the entrance without remounting the persistent shell, form fields, live lists or QR. Do not add hover/focus conditions that restart mount animations.

Status follow-up: key the scene map by the existing lifecycle resolver rather than raw participant status. Keep typography, action layout, countdown and agreement styles in an app-local application-status CSS module so legacy short-screen rules cannot shrink the new text. Allow natural vertical scrolling and retain the common top inset. Bound shared dialogs to the width remaining beside the navigation rail. Existing API actions and agreements remain authoritative.

Judging time ranges use semantic time elements with the existing timezone formatter; both endpoints share bright cream text, bold tabular numbers and a soft lilac glow. Desktop retains the time column, while mobile puts the range inline with safe wrapping.

Portal refresh: inject a presentation-only loading fallback into PortalAuthBoundary from the portal layout. The shared logo screen has a black background; its authenticated variant fades to visibility:hidden in 650ms after a 120ms delay. It has no pointer interactions or authentication logic. Reduced motion hides the reveal overlay immediately. Actual session errors still expose the existing retry UI.
