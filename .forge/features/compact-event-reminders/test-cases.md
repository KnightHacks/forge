# Compact Event Reminders Test Cases

Tests live in `apps/cron/src/tests/event-reminders.test.ts` with an injected
sender. Preserve the seven existing selector/window/DST cases.

## Combined announcements

- A 14-event Sunday schedule spanning all seven days produces one container in
  one message, with every date and event link included.
- Today, Tomorrow, and Next Week appear inside one daily card.
- One or two events use the same grouped card with one section heading.
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
Also inspect a daily card containing Today, Tomorrow, and Next Week. Record
message counts and notification readback without credentials.
