# Compact Event Reminders SRD

Keep presentation in `apps/cron/src/crons/reminder-logic.ts`, already used by
both Club reminder webhooks. Preserve the shared selector, scheduler, injected
clock, sender, and candidate interface.

Follow [Forge principles](../../../docs/agentic-development/forge-engineering-principles.md)
and [design guidance](../../../docs/agentic-development/frontend-design-skill.md):
use native Discord embed typography, the existing purple accent, and dated rows.

## Payload contract

Count events after grouping and filtering. At most two eligible events retain
the original per-event embeds and separate section headings. Three or more
eligible events use compact cards throughout the reminder, even when spread
across different days. This preserves detail for small schedules without letting
a busy week produce many large cards.

Compact mode uses one or more embeds per section, continuing after eight events
or before 4096 description characters. Send each embed separately to stay below the 6000 aggregate character
limit. See [Discord embed limits](https://docs.discord.com/developers/resources/message#embed-limits).
Normalize whitespace, bound label lengths, escape Markdown, and retain complete
links. Split only between rows; repeat date context in continuation titles.
The selector still owns candidate validity and ordering. Preserve all existing
introduction and footer strings verbatim; compacting the layout does not
authorize rewriting the copy.

## Delivery failures

Catch terminal send failures around each event card, log the card title and
error using the existing logger, and continue with later cards and the footer.
Apply the same handling to full and compact cards, including continuations and
later date sections. Do not add application-level retries. Failures sending the
introduction, standalone section headings, or footer still propagate to
`CronBuilder`.

## Access and compatibility

No new API or permission surface. Existing visibility and webhook credentials
control access. Preserve Sunday everyone and daily reminder-role pings. No
schema, dependency, environment, or yearly configuration changes. Normal cron
release/revert controls rollout and rollback. The user authorized a development-webhook preview on 2026-09-06. That preview
suppresses notifications; production mention behavior stays unchanged. Local
tests use an injected sender.

## Verification

Extend cron tests for the two-to-three-event transition, ignored candidates,
counts across days, compact rows, continuation, 60-event volume, long labels,
links, and unchanged notifications. Run cron tests, format, lint, and typecheck.
Inspect desktop and 320px local previews, then verify the authorized development
preview in the actual Discord desktop client. PR evidence uses actual Discord
screenshots; native mobile rendering remains unverified.
