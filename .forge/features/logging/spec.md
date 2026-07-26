# Admin Action Logging Spec

Status: Approved

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Give officers a comprehensive history of privileged administrative actions so
they can answer who changed something, what they did, when they did it, and
which person or object was affected.

## Users / actors

- Officers whose assigned permissions include `IS_OFFICER` may view the logs.
- A director title or director-only permission does not grant log access.
- Administrators whose permission-gated actions are recorded are log actors,
  whether or not they are allowed to view the logs page.
- Ordinary members acting through member/self-service capabilities are not log
  actors for this feature.

## User-visible interface

- An officer-only Blade admin logs page.
- Each log entry identifies:
  - who performed the action;
  - what action they performed;
  - when it occurred; and
  - the affected person, entity, or object.
- The actor's name is highlighted with the snapshotted color of the same
  prioritized role Guild would display for that person. Actors without a Guild
  callout role/color use the normal text color.
- Updates identify changed field names and may show action-specific,
  explicitly allowlisted before-and-after values.
- One explicit bulk command is shown as a parent action with directly linked
  per-target results. Separate actions are never grouped because they occurred
  near each other in time.
- The page opens newest first for the last 30 days, uses cursor pagination, and
  has a visible search bar.
- Officers can filter by member, action/domain, date range, actor, target type,
  and outcome. The Member filter matches the selected person as actor, primary
  member target, or linked member target.
- Search covers actor, action, and target labels plus stable IDs.
- Selecting an entry opens structured detail containing the approved
  field-level changes and linked bulk/provider results.
- V1 does not export the audit history.

## Scope

### In scope

- Actions performed through capabilities gated by Forge's roles/permission
  system.
- Human administrative actions across Blade's admin surfaces.
- A deep inventory of current administrative actions so coverage is explicit
  rather than inferred from page location.
- Successful committed actions, plus partial outcomes when an external
  provider operation cannot complete atomically.
- Sensitive administrative access actions: CSV exports, resume views, response
  attachment downloads, and equivalent approved reads of protected content.
- One explicit admin command that intentionally affects multiple records,
  represented as a bulk parent action with linked per-target results.
- Officer-only access to the resulting log history.
- Append-only retention for an indefinite period, with no product delete
  control.
- Immutable actor and target identity/display snapshots so later rename or
  deletion does not rewrite the historical entry.
- Only an existing officer may add or remove `IS_OFFICER` from a role or
  assign/revoke a role that carries `IS_OFFICER`, regardless of the actor's
  other role-management permissions.

### Out of scope

- Ordinary member/self-service actions that require only login and do not pass
  through the roles/permission system.
- Ordinary page views that do not reveal one of the approved sensitive
  resources.
- Validation failures, authorization denials, and other failed attempts in the
  first release.
- Grouping independent actions into an inferred activity window, session, or
  time-based batch.
- Raw form answers, file contents, signed URLs, authentication tokens,
  credentials, or unrestricted free-form input in audit details.
- Automated scripts, cron jobs, callbacks, and webhooks that do not represent a
  human permission-authorized admin action.
- Historical backfill from Discord messages or legacy diagnostics.
- Exporting the audit history in v1.
- Sending every new comprehensive audit entry to Discord.
- Granting log access based only on being a director.
- Runtime developer diagnostics unless separately approved as part of this
  feature.

## Vocabulary

- `admin action`: A human-initiated operation authorized through Forge's
  roles/permission system.
- `actor`: The authenticated administrator who initiated an action.
- `target`: The person, record, entity, object, or collection affected by an
  action.
- `bulk action`: One explicit admin command or API operation that intentionally
  affects more than one record. It is not an activity window and is not
  inferred from timestamps.
- `bulk result`: The outcome for one target of a bulk action, directly linked
  to its parent action.
- `officer`: A user whose effective permissions include `IS_OFFICER`; this is a
  capability check, not a title check.
- `member action`: A logged-in user's ordinary self-service operation that is
  not authorized through a role permission.

## Acceptance criteria

- A user with effective `IS_OFFICER` permission can open the admin logs page.
- A logged-in user without `IS_OFFICER`, including a director who lacks that
  permission, cannot access the page or its log data.
- Covered admin actions produce an entry that lets an officer identify the
  actor, action, timestamp, and target.
- The actor name uses the snapshotted Guild-prioritized role color when one
  exists, with a normal-text fallback.
- Successful state-changing actions are recorded only after they commit.
- An external-provider action that partially completes records its actual
  outcome rather than appearing as an unqualified success or disappearing.
- Approved sensitive exports and file/content access actions are recorded;
  ordinary page views are not.
- Update details contain changed field names and only action-specific
  allowlisted before-and-after values. They never contain raw form answers,
  file contents, signed URLs, tokens, credentials, or unrestricted input.
- A bulk action produces one parent action and linked per-target results.
  Independent actions remain independent even when performed by the same actor
  close together in time.
- Audit history is append-only, retained indefinitely, and has no product
  update or delete control.
- Actor/target identity and display snapshots survive later rename or deletion.
- The default page shows the newest entries from the last 30 days with cursor
  pagination, a search bar, and the approved filters.
- The Member filter finds actions where the selected person is the actor,
  primary member target, or linked member target.
- The Action filter selects normalized action keys/domains.
- Entry detail shows only allowlisted structured changes and linked results.
- The first release has no audit-history export.
- A non-officer with `CONFIGURE_ROLES` cannot add or remove `IS_OFFICER` on a
  role.
- A non-officer with `ASSIGN_ROLES` cannot assign or revoke an
  officer-bearing role.
- Ordinary member/self-service actions do not appear in this admin log.
- The set of covered actions is documented and checked against every active
  Blade admin surface and permission-gated backend mutation.

## Open questions

None. Product intent is ready for artifact approval.
