# Email Portal Status

Current phase: Tests generated and red / beginning implementation

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-25: The requested product has three connected capabilities: reusable email-template authoring and preview, campaign composition/scheduling with audience selection, and reliable delivery through Listmonk.
- 2026-07-25: The approved template experience makes administrator-authored TSX/code templates first-class, with supported React Email components plus structured merge, conditional, and repeated-content constructs. A visual editor remains available for simpler templates.
- 2026-07-25: The approved personalization direction does not assume one database profile shape. Audience sources contribute to a common set of recipient and context fields, and the preflight reports field availability across the selected audience and requires explicit fallbacks where coverage is incomplete.
- 2026-07-25: Arbitrary SQL audience selection is out of scope. V1 uses typed, server-compiled presets/rules.
- 2026-07-25: Listmonk campaigns are the approved bulk-delivery primitive for immediate and scheduled portal sends. Forge owns the authoring, audience, confirmation, and history experience. Existing application-triggered transactional email remains separate.
- 2026-07-25: Hard safety requirement: no test email may be delivered to any address except exactly `dylan@knighthacks.org`. Local development and CI use a fake provider by default. The only live test-send operation has no client-selectable recipient and resolves to that fixed address inside the email-provider boundary. Non-production audience sends, schedules, and retries fail closed rather than silently filtering a real audience down to Dylan; the mock database contains real email addresses.
- 2026-07-25: "All members" means current, non-alumni members. Alumni remain a separate audience.
- 2026-07-25: "Team members" means the existing configured team roster.
- 2026-07-25: A test email is optional. Before an immediate or scheduled send, the dashboard must show the final unique recipient count, especially in the confirmation dialog.
- 2026-07-25: Portal-created bulk sends honor unsubscribe and suppression state. Scheduled sends freeze the approved audience, remove newly suppressed recipients before delivery, and do not add newly matching recipients.
- 2026-07-25: Exact audience-count confirmation is sufficient for V1; no second-person approval workflow is required.
- 2026-07-25: The initial product direction was approved and captured in `spec.md`.
- 2026-07-25: The user approved one broad `EMAIL_PORTAL` capability for V1, a Blade-configurable team-role classification, and 90-day retention for recipient-level snapshots with durable aggregate history.
- 2026-07-25: `spec.md` is approved. A technical SRD has been drafted for explicit approval before schema, dependency, environment, email, cron, or deployment changes.
- 2026-07-25: The SRD was explicitly approved, authorizing its documented schema/migration, dependency, environment, provider, cron, retention, and rollout changes.
- 2026-07-25: Behavioral test cases were drafted at the owning package/app boundaries. Automated tests must use a fake provider and synthetic `example.test` addresses; live test delivery remains a separate Dylan-only manual gate.
- 2026-07-25: The behavioral test cases were explicitly approved. Test generation may begin; product implementation remains constrained by the approved spec, SRD, and cases.
- 2026-07-25: The approved tests were generated at the email, validator, API, database, Blade component, and synthetic Playwright boundaries. Their initial runs fail for the intended missing compiler, provider, audience, lifecycle, schema, migration, and UI modules.
- 2026-07-25: The user requested that newly merged Alumni Dashboard work from `reforge/main` be merged into this feature worktree before implementation continues.

## Open questions

- The implementation must return to SRD review if the deployed Listmonk or current React/Next versions cannot support the documented integration safely.

## Task list

- [x] Create the `email-portal` feature artifact bundle.
- [x] Inspect current email, permission, audience, scheduling, and delivery patterns.
- [x] Record the initial product proposal and implementation constraints.
- [x] Resolve the initial product questions and draft `spec.md`.
- [x] Approve `spec.md`.
- [x] Resolve the initial SRD defaults and draft `srd.md`.
- [x] Human approves `srd.md`.
- [x] Draft `test-cases.md`.
- [x] Human approves `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Generate tests and confirm intended pre-implementation failures.
- [ ] Merge the latest `reforge/main` Alumni Dashboard changes.
- [ ] Implement the approved feature in verified slices.

## Validation / commands

- `pnpm forge:feature email-portal "Email Portal"`: created the required feature artifact bundle.
- Read-only repository review: confirmed the current Reforge branch has a thin transactional Listmonk client, an `EMAIL_PORTAL` permission, recipient data in `Member`/`Hacker`/`HackerAttendee`, and no current portal, campaign schema, queue, history, or email tests.
- Port audit: Blade's default `3000` is occupied by the other worktree; use an alternate port for this worktree and account for the development auth base URL before OAuth testing.
- `git diff --check`: passed for the drafted product artifacts.
- `pnpm@9.12.1 exec prettier --check .forge/features/email-portal/spec.md .forge/features/email-portal/status.md`: passed.
- `git diff --check`: passed after the SRD draft.
- `pnpm@9.12.1 exec prettier --check .forge/features/email-portal/{spec,srd,status}.md`: passed.
- `git diff --check`: passed after the test-case draft.
- `pnpm@9.12.1 exec prettier --check .forge/features/email-portal/{spec,srd,test-cases,status}.md`: passed.
- `pnpm@9.12.1 --filter @forge/email test`: expected red; the new `templates` and `provider` modules do not exist yet.
- `pnpm@9.12.1 --filter @forge/validators test -- src/tests/email.test.ts`: expected red before the new email validators are available.
- `pnpm@9.12.1 --filter @forge/api test -- src/tests/email`: expected red; the new access, audience, and lifecycle modules do not exist yet.
- `pnpm@9.12.1 --filter @forge/db test -- src/tests/email-portal-schema.test.ts src/tests/email-portal-migration.test.ts`: expected red; all five schema/migration assertions fail on the missing approved storage.
- `pnpm@9.12.1 --filter @forge/blade test -- src/tests/admin/email-portal-navigation.test.tsx src/tests/admin/email-portal-workspace.test.tsx`: expected red; the Email Portal workspace/navigation implementation does not exist yet.

## Links

- PRs:
- Issues:
- Discord/thread context: Codex feature-design task, 2026-07-25.
