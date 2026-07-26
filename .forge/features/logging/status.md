# Admin Action Logging Status

Current phase: Implementation

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-25: The feature is a comprehensive admin-action history, not ordinary
  runtime logging.
- 2026-07-25: Only users whose effective permissions include `IS_OFFICER` may
  view the logs; director status alone is insufficient.
- 2026-07-25: Log entries must identify who acted, what they did, when they did
  it, and the affected person/entity/object.
- 2026-07-25: Ordinary member/self-service actions are excluded. Initial
  coverage is actions gated by Forge's roles permission system.
- 2026-07-25: A deep multi-agent inventory of every active admin surface and
  permission-gated backend mutation will define the candidate action catalog
  before the artifact bundle is proposed for approval.
- 2026-07-25: The active admin UI exposes 52 unique mutation procedures plus
  sensitive export/download actions. The audit scope must classify the latter
  explicitly rather than treating every tRPC query as a passive page read.
- 2026-07-25: The backend contains 53 permission-gated mutation paths and 17
  protected/self-service mutation paths that must remain excluded.
- 2026-07-25: `CONFIGURE_ROLES` can currently add `IS_OFFICER` to a role and
  `ASSIGN_ROLES` can grant officer-bearing roles. These escalations will now
  require the actor to already have effective `IS_OFFICER`.
- 2026-07-25: V1 records successful committed actions, not ordinary validation
  failures, denied requests, or failed attempts. Non-atomic external-provider
  operations record their actual partial outcome.
- 2026-07-25: Sensitive CSV exports, resume views, response attachment
  downloads, and equivalent approved protected-content reads are audit actions;
  ordinary page views are not.
- 2026-07-25: Update details include changed field names and action-specific
  allowlisted before/after values. Raw form answers, file contents, signed URLs,
  tokens, credentials, and unrestricted input are prohibited.
- 2026-07-25: History is append-only, retained indefinitely, and exposes no
  product delete control.
- 2026-07-25: A bulk action means one explicit command affecting multiple
  records. It produces a parent action and directly linked per-target results.
  There is no activity window, session inference, or time-based grouping.
- 2026-07-25: A second-wave cross-check normalized the active admin surface
  into 62 candidate v1 business action keys after collapsing UI aliases.
- 2026-07-25: Résumé access requires a click-time audited endpoint because the
  current member-detail query pre-signs the URL before the user clicks View.
- 2026-07-25: Existing-form Save remains two precise actions unless both API
  calls gain an explicit durable operation ID. Timestamp proximity cannot
  correlate them.
- 2026-07-25: Company merge bulk results will be per moved employment, with
  the affected member as a secondary target.
- 2026-07-25: Capture is a hybrid: middleware provides trusted context and
  enforces an `audited`/`excluded`/`hybrid` declaration, while typed domain
  writes own action, target, and metadata semantics.
- 2026-07-25: Database-only business mutations and audit writes share one
  transaction; audit failure rolls back the action.
- 2026-07-25: External workflows use a durable operation ID with append-only
  provider/per-target results and expose committed partial completion as
  `partial_external`.
- 2026-07-25: The logs page is newest-first and defaults to 30 days, with
  cursor pagination, a visible search bar, and member, action/domain, date,
  actor, target-type, and outcome filters.
- 2026-07-25: The Member filter matches the selected person as actor, primary
  member target, or linked member target. Search covers actor, action, and
  target labels plus stable IDs.
- 2026-07-25: V1 has structured entry detail and no audit-history export.
- 2026-07-25: Actor and target ID/label snapshots survive rename or deletion.
  History begins at deployment with no legacy backfill.
- 2026-07-25: Append-only behavior is enforced at the API and database
  boundary; the application cannot update/delete audit records.
- 2026-07-25: Existing Discord notifications remain unchanged, the
  comprehensive audit stream is not mirrored there, and the database is the
  sole audit source of truth.
- 2026-07-25: Multi-call Save workflows remain separate precise actions in v1.
- 2026-07-25: Actor names use a snapshotted role color selected with Guild's
  existing callout priority rules, with a normal-text fallback.
- 2026-07-25: The human approved `spec.md`, `srd.md`, and `test-cases.md`.
  Implementation and test generation may begin.

## Open questions

None.

## Task list

- [x] Inventory every active Blade admin route and user-triggered action.
- [x] Inventory every active permission-gated backend mutation and side effect.
- [x] Cross-check UI actions against backend mutations and find unexposed,
      indirect, bulk, and protocol-boundary operations.
- [x] Confirm exact `IS_OFFICER` and director permission semantics.
- [x] Review legacy audit behavior, current audit seams, actor identity, and
      persistence/test patterns.
- [x] Present the normalized action/target catalog and policy questions to the
      human.
- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [ ] Implement the approved audit persistence and typed action catalog.
- [ ] Implement officer-only query APIs and the Blade logs page.
- [ ] Instrument every approved action and sensitive read.
- [ ] Enforce officer-only officer-permission and officer-role escalation.
- [ ] Generate and pass the approved automated test coverage.

## Validation / commands

- `pnpm install --frozen-lockfile`: passed using pnpm 9.12.1; workspace
  dependencies installed without changing the lockfile.
- `pnpm forge:feature logging "Admin Action Logging"`: passed; created the
  four-file feature bundle.
- Static inventory/research: completed; no product tests run yet.

## Links

- PRs:
- Issues:
- Discord/thread context: Current Codex task.
