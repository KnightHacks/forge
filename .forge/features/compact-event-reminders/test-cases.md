# Compact Event Reminders Test Cases

Tests live in `apps/cron/src/tests/event-reminders.test.ts` with an injected
sender. Preserve the seven existing selector/window/DST cases.

## Combined announcements

- A 14-event Sunday schedule spanning all seven days produces one container in
  one message, with every date and event link included.
- Today, Tomorrow, and Next Week appear inside one daily card.
- Sunday stays compact even with one event on one date.
- Non-Sunday single-date schedules use one full embed per event at 1, 2, 8, and
  60 events; Today-only, Tomorrow-only, and Next-Week-only schedules are covered.
- Choose layouts independently per destination, including a multi-date generic
  digest and a same-date override containing many full cards in one execution.
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
Also inspect a daily card containing Today, Tomorrow, and Next Week, single-date
full cards, and a hack full card. Current captures must show configured emojis,
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
  overwrites, and administrator bypass.
- Channel overrides apply to Sunday and daily groups, omit routed events from
  generic posts, and isolate failed destinations. Same-channel tags combine.
- The 08:00 preview remains in its webhook even for tags with live overrides;
  the 11:00 job uses those destinations.
- Tag exclusions apply only to Next Week; Today/Tomorrow/Sunday remain eligible.
- Dues-only metadata appears for desired or synchronized dues restrictions;
  private/internal events never leak through override routes.
- Migration maps tags within their scope, preserves event snapshots, seeds only
  Club OPS/Project Launch, and enforces channel syntax and the tag foreign key.
- Hackathon tag overrides and emoji affect 15-minute announcements without
  changing ledger/retry behavior or Discord event links. Published and unpublished
  Discord events both retain their description in a full card.
