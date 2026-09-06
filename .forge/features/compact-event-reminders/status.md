# Compact Event Reminders Status

Current phase: PR open; local validation passed; not deployed

## Direction

- The user clarified that the problem is the complete weekly announcement,
  including many events across different days, and requested the issue reminder
  as the visual reference.
- Sunday weekdays now share one card. Daily Today/Tomorrow/Next Week sections
  also share one card. Small schedules use the same format.
- The user explicitly authorized tightening the copy. This replaces the earlier
  verbatim-copy and one/two-event full-card decisions.
- Use native Components V2, bold event links, small metadata, and a compact footer.
  The role opt-in prompt, Channels & Roles shortcut, and cc appear outside the
  card. Its footer now contains only the Blade QR note and signup link; RSVP
  instructions were removed at the user's request.
- Selection, schedules, destinations, and intended audiences stay the same.
- CodeRabbit's delivery fix remains: log a failed card and attempt continuations.
- Branch: `cron/compact-event-reminders`, based on main at `566b4ee5`.
- [Issue #542](https://github.com/KnightHacks/forge/issues/542).
- [PR #543](https://github.com/KnightHacks/forge/pull/543).

## Progress

- [x] Trace the actual issue reminder's container and text formatting.
- [x] Combine weekly and daily sections in a single announcement.
- [x] Retain bounded continuations, event links, selection, and delivery logging.
- [x] Replace tests for the superseded per-day/full-card behavior.
- [x] Send and inspect real Discord weekly and daily previews.
- [x] Capture a comparison using the same eight events across four weekdays.

## Validation

- `pnpm --filter=@forge/cron test`: 37 tests passed across six files.
- `pnpm format`, `pnpm lint`, and `pnpm typecheck`: passed. Lint reports
  existing warnings in other packages; no new cron warnings.
- `git diff --check`: passed.
- The two combined-announcement tests failed against the previous PR formatter:
  it sent nine messages for the full-week fixture and five for the daily fixture.
  Each now sends one message.
- Tests cover all seven weekdays, daily groups, small schedules, 60 events,
  component/text limits, escaped mentions, ordering, links, and failed delivery.
- Existing calendar-window, selection, and DST tests remain.
- Earlier `pnpm build` was blocked in unchanged `apps/2026` during page-data
  collection for `/api/hacker-sdk/[...hackerSdk]`: local configuration lacks
  `KHIX_HACKER_PORTAL_CLIENT_ID` and `KHIX_HACKER_PORTAL_ORIGIN`. The previous
  PR revision passed the build in CI.
- No React changes; React analysis is not applicable.

## Discord evidence

The user authorized development-webhook sends. Both configured Club reminder
webhooks target Dev@KnightHacks, channel `#bot`. The before/after comparison uses
the same eight synthetic events spread over Monday through Thursday:

- Main: 14 messages, including eight event embeds and four day headings.
- Revised weekly formatter: one message containing one card.
- Revised daily formatter: six events across three sections in one message/card.

API readback verified the expected containers and zero user, role, or everyone
mentions. Production audience IDs are preserved; the daily role does not exist
in the development guild. Its card screenshot excludes that unresolved mention.

Actual native Discord captures:
[before](evidence/discord-week-before.png),
[more of the original week](evidence/discord-week-before-more.png),
[combined week](evidence/discord-week-after.png), and
[combined daily view](evidence/discord-daily.png).
The weekly crops use the same scale and width. Sidebars and other conversations
are excluded. [Delivery records](evidence/discord-week-delivery.json) contain
message links and counts without credentials. Superseded per-day screenshots
were removed. Native mobile rendering remains unverified.

These screenshots precede the final copy revision: the live weekly and daily
messages now contain the Blade QR footer and outside opt-in/Channels & Roles
prompt. API readback matches the current formatter and confirms no notifications.
The final copy has not been recaptured in the native client; the separate browser
was not signed in. Clicking the relocated shortcut remains unverified.
