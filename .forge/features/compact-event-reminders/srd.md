# Compact Event Reminders SRD

Keep Club grouping in `apps/cron/src/crons/reminder-logic.ts` and share event-row
formatting with hackathon announcements through `reminder-row.ts`. Preserve the
existing eligibility rules, calendar windows, injected clock, and sender.

## Presentation and payload

Follow `packages/api/src/utils/issues/reminders.ts`: Components V2 containers,
Markdown headings, bold linked titles, and `-#` secondary text. These are native
Discord cards used for Sunday and multi-date digests.

Build dated text sections across the entire announcement, then pack them into
one purple container whenever possible. A normal seven-day, 14-event week fits
in one card. Today/Tomorrow/Next Week share the same daily card when more than
one eligible date remains for that destination. On non-Sundays, exactly one
eligible date uses one full native embed per event, without a count cutoff.
Keep its description, logo, Date/Location/Start/End fields, emoji-prefixed linked
title, dues marker, and linked Blade note. Hack 15-minute notices use the same
full-card builder with their Discord event URL and description.

Match the issue reminder's conservative bounds: 2000 characters per text display,
6000 characters across the message, and 10 children per container. Reserve room
for the title, Blade footer, and outside opt-in/audience text. Split text only between whole event
rows and retain the section heading on continuation. Reserve two container
children for the footer separator and footer. Send one container per message,
well below the 40-component message maximum.

Use `MessageFlags.IsComponentsV2` and `withComponents: true` for the webhook.
Do not combine V2 components with legacy `content` or `embeds` fields.
Full cards send `embeds` and optional ordinary `content`, without the V2 flag.
Both the webhook and override-channel sender accept the two payload shapes.
[Discord component reference](https://docs.discord.com/developers/components/reference)
and [webhook execution](https://docs.discord.com/developers/resources/webhook#execute-webhook)
document the supported payloads.

Escape Markdown, normalize whitespace, bound event labels, and neutralize `@`
mentions in event-provided text because Text Display components can notify users.
Allow only the intended everyone or reminder-role mention on the first message;
continuations contain no opt-in/audience text and allow no mentions. Development
previews override allowed mentions to suppress notifications.

## Delivery failures

Catch and log a terminal card-send failure, including its announcement title and
part number, then continue. Do not introduce another retry loop. The Blade QR
note and signup link live inside each card. The first message also includes a
top-level Text Display with the role opt-in prompt, `<id:customize>`, and cc.
For full cards, the first message carries the heading and opt-in/audience in
ordinary content; subsequent full cards do not repeat those mentions.
There is no separate footer delivery and no RSVP copy.

## Compatibility and validation

No dependency, environment, or new permission capability changes. Existing
preview destinations and cron schedules remain. New channel-choice procedures
reuse the respective event-edit gate and are declared in audit coverage. Verify
grouping, routing, small schedules, links, overflow, Markdown/mentions, failed
sends, and selection/DST cases. Run the Forge precommit gate and affected
consumer tests. Inspect actual Discord and Blade screenshots; report native
Discord mobile rendering separately if unverified.

## Tag configuration and details

The user requested Blade event drill-in and tag-owned announcement settings,
then extended applicable behavior to hackathon announcements. Scope now includes
Blade, cron, API, validators, and the DB schema/migration. Hacker portal UI and
hackathon announcement links are unchanged by explicit user choice.

Persist nullable `Event.tagId` with a set-null FK and backfill exact normalized
names within the matching Club/hackathon tag catalog. Add tag `emoji`,
`announcementChannelId`, and `skipNextWeek` columns with safe defaults. Seed Club
OPS/Project Launch exclusions once in migration, never from runtime names.
Retain label/color/points snapshots. Creation and retagging persist the ID.
Unmatched historical snapshots retain null configuration until explicitly edited.

Validate channel IDs with the existing Discord gateway against the configured
guild, supported text/announcement types, and the bot's effective View Channel,
Send Messages, and Embed Links permissions. Full cards require embed permission
even when text messages are allowed. Apply Discord's
[permission overwrite precedence](https://docs.discord.com/developers/topics/permissions#permission-overwrites)
when listing choices and validating a saved override. Reuse current event-edit permission
gates for channel choices and tag mutations. Do not broaden event visibility.
At delivery, tag routes replace the generic destination; a failed override send
is logged without falling back to the generic board. Hackathon delivery retains
its ledger, lease, and ambiguous-outcome handling. Its content snapshot adds an
optional emoji; older snapshots remain readable. An already attempted delivery
retains its original destination and content across tag edits. The 08:00 Club
preview sends every destination group to its preview webhook, avoiding an early
live announcement.

Admin read DTOs and edit forms retain the stable tag ID. A name lookup is only
used for historical events with no linked tag, so renaming a tag and reusing its
old name cannot silently reroute an event when its location is edited.

Use the existing Blade dialog and Markdown primitives. Keep the member page and
its reads server-side; use a small client dialog for URL-based dismissal.
Only already-authorized member event data may populate the dialog. Unknown,
expired, or inaccessible IDs must not expose event details. Keep sign-in return
URLs within Blade and preserve the selected ID.

Member DTOs expose the effective dues requirement separately from whether this
member is locked. A paid member still sees the requirement, including when a
dues-to-public change has not synchronized. The modal preserves the rest of the
query string on dismissal, focuses its title on open, and restores its opener.

Hackathon announcements retain Discord event URLs and include the existing
description in a full native embed, bounded by Discord's embed description
limit. Hack tag imports retain their existing catalog-copy
behavior; newly imported tags start without routing overrides.

Migration rollout: apply additive columns/backfill before new readers deploy.
Rollback code first; retain columns and tag configuration. No data deletion or
production migration is part of this task. Validate with a disposable local DB.
