# Alumni Dashboard Spec

Status: Proposed

## User-facing purpose

Blade should give alumni a private home that keeps the useful parts of the
member dashboard while shifting its focus toward staying involved with Knight
Hacks. Alumni should see current ways to help, contact the current officers,
support the organization, and keep their career history current.

Members whose graduation date has passed must confirm that they graduated or
correct their graduation date before Blade chooses their dashboard. Guild
status and the Discord alumni role remain automatic from the saved graduation
date.

## Users / actors

- Alumni with a Knight Hacks member profile.
- Current members whose saved graduation date has passed.
- Officers and other users granted permission to manage the alumni bulletin.
- The existing Guild and Discord alumni workflows, which continue to use the
  saved graduation date without waiting for Blade confirmation.

## User-visible interface

### Graduation confirmation

When a member's graduation date has passed and they have not confirmed it,
Blade shows a required dialog before displaying a dashboard. The dialog cannot
be dismissed without choosing one of these paths:

- `I graduated` confirms alumni status and opens the alumni dashboard.
- `My graduation date changed` opens graduation term and year fields. The
  member must choose a future graduation date before returning to the current
  member dashboard.

Changing a graduation date to the future makes the member current again. Blade
asks for confirmation again if that date later passes.

### Alumni dashboard

The desktop dashboard fits within the available screen height. A compact
summary and action area stays visible. The bulletin fills the remaining space
at the bottom and scrolls inside its own container. Mobile uses normal page
scrolling, with actions before the bulletin.

The always-visible area contains:

- A donation card in the position previously used for dues. It retains the
  existing Supporter, Contributor, Partner, and custom Stripe donation choices.
- A link to the alumni Discord channel.
- A career summary with current company, title, and city when present, followed
  by past companies. `Update career history` opens the career section of Member
  Settings.
- Current President, Vice President, Secretary, and Treasurer cards. Each card
  shows the member's profile picture, name, office, role email, and a Discord
  profile link when a Discord ID exists.
- A personal Knight Hacks recap.
- The existing member QR code and profile settings actions.

Officer role emails are:

- President: `president@knighthacks.org`
- Vice President: `vp@knighthacks.org`
- Secretary: `secretary@knighthacks.org`
- Treasurer: `treasurer@knighthacks.org`

The recap always shows `Member since` and `Class of`. It adds the following
statistics when Blade has meaningful data:

- Lifetime points.
- Total club events attended.
- First recorded Knight Hacks club event.
- Most active semester, using Spring, Summer, and Fall.
- Most-attended club event category.

The recap omits unavailable or zero-value optional statistics. The remaining
content expands into the freed space, and the dashboard never displays `N/A`.

### Bulletin

The bulletin displays all published, non-archived items whose publication
window includes the current time. Each item has a required title and may
include:

- Plain text or Markdown body content.
- One image with alternative text.
- One primary action that opens either a Blade form or an external URL.

External actions open in a new tab. Blade form actions stay in Blade and retain
the form's normal access rules. If no bulletin items are active, alumni see
`Nothing needs your attention right now.`

### Alumni administration

Authorized users get an `Alumni` destination in Blade's admin navigation. The
page displays bulletin items as independent cards rather than grouping them
into categories.

Administrators can:

- Create and edit bulletin items.
- Save drafts, publish now, or schedule publication.
- Set an optional expiration time.
- Drag items into display order.
- Archive, restore, and republish items.
- Upload, replace, or remove an item image.
- Preview an individual item and the complete alumni dashboard at desktop and
  mobile sizes.

Expired items leave the alumni dashboard and appear in the admin archive.
Archived and expired items remain recoverable. This feature does not add an
admin activity feed.

## Scope

### In scope

- Mandatory one-time graduation confirmation after each graduation-date cycle.
- A private Blade alumni dashboard that replaces the current member dashboard
  for confirmed alumni.
- Donation, alumni Discord, career, recap, officer contact, QR, and settings
  surfaces.
- An admin-managed bulletin with images, Markdown, links, Blade forms,
  scheduling, ordering, preview, and archive behavior.
- A dedicated permission for alumni dashboard administration.
- Current officer discovery from Blade role assignments.

### Out of scope

- Graduation reminder email.
- An alumni dashboard outside the Club member experience.
- Guild profile promotion inside the alumni dashboard.
- Upcoming events, event-history lists, recent forms, dues status, or dues
  payment.
- Hackathon attendance and hackathon history.
- Officer history, former board positions, Dev Lead, and Hack Lead.
- Legacy photo galleries and `Day in History`.
- Bulletin comments, categories, analytics, or activity history.
- Donation fulfillment or payment tracking inside Forge.
- Changes to automatic Guild alumni labels or Discord alumni role assignment.

## Vocabulary

- `Current member`: A member whose saved graduation date has not passed.
- `Alumni candidate`: A member whose graduation date has passed but who has not
  completed the required Blade confirmation.
- `Confirmed alumni`: A member whose graduation date has passed and who chose
  `I graduated`.
- `Bulletin item`: One officer-managed piece of alumni content with a title and
  optional body, image, and primary action.
- `Active bulletin item`: A published, non-archived item inside its publication
  window.
- `Archived item`: A manually archived or expired item that does not appear to
  alumni but remains available to administrators.

## Acceptance criteria

- A current member continues to see the current member dashboard.
- An unconfirmed alumni candidate cannot dismiss or bypass the graduation
  dialog.
- Confirming graduation opens the alumni dashboard without changing the saved
  graduation date.
- Correcting graduation requires a future term and year and returns the member
  to the current dashboard.
- Guild alumni labels and Discord alumni role assignment continue to follow the
  saved graduation date without using the Blade confirmation.
- A confirmed alumnus sees the donation, Discord, career, officer, recap, QR,
  settings, and bulletin surfaces.
- The desktop action area stays visible within the dashboard height while the
  bulletin scrolls in its remaining space.
- Mobile places actions before the bulletin and avoids nested page scrolling.
- The bulletin shows active items in the administrator's order and displays the
  approved empty message when none exist.
- Bulletin cards render plain text, safe Markdown, images, Blade form actions,
  and external actions in their approved combinations.
- The officer section reflects current role assignments in President, Vice
  President, Secretary, and Treasurer order. Missing offices disappear, and
  multiple assignees for one office all appear.
- The recap never displays placeholder statistics. Optional statistics
  disappear when the source data is empty.
- The career card shows saved private career data regardless of public Guild
  visibility and links to the career editor.
- Only authorized administrators and officers can open the alumni admin page or
  change bulletin content.
- The admin preview uses the same card and dashboard presentation alumni see.
- Draft, scheduled, expired, and archived items do not appear before they
  become active.
- Expired and archived items remain recoverable from the admin page.
- Existing alumni with no confirmation record receive the required dialog on
  their next dashboard visit.

## Open questions

- None. The reverse prompt was approved on 2026-07-25.
