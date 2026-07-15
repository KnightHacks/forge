# Admin Member Dashboard Test Cases

Status: Complete

## Scope

These cases cover effective permission evaluation, admin member access,
search/filter/pagination, detail display, editing, deletion, and current dues
controls. Role configuration, payment history, bulk operations, club analytics,
and Discord role writes are excluded.

## Test placement plan

- Permission and member API behavior: `packages/api` Vitest.
- Input contracts: `packages/validators` Vitest.
- Dashboard rendering/interactions: `apps/blade` Vitest.
- Critical user paths: `apps/blade` Playwright.

## Test cases

### TC-001: Effective permissions combine linked roles

Setup:

- A signed-in user has two linked roles whose bitstrings grant different
  capabilities.

Action:

- Resolve the user's effective permissions.

Expected observations:

- The returned map contains every known permission key.
- A permission is true when any linked role grants it.
- A no-role user receives an all-false map.

### TC-002: Read-member access opens the dashboard

Setup:

- A signed-in user has `READ_MEMBERS` but not `EDIT_MEMBERS`.

Action:

- Open `/admin/members` and inspect a member.

Expected observations:

- The dashboard and member detail are available.
- Edit, delete, and dues-changing controls are absent.

### TC-003: Search and compound filters narrow results

Setup:

- Members differ by name/email/Discord/company, dues state, school, major,
  level of study, graduation year, Guild visibility, join date, gender, and
  race/ethnicity.

Action:

- Search and combine multiple filters.

Expected observations:

- Results match the search across all documented text fields and every active
  filter.
- Minor misspellings still return relevant members, with stronger matches first.
- Active filters appear in the URL and can be cleared individually or together.
- Facet choices and counts are usable without loading the full member table.

### TC-004: Pagination honors supported page sizes

Setup:

- More members match than fit on one page.

Action:

- Select each of 25, 50, 100, 250, and 500 and navigate result pages.

Expected observations:

- The API returns at most the selected number, the UI shows total/page context,
  and changing search/filter/page size returns to page one.

### TC-005: Editor updates a selected member

Setup:

- A signed-in editor has `EDIT_MEMBERS` and opens another member's detail.

Action:

- Change valid profile fields and save.

Expected observations:

- The desktop Edit member action is contained within the dialog header beside
  the member identity; on mobile it spans the header beneath that identity.
- The selected member and their code-owned signup response are updated.
- The acting administrator's own member profile is unchanged.
- The UI shows success and refreshes row/detail data.

### TC-006: Editor manages current dues status

Setup:

- An editor views one unpaid and one paid member.

Action:

- Click the unpaid status to grant dues, then click the paid status to revoke
  dues.

Expected observations:

- Manual paid status uses the payable academic year and configured amount.
- Revoke marks every row that would keep the member paid inactive without
  deleting history.
- The dashboard updates the status and no payment history UI appears.

### TC-007: Editor deletes a selected member

Setup:

- An editor opens a member, including their own if desired.

Action:

- Complete the destructive confirmation and delete the member.

Expected observations:

- The selected Member, signup response, dues, and member-only uploads are
  removed and disappear from results.
- The selected User, roles, permissions, sessions, Hacker data, and any resume
  still referenced by Hacker remain.
- The acting administrator remains signed in.
- Canceling the confirmation changes nothing.

### TC-008: Reader exports every filtered member

Setup:

- More filtered members exist than fit on the current page.

Action:

- Download the filtered CSV.

Expected observations:

- The file includes all matching pages in fuzzy relevance/sort order.
- It includes Member UUID and human-facing profile/current-dues fields, but no
  User ID or storage key.
- CSV control characters, quotes, line breaks, and formula prefixes are safe.

### TC-009: Officer invalidates effective dues in three stages

Setup:

- An officer views members with effective, stale, historical, unrelated active,
  and legacy calendar-year manual dues rows. At least one member has both a
  current academic-year row and a manual calendar-year grant.

Action:

- Complete the warning and both exact typed confirmation stages.

Expected observations:

- Paste is blocked in typed stages.
- Rows are resolved and invalidated until every affected member is unpaid,
  including legacy manual grants, in one transaction.
- Historical and unrelated active rows remain unchanged.
- The UI reports the affected-member count.

### TC-011: Admin shell remains stable across member and admin routes

Setup:

- A member has read-member administration access and opens `/dashboard`.

Action:

- Navigate to Members from the permission-aware rail while the admin result
  boundary loads.

Expected observations:

- The same integrated header and left rail are visible on both routes.
- The desktop rail-header divider and top-navigation divider occupy the same
  vertical coordinate.
- The header dimensions remain stable and the admin skeleton renders inside the
  shell rather than shifting the entire page when data arrives.
- A member without admin permissions does not receive the rail or Members link.
- On mobile, a single hamburger trigger opens an accessible menu containing
  Dashboard and Members, with the current destination identified.
- Toast feedback uses the raised-card theme rather than the page background.

### TC-012: Member administration remains intentional at 320px

Setup:

- An editor opens `/admin/members` in a 320px-wide viewport.

Action:

- Inspect the result list, pagination, and header, then open a member detail
  dialog.

Expected observations:

- Neither the list nor the open dialog creates document-level horizontal
  overflow.
- Mobile type, page gutters, and card/dialog padding are compact while buttons
  and other touch targets remain at least 44px.
- The dialog presents membership and dues first, followed by clearly labeled
  contact, academics, Guild, files, and record sections in a single column.
- The desktop version presents the same content with main and summary regions
  instead of a flat grid of equal-weight cards.

### TC-010: Editor manages target-owned files

Setup:

- A member has a profile picture and a resume; their Hacker may reference the
  same resume.

Action:

- Preview, replace, and remove files from the member dialog.

Expected observations:

- Short-lived previews work and replacement objects belong to the target User.
- Superseded profile pictures are removed.
- A resume still referenced by Hacker is preserved.

## Negative / regression cases

### TC-NEG-001: Unauthenticated access is rejected

Setup:

- No Blade session exists.

Action:

- Open the page or call an admin member procedure.

Expected observations:

- The page redirects to sign-in and the API returns `UNAUTHORIZED`.

### TC-NEG-002: Signed-in user without member permissions is rejected

Setup:

- A user is signed in but lacks `READ_MEMBERS`, `EDIT_MEMBERS`, and
  `IS_OFFICER`.

Action:

- Open the page or call an admin member procedure.

Expected observations:

- The page redirects to the member dashboard and the API returns `FORBIDDEN`.
- The Admin navigation action is absent.

### TC-NEG-003: Read-only user cannot mutate through the API

Setup:

- A user has only `READ_MEMBERS`.

Action:

- Call update, delete, or dues mutation directly.

Expected observations:

- Every mutation returns `FORBIDDEN` and changes no data.

### TC-NEG-004: Invalid pagination and filters are rejected

Setup:

- An authorized reader calls the list API.

Action:

- Submit unsupported page sizes, invalid options, or malformed years.

Expected observations:

- Validation rejects the input before a member query runs.

### TC-NEG-005: Duplicate member fields produce a safe conflict

Setup:

- An editor changes email or phone to a value owned by another member.

Action:

- Save the edit.

Expected observations:

- The API returns `CONFLICT`, the transaction rolls back, and the UI presents a
  safe actionable error.

### TC-NEG-006: Missing member and dues conflicts are safe

Setup:

- A selected member was removed, or a current/payable dues record already
  exists when a manual paid action races another write.

Action:

- Perform the stale action.

Expected observations:

- The API returns `NOT_FOUND` or `CONFLICT`, preserves existing history, and the
  UI can refresh without entering a false success state.

## Open questions

- None.
