# Hackathon dashboards in Blade

Blade includes a generic dashboard for every hackathon. Use it unless an event
needs a meaningfully different layout or checked-in experience. A custom route
is an escape hatch, not a requirement for each event.

## How routing works

| Route               | Behavior                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| `/hackathon`        | Finds the current participant-lifecycle hackathon and redirects to its slug. |
| `/hackathon/[slug]` | Provides the generic dashboard for any hackathon in the database.            |
| `/hackathon/<slug>` | A static event folder that overrides the generic route for that slug.        |

A hackathon is considered current from `applicationOpen` through `endDate`.
When multiple hackathons overlap, Blade selects the one with the earliest
`applicationOpen`, then the earliest `startDate`, then the earliest `endDate`.
An explicit slug route remains available outside this window.

The generic route loads the user's attendee record for that specific hackathon.
It renders `HackerDashboard` before check-in and `BaseHackathonDashboard` after
the attendee reaches `checkedin` status.

## Set up a hackathon

1. Create the hackathon in `/admin/hackathon/manage`.
   - `name` is the URL slug and database identifier. Use 2 to 64 lowercase
     letters, numbers, and hyphens, with a letter or number at each end.
   - `displayName` is the event name shown to users.
   - Dates must follow this order:
     `applicationOpen < applicationDeadline <= confirmationDeadline <= startDate < endDate`.
2. Add optional application and email presets only when the event needs them.
   - Register application presets in
     `packages/consts/src/hackathons/index.ts` and
     `apps/blade/src/app/_components/dashboard/hacker/hackbackgrounds/index.ts`.
   - Register email presets in
     `packages/email/src/hackathons/templates.ts`.
3. Create the event schedule in `/admin/hackathon/events` and associate every
   event with the correct hackathon.
4. Use the exact event tag `Check-in` for the event that admits confirmed
   hackers. The tag controls attendee status changes and later event access.

At this point `/hackathon/<slug>` works through the generic route. No dashboard
code is required. The `hackathon/layout.tsx` route layout intentionally renders
only its children, keeping hackathon pages free of Blade dashboard chrome.

## Add a custom dashboard

Create `apps/blade/src/app/hackathon/<slug>/page.tsx`, where `<slug>` exactly
matches the hackathon's database `name`. Next.js gives this static route
priority over `[slug]`.

Start from `apps/blade/src/app/hackathon/[slug]/page.tsx` and preserve its core
responsibilities:

- Require an authenticated session.
- Fetch the hackathon by its explicit slug and call `notFound()` when missing.
- Fetch the attendee record with the same hackathon slug.
- Render the application and status experience before check-in.
- Render the event dashboard only for a `checkedin` attendee.
- Keep the tRPC hydration boundary. The `/hackathon` layout is intentionally
  chrome-free so event dashboards do not inherit Blade dashboard navigation; add
  event-specific navigation inside the page only when the event needs it.

Compose the exports from
`apps/blade/src/app/_components/dashboard/hackathon-dashboard/components.tsx`
where possible. Shared components already cover the QR code, wallet pass,
hacker guide, issue reporting, countdown, and upcoming events. Keep mutations
and status rules in shared code instead of copying them into an event route.

Always pass an event-specific `guideHref` to `BaseHackathonDashboard`. Its
current fallback points to the old Knight Hacks VIII guide.

## Required behavior checklist

- [ ] Unauthenticated users cannot access the dashboard.
- [ ] A missing or misspelled database slug returns a not-found page.
- [ ] A user without an application sees the correct state before applications
      open, while they are open, and after they close.
- [ ] Existing applicants can see an accurate status for `pending`, `accepted`,
      `waitlisted`, `confirmed`, `withdrawn`, `denied`, and `checkedin`.
- [ ] Accepted hackers can confirm before the confirmation deadline.
- [ ] Confirmed hackers can withdraw through a destructive confirmation dialog.
- [ ] Checked-in hackers can open their QR code and wallet pass.
- [ ] The hacker guide, Discord, support, and event links point to current
      resources.
- [ ] The countdown uses the current hackathon's `endDate`.
- [ ] Upcoming events are scoped to the current hackathon ID.
- [ ] Points are shown only if the event uses them and the number helps hackers.
- [ ] The page works on mobile, in dark mode, and with keyboard navigation.
- [ ] Loading, empty, and error states remain usable.
- [ ] Only intentionally selected profile fields are rendered.

Do not dump the full hacker object into the dashboard. It contains personal
application data that most attendees do not need to see during the event. Add a
field such as shirt size or allergies only when the user has a clear reason to
review or update it.

Classes are no longer part of active check-in behavior. Do not add class UI for
a new hackathon. A leaderboard is also not built into the base dashboard; add
one only with an event-specific product requirement and a supported API.

## Status expectations

| Status             | Expected experience                                             |
| ------------------ | --------------------------------------------------------------- |
| No attendee record | Date-aware application prompt or closed state.                  |
| `pending`          | Application received, with no confirmation action.              |
| `accepted`         | Status plus confirmation action until the deadline.             |
| `waitlisted`       | Clear waitlist status and event guidance.                       |
| `confirmed`        | Confirmed status, QR access, and destructive withdrawal action. |
| `withdrawn`        | Clear final status with no confirmation action.                 |
| `denied`           | Clear final status with no confirmation action.                 |
| `checkedin`        | Full event dashboard and on-site tools.                         |

## Operations before launch

- Confirm the hackathon record, slug, dates, theme, and optional presets in
  `/admin/hackathon/manage`.
- Confirm every schedule item is attached to the right hackathon in
  `/admin/hackathon/events`.
- Test both QR and manual check-in in `/admin/hackathon/check-in` with an account
  that has `CHECKIN_HACK_EVENT`.
- Use `/admin/hackathon/hackers` to verify attendee statuses and confirmation
  behavior.
- Check in a confirmed hacker through the exact `Check-in` event, then verify
  their status becomes `checkedin` and their attendance and points are recorded.
- Check the same hacker into a normal event and verify duplicate-check-in rules.

Discord event roles are not configurable per hackathon yet. Check-in currently
grants an event role only for BloomKnights. Do not copy that hardcoded role logic
for another event; future role support should come from database-backed
hackathon configuration.

## Known debt and gotchas

- The base hacker-guide fallback still points to Knight Hacks VIII. Pass an
  explicit `guideHref` until the guide becomes database-configurable.
- Static event routes can drift from `[slug]`. Recheck them whenever shared
  routing, status, or application behavior changes.
- Upcoming-event formatting contains legacy date adjustments. Verify schedule
  times in a production-like environment before launch.
- The nullable attendee `class` column is legacy data and is intentionally
  inactive.
- The base dashboard has no general leaderboard implementation.
