# Email Delivery Reliability SRD

Status: Scoped to the confirmed incident and the user's fix/test request.

## Architecture

Follow `docs/agentic-development/forge-engineering-principles.md`. Keep the provider protocol in `@forge/email`, coordination and state transitions in `@forge/api`, and existing display controls in Blade. Atomic subscriber operations follow the MAD/MAKER principle of small independently verifiable steps.

- Inject a required subscriber-write coordinator into live campaign preparation and retention cleanup. `@forge/api` supplies a PostgreSQL transaction advisory lock keyed by normalized address. Read Listmonk state inside the lock and hold it through both full subscriber replacement and list confirmation. Different addresses remain independent. No DB dependency is added to email.
- Limit recipient-lock transactions to four per process across all campaigns and cleanup calls. Queue excess calls before database checkout, leaving six connections in the default ten-connection pool available for other work. Transfer capacity in FIFO order only after the transaction settles, including checkout, lock, provider, and commit failures. Cross-process serialization remains the PostgreSQL advisory lock's responsibility.
- Bound every provider HTTP request, including subscriber and campaign operations.
- Retain provider campaign identity after any successful creation. Later errors remain reconcilable and never return to preparation.
- Map finished campaigns with missing sends, excessive send counts, or bounces to the existing failed state and safe diagnostic text. An over-count prompts verification without asserting that a duplicate arrived. Paused campaigns also use failed with no terminal timestamp, allowing read-only polling until an operator resumes them at the provider.
- Compare provider sent counts against both the approved frozen audience and provider total. Read Listmonk's documented `bounces` field.
- Recover legacy queued rows with campaign IDs and completed rows with a send-count mismatch. Poll older checked rows first and preserve terminal timestamps.
- Hide whole-campaign Retry once the provider may have started; keep server-side enforcement.
- Default HTML campaign delivery selects a Forge-owned content-only provider template instead of Listmonk's styled default. Insert missing unsubscribe/browser-view controls and tracking inside the authored body (or after a visual fragment), preserving existing controls. Explicit provider template overrides retain their existing behavior. Plain-text and transactional paths remain unchanged; do not mutate Listmonk's global default or other templates.

## Access, compatibility, and rollout

Existing EMAIL_PORTAL/officer gates and environment delivery policies remain unchanged. No new endpoint, dependency, environment variable, schema, migration, or Discord behavior. Deploy API/Blade and cron together so all subscriber writers use the same lock. Old workers do not respect the new lock. Application rollback restores previous behavior without a data migration.

No SMTP settings are changed by this patch. The observed SMTP failures require separate operational remediation and verified-recipient recovery; displaying failures does not itself retry missing mail.

## Validation

Provider mock tests, actual delivery-worker tests against disposable loopback PostgreSQL, affected consumer typechecks, root checks, and isolated live tests to the selected address. Automated tests use example.test recipients and mocked HTTP. Live checks use labeled private single-recipient campaigns and inspect provider results; no historical recipients are requeued.
