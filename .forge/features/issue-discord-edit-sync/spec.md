# Issue Discord Edit Sync Spec

Status: Approved by human (2026-10-27)

## User-facing purpose

When an issue is created in Blade, a starter embed is posted to the owning team's Discord channel with a discussion thread attached. Today that embed is a snapshot: editing the issue in Blade leaves Discord showing stale values (for example, an issue moved to Finished still reads "Backlog"). After this change, editing an issue in Blade updates its Discord starter embed so the channel reflects the current issue.

## Users / actors

- Club officers and team members who create and edit issues in Blade (`/admin/issues`).
- Discord users who read the team issue channels and threads.

## User-visible interface

- The existing starter embed in the team's issue channel: title, description, Team, Status, Priority, Due, Assigned, Club event, Hierarchy, and footer.
- After an edit that changes anything the embed shows, the same message updates in place. It keeps its thread, replies, and position in the channel.
- If the description is longer than one embed can hold, the edited embed shows the first part and a "Full description in Blade" link.
- When an edit adds assignees, a `cc:` message in the thread pings only the newly added people. Existing and removed assignees are not pinged.
- Images in an issue description appear in Discord as a "🖼 Image: <alt text>" link to the issue in Blade, on both new and edited embeds, instead of raw `![…](/_managed/…)` text.

## Scope

### In scope

- Updating the starter embed after `issues.update` when the rendered embed changes.
- Long-description fallback link on the edited embed.
- `cc:` thread message for newly added assignees.
- Image links in Discord issue descriptions (creation and edit).

### Out of scope

- Change-note messages posted into the thread.
- Re-pinging existing assignees, or pinging the team role when all assignees are removed.
- Updating the bot's follow-up thread messages (description continued, Links, `cc:`).
- Moving threads when an issue changes team.
- Archiving or locking threads when an issue is Finished or archived.
- Creating a thread for issues that never got one.
- Showing images inline in Discord (would require uploading private files to Discord).
- Assigning members of non-owning (visible) teams.
- Renaming the Discord thread when the issue is renamed (Discord rename rate limits).

## Vocabulary

- `starter embed`: the bot message posted to the team channel on issue creation; its ID is the thread ID stored on the issue.
- `follow-up messages`: the bot's own messages inside the thread (description continued, Links, `cc:`).

## Acceptance criteria

- Editing title, description, status, priority, due date, assignees, linked event, or parent updates the starter embed to match Blade.
- Edits that neither change the rendered embed nor add assignees (for example, team visibility or links only) make no Discord request.
- A Discord failure never fails or rolls back the Blade edit, and a slow Discord delays a save by at most a few seconds.
- A failure to update the embed does not stop newly added assignees from being pinged.
- Issues without a Discord thread are edited normally with no Discord request.
- Embed edits trigger no mentions; only newly added assignees are pinged, once, in the thread.
- No `/_managed/` image text appears in Discord issue embeds.

## Open questions

- None.
