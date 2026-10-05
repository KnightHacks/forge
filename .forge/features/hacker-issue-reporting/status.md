# Status

Reporting-first branch: 2026/hacker-issue-reporting-config, based on main commit 63d09901. The user corrected the requested order: reporting first, judging privacy second. Privacy commit 75a01f19 is preserved separately and will be replayed atop the reporting commit.

Implemented per-hackathon channel/ping-role configuration on Blade's Hackathons detail, officer-only read/write APIs, audited settings, generated nullable-column migration 0059, and authenticated report submission with rate limiting, idempotency and restricted mentions. No global channel setting remains.

Validation passed: root format (24 tasks), lint (31 tasks, warnings only), typecheck (33 tasks). API report/contract/configuration tests passed (21 tests, including migrations and real DB officer/scoping/clear/audit checks); validator tests passed (16), SDK tests passed (40), and Blade panel tests passed (3). Changed React analysis and direct analysis of the new panel passed. Formatting and diff checks passed after fixes.

Browser verified the panel at desktop and 320px mobile with a sample organizer against a disposable local database. Saved sample channel/role IDs and confirmed readback with Save disabled. Screenshot evidence: /tmp/forge-report-tests.N6jXQw/browser-evidence/report-settings-desktop.png and report-settings-mobile.png. Delivery and role-ping assertions use mocked Discord; no live report was sent.

Ready for reporting-first PR. Apply migration before deployment, then select the event in Blade → Hackathons → Hacker issue reports and configure a real private channel/role with bot access. Judging privacy will be second, on 2026/hacker-judging-score-privacy-stacked. Old privacy commit 75a01f19 is preserved for replay. No production DB write, push or PR creation.
