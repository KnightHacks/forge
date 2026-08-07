# Club Operations Issues Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-07: Root issue creation now starts a Discord thread in the owning
  role's configured issue-delivery channel. The thread mirrors operational
  details, description, and links, then mentions assigned users or the owning
  role when unassigned. The provider call runs after commit; exact creation-key
  retries use stable Discord nonces and thread recovery. Development/test
  delivery is suppressed by default, with an explicit process-level opt-in for
  controlled live smoke testing. No Blade UI change is required.
- 2026-08-07: Persist the confirmed Discord thread ID on the issue. Reminder
  rows keep their canonical Blade title link and add `Discuss` when that ID is
  available. Historical issues and failed/suppressed deliveries remain
  Blade-only. This adds one nullable column with no backfill.
- 2026-08-07: Visual smoke feedback replaced the raw delivery-channel starter
  with a role-colored embed linked directly to Blade. Long descriptions and
  links continue as bounded embeds, while the final audience notification
  remains plain text so explicit pings work.
- 2026-08-07: Removed the duplicate details embed inside the thread because
  Discord already carries the linked channel starter into it. The embed title
  remains the sole Blade link; the redundant `Open in Blade` line is removed.

- 2026-07-20: Named the feature `Club Operations Issues` with slug
  `club-operations-issues`.
- 2026-07-20: The feature will be the primary task-management system for every
  Club team, including non-development work.
- 2026-07-20: Hackathon workflows are out of scope for this feature.
- 2026-07-20: Non-officer access is team-scoped through linked-role
  permissions. Users see issues owned by or shared with their teams, and
  owning-team edit access controls mutations.
- 2026-07-20: Officers automatically see every issue and bypass ordinary issue
  permission checks.
- 2026-07-20: Cross-team visibility is read-only, assignees belong to the
  owning team, and only owning-team editors or officers can archive an issue
  or its descendants.
- 2026-07-20: Retain the legacy Calendar, Kanban, List, and deep-linked detail
  surfaces, with Calendar as the default workspace view.
- 2026-07-20: Preserve the legacy Backlog, Planning, In Progress, and Finished
  statuses to avoid a status migration.
- 2026-07-20: Issue descriptions support Markdown while remaining usable as
  plain text.
- 2026-07-20: Issue details include a durable history feed.
- 2026-07-20: Add Issues to the existing left navigation. Defer a broader
  decision about reorganizing member versus admin navigation.
- 2026-07-20: Retain all legacy issue fields: title, description, status,
  priority, owning team, assignees, due date, external links, visible teams,
  parent/children, and optional Club-event linkage.
- 2026-07-20: Parent and child lifecycle states are independent.
- 2026-07-20: Replace legacy subtree hard deletion with archive and restore.
  Archived issues stay out of ordinary views but remain recoverable.
- 2026-07-20: Do not add issue comments. Discussion remains in externally
  linked work systems.
- 2026-07-20: Retain external links and defer native file attachments.
- 2026-07-20: History records creation, field and status changes, assignment
  changes, archival, and restoration.
- 2026-07-20: Owning-team editors and officers may restore archived issues.
- 2026-07-20: Retain the legacy Club-wide template catalog, nested template
  trees, replacement tokens, relative due dates, and separate template
  permissions.
- 2026-07-20: An issue may link an existing Club event or create a Club event
  from the Issues workspace when no suitable event exists. The inline event
  creation user experience requires an explicit design before implementation.
- 2026-07-20: Event creation for this feature is a Blade surface. Do not add or
  change a TK interface as part of this feature.
- 2026-07-20: Preserve issue reminders at 14, 7, 3, and 1 days before due,
  then daily while overdue. Mention assignees when present and the owning team
  otherwise; suppress reminders for Finished and archived issues.
- 2026-07-20: Reminder-channel configuration and remaining reminder delivery
  mechanics will be resolved in the SRD.
- 2026-07-20: The issue form offers no event, link existing, and create new.
  Existing-event selection is searchable and shows identifying event context.
- 2026-07-20: Creating an event from an issue uses a focused Blade event-form
  step rather than nested dialogs. Blade preserves the issue draft, returns to
  it after event creation, and selects the new event automatically.
- 2026-07-20: Inline event creation requires event-edit access. Other issue
  editors may link only events available to them.
- 2026-07-20: Issue due dates remain independent from event timing, with a
  shortcut to use the linked event's start time.
- 2026-07-20: A provider-sync `Needs attention` state does not block creation
  of the internal issue. Event success plus issue failure preserves the event
  and issue draft for an idempotent retry.
- 2026-07-20: Linked-event editing stays in the established Events interface;
  issue detail provides event context and an Open event action.
- 2026-07-20: Human approved `spec.md` as the product contract.
- 2026-07-20: Issue authorization resolves the caller's assigned roles and the
  issue's owning/visible teams; it does not rely only on the session's merged
  permission booleans.
- 2026-07-20: `EDIT_ISSUES` implies read access for the same assigned team.
  Cross-team visibility never grants edit authority, and officers bypass all
  issue and template permission checks.
- 2026-07-20: Archive and restore operate on a complete subtree in one
  transaction. An archive batch ID ensures restoration affects only rows from
  that archive operation.
- 2026-07-20: Preserve legacy issues, assignments, visibility rows, and
  templates. Do not fabricate earlier history; legacy feeds identify when
  Reforge history tracking began.
- 2026-07-20: History is immutable and structured with actor, action, changed
  fields, timestamp, and safe before/after values.
- 2026-07-20: Archived issue data is retained indefinitely unless a later
  retention feature changes that policy.
- 2026-07-21: Add an `issues` tRPC router in `@forge/api`, reusable schemas in
  `@forge/validators`, and thin Blade clients.
- 2026-07-21: Separate issue discovery/detail/history/archive, issue mutation,
  eligible-assignee, and template procedures.
- 2026-07-21: Issue-tree writes include the issue rows, assignments,
  visibility, and history in one transaction after full-tree validation.
- 2026-07-21: Root creation uses a client idempotency key, and issue mutations
  use optimistic revisions with a typed stale-write conflict.
- 2026-07-21: Reject cycles, self-parenting, inaccessible or archived parents,
  and cross-team hierarchy. Apply a template-generated tree completely or not
  at all.
- 2026-07-21: Inline event creation completes through the existing idempotent
  Event API before issue creation links the returned ID. No provider call runs
  inside an issue transaction.
- 2026-07-21: Event links are revalidated as accessible non-hackathon Club
  events and never grant the Issues domain authority to mutate an event.
- 2026-07-21: Permanent deletion is absent from the Reforge Issues API.
- 2026-07-21: Issue procedures carry stable purpose, access, input, and output
  documentation for future generated tRPC and agent context.
- 2026-07-21: Reuse `Roles.issueReminderChannel` and expose it with an enable
  toggle in Blade role management to officers and `CONFIGURE_ROLES` users.
- 2026-07-21: Reminder configuration uses a searchable, bot-validated Discord
  text-channel selector with manual ID fallback.
- 2026-07-21: Run the approved reminder cadence at 09:00
  `America/New_York`; cadence remains code-defined while channel and enabled
  state are non-developer configuration.
- 2026-07-21: `@forge/api` owns reminder selection/formatting. Cron invokes it,
  and a locked durable delivery ledger prevents duplicates and tracks bounded
  retries without adding entries to user-visible issue history.
- 2026-07-21: Reminder failures never block issues. Titles and mentions are
  sanitized, `allowed_mentions` is explicit, and long messages are safely
  split. No TK interface changes are permitted.
- 2026-07-21: Blade uses server-first dedicated Calendar, Kanban, List,
  detail, and archive routes. The left navigation defaults to Calendar and is
  visible to officers or users with a qualifying assigned issue role.
- 2026-07-21: A shared workspace header owns view switching, counts, create,
  templates, archive, and filters. URL parameters preserve filters across
  views.
- 2026-07-21: Calendar queries its visible window; List uses server pagination
  and sorting; Kanban lazily loads by status without silent truncation.
- 2026-07-21: Issue creation/editing uses a large sectioned dialog. Inline
  event creation swaps to a reusable focused event-form step and back without
  nesting dialogs or losing the issue draft.
- 2026-07-21: Browser-local create drafts use the issue creation key and offer
  Restore or Discard. Markdown has Write/Preview modes.
- 2026-07-21: Detail is initially server rendered with paginated history.
  Optimistic status changes use revisions, roll back on conflicts, and never
  offer force overwrite.
- 2026-07-21: Kanban has keyboard/touch status controls, mobile Calendar uses
  an agenda presentation, and all routes/surfaces define loading, empty,
  filtered-empty, retry, success, permission-loss, and conflict states.
- 2026-07-21: Templates remain in the shared Issues toolbar rather than
  becoming a primary navigation destination.
- 2026-07-21: Approved bounded validators for titles, descriptions, safe
  CommonMark, links, assignments, visibility, tree depth/size, templates,
  search, pages, Calendar windows, Kanban, and history.
- 2026-07-21: Due date/time is optional and stored as a timezone-aware instant.
  New ordinary tasks default to 23:00 `America/New_York`, but editors may
  configure another time per issue. The event-start shortcut uses the event's
  exact instant.
- 2026-07-21: Interpret existing timezone-naive Issue dates as Eastern during
  migration so the displayed legacy wall-clock value is preserved.
- 2026-07-21: Legacy templates remain preserved; invalid ones are disabled
  with repair feedback rather than rewritten or allowed to fail discovery.
- 2026-07-21: History uses allowlisted structured changes plus nullable actor
  identity and a display snapshot. Existing issues start at revision 1.
- 2026-07-21: Migration begins with a read-only issue/template integrity
  preflight. Malformed issue relationships block enablement; malformed
  templates remain preserved, disabled, and repairable.
- 2026-07-21: Due-time storage uses expand/contract: add and backfill
  timezone-aware `dueAt`, temporarily dual-write legacy `date`, and defer old
  column removal to later cleanup.
- 2026-07-21: Add revision, archive, creation-key, history, reminder-ledger,
  and reminder-enabled storage additively. Existing roles keep reminders
  enabled and existing issues receive a truthful history-start marker.
- 2026-07-21: Duplicate normalized template names require operator resolution
  before the case-insensitive uniqueness constraint; never auto-rename them.
- 2026-07-21: Deploy database, validators/API, gated Blade, new cron, staging
  smoke, then enable navigation/reminders. A deployment flag provides a
  non-destructive rollback switch.
- 2026-07-21: Verification covers validators, API access and PostgreSQL
  concurrency, reminders, Blade components/routes, Playwright workflows,
  staging actors/provider states, and root gates with no new failures beyond
  the documented Guild baseline. TK remains unchanged.
- 2026-07-21: Human approved `srd.md` as the technical contract.
- 2026-07-21: Approved the authorization/discovery test cluster covering
  unauthenticated/no-role behavior, readers, editors, edit-implies-read,
  read-only sharing, multiple roles, officer bypass, safe deep links,
  assignees, permission loss, cross-view consistency, filter isolation, and
  navigation visibility.
- 2026-07-21: Approved lifecycle tests for full-field/default/configurable due
  creation, atomic trees and rollback, idempotent retries, changed-payload and
  stale-revision conflicts, independent hierarchy, invalid parents, structured
  and legacy-boundary history, archive batches, selective restoration,
  archived exclusions, and absence of permanent deletion.
- 2026-07-21: Approved template tests for permission separation, normalized
  uniqueness, nested expansion, all-or-nothing validation, and disabled legacy
  repair.
- 2026-07-21: Approved event tests for candidate isolation, create permission,
  focused-step draft handling, success/Needs-attention states, two-key retries,
  invalid links, ownership boundaries, and independent due times.
- 2026-07-21: When Event Management validly deletes a linked Club event, clear
  every issue link and add system history in the final deletion transaction;
  do not block event deletion solely because issues reference it.
- 2026-07-22: Calibrated test-case granularity against repository history:
  existing bundles average 28 named cases, with Event Management at 53 and
  Forms/Event Feedback at 69. Consolidate this broad feature to 50 named cases
  while retaining the approved observations.
- 2026-07-22: Reminder delivery identity is issue + due instant + reminder
  window/overdue local day. Destination and message are snapshots; ordinary
  issue or channel edits do not duplicate a sent reminder, while a due-instant
  change creates a new schedule.
- 2026-07-22: Consolidated the complete observable contract into exactly 50
  feature-level cases: 8 access/discovery, 10 lifecycle/history/archive, 9
  templates/events, 8 reminders, 7 validation/migration, and 8 UI/E2E. Related
  edges remain explicit observations within their owning case.
- 2026-07-22: Human approved the complete artifact bundle and authorized
  implementation. Blade interface quality and rendered desktop/mobile visual
  validation are explicit implementation gates.
- 2026-07-22: Implemented the complete feature across additive storage,
  validators, team-aware API authorization, immutable history, templates,
  Club-event linkage/creation, archive/restore, durable Discord reminders,
  role configuration, and dedicated Blade routes. No TK files were changed.
- 2026-07-22: Added `ISSUES_FEATURE_ENABLED`, defaulting to `false`, as the
  approved non-destructive rollout control. It gates Blade discovery/routes
  and scheduling of the new reminder planner; Playwright explicitly enables
  it for production-shaped browser verification.
- 2026-07-22: Final rendered review passed for the desktop Calendar, Kanban,
  List, detail/history, create flow, template catalog, and 320px mobile agenda.
  The interface remains border-led, dark-first, dense, keyboard/touch capable,
  and free of horizontal overflow at the supported narrow viewport.
- 2026-07-22: User review drove a second interface pass: compacted the shared
  workspace dock, made the six-week month fit a 1366x768 viewport, reduced
  month-card typography, replaced the decorative team rail with a readable
  team color/name signal, and increased icon/label spacing.
- 2026-07-22: Filters now use an animated dialog instead of inserting a
  slide-down panel into the work surface. Issue creation uses numbered,
  editorial form sections, and the template editor uses an explicit tree rail
  rather than repeated same-tone nested cards.
- 2026-07-22: Calendar range controls and List sorting now live inside the
  shared Issues dock. Calendar, Kanban, List, and Archive therefore expose one
  unified control surface with the same three-row structure and measured dock
  height; only the contextual controls within the final row vary by view.
- 2026-07-22: Empty and whitespace-only external-link lines normalize away;
  links remain optional while non-empty values still require HTTP or HTTPS.
- 2026-07-23: Human approved the refined interface and authorized integration
  into `reforge/main`. Because the implementation worktree is already checked
  out on that target branch, integration is a direct feature commit rather
  than a branch merge commit.
- 2026-07-26: Refine issue reminder presentation without creating a new
  artifact bundle: structured embeds own issue details, while a concise
  plain-text `cc:` line retains real Discord pings for assigned users or the
  owning team. Keep explicit allowed mentions and all Discord payload limits.
- 2026-07-26: Synced reminder work with `reforge/main` at `c6a8b048` after the
  filtered dev-backup refresh merged. The sync introduced no reminder-file
  conflicts.
- 2026-07-26: First DB-backed Discord preview was visually reviewed and needs
  refinement before approval: move `cc:` below the embed, remove the large
  preview banner, use the owning role color, group compact rows by reminder
  interval, encode priority with exclamation points, link task titles, and show
  assignee names. A revised no-ping dev preview remains required; this work is
  not yet approved.
- 2026-07-26: Sent the revised DB-backed, no-ping preview to the dev guild bot
  channel as embed message `1531070437625430167` followed by `cc:` message
  `1531070439202226226`. Discord returned no parsed user, role, or everyone
  mentions. Visual approval is still pending.
- 2026-07-26: Strengthened the development safety boundary after visual
  feedback: only `NODE_ENV=production` may emit mention-bearing `cc:` content.
  Development and test replace it with a plain notification-disabled line,
  even though explicit empty allowed mentions already suppressed notifications.
- 2026-07-26: Reminder issue URLs derive from the cron service's required
  `BLADE_URL`. The local development value is `http://localhost:3000`; the
  repository's canonical production origin is `https://blade.knighthacks.org`,
  while the deployed environment value remains external configuration.
- 2026-07-26: Visual approval remains open. Research native Discord Components
  V2 containers, Markdown text displays, and real separators as a potentially
  clearer single-message hierarchy before sending another preview.
- 2026-07-26: Adopted the proposed Components V2 preview direction for the next
  visual review. A single atomic message now uses the owning role color on a
  container, native dividers between overdue/1/3/7/14-day sections, compact
  priority-sorted linked task rows, and a bottom text display for `cc:`.
  Production retains explicitly allowlisted mentions there; development and
  test replace the entire line before delivery so no mention syntax enters the
  payload. Visual approval remains pending.
- 2026-07-26: Sent the DB-backed Components V2 preview to the dev guild bot
  channel as message `1531075906800713953`. Discord readback returned flag
  `32768`, the KH IX role accent, all five interval sections and four native
  separators, an empty ordinary content field, zero embeds, no raw mention
  syntax, and zero parsed user, role, or everyone mentions. Visual approval
  remains pending.
- 2026-07-26: Human visually approved the Components V2 reminder preview and
  described it as perfect. Authorized direct integration into `reforge/main`;
  a separate port to legacy `main` is intentionally deferred because the
  reminder presentation will be inherited with the full Blade migration. The
  temporary preview harness was removed before commit.
- 2026-07-27: Development is finished and merged into `reforge/main`. The
  feature is closed for development. The prerequisites below remain
  production-enablement gates, not outstanding development work.

## Rollout prerequisites

- Resolve legacy issue `9f6e07f6-4271-4cd5-befc-a54136a42bef` (`Hack Site
Assets`, owned by `Design Team`): either restore assignee Kaitlyn Awai
  (`1c02ca35-30cd-4d23-9566-3ba98b3a327e`) to the Design Team role or remove
  her assignment. Change the owning team only if Design Team is not the true
  owner; the other five assignees already satisfy the invariant.
- Repair or intentionally leave disabled legacy template
  `5b7f9ec7-1b1f-471e-b7a0-67d062c92949` (`Workshop Flow`). Its body is an
  array with legacy `title`/`dateMs` fields and cross-team children. Either
  choose one owning team for the whole tree and convert it to an object using
  `name`, `status`, `priority`, and `relativeDueDays` (5 and 7 days for the
  dated children), or split the cross-team work into separate templates. It
  remains preserved and disabled until that product decision is made.
- Rerun `pnpm --filter=@forge/db preflight:issues` until `canEnable` is true,
  smoke staging, then set `ISSUES_FEATURE_ENABLED=true` for Blade and cron.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Add issue storage, migration, integrity preflight, and shared validators.
- [x] Implement team-aware issue API, history, templates, events, and archive.
- [x] Upgrade reminder planning, delivery ledger, and role configuration API.
- [x] Build the Blade Issues workspace and focused inline-event flow.
- [x] Complete targeted, root, browser, and rendered visual verification.

## Validation / commands

- `pnpm forge:feature club-operations-issues "Club Operations Issues"`:
  feature bundle created successfully.
- `rg -c '^### TC-' .forge/features/club-operations-issues/test-cases.md`: 51
  consolidated feature-level cases.
- `pnpm exec prettier --check '.forge/features/club-operations-issues/*.md'`:
  all four bundle files formatted successfully.
- `pnpm db:migrate`: additive migration `0016_breezy_sphinx.sql` applied to the
  local PostgreSQL database successfully.
- Package lint and typecheck for `@forge/validators`, `@forge/db`,
  `@forge/api`, `@forge/cron`, and `@forge/blade`: passed.
- Package tests: validators 77 passed; database 18 passed/9 fixture-dependent
  skipped; API 244 passed; cron 7 passed; Blade 139 passed.
- Components V2 reminder refinement: focused API tests 6 passed and focused
  cron delivery tests 5 passed; full API tests 315 passed and full cron tests
  12 passed. API/cron lint and typecheck, changed-file formatting, preview dry
  run, Discord readback verification, and `git diff --check` passed.
- `pnpm analyze:react --strict apps/blade/src/app/_components/admin/issues
apps/blade/src/app/admin/issues`: 15 files, 6 components, zero failures.
- Playwright Issues workflow with the rollout flag enabled: 2 passed. It
  covers a viewport-fitting 1366x768 Calendar, dialog-based filters,
  Kanban/List/detail, paginated history, creation/template application and
  catalog management, plus the 320px agenda.
- Vision inspection passed on the final Playwright screenshots in
  `apps/blade/.playwright-results/club-operations-issues-*`.
- Root lint reaches only the pre-existing `apps/guild` and `apps/club`
  missing-`api.guild` failures. Root typecheck reaches only the pre-existing
  `apps/guild` missing-`api.guild` failure. Root format reaches only the
  pre-existing, unmodified `apps/blade/src/app/form/[slug]/page.tsx` mismatch.
- Changed-file React analysis reaches only the pre-existing analyzer crashes
  in current/legacy `apps/blade/src/trpc/react.tsx`; the strict Issues-only
  analysis is clean.
- Read-only production-shaped preflight correctly exits nonzero for the two
  legacy records listed under Rollout prerequisites; it made no data changes.
- 2026-08-07 issue-creation thread patch: focused DB tests passed 6/6 and
  focused API thread/reminder tests passed 9/9 with one worker; `@forge/db` and
  `@forge/api` typechecks passed. Changed files lint with zero errors and only
  existing file/function-size warnings; formatting and `git diff --check`
  passed. Migration `0037_left_nocturne.sql` adds only the nullable thread ID;
  it was generated but not applied locally. No live Discord message was sent.

## Links

- PRs:
- Issues:
- Discord/thread context:
