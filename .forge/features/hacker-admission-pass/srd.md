# Implementation

Scope: apps/2026 admission-pass component/CSS and existing dashboard composition; an optional avatarUrl in the shared session DTO and the authenticated session read, using existing User image/Discord identity fields. No schema migrations, authentication policy changes, dependencies, or environment changes. Session photo only comes from the current authenticated user's row. API/SDK consumers must be checked together; updated strict schema and API should deploy together.

Use the existing issue-check-in-pass mutation and local QR encoder. Codes load on pass mount with explicit loading/error/retry. Never put a logo over QR modules. Four-module white quiet zone. Regenerating a pass invalidates previous copies under existing backend semantics; communicate use of the latest code. QR remains opaque and is not put in URLs, logs or persistent browser storage. Preserve confirmation/withdrawal rules.

Keep all work local on main per user instruction, without commit or push. Browser QA via CUA; no Playwright.

## Mobile QR enlargement follow-up

Use a local `HackerQRCode` component with the existing shared Dialog primitive for keyboard focus, Escape, and backdrop dismissal. Reuse the current QR image in the dialog; opening it makes no new pass request. Size the scan view against both viewport width and dynamic viewport height. Scope the decorative edge animation to mobile with `prefers-reduced-motion: no-preference`. Work remains on the existing `codex/2026-hacker-dashboard` task branch; no branch switch or shared package changes.
