# Acceptance checks

- Pass shows name/photo, assigned class, project team and QR, without role/event filler or green top border.
- All six classes use their reference colors; null/unknown class retains a readable fallback. Long values wrap and missing photos show initials.
- No ring around profile pictures. Session photos prefer the current user's Blade upload over Discord. Missing uploads fall back to static/animated/full-URL Discord avatars; missing both sources yields initials. Signed-out sessions never load photos, and storage failures do not break authenticated sessions.
- Desktop is compact; 320×568 mobile shows the QR without scrolling for the sample identity. Background art does not block controls.
- Team link opens Teams; loading/error never pretend the user has no team. Client navigation back to Dashboard loads QR.
- Résumé empty, loaded, loading, failure and locked states are honest. Desktop exposes view/download/upload-or-replace; mobile opens a bounded dialog. Uploaded PDFs use existing size/type checks. Failed uploads retain the previous résumé.
- Confirmed attendees retain withdrawal; other application states retain their flow. No real withdrawal, check-in or team membership changes during QA.
- No Apple Wallet action remains in the dashboard, and the participant contract no longer exposes Wallet export.
