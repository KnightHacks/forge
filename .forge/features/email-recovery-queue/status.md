# Status

Phase: implemented and locally validated. User selected manual admin review and retry. Existing `emailfix` branch retained.

Read-only investigation: October 1 waitlist campaign 2454 has 252/324 sends. Retained provider logs contain one start, one finish, and exactly 72 unique explicit SMTP 421 4.3.0 rejections. No live resend or subscription change. Zero bounces is not inbox confirmation. Recipient identifiers and production data are not included in committed artifacts.

Implemented: provider evidence adapter; API investigation and atomic selected retry; searchable, paginated Queue tab; manual recipient selection and confirmation; retry history; corrected hacker warning. Unknown outcomes and permanent rejections cannot authorize retries. The worker retains its suppression checks. No dependencies, migrations, or new environment variables.

Dylan's latest merged changes were integrated from `origin/main` at `d08e2815`: merch-store access (#601) and chronological check-in pickers (#603). No conflicts with the email queue work. His unmerged remote-judging branch was not included.

Browser validation: 65 synthetic campaigns; pagination reaches sends beyond the former 50-send window; server-side search returns all 13 matching campaigns. Reviewed 324 synthetic recipients with 72 selectable temporary failures. Confirmed desktop and 320px layouts, all four mobile tabs visible, scrollable review, and fixed confirmation controls. Screenshots contain only synthetic addresses. Provider calls were intercepted for the browser's review dialog; backend retry behavior is tested separately against disposable PostgreSQL.

Each eligible recipient also has an individual Retry button. It opens confirmation for that person alone, clearing any earlier bulk selection. Arbitrary subsets remain available through checkboxes. Verified in a component regression test and the real browser, including 320px width.

Validation after integrating main:

- `pnpm format`: 24 tasks passed.
- `pnpm lint`: 31 tasks passed; repository warnings remain, no errors.
- `pnpm typecheck`: 33 tasks passed.
- `pnpm analyze:react:changed` and explicit analysis of the new review component: passed.
- `pnpm build`: all 21 tasks passed. Rebuilt Blade successfully after the final individual Retry button change.
- Affected full suites: API 1,112; Blade 904; validators 347; email 114; cron 53 tests passed (2,530 total). PostgreSQL integration tests used an isolated local database.
- Final Blade email checks after the last button change: 19 tests passed, including individual selection, bulk selection, confirmation, unsafe outcomes, and retry history.
- Browser checks: queue search/pagination, desktop and 320px layouts, individual review replacing bulk selection, and screenshots passed.

Production build validation supplied existing `KHIX_HACKER_PORTAL_CLIENT_ID`, `KHIX_HACKER_PORTAL_ORIGIN`, `BLADE_URL`, and `NEXT_PUBLIC_TRPC_URL` values in the process environment only. No local configuration file was changed. No dependency install or database migration is needed for this feature. Hosted CI, deployment, and real resend execution were not performed.

Sources: https://github.com/knadh/listmonk/blob/v6.0.0/internal/manager/manager.go and https://listmonk.app/docs/apis/campaigns/
