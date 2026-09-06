# Compact Event Reminders

Status: PR open

Members should be able to scan the whole Sunday announcement, even when events
are spread across the week. Use the existing issue reminder as the visual
reference: one purple card, section headings, linked event names, and small
secondary text.

## Interface and acceptance

- Combine the Sunday weekdays into one weekly card whenever Discord's limits allow.
- Combine Today, Tomorrow, and Next Week into one daily card.
- Use the same grouped layout for small schedules; no event-count style switch.
- Keep event links, time ranges, locations, and tags in chronological order.
- Use the in-card footer for the Blade QR reminder and signup link. Put the
  reminder-role opt-in prompt, Channels & Roles shortcut, and cc below the card.
  Remove the obsolete RSVP instructions.
- Split only when component/text limits require it; retain every event once and
  repeat the announcement and section context in continuations.
- Log a failed card and attempt later continuation cards.

## Scope

Only Club reminder presentation and delivery failure handling change. Preserve
eligibility, schedules, time zone, destinations, and the intended Sunday everyone
and daily reminder-role audiences. The user explicitly requested the revised
wording and combined announcement on 2026-09-06; this supersedes the earlier
copy-preservation and one/two-event full-card decisions. Issue reminder code,
shared packages, Hackathon reminders, and Blade UI remain outside the change.
