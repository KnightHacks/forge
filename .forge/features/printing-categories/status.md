# Status

Phase: production rollout complete; API contract bookkeeping correction awaiting PR review. Follow-up branch: codex/printing-category-ci.

Tracking issue: [#617](https://github.com/KnightHacks/forge/issues/617).

## Decisions

- Project and personal categories are required on new requests. Existing requests stay null until classified.
- Project priority, then original submission order. Printing jobs stay first. Owners can update their waiting requests even when submissions are closed; organizers retain PRINTING_QUEUE access (including the established officer override).
- Reused the IX arrival email design and safe React Email compiler; no new dependencies. Every submit, category change, cancellation, organizer status/note change, and manual timing change sends an update. No-op saves and participant replays do not send twice.
- Removed automatic equal-duration estimates from hacker notices and organizer summaries. Explicit organizer estimates remain available and are shown on the hacker dashboard.
- User selected a one-time reminder after launch, requested screenshots before any sends, then approved the Shinies-branded previews and requested merging to main. Sending is authorized after the live category flow and logo asset are verified.
- Added the existing Shinies wordmark prominently above both email headings, plus partner attribution in HTML and plain text. Blade serves the PNG export; its public response matched the release asset before sending. Updated desktop/mobile previews were inspected.
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
- Reminder sent once after live verification: 14 accepted by the email provider, 0 failed, 0 skipped, covering 20 uncategorized jobs. The subsequent preview returned 0 eligible recipients and 0 jobs; no resend was attempted.
- The previous main CI test run had an unhandled disposable-database teardown error in project-room-filter.test.ts after all tests passed. Its 3 local tests and the CI rerun passed before publication.
- Main CI run 38060417381 found two missing contract entries for printing.updateCategory: the API surface snapshot and audit coverage declaration. Added both, with hybrid audit classification matching its no-op behavior; the focused 11 tests pass. Root format, lint, and typecheck passed after the correction. No runtime behavior changed in this follow-up.
- Live KHIX shows project priority and variable print times. Blade shows uncategorized requests and both category choices. The public Shinies PNG returns HTTP 200 and matches the committed asset.

## Rollout

1. Completed: applied additive 0063_first_jean_grey to production and verified preserved job/file counts.
2. Completed: published through 349574e5 under the user's earlier merge approval and verified the live deployments and logo.
3. Completed: sent the authorized one-time reminder in production email mode, then verified no eligible reminders remain.
4. Open the contract bookkeeping correction as a PR; the user requested PR review instead of further direct pushes to main.

The Hacker’s Guide iframe was preserved unchanged. The user confirmed the blank state occurred only in Codex; it subsequently rendered in Codex too. No guide code changes were needed. Unrelated pre-existing local files were left untouched.
