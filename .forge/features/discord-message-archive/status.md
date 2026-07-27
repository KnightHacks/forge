# Discord Message Archive Status

Current phase: Development implementation and automated/browser validation complete; human live edit/delete verification pending

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-26: Archive all message history available to the dedicated Archive bot in the configured Knight Hacks guild; direct messages are categorically excluded.
- 2026-07-26: Use a dedicated Discord application and token while reusing the existing TK Gateway process, cron process, PostgreSQL deployment, and `NODE_ENV`-derived guild constant. No new Forge app, pod, or deployment unit is planned.
- 2026-07-26: Combine idempotent historical backfill, frequent cursor-based reconciliation, and live Gateway ingestion. Durable scrape behavior is implemented and tested before live-event verification.
- 2026-07-26: Blade will not expose raw message search, including to administrators. Initial Blade work provides an authorized dashboard for archive observability and approved aggregate consumption.
- 2026-07-26: The Archive bot is installed in both development and production guilds, and its ignored local token is configured.
- 2026-07-26: Individualized member enrichment and knowledge-retrieval use remain downstream capabilities rather than implicit first-slice behavior.
- 2026-07-26: The human approved all reverse-prompt decisions.
- 2026-07-26: `/admin/discord-archive` is an effective-`IS_OFFICER`, read-only operational-health surface. Aggregate Discord activity belongs in a new Discord tab inside the existing Analytics workspace.
- 2026-07-26: The complete `spec.md`, `srd.md`, and `test-cases.md` contracts were written from the approved decisions and marked approved.
- 2026-07-26: The durable REST source filters parent channels by the Archive bot's effective `VIEW_CHANNEL` and `READ_MESSAGE_HISTORY` permissions, discovers active threads every minute, and discovers paginated public/joined-private archived threads during the initial backfill.
- 2026-07-26: Backfill pages and cursors commit atomically. One-minute reconciliation walks backward until overlap, and a PostgreSQL advisory-lock plus expiring guild lease prevents concurrent workers.
- 2026-07-26: The resumed Codex sandbox denies local TCP, the Colima socket, and external Discord networking with `EPERM`; real dev migration/scrape verification is handed off to a Full Access task.
- 2026-07-26: Full Access runtime verification applied migration `0024_fat_wasp` to the configured development database exactly once and confirmed all four archive tables exist.
- 2026-07-26: The first real development-guild scrape exposed Discord error `20001` because the OAuth-only current-user guild-member route rejects bot tokens. Discovery now resolves the Archive bot's user ID and requests its member record through the guild-member route.
- 2026-07-26: The second scrape exposed Discord error `50024` when archived-thread discovery was attempted on a voice channel. Voice/stage message history remains included, while archived-thread enumeration is now limited to thread-capable text, announcement, forum, and media parents.
- 2026-07-26: The corrected real development-guild scrape completed 758 historical pages across 52 visible surfaces and stored 71,899 unique messages with zero reconciliation failures or cursor mismatches. A second complete run processed zero pages, added zero rows, and left duplicate message IDs at zero.
- 2026-07-26: The real guild currently exposes 32 non-thread message surfaces and 20 public threads to the Archive bot. No private threads are currently visible/joined; this is a coverage observation rather than an ingestion failure.
- 2026-07-26: The Archive Gateway uses only `Guilds`, `GuildMessages`, and `MessageContent`, requests no DM intent, hydrates partial edits, tombstones single/bulk deletes, and contains event-handler failures without logging content.
- 2026-07-26: A legacy T.K. command rejection with Discord `10062` terminated the first shared runtime trial. T.K. command execution now has a safe promise boundary so unrelated slash-command failures cannot terminate the shared bot/Archive process.
- 2026-07-26: The health and Discord Analytics API read models select only operational metadata and aggregates. A live serialized-response audit found no content, author-label/ID, message-ID, embed, or attachment fields.
- 2026-07-26: Browser verification proved the officer health route, a non-officer redirect and hidden navigation destination, and continued Discord Analytics access for an existing `READ_CLUB_DATA` non-officer. Desktop and mobile layouts were inspected with the development database.
- 2026-07-26: One human-authored six-character live create (message suffix `…099434`) was observed without reading or printing its text. Human confirmation, a second create, edit, delete, and post-reconciliation tombstone proof remain pending.
- 2026-07-26: The officer archive page now fits one desktop viewport with compact status/totals and a short internal surface-coverage scroller. Discord Analytics uses the same metric-card definitions and filter geometry as the other sections, with only a compact health/updated signal in its header.
- 2026-07-26: The two MLH undergraduate level-of-study values remain distinct in storage and APIs but render as one `Undergraduate University` segment across audience composition, segment analysis, affinity, and member drill-down.
- 2026-07-26: Reports now offers an authorized, audited streaming resume ZIP. Each available PDF appears in `All`, `Grad Term/<term year>`, `University/<school>`, and `Major/<major>` with a sanitized `First_Last_GradTerm_GradYear.pdf` name; missing, invalid, and ownership-invalid legacy objects are skipped without exposing their references.
- 2026-07-26: The populated development database exposed a brittle Analytics E2E assertion because the complete event table paginates. The test now selects its named fixture through the Individual event filter and passes without depending on unrelated development data volume.
- 2026-07-26: `origin/reforge/main` was merged into the feature branch at `b726f545`, bringing in the refreshed Blade/Guild branding and metadata. The sole conflict in Cron environment validation retained both main's `NODE_ENV` field and the archive's optional token.
- 2026-07-26: Analytics now derives author-free human Discord participation depth: human-message count, distinct human-author count, average and median messages per participant, active days, and active surfaces. No author identity or message-level record is returned.
- 2026-07-26: Overview lifecycle findings are linked cards grouped by objective, including Discord conversation. Overview, Audience, and Dues each include explicitly unjoined Discord context; Audience's data-coverage metric card was removed, and every Analytics metric card now uses the same 160px height and uppercase label treatment.
- 2026-07-26: Each Discord message-activity bar now exposes a keyboard-accessible styled tooltip with its formatted date, aggregate message count, and active-surface count.
- 2026-07-26: Reports now includes a first-class Discord summary CSV, producing a six-card 3×2 desktop grid with the resume bundle. The export contains aggregate summary metrics, sender mix, daily activity, top surfaces, and archive coverage, and uses the existing `analytics.report.exported` audit action with `kind: "discord"`.
- 2026-07-26: Resume-bundle preparation keeps the memory-safe native streaming download and now uses a validated per-download readiness cookie. The Reports action remains responsive with a disabled spinner, realistic wait guidance, success/error feedback, and automatic reset when the ZIP response starts.
- 2026-07-26: Resume-bundle graduation folders use the combined graduation term and year (for example, `Grad Term/Fall 2027`) so the same term across different cohorts is never collapsed into one folder.
- 2026-07-26: Overview, Audience, and Dues now render Discord enrichment as direct metric-card rows without nested context panels. Every Analytics metric card requires a lower enrichment row: comparison-capable overview measures use green/red direction indicators, while the remaining cards show denominators, rates, medians, coverage, or other supporting facts.

## Open questions

- Production database and backup encryption at rest must be confirmed before production ingestion is enabled. This does not block development-guild implementation or testing.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact decisions before implementation/test generation.
- [x] Write the approved feature artifact bundle.
- [x] Generate the initial implementation tests from `test-cases.md`.
- [x] Add initial schema, migration, validator, and durable-scrape worker tests.
- [x] Implement the validated archive schema and restart-safe scrape algorithm.
- [x] Implement and test the durable channel/thread discovery and historical scrape path.
- [x] Implement frequent cursor reconciliation with single-run coordination.
- [x] Implement live create/update/delete ingestion.
- [ ] Complete human create/edit/delete verification and post-reconciliation tombstone proof.
- [x] Implement the approved Blade archive dashboard.
- [x] Add the aggregate Discord tab to Club Analytics.
- [x] Compact and normalize the archive/Analytics layouts and frontend-only undergraduate grouping.
- [x] Add and verify the audited Member resume bundle download.
- [x] Add and browser-verify the resume-bundle preparation state.
- [ ] Confirm production storage and backup encryption at rest.

## Validation / commands

- `node scripts/create-forge-feature.ts discord-message-archive "Discord Message Archive"`: passed using Node's native TypeScript support after the sandbox blocked `tsx` IPC socket creation.
- Artifact reverse-prompt approval: approved by the human on 2026-07-26.
- `vitest run packages/validators/src/tests/discord-archive.test.ts packages/db/src/tests/discord-archive-schema.test.ts packages/db/src/tests/discord-archive-migration.test.ts`: 3 files and 10 tests passed.
- `vitest run apps/cron/src/tests/discord-archive*.test.ts packages/db/src/tests/discord-archive*.test.ts packages/validators/src/tests/discord-archive.test.ts`: 6 files and 21 tests passed.
- `tsc -p packages/validators/tsconfig.json --noEmit --emitDeclarationOnly false`: passed.
- `tsc -p packages/db/tsconfig.json --noEmit --emitDeclarationOnly false`: passed.
- `tsc -p apps/cron/tsconfig.json --noEmit`: passed after reconstructing local workspace package links in the resumed sandbox clone.
- `tsc -p packages/api/tsconfig.json --noEmit --emitDeclarationOnly false`: passed.
- `tsc -p apps/tk/tsconfig.json --noEmit`: passed for the initial Discord.js live projector/persistence adapter.
- Focused ESLint for archive cron/API/DB files and tests: passed.
- `drizzle-kit generate`: generated additive migration `0024_fat_wasp.sql`.
- `drizzle-kit migrate`: blocked before connecting with `AggregateError [EPERM]` because this resumed task cannot open local TCP or the Colima control socket. No migration was applied by this task.
- `pnpm --filter @forge/db migrate`: passed with Full Access; the migration ledger contains `0024_fat_wasp` once and the development database exposes `discord_archive_channel`, `discord_archive_message`, `discord_archive_checkpoint`, and `discord_archive_state`.
- First `pnpm --filter @forge/cron discord-archive:backfill`: failed safely before discovery with Discord `20001` ("Bots cannot use this endpoint"); it created no channel or message rows, released its lease, and retained a content-free safe health error.
- Second `pnpm --filter @forge/cron discord-archive:backfill`: failed safely before discovery with Discord `50024` ("Cannot execute action on this channel type"); the archived-thread parent filter was corrected without excluding voice/stage message history.
- Corrected `pnpm --filter @forge/cron discord-archive:backfill`: passed; discovered 52 surfaces, processed 758 pages, reconciled 25 bounded surfaces, reported zero reconciliation failures, and committed 71,899 distinct message rows.
- Idempotency `pnpm --filter @forge/cron discord-archive:backfill`: passed; discovered the same 52 surfaces, processed zero historical pages, reconciled 25 bounded surfaces, and retained exactly 71,899 distinct message rows with 52 complete checkpoints.
- Direct database audit after the successful scrape: passed; configured development guild only, no DM channel types, no missing channels, no non-development-guild rows, no duplicate IDs, and every non-empty checkpoint's stored oldest/newest cursor matched its message extrema.
- `pnpm --filter @forge/tk test -- discord-archive command-handler`: 2 files and 8 tests passed, covering intents/partials, guild and DM boundaries, partial edit hydration, single/bulk tombstones, bot/webhook/system projection, archive-handler isolation, and shared command failure containment.
- Final affected feature tests: validators 2 files/8 tests, database 3/12, cron 3/11, TK 2/8, API 6/19, and Blade 4/20; 20 files and 78 tests passed.
- Validators, database, API, cron, TK, and Blade focused typechecks: passed.
- Focused ESLint across the new API, validator, Blade, and test files: passed with an 8 GiB Node heap after the default 4 GiB process exhausted memory.
- Targeted React analyzer: 12 changed TSX files, 5 components, zero failures.
- Playwright visible-browser verification on `http://localhost:3000`: passed for effective-officer health access, non-officer redirect/navigation exclusion, `READ_CLUB_DATA` Discord Analytics access, raw-field marker exclusion, and desktop/mobile rendering. One existing missing-resource 404 was logged without a page error.
- Refinement Playwright verification on port 3000: passed. Overview, Events, and Audience each rendered a 70px filter bar and identical first-card offset; the archive page matched the 900px viewport with a 351px internally scrolling coverage region; archive and Discord Analytics had no mobile page overflow; all four Discord metrics exposed the standard info definitions; removed copy/version labels were absent.
- `admin-club-analytics.spec.ts` against the live port-3000 Blade server: 2 tests passed, covering the authorized responsive/filter/export flow and authenticated no-access redirect.
- Post-merge Analytics Playwright verification against the real development database: Overview, Audience, Dues, and Discord rendered the new aggregate query with no page errors, 404s, or horizontal overflow. All metric cards measured exactly 160px; Audience mobile overflow was zero; the removed data-coverage card was absent; and Discord lifecycle links targeted the Discord section.
- Targeted React analysis for the Analytics dashboard, shared metric card, and Discord section: 3 files, 4 components, zero failures.
- Real hover verification on the Discord trend: passed across all 42 rendered bars; the latest tooltip showed `Jul 26, 2026`, 18 messages, and 4 active surfaces without clipping.
- Real Discord-summary export verification: passed. The six report cards rendered as two rows of three equal-width cards; the downloaded `discord-analytics-summary-2025-2026-academic-school-year.csv` was 397 lines across metadata, summary, sender-mix, daily-activity, top-surface, and archive-coverage families with no author or message-record fields.
- Pre-cohort-folder-refinement real development resume-bundle download: passed in 47 seconds. The 197MB ZIP passed CRC validation and contained 1,360 PDF entries representing 340 unique available resumes exactly four times each: 340 in `All`, 340 by graduation term, 340 by university, and 340 by major. Aggregate checks found zero unsafe paths, malformed filenames, folder mismatches, or copy-count mismatches.
- Resume preparation-state validation: focused route/dashboard tests passed (2 files, 13 tests), Blade typecheck and targeted lint passed, and the port-3000 Playwright readiness-handshake test passed with the spinner, disabled action, wait guidance, and automatic reset visually inspected.
- Graduation-folder refinement validation: the resume-plan suite passed (1 file, 3 tests), API and Blade typechecks passed, targeted 8 GiB lint passed, and an aggregate-only development-data plan audit found 22 distinct term-and-year cohort folders across 378 nonblank resume references versus 3 folders when grouped by term alone.
- Metric-card consistency validation: the dashboard suite passed (1 file, 10 tests), including a per-section card/detail parity assertion; Blade typecheck, targeted 8 GiB lint, and React analysis (3 files, 4 components, zero failures) passed. The live port-3000 Analytics E2E passed with four Discord cards and eight direct cards each on Audience and Dues; Overview, Discord, Audience, and Dues screenshots were visually inspected with no missing enrichment rows or nested Discord context shells.
- Resume preflight observed 329 blank legacy resume fields, 35 missing objects, one non-PDF object, and two ownership-invalid legacy references. These unavailable records are excluded with aggregate-only safe logs; no member names, object keys, or PDF contents were printed.
- Blade is running from this checkout on port 3000 in Next webpack development mode because Turbopack rejects the checkout's shared `node_modules` symlink as outside its filesystem root.
- Drizzle generation initially failed because migrations `0021` and `0022` had sibling snapshot parents after the logging/email merge. The existing SQL journal was already sequential. Snapshot metadata `0022` and `0023` now includes the three logging-owned schema changes and follows the journal chain; neither existing SQL migration changed.

## Links

- PRs:
- Issues:
- Discord/thread context: current Codex feature-planning conversation
