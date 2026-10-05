# Acceptance checks

- Confirmed: identity, class, and auto-loaded QR; withdrawal still accessible through its existing confirmation dialog.
- Checked in: identical ticket structure, same minimal identity/class/QR layout, no withdrawal action.
- Other application states retain existing controls and do not issue QR requests.
- Failed QR request exposes retry without a misleading QR/download; successful retry restores image and download.
- Missing/broken avatar falls back to initials; long names wrap.
- QR PNG contains the server-provided payload, with a white quiet zone and no overlapping artwork.
- Desktop and 320px mobile show complete pass content with scrolling and no horizontal overflow.
- Shared session response remains valid for authenticated and signed-out consumers; optional photo absent/null is supported.
- No branding, date/venue header, promotional copy, disabled Wallet button, or status footer remains.

## Mobile QR enlargement

- At 320px and 390px mobile widths, show the tap hint and an edge highlight without covering any QR pixels or overflowing the page.
- Tapping the QR opens a substantially larger copy of the same image that fits the viewport, including landscape height constraints.
- The close control, Escape, and backdrop dismiss the scan view; keyboard focus returns to its trigger.
- Reduced-motion disables the edge animation; the static hint remains.
- Desktop QR layout and loading/error/retry behavior remain available. Enlarging never issues a new pass.
