# Career Discord Configuration SRD

Status: implementation complete; full local checks and focused review passed.
Base: upstream main `b88d4de35ac47f7cb1555658741778a792351c90`.

## Contract and provenance

| Key                             | Kind    | Production ID         | Development ID |
| ------------------------------- | ------- | --------------------- | -------------- |
| `career_internship_channel`     | channel | `1537949209867583499` | null           |
| `career_new_grad_channel`       | channel | `1537949230742900827` | null           |
| `career_internship_digest_role` | role    | `1537949002031562862` | null           |
| `career_new_grad_digest_role`   | role    | `1537948941348503683` | null           |
| `career_source_health_channel`  | channel | null                  | null           |

Source: user-supplied production IDs on 2026-11-02. These were not independently
verified against Discord. The user confirmed the failure channel stays unset
and an officer fills it later. Null development values retain the existing
production-fallback behavior; no Career delivery consumer is enabled here.
Development routing must be resolved before live non-production delivery.

The five names follow the parent #633 automated proposal and the user's accepted
track-specific plan. The child #648 automated proposal suggested three generic
keys instead; it is not the implemented contract. Coordinate with downstream
owners before merge. Schema changes were explained before the user authorized
Phase 4; Phase 5 was explicitly requested for optional editing/reading behavior.

Additional user inventory, excluded from new routing keys:

- Internship consolidated: `1546636298188488704`.
- New-grad consolidated: `1546636299891384390`.
- Officers role: `486629374758748180`, matching the existing officer-role seed;
  it is not a digest audience.

## Ownership

- `@forge/consts`: supported keys, optional-key metadata, consumer labels.
- `@forge/db`: table, environment resolver, migrations and storage constraints.
- `@forge/validators`: trimmed ID input and key-specific required-value checks.
- `@forge/utils/discord-config`: shared reads and process-local snapshot cache.
- Existing `@forge/api` router: officer access, writes, auditing and invalidation.
- Blade: existing console, field display and controlled edit dialog.

No procedure, authorization rule, app, dependency, secret, deployment workflow,
or actual delivery consumer is added. All new consumer arrays stay empty.
The source scanner recognizes optional as well as strict reader calls so future
consumers must update usage metadata honestly.

## Storage and reads

One row is one supported setting; officers edit its values, not its key/kind.
Production uses productionId. Other environments use developmentId, falling
back to productionId when developmentId is null.

Only career_source_health_channel may have a null productionId. A named
key-specific database check keeps every other setting required. Existing
17–20 digit snowflake checks remain intact. There are no placeholder IDs.

DISCORD.OPTIONAL_CONFIG_KEYS contains only the failure key. Shared input
validation normalizes blank/whitespace to null, then rejects a missing production
ID for other keys with a productionId field error. Unknown keys/fields and
malformed snowflakes remain invalid. Validation does not verify Discord object
existence, guild membership or bot permissions.

getDiscordConfigId retains Promise<string>: missing rows and unresolved nulls
throw. getOptionalDiscordConfigId accepts only OptionalConfigKey and returns
string or null for intentional unset state. Missing rows and database errors
still throw. Both share the existing whole-table cache and 60-second TTL.

The unchanged update procedure locks the stored row, writes the update and audit
in one transaction, then invalidates the writing process's cache after commit.
Other processes converge within the existing TTL. No row creation is exposed.

## Blade behavior

Null production/resolved fields show Not configured. A null development field
shows Reuses production only if production exists; otherwise Not configured.
The same rules apply to desktop tables and mobile cards.

The optional editor permits configuring, clearing, and label-only edits while
unset. Other production fields remain required and disable Save when blank.
Existing guild-repoint confirmation, mutation feedback and officer gates remain.

## Migrations and rollout

- 0064_career_discord_config: relax production_id NOT NULL, add
  knight_hacks_discord_config_production_id_required_check, then seed the five
  rows with their final descriptions using ON CONFLICT (key) DO NOTHING to
  preserve officer edits.
- One generated snapshot and journal entry. Historical 0026 SQL, provenance
  fixture and locked migration hashes remain unchanged.

Deploy compatible code, drain old Blade instances, then apply the migrations.
Old code cannot map new keys to consumer labels and cannot correctly present
an unset production ID. Confirm this sequence with the maintainer: CI's optional
migrate_prod job waits for build, but has no code-deployment/drain dependency.
The repository variable and external deployment timing remain unverified.

Prefer a forward fix. Do not roll code back across registry support while the
new rows remain visible. Restoring NOT NULL also requires first configuring or
removing the unset failure entry. Never rewrite an applied migration.

## Proof and limits

The migration suites cover fresh installs, the previous schema, preservation of
existing edits, repeated seeds, exact IDs/kinds, required-key null rejection,
snowflake checks, and historical lineage. API tests cover null/value audit diffs,
SQL persistence, list results and immediate read invalidation. UI tests cover
both responsive renderings and editor guards; utils tests cover reads and cache.

Real Chromium verified officer save/reload/clear against a disposable database,
SQL confirmation, required-field Save behavior, desktop and 320px mobile display,
and dialog bounds without document overflow. Screenshots were inspected.
Existing E2E auth mode skips audit writes; separate API integration tests run
with that mode off and supply real audit proof. Test databases were dropped.
No live Discord call, private environment, running Blade database or production
deployment was used. Final check receipts live in status.md and the local review
packet, not a published PR.

## PR setup note

An officer must configure the source-health channel in Blade before Discord
failure alerts are enabled. Missing failure routing must not disable ordinary
Career work or error logging. Resolve development routing before live testing.

## Description copy

Match the existing short purpose statements: channels for internship/new-grad
posts and digests, roles pinged for each digest, and an optional channel for job
source failure alerts. Remove repeated change warnings and officer-access
explanations from row descriptions. Keep setup and rollout guidance in the
editor/help and PR notes.
