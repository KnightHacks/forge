# Club Analytics and Dues Reporting Test Cases

Status: Complete — approved for test generation

> This file owns observable proof.

## Scope

These cases prove the shared filter contract, analytics access boundary,
non-hackathon source scope, distinct-attendance and cohort rules, demographic
and dues measures, event-feedback coverage, Discord matched-Member counts,
internal and sponsor CSV policy, and the essential Blade workspace states.

They intentionally do not test hackathon analytics, source-record editing,
registration/capacity/marketing/cost fields, dollars, payment-provider splits,
raw feedback, generic-form analytics, predictive recommendations, scheduled
reports, or schema migrations.

## Test placement plan

- `packages/validators/src/tests/analytics.test.ts` — Vitest tests for
  TC-001 through TC-003 and relevant validation regressions.
- `packages/api/src/tests/analytics/access.test.ts` — Vitest/tRPC caller tests
  for TC-004 and TC-005.
- `packages/api/src/tests/analytics/report.test.ts` — deterministic Vitest tests
  for TC-006 through TC-018 and empty/invalid source regressions.
- `packages/api/src/tests/analytics/export.test.ts` — Vitest tests for TC-019
  through TC-021.
- `apps/blade/src/tests/admin/analytics-dashboard.test.tsx` — Vitest render
  tests for TC-022 through TC-024.
- `apps/blade/src/tests/e2e/admin-club-analytics.spec.ts` — Playwright coverage
  for TC-025 when the existing seeded e2e harness can represent the fixtures.

Expected narrow commands:

- `pnpm --filter=@forge/validators test -- analytics`
- `pnpm --filter=@forge/api test -- analytics`
- `pnpm --filter=@forge/blade test -- analytics-dashboard`
- `pnpm --filter=@forge/blade e2e -- admin-club-analytics.spec.ts`

## Test cases

### TC-001: Preset reporting periods resolve deterministically

Setup:

- Use explicit reference instants around January 1, May 1, August 1, and August
  15 in the Club event calendar time zone.

Action:

- Resolve current semester, current academic year, an explicit academic year,
  and all-time inputs.

Expected observations:

- Semester bounds use the centralized January 1, May 1, and August 15 starts.
- Academic-year bounds are August 1 inclusive through the following August 1
  exclusive.
- All-time has no artificial lower bound and observes through the reference
  instant.
- Each resolved result carries a stable human label and absolute bounds.

### TC-002: Comparison periods preserve equivalent windows

Setup:

- Use a finite 30-day custom period, a current semester, a current academic
  year observed partway through the year, and all-time.

Action:

- Resolve the default comparison for each selection.

Expected observations:

- The custom and semester comparisons are the immediately preceding windows of
  equal duration.
- The academic-year comparison is the preceding school year and its to-date
  observation uses the same elapsed day.
- All-time has no default comparison.

### TC-003: Valid filters normalize without accepting malformed scope

Setup:

- Provide duplicated/whitespace-padded event tags, a valid event UUID, a valid
  demographic/section, and custom dates.

Action:

- Parse the report input and separately try an inverted range, a range longer
  than ten years, more than 20 tags, an empty tag, an invalid UUID, and an
  unknown enum.

Expected observations:

- The valid input trims and deduplicates tags and preserves the selected
  values.
- Each invalid input fails through Zod with field-specific details.

### TC-004: Analytics procedures enforce their own access policy

Setup:

- Create callers with no session, an authenticated session with no relevant
  permission, `READ_CLUB_DATA`, and `IS_OFFICER`.
- Use lightweight protected test procedures that call the real analytics access
  helper.

Action:

- Call report and export operations with each caller.

Expected observations:

- No session receives `UNAUTHORIZED` before permission loading.
- An unrelated authenticated caller receives `FORBIDDEN`.
- `READ_CLUB_DATA` and `IS_OFFICER` may read and export.
- The access helper grants no mutation, Member-admin, or Event-admin
  capability.

### TC-005: Club-data access exposes only the approved analytical identity

Setup:

- Include a Member with name, Member UUID, email, phone, Discord identity,
  profile/resume URLs, user ID, and payment identifiers.
- Include a role-restricted Club event and give the caller only
  `READ_CLUB_DATA`.

Action:

- Build or request the report.

Expected observations:

- The named member row may contain Member UUID, display name, analytical
  category, attendance context, and paid/unpaid state.
- The role-restricted Club event name and metrics are present.
- Contact, account, file, payment, raw response, and edit fields are absent
  from the serialized result.

### TC-006: Hackathon records never enter Club analytics

Setup:

- Create otherwise similar Club and hackathon events, attendance rows, and
  feedback links in the same period.

Action:

- Build the report with no event filter and then request the hackathon event ID
  as an individual filter.

Expected observations:

- Only the Club event contributes to filter options, events, attendance,
  audience, feedback, and exports.
- The individual hackathon UUID behaves as `NOT_FOUND` rather than revealing a
  disallowed event kind.

### TC-007: Duplicate check-ins count once per member and event

Setup:

- One Member has three EventAttendee rows for one Club event and one row for a
  second Club event. Another Member attends the first event once.

Action:

- Build Overview and Events metrics.

Expected observations:

- Distinct attendance is four member/event facts, not six rows.
- Distinct attendees is two.
- First-event attendance is two and the first Member is returning at the
  second event.
- Per-event counts, reach, repeat rate, frequency bands, and CSV values use the
  same deduplicated facts.

### TC-008: Period and event filters do not alter the Member baseline

Setup:

- Retain four Member profiles and events across two tags and two periods.

Action:

- Select one period/tag/event and build the report.

Expected observations:

- Only matching events drive attendance, feedback, and attending-audience
  measures.
- Member profile count and the all-Member dues denominator remain four and are
  labeled as the unfiltered current baseline.
- Available event filters contain no hackathon event.

### TC-009: Overview handles comparison deltas and zero denominators

Setup:

- Give the selected period 12 distinct attendances and the prior equivalent
  period 8. Include a metric whose prior denominator is zero.

Action:

- Build Overview comparisons.

Expected observations:

- Attendance shows absolute change `+4` and percentage change `+50%`.
- The zero-denominator metric has a valid absolute change but an unavailable
  percentage change; it never emits Infinity, NaN, or a fabricated zero.

### TC-010: Trend and event-performance groupings use documented buckets

Setup:

- Include events across short and long report windows, weekdays, local start
  times, durations, locations, months, and tags, including an invalid negative
  duration and an empty location.

Action:

- Build Events analytics for a 90-day period and a period longer than 120 days.

Expected observations:

- The short period uses weekly buckets and includes empty in-range buckets.
- The long period uses monthly buckets.
- Weekday/time, duration, month, location, and tag tables assign each event to
  the documented category, including `Invalid` and `Missing` where required.

### TC-011: First-time and returning ties are deterministic

Setup:

- Give one Member attendance at two events with the same scheduled start but
  different UUIDs, followed by another event.

Action:

- Build per-event first/returning counts twice with the source rows in different
  orders.

Expected observations:

- The lower deterministic event ordering owns the one first attendance.
- The other two attendances are returning.
- Reordering input records does not change the result.

### TC-012: Return cohorts exclude immature members

Setup:

- Create first-time attendees 100, 70, 40, 20, and 5 days before the observation
  end. Give selected members a second distinct Club event inside or outside
  their 30/60/90-day deadline.

Action:

- Build 30, 60, and 90-day return cohorts.

Expected observations:

- Each denominator includes only members with its full observation window.
- Returns after the cohort deadline do not count for that window.
- Immature members are omitted rather than counted as failures.
- A cohort with no mature members is unavailable, not zero percent.

### TC-013: Feedback metrics retain coverage and reliability context

Setup:

- Link feedback forms explicitly to two Club events.
- Include valid and invalid stored core ratings, discovery answers, an unmatched
  respondent, and events with four and five valid overall responses.

Action:

- Build cross-event feedback analytics and top-rated rankings.

Expected observations:

- Linkage follows form/event UUIDs, not event names.
- Each rating average uses only its own valid one-to-five answers and reports
  that count.
- Response count, response rate, unmatched count, and discovery denominator are
  present; response rate cannot exceed one.
- The four-response event keeps its displayed rating but is excluded from the
  reliable top-rated ranking. The five-response event is eligible.
- No qualitative/custom answers or response/member identities appear.

### TC-014: Demographic tables preserve the complete denominator

Setup:

- Retain Members in a normal value, `Prefer not to answer`, missing/invalid
  source fixture, and a long-tail school/major. Give only some Members selected
  attendance and repeat attendance.

Action:

- Build each supported Audience demographic.

Expected observations:

- Base counts across categories add to all retained Member profiles.
- Attendee counts add to all selected attendees.
- Missing, invalid, and prefer-not-to-answer remain visible.
- Base share, audience share, participation, representation gap, repeat rate,
  dues-paid rate, and coverage use the documented denominators.
- No long-tail value is discarded from the complete table.

### TC-015: Audience affinity and named drill-down stay analytical

Setup:

- Give Members from two demographic segments distinct attendance across two
  event tags, including repeated check-in rows.

Action:

- Select the demographic and build affinity and named rows.

Expected observations:

- Affinity counts distinct members and distinct member/event facts by segment
  and event tag.
- Named rows show only approved identity, category, selected attendance, last
  selected event, and current dues status.
- Changing demographic or event filters recomputes the rows without exposing
  contact or edit data.

### TC-016: Current dues status reuses effective dues semantics

Setup:

- Retain Members with an active current academic-year credit, an inactive
  current-year credit, an active payable-next-year credit after stale rollover,
  an active compatible legacy calendar-year credit, and no dues rows.

Action:

- Build current paid/unpaid analytics at an explicit reference date.

Expected observations:

- Each Member's state matches `buildDuesStatus` for the same rows and date.
- Paid plus unpaid equals every current retained Member profile.
- Current coverage uses that full denominator and contains no dollar/provider
  fields.

### TC-017: Academic-year dues history uses retained-profile denominators

Setup:

- Retain Members created before and after the exclusive end of two academic
  years. Include unique active/stale dues credits on several payment dates.

Action:

- Build academic-year curves, comparisons, and milestones.

Expected observations:

- Each denominator includes only currently retained profiles created before
  that year's end and is labeled accordingly.
- Curves deduplicate member/year, separate active/stale, and order elapsed-day
  points chronologically.
- Previous-year pace compares the same elapsed academic-year day.
- Each reached 25/50/75/90-percent milestone uses the first qualifying payment
  date; unreached milestones are null.

### TC-018: Paid and unpaid engagement uses selected attendance

Setup:

- Retain paid and unpaid Members with zero, one, and repeated selected Club
  event attendance.

Action:

- Build dues engagement measures and the unpaid follow-up table.

Expected observations:

- Paid/unpaid profile, reached, distinct-attendance, and repeat counts use
  current effective dues state and distinct selected attendance.
- The unpaid table contains every unpaid current profile with display name,
  graduation year, selected event count, last selected event/date, and points.
- It contains no contact fields, dollars, payment identifiers, or edit action.

### TC-019: Internal exports preserve full approved analytical data

Setup:

- Build a report with named events, named audience rows, named unpaid rows,
  active filters, comparisons, and feedback coverage.

Action:

- Serialize separate Overview, Events, Audience, and Dues internal exports.

Expected observations:

- Each file includes period/filter/version/generation metadata and only the
  requested section's clearly typed records.
- Events retain names and full metrics; Audience and Dues may retain names and
  Member UUIDs.
- No internal file contains source contact, account, file, raw feedback,
  payment-identifier, or edit fields.

### TC-020: Sponsor export applies a separate privacy policy

Setup:

- Include event/audience aggregates with categories above and below five, a
  complementary cell below five, named internal rows, dues data, exact ages,
  event/demographic affinity, and feedback aggregates.

Action:

- Serialize the sponsor report.

Expected observations:

- Aggregate reach, growth, event performance, audience composition,
  satisfaction, response coverage, filters, version, numerator, denominator,
  and coverage are present where applicable.
- Names, IDs, dues, individual attendance, exact ages, affinity cross-tabs, raw
  or qualitative feedback, and payment details are absent.
- Sparse and complementary demographic cells are combined into
  `Withheld / other`, with threshold/reason metadata.
- The sponsor serializer cannot accept an internal-row DTO by type/contract.

### TC-021: CSV neutralizes spreadsheet formulas

Setup:

- Include cells beginning with `=`, `+`, `-`, `@`, tab, and carriage return,
  plus commas, quotes, and line breaks.

Action:

- Serialize and parse the internal and sponsor CSVs.

Expected observations:

- Dangerous leading characters receive a visible single-quote prefix.
- RFC 4180 quoting preserves commas, quotes, and line breaks as one cell.
- Normal text and numeric values remain human-readable.

### TC-022: Analytics workspace renders all sections and definitions

Setup:

- Provide a complete report DTO and access flags to the Blade presentation.

Action:

- Render the workspace at the Overview, Events, Audience, Dues, and Reports
  section URLs.

Expected observations:

- The active section, period, comparison, event filters, and reset action are
  visible.
- Every section has its approved headline measures, definitions/denominators,
  and complete table access.
- Every chart has a text/table alternative and no meaning relies on color
  alone.
- Member/Event admin links appear only with their separate admin permission.
- Named Audience, Dues, and Discord Member rows open the shared Member dialog
  only with separate Member-admin read access.

### TC-027: Discord message counts drill down by matched Member

Setup:

- Provide selected-period Discord activity for a stable author linked to a
  retained Member plus activity from unmatched and bot authors.

Action:

- Render the Discord section with Analytics-only access, then with separate
  Member-admin read access.

Expected observations:

- The matched row shows Member name, stored Discord username, message count,
  active days, active surfaces, and a human-readable last-message time.
- Unmatched authors contribute to aggregates without exposing identity.
- The Member name is plain text for Analytics-only access and opens the shared
  enriched Member dialog when Member-admin read access is present.
- The internal Discord CSV includes the matched row without message bodies,
  message IDs, or raw Discord author IDs.

### TC-023: Empty and feedback-unavailable states preserve known data

Setup:

- Provide retained Member profiles but no selected events, attendance, dues
  history, or linked feedback responses.

Action:

- Render the workspace.

Expected observations:

- Current profile and current unpaid-denominator information remains visible.
- Event and feedback panels explain the absence of matching data.
- Unavailable averages/ratios use an unavailable state, not measured zero.
- Filters, tabs, and Reports remain usable.

### TC-024: Loading, error, and narrow layouts remain operable

Setup:

- Render the route loading boundary, route error boundary, and populated
  workspace at 320 CSS pixels. Supply more than 25 rows to each named or
  detailed operational table.

Action:

- Inspect landmark/control structure and layout bounds; activate retry in the
  error state.
- Move forward one page in Event detail, demographic segments, program
  affinity, Member drill-down, and unpaid follow-up; change a page size.

Expected observations:

- Loading keeps the heading, filter/tab region, and approximate panel geometry.
- Error retains Analytics context and exposes a working retry action.
- The document does not overflow horizontally; wide tables scroll inside a
  labeled region.
- Controls have keyboard access and at least 44-pixel touch targets.
- Long tables initially show 10 rows and report the exact visible range, total,
  and page count. Previous/next and 10/25/50-row controls update only the
  displayed rows; downloads retain the full matching dataset.

### TC-025: Authorized users can filter and download while others are redirected

Setup:

- Seed deterministic Club/hackathon events, Members, attendance, dues, and
  feedback. Configure one user with `READ_CLUB_DATA` and one without it.

Action:

- Visit `/admin/analytics`, change period/tag/section filters, reload the copied
  URL, and download internal and sponsor reports with the authorized user.
- Visit the route with the unauthorized user.

Expected observations:

- The authorized user's URL and visible metrics reflect the active filters and
  survive reload.
- Downloads have the requested filename/MIME and parse as CSV.
- Hackathon data is absent.
- The unauthorized user sees no Analytics navigation item and is redirected to
  the member dashboard on direct visit.

### TC-026: The action brief groups deterministic, traceable observations

Setup:

- Supply current and comparison event types with measured growth and decline,
  at least three events in two weekday/time windows, a mature 30-day return
  cohort, audience segments on both sides of the Member-profile distribution,
  current and prior-year dues credits, attended unpaid profiles, and no linked
  feedback responses.

Action:

- Build and render Overview with comparison enabled.

Expected observations:

- Insights appear under Grow membership, Deepen engagement, Plan programming &
  turnout, Understand audience, Collect & renew dues, and Improve measurement
  rather than in one flat feed.
- Each group shows its observation count and one divided evidence list;
  observations do not render as a grid of nested cards.
- Membership insights report retained profile creation and mature 30-day
  profile activation; engagement insights report attendee continuation and
  mature first-attendee return.
- Event-type changes report total attendance, events held, and average turnout.
  Schedule ranking uses an event-type-adjusted median when the mix is reliable
  and otherwise falls back to average attendance per event.
- Separate audience observations report the largest qualifying positive and
  negative representation gaps.
- Dues observations decompose comparable-day credits into renewed, first-recorded,
  reactivated, and not-yet-renewed profiles, then report attended unpaid
  profiles and the next active-credit threshold without exposing contact or
  payment data.
- The missing-feedback observation is present because selected events exist,
  while every statement remains non-causal and links to its evidence section.

## Negative / regression cases

### TC-NEG-001: Empty datasets do not produce invalid numbers

Setup:

- Use no Members, events, attendance, dues, or feedback.

Action:

- Build every section and export type.

Expected observations:

- Counts are zero where a count is measured.
- Ratios, medians, ratings, comparisons, and cohorts with no denominator are
  unavailable/null.
- No output contains NaN, Infinity, an exception, or a misleading measured
  zero for unavailable data.

### TC-NEG-002: Orphan and malformed retained rows fail closed

Setup:

- Supply test fixtures representing an attendance to an unselected event, a
  dues row for an absent Member, a feedback response with malformed JSON
  values, and an unlinked feedback form.

Action:

- Build the report.

Expected observations:

- Orphan/unlinked facts do not enter member, event, dues, or feedback metrics.
- Malformed feedback is counted only in the documented response coverage/audit
  context and does not crash or become a valid rating.

### TC-NEG-003: Analytics cannot become an edit-permission shortcut

Setup:

- Give a caller only `READ_CLUB_DATA` and a report containing Member and Event
  UUIDs.

Action:

- Attempt existing Member edits, dues status changes, Event edits, attendance
  removal/check-in, and feedback deletion with that caller.

Expected observations:

- Existing procedures continue to return `FORBIDDEN` according to their own
  policies.
- No analytics procedure is a mutation or accepts an edit payload.

### TC-NEG-004: Sponsor suppression is not bypassed by filters

Setup:

- Choose a filter that narrows an otherwise large demographic to fewer than
  five Members or leaves a complementary cell below five.

Action:

- Generate a sponsor export using that filter.

Expected observations:

- The narrowed category remains withheld/combined.
- Filter metadata is present, but no name, ID, affinity table, or exact sparse
  value leaks through another sponsor row.

## Open questions

- None for test generation.
