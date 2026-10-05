# Technical requirements

Presentation lives in `apps/2026`: admission pass, résumé controls, portal flow hooks, and dashboard scene CSS. This separates data access, file actions, and layout into reviewable steps. Reuse the existing Teams query, avatar source, QR issuance, résumé SDK validation/cache invalidation, and upload endpoint.

The pass uses the available desktop width, positioned at the top, with identity/résumé and QR columns on desktop. Container-relative sizes scale the desktop photo, name, details and QR together. Mobile uses a smaller QR and a résumé dialog trigger beside team details. Long names wrap. QR loading, retry, and confirmed-only withdrawal remain intact. Deferred QR issuance avoids losing mutation state during Strict Mode mount replay.

The session DTO's existing `avatarUrl` now prefers `getProfilePictureDownloadUrlForUser` using only the authenticated session user ID. This reuses Blade's ownership validation and one-hour signed storage URL, without changing uploads, storage or auth. Missing/unavailable Blade photos fall back to the Discord avatar; photo lookup failures do not block sign-in. The existing session query refetches stale data on focus, refreshing signed URLs and changes made in Blade. Both the dashboard pass and navigation use this session photo.

Reuse web-optimized native SVG counterparts already in `public/dashboard/botanicals`, mapped to the user's individual-object exports in their README. Keep the existing animation and reduced-motion rules. No additional bitmap-backed scenery copies are needed.

Removed the Wallet button, download mutation, API/SDK/validator contract, signing code, artwork, tests, and passkit dependency. The existing web QR path stays intact. No certificate or local environment changes were made.

Résumé upload/replace stays subject to the existing event-start lock; client clock updates while the dashboard stays open, and the server remains authoritative. Same-origin view uses the current inline PDF response; download adds the file download attribute. No new upload or storage behavior.

Work remains local on `codex/2026-hacker-dashboard`; preserve pre-existing edits. No commit or push requested.
