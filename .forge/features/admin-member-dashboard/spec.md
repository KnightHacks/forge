# Admin Member Dashboard Spec

Status: Complete

## User-facing purpose

Knight Hacks officers and authorized organizers need one place in Blade to
find members, understand their current membership state, correct member data,
manage current dues status, and remove invalid member accounts.

## Users / actors

- Officers with full administrative access.
- Organizers with read-only member access.
- Organizers trusted to edit member records and dues status.
- Signed-in users without member administration access.

## User-visible interface

- Authorized users open the member administration dashboard at
  `/admin/members`.
- This feature does not add an `/admin` landing page.
- Admin pages use a thin left-hand navigation rail integrated with the top
  navigation. The rail shows icons at rest and reveals clear text labels when
  hovered or focused. Its header divider aligns exactly with the top-navigation
  divider.
- Authorized administrators see the same permission-aware navigation rail on
  the member dashboard, providing a direct route to Members. Ordinary members
  do not see admin navigation.
- On mobile, one hamburger menu replaces the separate Dashboard and Members
  buttons while preserving both destinations and the active-page indicator.
- Users can fuzzy-search by first, last, or full name, email, Discord username,
  company, or school.
- Users can combine filters for dues status, school, major, level of study,
  graduation year, company, Guild profile visibility, join date, gender, and
  race/ethnicity.
- Multi-select values use OR logic inside one filter and different filter
  groups use AND logic with each other.
- Complex filters live in a dedicated dialog with searchable combobox-style
  selectors.
- Active filters remain visible, can be removed individually, and can be reset
  together. Filter and search state is represented in the URL so a view can be
  bookmarked or shared with another authorized user.
- Results are paginated. Users can choose 25, 50, 100, 250, or 500 results per
  page, with 25 as the default. Search or filter changes return to page one.
- Results default to newest members first. Users can sort by date joined, full
  name using first-name order, or Discord username.
- The desktop dashboard shows each member's name, Discord username, email,
  school, graduation term and year, current dues status, join date, and actions.
- On mobile, results prioritize name, Discord username, and dues status. The
  list and full member view remain contained at a 320px viewport, using compact
  typography and spacing without reducing interactive targets below 44px.
- Sensitive member data such as phone number, birth date/age, gender,
  race/ethnicity, shirt size, resume, and Guild biography appears only in the
  full member view.
- Read-only users can open a full member dialog but do not see edit, delete, or
  dues-changing controls. The selected member is represented by a query
  parameter so another authorized user can open the same member dialog.
- Editors can update a member's profile fields. In the detail dialog, the edit
  action sits with the member identity in the desktop header and becomes a
  full-width action beneath that identity on mobile.
- Editors may update contact, academic, Guild, profile-picture, and resume
  fields. They may not change Discord username, member join date, or other
  identity/system-owned values.
- Editors can click a member's Paid or Unpaid status directly to toggle it, or
  use the same controls from the full member view.
- Editors can delete a member after a clear destructive-action confirmation.
- Member deletion requires typing `I am absolutely sure` and removes the Member
  profile without deleting the Blade user or unrelated hacker/application data.
- Officers can invalidate dues for all members through the restored comedic
  three-stage confirmation flow. Invalidation preserves records rather than
  deleting payment history and includes legacy calendar-year manual grants.
- Authorized readers can download a CSV containing every member matching the
  current search and filters across all result pages.
- Users see loading, empty, success, and safe error states for dashboard work.
  The server-rendered shell remains stable while member results load, and toast
  surfaces use the same raised-card theme as the surrounding interface.
- The full member view groups information into named contact, academics, Guild,
  files, membership, and record sections. Desktop uses a clear content/summary
  hierarchy; mobile presents those sections in one intentional reading order.

## Scope

### In scope

- Restore role-backed permission evaluation needed by Reforge admin features.
- Read-only access to the signed-in user's effective permission map.
- Server and page gates for member administration.
- Search, compound filtering, sorting, pagination, and page-size choices.
- Member detail, editing, deletion, and individual current-dues controls.
- Filtered CSV export across all matching pages.
- Officer-only mass dues invalidation with three confirmation stages.
- Responsive Blade dashboard design for desktop and mobile.
- Audit logging for member and dues mutations.

### Out of scope

- Role configuration, role assignment, or Discord role mutation screens.
- Dues payment history display.
- Bulk member editing or bulk deletion.
- Club analytics and exports other than the filtered member CSV.
- Member event attendance and points management.
- Refunds or changes to Stripe payments.
- New permissions or changes to the existing permission vocabulary.

## Vocabulary

- `Read member access`: `READ_MEMBERS`, `EDIT_MEMBERS`, or officer access.
- `Edit member access`: `EDIT_MEMBERS` or officer access.
- `Effective permissions`: The union of permission bits granted by all roles
  linked to the signed-in user.
- `Current dues status`: Whether an active dues record currently counts for the
  member under the academic-school-year rules.
- `Revoke dues`: Mark every active row that would keep the member effectively
  paid as inactive while preserving it for future history.
- `Mass invalidate dues`: Mark the dues records covered by the officer action
  inactive until every affected member is unpaid, while preserving them.

## Acceptance criteria

- An authorized user can reach `/admin/members`; an unauthorized signed-in user
  cannot reach the page or call its protected APIs.
- A read-only user can search, filter, paginate, and inspect members but cannot
  perform or see member-changing actions.
- An editor can update a selected member and sees the updated row/detail state.
- An editor can delete a selected member after confirmation, and the deleted
  account no longer appears in results.
- An editor can mark an unpaid member paid for the payable academic school year
  and can click the status to revoke every record that would keep the member
  paid without deleting history.
- Search covers name, email, Discord username, and company.
- Search also covers school and tolerates minor search imprecision.
- Filters can be combined and cleared, and query state is reflected in the URL.
- Page-size options are exactly 25, 50, 100, 250, and 500.
- The default view shows 25 newest members.
- A selected member dialog can be shared with another authorized admin through
  its URL query parameter.
- Filtered CSV export contains all matching members, not only the visible page.
- Officer-only mass dues invalidation requires all three confirmation stages
  and preserves dues records while also invalidating legacy manual grants.
- Empty and failed result states explain what happened and provide a sensible
  recovery action.

## Open questions

- None.
