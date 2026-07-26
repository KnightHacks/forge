# Email Portal Status

Current phase: Development team-campaign review / live review server running

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-25: The requested product has three connected capabilities: reusable email-template authoring and preview, campaign composition/scheduling with audience selection, and reliable delivery through Listmonk.
- 2026-07-25: The approved template experience makes administrator-authored TSX/code templates first-class, with supported React Email components plus structured merge, conditional, and repeated-content constructs. A visual editor remains available for simpler templates.
- 2026-07-25: The approved personalization direction does not assume one database profile shape. Audience sources contribute to a common set of recipient and context fields, and the preflight reports field availability across the selected audience and requires explicit fallbacks where coverage is incomplete.
- 2026-07-25: Arbitrary SQL audience selection is out of scope. V1 uses typed, server-compiled presets/rules.
- 2026-07-25: Listmonk campaigns are the approved bulk-delivery primitive for immediate and scheduled portal sends. Forge owns the authoring, audience, confirmation, and history experience. Existing application-triggered transactional email remains separate.
- 2026-07-26: The portal test button now targets exactly `directors@knighthacks.org`, with no client-selectable recipient. Local development and CI remain fake/network-free. If a separately authorized automated live integration check is ever introduced, its sole permitted address is `donotreply@knighthacks.org`. Test mode continues to reject bulk audience sends, schedules, retries, and arbitrary transactional recipients at the deepest provider boundary; the mock database contains real email addresses.
- 2026-07-25: "All members" means current, non-alumni members. Alumni remain a separate audience.
- 2026-07-25: "Team members" means the existing configured team roster.
- 2026-07-25: A test email is optional. Before an immediate or scheduled send, the dashboard must show the final unique recipient count, especially in the confirmation dialog.
- 2026-07-25: Portal-created bulk sends honor unsubscribe and suppression state. Scheduled sends freeze the approved audience, remove newly suppressed recipients before delivery, and do not add newly matching recipients.
- 2026-07-25: Exact audience-count confirmation is sufficient for V1; no second-person approval workflow is required.
- 2026-07-25: The initial product direction was approved and captured in `spec.md`.
- 2026-07-25: The user approved one broad `EMAIL_PORTAL` capability for V1, a Blade-configurable team-role classification, and 90-day retention for recipient-level snapshots with durable aggregate history.
- 2026-07-25: `spec.md` is approved. A technical SRD has been drafted for explicit approval before schema, dependency, environment, email, cron, or deployment changes.
- 2026-07-25: The SRD was explicitly approved, authorizing its documented schema/migration, dependency, environment, provider, cron, retention, and rollout changes.
- 2026-07-25: Behavioral test cases were drafted at the owning package/app boundaries. Automated tests must use a fake provider and synthetic `example.test` addresses; live portal test delivery remains a separate directors-only manual gate.
- 2026-07-26: Review feedback requires the portal to match Blade's standard Lucide-icon administration header and container width, default to Templates, remove the safety rail and bounded-TSX explainer, expand selected audience groups into a compact searchable checkbox list, and make Sends rows open full sender/content/recipient/activity details.
- 2026-07-25: The behavioral test cases were explicitly approved. Test generation may begin; product implementation remains constrained by the approved spec, SRD, and cases.
- 2026-07-25: The approved tests were generated at the email, validator, API, database, Blade component, and synthetic Playwright boundaries. Their initial runs fail for the intended missing compiler, provider, audience, lifecycle, schema, migration, and UI modules.
- 2026-07-25: The user requested that newly merged Alumni Dashboard work from `reforge/main` be merged into this feature worktree before implementation continues.
- 2026-07-25: `reforge/main` at `46ff212b` was merged cleanly into `reforge/email-portal` as merge commit `2d7e9cb4`; the Alumni Dashboard and bulletin work is present in this feature worktree.
- 2026-07-25: Scheduled sends remain frozen in Forge without an early provider handoff. When due, the delivery worker rechecks only the frozen recipient snapshot for late Listmonk blocklist/unsubscribe state, removes those recipients, and never adds new audience matches before creating and starting the Listmonk campaign.
- 2026-07-25: Production Listmonk synchronization uses the documented list, subscriber, subscriber-list, campaign, and campaign-status APIs. Per-send personalization is stored under a namespaced `forge.<sendId>` subscriber attribute so campaigns cannot overwrite one another's merge data.
- 2026-07-25: The Blade implementation uses the React Email rich editor for visual drafts and Monaco for the safe TSX dialect. The compiler remains the authority for allowed components, merge-field inference, preview output, and safety limits.
- 2026-07-25: The shared mock database already contained a different, out-of-branch migration at slot `0021`. The Email Portal migration was advanced to `0022` with a newer journal timestamp, applied successfully, and then exercised by the synthetic browser flow.
- 2026-07-25: Listmonk subscriber synchronization uses bounded batches of 20. Plain-text campaigns use Listmonk's native `plain` campaign content type, while compiled templates use `html` with an alternate text body.
- 2026-07-26: The deployed Listmonk is v6.0.0 and requires `/api/tx` calls to reference a transactional template. Forge now discovers or creates one shared raw-content wrapper (`Forge raw-content transactional wrapper`, currently Listmonk template `23`) and supplies rendered HTML through `Tx.Data.body`; the portal test target remains hard-coded to `directors@knighthacks.org`.
- 2026-07-26: The refreshed Listmonk token passed health plus list, subscriber, campaign, and template reads. Invalid create probes reached ordinary validation for lists, subscribers, and campaigns, confirming the required manage gates without creating provider objects.
- 2026-07-26: Forge no longer depends on Listmonk's `subscribers:sql_query` permission. Exact subscriber-state and namespace lookups use ordinary subscriber reads followed by normalized exact-email filtering.
- 2026-07-26: An explicitly authorized one-recipient reachability check was accepted by Listmonk for `dylan@knighthacks.org`; no other live recipient was used. The previously queued seven-recipient review send was cancelled in Forge with no provider campaign and cannot retry.
- 2026-07-26: Delivery policy is now derived only from `NODE_ENV`; the deployment-facing `EMAIL_DELIVERY_MODE` flag was removed to prevent a stale test-only value from limiting production. Production uses normal Listmonk delivery, development permits directors tests plus server-verified team-only campaigns, and tests use the network-free fake.
- 2026-07-26: The compose recipient panel sorts by first name, then full name/email for deterministic ties.
- 2026-07-26: Compose is again the first and default tab. Its subject, content mode/body/template, audience selections, manual deselections, and schedule fields persist in a validated, versioned seven-day local-storage draft and clear after successful confirmation.
- 2026-07-26: Development now supports a real Listmonk campaign only for the exact enabled team audience. The UI locks Team members, preview/confirmation reject other definitions, delivery rechecks all retained emails against current enabled roles, and the provider requires a server-issued team scope for campaign creation and start.
- 2026-07-26: The deployment-facing email mode flag was removed. `NODE_ENV=production` always resolves to normal Listmonk delivery, normal development resolves to directors tests plus team-only campaigns, and unit/test processes resolve to the fake provider. The existing Blade E2E harness marker selects fake delivery under `next dev` and is ignored by the production-first policy.

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
- [x] Merge the latest `reforge/main` Alumni Dashboard changes.
- [x] Implement schema, migration, validators, safe template compiler, provider boundary, audience resolver, send lifecycle, worker, and cron.
- [x] Implement Blade navigation, template workspace, composer, audience picker, exact-count confirmation, send history, and role audience configuration.
- [x] Run changed-file analysis, affected-workspace lint/typecheck/test suites, and migration checks.
- [x] Run Blade browser QA on an alternate port and inspect desktop/mobile screenshots.
- [x] Apply review feedback for Blade layout consistency, recipient-level deselection, send details, and directors-only test delivery.
- [x] Validate the Listmonk connection read-only and return the review server to port 3000 in test-only delivery mode.
- [x] Correct Listmonk v6 transactional test delivery, validate the refreshed token, remove the SQL-query permission dependency, and prevent test-mode audience retries.
- [x] Enable server-enforced development team campaigns, restore Compose as the default, and persist unfinished compose drafts across template work.

## Validation / commands

- `pnpm forge:feature email-portal "Email Portal"`: created the required feature artifact bundle.
- Read-only repository review: confirmed the current Reforge branch has a thin transactional Listmonk client, an `EMAIL_PORTAL` permission, recipient data in `Member`/`Hacker`/`HackerAttendee`, and no current portal, campaign schema, queue, history, or email tests.
- Initial port testing used an alternate port. The other Blade worktree now runs on `3010`, and this feature worktree owns `3000` for live review with the development auth base URL intact.
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
- `git merge --no-edit reforge/main`: passed; merged Alumni Dashboard commit `46ff212b` into the feature branch.
- `pnpm@9.12.1 lint:ws`: passed after aligning React Email versions and dependency ordering.
- `pnpm@9.12.1 --filter @forge/email test -- --run`: passed, 3 files / 35 tests.
- `pnpm@9.12.1 --filter @forge/validators test -- --run src/tests/email.test.ts`: passed, 12 tests.
- `pnpm@9.12.1 --filter @forge/api test -- --run src/tests/email src/tests/alumni src/tests/roles`: passed, 6 files / 47 tests.
- `pnpm@9.12.1 --filter @forge/db test -- --run src/tests/email-portal-schema.test.ts src/tests/email-portal-migration.test.ts`: passed, 5 tests.
- `pnpm@9.12.1 --filter blade test -- --run src/tests/admin/email-portal-navigation.test.tsx src/tests/admin/email-portal-workspace.test.tsx src/tests/admin/role-detail-dialog.test.tsx`: passed, 3 files / 6 tests.
- `pnpm@9.12.1 --filter @forge/email typecheck`: passed.
- `pnpm@9.12.1 --filter @forge/validators typecheck`: passed.
- `pnpm@9.12.1 --filter @forge/db typecheck`: passed.
- `pnpm@9.12.1 --filter @forge/api typecheck`: passed.
- `pnpm@9.12.1 --filter @forge/cron typecheck`: passed.
- `pnpm@9.12.1 --filter blade typecheck`: passed.
- Affected-workspace lint (`@forge/validators`, `@forge/db`, `@forge/email`, `@forge/api`, `@forge/cron`, and `blade`): passed.
- `pnpm@9.12.1 lint:ws`: passed with no workspace dependency issues.
- `drizzle-kit migrate` against the local mock environment: passed after advancing the feature migration to `0022`; `email_template` and `email_send` were confirmed present.
- Earlier fake-provider Playwright validation passed the synthetic create, preview, publish, schedule, and cancel path without network delivery. Desktop confirmation and 390 px mobile history screenshots were visually inspected.
- `git diff --check`: passed after implementation.
- `pnpm analyze:react:changed`: Email Portal files passed; the command retains the repository's existing analyzer failures in `apps/blade/src/trpc/react.tsx` and `legacy/apps/blade/src/trpc/react.tsx`.
- `pnpm format`: affected feature files pass Prettier; the workspace command retains unrelated formatting failures in `apps/guild/src/app/_components/globe-renderer.tsx` and `apps/blade/src/app/form/[slug]/page.tsx`.
- `pnpm lint`: affected workspaces pass; the root command retains unrelated Club type-resolution lint failures in `apps/club/src/app/teams/team-roster.ts`.
- `NODE_ENV=production pnpm --filter blade build`: application compilation passed; the existing full-app prerender later failed on `/admin/forms/sections`.
- `pnpm analyze:react`: completed with the repository's one existing analyzer failure in `apps/blade/src/trpc/react.tsx`; no Email Portal file existed yet at baseline.
- Follow-up affected-workspace typechecks for validators, email, database, API, and Blade: passed.
- Follow-up targeted ESLint for all changed TypeScript/TSX files: passed without warnings.
- Follow-up focused Vitest: validators 13, email 35, database 6, API 25, and Blade 4 tests passed.
- `drizzle-kit migrate`: applied additive migration `0023_email_manual_exclusions` successfully to the shared mock database.
- The legacy-derived BloomKnights sample compiled through `compileCodeEmailTemplate` with a derived `recipient.firstName` contract and 2,216-byte HTML output.
- Authenticated `GET /api/health` through the configured Listmonk transport: passed without sending or mutating email data.
- Earlier fake-provider Playwright follow-up, before the Compose-default revision, passed the then-default Templates landing, one manual recipient deselection, exact adjusted confirmation count, send-detail sender/body/recipient audit, cancellation, and mobile layout. Desktop/mobile screenshots were visually inspected.
- Port 3000 is running this worktree under `NODE_ENV=development`; the portal test button can contact Listmonk only for `directors@knighthacks.org`, while campaigns are limited to the current enabled team roster.
- Refreshed-token permission probes: `GET /api/health`, lists, subscribers, campaigns, and templates returned `200`; invalid `POST` probes returned validation `400` for lists, subscribers, and campaigns, with no provider object created.
- One explicitly authorized `/api/tx` reachability request to `dylan@knighthacks.org` returned `200`; no audience campaign was started.
- Follow-up email provider tests: 3 files / 38 tests passed, including the Listmonk v6 transactional wrapper, dynamic default campaign template discovery, and no-SQL subscriber lookup.
- Follow-up Blade workspace tests: 1 file / 4 tests passed, including test-mode audience delivery disablement.
- Follow-up `@forge/email`, `@forge/api`, and `@forge/blade` typechecks passed after rebuilding the email declarations.
- Follow-up targeted ESLint passed for email and API changes and for the Blade email portal files after using the validated email environment module.
- `git diff --check`: passed.
- Port 3000 was restarted from this worktree with the refreshed main-worktree environment and `NODE_ENV=development`; `/` returns `200` and unauthenticated `/admin/email` returns the expected auth redirect.
- Environment-policy unit coverage confirms `production → production`, `development → team review`, `test → fake`, and that the Blade E2E marker selects fake only outside production.
- Follow-up email tests: 3 files / 41 tests passed. API email tests: 3 files / 26 tests passed. Blade workspace/draft tests: 2 files / 7 tests passed.
- Synthetic Playwright TC-061 passed under the fake E2E harness: Compose landed first, unfinished subject/mode/body survived template creation, the scheduled send appeared in history, and cancellation completed without network delivery.
- The development team-only implementation did not create or start a live campaign during automated validation; the user retains the first live team-campaign confirmation.

## Links

- PRs:
- Issues:
- Discord/thread context: Codex feature-design task, 2026-07-25.
