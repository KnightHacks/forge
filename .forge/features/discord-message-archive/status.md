# Discord Message Archive Status

Current phase: Durable ingestion implemented; Full Access runtime verification and live/Blade completion pending

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
- [ ] Implement live create/update/delete ingestion and request human message-send verification.
- [ ] Implement the approved Blade archive dashboard.
- [ ] Add the aggregate Discord tab to Club Analytics.
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
- Drizzle generation initially failed because migrations `0021` and `0022` had sibling snapshot parents after the logging/email merge. The existing SQL journal was already sequential. Snapshot metadata `0022` and `0023` now includes the three logging-owned schema changes and follows the journal chain; neither existing SQL migration changed.

## Links

- PRs:
- Issues:
- Discord/thread context: current Codex feature-planning conversation
