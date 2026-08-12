# Blade Refinements Test Cases

Status: Complete — approved for test generation and implementation

## Scope

These cases prove the revised Blade shell, member/admin hierarchy, localized
production regressions, issue collaboration/identity behavior, managed issue
images, form banner, existing instruction media, and responsive/chart behavior.

They intentionally exclude a benefits page, Grafana, uploaded issue video,
arbitrary issue files, and changes to Discord cadence or mention rules.

## Test placement plan

- `apps/blade/src/tests`: shared header/navigation, dashboard/profile, issue,
  Forms, and focused regression component tests.
- `apps/blade/src/tests/e2e`: authenticated public/member/admin journeys at 320
  px, intermediate desktop, and full desktop.
- `packages/api/src/**/__tests__`: issue filters/uploads/history projection,
  form-banner lifecycle, audit actor projection, and reminder formatting.
- `packages/validators`: active form definition and managed issue-image policy.
- Expected focused commands will use package filters; final gates are React
  analysis for changed surfaces, `pnpm verify:precommit`, reviewers selected from
  the diff, and `git diff --check`.

## Test cases

### TC-001: Public root adapts to authentication

Setup:

- Prepare an unauthenticated browser and an authenticated ordinary member.

Action:

- Each opens `/` and follows the primary action.

Expected observations:

- Both see the public landing page.
- The unauthenticated action begins sign-in; the authenticated action opens the
  member dashboard without a redirect loop.
- The authenticated product mark returns to `/`.

### TC-002: Ordinary member chrome has no sidebar

Setup:

- Sign in as a member with no admin destinations.

Action:

- Open Dashboard and Settings at desktop and mobile widths, then sign out.

Expected observations:

- No icon rail or navigation drawer is present.
- Settings cog and Sign out are together at the top right and work by keyboard
  and pointer.
- No admin destination is exposed or made accessible by direct requests.

### TC-003: Desktop admin rail is explicit and closes on selection

Setup:

- Sign in as an admin with destinations in multiple groups.

Action:

- Hover and tab across the collapsed rail; activate a recognizable icon; return,
  open the rail, and select a labeled destination.

Expected observations:

- Hover/focus never expands the rail.
- Collapsed icons expose tooltips/accessibility names and navigate directly.
- The opener expands the rail; grouped labels are visible.
- Selecting a destination closes it, active state remains understandable, and
  focus is not stranded in hidden content.

### TC-004: Navigation grouping follows access

Setup:

- Prepare an officer, a limited Club admin, a Hackathon-only admin, and an admin
  with no entries in one approved group.

Action:

- Inspect desktop and mobile navigation.

Expected observations:

- Each actor sees only authorized destinations.
- Dashboard is first; non-empty domain headings follow the approved map; empty
  headings are omitted.
- Guild and other outbound destinations are marked external.
- Mobile closes after selection.

### TC-005: Admin page header reclaims content space accessibly

Setup:

- Open representative list, detail, analytics, issue, event, and configuration
  admin pages plus their loading states.

Action:

- Inspect visually, tab to help controls, and query accessible names/descriptions.

Expected observations:

- No visible purple eyebrow or permanent description consumes header height.
- Title and actions remain aligned; the current page description, without the
  former eyebrow, is available in an accessible tooltip.
- Skeletons do not reserve removed rows.
- Consequential configuration guidance stays visible while repetitive subtitles
  do not.

### TC-006: Paid and unpaid dashboards choose different hierarchy

Setup:

- Prepare otherwise equivalent paid and unpaid members.

Action:

- Open the member dashboard on mobile and desktop.

Expected observations:

- Unpaid shows the prominent top dues banner and working payment CTA.
- Paid has no dues banner and shows a compact green badge beside the Welcome
  name; its hover/focus tooltip confirms payment.
- Neither state repeats an unnecessary explanatory dues sentence.

### TC-007: Member sections are consistent across viewports

Setup:

- Prepare a member with Guild data, events, a resume, and previous forms.

Action:

- Compare 390 px and desktop presentations and use every available action.

Expected observations:

- Both expose the same ordered sections, labels, and actions.
- Guild stays prominent and is defined as the public member directory/profile;
  public links are external-marked.
- Check in is a clear box with View QR code.
- Previous forms is a small bottom action, not a primary tile.

### TC-008: Guild/profile content handles missing and long values

Setup:

- Prepare one sparse member and one member with long name, tagline, company,
  portfolio URL, social values, and resume filename.

Action:

- Open the dashboard across tested widths and operate photo, resume, visibility,
  preferences, and public Guild actions.

Expected observations:

- Guild remains plainly separate from private Blade/account data.
- Empty and populated layouts align without overlap or clipped controls.
- Long values wrap/truncate intentionally; outbound actions remain reachable and
  identified as external.
- Existing Guild mutation actions remain available.

### TC-009: Resume upload confirms before optional View

Setup:

- Prepare initial signup and an existing member with/without a resume.

Action:

- Upload and replace valid resumes in each flow.

Expected observations:

- The viewer does not open automatically.
- A clear successful-upload state appears and offers View.
- Selecting View opens the uploaded document; failure preserves the previous
  saved resume and reports a truthful error.

### TC-010: Profile picture removal is confirmable

Setup:

- Prepare a member with a saved picture.

Action:

- Start removal, cancel, then repeat and confirm.

Expected observations:

- Cancel issues no remove mutation and retains the image.
- Confirm removes it once, provides feedback, and returns focus safely.

### TC-011: Employment errors identify the actual field

Setup:

- Prepare a legacy employment row and a current row missing position title,
  company, experience type, or employment status one at a time.

Action:

- Submit each invalid state and then correct it.

Expected observations:

- Required labels are marked.
- Each error names and associates with the actual entry/field and the first error
  receives focus/scroll treatment.
- Legacy confirmation guidance appears only for the legacy condition.
- Corrected valid values save successfully.

### TC-012: Member search keeps focus through result updates

Setup:

- Open Members with data including `Alejandro` and a debounced URL query.

Action:

- Type the full name continuously while results update.

Expected observations:

- No keystrokes are lost, the search retains focus/caret, results converge, and
  URL state remains shareable.

### TC-013: Issue assignee filtering is safe and composable

Setup:

- Capture the current production-base failure and prepare teams with zero, one,
  and many eligible assignees plus issues assigned across teams.

Action:

- Filter by team/assignee alone and alongside status, priority, search, and view
  changes.

Expected observations:

- Valid choices return correct results or a truthful empty state, never the
  generic workspace-load failure.
- Pagination and other filters remain correct; unauthorized data is not leaked.

### TC-014: Issue Markdown preserves authored line breaks

Setup:

- Create descriptions containing adjacent plain lines, blank paragraphs, lists,
  links, code, and long unbroken content.

Action:

- Compare edit preview and saved detail.

Expected observations:

- Author-entered plain line breaks remain visible and preview matches detail.
- Markdown semantics and long-content wrapping remain intact.
- Other shared Markdown consumers do not change unexpectedly.

### TC-015: Authorized issue image lifecycle

Setup:

- Prepare an issue editor, read-only issue reader, unauthorized admin; valid PNG,
  JPEG, WebP, static GIF, and animated GIF images; an SVG; a file above 10 MB;
  and an issue already retaining 10 managed images.

Action:

- Upload/finalize through file picker, clipboard paste, and drag/drop; confirm
  cursor insertion; add alt text; save/render the description; replace or remove
  an image; and request it as each actor.

Expected observations:

- Only editors can create/finalize/remove; readers can view only when they may
  read the issue; unauthorized/guessed IDs reveal no object.
- Preview and detail render authorized images with stable geometry and alt text.
- PNG, JPEG, WebP, and both GIF variants at or below 10 MB are accepted through
  every gesture. SVG, oversized files, and an eleventh retained image are
  rejected without partially mutating the issue.
- Removed and abandoned objects enter safe cleanup without breaking retained
  references or history.

### TC-016: Actor labels prefer current member names

Setup:

- Prepare issue-history and Admin-log rows for a linked renamed Member, a deleted
  or missing Member with a saved Discord snapshot, and a system actor.

Action:

- Read list/detail/history pages, including rows created before this change.

Expected observations:

- Linked rows display current Member full name.
- Missing profiles display the saved Discord fallback.
- System rows retain their explicit system label.
- Reads are batched/no-N+1, access policy is unchanged, and stored rows are not
  rewritten.

### TC-017: Issue reminder renders `Title | Chat`

Setup:

- Build otherwise identical due/overdue reminders with a valid Discord thread,
  no thread, long/special-character titles, assignees, and an owning-role fallback.

Action:

- Build reminder payloads under deterministic tests.

Expected observations:

- Threaded issue: linked sanitized title, literal `|`, linked `Chat`.
- No thread: linked sanitized title only.
- Existing mentions, limits, grouping, cadence, idempotency, and allowed-mention
  behavior are unchanged; tests perform no live Discord write.

### TC-018: Existing form instruction media remains complete

Setup:

- Prepare an authorized form editor and a draft with text, image, and browser-
  playable video instruction blocks.

Action:

- Upload, remove, save, preview, publish, and view as an eligible respondent.

Expected observations:

- The builder makes media actions discoverable and reports progress/failure.
- Saved ordering, authorized playback/rendering, alt text, replacement cleanup,
  and existing 100 MB server policy continue to work.

### TC-019: Form banner lifecycle and presentation

Setup:

- Prepare an editable draft, published form, authorized respondent, unauthorized
  actor, valid images, and rejected image fixtures.

Action:

- Upload/finalize a banner, preview it, publish, view/respond across widths,
  replace it, then remove it.

Expected observations:

- Exactly one banner appears above respondent content in a responsive 4:1
  `cover` frame with its alt text.
- The builder provides crop guidance, preview, and editable alt text before
  publication.
- Preview and respondent views match; loading/failure do not collapse the page.
- Only authorized actors can manage/read it; durable public storage URLs are not
  exposed.
- Replacement/removal safely cleans the old unreferenced object; forms without a
  banner remain unchanged.

### TC-020: Responsive content does not clip

Setup:

- Use 320 px, common mobile, intermediate desktop/zoom-equivalent, and full
  desktop viewports with the long/sparse member fixtures and Chrome-family
  engines available in Playwright.

Action:

- Navigate member dashboard/settings, events empty/populated states, Guild links,
  QR, resume, and account actions.

Expected observations:

- No horizontal page overflow or hidden actionable content.
- Long name, globe/portfolio row, event title, and empty-state text remain
  readable; responsive layout does not depend on concealed overflow.

### TC-021: Comparison chart labels remain readable

Setup:

- Prepare current/prior hackathons whose application and confirmation deadlines
  coincide or fall on adjacent chart positions.

Action:

- Render the Application pace comparison at supported widths.

Expected observations:

- Current/prior labels remain distinguishable without covering each other or
  essential data.
- Keyboard/screen-reader and textual table alternatives still identify every
  deadline and series.

## Negative / regression cases

### TC-NEG-001: Focus and rail state do not regress through navigation

Setup:

- Open expanded admin navigation and a focused search/filter control.

Action:

- Navigate, use back/forward, and update query state.

Expected observations:

- The rail returns collapsed after selection; hover never opens it; active input
  remounts only when structurally necessary and ordinary query updates retain
  focus.

### TC-NEG-002: Upload authorization cannot be bypassed

Setup:

- Obtain another actor's issue/form attachment ID, stale upload intent, malformed
  reference, and mismatched owner/form/issue IDs.

Action:

- Attempt finalize, attach, read, replace, and remove operations.

Expected observations:

- Every operation fails with the approved non-enumerating authorization/error
  class, no foreign object is exposed, and no partial entity/history change is
  committed.

### TC-NEG-003: Existing data remains readable

Setup:

- Load old issues with plain/external Markdown images, old forms without banners,
  old form instruction media, and old actor snapshots.

Action:

- Read them after rollout and under a UI rollback with new authoring hidden.

Expected observations:

- Existing pages remain functional, old media retains authorized behavior, old
  actor rows get truthful enrichment/fallback, and no migration fabricates or
  rewrites history.

## Open questions

- None. These observable cases are approved for test generation.
