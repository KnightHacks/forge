# Member QR Codes SRD

Status: Approved for implementation

> This file owns technical implementation constraints.

## Technical purpose

Add an on-demand user QR capability for the Blade member dashboard.

Reforge should not persist QR PNGs. The QR image is deterministic from the current auth `User.id`, so the API can generate a data URL when the dashboard dialog opens.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: product/package boundaries, tRPC/API principles, access policy, React/Next.js principles, and testing principles.
- `apps/blade/DESIGN_SYSTEM.md`: member dashboard surface hierarchy, mobile member experience, dialog behavior, and icon/button treatment.

## Access policy

- Unauthenticated/public:
  - Cannot view the member dashboard.
  - Cannot call the QR query.
- Logged-in user without a member profile:
  - Is routed to member onboarding and does not see the QR action.
  - Should not receive a QR image from the member-dashboard QR query.
- Logged-in member:
  - Can view their own QR code from the member dashboard.
- Officer/admin/organizer:
  - No special access is added in this slice.

## Architecture / data flow

- `apps/blade` owns dashboard placement, dialog state, loading state, and user-facing QR presentation.
- `@forge/api` owns the protected QR query and payload generation.
- `@forge/db` remains schema/client only. No QR schema or migration is needed.
- `@forge/validators` does not need a new validator because the QR query accepts no client input.
- `@forge/auth` remains the source of `User.id`; do not add QR/MinIO side effects inside auth.

Approved flow:

1. Member dashboard renders only after `member.getMember` finds a profile.
2. Dashboard renders a QR action in desktop and mobile layouts.
3. Opening the QR dialog calls a protected QR query.
4. The query derives the current `User.id` from the session.
5. The query confirms the user has a member profile for this member-dashboard surface.
6. The query generates a QR data URL from the raw `User.id`.
7. The dialog renders the QR data URL.

Legacy note:

- Legacy Blade had `ensureUserQRCode` that wrote `qr-code-<userId>.png` into MinIO with a `user:<userId>` payload.
- Legacy dashboard QR display did not retrieve that stored object; it generated a fresh QR data URL in memory.
- Reforge deprecates the stored MinIO QR path for this slice. Do not add new QR MinIO writes or cleanup.

## tRPC/API behavior

- Add `qr.getQRCode`: protected query, no input.
- Return `{ qrCodeUrl }`, where `qrCodeUrl` is an image data URL.
- The QR payload must be exactly `ctx.session.user.id`.
- Do not accept user IDs from the client.
- If the user has no member profile, return `NOT_FOUND` or equivalent safe failure.
- If QR generation fails, return `INTERNAL_SERVER_ERROR` with safe user-facing copy.

## Validation

No client input is accepted, so no new reusable Zod validator is required.

The payload format is a server-side contract: raw `User.id`.

## Data / migration / compatibility

No DB migration.

No MinIO storage.

Legacy MinIO QR objects are deprecated and ignored by this slice. A future cleanup/migration can remove legacy QR objects if desired, but this feature should not block on that.

## Discord integration

No Discord side effects. Discord auth only supplies the logged-in `User` identity.

## Configurability review

Would this require a developer change next year?

- Answer: no for this slice.
- The QR payload is an identity primitive, not semester/event/officer-managed configuration.

## React / frontend constraints

- Keep dashboard pages server-first.
- Implement the QR opener as a focused client component.
- Use existing `@forge/ui` `Button` and `Dialog` primitives.
- Use `lucide-react` QR iconography.
- Desktop placement: left/member-details side.
- Mobile placement: prominent primary button inside the full-screen Guild profile card.
- Keep the QR dialog centered with mobile-safe padding.
- Avoid card entrance animations.
- QR loading/failure state should stay inside the dialog.

## Testing / verification strategy

- API unit/integration coverage in `packages/api` for:
  - protected QR query returns a data URL derived from the current user ID
  - authenticated non-member does not receive a QR image
  - unauthenticated users are rejected by the protected procedure
- Blade component/e2e coverage for:
  - dashboard renders the QR action
  - member can open the QR dialog on dashboard
  - mobile dashboard shows the QR action prominently in the Guild profile card

No live MinIO tests are needed because this feature no longer touches MinIO.

## Open questions

- None for this slice.
