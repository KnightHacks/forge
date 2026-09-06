# Compact Event Reminders SRD

Keep the implementation in `apps/cron/src/crons/reminder-logic.ts`, used by both
Club reminder webhooks. Preserve the existing candidate selector, calendar
windows, injected clock, and sender.

## Presentation and payload

Follow `packages/api/src/utils/issues/reminders.ts`: Components V2 containers,
Markdown headings, bold linked titles, and `-#` secondary text. These are native
Discord cards, replacing the old rich embeds.

Build dated text sections across the entire announcement, then pack them into
one purple container whenever possible. A normal seven-day, 14-event week fits
in one card. Today/Tomorrow/Next Week share the same daily card. There is no
fixed event-count split or separate style for small schedules.

Match the issue reminder's conservative bounds: 2000 characters per text display,
6000 characters across the message, and 10 children per container. Reserve room
for the title, Blade footer, and outside opt-in/audience text. Split text only between whole event
rows and retain the section heading on continuation. Reserve two container
children for the footer separator and footer. Send one container per message,
well below the 40-component message maximum.

Use `MessageFlags.IsComponentsV2` and `withComponents: true` for the webhook.
Do not combine V2 components with legacy `content` or `embeds` fields.
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
There is no separate footer delivery and no RSVP copy.

## Compatibility and validation

No schema, dependency, environment, or permission-surface changes. Existing
webhook destinations and cron schedules remain. Verify weekly and daily grouping,
small schedules, all links, 60-event overflow, Markdown/mentions, failed sends,
and the existing selection/DST cases. Run cron tests, format, lint, and typecheck.
Inspect actual Discord desktop screenshots for weekly and daily cards. Native
mobile rendering must be reported separately if unverified.
