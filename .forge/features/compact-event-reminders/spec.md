# Compact Event Reminders

Status: Implemented locally

Members reading `#reminders` should be able to scan a busy schedule without
scrolling through a full card and description for every event. The user approved
compact reminders with clearer grouping on 2026-09-06.

## Interface and acceptance

- Keep Today, Tomorrow, Next Week, and Sunday weekday sections; show the date
  once in each section heading.
- Show each event's linked name, time range, location, and tag. Full details and
  the Interested action remain available through the Discord event link.
- Keep the purple accent; remove repeated thumbnails and field grids.
- Continue busy sections in bounded cards, retaining every eligible event once
  in the selector's chronological order.
- Keep a short introduction and footer with opt-in and Blade links.

## Scope and decisions

Only Club reminder presentation changes. Preserve eligibility, schedules, time
zone, destinations, and audience pings. Hackathon/issue reminders and Blade UI
are outside this change. Linked details instead of excerpts is an implementation
choice under the approved refinement. No blocking product questions remain.
