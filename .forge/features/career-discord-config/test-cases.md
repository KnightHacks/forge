# Career Discord Configuration Test Cases

Status: implemented cases verified; Phase 6 full workspace checks and focused reviews passed.
Job collection, delivery, subscriptions and scheduling are outside this ticket.

## TC-648-001 — Fresh installation

Apply all migrations to disposable PostgreSQL. Expect exactly the registry's 19
keys, including all five Career settings with correct kinds, supplied IDs, and short
descriptions after the copy correction.
Only the failure row starts with null production/development IDs. Labels and
descriptions must be non-empty. Real Drizzle application twice must preserve rows.

## TC-648-002 — Upgrade and seed replay

Start from the previous required-production schema and officer-edited existing
settings. Apply the new schema/seed. Expect old rows unchanged and missing Career
rows inserted. Replay after a Career edit: preserve values, labels, customized descriptions, development
IDs and unset optional state; never duplicate keys. Keep the original 14-row
provenance fixture and historical SQL hashes frozen.

## TC-648-003 — Officer list and usage

List shuffled rows through the API and render the console. Expect groups in
server/channel/role order, correct Career placement, and empty consumer arrays
for all new keys. Scanner-derived live keys must match the consumer catalog;
strict and optional read calls must both be detected, including computed-key
violations. Tests do not count as production consumers.

## TC-648-004 — Save, audit and shared read

Warm the optional reader, save a failure ID through the officer API, list/read
again, then clear it. Expect SQL persistence, null/value audit diffs with the
correct key/kind, and immediate writing-process cache invalidation after commit.
The row count and key set stay fixed. Existing audit rollback tests must pass.

## TC-648-005 — Environment selection

Use explicit test production/development values. Expect production in production,
development elsewhere, and documented production fallback for a null development
value. A development-only failure destination must resolve null in production.
Intentional unset returns null only through the optional reader; strict reads
throw. Both readers share cache and normal TTL/invalidation behavior.

## TC-648-006 — Access and validation

Signed-out API requests remain UNAUTHORIZED; non-officers, including holders of
CONFIGURE_ROLES alone, remain FORBIDDEN. Optional blank, whitespace and null inputs
normalize to null. Malformed IDs, omitted production input and extra fields fail.
Every other production setting rejects blank/null with a productionId error and
no saved/audit changes. Direct SQL constraints independently reject invalid data.

## TC-648-007 — Missing rows and regressions

A missing migration row is not an optional unset value. Both read paths must
throw a diagnosable error; update must return NOT_FOUND and insert nothing.
Restore fixtures. Use registry-relative counts. Existing guild-repoint
confirmation, required string reads and cache failure tests remain intact.

## TC-648-008 — Real officer screen

Use an isolated Blade E2E instance and synthetic officer on migrated disposable
PostgreSQL. Verify save/reload/SQL persistence, clear/reload/SQL null, and required
Save disabled when empty. Inspect real desktop and 320px mobile screenshots;
check document overflow and dialog bounds. Restore/clear test values and drop
the database. E2E mode skips audits; TC-648-004 supplies separate real audit proof.

## TC-648-009 — Optional presentation and editor

Both responsive renderings show Not configured for null production/resolved
values. A null development ID says Reuses production only with production set.
Optional configure, clear and label-only edits are available. Other required
production fields cannot be cleared. The existing dialog, officer permission
checks, guild confirmation and save feedback stay in place.

## Evidence locations

- DB: discord-config-migration, career-discord-config-migration and migration-lineage suites.
- API: discord-config, discord-config-validation, club-teams and platform-config integration suites.
- Utils: discord-config cache/environment tests and consumer scanner.
- Blade: admin-config-console suite and local Chromium screenshot evidence.
- Full workspace commands and results: status.md and local Phase 6 verification receipt.

## Downstream acceptance

The future source worker must skip only an unset Discord failure notification,
retaining normal work and ordinary error logging/recovery. Delivery tickets own
that test; configuration tests cannot prove future worker behavior. Development
routing and maintainer rollout coordination remain operational prerequisites.
