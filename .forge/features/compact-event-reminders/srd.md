# Compact Event Reminders SRD

Keep presentation in `apps/cron/src/crons/reminder-logic.ts`, already used by
both Club reminder webhooks. Preserve the shared selector, scheduler, injected
clock, sender, and candidate interface.

Follow [Forge principles](../../../docs/agentic-development/forge-engineering-principles.md)
and [design guidance](../../../docs/agentic-development/frontend-design-skill.md):
use native Discord embed typography, the existing purple accent, and dated rows.

## Payload contract

One embed per section, continuing after eight events or before 4096 description
characters. Send each embed separately to stay below the 6000 aggregate character
limit. See [Discord embed limits](https://docs.discord.com/developers/resources/message#embed-limits).
Normalize whitespace, bound label lengths, escape Markdown, and retain complete
links. Split only between rows; repeat date context in continuation titles.
The selector still owns candidate validity and ordering.

## Access and compatibility

No new API or permission surface. Existing visibility and webhook credentials
control access. Preserve Sunday everyone and daily reminder-role pings. No
schema, dependency, environment, or yearly configuration changes. Normal cron
release/revert controls rollout and rollback. The user authorized a development-webhook preview on 2026-09-06. That preview
suppresses notifications; production mention behavior stays unchanged. Local
tests use an injected sender.

## Verification

Extend cron tests for compact rows, continuation, 60-event volume, long labels,
links, and unchanged notifications. Run cron tests, format, lint, and typecheck.
Inspect desktop and 320px local previews, then verify the authorized development
preview in the actual Discord desktop client. PR evidence uses actual Discord
screenshots; native mobile rendering remains unverified.
