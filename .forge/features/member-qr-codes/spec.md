# Member QR Codes Spec

Status: Complete

> This file owns the non-technical user/product intent. Technical design belongs in `srd.md`.

## User-facing purpose

Members should be able to quickly open a stable Knight Hacks QR code from their member dashboard.

The QR code represents the signed-in user's Blade identity. It is not editable and does not encode member profile details, Discord details, resume data, or Guild profile fields.

## Users / actors

- Signed-in users with a completed member profile.
- Future scanner/check-in operators who may eventually scan this QR code.

## User-visible interface

- The member dashboard shows a clear QR code action.
- On desktop, the QR action should be easy to find in the left/member-details side of the dashboard.
- On mobile, the QR action should be a prominent primary action inside the full-screen Guild/social profile card.
- Activating the action opens a centered dialog with the QR code.
- The dialog should be view-only and should not expose edit, upload, replace, or delete actions.

## Scope

### In scope

- Show a member's current user QR code from the member dashboard.
- Generate the QR image on demand from the current user's stable auth `User.id`.
- Keep the QR payload as the raw user ID.
- Keep QR code viewing behind the member dashboard experience.

### Out of scope

- Admin scanner/check-in flows.
- Event attendance, points, dues, pass generation, or hacker dashboard QR surfaces.
- QR code editing or rotation.
- Storing QR PNGs in MinIO.
- Migrating, reusing, or cleaning up legacy stored QR PNG objects.

## Vocabulary

- `User QR code`: A QR code whose payload is the current auth `User.id`.
- `Legacy stored QR`: The old Blade behavior that wrote QR PNGs into MinIO. This is deprecated for Reforge because the QR image can be derived on demand.

## Acceptance criteria

- A signed-in member can open their dashboard and view a QR code.
- The QR code payload is the raw `User.id`.
- The QR action is prominent on mobile and easy to find on desktop.
- A signed-in user without a member profile is still routed to onboarding and does not see the dashboard QR action.
- The feature does not write QR PNGs to MinIO.
- Legacy MinIO QR storage is treated as deprecated and not extended in this slice.

## Open questions

- None for this slice.
