# Compact Event Reminders Test Cases

Cron tests live in `apps/cron/src/tests/event-reminders.test.ts` and
`event-announcement-config.test.ts` with an injected sender. Preserve the seven
existing selector/window/DST cases.

## Combined announcements

- A 14-event Sunday schedule spanning all seven days produces one container in
  one message, with every date and event link included.
- Today, Tomorrow, and Next Week appear inside one daily card.
- Sunday stays compact even with one event on one date.
- Non-Sunday schedules use a full card for one event and compact cards at 2, 8,
  and 60 events, even on one date. Today/Tomorrow/Next Week are covered.
- Choose layouts from eligible event counts independently per destination,
  including a generic digest and an override with one full card in one execution.
- Sunday allows everyone mentions only on the first generic-destination message;
  override messages and continuations suppress everyone mentions.
- The opt-in prompt, `<id:customize>`, and cc appear outside the card. The Blade
  QR note and signup link appear in the footer. There is no RSVP instruction.
  V2 flags and webhook opt-in are present.

## Limits and safety

- Sixty events with ordinary or long/escaped labels preserve every event link
  exactly once and in order across continuations.
- Every text display is at most 2000 characters; every message totals at most
  6000 text characters; each container has at most 10 children; total components
  remain below 40.
- Continuations repeat announcement/section context and do not repeat pings.
- Event labels containing Markdown, line breaks, emoji, or mention syntax remain
  readable without introducing unintended mentions.
- A rejected first card logs its error and does not prevent later cards, their
  last event, or the in-card footer from being attempted.

## Visual review

Use the same synthetic multi-day week with main and the PR formatter. Capture
actual Discord views showing the old repeated cards and the combined week.
Also inspect a daily card containing Today, Tomorrow, and Next Week, a single-event
full card, two same-day events in a compact card, and a hack full card. Captures must show emojis,
dues, and the revised footer/opt-in copy. Record message counts and notification
readback without credentials.

## Added coverage

- A Club title links to its UUID and opens the correct full description; direct
  load, close, back/forward, missing ID, and mobile long text remain usable.
- Emoji, channel, and skip-next-week settings save, clear, and survive tag rename.
  Invalid emoji/channel inputs and unauthorized edits are rejected.
- Both editors retain the original tag ID after it is renamed and another tag
  reuses the old name; an unrelated event edit must not change its routing.
- Channel choices and saves reject effective bot View Channel/Send Messages/
  Embed Links denies. Cover missing permissions, everyone, role, and member
  overwrites, and administrator bypass. Hackathon default destinations enforce
  the same checks before writes; clearing one does not require a Discord read.
- Channel overrides apply to Sunday and daily groups, omit routed events from
  generic posts, and isolate failed destinations. Same-channel tags combine.
- The 08:00 preview remains in its webhook even for tags with live overrides;
  the 11:00 job uses those destinations.
- Tag exclusions apply only to Next Week; Today/Tomorrow/Sunday remain eligible.
- Dues-only metadata appears for desired or synchronized dues restrictions;
  private/internal events never leak through override routes.
- Migration maps tags within their scope, preserves event snapshots, seeds only
  Club OPS/Project Launch, and enforces channel syntax and the tag foreign key.
- Club and hackathon create/update reject a tag from another scope without
  changing saved events; the Club workflow rechecks scope inside its transaction.
- A reminder claim waits for an in-flight tag edit and snapshots the committed
  destination/emoji. Clearing its only destination produces no delivery.
- Hackathon tag overrides and emoji affect 15-minute announcements without
  changing ledger/retry behavior or Discord event links. Published and unpublished
  Discord events both retain their description in a full card.
