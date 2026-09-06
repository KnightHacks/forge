# Compact Event Reminders Status

Current phase: PR open; CI and review pending; not deployed

## Decisions

- 2026-09-06: User approved compact Club reminders. Selection, scheduling,
  destinations, and production pings stay unchanged.
- 2026-09-06: Restored the original daily introduction, Sunday introduction,
  and footer after user feedback. Scope is layout refinement, not copy editing.
- 2026-09-06: User requested retaining big cards for small schedules. Use the
  original layout for one or two eligible events across the whole reminder,
  and compact cards for three or more.
- Keep presentation in cron: dated sections, up to eight rows per card, linked
  details, and the existing purple accent. No shared-package changes.
- Branch: `cron/compact-event-reminders`, based on main at `566b4ee5`.
- [Issue #542](https://github.com/KnightHacks/forge/issues/542).
- [PR #543](https://github.com/KnightHacks/forge/pull/543).

## Progress

- [x] Trace both webhook callers and the shared selector.
- [x] Implement compact cards and regression tests.
- [x] Verify payload limits, links, long labels, and existing date windows.
- [x] Send a development preview and inspect the actual Discord client.
- [x] Prepare actual Discord screenshots for the PR; remove superseded mock images.
- [x] Commit, push, and open the PR with actual Discord screenshots.

## Validation

- `pnpm --filter=@forge/cron test`: 36 tests passed across 6 files.
- Presentation regressions failed before their respective fixes. All 14 reminder
  cases now pass, including full cards for one or two events, compact cards from
  three events, ignored candidates, and counting across days.
- `pnpm format`: passed, 24 tasks.
- `pnpm lint`: passed, 31 tasks; existing warnings in other packages.
- `pnpm typecheck`: passed, 33 tasks.
- `pnpm build`: blocked in unchanged `apps/2026` during page-data collection for
  `/api/hacker-sdk/[...hackerSdk]`. Local environment lacks
  `KHIX_HACKER_PORTAL_CLIENT_ID` and `KHIX_HACKER_PORTAL_ORIGIN`.
- Cron has no compilation step. No React changes; React analysis is not applicable.
- `git diff --check`: passed.
- Added exact-copy regression assertions for both introductions and the footer;
  they failed against the rewritten copy before restoration. All 36 cron tests
  pass after the correction.
- 60-event fixture: 63 messages / 60 embeds before; 10 messages / 8 embeds after.

## Discord verification

The user authorized development-webhook previews. Both configured Club reminder
webhooks were verified to target Dev@KnightHacks, channel `#bot`.
Sent 14 synthetic events in four embeds plus introduction/footer. Readback
confirmed six messages and zero user, role, or everyone notifications; preview
sends used empty allowed mentions. Production mention behavior is unchanged.

Inspected the actual Discord desktop client for the eight-row card, its
continuation, links, and long-title ellipsis. Native mobile rendering is not
verified; the earlier local approximation passed overflow checks at 320px.

[Day card](evidence/discord-day.png) and
[continuation](evidence/discord-continuation.png) are cropped from the actual
Discord screenshot. The surrounding server sidebar is excluded. These are
synthetic event names and links, labeled as a development layout preview.
[Delivery readback](evidence/discord-delivery.json) records message IDs and
notification checks without credentials.

[Open the first event card](https://discord.com/channels/1151877367434850364/1284582557689843785/1546257107324637216).

The development preview introduction and footer were edited in place to restore
the original wording. Readback matched both updates with zero notifications.
PR screenshots show the unchanged event cards without the superseded copy.

## Before and after comparison

Sent the same eight synthetic Monday events through the main formatter and the
PR formatter. The original introductions and footer match in both versions.
The development-only comparison label identifies each version; notifications
were disabled and readback confirmed no user, role, or everyone mentions.

- Before: 11 messages, including eight individual event cards and a weekday heading.
- After: three messages, including one card containing all eight event rows.
- Card counts exclude Discord's automatic footer-link preview.

The user supplied three actual Discord screenshots. They are saved unchanged as
[before](evidence/discord-before.png),
[more of the original cards](evidence/discord-before-more.png), and
[after](evidence/discord-after.png). The PR pairs the first and third screenshots
and includes the second as additional evidence of the repeated cards. These are
different crops, so they demonstrate the layout without claiming an exact
reduction in rendered height. [Comparison delivery](evidence/discord-comparison.json)
records formatter commits, message counts, and links.

## Review notes

CodeRabbit requested clearer embed cardinality; the SRD now states one or more
embeds per compact section. Its delivery-failure suggestion changes the existing
stop-on-send-failure policy inherited from main. That behavior remains outside
this presentation change; no delivery errors are swallowed.

The previous PR revision passed CI, including the repository build. Local build
verification remains blocked by the missing `apps/2026` environment values above.
