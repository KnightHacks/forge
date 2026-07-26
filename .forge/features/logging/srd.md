# Admin Action Logging SRD

Status: Approved

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Create a durable, queryable audit capability for human actions authorized
through Forge's role-permission system, with an officer-only Blade read
surface. Audit history is append-only and retained indefinitely. Capture uses
explicit typed domain writes with middleware-supported actor context and
coverage enforcement.

## Relevant principles

- [Sharing and package boundaries](../../../docs/agentic-development/forge-engineering-principles.md#sharing-and-package-boundaries)
- [tRPC and API principles](../../../docs/agentic-development/forge-engineering-principles.md#trpc-and-api-principles)
- [Database principles](../../../docs/agentic-development/forge-engineering-principles.md#database-principles)
- [Auth, Discord, and permission principles](../../../docs/agentic-development/forge-engineering-principles.md#auth-discord-and-permission-principles)
- [Security and data hygiene](../../../docs/agentic-development/forge-engineering-principles.md#security-and-data-hygiene)

## Access policy

- Unauthenticated users must not read audit data.
- Logged-in users without effective `IS_OFFICER` permission must not read audit
  data.
- A director-only identity must not read audit data unless that identity also
  has effective `IS_OFFICER` permission.
- The logs page, server read, and every audit query/export boundary must enforce
  `IS_OFFICER`; client-side navigation visibility is not a security boundary.
- Recording is scoped to actions already authorized through the roles
  permission system. Protected-only member/self-service mutations are excluded.
- The required permission for each source action remains unchanged; this
  feature must not broaden who may perform existing admin actions, except for
  the approved officer-escalation safeguards below.
- Adding or removing the `IS_OFFICER` bit from a role requires the actor to
  already have effective `IS_OFFICER`, even if the actor has
  `CONFIGURE_ROLES`.
- Assigning or revoking a role whose effective bitstring includes `IS_OFFICER`
  requires the actor to already have effective `IS_OFFICER`, even if the actor
  has `ASSIGN_ROLES`.

## Architecture / data flow

- The Blade page remains a thin server-first client.
- Audit write/read workflows belong in `@forge/api`.
- Any approved persistence schema and migration belong in `@forge/db`; product
  audit queries do not.
- Reusable audit query/filter contracts belong in `@forge/validators`.
- Capture must preserve the difference between generic procedure execution
  facts and domain-specific business audit facts such as the target and
  meaningful action.
- Every permission-gated procedure must declare one bounded policy:
  `audited`, `excluded`, or `hybrid`. A coverage test fails when a new procedure
  lacks a declaration.
- Middleware supplies trusted authenticated actor/request context and enforces
  the declaration. It must not infer a business action, target, or bulk
  relationship.
- The authoritative service emits a typed action with its domain target and
  allowlisted metadata.
- State-changing DB actions are captured only after successful commit.
  Validation failures, denied requests, and ordinary failed attempts are not
  persisted in v1.
- A database-only action and its audit record share one transaction. An audit
  persistence failure rolls back the business mutation.
- External-provider workflows must represent actual partial outcomes when the
  provider and database cannot commit atomically. They use one durable
  operation ID and append provider/per-target results. A committed internal
  change with an incomplete provider projection is `partial_external`.
- When an external effect could occur before the authoritative DB commit, the
  workflow must first persist a durable operation/intent boundary or be
  reordered. A failure that produces no committed internal or observed
  external effect remains outside the successful admin feed.
- Sensitive administrative reads are explicit audited actions. V1 includes CSV
  exports, resume views, response attachment downloads, and equivalent actions
  approved by the action catalog; ordinary page views are excluded.
- A bulk action is one explicit command/API operation affecting multiple
  records. It has one parent action and directly linked per-target results.
  Timestamp proximity, actor identity, browser activity, or a time window must
  never create or merge a bulk action.

## tRPC/API behavior

- Normal audit writes and reads use tRPC/API-side workflows rather than a new
  internal REST API.
- Officer-only read procedures must apply an explicit `IS_OFFICER` check.
- The capture API must accept normalized actor, action, target, time, and
  outcome data without accepting arbitrary secret-bearing payloads.
- Update payloads include changed field names and only action-specific
  allowlisted before-and-after values. Raw form answers, file contents, signed
  URLs, tokens, credentials, and unrestricted input are prohibited.
- List queries use newest-first cursor pagination and default to the last 30
  days.
- V1 query filters are member, action/domain, date range, actor, target type,
  and outcome.
- The Member filter matches the selected person when they are the actor,
  primary member target, or a linked member target.
- A visible search bar searches actor, action, and target labels plus stable
  IDs.
- Detail queries return structured allowlisted before/after fields and linked
  bulk/provider results.
- V1 exposes no audit-history export procedure.

## Validation

- Audit actions, target types, outcomes, and query/filter inputs require
  bounded validation.
- Each action definition must own a bounded metadata schema and a before/after
  value allowlist. A generic arbitrary metadata bag is not an approved capture
  boundary.
- Validation must prohibit raw form answers, file contents, signed URLs,
  tokens, credentials, and sensitive unrestricted payloads from audit storage.
- The action inventory must define which identifiers and safe display labels
  are available for each covered action.
- Actor role colors must be null or a validated six-digit hex color from the
  server-side role snapshot; clients cannot provide or override them.

## Data / migration / compatibility

- No active persistent audit table exists.
- Persistent history must be append-only from product code, expose no update or
  delete API/UI, and be retained indefinitely.
- A database trigger or equivalent tested database policy must reject
  application-role `UPDATE` and `DELETE` operations against audit records.
  Migration/operational recovery remains an explicitly privileged path outside
  the product.
- Actor and target records store stable IDs plus immutable display snapshots.
  Referential behavior must not cascade-delete audit history; if a live
  reference disappears, the snapshot remains renderable.
- Each actor snapshot also stores the label and color selected by Guild's
  existing role-callout priority rules at action time. Role changes do not
  recolor old audit entries.
- History starts when the migration/feature is deployed. There is no historical
  backfill from Discord or diagnostics.
- Persistence tables and indexes must support the approved cursor, date,
  member, actor, action/domain, target-type, outcome, text-label, and stable-ID
  queries.
- Any shared-package change must document compatibility with current `main`.
- Bulk parent actions and their per-target results require durable explicit
  linkage. They must not depend on inferred sessions or time windows.

## Discord integration

- The current Discord log-channel transport is not the source of truth for this
  proposed queryable audit history.
- Existing Discord notifications remain unchanged during v1 rollout.
- The comprehensive audit stream is not mirrored to Discord. The database is
  the sole source of truth for this feature.
- Actor identity must distinguish the internal auth user ID from the Discord
  user ID; the current event audit path does not do this consistently.

## Configurability review

Would this require a developer change next year?

- Answer: Action coverage will evolve as administrative capabilities evolve.
- A coverage test requires every permission-gated procedure to declare an
  `audited`, `excluded`, or `hybrid` policy. Audited/hybrid procedures reference
  typed action definitions rather than arbitrary strings or metadata.
- Role mutation policy must distinguish ordinary configurable permissions from
  the reserved `IS_OFFICER` escalation rules, at both the role-update and
  assignment/revocation boundaries.

## Candidate action catalog

The second-wave UI/backend cross-check normalized the active admin surface into
62 candidate v1 action keys. During implementation, the alumni-dashboard merge
added seven permission-gated bulletin/image actions, and the unexposed
permission-gated feedback-response deletion was brought into policy coverage.
The resulting v1 catalog contains 70 action keys. These keys describe business
actions rather than individual buttons, pages, or transport calls.

### Analytics and sensitive exports

- `analytics.report.exported`
- `member.directory.exported`
- `event.attendance.exported`
- `event.feedback.exported`
- `form.responses.exported`

### Attendance and member administration

- `attendance.checked_in`
- `attendance.removed`
- `member.dues.granted`
- `member.dues.revoked`
- `member.dues.invalidated_bulk`
- `member.profile.updated`
- `member.profile.deleted`
- `member.profile_picture.replaced`
- `member.profile_picture.removed`
- `member.resume.replaced`
- `member.resume.removed`
- `member.resume.accessed`

### Companies

- `company.updated`
- `company.approved`
- `company.rejected`
- `company.image.replaced`
- `company.image.removed`
- `company.merged`

### Roles and assignments

- `role.linked`
- `role.permissions.updated`
- `role.issue_reminders.updated`
- `role.synced`
- `role.unlinked`
- `role.assignments.granted`
- `role.assignments.revoked`

### Events

- `event.created`
- `event.updated`
- `event.integration.repaired`
- `event.discord_projection.resolved`
- `event.deleted`
- `event.tag.created`
- `event.tag.updated`
- `event.tag.archived`
- `event.feedback_template.updated`
- `event.feedback_question.added`
- `event.feedback_response.deleted`

### Alumni bulletin

- `alumni.bulletin.created`
- `alumni.bulletin.updated`
- `alumni.bulletin.reordered`
- `alumni.bulletin.archived`
- `alumni.bulletin.restored`
- `alumni.bulletin_image.uploaded`
- `alumni.bulletin_image.removed`

### Forms

- `form.created`
- `form.definition.updated`
- `form.settings.updated`
- `form.published`
- `form.archived`
- `form.deleted`
- `form.instruction_attachment.uploaded`
- `form.callback.configured`
- `form.callback.disabled`
- `form.callback.retried`
- `form.response.deleted`
- `form.section.created`
- `form.section.updated`
- `form.response_attachment.accessed`

### Issues

- `issue.tree.created`
- `issue.status.changed`
- `issue.updated`
- `issue.tree.archived`
- `issue.archive_batch.restored`
- `issue.template.created`
- `issue.template.updated`
- `issue.template.disabled`

### Normalization and capture findings

- Duplicate controls share one business key with bounded metadata: for example,
  manual/QR check-in, create/duplicate event, repair/reapply integration,
  publish/republish form, upload/replace media, and all issue-status controls.
- Exports create one sensitive-access event, not one result per exported row.
- Confirming event deletion and retrying provider cleanup share the same
  deletion operation only when joined by a persisted operation ID; otherwise
  they are separate invocations of `event.deleted`.
- Member résumé access cannot be captured accurately today because
  `member.getAdminMember` creates its signed URL during detail-page loading.
  `member.resume.accessed` requires a dedicated click-time procedure or audited
  redirect.
- `form.response_attachment.accessed` is emitted only on the role-gated
  response-reading branch. An owner downloading their own file and a respondent
  viewing published instruction media remain excluded self-service paths.
- Existing-form Save currently calls `form.definition.updated` and then
  `form.settings.updated`. V1 records two precise actions. A later refactor may
  introduce a shared durable operation ID; proximity is never enough.
- Finalizing an instruction upload and later associating it with a form are
  separate committed actions unless explicitly correlated.
- Creating an event inside issue creation is independently committed and may
  survive a failed issue create. It remains `event.created`, not an inferred
  issue child action.
- The server-only `event.deleteEventFeedbackResponse` mutation has no active
  admin UI control, but it is permission-gated and therefore remains covered by
  the explicit `event.feedback_response.deleted` policy.
- Company merge results should be recorded per moved employment, with the
  affected member as a secondary target; this preserves exactness without
  emitting duplicate member-level action results.

## React / frontend constraints

- Follow `apps/blade/DESIGN_SYSTEM.md` and the repo frontend-design guidance.
- Keep the logs page server-first; isolate interactive filtering, pagination,
  detail inspection, and export controls in focused client components.
- The page needs deliberate loading, empty, error, denied, and populated
  states.
- Dense audit data should use existing Blade table/filter/detail patterns where
  they remain usable on mobile.
- Actor names use the snapshotted Guild role color as an accent on the name
  itself. The role label remains available as supporting/title text.
- Role selection must reuse Guild's existing `getGuildRoleCallout` semantics:
  officer roles outrank director roles, which outrank team roles; configured
  order resolves ties. Unknown roles or missing colors fall back to the normal
  foreground color.
- The actor-color treatment must retain readable contrast and must not be the
  only cue that identifies the actor or role.

## Testing / verification strategy

- API tests must prove the `IS_OFFICER` read boundary, including denial for a
  director without `IS_OFFICER`.
- API tests must prove a non-officer cannot add/remove `IS_OFFICER` on a role
  or assign/revoke an officer-bearing role even when they otherwise hold the
  relevant role-management permission.
- API/domain tests must map every approved audit action to a test-case ID and
  verify the normalized actor/action/time/target result.
- API/domain tests must prove success-only capture, explicit partial external
  outcomes, allowlisted update details, sensitive-read coverage, and explicit
  bulk parent/result linkage without time-based grouping.
- DB tests are required for any schema, indexes, retention behavior, and target
  deletion semantics, including rejection of application-role update/delete.
- Blade component tests cover display/filter/detail states; selected Playwright
  coverage proves the officer-only route and a representative action appearing
  in the log.
- API/UI tests prove Guild role-callout priority, snapshotted color rendering,
  and the normal-text fallback.

## Open questions

None. Technical constraints are ready for artifact approval.
