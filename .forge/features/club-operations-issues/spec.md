# Club Operations Issues Spec

Status: Approved

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Give every Club team one primary place to create, assign, organize, and track
its operational work, including non-development work. Team members should be
able to focus on work relevant to their teams, while officers retain a complete
Club-wide view.

## Users / actors

- Club team members view issues owned by or shared with their teams.
- Team members with edit access create and manage work owned by their teams.
- Officers see and manage every issue regardless of ordinary team permissions.
- Assigned members and team Discord audiences receive issue reminders.

## User-visible interface

- A Calendar view is the default Issues workspace.
- Users can switch among Calendar, Kanban, and List views without changing
  which issues they are permitted to see.
- Each issue has a deep-linkable detail page with its current information and
  history.
- Users with appropriate team access can create and edit issues from the
  operational views.
- Issue descriptions accept ordinary plain text and optional Markdown
  formatting, and rendered descriptions display Markdown safely.
- Issues appear in the existing left navigation. A broader member-versus-admin
  navigation redesign is deferred.
- Issue details show title, description, status, priority, owning team,
  assignees, due date, external links, visible teams, hierarchy, and optional
  Club-event linkage.
- From the Issues workspace, an editor can link an existing Club event or
  create a Club event when no suitable event exists.
- The event relationship offers three clear choices: no event, link an
  existing event, or create a new event.
- Existing-event selection is searchable and identifies choices by useful
  event context such as name, date, audience, and internal status.
- Creating an event moves to a focused Blade event-form step while preserving
  the unfinished issue. After success, the user returns to the issue with the
  new event selected.
- Users without event-edit access do not see the create-event action and may
  link only events available to them.
- Issue due dates remain independent of event timing, with an action to use the
  linked event's start time.
- A linked-event summary provides an Open event action. Editing the event stays
  in the established Events experience.
- When a newly created event needs Discord or Google repair, Blade warns the
  user but still permits the internal issue to be created.
- If issue creation fails after event creation succeeds, Blade preserves the
  event and issue draft so the user can retry without duplicating the event.
- If Event Management later deletes a linked event under its existing rules,
  the issue remains and its history records that the event link was removed.
- Archived issues are absent from ordinary operational views but remain
  recoverable through an archive surface.

## Scope

### In scope

- Primary task management for all Club teams.
- Team-owned issues and read-only sharing with additional teams.
- Team-scoped member assignments.
- Officer access across the entire Club.
- Calendar, Kanban, List, and deep-linked issue-detail surfaces.
- Backlog, Planning, In Progress, and Finished lifecycle states.
- Plain-text and Markdown issue descriptions.
- A durable, user-visible issue history feed.
- Independent lifecycle states for parent and child issues.
- Archival and restoration instead of permanent subtree deletion.
- External links to the systems where teams perform and discuss their work.
- A Club-wide catalog of reusable nested issue templates with replacement
  values and due-date offsets.
- Root issue creation starts a Discord thread in the owning team's configured
  delivery channel. The thread carries the issue description and operational
  details in a role-colored embed with a linked Blade title, then mentions
  assigned members or the owning team when unassigned. The attached thread
  reuses that starter instead of posting a duplicate details embed.
- Discord reminders 14, 7, 3, and 1 days before an issue is due and daily while
  it remains overdue. Reminders mention assignees when present and the owning
  team otherwise; Finished and archived issues are excluded. Reminder rows keep
  Blade as the canonical issue link and add a Discord discussion link whenever
  the issue has a delivered thread.

### Out of scope

- Hackathon task-management workflows.
- A broader redesign of member and administrator navigation.
- Issue comments.
- Native issue file attachments.
- New or changed TK user interfaces.

## Vocabulary

- `Issue`: A unit of Club work tracked through its operational lifecycle.
- `Owning team`: The team responsible for managing an issue and its assignees.
- `Visible team`: An additional team that may read an issue without gaining
  edit authority.
- `Officer`: A Club-wide administrator who can see and manage every issue.
- `History entry`: A durable record of a meaningful change to an issue.
- `Archived issue`: An issue hidden from ordinary operational views while
  retaining its data and history for recovery.
- `Issue template`: A reusable Club-wide issue tree that may calculate names
  and due dates when applied.

## Acceptance criteria

- An authorized user can open Issues from the left navigation and lands on the
  Calendar view.
- A user can switch among Calendar, Kanban, and List while retaining the same
  accessible issue set, filters, and useful pending, empty, error, and success
  feedback.
- A non-officer sees only issues owned by or shared with their teams. Sharing
  an issue does not grant that team edit access.
- A non-officer can create and mutate work only for an owning team through
  which they have edit access. Assignees must belong to that team.
- An officer can see and manage every issue without ordinary team permissions.
- An owning-team editor or officer can create and update an issue using every
  approved issue field and can change status directly from operational views.
- Plain text remains readable as entered, while supported Markdown renders
  safely on issue surfaces.
- Parent and child issues retain independent lifecycle states, and a reusable
  template can create a nested issue tree with resolved names and due dates.
- Archiving removes an issue from normal views without destroying it. An
  owning-team editor or officer can find and restore it with its hierarchy and
  history intact.
- Every meaningful issue creation, field change, status change, assignment
  change, archive, and restore appears in chronological history to users who
  may read that issue.
- An issue editor can search and link an accessible existing Club event.
- A user with event-edit access can create a Club event through a focused step,
  return to the preserved issue draft, and continue with the event selected.
- Event integration repair does not discard or duplicate either the event or
  the unfinished issue.
- Deleting a linked event under Event Management's existing rules clears its
  issue links without deleting those issues, and the removal remains visible
  in issue history.
- Creating a root issue creates one attached Discord thread in the owning
  team's configured channel with bounded description, detail, link, and
  audience messages. Exact creation retries do not intentionally duplicate it.
- Active unfinished issues produce the approved Discord reminder cadence;
  Finished and archived issues do not. A reminder for a thread-backed issue
  links both its Blade record and Discord discussion; older or failed-delivery
  issues remain Blade-only.
- Unauthorized and invalid actions fail without exposing inaccessible issues
  or leaving partially applied issue-tree changes.

## Open questions

- None at the product layer. Technical delivery decisions are owned by the SRD.
