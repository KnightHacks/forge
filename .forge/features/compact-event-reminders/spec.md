# Compact Event Reminders

Status: expanded implementation; PR open

Members should be able to scan the whole Sunday announcement, even when events
are spread across the week. Use the existing issue reminder as the visual
reference: one purple card, section headings, linked event names, and small
secondary text.

## Interface and acceptance

- Combine the Sunday weekdays into one weekly card whenever Discord's limits allow.
- Combine Today, Tomorrow, and Next Week into one daily card when the destination
  has events on multiple dates.
- For a non-Sunday destination covering just one date, retain a full event card
  with description for every event, regardless of count. Sunday stays compact.
- Keep event links, time ranges, and locations in chronological order. Show the
  configured tag emoji before the title instead of a tag name in the metadata.
- Use the in-card footer for the Blade QR reminder and signup link. Put the
  reminder-role opt-in prompt, Channels & Roles shortcut, and cc below the card.
  Remove the obsolete RSVP instructions.
- Split only when component/text limits require it; retain every event once and
  repeat the announcement and section context in continuations.
- Log a failed card and attempt later continuation cards.

## Scope

Scope includes Club and hackathon reminder presentation/routing, Blade member
event details, tag administration, API validation, and an additive DB migration.
Preserve eligibility, schedules, time zone, intended audiences, and hackathon
delivery tracking. The 08:00 Club preview stays in its preview webhook; only the
11:00 announcement sends to tag destinations. Issue reminder code, the hacker
portal UI, and unrelated apps remain outside this change.

The user requested revised copy, combined weekly announcements, persisted tag
settings, and Blade description links. The final layout decision is based on
dates per destination: non-Sunday single-date reminders always use full cards;
Sunday and multi-date reminders use the compact digest.

## Event details and tag configuration

- Club event titles link to `/member/events?selected=<event UUID>`. Opening the
  link opens an accessible description modal; closing it clears selection.
- Full descriptions stay in Blade and in single-date full cards. Retain
  Discord/calendar actions in Blade.
- Club and hackathon tags have an optional Unicode emoji and announcement
  channel override. Emoji appear before event titles instead of the tag label
  in reminder metadata. A blank emoji adds no substitute icon.
- Club tags also control Skip Next Week. Seed OPS and Project Launch only;
  the Project Launch setting applies to the whole tag, replacing title heuristics.
- A configured channel receives that tag's weekly and daily Club reminders,
  instead of the generic channel. Group tags sharing a destination together.
- Hackathon tag channels override the hackathon's announcement channel. Keep
  hackathon Discord event links, 15-minute timing, and hacker-role mentions.
  Skip Next Week is not applicable to that flow. These single-event notices keep
  full cards and descriptions, including when there is no Discord detail link.
- Show **DUES REQUIRED** for dues-only Club events, including an effective
  synchronized dues restriction. Keep role/internal visibility restrictions.
- Tag configuration follows tag identity across renames and applies to existing
  linked events. Event label/color/points snapshots retain their old semantics.
