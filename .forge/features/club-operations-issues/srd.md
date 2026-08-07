# Club Operations Issues SRD

Status: Approved

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Restore the current database's Issues domain as a role-aware `@forge/api`
platform capability and a server-first Blade workspace. The implementation
must safely support team-scoped reads and writes, officer-wide access, issue
trees, global templates, archival, immutable history, Club-event linkage and
creation, and Discord reminders without carrying forward Legacy Blade's
authorization and partial-write flaws.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: platform/API
  ownership, server-enforced authorization, tRPC and validator boundaries,
  transactional multi-row writes, server-first React, external-side-effect
  isolation, configurability, migration discipline, and verification.
- `docs/REPO-CONVENTIONS.md`: router registration, Blade composition, and
  package ownership.
- `docs/DATABASE-USAGE.md`: Issue, Role, Permission, Event, User, and Member
  semantics.
- `apps/blade/DESIGN_SYSTEM.md`: authenticated shell, left navigation,
  operational calendars, dialogs, pending/error/empty states, accessibility,
  and responsive density.

## Access policy

| Actor / capability                                | Allowed behavior                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Unauthenticated                                   | No Issues access.                                                                          |
| Signed-in user without a qualifying assigned role | No Issues access and no disclosure that a requested issue exists.                          |
| Assigned role with `READ_ISSUES`                  | Read issues owned by or shared with that same team.                                        |
| Assigned role with `EDIT_ISSUES`                  | Read, create, and mutate issues owned by that same team. Edit implies read for that team.  |
| Shared visible team                               | Read an issue through a qualifying assigned team; sharing never grants mutation authority. |
| Template reader/editor                            | Use the separate global template permissions for the Club-wide catalog.                    |
| Officer                                           | Read and mutate every issue and template without ordinary permission checks.               |

- Authorization resolves the caller's assigned Role rows and the permission
  bits on each specific role. The merged session permission map is
  insufficient for team-scoped decisions.
- Every query and mutation applies the same policy at the API boundary. A
  mutation verifies authority over the target issue rather than trusting that
  the caller reached it through an authorized page.
- Assignees must belong to the owning team. Submitted visibility and ownership
  role IDs must resolve to valid linked roles.
- Inaccessible and nonexistent issue IDs both return the same safe `NOT_FOUND`
  behavior.

## Architecture / data flow

- `packages/api` owns the Issues router, role-aware authorization, issue-tree
  orchestration, history diffing, archive batches, template application,
  event-link checks, issue-creation thread delivery, and server-side reminder
  selection, delivery planning, and formatting.
- `packages/validators` owns reusable list/filter, issue write, tree, template,
  archive/restore, event-link, and URL-state schemas.
- `packages/db` owns only schema, relations, migration, types, and the client.
- Blade owns server-side page gates and initial reads plus the interactive
  Calendar, Kanban, List, detail/history, forms, archive, and template
  surfaces. It does not contain business authorization or provider logic.
- The existing Event API remains the only owner of Club-event creation and its
  Discord/Google projection lifecycle. Issues stores and validates only the
  resulting Event UUID.
- No new REST business endpoint is added.

## tRPC/API behavior

- Register an `issues` router in the application router. Use separate
  procedures for issue discovery/detail/history/archive, create/update/status
  movement/archive/restore, eligible team members, and template discovery and
  management.
- Every procedure has a stable name plus purpose, access, input, output, and
  error documentation suitable for future generated tRPC and agent context.
- Root issue creation accepts a client-generated idempotency key. The server
  persists the key with a canonical request hash and returns the original tree
  for an exact retry. Reuse with different normalized input returns
  `CONFLICT`.
- Create validates the complete root/child tree before opening a transaction.
  The transaction inserts issues, ownership visibility, assignments, and
  history together; any failure rolls back the complete tree.
- After that transaction commits, root creation starts one Discord thread from
  an idempotent starter message in the owning role's configured delivery
  channel. It posts bounded details, description, links, and an explicit
  audience message inside the thread. Provider calls never run in the issue
  transaction.
- Discord delivery failure returns a truthful retryable error after preserving
  the committed issue and browser draft. Replaying the exact creation key
  repairs delivery with stable Discord nonces and thread-existence recovery;
  it does not create another issue.
- Updates and status moves accept the revision observed by the editor. The
  server locks and reauthorizes the target, rejects an archived target, and
  increments the revision with the mutation and history row. A stale revision
  returns typed `CONFLICT` plus the latest safe issue representation.
- Parent changes reject self-parenting, cycles, an inaccessible or archived
  parent, and a parent owned by a different team.
- Template application recursively validates the stored body and generated
  issue tree before the issue transaction. It creates the complete tree or no
  part of it.
- Archive and restore lock and reauthorize the root, collect its subtree, and
  update all intended rows plus history in one transaction. Permanent deletion
  is not exposed.
- Inline event creation calls the existing Event create procedure first using
  its own durable creation key. The later issue create/update submits only the
  returned Event UUID and its independent issue creation key/revision.
- Event-link validation requires a non-hackathon Club event available to the
  caller. Issues never mutates event data or invokes Event Management's
  Discord/Google projection logic. Failed issue creation leaves a valid created
  event and permits an exact retry without another provider create.
- Event Management keeps its existing deletion rules. In the final event-row
  deletion transaction, lock and clear all linked Issue event fields, increment
  their revisions, and insert a system history entry with safe deleted-event
  context. A failure rolls back link/history changes and leaves Event deletion
  retryable; database `ON DELETE SET NULL` alone is not sufficient.
- Inaccessible and nonexistent resources return `NOT_FOUND`; invalid input is
  `BAD_REQUEST`; stale revisions, changed creation-key payloads, and unsafe
  state transitions return typed `CONFLICT`.

## Validation

- `@forge/validators` owns shared schemas for issue and template writes,
  recursive nodes, filters/URL state, pagination cursors, idempotency keys,
  optimistic revisions, archive batches, and history queries.
- Trim outer whitespace. Issue title is required at 1-200 characters and
  description is required at 1-20,000 characters.
- Render descriptions with the same safe CommonMark policy as Event
  descriptions. Ignore raw HTML and render outbound links with safe protocols,
  targets, and relationships.
- Accept at most 20 de-duplicated external links. Each is at most 2,048
  characters and must use `http` or `https`.
- Accept at most 50 assignees and 50 additional visible teams. De-duplicate all
  IDs before authorization and persistence.
- An issue or template tree has maximum depth 5 and maximum 100 nodes per
  operation. Template names are 1-100 characters and unique case-insensitively.
  Validate reserved replacement tokens and bounded relative-date calculations
  before applying a template.
- Due date/time is optional. A new ordinary task defaults to 23:00 in
  `America/New_York`, but the editor may choose another time. The event-start
  shortcut copies the event's exact instant. Store instants with timezone and
  consistently present them in Eastern time.
- Search text is at most 200 characters. List page sizes are exactly 25, 50,
  or 100. Calendar requests span at most 62 days. Kanban columns and history
  use bounded opaque cursor pagination.
- Every role, user, parent, event, template, creation key, and archive batch is
  revalidated server-side. Transactional mutations repeat checks under the
  locks that protect the write.
- Invalid legacy template JSON or references return a typed disabled template
  with repair feedback. One malformed template never fails the catalog.

## Data / migration / compatibility

- Reuse the current `Issue`, `IssuesToTeamsVisibility`,
  `IssuesToUsersAssignment`, and `Template` data rather than importing or
  rewriting it.
- Add archive state to Issue, including archive time, actor, and a batch UUID.
  Archive and restore traverse the complete subtree and write all affected
  rows in one transaction. Restore selects only rows carrying the requested
  archive batch so it cannot revive an independently archived descendant.
- Add immutable structured issue-history storage for issue, actor, action,
  changed fields, safe before/after values, and occurrence time. History rows
  are inserted in the same transaction as their issue mutation.
- Add nullable `Issue.discordThreadId` storage. It is written only after
  Discord confirms or recovers the thread, remains null for historical issues
  and suppressed/failed delivery, and requires no backfill.
- Add a durable reminder-delivery ledger with deterministic uniqueness for the
  issue, due instant, and reminder window or overdue local day. Destination and
  sanitized message content are delivery snapshots, not identity fields, so a
  channel or ordinary issue edit cannot duplicate an already-sent reminder. It
  tracks pending, sent, and failed attempts without appearing in user-visible
  issue history.
- Existing rows remain active and retain the current status and priority enum
  values. No status migration is required. Existing rows begin at revision 1;
  new root rows persist a creation key and canonical request hash.
- Change the current timezone-naive Issue due column to timezone-aware storage.
  The migration interprets each existing wall-clock value as
  `America/New_York` so users continue to see the same legacy date and time.
- History stores only allowlisted structured issue-field changes. It retains a
  nullable actor User reference plus a display-name snapshot so an honest
  attribution survives later account removal.
- Do not synthesize historical changes from `createdAt` or `updatedAt`.
  Pre-history issues expose a clear Reforge-history boundary in Blade.
- Archived issues and history are retained indefinitely. Ordinary queries
  exclude archived rows unless an authorized caller explicitly requests the
  archive surface.
- Migration and rollback must preserve all current issue, assignment,
  visibility, template, role-dependency, and event-link records.

### Preflight and data cleanup

- Add a read-only issue-migration preflight command. It reports parent cycles,
  orphaned or cross-team hierarchy, assignees outside the owning team, invalid
  ownership/visibility roles, invalid event links, malformed template bodies,
  normalized duplicate template names, and invalid reminder destinations.
- Malformed issue relationships block feature enablement and require explicit
  operator remediation; the migration never guesses at ownership or hierarchy.
- Malformed templates remain stored but are returned disabled with a repair
  reason. Normalized duplicate names must be resolved by an operator before
  adding the case-insensitive uniqueness constraint; never rename them
  automatically.

### Expand/contract migration

1. Add timezone-aware `Issue.dueAt` without removing legacy `Issue.date`.
2. Backfill `dueAt` by interpreting each existing `date` wall-clock value in
   `America/New_York`.
3. During the compatibility window, new code reads `dueAt` and dual-writes
   `dueAt` plus the equivalent Eastern wall-clock legacy `date`.
4. Add revision, archive actor/time/batch, nullable creation key/request hash,
   immutable history, reminder delivery, and reminder-enabled storage
   additively with required indexes and constraints.
5. Backfill existing Issue revision to 1 and insert one truthful system history
   marker per existing issue stating when Reforge history tracking began.
6. Preserve current reminder behavior by enabling reminders for existing Role
   rows. Validate destinations before production enablement.
7. Defer removal of legacy `Issue.date` and dual-write compatibility to a later
   cleanup after rollback confidence and production observation.

### Rollout and rollback

- Deploy in order: database expansion/backfill; validators and API; Blade with
  the Issues entry disabled; new reminder planner/sender; staging smoke; then
  enable Blade navigation and production reminders.
- A deployment flag gates the Blade Issues entry and new reminder planner. It
  is rollout control, not product configuration.
- Rollback disables both surfaces and may restore the previous application
  release. It leaves additive schema, history, archive data, and `dueAt`
  untouched. The dual-written legacy date remains readable by the previous
  cron/application.
- Do not reverse already-recorded history or archive operations during
  rollback. Do not modify TK during rollout or rollback.

## Discord integration

- Reuse `Roles.issueReminderChannel` as the single per-owning-role destination
  and add a per-role issue-reminders enabled flag. Blade role management exposes
  both to officers and callers with `CONFIGURE_ROLES`.
- The configuration control reuses the established searchable Discord selector
  pattern but returns writable text channels. Before save, the server verifies
  that the channel belongs to the configured Knight Hacks guild and the bot can
  view and send messages there. A manual snowflake fallback is available when
  live discovery fails and receives the same server validation.
- Root issue creation uses that same configured channel even when scheduled
  reminders are disabled. It creates a thread from a nonce-protected starter
  embed, uses the issue title as the bounded thread name, and posts a matching
  role-colored starter with status, priority, owning team, due time,
  association count, description, and a clickable Blade title. Discord carries
  that starter into the attached thread, so Forge does not post a duplicate
  details message. Long descriptions and external links continue in bounded
  matching embeds.
  Assigned Discord users receive the final plain-text `cc:`; an unassigned
  issue mentions only the owning Discord role.
- Creation thread messages use explicit allowed mentions, neutralize mention
  syntax from user-controlled text, and split at Discord's content limit. Only
  production performs the external write by default. A local operator may opt
  one development process in with `ISSUE_DISCORD_THREADS_ENABLED=true` for an
  explicit live smoke. Thread creation is checked before retry and rechecked
  after an ambiguous provider response; messages use stable nonce values. This
  side effect runs after the database transaction, and a failure preserves the
  issue plus client draft for exact-key repair.
- Reminder rows keep the title linked to Blade's canonical issue page and add a
  compact `Discuss` link when `discordThreadId` is present and the configured
  Discord guild ID resolves. Missing thread/config data omits only the Discord
  link and never suppresses the Blade reminder.
- The reminder planner runs at 09:00 in `America/New_York`, with the timezone
  passed explicitly to the scheduler so host timezone and daylight-saving
  changes do not alter delivery time.
- Preserve the approved 14-, 7-, 3-, and 1-day reminders plus one reminder per
  overdue local day. Finished, archived, disabled, and undated issues are
  excluded.
- `@forge/api` owns reminder selection, grouping, formatting, sanitization, and
  delivery-ledger state. `apps/cron` schedules and invokes that server-only
  capability rather than duplicating business queries or calling an
  authenticated tRPC procedure.
- Planning acquires a database lock and inserts deterministic delivery rows so
  replicas, restarts, and manual reruns cannot deliver the same reminder twice.
  A bounded worker retry drains pending/transient failures with backoff; a
  terminal failure is recorded and logged without changing the issue.
- A channel change may update an unsent delivery's destination after server
  validation. It never resends a successful delivery. A due-instant change
  creates a new schedule identity; title, priority, assignment, or other
  ordinary revisions do not.
- Mention all assigned Discord users when assignments exist; otherwise mention
  the owning Discord role. Send one Components V2 message per owning team: a
  role-colored container holds compact overdue, 1-day, 3-day, 7-day, and 14-day
  sections separated by native dividers, and a final text display holds the
  concise `cc:` notification below the container. Each issue row links its
  title and short due date, encodes priority with one through four exclamation
  points, and lists assignee first names (or the team name when unassigned).
  Sort each window by priority, due date, title, and ID. Use explicit
  `allowed_mentions`, sanitize issue and audience text, and split at Discord's
  component-text, component-count, container-child, content, and mention
  limits. Build issue links from the cron service's required `BLADE_URL`. Only
  `NODE_ENV=production` may send mention-bearing `cc:` content; development and
  test replace it with a plain notification-disabled line and
  `allowed_mentions.parse: []`.
- Reminder deliveries do not create issue-history entries. No TK interface is
  added or changed.

## Configurability review

Would this require a developer change next year?

- Answer: Operational destinations and enabled state do not require a
  developer. Officers configure them per linked role in Blade. Templates,
  owning/visible teams, assignments, event links, due dates, and external links
  are also data-driven.
- The approved status/priority vocabulary and reminder cadence remain
  code-defined. Changing those policies requires a developer and, for stored
  vocabulary, an explicit migration. This is acceptable because they are
  product semantics rather than annual deployment values.

## React / frontend constraints

- The existing left navigation links qualifying callers to
  `/admin/issues/calendar`. Keep dedicated routes for Calendar, Kanban, List,
  issue detail, and Archive under `/admin/issues`; do not add a TK route.
- Route pages remain server components. They authenticate, perform the initial
  safe access check/read, and compose focused client components below the page
  boundary. No route page becomes `use client`.
- A shared Issues workspace shell owns view links, open/Finished counts, Create
  issue, Templates, Archive, and Filters. Search, team, status, assignee, date,
  hierarchy, and event-link filters use validated URL parameters and survive
  view changes.
- Calendar preserves Month, Week, and Day/agenda modes and queries only the
  visible date window. List uses server pagination and sorting. Kanban uses
  per-status lazy loading so large columns are never silently truncated.
- The create/edit surface is one large sectioned dialog for Basics, Ownership
  and visibility, Scheduling and Club event, and Links and hierarchy.
- Markdown uses one canonical source value with Write and sanitized Preview
  tabs. Plain text remains valid Markdown source and renders naturally.
- `Create new event` swaps the issue dialog content to an extracted reusable
  Blade event-form step. Back restores the issue step. It never opens a dialog
  inside another dialog.
- Create drafts persist browser-locally under the issue creation key. Refresh,
  navigation, accidental close, event-step cancellation, event success, and
  issue failure preserve the correct draft. Return offers Restore or Discard;
  successful issue creation clears it.
- Issue detail is server-rendered initially and loads bounded chronological
  history pages beneath the current state. Mutation controls are present only
  for authorized editors.
- Status changes may be optimistic in Calendar, List, and Kanban but always
  submit the observed revision. On `CONFLICT`, restore the latest server state,
  identify that a newer change exists, and preserve copyable unsaved form text.
  Do not offer force overwrite.
- Kanban drag/drop has a keyboard- and touch-accessible status-menu equivalent.
  Mobile Calendar uses the established agenda presentation; actions never rely
  only on hover.
- Route skeletons preserve the authenticated Blade shell. Queries and
  mutations define loading, empty, filtered-empty, retry, pending, success,
  safe error, permission-loss, and conflict states with accessible focus and
  announcements.
- Show the left-nav entry to officers and users assigned at least one role
  granting `READ_ISSUES` or `EDIT_ISSUES`. Template management stays in the
  workspace toolbar rather than primary navigation.

## Testing / verification strategy

- `@forge/validators` unit tests cover valid/invalid fields, Markdown and URL
  limits, recursive depth/node limits, filters, pagination, due-time parsing,
  IDs, revisions, archive batches, and template replacement values.
- `@forge/api` tests cover the complete officer/reader/editor/shared-team/no-role
  authorization matrix, safe `NOT_FOUND`, event-link eligibility, history
  redaction, archive discovery, and template permissions.
- Real PostgreSQL integration tests cover full-tree atomicity, row locks,
  concurrent creation-key retries, changed-payload conflicts, stale revisions,
  cycle and cross-team rejection, archive-batch restoration, history atomicity,
  indexes/constraints, and migration/backfill fixtures.
- `@forge/cron` and server-service tests cover 09:00 Eastern scheduling across
  DST, every reminder window, daily overdue uniqueness, disabled/Finished/
  archived exclusions, concurrent planner deduplication, retry/terminal failure,
  safe mentions, sanitization, deterministic grouping, and message splitting.
- Blade component and route tests cover navigation visibility, server page
  gates, shared URL state, loading/empty/error/conflict states, Write/Preview,
  accessible status controls, responsive Calendar agenda, draft restore/
  discard, event-form step transitions, archive/restore, and paginated history.
- Playwright covers representative end-to-end Calendar, Kanban, List, detail,
  template, hierarchy, archive, Markdown-safety, concurrency-conflict, draft,
  existing-event link, and new-event success/Needs-attention workflows.
- Staging smoke uses an officer, team reader, team editor, and shared-team
  reader. It verifies one Discord test delivery and event creation under both
  provider success and `Needs attention`.
- Run at minimum:
  - `pnpm --filter=@forge/db test`
  - `pnpm --filter=@forge/validators test`
  - `pnpm --filter=@forge/api test`
  - `pnpm --filter=@forge/cron test`
  - `pnpm --filter=@forge/blade test`
  - `pnpm --filter=@forge/blade e2e`
  - `pnpm analyze:react:changed`
  - `pnpm format`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Root gates may retain only the already-documented missing Guild-router
  baseline. This feature must introduce no additional failure. Confirm the
  final diff contains no TK file, route, test, or behavior change.

## Open questions

- None.
