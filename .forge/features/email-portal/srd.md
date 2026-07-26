# Email Portal SRD

Status: Approved

## Technical purpose

Add a reusable Email Portal capability to Blade without making Blade own recipient resolution or provider behavior. The system must safely compile administrator-authored email templates, resolve and freeze mixed-profile audiences, hand bulk sends to Listmonk idempotently, reconcile delivery state, and fail closed outside production.

The portal is additive. Existing application-triggered transactional hackathon email remains separate and must not be silently converted to the new bulk-send lifecycle.

## Relevant principles

- [Product/architecture philosophy](../../../docs/agentic-development/forge-engineering-principles.md#productarchitecture-philosophy): Blade is a client; durable email workflows live in platform packages.
- [Sharing and package boundaries](../../../docs/agentic-development/forge-engineering-principles.md#sharing-and-package-boundaries): product workflows belong in `@forge/api`, schema in `@forge/db`, validation in `@forge/validators`, provider and rendering boundaries in `@forge/email`, and Blade composition in Blade.
- [tRPC and API principles](../../../docs/agentic-development/forge-engineering-principles.md#trpc-and-api-principles): browser business operations use permission-aware tRPC procedures rather than new REST endpoints.
- [Database principles](../../../docs/agentic-development/forge-engineering-principles.md#database-principles): multi-table confirmation and lifecycle transitions are transactional, with a generated migration and rollback notes.
- [Auth, Discord, and permission principles](../../../docs/agentic-development/forge-engineering-principles.md#auth-discord-and-permission-principles): all server boundaries enforce the existing control-permission system.
- [Configurability principles](../../../docs/agentic-development/forge-engineering-principles.md#configurability-principles): the team audience is role-configurable in Blade rather than permanently tied to yearly role-name constants.
- [React and Next.js principles](../../../docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles): the route remains server-first and interactive editors stay in focused client components.
- [Security and data hygiene](../../../docs/agentic-development/forge-engineering-principles.md#security-and-data-hygiene): provider credentials, template execution, recipient PII, and test delivery require explicit controls.
- UI implementation must follow [Blade's design system](../../../apps/blade/DESIGN_SYSTEM.md) and the repository frontend design workflow.

## Access policy

- Unauthenticated users cannot access Email Portal pages or procedures.
- Logged-in users without `EMAIL_PORTAL` cannot read templates, audiences, sends, recipient snapshots, previews, or delivery state. APIs return `FORBIDDEN`; Blade omits the navigation entry and redirects unauthorized direct navigation.
- `EMAIL_PORTAL` remains one broad V1 capability for template authoring, audience preview, test send, immediate send, scheduling, cancellation, history, and safe retry. Existing officer override behavior remains intact.
- Marking a linked role as part of the team email audience remains a role-management operation and requires `CONFIGURE_ROLES`, not merely `EMAIL_PORTAL`.
- Client-side hiding is never an authorization boundary. Every email procedure starts with the explicit control-permission check.
- Recipient addresses and personalization snapshots are PII. They are returned only to `EMAIL_PORTAL` callers, never included in Discord logs, and never logged as provider request payloads.
- Template authors are trusted organizational administrators, but stored template source is still treated as operationally unsafe input. It cannot access arbitrary modules, Node globals, process environment, filesystem, database, network, dynamic code evaluation, or application APIs.
- The portal test-send procedure accepts no recipient field. The deepest `@forge/email` provider boundary resolves and enforces exactly `directors@knighthacks.org`.

## Architecture / data flow

### Ownership

- `apps/blade`
  - Owns the `/admin/email` server route, admin navigation integration, and Blade-specific Templates, Compose, and Sends components.
  - Uses server tRPC reads for initial state and focused client components/hooks for editing, previews, mutations, and polling.
  - Does not query recipient tables, compile templates, or call Listmonk directly.
- `packages/api`
  - Adds an `emailRouter` and owns template lifecycle, audience resolution, preview creation, confirmation, cancellation, send state transitions, retention cleanup, and Listmonk orchestration.
  - Keeps recipient queries and workflow logic near the email router/workflow; it does not put product queries in `@forge/db`.
  - Exposes one reusable server workflow for cron processing rather than duplicating lifecycle logic in `apps/cron`.
- `packages/db`
  - Owns the new Drizzle tables, relations, indexes, and migration only.
- `packages/validators`
  - Owns reusable template, audience, preview, send, schedule, and role-configuration schemas.
- `packages/email`
  - Owns the typed Listmonk gateway, explicit delivery-mode guard, safe template parser/compiler, React Email component registry, merge/conditional serialization, and provider fakes.
  - Replaces the unavailable/deprecated `@maloma/listmonk` dependency with the direct typed HTTP boundary already established on production `main` in commit `59c629a1`; implementation must reconcile rather than duplicate that change.
- `apps/cron`
  - Registers small scheduled entry points for due-send processing, Listmonk reconciliation, expired-draft cleanup, and 90-day recipient-snapshot cleanup.

No new workspace package is introduced.

### Template model and compilation

Two source kinds compile into one immutable published artifact:

1. `code`: a constrained, declarative TSX surface.
2. `visual`: React Email Editor JSON.

Code templates use an allowlisted React Email component registry plus Forge-owned `Merge`, `When`, and `Each` components. The TSX parser:

- permits imports only from the documented virtual template module and approved React Email components;
- permits JSX structure, literals, static style objects, and the supported personalization components;
- rejects dynamic imports, arbitrary function calls, computed global access, `eval`, `Function`, event handlers, `dangerouslySetInnerHTML`, Node/browser globals, and unbounded JavaScript control flow;
- enforces source-size, AST-node, nesting, and repeated-content limits; and
- interprets the validated AST into an internal email document instead of executing administrator source with `eval`, `vm`, `tsx`, or a general JavaScript runtime.

Visual templates use a custom merge-field extension and serialize into the same internal email document. The React Email Editor's stored JSON is the editable source of truth; exported HTML is not the editable source.

Publishing:

1. Validates and normalizes source.
2. Builds the internal document.
3. Derives the personalization contract from `Merge`, `When`, and `Each`.
4. Renders representative HTML and plain text.
5. Converts personalization nodes into Listmonk subscriber/campaign template expressions.
6. Rejects invalid output or unsupported fields.
7. Stores source, compiled HTML, compiled plain text, contract, checksum, and immutable published revision.

Scheduled and immediate sends reference an immutable published revision and also snapshot their final compiled content.

### Canonical personalization fields

Audience resolvers produce a canonical, versioned attribute envelope rather than exposing database rows:

- `recipient.email`
- `recipient.name`
- `recipient.firstName`
- `member.graduationYear`
- `hackathon.name`
- `hackathon.displayName`
- `hacker.status`
- `team.roleNames`

`recipient.*` uses deterministic precedence: a matching `Member` profile is authoritative over a `Hacker` profile; remaining hacker duplicates use a deterministic stable row order. Conflicting source values are reported in preview metadata.

The template contract records each field's type, scope, required state, and fallback. Preview calculates field coverage against the selected snapshot. Confirmation is rejected when any required field lacks complete coverage and no fallback exists.

New canonical fields require a developer change only when new application data or resolver semantics are introduced. Administrators can otherwise author new templates without code changes.

### Audience definition and resolution

V1 stores a versioned, validated union definition:

```ts
type AudienceDefinition = {
  version: 1;
  include: Array<
    | { kind: "current_members" }
    | { kind: "alumni" }
    | { kind: "team_members" }
    | { kind: "hackathon"; hackathonId: string; statuses?: HackerStatus[] }
  >;
};
```

- Current members: `Member.gradDate >= CURRENT_DATE`.
- Alumni: `Member.gradDate < CURRENT_DATE`.
- Team members: `Member` rows whose linked user has at least one `Roles.emailAudienceEnabled = true` assignment.
- Role-assigned users without a `Member` profile are excluded with a visible warning; nullable Discord OAuth email is not used as an authoritative contact address.
- Hackathon audiences join `HackerAttendee` to `Hacker` using stable `Hackathon.id`; `displayName` is presentation only.
- An omitted hackathon status list means all attendees for that hackathon. Otherwise the list is validated against the canonical hacker-status enum.
- Multiple sources are unioned.
- Email comparison uses `trim()` plus case folding only. It does not remove dots or plus tags.
- Each canonical recipient retains all match reasons for preview/audit.
- Raw SQL, raw identifiers, and client-provided query fragments are never accepted.

### Preview and confirmation

`previewSend` is read-only with respect to email delivery and Listmonk mutation. It:

1. Validates content, subject, schedule, and audience definition.
2. Resolves recipients and match reasons.
3. Excludes invalid addresses.
4. Deduplicates normalized addresses.
5. Reads Listmonk subscriber state in bounded server-generated query batches to identify blocklisted/unsubscribed recipients.
6. Calculates personalization coverage and aggregate counts.
7. Stores or refreshes a draft send and its recipient snapshot transactionally.
8. Returns a 15-minute preview version, final unique count, exclusions, coverage, overlap counts, and a paginated sample.

The UI submits `sendId`, `previewVersion`, and the displayed expected count to `confirmSend`. Confirmation fails if the preview expired, source/audience/schedule changed, hashes differ, status is no longer draft, or the expected count does not match. A successful transaction freezes the snapshot and moves the send to `queued` or `scheduled`.

### Send lifecycle

Forge send states are:

```txt
draft → queued → syncing → scheduled|running → completed
                     ↘ failed
draft|scheduled → cancelled
failed → queued (explicit safe retry)
```

- Immediate sends enter `queued`.
- Future sends enter `scheduled`; provider preparation may happen early, but a final suppression-only reconciliation occurs immediately before starting.
- No newly matching recipient is added after confirmation.
- Newly blocklisted/unsubscribed recipients are removed during final reconciliation and aggregate counts are updated.
- A lease (`lockedAt`) and compare-and-set transition prevent two workers from processing the same send.
- Provider-management failures use bounded exponential backoff with at most five automatic attempts.
- Listmonk handles SMTP/message-level retries. Forge never restarts or recreates a campaign merely because individual SMTP deliveries failed.
- Each send carries a stable `forge-send:<uuid>` Listmonk tag. Before retrying list or campaign creation, Forge searches for and adopts an existing tagged object.
- After an ambiguous create/status timeout, Forge reads provider state before deciding to retry.
- Once a Listmonk campaign may have started, Forge never invokes a direct resend path.
- Scheduled cancellation changes the Listmonk campaign back to a non-running state where supported and marks the Forge send cancelled. V1 does not promise cancellation after delivery begins.
- A reconciliation job polls nonterminal Listmonk campaigns and records recipient totals, sent totals, bounces, status, and safe error summaries.

Each send uses a tagged private Listmonk list so its frozen audience is explicit. Subscriber attributes used for recipient-specific snapshot values are namespaced by the Forge send UUID so concurrent scheduled sends cannot overwrite one another's personalization. Those namespaced attributes are eligible for the same 90-day cleanup as the local recipient snapshot.

Any Listmonk subscriber that is globally blocklisted or has an unsubscribed Knight Hacks list membership is excluded conservatively from portal sends. The existing MLH consent field is never interpreted as Knight Hacks consent.

### Environment-derived delivery policy

There is no deployment-facing email delivery mode flag. Runtime behavior is derived from the standard `NODE_ENV`, preventing a stale email-specific flag from accidentally leaving production in a test-only state:

- `production`: approved portal audiences and existing transactional behavior use Listmonk.
- `development`: the directors-only test action remains available, and live portal campaigns are restricted to the enabled team roster.
- `test`: the default gateway is an in-memory fake with no network transport.

The development exception is enforced independently at the UI, preview/confirmation API, delivery-time current-role recheck, and provider campaign/status boundary. The stored audience must be exactly `team_members`, every retained recipient must still have an enabled team role, and the provider request must carry the server-issued team scope. Automated tests fail if they reach an unmocked network gateway.

Because Next forces `next dev` processes to use the development environment, the existing `BLADE_E2E_AUTH` test-harness marker selects the same fake provider for the synthetic Playwright server. Production policy is resolved first, so this test-only marker cannot alter production delivery.

### Dependencies and environment

The implementation is expected to add or relocate these explicit dependencies:

- `@react-email/editor` for visual template editing;
- `@react-email/components` and `@react-email/render` in `@forge/email` for the supported component registry and rendering;
- `@monaco-editor/react` plus `monaco-editor`, dynamically loaded only in the Blade code-template editor; and
- the existing workspace TypeScript compiler as a runtime parser inside `@forge/email`, without executing compiled output.

`@maloma/listmonk` is removed after the direct HTTP gateway is ported/reconciled.

Environment changes:

- add `LISTMONK_CAMPAIGN_TEMPLATE_ID` for the approved pass-through Listmonk campaign shell;
- retain existing Listmonk URL, credential, token, and sender settings; and
- document that production rollout must provision and verify the pass-through campaign template.

The concrete dependency versions must be compatible with the repository's React 19, Next 16, TypeScript, Node, and pnpm constraints and are locked during implementation.

## tRPC/API behavior

Register `emailRouter` in `packages/api/src/root.ts`. Browser-facing procedures use `permProcedure` plus `permissions.controlPerms.or(["EMAIL_PORTAL"], ctx)`.

Proposed procedures:

- `email.listTemplates`
- `email.getTemplate`
- `email.saveTemplateDraft`
- `email.previewTemplate`
- `email.publishTemplate`
- `email.duplicateTemplate`
- `email.archiveTemplate`
- `email.listAudienceOptions`
- `email.previewSend`
- `email.confirmSend`
- `email.sendTest`
- `email.listSends`
- `email.getSend`
- `email.cancelSend`
- `email.retrySend`

Role configuration extends the existing roles router with `roles.updateEmailAudience`.

Requirements:

- Read procedures are paginated and bounded.
- Mutations return canonical saved state, not optimistic success before the transaction/provider boundary confirms its step.
- `sendTest` accepts template/content/sample-data input but no address.
- `retrySend` is permitted only for locally failed, provider-safe states; it cannot resend a running or possibly-started campaign.
- Provider errors are translated into safe `TRPCError` messages; credentials, payloads, recipient arrays, and raw Listmonk responses are not returned.
- Procedures and validators include concise descriptions suitable for future generated tRPC/LLM API context.
- Cron processing is not exposed as a browser-callable public procedure.
- No REST endpoint is added for ordinary portal business logic.

## Validation

Reusable Zod schemas in `@forge/validators` cover:

- template name, source kind, source, revision, preview, publish, archive, and duplicate inputs;
- the versioned audience discriminated union;
- hacker status values from `@forge/consts`;
- subject, plain-text content, schedule timestamp, timezone-safe ISO serialization, and confirmation version/count;
- send status, pagination, filters, and safe retry/cancel inputs;
- role email-audience configuration; and
- canonical personalization keys, fallback types, and sample preview data.

Validation rules include:

- template names are trimmed, bounded, and unique among active templates;
- subjects and source/compiled sizes are bounded;
- schedules cannot be in the past after a small clock-skew allowance;
- source kind and source payload must match;
- code AST depth/node count and `Each` expansion are bounded;
- only registered component names, props, merge keys, operators, and field types are accepted;
- compiled HTML and text must be nonempty and must not retain unresolved internal markers;
- email normalization is centralized and deterministic;
- preview confirmation requires an unexpired matching version/hash/count; and
- all status transitions are server-owned rather than caller-provided arbitrary strings.

The exact safe size/node ceilings are constants with tests and may be tightened without changing stored valid published revisions.

## Data / migration / compatibility

### Proposed schema

- `EmailTemplate`
  - identity, unique normalized name, source kind, archived timestamp, creator/updater, and timestamps.
- `EmailTemplateRevision`
  - template ID, monotonically increasing version, draft/published/superseded state, code or visual source, compiled HTML/text, personalization contract, checksum, actor, and publication timestamps.
  - Published rows are immutable.
- `EmailSend`
  - subject, template revision or plain-text source, compiled content snapshot, audience definition/version/hash, preview version/expiry, aggregate counts, state, schedule, Listmonk list/campaign IDs, stable provider tag, retry lease/count/error, actor, and lifecycle timestamps.
- `EmailSendRecipient`
  - send ID, normalized address, display fields, versioned personalization attributes, match reasons, suppression/exclusion state, and optional Listmonk subscriber ID.
  - Unique on `(sendId, normalizedEmail)`.
- `EmailSendEvent`
  - append-only state/audit events with actor when human-triggered, safe structured metadata, and timestamp.
- `Roles.emailAudienceEnabled`
  - non-null boolean defaulting false and editable in role management.

Multi-table preview replacement, confirmation, publish, cancellation, and state transitions use database transactions where consistency requires.

### Migration and rollout

- Generate and commit a Drizzle migration; do not use schema push as the production artifact.
- Backfill `Roles.emailAudienceEnabled = true` for role names currently in `TEAM.CLUB_ROSTER_ROLE_NAMES`, then make the database flag authoritative for Email Portal.
- Do not alter or delete the existing issue `Template` table; email tables use distinct names.
- Existing transactional hackathon template fields and email behavior remain compatible.
- Port/reconcile production main's direct Listmonk client before removing the deprecated SDK.
- Verify migrations, permission gating, fake-provider E2E, Listmonk API compatibility, pass-through template rendering, unsubscribe behavior, and directors-only portal test send before production deployment.
- Exercise the development campaign flow only with the server-enforced team audience.
- Deploy production only after the artifact bundle, migration, environment, Listmonk configuration, and smoke-test evidence are approved.

Rollback:

- Stop the email cron entries.
- Roll back application routing/navigation while leaving additive tables and the additive role flag in place.
- Revoke or rotate the Listmonk API token if provider mutation must be stopped independently of the application rollback.
- Do not drop tables containing template/history data during an operational rollback.

### Retention

- Template source/revisions, compiled artifacts, send content snapshots, aggregate counts, state history, actor metadata, and provider identifiers are retained indefinitely unless a later policy changes.
- Recipient-level `EmailSendRecipient` rows are deleted 90 days after a send reaches `completed`, `cancelled`, or terminal `failed`.
- Expired unconfirmed draft previews are deleted on a shorter scheduled cleanup.
- Cleanup preserves aggregate counts and append-only event metadata without recipient addresses or personalization.
- Logs use send/template IDs and aggregate counts, never recipient arrays or message bodies.

## Discord integration

- The feature does not send Discord messages, create threads, assign roles, or change Discord permission bits.
- Existing linked Discord roles remain the identity/source for `Roles`; `emailAudienceEnabled` is Blade-owned classification metadata and must survive Discord role sync.
- Users with `CONFIGURE_ROLES` can mark a linked role as included in the team email audience.
- Team audience membership continues to come from synced `Permissions` assignments, but recipients must have a `Member` profile for the authoritative email address.
- Email recipient PII and content are not written to Discord audit channels. Coordinate any generic mutation logging integration with the concurrent `reforge/logging` work rather than creating a competing logger.

## Configurability review

Would this require a developer change next year?

- Answer: Routine use and yearly roster/hackathon changes must not require a developer change.
- Linked roles are marked for the team audience in Blade instead of maintaining a yearly email-specific name list.
- Hackathons and their display names come from database configuration.
- Hacker statuses come from the canonical shared enum.
- Administrators create and publish templates, choose fields/fallbacks, and build sends in Blade.
- Infrastructure changes—new provider credentials, the Listmonk campaign shell, or introducing a brand-new canonical profile field—still require developer/deployment work because they change a security or application-data contract.

## React / frontend constraints

- `/admin/email/page.tsx` remains a thin server component responsible for auth, the `EMAIL_PORTAL` gate, stable initial reads, and `HydrateClient`.
- Add Email Portal to the shared admin-access calculation, layout authorization, navigation model, active-route typing, desktop navigation, and mobile navigation. An `EMAIL_PORTAL`-only user must be able to enter the admin shell.
- Compose, Templates, and Sends use URL-persisted tabs/workspace state, with Compose first and the default landing tab.
- Compose state is stored in a versioned, validated local-storage record with a seven-day lifetime. It includes subject, content mode/body/template revision, audience choices, manual deselections, and schedule fields; invalid/expired records are discarded, and successful confirmation clears the record.
- Compose resolves the selected groups into a compact searchable recipient list. Eligible recipients start checked; manually unchecked normalized emails are included in the preview hash, excluded before personalization coverage and snapshot persistence, and recorded only as an aggregate manual-exclusion count.
- Blade-specific composed components live under `apps/blade/src/app/_components/admin/email`.
- Focused hooks encapsulate template drafts, debounced preview compilation, audience preview, confirmation, and send-status polling.
- The Monaco editor is client-only and dynamically loaded. The page itself never becomes a client component.
- Visual and code template modes are distinct sources; arbitrary code templates are not promised to round-trip through the visual editor.
- Use full-width admin workspace composition, raised `bg-card/95` top-level panels, darker `bg-background/60` inset rows, bounded tables, existing tokens, Lucide icons, visible labels, and no nested top-level cards.
- The composer keeps continuously referenced content/preview information visible without defaulting to a fixed one-third settings rail. Bounded creation/settings use dialogs or mobile-safe drawers.
- The final confirmation dialog gives the unique recipient count primary visual weight and lists duplicates, suppressions, manual deselections, invalid addresses, and missing-field blockers.
- Loading, empty, draft, compiling, preview-ready, scheduled, running, completed, cancelled, retryable failure, and terminal failure states are explicit and accessible.
- At 320px there is no document-level horizontal overflow. Code and data surfaces use labeled internal scroll regions, 44px touch targets, and viewport-safe dialogs.
- Pending mutations disable duplicate actions; success closes bounded overlays/toasts and invalidates relevant data; failures preserve drafts and show safe actionable messages.

## Testing / verification strategy

### Unit and package integration

- `@forge/email`
  - accepted declarative TSX and visual-document compilation;
  - rejection of arbitrary imports, globals, dynamic execution, dangerous props, unsupported nodes, oversized/deep ASTs, and unresolved markers;
  - merge/conditional/repeated-content serialization and HTML/plain-text snapshots;
  - delivery-mode matrix and deepest-boundary directors-only portal enforcement;
  - direct Listmonk gateway request/response/error contracts with a fake transport.
- `@forge/validators`
  - audience union, statuses, source-kind discrimination, schedules, previews, confirmation versions/counts, and transition inputs.
- `@forge/api`
  - 401/403 and officer override behavior;
  - audience source semantics, deterministic precedence, case-insensitive deduplication, match reasons, invalid exclusions, and field coverage;
  - role-assigned users without Member profiles are excluded;
  - preview expiry/hash/count checks and transactional snapshot freezing;
  - publish immutability;
  - state-machine transitions, leases, bounded retry, ambiguous-timeout adoption, cancellation, and reconciliation;
  - no new recipients after confirmation and late suppression removal;
  - 90-day recipient cleanup preserves aggregate history.
- `@forge/db`
  - expected columns, indexes, uniqueness, references, defaults, and migration/backfill behavior.

### Blade

- Component tests cover access-filtered navigation, URL tabs, template mode separation, preview states, audience counts/exclusions, confirmation dialog copy/count, disabled actions, cancellation, and failure recovery.
- Playwright covers one high-value flow using synthetic `example.test` recipients and the fake provider: create/publish template → compose → preview → confirm immediate or scheduled send → observe status/cancel.
- A separate negative E2E proves an `EMAIL_PORTAL`-only user can access the portal but an unauthorized user cannot.
- Automated suites never call real Listmonk and never use copied real recipient addresses. A future separately authorized live automated integration check, if introduced, may target only `donotreply@knighthacks.org`.

### Required commands

Use repository-pinned pnpm `9.12.1`. Run narrow checks while iterating, then:

```bash
pnpm --filter=@forge/email test
pnpm --filter=@forge/email typecheck
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db test
pnpm --filter=@forge/db typecheck
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/blade analyze:react
pnpm analyze:react:changed
pnpm db:generate
pnpm verify:precommit
```

Run the targeted Playwright project against an alternate Blade port because the other worktree owns `3000`; do not reuse the repository's `3100` Playwright default if occupied.

## Open questions

- Human approval of this SRD explicitly authorizes the proposed additive schema/migration, role classification field/backfill, dependency changes, environment variables, email-provider behavior, cron jobs, and phased deployment plan.
- Before production rollout, an integration spike must verify the deployed Listmonk version's campaign/list/subscriber APIs, namespaced attribute rendering, status transitions, and unsubscribe semantics.
- The React Email Editor and Monaco dependency versions must be verified against the repository's current React/Next build during the dependency spike; if incompatible, return to SRD review rather than silently replacing the approved editor.
