# Alumni Dashboard Test Cases

Status: Proposed

## Scope

These cases cover graduation confirmation, dashboard selection, alumni content,
bulletin administration, recap derivation, career display, officer contacts,
permissions, images, and responsive layout.

Email reminders, public Guild changes, Discord role changes, hackathon history,
donation payment processing, bulletin analytics, and an admin activity feed are
excluded.

## Test placement plan

- `packages/validators`: graduation and bulletin input schemas.
- `packages/db`: migration shape and database checks.
- `packages/api`: eligibility, private dashboard data, recap, officers,
  bulletin lifecycle, storage, forms, and permissions.
- `apps/blade`: dashboard selection, dialogs, cards, scrolling, admin editor,
  and preview.
- Blade Playwright: selected alumni and administrator paths.

Expected commands:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/db test`
- `pnpm --filter=@forge/api test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/blade e2e`

## Test cases

### TC-001: Current member keeps the member dashboard

Setup:

- A logged-in member has a graduation date after the current date.

Action:

- The member opens `/member/dashboard`.

Expected observations:

- Blade renders the current member dashboard.
- No alumni query or confirmation blocks the member's normal actions.

### TC-002: Alumni candidate must resolve graduation

Setup:

- A logged-in member's graduation date has passed.
- `alumniConfirmedAt` is null.

Action:

- The member opens the dashboard and attempts escape, outside-click, browser
  focus changes, and the normal close affordance.

Expected observations:

- Blade keeps the graduation dialog open.
- The current and alumni dashboards remain unavailable until the member chooses
  a resolution.

### TC-003: Member confirms graduation

Setup:

- An alumni candidate has a past graduation date.

Action:

- The member chooses `I graduated`.

Expected observations:

- Blade stores the confirmation time and opens the alumni dashboard.
- The saved graduation date does not change.
- Reloading the page does not ask again while the date remains unchanged.

### TC-004: Member extends graduation

Setup:

- An alumni candidate has a past graduation date.

Action:

- The member chooses `My graduation date changed`, selects a valid future term
  and year, and saves.

Expected observations:

- Blade updates the graduation date, clears alumni confirmation, and renders
  the current member dashboard.
- Guild and Discord state remain governed by the updated date.

### TC-005: Graduation-date edits reset confirmation

Setup:

- A confirmed alumnus exists.

Action:

- The member or an authorized administrator changes the graduation date.

Expected observations:

- Blade clears the previous confirmation.
- A future date selects the current dashboard.
- A past date requires the member to confirm again.

### TC-006: Alumni actions remain visible above a scrolling bulletin

Setup:

- A confirmed alumnus has enough active bulletin items to exceed the remaining
  dashboard height.

Action:

- The alumnus opens the dashboard at 1280x720 and scrolls the bulletin.

Expected observations:

- Donation, Discord, career, officers, recap, QR, and settings actions remain
  visible.
- Only the bulletin container scrolls.
- The page does not grow beyond the intended desktop dashboard height.

### TC-007: Mobile alumni layout uses one page scroll

Setup:

- A confirmed alumnus has active bulletin items.

Action:

- The alumnus opens the dashboard at 390x844 and navigates through the page.

Expected observations:

- Actions appear before the bulletin.
- The page uses normal document scrolling without a nested bulletin scrollbar.
- Interactive controls remain reachable by touch and keyboard.

### TC-008: Active bulletin items render in admin order

Setup:

- Bulletin data contains a draft, a scheduled future item, two active published
  items, an expired item, and a manually archived item.

Action:

- A confirmed alumnus opens the dashboard during the active items' publication
  windows.

Expected observations:

- Only the two active items appear.
- Their order matches the administrator's saved order.
- Refreshing preserves the order.

### TC-009: Bulletin empty state is exact

Setup:

- No bulletin items are active.

Action:

- A confirmed alumnus opens the dashboard.

Expected observations:

- The bulletin displays `Nothing needs your attention right now.`
- The rest of the alumni actions remain usable.

### TC-010: Bulletin card variants share one presentation

Setup:

- Active items cover plain text, Markdown, image, external action, Blade form
  action, and combinations of those optional fields.

Action:

- An alumnus views and operates each item.

Expected observations:

- Markdown renders without raw HTML execution.
- Images use the 16:9 presentation and meaningful alt text.
- External actions open a new tab.
- Blade form actions stay in Blade and the destination enforces its respondent
  rules.
- Cards keep consistent padding, title placement, and action placement.

### TC-011: Alumni recap omits unavailable statistics

Setup:

- One alumnus has Club attendance and points.
- Another alumnus has no Club attendance and zero points.

Action:

- Each alumnus opens the dashboard.

Expected observations:

- Both see `Member since` and `Class of`.
- The first sees correctly derived lifetime points, attendance total, first
  event, most active semester, and most-attended category.
- The second sees none of those optional rows and never sees `N/A` or empty
  placeholders.
- Hackathon-associated events do not affect either recap.

### TC-012: Officer contacts follow current role assignments

Setup:

- Current role assignments include two Presidents, one Treasurer, no Secretary,
  and one Dev Lead.
- Some officers lack a profile picture or Discord user ID.

Action:

- A confirmed alumnus opens the dashboard.

Expected observations:

- Both Presidents and the Treasurer appear in the approved office order.
- Secretary and Dev Lead do not appear.
- Each displayed office uses its shared role email.
- Missing pictures use a stable fallback, and missing Discord IDs omit only the
  Discord action.
- No officer card links to Guild.

### TC-013: Career summary uses private saved history

Setup:

- A confirmed alumnus has current and former employment hidden from public
  Guild.

Action:

- The alumnus opens the dashboard and selects `Update career history`.

Expected observations:

- The private dashboard shows current company, title, city, and past companies
  from saved employment.
- The action opens Member Settings at the career section.
- An alumnus without employment sees an update prompt instead of `N/A`.

### TC-014: Donation and alumni Discord actions preserve legacy destinations

Setup:

- A confirmed alumnus opens the dashboard.

Action:

- The alumnus inspects the donation choices and alumni Discord action.

Expected observations:

- Supporter, Contributor, Partner, and custom donation choices use the approved
  legacy Stripe destinations.
- The Discord action uses the approved alumni channel destination.
- Forge does not claim to record donation completion.

### TC-015: Authorized administrator manages and previews bulletin content

Setup:

- A user has `MANAGE_ALUMNI_DASHBOARD`.
- Published Blade forms exist.

Action:

- The administrator creates a draft, adds Markdown and an image, links a form,
  previews the card, previews the full dashboard at desktop and mobile sizes,
  schedules it, reorders it, publishes it, archives it, restores it, and
  republishes it.

Expected observations:

- Each saved state appears in the correct admin group.
- Alumni visibility follows publication and expiration times.
- Reordering is durable.
- The individual and full-dashboard previews use the alumni renderer.
- Archived and expired items remain recoverable.

## Negative / regression cases

### TC-NEG-001: Unauthenticated alumni access fails

Setup:

- No Blade session exists.

Action:

- The client requests alumni dashboard or bulletin admin data.

Expected observations:

- The server rejects the request as unauthenticated.
- No private member, bulletin, officer, or career data is returned.

### TC-NEG-002: Unauthorized bulletin administration fails

Setup:

- A logged-in member lacks `MANAGE_ALUMNI_DASHBOARD` and is not an officer.

Action:

- The member opens `/admin/alumni` or invokes any bulletin read or mutation.

Expected observations:

- Blade denies the route and the API rejects the operation.
- Bulletin data and images remain unchanged.

### TC-NEG-003: Invalid graduation resolution fails safely

Setup:

- An alumni candidate selects an invalid term, a past replacement date, or
  submits a stale resolution after another update changed the date.

Action:

- The member submits the graduation dialog.

Expected observations:

- The API returns a field-specific validation or conflict response.
- Blade keeps the dialog usable and shows safe feedback.
- The saved graduation date and confirmation state remain consistent.

### TC-NEG-004: Invalid bulletin content is rejected

Setup:

- An authorized administrator prepares items with a blank title, oversized
  body, missing image alt text, CTA label without a target, both CTA target
  types, or a non-HTTPS external URL.

Action:

- The administrator saves each invalid item.

Expected observations:

- Validation identifies the affected field.
- No partial bulletin write occurs.
- Existing content remains unchanged.

### TC-NEG-005: Invalid publication windows and ordering are rejected

Setup:

- An authorized administrator submits an expiration before publication or a
  reorder list with duplicate or missing IDs.

Action:

- The administrator saves the schedule or order.

Expected observations:

- The server rejects the mutation.
- Publication state and the previous order remain unchanged.

### TC-NEG-006: Invalid image replacement preserves the current image

Setup:

- A bulletin item has a valid saved image.

Action:

- An administrator uploads an unsupported, malformed, or oversized file, or
  storage fails during replacement.

Expected observations:

- Blade shows a safe upload error.
- The current image reference and object remain intact.
- No unreferenced replacement object remains after a database failure.

## Open questions

- None. Human approval of this file authorizes test generation.
