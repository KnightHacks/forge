# Compact Event Reminders

Status: Implemented locally

Members reading `#reminders` should be able to scan a busy schedule without
scrolling through a full card and description for every event. The user approved
compact reminders with clearer grouping on 2026-09-06.

## Interface and acceptance

- When the entire reminder contains one or two eligible events, retain the
  original full cards, descriptions, thumbnails, fields, and section headings.
- With three or more eligible events, use compact cards for all sections.
  Count across the reminder, not separately within each day.
- Keep Today, Tomorrow, Next Week, and Sunday weekday sections. Compact cards
  show the date once in each section heading.
- Show each event's linked name, time range, location, and tag. Full details and
  the Interested action remain available through the Discord event link.
- Keep the purple accent; omit repeated thumbnails and field grids in compact cards.
- Continue busy sections in bounded cards, retaining every eligible event once
  in the selector's chronological order.
- Preserve the original daily introduction, Sunday introduction, and footer
  wording exactly, including opt-in and Blade links.

## Scope and decisions

Only Club reminder presentation changes. Preserve eligibility, schedules, time
zone, destinations, and audience pings. Hackathon/issue reminders and Blade UI
are outside this change. Linked details instead of excerpts is an implementation
choice under the approved refinement. No blocking product questions remain.
