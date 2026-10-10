# Status

Phase: templates approved; production migration applied; publication and live verification in progress. Branch: codex/printing-categories.

## Decisions

- Project and personal categories are required on new requests. Existing requests stay null until classified.
- Project priority, then original submission order. Printing jobs stay first. Owners can update their waiting requests even when submissions are closed; organizers retain PRINTING_QUEUE access (including the established officer override).
- Reused the IX arrival email design and safe React Email compiler; no new dependencies. Every submit, category change, cancellation, organizer status/note change, and manual timing change sends an update. No-op saves and participant replays do not send twice.
- Removed automatic equal-duration estimates from hacker notices and organizer summaries. Explicit organizer estimates remain available and are shown on the hacker dashboard.
- User selected a one-time reminder after launch, requested screenshots before any sends, then approved the Shinies-branded previews and requested merging to main. Sending is authorized after the live category flow and logo asset are verified.
- Added the existing Shinies wordmark prominently above both email headings, plus partner attribution in HTML and plain text. A PNG export will be served by Blade; verify that asset is publicly available after deployment and before any send. Updated desktop/mobile previews were inspected.
- Reminder previews counts by default; live sending requires --send and configured production email mode. Atomic attempts prevent repeated/concurrent sends. Failures remain claimed for operator inspection because delivery may be ambiguous.

## Validation

- API/printing: 48 tests passed across 6 files, with real disposable local Postgres and mocked delivery.
- Database suite: 159 tests passed, including migration lineage and fresh/upgrade paths.
- Email: 116 tests passed. Validators: 349 tests passed. Hacker SDK: 57 tests passed. KHIX: 190 tests passed.
- Hacker desktop and 320px browser flow passed: required category, legacy classification while closed, preserved drafts, no automatic time claims.
- Organizer desktop and 320px browser flow passed with 60 requests: project ordering, category save/refresh, closed/open availability, no horizontal overflow.
- Email previews rendered and inspected at desktop/mobile sizes using example data: output/printing-emails/. UI screenshots: output/printing-categories/ (local-only).
- Local base database migration command failed on a pre-existing missing conflict index; browser tests used a fresh isolated disposable database instead. No existing local data was deleted.
- Final root format, lint, typecheck, and changed React analysis passed after visual adjustments. Lint retains repository size/hook warnings, with no errors.
- Shinies branding revision: reran all 116 email tests and root format/lint/typecheck successfully. Inspected both desktop email previews and the cancellation email at 320px; the local previews load the PNG from disk until Blade is deployed.
- Stopped both local development servers and removed the isolated browser-test database.
- Blade and KHIX production builds passed. The first KHIX build lacked local portal environment values; rerunning with the registered production portal client/origin supplied to that build succeeded without changing environment files.
- Production preflight verified 0063 was the only pending migration. Applied it successfully; all 24 jobs, 62 files, and 1 configuration remain. The three new nullable columns exist and no migrations remain pending.
- Reminder preview: 14 recipients with 20 eligible uncategorized jobs. No emails sent yet.
- The previous main CI test run had an unhandled disposable-database teardown error in project-room-filter.test.ts after all tests passed. Its 3 local tests pass; the failed CI job was rerun before publication.

## Rollout

1. Completed: applied additive 0063_first_jean_grey to production and verified preserved job/file counts.
2. Publish verified commits to main under the user's approval; verify Blade and KHIX deployments expose required categories and the Shinies email PNG.
3. After live verification, run packages/api/scripts/send-print-category-reminders.ts <hackathon UUID> --send in production email mode. Report accepted/failed/skipped totals and inspect failures; never automatically retry ambiguous sends.

No PR opened. Unrelated pre-existing local files left untouched.
