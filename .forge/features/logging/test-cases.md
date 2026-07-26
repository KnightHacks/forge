# Admin Action Logging Test Cases

Status: Approved

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

- Officer-only access to the logs page and audit read APIs.
- Recording and display of approved permission-gated admin actions.
- Approved sensitive administrative reads.
- Success-only, partial-external-outcome, field-detail, and bulk semantics.
- Reserved officer-escalation guards.
- Exclusion of ordinary member/self-service actions.
- Approved logs-page search, filtering, pagination, and detail behavior.
- Actor role-color snapshot and Guild-priority behavior.
- Every one of the 62 approved action keys requires direct or table-driven
  contract coverage during test generation.

## Test placement plan

- `@forge/api`: access-policy, capture, normalization, filtering, pagination,
  and action-coverage tests.
- `@forge/db`: schema, index, migration, and target-deletion behavior if
  persistence is approved.
- `@forge/validators`: audit entry and query/filter contracts.
- `@forge/blade`: logs-page component states and selected Playwright coverage.

## Test cases

### TC-001: Officer can view admin action history

Setup:

- A logged-in user has effective `IS_OFFICER` permission.
- At least one approved admin action log exists.

Action:

- The user opens the Blade admin logs page.

Expected observations:

- The page is available.
- The entry identifies the actor, action, time, and affected target.

### TC-002: Covered permission-gated action appears in history

Setup:

- A logged-in administrator is authorized to perform a covered admin action.
- The administrator has a known internal user identity and display identity.
- The action has a known target.

Action:

- The administrator successfully performs the action.

Expected observations:

- An officer can find a corresponding log entry.
- The entry attributes the correct actor.
- The entry names the approved action.
- The entry identifies the correct target and occurrence time.
- The entry exists only after the state change commits.

### TC-003: Member self-service action is excluded

Setup:

- A logged-in member is authorized only through the ordinary protected
  self-service flow.

Action:

- The member performs an excluded self-service action.

Expected observations:

- No admin-action log entry is created for that action.

### TC-004: Approved sensitive access appears in history

Setup:

- An administrator has permission to perform an approved CSV export, resume
  view, response attachment download, or equivalent protected-content access.

Action:

- The administrator successfully accesses the resource.

Expected observations:

- An audit entry identifies the actor, sensitive-access action, time, and
  target resource or collection.
- The entry does not contain the exported/file contents, signed URL, token, or
  other secret-bearing payload.

### TC-005: Update detail uses an action-specific allowlist

Setup:

- An administrator can update a covered target.
- The update changes both approved audit-safe fields and a field whose value is
  prohibited from audit storage.

Action:

- The administrator successfully commits the update.

Expected observations:

- The entry lists the changed field names.
- Only approved action-specific before-and-after values are present.
- Raw form answers, file contents, signed URLs, tokens, credentials, and
  unrestricted input are absent.

### TC-006: Explicit bulk command creates linked results

Setup:

- One authorized admin command intentionally targets several records.

Action:

- The administrator runs the command and it completes with known per-target
  outcomes.

Expected observations:

- One bulk parent action identifies the actor, command, time, and target
  collection.
- Each target has a directly linked result with its actual outcome.
- No activity window or timestamp heuristic is needed to reconstruct the bulk
  command.

### TC-007: External-provider partial completion is visible

Setup:

- A covered operation crosses a non-transactional external-provider boundary.
- The provider or database step is forced to complete only partially.

Action:

- The administrator performs the operation.

Expected observations:

- The audit history records the actual partial outcome and affected target.
- The action does not appear as an unqualified success.
- The partial operation does not disappear merely because the full workflow
  failed.

### TC-008: Audit history has no product mutation path

Setup:

- An audit entry exists.

Action:

- An officer uses the available logs UI and API.

Expected observations:

- No product action exists to update or delete the entry.
- The entry remains queryable under the indefinite retention policy.

### TC-009: Résumé access is recorded only on an explicit access request

Setup:

- A member has a résumé.
- An administrator has the required member-management permission.

Action:

- The administrator first opens the member detail page, then explicitly
  requests the résumé through the audited click-time access boundary.

Expected observations:

- Loading member detail alone does not claim the résumé was accessed.
- The explicit résumé request creates one `member.resume.accessed` entry.
- The entry contains no signed URL, object key, file contents, or résumé text.

### TC-010: Role-gated response attachment access excludes owner access

Setup:

- A form response has an attachment.
- One administrator can read responses through a role permission.
- The response owner can access their own attachment through self-service.

Action:

- Each user separately downloads the attachment.

Expected observations:

- The administrator's request creates
  `form.response_attachment.accessed`.
- The owner's request does not create an admin-action entry.
- Neither path stores a signed URL, object key, file contents, or response
  answers in the audit log.

### TC-011: Actor name uses the snapshotted Guild role color

Setup:

- An administrator has multiple linked roles with colors, including roles from
  different Guild callout tiers.
- The administrator performs a covered action.

Action:

- An officer views the resulting log entry.

Expected observations:

- The actor snapshot contains the role label and color selected by Guild's
  existing priority rules.
- The actor's name is highlighted with that color and remains readable.
- Changing the actor's roles or colors later does not recolor the old entry.

### TC-012: Logs list supports search, member/action filters, and pagination

Setup:

- More than one cursor page of entries exists across several dates, members,
  actors, actions, domains, target types, and outcomes.

Action:

- An officer opens the logs page and uses the search bar and each approved
  filter.

Expected observations:

- The initial page is newest first and limited to the last 30 days.
- Cursor navigation has no duplicates or omissions.
- Member filtering returns entries where the selected person is the actor,
  primary member target, or linked member target.
- Action filtering returns the selected normalized action/domain.
- Date, actor, target-type, and outcome filters return matching entries.
- Search matches actor, action, and target labels plus stable IDs.

### TC-013: Entry detail exposes only approved structured information

Setup:

- An update entry has allowlisted before/after fields.
- A bulk or external-provider entry has linked results.

Action:

- An officer opens each entry's detail.

Expected observations:

- The detail view shows structured approved fields and linked results.
- Prohibited payloads remain absent.
- No audit-history export control is present.

### TC-014: Audit failure rolls back a database-only mutation

Setup:

- A database-only covered admin action can commit atomically with its audit
  write.
- Audit insertion is forced to fail.

Action:

- The administrator attempts the action.

Expected observations:

- The business mutation rolls back.
- No successful action entry exists.

### TC-015: Rename or deletion does not rewrite audit identity

Setup:

- A committed entry contains actor and target ID/label snapshots.

Action:

- The live actor or target is renamed or deleted under an allowed product
  workflow.

Expected observations:

- The audit entry remains queryable.
- Its original immutable actor/target labels and IDs remain intelligible.

### TC-016: Existing-form Save remains two precise actions

Setup:

- Editing an existing form changes both its definition and settings.

Action:

- The administrator selects Save.

Expected observations:

- The committed calls produce `form.definition.updated` and
  `form.settings.updated`.
- They are not combined by timestamp, actor, browser session, or page visit.

## Negative / regression cases

### TC-NEG-001: Director without IS_OFFICER cannot read logs

Setup:

- A logged-in user has director status or director-related capability but does
  not have effective `IS_OFFICER` permission.

Action:

- The user navigates to the logs page and directly calls its read API.

Expected observations:

- The route does not reveal audit data.
- The API rejects the request with the established permission-denied behavior.

### TC-NEG-002: Logged-in non-officer cannot read logs

Setup:

- A logged-in user lacks effective `IS_OFFICER` permission.

Action:

- The user directly requests log data.

Expected observations:

- No log entries or sensitive filter metadata are returned.

### TC-NEG-003: Unauthenticated user cannot read logs

Setup:

- No authenticated session exists.

Action:

- The user requests the logs page or audit read API.

Expected observations:

- No audit data is returned.

### TC-NEG-004: Failed or denied attempt is excluded from v1 admin history

Setup:

- A request either fails validation, fails before its business change commits,
  or is denied by authorization.

Action:

- The request is attempted.

Expected observations:

- No successful admin-action entry is created.
- No underlying business state is reported as changed.

### TC-NEG-005: Nearby independent actions are not inferred as bulk

Setup:

- The same administrator performs two independent actions close together in
  time against different targets.

Action:

- Both actions commit successfully.

Expected observations:

- Two independent actions are recorded.
- They have no bulk parent merely because the actor and timestamps are close.

### TC-NEG-006: Non-officer cannot add or remove IS_OFFICER on a role

Setup:

- An administrator has `CONFIGURE_ROLES` but does not have effective
  `IS_OFFICER`.

Action:

- The administrator attempts to add or remove `IS_OFFICER` on a role.

Expected observations:

- The mutation is rejected and the role permission bits remain unchanged.
- No successful admin-action entry is created.

### TC-NEG-007: Non-officer cannot grant or revoke an officer-bearing role

Setup:

- An administrator has `ASSIGN_ROLES` but does not have effective
  `IS_OFFICER`.
- A role carries the `IS_OFFICER` bit.

Action:

- The administrator attempts to assign or revoke that role.

Expected observations:

- The mutation is rejected and role membership remains unchanged.
- No successful admin-action entry is created.

### TC-NEG-008: Actor without a Guild callout color uses normal text

Setup:

- A recorded administrator has no known Guild callout role, or the selected
  role has no color.

Action:

- An officer views the entry.

Expected observations:

- The actor name uses the normal foreground style.
- No invalid or client-supplied color is rendered.

### TC-NEG-009: Application cannot mutate audit history

Setup:

- An audit entry exists.
- A product/API or application database path attempts to update or delete it.

Action:

- The mutation is attempted.

Expected observations:

- The API exposes no such product procedure.
- The database rejects application-role update/delete.
- The original entry remains unchanged.

### TC-NEG-010: New permission-gated procedure requires an audit policy

Setup:

- A permission-gated procedure is added without an `audited`, `excluded`, or
  `hybrid` declaration.

Action:

- The audit coverage suite runs.

Expected observations:

- The suite fails and identifies the undeclared procedure.

## Open questions

None. Observable proof is ready for artifact approval and test generation.
