# Club Operations Issues Test Cases

Status: Approved

> This file owns the human-approved observable proof for implementation and
> verification.

## Scope

These cases prove the approved Club Operations Issues product and technical
contracts across validators, PostgreSQL-backed API behavior, reminder delivery,
Blade components/routes, critical browser workflows, migration safety, and
release verification.

They intentionally exclude implementation-helper structure, TK behavior,
hackathon task management, comments, native attachments, and provider internals
already owned by Event Management. Discord and Google use deterministic fakes
outside the explicit staging smoke.

## Test placement plan

- packages/validators: Vitest unit coverage for public validation contracts.
- packages/db: migration/preflight fixtures and database constraints.
- packages/api: Vitest and real-PostgreSQL integration coverage for
  authorization, queries, transactions, locks, idempotency, and history.
- apps/cron: Vitest coverage for planning, delivery, deduplication, and retry
  around the server-owned reminder capability.
- apps/blade: Vitest component/route coverage and focused Playwright workflows.
- Staging smoke: live role/channel discovery, one Discord delivery, and the
  existing Event provider boundary.

Expected commands are the targeted workspace tests, Blade E2E, changed React
analysis, and the root format, lint, typecheck, test, and E2E gates listed in
srd.md.

## Test cases

### TC-AUTH-001: Session and navigation gates

Setup:

- Prepare an unauthenticated visitor and a signed-in user with no qualifying
  issue role.

Action:

- Render Blade navigation, open an Issues route, and call protected issue
  discovery.

Expected observations:

- The visitor is redirected to sign-in and the API returns UNAUTHORIZED.
- The no-role user sees no Issues navigation entry and receives a safe access
  failure with no names, IDs, teams, counts, or filter options.

### TC-AUTH-002: Team reader, editor, and edit-implies-read

Setup:

- Team A has one reader, one editor, and one editor whose role omits the
  explicit read bit.
- Team A-owned, Team A-shared, and unrelated issues exist.

Action:

- Each actor discovers, opens, and attempts to mutate issues.

Expected observations:

- Readers see Team A-owned/shared issues and cannot mutate them.
- Both editors can read and mutate Team A-owned issues.
- Edit implies read for Team A only; unrelated team records remain hidden.

### TC-AUTH-003: Shared visibility and multiple roles

Setup:

- Team A owns an issue shared with Team B.
- A user edits Team B and reads Team C but has no Team A assignment.

Action:

- Discover issues and attempt to mutate the Team A issue and records owned by
  each assigned team.

Expected observations:

- Read results are the union of readable/editable assigned teams and shares.
- The Team A shared issue remains read-only even though Team B grants edit.
- Mutation authority is evaluated against each owning team.

### TC-AUTH-004: Officer and template bypass

Setup:

- An officer has no ordinary issue or template permission bits.
- Multiple teams own issues and the global template catalog has entries.

Action:

- Discover and manage issues, archive records, and manage/apply templates.

Expected observations:

- The officer can perform every approved operation across teams without
  ordinary permission assignments.

### TC-AUTH-005: Safe resource and filter isolation

Setup:

- A non-officer cannot read one real issue and inaccessible records contain
  distinctive names, assignees, teams, and dates.

Action:

- Request the real inaccessible UUID and a random UUID, then search, filter,
  sort, paginate, and request counts/options.

Expected observations:

- Both direct requests produce equivalent safe NOT_FOUND behavior.
- Results, totals, choices, cursors, and copy derive only from accessible data.

### TC-AUTH-006: Assignee and role-reference boundaries

Setup:

- A Team A editor can choose Team A members, outside users, valid linked roles,
  and invalid/unlinked role IDs.

Action:

- Submit assignments, ownership, and visibility changes using each candidate.

Expected observations:

- Owning-team members and valid linked visibility roles succeed.
- Outside assignees and invalid roles fail without changing state or history.

### TC-AUTH-007: Permission loss after page load

Setup:

- A user loads an editable issue and then loses the qualifying role.

Action:

- Refresh data and submit a mutation from the stale page.

Expected observations:

- Current authorization is rechecked and both operations fail safely.
- No state or history changes and Blade shows the permission-loss state.

### TC-DISC-001: Consistent authorized discovery

Setup:

- An actor can read issues spanning teams, statuses, due dates, hierarchy, and
  event linkage.

Action:

- Use Calendar, Kanban, List, detail, filters, counts, and pagination.

Expected observations:

- All surfaces derive from the same authorized universe.
- Calendar windows and pagination affect presentation without changing access.
- The left-nav entry opens Calendar by default.

### TC-LIFE-001: Full-field creation and due-time choices

Setup:

- A Team A editor has valid values for every approved field and an accessible
  event with a known start instant.

Action:

- Create issues using the default due time, a custom time, no due date, and the
  event-start shortcut.

Expected observations:

- Initial task time is 23:00 Eastern and remains configurable/removable.
- Event-start copies the exact instant and remains independently editable.
- Saved fields normalize once and appear consistently in every view at
  revision 1 with one creation history entry.

### TC-LIFE-002: Atomic tree creation and rollback

Setup:

- Prepare one valid tree within depth 5 and 100 nodes and another with one
  invalid descendant.

Action:

- Submit each root creation.

Expected observations:

- The valid tree commits every node, relationship, assignment, visibility row,
  key, and history entry together.
- The invalid tree leaves none of those records behind.

### TC-LIFE-003: Creation idempotency

Setup:

- A creation key is associated with one canonical issue-tree payload.

Action:

- Retry equivalent normalized input, then reuse the key with changed input,
  including concurrent requests.

Expected observations:

- Exact retries return the original tree with no duplicate data/history.
- Changed input returns CONFLICT and cannot overwrite or create another tree.

### TC-LIFE-004: Revisions and concurrent editors

Setup:

- Two authorized editors load revision N of the same issue.

Action:

- Editor A saves, then Editor B submits a different change against N.

Expected observations:

- A commits revision N+1 with one matching history entry.
- B receives CONFLICT plus the latest safe state, cannot overwrite A, and
  retains copyable unsaved form text without a force-overwrite action.

### TC-LIFE-005: Hierarchy invariants and independent status

Setup:

- Prepare valid parent/children plus self, descendant, cross-team,
  inaccessible, and archived parent candidates.

Action:

- Change parent/child statuses and attempt every invalid create/reparent.

Expected observations:

- Parent and child statuses never change each other implicitly.
- Invalid relationships fail without partial writes, revision changes, or
  cycles.

### TC-HIST-001: Structured history and actor retention

Setup:

- An issue receives approved field, status, assignment, archive, and restore
  changes; one actor is later removed.

Action:

- Read all history pages.

Expected observations:

- Meaningful committed actions appear once in order with safe canonical
  changes, revision, time, and attribution.
- No-op/failed requests create nothing.
- Removed actors retain an understandable display snapshot without deleted
  account data.

### TC-HIST-002: Honest legacy history boundary

Setup:

- A legacy issue predates history tracking and has only old timestamps.

Action:

- Run migration and open history.

Expected observations:

- One truthful system marker identifies when Reforge tracking began.
- No earlier creation, edit, actor, or field changes are fabricated.

### TC-ARCH-001: Atomic subtree archive

Setup:

- A parent has multiple descendant levels, assignments, and history.

Action:

- An owning-team editor archives the parent.

Expected observations:

- The complete current subtree receives one archive batch atomically.
- It leaves ordinary views and remains intact in the authorized Archive.

### TC-ARCH-002: Selective batch restoration

Setup:

- One child was independently archived before a later parent-subtree batch.

Action:

- Restore the parent using the later batch.

Expected observations:

- Rows from the later batch become active.
- The independently archived child stays archived under its original batch.

### TC-ARCH-003: Archive exclusions and no permanent deletion

Setup:

- An archived issue otherwise matches discovery, counts, choices, and reminder
  timing.

Action:

- Query operational surfaces, plan reminders, and inspect available API/UI
  removal actions.

Expected observations:

- The issue appears only in authorized Archive and produces no reminder.
- Archive is the only removal action; no public permanent-delete capability
  exists.

### TC-TPL-001: Template access and normalized uniqueness

Setup:

- Prepare template readers/editors, issue editors, an officer, and an existing
  template name.

Action:

- Browse, manage, apply, and concurrently create/rename capitalization- or
  whitespace-equivalent names.

Expected observations:

- Template and owning-team issue permissions are enforced independently.
- Officers bypass them.
- Exactly one normalized name commits without overwriting another body.

### TC-TPL-002: Expansion and all-or-nothing validation

Setup:

- A valid nested template uses INPUT, PARENT, team defaults, and relative dates.
- Invalid variants exceed limits or reference invalid roles/assignees.

Action:

- Apply each template.

Expected observations:

- The valid tree resolves expected names, hierarchy, teams, and due instants
  and commits once.
- Every invalid application leaves no partial issue/tree/history data.

### TC-TPL-003: Legacy template repair

Setup:

- A preserved legacy template has malformed JSON or invalid references.

Action:

- Browse, attempt application, repair it with proper access, and apply again.

Expected observations:

- It is disabled with a useful reason and does not break the catalog.
- It cannot apply before repair and becomes usable afterward without rewriting
  unrelated templates.

### TC-EVENT-001: Event candidate and permission isolation

Setup:

- Accessible/inaccessible Club events and a hackathon event exist.
- One issue editor has event-edit access and another does not.

Action:

- Search candidates and inspect/invoke Link existing and Create new.

Expected observations:

- Only accessible non-hackathon Club events with minimal context appear.
- Both users may link accessible events; only the event editor may create one.
- Direct unauthorized creation is rejected.

### TC-EVENT-002: Focused event step and draft preservation

Setup:

- An event editor has completed all issue-form sections.

Action:

- Enter the event step, use Back/cancel once, then create an event successfully.

Expected observations:

- No nested dialog appears and Back/cancel creates nothing.
- Every issue value survives both transitions.
- Successful creation returns with the new event selected once.

### TC-EVENT-003: Provider success and Needs attention

Setup:

- Deterministic gateways provide one fully synchronized result and one durable
  partial result.

Action:

- Create an issue after each event result.

Expected observations:

- Success produces one linked event and issue.
- Needs attention shows a repair warning yet still permits the internal issue.
- Issues makes no provider call or event mutation.

### TC-EVENT-004: Two-key retry

Setup:

- Event creation succeeds and issue creation then fails transiently while both
  creation keys and the draft remain.

Action:

- Restore and retry.

Expected observations:

- The existing event is reused with no repeated provider create.
- Exactly one issue eventually commits and the successful draft clears.

### TC-EVENT-005: Link validity, ownership, and due independence

Setup:

- Prepare hackathon, missing, inaccessible, newly inaccessible, and valid Club
  events.

Action:

- Link/unlink each candidate, use Open event, copy event start, then edit the
  event time.

Expected observations:

- Invalid links fail without issue/event changes.
- Valid link changes affect only the issue and Open event uses Events.
- The copied due instant does not silently follow later event edits.

### TC-EVENT-006: Linked event deletion

Setup:

- A deletable Club event is linked by active and archived issues.

Action:

- Complete Event Management's provider and final database deletion.

Expected observations:

- The final transaction clears every link, increments each issue revision, and
  writes one safe system history entry.
- Issues remain otherwise intact.
- Transaction failure leaves links/history and retryable Event state
  consistent; foreign-key nulling cannot bypass history.

### TC-REM-001: Reminder configuration access and channel validation

Setup:

- Prepare officer, CONFIGURE_ROLES, and unauthorized actors plus writable,
  foreign-guild, inaccessible, and non-text Discord channels.

Action:

- Search/select channels, use manual-ID fallback, and toggle reminders.

Expected observations:

- Only authorized actors can save.
- Search returns safe writable text-channel context.
- Selector and manual fallback enforce the same guild/bot-send validation.

### TC-REM-002: Enabled state and issue exclusions

Setup:

- Prepare active, disabled-team, Finished, archived, and undated issues.

Action:

- Run reminder planning for a matching day.

Expected observations:

- Only enabled, active, unfinished, dated issues create delivery candidates.
- No issue or user-facing history changes.

### TC-REM-003: Eastern schedule and pre-due windows

Setup:

- Fix clocks around standard time, spring-forward, and fall-back transitions.
- Issues are due 14, 7, 3, 1, and unrelated local days away.

Action:

- Run the scheduler under different host timezones.

Expected observations:

- Planning occurs once at 09:00 America/New_York.
- Exactly the approved local-day windows plan deliveries regardless of host
  timezone or DST offset.

### TC-REM-004: Overdue cadence and due-time rescheduling

Setup:

- An unfinished issue becomes overdue across several Eastern dates and later
  receives a new due instant.

Action:

- Plan repeatedly each day before and after the due change.

Expected observations:

- At most one overdue delivery exists per local day.
- A due-instant change creates the appropriate new schedule identity.
- Other issue revisions do not duplicate a sent window.

### TC-REM-005: Mention and content privacy

Setup:

- Prepare assigned/unassigned issues and malicious title text containing
  mention syntax.

Action:

- Build reminder payloads.

Expected observations:

- Assigned users are mentioned; otherwise only the owning role is mentioned.
- Titles cannot create mentions and allowed_mentions permits only intended IDs.
- One Components V2 message presents a team/role-colored container with native
  interval separators, linked title/due-date rows, exclamation-point priority,
  and non-mention assignee names. A final plain-text display holds the concise
  `cc:` line below the container and is the only part permitted to notify users
  or roles.
- Production permits only explicit selected IDs in `allowed_mentions`.
  Development and test payloads contain no mention syntax and explicitly parse
  no mentions.
- Issue links use the configured Blade origin and canonical issue path.
- Thread-backed issues show a separate `Discuss` link while retaining the
  canonical Blade title link. Issues without a stored thread remain Blade-only.

### TC-REM-006: Deterministic grouping and splitting

Setup:

- Many reminders across channels/windows exceed one Discord message.

Action:

- Format and split deliveries in different source orders.

Expected observations:

- Destination/team grouping, interval order, and priority-first issue order are
  deterministic.
- Every chunk stays within Discord's component-text, component-count,
  container-child, content, and mention limits without losing or duplicating
  an issue.

### TC-REM-007: Replica, rerun, and channel-change deduplication

Setup:

- Multiple planners race for one reminder; its channel later changes before
  and after delivery in separate fixtures.

Action:

- Run concurrent planners, restart/manual reruns, and configuration updates.

Expected observations:

- One delivery identity and at most one successful send exist.
- An unsent delivery may use the newly validated destination.
- A sent delivery never repeats solely because its channel changed.

### TC-REM-008: Retry and failure isolation

Setup:

- Discord returns transient failures, then success, and a terminal failure for
  another channel.

Action:

- Drain pending deliveries through bounded retries.

Expected observations:

- Transient work records one eventual success without duplicate sends.
- Terminal failure is recorded/logged without changing issues/history or
  blocking other channels.

### TC-REM-009: Issue creation thread delivery and exact retry

Setup:

- An owning team has a configured writable delivery channel and Discord role.
- Prepare assigned and unassigned root issues with long descriptions, links,
  due/status/priority details, and user-controlled mention syntax.

Action:

- Create each issue, then replay the same creation key after successful,
  transient-failure, and ambiguous-thread-create outcomes.

Expected observations:

- The configured delivery channel receives one starter per issue and an
  attached thread named from the bounded issue title.
- The channel starter is a role-colored embed with a clickable Blade issue
  title. Discord carries that same starter into the attached thread; Forge does
  not post a duplicate details embed or redundant text link. Description/link
  continuations and the final plain-text `cc:` stay within Discord limits.
- Assigned Discord users are explicitly permitted and mentioned; an unassigned
  issue mentions only the owning role. User-controlled text cannot add pings.
- Discord calls occur after the issue transaction. Failure preserves the saved
  issue and client draft; exact retry repairs the same thread without creating
  another issue record or intentionally duplicating Discord messages.
- Successful or recovered delivery persists the thread ID. Reminder rows retain
  the Blade title link and add a Discord `Discuss` link; null/legacy thread IDs
  omit only that optional link.
- Development and test make no live Discord write unless an operator explicitly
  opts one process in for a controlled smoke.

### TC-VAL-001: Scalar normalization and enums

Setup:

- Build boundary values for title, description, status, priority, due time,
  IDs, revisions, creation keys, and archive batches.

Action:

- Parse valid edges and empty, oversized, malformed, or unsupported values.

Expected observations:

- Valid normalized values are accepted consistently.
- Invalid values receive field-specific failures before business writes.

### TC-VAL-002: Markdown and external-link safety

Setup:

- Descriptions contain supported CommonMark, raw HTML, script payloads, and
  unsafe/safe URLs; link arrays include duplicates and limit violations.

Action:

- Validate, save, and render them.

Expected observations:

- Plain text and approved Markdown render safely and consistently with Events.
- Raw HTML/scripts and unsafe protocols cannot execute.
- Links are normalized, deduplicated, bounded, and opened safely.

### TC-VAL-003: Collection, tree, and query bounds

Setup:

- Prepare assignee/visibility arrays, trees, searches, Calendar ranges, list
  sizes, Kanban/history cursors at and beyond approved limits.

Action:

- Validate and query each boundary.

Expected observations:

- Approved limits succeed without silent truncation.
- Over-limit or malformed requests fail specifically and perform no partial
  writes.

### TC-MIG-001: Relationship preflight

Setup:

- Database fixtures include healthy data plus parent cycles, orphans,
  cross-team parents, invalid assignments/roles/events, and bad channels.

Action:

- Run the read-only migration preflight.

Expected observations:

- Every problem is reported with enough safe identity for operator remediation.
- No business data changes.
- Malformed issue relationships block enablement.

### TC-MIG-002: Legacy template and duplicate-name preflight

Setup:

- Legacy templates include valid, malformed, and normalized duplicate names.

Action:

- Run preflight and attempt the uniqueness migration.

Expected observations:

- Malformed templates remain preserved/disabled.
- Duplicate names require explicit operator resolution and are never renamed.
- Uniqueness is enforced only after conflicts are resolved.

### TC-MIG-003: Additive backfill and compatibility

Setup:

- Legacy issues contain timezone-naive dates, existing links/roles, and no
  revisions/history; existing roles have reminder channels.

Action:

- Apply expansion/backfill and exercise compatibility dual writes.

Expected observations:

- dueAt preserves the prior Eastern wall-clock display while legacy date stays
  readable.
- Existing issues start at revision 1 with one truthful tracking marker.
- Existing data remains active and reminder-enabled; new writes maintain both
  due columns during the compatibility window.

### TC-MIG-004: Gated rollout and non-destructive rollback

Setup:

- Expansion is deployed with Blade/reminder flags disabled, then enabled after
  staged services and smoke checks.

Action:

- Exercise each rollout stage and disable flags/restore the prior app release.

Expected observations:

- No surface reads unavailable schema and no old/new planner overlap duplicates
  delivery.
- Rollback hides Issues/stops the new planner while preserving additive data,
  history, archives, and previous-app date readability.

### TC-UI-001: Route map and shared URL state

Setup:

- An authorized user has active filters, search, sorting, paging, and a visible
  Calendar period.

Action:

- Navigate among dedicated Calendar, Kanban, List, detail, and Archive routes.

Expected observations:

- Calendar is the default and server gates run on every route.
- Applicable validated URL state survives view changes and deep links.
- Invalid parameters recover to documented safe defaults.

### TC-UI-002: Calendar behavior and states

Setup:

- Issues cover month/week/day windows, no-date items, dense days, loading,
  empty, filtered-empty, and failure fixtures.

Action:

- Use desktop Calendar and the mobile agenda presentation.

Expected observations:

- Visible-window data, status/team context, selection, create/edit, and detail
  actions remain accurate.
- Loading, empty, filtered-empty, error, and retry states are distinct,
  accessible, and preserve the Blade shell.

### TC-UI-003: List and Kanban scale and status controls

Setup:

- More than one page/column of issues spans all legacy statuses and sort keys.

Action:

- Page/sort List, lazy-load Kanban, and move status by drag plus keyboard/touch
  menu.

Expected observations:

- No issue is silently truncated or duplicated and counts remain authorized.
- Every input method submits equivalent revision-protected status behavior.
- Failed/conflicting optimistic moves roll back visibly.

### TC-UI-004: Issue form, Markdown, and draft recovery

Setup:

- An editor fills all four form sections, Write/Preview content, links,
  hierarchy, and configurable due time.

Action:

- Trigger validation, close/navigate/refresh, then Restore and Discard in
  separate fixtures.

Expected observations:

- Field errors are specific and focusable; pending submit cannot double-send.
- Preview is safe and plain text remains readable.
- Restore recovers the correct creation-key draft and Discard removes it.
- Successful creation clears it.

### TC-UI-005: Mutation feedback, conflict, and permission loss

Setup:

- Prepare successful, server-error, stale-revision, and revoked-permission
  mutations.

Action:

- Submit each from form and quick-action surfaces.

Expected observations:

- Pending, success, safe error, retry, conflict, and permission-loss feedback
  are distinct and accessible.
- Conflicts show current state and preserve copyable unsaved text.
- No failure leaves false optimistic state or duplicate submissions.

### TC-UI-006: Detail, history, Archive, and Templates

Setup:

- An issue has long Markdown, links, hierarchy, event, paginated history, and
  archived/template fixtures across desktop/mobile actors.

Action:

- Read detail/history, use Open event, manage/apply templates, archive, and
  restore with keyboard and touch.

Expected observations:

- Content, permissions, pagination, hierarchy, and history remain usable and
  safely rendered at both widths.
- Destructive/archive confirmations and restore results are explicit.
- No essential action depends only on hover.

### TC-E2E-001: Role-aware primary workflow

Setup:

- Browser fixtures include officer, team reader, team editor, shared-team
  editor, and no-role actors.

Action:

- Complete create, discover across all views, quick-status, edit, detail/history,
  archive, and restore workflows.

Expected observations:

- Each actor observes exactly the approved access and mutation behavior.
- URL state, revisions, history, and responsive/accessibility fallbacks remain
  coherent across the workflow.

### TC-E2E-002: Event, reminder, staging, and release gate

Setup:

- Staging has test roles/channels and deterministic Event provider success and
  Needs-attention paths.

Action:

- Create/link events through Issues, deliver one test reminder, run targeted
  workspace commands and root gates, and inspect the final change scope.

Expected observations:

- Event/draft/idempotency and reminder/configuration behavior match the
  approved contracts.
- Targeted tests pass and root gates add no failure beyond the documented
  missing Guild-router baseline.
- No TK file, route, test, or behavior changes.

## Negative / regression cases

Negative and regression observations are embedded in the numbered cases so
related success and failure behavior share one feature-level contract. Test
generation may parameterize them into multiple assertions or test functions
while retaining the case ID.

## Open questions

- None. Awaiting human approval of the complete artifact bundle before test
  generation or implementation.
