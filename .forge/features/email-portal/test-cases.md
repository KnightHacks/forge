# Email Portal Test Cases

Status: Approved

## Scope

These cases prove the approved Email Portal product and system contracts:

- access and navigation;
- code and visual template lifecycle;
- safe declarative TSX parsing and compilation;
- mixed-profile personalization coverage;
- current-member, alumni, configurable team, hackathon, and status audiences;
- deterministic deduplication and exact pre-send counts;
- preview/version/snapshot behavior;
- immediate and scheduled Listmonk campaign lifecycle;
- cancellation, retry, idempotency, reconciliation, and retention;
- explicit non-production delivery modes and the directors-only portal test boundary;
- additive migration/backfill behavior; and
- responsive loading, success, failure, and confirmation UX.

The cases do not test SMTP itself, Listmonk internals, arbitrary SQL, existing transactional hackathon-email content, or production delivery to a real audience. Automated tests use a fake provider and synthetic `example.test` addresses only.

## Test placement plan

- `packages/email/src/tests/*` — Vitest unit/contract tests for template parsing/rendering, personalization serialization, the Listmonk gateway, provider idempotency helpers, and delivery-mode enforcement. Add the package's minimal `test`/`test:watch` scripts.
- `packages/validators/src/tests/email.test.ts` — Vitest validation cases.
- `packages/api/src/tests/email/*` — Vitest integration tests for access, template lifecycle, audience resolution, preview/confirmation, send state, retry/reconciliation, and retention.
- `packages/db/src/tests/email-portal-schema.test.ts` and `email-portal-migration.test.ts` — schema/index/default/backfill and migration artifact contracts.
- `apps/blade/src/tests/admin/email-*.test.tsx` — Blade component/navigation/state/confirmation tests.
- `apps/blade/src/tests/e2e/email-portal.spec.ts` — one critical fake-provider workflow plus access regression coverage.

Expected commands:

```bash
pnpm --filter=@forge/email test
pnpm --filter=@forge/validators test
pnpm --filter=@forge/api test
pnpm --filter=@forge/db test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e -- email-portal.spec.ts
```

## Test cases

### TC-001: Authorized Email Portal entry

Setup:

- A logged-in user has `EMAIL_PORTAL` and no unrelated admin capability.

Action:

- The user opens Blade's admin area and navigates directly to `/admin/email`.

Expected observations:

- Email appears in desktop and mobile admin navigation.
- The admin shell does not redirect the user away.
- Templates, Compose, and Sends are available.
- Direct server reads succeed without requiring another permission.

### TC-002: Code-template draft and preview

Setup:

- An email administrator starts a new code template.
- The source uses supported React Email layout components, static styles, `Merge`, `When`, and `Each`.

Action:

- The administrator saves the draft and requests a preview with representative sample data.

Expected observations:

- The draft is saved as a code template.
- The preview contains email-ready HTML and a meaningful plain-text alternative.
- Merge and conditional content resolve for the selected sample.
- The returned contract lists every referenced personalization field, its type, required state, and fallback.
- No provider request is made.

### TC-003: Visual-template draft and preview

Setup:

- An email administrator creates a visual template containing rich text, a multi-column section, a button, and a custom merge-field node.

Action:

- The administrator saves and previews it.

Expected observations:

- The editable visual document is preserved.
- HTML and plain text are generated from the saved document.
- The custom merge field appears in the derived personalization contract.
- Reopening the template restores the visual document rather than treating generated HTML as the editable source.

### TC-004: Publish and immutable revision

Setup:

- A valid template draft exists.

Action:

- The administrator publishes it, schedules a send using that revision, then edits and republishes the template.

Expected observations:

- Publishing creates a numbered immutable revision.
- The first scheduled send continues referencing the original revision and content snapshot.
- The newly published revision is available to new sends.
- The old published revision cannot be mutated in place.

### TC-005: Template list, duplicate, and archive

Setup:

- Active, archived, code, and visual templates exist.

Action:

- The administrator lists templates, duplicates an active template, and archives another.

Expected observations:

- Active templates are listed with kind, revision, publication state, and updated metadata.
- The duplicate receives a distinct identity and editable draft.
- The archived template is absent from normal composer choices but remains visible in archived/history views.
- Existing sends that reference the archived template remain readable.

### TC-006: Personalization coverage with fallback

Setup:

- A template requires `recipient.firstName` and optionally uses `hacker.status` with a fallback.
- The chosen audience contains members and hackers, and at least one record lacks a first name.

Action:

- The administrator previews the send.

Expected observations:

- Coverage is reported separately for both fields.
- The optional hacker field is safe because it has a fallback.
- The missing required first name is a visible blocker.
- Adding a first-name fallback or changing the audience clears the blocker and produces a new preview version.

### TC-010: Current-member and alumni semantics

Setup:

- Synthetic members have graduation dates before, equal to, and after the database current date.

Action:

- The administrator previews Current members and Alumni separately.

Expected observations:

- Current members contain the equal-date and future-date members.
- Alumni contain only past-date members.
- No recipient appears in both results for the same preview.
- Counts and match reasons identify the selected source.

### TC-011: Configurable team audience

Setup:

- Two linked roles exist; only one has team email-audience classification enabled.
- Assigned synthetic users include one with a Member profile and one without a Member profile.

Action:

- A `CONFIGURE_ROLES` administrator changes the role classification, and an email administrator previews Team members.

Expected observations:

- The classification persists independently of Discord role sync.
- Members assigned to enabled roles are included.
- The role-assigned user without a Member profile is excluded with a warning.
- The system does not fall back to the user's Discord OAuth email.
- Disabling the role changes a newly generated preview without requiring a code change.

### TC-012: Hackathon and status audiences

Setup:

- Two hackathons have distinct stable IDs and human-facing display names.
- Synthetic hackers cover every supported status.

Action:

- The administrator opens audience choices and previews all hackers, then selected statuses for one hackathon.

Expected observations:

- Choices are labeled with the hackathon display name but submit the stable ID.
- The all-hackers choice includes every attendee for that hackathon.
- Each status choice contains only attendees with that status and hackathon ID.
- Hackers from the other hackathon are not included.
- Denied and withdrawn choices are available and visibly identifiable.

### TC-013: Union, normalization, and deduplication

Setup:

- The same person matches member, team, and hackathon groups.
- Source rows contain address casing and surrounding-whitespace variations.
- Separate plus-tagged and dotted addresses also exist.

Action:

- The administrator selects the overlapping groups and previews the send.

Expected observations:

- Trim/case variants collapse into one canonical recipient.
- All matching reasons remain visible for that recipient.
- Plus tags and dotted variants are not rewritten or collapsed beyond trim/case normalization.
- The preview reports raw matches, duplicates collapsed, and the final unique count.

### TC-014: Deterministic mixed-profile precedence

Setup:

- A normalized address matches a Member profile and more than one Hacker row with conflicting names.

Action:

- The audience is previewed more than once.

Expected observations:

- The Member name is selected deterministically.
- All source matches remain recorded.
- The conflict is reported in preview metadata.
- Repeated previews produce the same canonical attributes and checksum while source data is unchanged.

### TC-015: Invalid and suppressed exclusions

Setup:

- A resolved audience contains valid, invalid, globally blocklisted, and unsubscribed synthetic addresses.
- The fake Listmonk gateway returns the corresponding subscriber states.

Action:

- The administrator previews the send.

Expected observations:

- Invalid, blocklisted, and unsubscribed records do not contribute to the final recipient count.
- Exclusion counts are broken down by reason.
- The final count equals the stored eligible recipient snapshot.
- Preview performs read-only provider queries and no Listmonk mutation.
- The MLH consent field does not include or exclude a recipient.

### TC-016: Versioned preview refresh

Setup:

- A valid send preview exists.

Action:

- The administrator changes subject, content, schedule, audience, or fallback data and requests another preview.

Expected observations:

- The new preview has a different version/hash where the effective send changed.
- Its snapshot and counts replace the unconfirmed draft view transactionally.
- The earlier version cannot be confirmed.

### TC-017: Recipient inspection and manual deselection

Setup:

- Two or more selected audience groups resolve to overlapping eligible synthetic recipients.

Action:

- The administrator searches the recipient rail, deselects one person, and previews the send.

Expected observations:

- Every eligible recipient starts checked.
- The compact recipient rail shows each person's name and normalized email.
- The live selected count decreases when a recipient is unchecked.
- The unchecked recipient is absent from personalization coverage and the frozen recipient snapshot.
- The preview and confirmation dialog report the manual deselection and exact final count.
- Changing groups preserves a deselection only while that normalized email remains in the resolved pool.

### TC-020: Plain-text composition

Setup:

- An administrator enters a subject and plain-text body without selecting a template.

Action:

- The administrator previews and confirms the send.

Expected observations:

- The preview preserves meaningful line breaks.
- No HTML-only requirement is introduced.
- Audience, count, scheduling, suppression, audit, and delivery behavior match a templated send.

### TC-021: Exact confirmation dialog

Setup:

- A valid preview contains overlaps and exclusions.

Action:

- The administrator opens the final confirmation dialog.

Expected observations:

- The final unique recipient count is the primary confirmation value.
- Duplicate, invalid, suppressed, and missing-field counts are visible.
- The action clearly distinguishes Send now from the selected scheduled time.
- Confirm submits the displayed count and preview version.
- Test sending is optional and not a prerequisite.

### TC-022: Immediate campaign handoff

Setup:

- A valid preview is confirmed for immediate delivery in fake mode.

Action:

- The send worker processes the queued send.

Expected observations:

- The send progresses through queued/syncing/running to a reconciled terminal state.
- The fake gateway records one tagged private list and one tagged Listmonk campaign for the send.
- The campaign uses the frozen recipients, content snapshot, plain-text alternative, subject, and namespaced attributes.
- A send event records each meaningful transition without recipient arrays or message bodies.

### TC-023: Scheduled audience freeze and late suppression

Setup:

- A send is confirmed for a future time with recipients A and B.
- After confirmation, C newly matches the audience and B becomes suppressed.

Action:

- Final reconciliation and scheduled delivery occur.

Expected observations:

- A remains in the send.
- B is removed and aggregate suppression/final counts are updated.
- C is not added.
- The delivery content and template revision remain the confirmed snapshots.

### TC-024: Scheduled cancellation

Setup:

- A confirmed send is scheduled and has not begun delivery.

Action:

- The administrator cancels it.

Expected observations:

- The Forge send becomes cancelled and cannot later be processed as due.
- Any prepared Listmonk campaign is returned to a non-running state where necessary.
- The sends view shows who cancelled it and when.
- Repeated cancellation does not create provider mutations or conflicting history.

### TC-025: Delivery status reconciliation

Setup:

- The fake provider exposes scheduled, running, completed, sent-count, bounce-count, and failed states.

Action:

- Reconciliation runs and the administrator opens send details.

Expected observations:

- Forge reflects the provider's current nonterminal or terminal state.
- Sent, total, and bounce aggregates are visible.
- Provider credentials, raw payloads, and unsafe raw errors are not exposed.
- Reconciliation is idempotent when provider state is unchanged.

### TC-026: Retryable provider-management failure

Setup:

- List creation or campaign preparation fails before the campaign can start.

Action:

- Automatic retry processing runs until success or the fifth failed attempt.

Expected observations:

- Attempts are leased so concurrent workers do not process the send twice.
- Backoff and attempt count advance after each safe failure.
- Success clears the safe error and continues the lifecycle.
- Five failures produce a visible terminal/retryable failure rather than an infinite loop.
- SMTP recipient failure does not cause Forge to recreate or resend the campaign.

### TC-027: Ambiguous timeout adopts provider state

Setup:

- The fake gateway creates a tagged Listmonk list or campaign but returns an ambiguous timeout to Forge.

Action:

- The worker retries the operation.

Expected observations:

- Forge searches by the stable `forge-send:<uuid>` tag.
- The existing provider object is adopted.
- No second list or campaign is created.
- If provider state already reflects the requested transition, the operation is treated as successful.

### TC-028: Safe explicit retry

Setup:

- One send failed before provider start; another is running or may already have started.

Action:

- The administrator requests retry for each send.

Expected observations:

- The pre-start failure returns to queued and retains its stable provider identity.
- The running/ambiguous-start send rejects retry with a safe conflict message.
- No direct transactional resend path is invoked.

### TC-029: Recipient retention cleanup

Setup:

- Terminal sends exist at 89 days, exactly 90 days, and more than 90 days after completion, plus a nonterminal send older than 90 days.

Action:

- Recipient cleanup runs at the defined boundary.

Expected observations:

- Eligible recipient snapshot rows at or beyond the retention boundary are removed according to the documented timestamp comparison.
- The 89-day and nonterminal snapshots remain.
- Templates, send content snapshots, aggregate counts, state events, actors, and provider identifiers remain.
- Cleanup is idempotent and logs only IDs/counts.

### TC-030: Delivery mode is fail closed

Setup:

- The provider gateway is instrumented to detect HTTP attempts.

Action:

- Campaign, retry, cron, and transactional provider operations are attempted in `disabled`.

Expected observations:

- Every mutation fails before HTTP.
- No operation is silently redirected to the directors list or another address.
- A safe disabled-delivery error is recorded or returned.

### TC-031: Fake mode never reaches the network

Setup:

- Local or automated execution uses `fake`.

Action:

- Template test, immediate send, scheduled send, retry, and reconciliation paths run.

Expected observations:

- Only the injected fake gateway records operations.
- No network client is constructed or called.
- Synthetic fixture addresses may be counted and rendered but receive no email.

### TC-032: Directors-only portal test send

Setup:

- Delivery mode is `test`.
- A valid template or plain-text test payload exists.

Action:

- The dedicated test-send procedure is invoked.

Expected observations:

- The procedure exposes no recipient input.
- Exactly one provider request targets `directors@knighthacks.org`.
- Preview/sample data is rendered without resolving or mutating a bulk audience.
- No bulk schedule or send is created.

### TC-033: Production campaign gateway contract

Setup:

- Delivery mode is `production` and a fake HTTP transport returns representative Listmonk list, subscriber, campaign, and status responses.

Action:

- An eligible campaign handoff and reconciliation run.

Expected observations:

- The typed gateway sends the documented request shapes and parses the documented responses.
- Stable Forge tags and provider IDs are preserved.
- Campaign and subscriber errors become safe typed failures.
- Tests do not require a real Listmonk instance or credential.

### TC-040: Access-policy matrix

Setup:

- Callers are unauthenticated, logged in without `EMAIL_PORTAL`, assigned `EMAIL_PORTAL`, and assigned `IS_OFFICER`.

Action:

- Each caller attempts every email read and mutation category.

Expected observations:

- Unauthenticated calls return `UNAUTHORIZED`.
- Logged-in unauthorized calls return `FORBIDDEN`.
- `EMAIL_PORTAL` and officer callers can perform the documented V1 capabilities.
- Authorization is enforced by the API even if a procedure is invoked without Blade.

### TC-041: Team classification permission

Setup:

- Callers have `EMAIL_PORTAL`, `CONFIGURE_ROLES`, or officer access.

Action:

- Each attempts to update a role's team email-audience classification.

Expected observations:

- `EMAIL_PORTAL` alone is forbidden.
- `CONFIGURE_ROLES` and officer access succeed.
- The change is returned as canonical saved role state.
- Normal Discord role sync does not reset the classification.

### TC-050: Additive schema and migration

Setup:

- The generated migration and Drizzle schema are available.

Action:

- Schema and migration contract tests inspect the email tables, constraints, indexes, defaults, references, and role flag.

Expected observations:

- All approved additive tables and fields exist.
- Published revision/send snapshot relations restrict destructive deletion appropriately.
- Recipient uniqueness is enforced per send.
- pending/retry and retention queries have supporting indexes.
- The existing issue `Template` table is unchanged.
- Existing transactional hackathon email fields remain present.

### TC-051: Team-role backfill and rollback safety

Setup:

- A pre-migration database contains roles whose names do and do not match the current roster list.

Action:

- The migration is applied and the application rollback procedure is evaluated.

Expected observations:

- Existing roster-name matches receive `emailAudienceEnabled = true`.
- Other roles receive false.
- Future role-name changes do not silently change the stored classification.
- Disabling delivery and rolling back the application does not require dropping populated email tables.

### TC-060: Blade workspace states and responsiveness

Setup:

- Templates and sends include empty, loading, draft, compiling, scheduled, running, completed, cancelled, retryable-failure, and terminal-failure examples.

Action:

- Components render at desktop and 320px-wide mobile viewports, and the user switches URL-backed tabs.

Expected observations:

- Every state has clear text, status, and available actions.
- URL tab state survives refresh/back-forward navigation.
- The code editor and recipient table scroll internally without document-level horizontal overflow.
- Dialogs stay within the viewport and controls keep accessible labels and touch targets.
- Pending mutations prevent duplicate actions; failures preserve draft input.

### TC-061: Critical synthetic E2E flow

Setup:

- Playwright seeds only synthetic `example.test` recipients, a team-classified role, an `EMAIL_PORTAL` user, and a fake provider.

Action:

- The administrator creates and publishes a code template, composes a scheduled send, previews the audience, confirms the displayed count, observes it in Sends, and cancels it.

Expected observations:

- The complete user path succeeds without direct database or Listmonk interaction from the browser.
- The displayed confirmation count matches the stored unique snapshot.
- The scheduled state and cancellation appear without a full-page client conversion.
- The fake provider records no real network delivery.
- Cleanup removes all synthetic fixtures.

## Negative / regression cases

### TC-NEG-001: Unsafe code-template source is rejected

Setup:

- Code sources independently contain an arbitrary import, dynamic import, `process`, `fetch`, filesystem/database access, `eval`, `Function`, event handler, dangerous raw HTML, unsupported function call, and unbounded JavaScript control flow.

Action:

- Each source is previewed or published.

Expected observations:

- Validation rejects every source with a specific safe source-location error.
- No administrator source executes.
- No network, filesystem, environment, database, or provider side effect occurs.
- The existing valid draft remains recoverable.

### TC-NEG-002: Template complexity and output limits

Setup:

- Sources exceed size, AST-node, nesting, repeated-content, compiled-HTML, or compiled-text limits.

Action:

- Preview or publish is requested.

Expected observations:

- The operation fails with a bounded validation message identifying the violated category.
- The process remains responsive and no revision is published.

### TC-NEG-003: Unsupported personalization contract

Setup:

- A template references an unknown field, incompatible operator/type, unresolved internal marker, or required field without audience coverage/fallback.

Action:

- Preview and publish/confirm are attempted.

Expected observations:

- Unknown/invalid template constructs block preview or publication.
- Audience-specific coverage failures block confirmation.
- The confirmation dialog never presents an enabled send action while blockers remain.

### TC-NEG-004: Invalid audience definition

Setup:

- Inputs contain an unknown kind, raw SQL/query fragment, unknown hackathon ID, unsupported status, empty include list, or client-provided database identifier.

Action:

- Audience preview is requested.

Expected observations:

- Validation rejects the input before recipient queries or provider calls.
- No raw query text reaches the database or logs.

### TC-NEG-005: Invalid or stale confirmation

Setup:

- Valid previews are separately expired, superseded, content-modified, audience-modified, already confirmed, or paired with an incorrect expected count.

Action:

- Confirmation is attempted.

Expected observations:

- Every case is rejected with a safe conflict/validation result.
- No send is queued or scheduled.
- No Listmonk mutation occurs.
- The UI requires a fresh preview and displays its new count.

### TC-NEG-006: Invalid schedule

Setup:

- Schedule values are malformed or in the past beyond the clock-skew allowance.

Action:

- Preview or confirmation is requested.

Expected observations:

- Validation rejects the schedule with a timezone-safe message.
- No send or provider object is created.

### TC-NEG-007: Duplicate action protection

Setup:

- Preview, publish, confirm, cancel, and safe-retry mutations are pending.

Action:

- The user double-clicks or repeats the same request.

Expected observations:

- The UI disables duplicate actions while pending.
- Server idempotency/state checks prevent duplicate revisions, campaigns, transitions, and events.

### TC-NEG-008: Test mode rejects all portal-recipient bypasses

Setup:

- Delivery mode is `test`.

Action:

- A caller attempts bulk audience send, scheduled processing, automatic retry, transactional send to another address, mixed-case/whitespace address tricks, multiple recipients, or a direct gateway mutation.

Expected observations:

- Every bypass fails at the deepest provider boundary before HTTP.
- No recipient is silently filtered or rewritten to the directors list.
- The sole accepted live portal operation remains the dedicated one-recipient test send to `directors@knighthacks.org`.

### TC-NEG-009: Unmocked automated provider access fails

Setup:

- An automated test accidentally resolves the real provider gateway or credentials.

Action:

- Any provider operation is attempted.

Expected observations:

- The suite fails immediately before network access.
- The failure identifies the missing fake boundary without printing credentials or recipients.

### TC-NEG-010: Unsafe retry after possible start

Setup:

- Provider state is running, completed, cancelled after partial delivery, or unknown following a start request.

Action:

- Automatic or manual retry is attempted.

Expected observations:

- Forge does not create, start, or directly resend another campaign.
- The send remains in a reviewable safe failure/nonterminal state.
- The UI explains that provider reconciliation is required.

### TC-NEG-011: Provider outage and unsafe response

Setup:

- Listmonk is unavailable, times out, returns malformed JSON, or returns an error containing credentials/recipient data.

Action:

- Preview suppression lookup, preparation, status transition, or reconciliation runs.

Expected observations:

- Preview or delivery fails safely according to its phase.
- User-facing errors and stored safe summaries contain no credential, raw payload, or recipient list.
- The draft/snapshot remains recoverable for a later safe retry.

### TC-NEG-012: PII does not leak to logs or Discord

Setup:

- A send contains multiple synthetic recipient addresses and personalized content.

Action:

- Preview, confirmation, failure, retry, cancellation, reconciliation, and cleanup run with logging/audit enabled.

Expected observations:

- Application and Discord-facing logs contain IDs, actors, states, and aggregate counts only.
- Recipient arrays, individual addresses, personalization, bodies, provider credentials, and raw provider responses are absent.
- No Discord message, role mutation, or thread is produced by Email Portal.

### TC-NEG-013: Archived or invalid template cannot be selected

Setup:

- Templates are archived, draft-only, or have a failed compilation.

Action:

- The composer requests available templates or attempts to confirm a send with one.

Expected observations:

- Only valid published active revisions are selectable.
- A forged reference is rejected server-side.
- Historical sends using an archived revision remain readable.

### TC-NEG-014: Unauthorized recipient-history access

Setup:

- A logged-in user lacks `EMAIL_PORTAL`.

Action:

- The user attempts to call send-detail, preview-sample, or recipient-snapshot procedures directly.

Expected observations:

- Each returns `FORBIDDEN`.
- No PII is returned.

## Open questions

- Human approval of these cases authorizes generation of test files and the smallest missing `@forge/email` Vitest script/harness, but not product implementation.
- The production Listmonk compatibility spike remains a rollout gate and is represented by fake transport contract tests rather than live automated email delivery.
