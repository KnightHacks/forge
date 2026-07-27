# Club Analytics and Dues Reporting SRD

Status: Complete — approved for implementation

> This file owns technical implementation constraints.

## Technical purpose

Add a read-only Club analytics platform to `@forge/api` and a server-first
workspace at `/admin/analytics` in Blade. The platform computes event,
audience, dues, and event-feedback measures from retained operational records,
returns purpose-built analytical DTOs, and produces separate internal and
sponsor-safe CSV reports.

This implementation restores useful analytical capability without carrying
forward Legacy Blade's client-side aggregation, full-record disclosure,
duplicate-attendance inflation, any-history dues status, or hackathon data.

## Relevant principles

This feature follows
[`docs/agentic-development/forge-engineering-principles.md`](../../../docs/agentic-development/forge-engineering-principles.md),
especially:

- apps remain thin clients and `@forge/api` owns business rules;
- `@forge/db` owns schema/client only and `@forge/validators` owns shared input
  contracts;
- permissions, privacy boundaries, and metric definitions are server
  authoritative;
- clients receive purpose-built DTOs rather than full database rows;
- historical limitations are labeled instead of reconstructed from guesses;
- high-value logic is deterministic and testable independently of React and
  the database;
- common reporting windows are derived from dates rather than annual code
  edits.

## Access policy

| Capability                                                           | Required access                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| See the Analytics navigation item or open `/admin/analytics`         | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| Read Overview, Events, Audience, Dues, and Reports data              | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| See named Club events, including role-restricted/internal events     | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| See approved named member analytics and unpaid-member rows           | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| See Discord aggregates and matched-Member analytical rows            | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| Open a matched Member in the shared full Member dialog               | Existing Member-admin read access                                    |
| Download an internal or sponsor-safe analytics CSV                   | `READ_CLUB_DATA` or `IS_OFFICER`                                     |
| Edit an event, attendance, member, dues record, or feedback response | Never granted by Analytics; existing feature permissions still apply |

Additional rules:

- Unauthenticated procedure calls return `UNAUTHORIZED`. Authenticated callers
  without either allowed permission return `FORBIDDEN`.
- Every analytics procedure repeats the API access check. Navigation hiding and
  page redirects are not authorization controls.
- `READ_CLUB_DATA` deliberately authorizes event and member names inside this
  read-only workspace even when the caller lacks `READ_CLUB_EVENT` or
  `READ_MEMBERS`.
- Analytics DTOs may include only the named analytical fields documented here.
  They never include email, phone, raw Discord author ID, user ID,
  resume/profile object keys, payment intent, dues amount, raw feedback, or
  edit controls. The Discord report may include the stored Discord username
  for an already matched retained Member.
- Analytics does not make existing Member or Event procedures more permissive.
- Sponsor export is a disclosure boundary, not a differently styled internal
  export. Its serializer receives a sponsor-safe DTO and cannot accept internal
  rows.

## Architecture / data flow

### Package ownership

- `@forge/validators` owns report-period, comparison, filter, section, and
  export-kind input schemas plus URL-safe defaults.
- `@forge/api` owns access checks, scoped database reads, period resolution,
  deduplication, metric calculation, comparison calculation, disclosure
  control, highlights, and CSV serialization.
- `@forge/db` remains schema/client only. This feature adds no tables, columns,
  enums, relations, or migrations.
- `apps/blade` owns the route, URL state, accessible charts/tables, loading and
  error boundaries, navigation, and download interaction. It does not compute
  source-of-truth metrics.
- `@forge/ui` chart, table, tabs, tooltip, select, popover, date-picker,
  skeleton, scroll-area, and card primitives are reused. No analytics-only
  design-system fork is added.

### Request flow

1. The server page authenticates the user, loads effective permissions, and
   redirects unauthorized users to the member dashboard.
2. Blade parses URL search parameters through shared validators and calls
   `analytics.getReport` with one normalized filter object.
3. The API repeats access enforcement and selects only needed fields from
   retained Member, non-hackathon Event, EventAttendee, DuesPayment,
   EventFeedbackConfig, and linked FormResponse records.
4. One pure report builder resolves periods, deduplicates attendance, normalizes
   feedback metrics, and builds all five section DTOs from the scoped records.
5. Blade renders the DTO. Interactive filter controls only update the URL and
   trigger a server refresh; they do not re-aggregate records in the browser.
6. `analytics.exportReport` repeats the same read and report-builder path, then
   routes the result through an internal-section or sponsor-safe serializer.

The report builder accepts an explicit reference date. Tests must not rely on
wall-clock time. `generatedAt`, resolved bounds, metric-definition version, and
population metadata are returned with every report.

### Source compatibility

- Member analytics use retained `Member` rows. `dateCreated` is the available
  profile-growth timestamp; deleted profiles cannot be reconstructed.
- Club events are `Event` rows with `hackathonId === null`. All such events are
  eligible regardless of visibility, roles, dues requirement, Legacy flag, or
  operations-calendar projection.
- Attendance uses `EventAttendee.memberId` and `eventId`. Multiple rows for the
  same pair collapse to one distinct attendance. `checkedInAt` is metadata; the
  event's scheduled start selects the reporting period.
- Dues status reuses `buildDuesStatus` so active, stale, payable-year, and
  legacy calendar-year compatibility match existing Member surfaces.
- Event feedback uses the explicit `EventFeedbackConfig` -> `FormResponse`
  association and the core `overall`, `fun`, `learning`, and `discovery`
  answers. Invalid stored values are excluded from that metric and reflected in
  response coverage. The unused fixed-column `EventFeedback` table is not
  revived or blended into current metrics.

## Reporting periods and filters

### Resolved periods

- All period bounds are start-inclusive and end-exclusive.
- Preset boundaries are resolved in `EVENTS.CALENDAR_TIME_ZONE`
  (`America/New_York`) and returned as absolute instants.
- Academic school year is August 1 through the following August 1 and reuses
  the existing dues academic-year helpers.
- Semester starts reuse `FORMS.SEMESTER_START_DATES`: Spring January 1, Summer
  May 1, and Fall August 15. A semester ends at the next configured semester
  start.
- `current_semester` resolves from the explicit reference date.
- `current_academic_year` resolves from the explicit reference date.
- `academic_year` accepts an integer start year and resolves that complete
  school year.
- `all_time` has no artificial lower bound and ends at the reference date.
- `custom` accepts explicit dates, requires `from < to`, and is limited to a
  maximum ten-year span to prevent accidental unbounded malformed queries.
- A future end is retained as the selected period end for labeling, while the
  report's observation end is `min(period.end, referenceDate)`. Return cohorts
  and current-to-date comparisons use the observation end.

### Comparison behavior

- `previous_period` shifts a finite selected window backward by its exact
  duration.
- `previous_academic_year` uses the preceding August-to-August school year and
  the same elapsed day offset for to-date dues pace.
- An explicit academic-year selection defaults to its preceding academic year.
- `all_time` defaults to no comparison because no equivalent prior window
  exists.
- The input may select `none` to omit comparisons.
- A zero comparison denominator returns an unavailable percentage change, not
  infinity or an invented zero. Absolute change may still be shown.

### Other filters

- `eventTags` is a deduplicated array of at most 20 trimmed event-tag values.
- `eventId`, when present, must resolve to a Club event. A hackathon or unknown
  UUID returns `NOT_FOUND` without revealing which kind it was.
- Event tag and individual-event filters apply to event, attendance, feedback,
  and attendee-audience measures. The all-Member baseline and current dues
  denominator remain clearly labeled and unfiltered.
- Available filter options contain only non-hackathon events and their tags.

## Metric contract

The metric-definition version for this implementation is
`club-analytics-v1`. Ratios are returned as decimal values from zero through
one; rating averages are nullable numbers from one through five. Count metrics
are non-negative integers.

### Shared attendance definitions

- `eventCount`: selected Club events whose scheduled start is in the period.
- `distinctAttendanceCount`: count of distinct `(eventId, memberId)` pairs for
  selected events.
- `distinctAttendeeCount`: count of Member profiles appearing in at least one
  distinct attendance.
- `memberReach`: distinct attendees divided by all current retained Member
  profiles.
- `repeatAttendeeRate`: attendees with two or more selected distinct
  attendances divided by distinct attendees.
- `averageAttendance`: distinct attendance count divided by selected events.
- `medianAttendance`: normal mathematical median of per-event distinct counts;
  empty input is unavailable, not zero.
- `firstTime`: the member has no known earlier distinct Club-event attendance
  before that event's start. Same-start ties are broken by event UUID so each
  member has one deterministic first event.
- `returning`: the member has a known earlier distinct Club-event attendance.

### Time, cohort, and grouping definitions

- Trend grain is weekly for periods up to 120 days and monthly for longer or
  all-time periods. Empty buckets inside a finite range are returned as zero.
- Attendance-frequency bands are zero, one, two-to-three, four-to-six, and
  seven-or-more selected events. The zero band uses all current retained Member
  profiles.
- A 30/60/90-day cohort contains first-time attendees whose first selected Club
  event occurred at least that many days before the observation end. A member
  returned when they attended another distinct Club event after the first and
  no later than the cohort deadline. Immature members are excluded from both
  numerator and denominator.
- Weekday and start-time band use the event calendar time zone. Time bands are
  before noon, noon to 4:59 PM, 5 PM to 7:59 PM, and 8 PM or later.
- Duration bands are under one hour, one to under two, two to under four, and
  four hours or more. Invalid negative durations are categorized as invalid
  rather than silently clamped.
- Location grouping trims whitespace and uses `Missing` for an empty value.
- Fastest-growing rankings require a nonzero comparison-period attendance
  denominator. Top-rated/reliability rankings require at least five valid
  overall-rating responses; lower-response values remain visible elsewhere.

### Feedback definitions

- A feedback response belongs to the event linked by
  `EventFeedbackConfig.formId`; event names are never used for linkage.
- Valid core ratings are integers from one through five. Each rating reports
  its own valid-response count and average.
- Response rate is linked feedback responses divided by distinct event
  attendees. A response from a retained member without attendance is retained
  in response count for audit visibility but cannot make the rate exceed one;
  the DTO exposes an unmatched-response count.
- Discovery distributions describe valid discovery answers among feedback
  respondents and include that denominator in the DTO.
- Cross-event analytics never return qualitative answers, response IDs, member
  IDs, or custom-question values.

### Audience definitions

- The base population is every current retained Member profile.
- The attending population is base-population profiles with at least one
  selected distinct attendance.
- New profiles have `dateCreated` in the reporting period.
- Age bands use the stored `Member.age` because historical DOB-at-event age is
  not retained. Bands are under 18, 18-20, 21-24, 25-34, 35+, and invalid.
- Graduation cohort uses the graduation year from `gradDate`; invalid dates are
  visible as invalid.
- Missing, invalid, and `Prefer not to answer` remain explicit categories.
- For each segment: base share is segment profiles/base profiles; audience
  share is segment attendees/all attendees; participation is segment
  attendees/segment profiles; representation gap is audience share minus base
  share; repeat rate is segment attendees with two-plus selected events/segment
  attendees; dues-paid rate is currently paid segment profiles/segment
  profiles.
- Event affinity is the selected demographic crossed with event tag using
  distinct members and distinct attendances. Internal results are unsuppressed.
- Named audience rows contain only Member UUID, display name, category,
  selected attendance count, last selected Club event name/date, and current
  paid/unpaid status. Member UUID is used only for stable client row identity
  and internal CSV; sponsor output never receives it.

### Dues definitions

- Current paid/unpaid status is calculated for every current Member profile by
  passing all of that member's retained dues rows through `buildDuesStatus` at
  the report reference date.
- Current paid coverage is paid profiles divided by all current retained
  profiles. Every current profile is expected to pay; no waiver population is
  inferred.
- Recorded-credit trends deduplicate `(memberId, year)` and group by
  `paymentDate`. Active and stale counts remain separate.
- Academic-year curves use the row's stored dues year and elapsed days from
  August 1. They report distinct recorded credits, active credits, stale
  credits, and recorded-credit coverage.
- A historical academic-year denominator contains retained profiles whose
  `dateCreated` is before that academic year's exclusive August 1 end. It is
  labeled `retained profiles by year end`.
- Coverage milestones at 25%, 50%, 75%, and 90% use the first payment date on
  which recorded-credit coverage met the threshold. An unreached milestone has
  a null date.
- Previous-year pace compares recorded credits at the same elapsed day of the
  academic year. It does not compare dollars.
- Paid/unpaid engagement uses current dues status crossed with selected-period
  distinct attendance, reach, and repeat attendance.
- Named unpaid rows contain Member UUID, display name, graduation year,
  selected distinct event count, last selected Club event name/date, and
  points. No contact, payment, or edit field is returned.

### Highlights

Highlights are deterministic observations over the returned metrics, not
causal recommendations. A highlight is omitted when its denominator is absent
or its reliability rule is not met. Each includes a stable kind, action-group
key, plain-language message, destination section, and URL filter payload. The
client renders groups in the stable order below while preserving source order
inside each group:

- `membership`: Grow membership;
- `engagement`: Deepen engagement;
- `programming`: Plan programming & turnout;
- `audience`: Understand audience;
- `dues`: Collect & renew dues;
- `measurement`: Improve measurement, omitted when neither response nor
  selected-demographic coverage needs attention.

Initial kinds are:

- retained profile creation count and mature 30-day profile-to-first-event
  activation;
- comparison-period attendee continuation and mature 30-day first-attendee
  return;
- strongest event-tag attendance growth and largest decline, each decomposed
  into total attendance, event count, and average turnout per event;
- strongest schedule window adjusted against each event type's median when at
  least five events and two event types qualify, otherwise the highest average
  weekday/time combination with at least three events;
- highest 30-day return among first-event tags with at least five mature
  first-time attendees;
- mature 30-day first-attendee return rate with numerator and denominator;
- largest overrepresented and largest underrepresented audience segments with
  at least five base profiles;
- current recorded-credit pace decomposed into renewed, first-recorded,
  reactivated, and prior-year not-yet-renewed cohorts;
- selected-period reach among currently unpaid profiles;
- the next unreached current active-credit milestone among 25%, 50%, 75%, and
  90%;
- low or absent linked-feedback coverage when selected events exist;
- selected-demographic profile coverage below 80%.

Percentage comparisons use total distinct member-event attendance in each
period, but their copy also reports event counts and average turnout so added
programming cannot masquerade as stronger per-event demand. Schedule
comparisons prefer the median of `event attendance / event-tag median` to
reduce program-mix confounding, requiring five events and two event types; the
average-turnout fallback retains a three-event minimum. Return behavior uses
only mature 30-day cohorts. Dues lifecycle comparisons deduplicate profile/year
credits and use the same elapsed academic-year day. Dues follow-up uses the
current all-profile dues baseline and selected-period event reach; it never
infers a waiver, motive, propensity, or causal effect.

## tRPC/API behavior

Add `analyticsRouter` to the application router.

### `analytics.getReport`

- Type: `permProcedure.query`.
- Input: `analyticsReportInputSchema`.
- Access: `requireClubAnalyticsRead`.
- Output: metadata, resolved filters/options, and complete `overview`, `events`,
  `audience`, `dues`, and `reports` DTOs.
- The response includes full internal tables for the selection; table
  pagination is client-side presentation over those complete arrays and never
  performs a hidden second fetch. Internal exports remain complete regardless
  of the visible page or selected page size.
- No source table row is returned directly.

### `analytics.exportReport`

- Type: `permProcedure.query` because it is read-only.
- Input: `analyticsExportInputSchema`, which combines the report filters with
  `overview | events | audience | dues | sponsor`.
- Access: `requireClubAnalyticsRead`.
- Output: `{ content, fileName, mimeType }`, where MIME is
  `text/csv;charset=utf-8` and filenames include the report kind and resolved
  period.
- Internal exports have explicit record types/sections instead of forcing
  unlike measures into ambiguous columns.
- Sponsor export is built only from aggregate sponsor DTOs.

Procedure names, schemas, and exported types receive concise JSDoc describing
population and privacy semantics for future API-context generation.

## Validation

- Shared schemas live in `packages/validators/src/analytics.ts` and are
  re-exported from `@forge/validators`.
- The period is a discriminated union. Academic years are bounded to
  2000-2100; custom dates must be valid, ordered, and no more than ten years
  apart.
- Comparison is `previous_period | previous_academic_year | none`.
- Section is `overview | events | audience | dues | reports`.
- Demographic is `age | school | major | level_of_study | graduation | gender |
race_or_ethnicity | shirt_size`.
- Event IDs are UUIDs. Tag values are trimmed, nonempty, bounded strings and
  deduplicated after parsing.
- Unknown URL values fall back to documented defaults in the Blade parameter
  adapter. Invalid direct API inputs fail with `BAD_REQUEST`/Zod details.
- Stored feedback is parsed defensively as unknown data. Invalid stored answers
  never crash the entire report and never become measured zeros.

## CSV and disclosure control

- All CSV uses RFC 4180 quoting and UTF-8 text.
- Cells beginning, after leading whitespace, with `=`, `+`, `-`, `@`, tab, or
  carriage return are prefixed with a single quote before CSV escaping.
- Internal CSVs include report metadata and all approved rows for that section.
  Internal audience and dues exports may include names and Member UUIDs.
- Sponsor CSV includes period, filters, generation time,
  `club-analytics-v1`, metric name, numerator, denominator, value, and coverage
  where applicable.
- Sponsor CSV excludes names, IDs, dues measures, individual history, exact
  ages, event/member cross-tabs, raw responses, and qualitative feedback.
- Sponsor demographic output applies a threshold of five. A category is not
  published separately when its member or attendee count is below five, or
  when publishing it would expose a complementary cell below five. Suppressed
  values are combined into `Withheld / other`; the reason and threshold are
  included in metadata.
- Suppression is deterministic and covered by tests. The UI describes the
  sponsor CSV as privacy-reduced, not anonymous.

## Data / migration / compatibility

- No schema or migration is required.
- No existing procedure, permission bit, event-feedback policy, dues write, or
  route contract changes.
- The feature is additive and can be rolled back by removing the route,
  navigation item, router, validator, and pure report code.
- Reports reflect a read-time view and are not stored snapshots. CSV metadata
  includes generation time so later exports are not expected to be byte-equal
  after source records change.
- Large retained datasets are bounded by selecting only necessary columns and
  scoping events/attendance/feedback in SQL. Aggregation remains server-side.
  If production volume later exceeds the request budget, materialized summaries
  are a separate measured optimization rather than part of this schema-free
  implementation.

## Discord integration

Analytics reads the approved Discord archive without creating Discord roles,
messages, events, threads, sync attempts, or external side effects.

- `analytics.getDiscordReport` applies the Club Analytics read policy and
  returns selected-period aggregate metrics plus rows for stable Discord
  authors matched through `User.discordUserId` to retained Members.
- Each matched row contains Member UUID/name, stored Discord username, message
  count, active days, active surfaces, and last-message time. It contains no
  message record/body/ID or raw Discord author ID.
- Duplicate stable identity matches resolve deterministically to one retained
  Member row.
- Discord matched-Member names are clickable only when the server-provided
  access map confirms separate Member-admin read access. The shared Member
  query repeats that authorization at the API boundary.
- The internal Discord CSV includes matched-Member rows. Sponsor output remains
  aggregate-only.
- No combined engagement score, relationship inference, or causal conclusion
  is produced.

## Configurability review

Would this require a developer change next year?

- Answer: No for ordinary annual use. Academic years derive from the August 1
  boundary, semesters reuse the existing centralized semester constants, tags
  and event choices come from stored events, and demographics come from the
  current Member schema.
- A developer change is appropriate only when the organization changes the
  shared definition of a semester/academic year, adds a new stored demographic,
  changes sponsor disclosure policy, or instruments one of the explicitly
  deferred measures. Those are product/data-contract changes rather than
  routine yearly configuration.

## React / frontend constraints

- `apps/blade/src/app/admin/analytics/page.tsx` remains an async Server
  Component. It authenticates, authorizes, parses search params, and fetches the
  report before rendering.
- Client components are limited to URL filter controls, tabs, charts, table
  pagination/presentation, disclosure/tooltips, and CSV download behavior. No
  page-level `"use client"` and no client-side source-record aggregation.
- The selected section and filters remain in URL search parameters. Section
  tabs use links or router replacement and remain keyboard accessible.
- Use the Blade design system's dark-first tokens and shadcn/Recharts chart
  wrappers. The hierarchy is compact and Grafana-inspired, but cards, borders,
  radii, spacing, type, and chart colors stay within Blade tokens.
- Summary tiles use raised surfaces; analytical panels use inset surfaces.
  Avoid nested-card stacks and decorative gradients.
- Every chart has an adjacent or toggleable accessible table/text equivalent.
  Tooltips include label, value, denominator where relevant, and comparison.
- Use patterns/labels in addition to color for paid/unpaid, first/returning, and
  base/audience series.
- Wide tables live in labeled contained horizontal scroll regions. The
  document must not overflow at 320 CSS pixels and controls retain 44-pixel
  touch targets.
- Event detail, demographic segment, affinity, named Member, and named unpaid
  tables paginate complete report arrays at 10 rows by default. Controls expose
  10, 25, and 50 rows, current range, total rows, page count, and accessible
  previous/next actions; changing report filters starts a fresh dashboard
  render and does not alter export scope.
- `loading.tsx` preserves shell/filter/tab/panel geometry with skeletons.
  `error.tsx` retains a clear Analytics heading and retry action. Empty and
  feedback-unavailable states do not replace measured turnout with zeros.
- Report links to Event or Member administration render only when the caller
  separately has the needed admin permission; analytical drill-downs remain
  read-only. Named Audience, Dues, and Discord Member rows use the shared
  Member detail dialog only with separate Member-admin read access.

## Testing / verification strategy

- `packages/validators/src/tests/analytics.test.ts`: period/input boundary and
  normalization tests.
- `packages/api/src/tests/analytics/access.test.ts`: unauthenticated,
  unauthorized, `READ_CLUB_DATA`, and officer procedure behavior.
- `packages/api/src/tests/analytics/report.test.ts`: deterministic pure-builder
  tests for deduplication, filters, comparison, cohorts, demographics, dues,
  feedback, highlights, and empty data.
- `packages/api/src/tests/analytics/export.test.ts`: internal fields, sponsor
  exclusion/suppression, and spreadsheet-formula neutralization.
- `apps/blade/src/tests/admin/analytics-dashboard.test.tsx`: server-renderable
  headings, definition copy, empty/feedback states, and chart table
  alternatives.
- `apps/blade/src/tests/e2e/admin-club-analytics.spec.ts`: high-value authorized
  navigation/filter/export flow and unauthorized redirect, using deterministic
  seeded fixtures if the existing e2e database harness supports the records.
- Run narrow package tests first, then package typechecks/lints, React analysis,
  Blade e2e, `pnpm verify:push`, and `git diff --check`.
- Visual QA covers dark and light themes plus 320, 768, and desktop widths.

## Open questions

- None for the approved first implementation.
