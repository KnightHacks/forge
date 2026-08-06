# Hackathon Analytics Test Cases

Status: Approved for test generation on 2026-08-06

## Scope

These cases define observable proof for Hackathon Analytics v1 and the shared
Club Audience/resume additions. They cover access, hackathon scoping, metric
semantics, legacy/partial coverage, demographics, event arrival cadence, Live
operations, points/profile drill-down, reports, recruiter bundles, visual
consistency, accessibility, and responsive states.

Projects, submissions, challenges, judging, event-feedback analytics, and
hackathon Discord-message analytics are intentionally absent. Tests must prove
those domains do not enter routes, DTOs, UI sections, or exports.

## Test placement plan

- `packages/validators/src/tests/hackathon-analytics.test.ts`: input and URL-state
  schema boundaries.
- `packages/api/src/tests/analytics/hackathon-access.test.ts`: aggregate,
  identified, profile, report, resume, and cross-scope access.
- `packages/api/src/tests/analytics/hackathon-report.test.ts`: deterministic pure
  metric/coverage builders.
- `packages/api/src/tests/analytics/hackathon-export.test.ts`: internal,
  institutional, and sponsor disclosure.
- `packages/api/src/tests/resume/bundle.test.ts` plus focused server tests:
  shared recruiter indexes and archive safety.
- Existing Club Analytics tests: regression and v2 demographic behavior.
- `apps/blade/src/tests/admin/hackathon-analytics-dashboard.test.tsx`: static
  shell, copy, accessible alternatives, empty/partial states, capability maps.
- `apps/blade/src/tests/e2e/admin-hackathon-analytics.spec.ts`: high-value
  navigation, selector, arrival, leaderboard/profile, report, and mobile flows.
- Existing `admin-club-analytics.spec.ts`: Club parity/regression.

Implementation verification should run narrow unit suites first, then relevant
package typechecks/lints, Blade E2E, visual review, React analysis,
`pnpm verify:push`, and `git diff --check`.

## Test cases

### TC-001: Aggregate access is independent from identified access

Setup:

- Create an officer, a `READ_HACK_DATA`-only user, a user with both
  `READ_HACK_DATA` and `READ_HACKERS`, and an unauthorized signed-in user.
- Seed aggregate metrics, an identified leaderboard row, a profile, and a valid
  resume.

Action:

- Open the page and call aggregate, identified-row, profile, export, and resume
  routes as each user.

Expected observations:

- Officer and Hack-data reader can read aggregate Analytics.
- Only officer or the combined-data reader receives analytical names, attendee
  IDs, and profiles. Resume bytes are officer-only and additionally require the
  explicit policy acknowledgement.
- Aggregate-only responses contain no hidden identified fields or storage keys.
- Unauthorized users cannot see navigation/page data and every direct endpoint
  denies independently.
- Existing Hacker mutation endpoints remain unchanged and cannot be reached
  through Analytics access.

### TC-002: Club identified resume access is tightened without changing Club analytics

Setup:

- Create Club-data-only, Member-read-only, combined, and officer users.

Action:

- Read Club Analytics and request the expanded Member resume bundle.

Expected observations:

- Club-data-only and officer users retain aggregate Analytics access.
- Only the officer can prepare/download identified resumes, and only after the
  explicit policy acknowledgement. Combined Club/Member read access is not
  resume-export authority.
- Existing aggregate Club pages and CSVs otherwise retain their access behavior.

### TC-003: Hackathon selection is deterministic and URL-addressable

Setup:

- Seed overlapping active hacks, past hacks, a future hack, and equal start-date
  ties.
- Create Club-only, Hack-only, dual-scope, and neither-scope callers.

Action:

- Open Hackathon Analytics without a selection, select another hack, choose a
  comparison, change section/filter/local view, refresh, use back/forward, and
  open the copied URL.

Expected observations:

- Default resolution follows active, latest past, earliest future, and UUID
  tie-break rules.
- An absent/invalid scope becomes Club for a dual/Club-only caller and Hackathon
  for a Hack-only caller before any forbidden fetch. An explicitly unauthorized
  scope redirects to the readable scope; a caller with neither capability is
  denied.
- Every selection persists in the URL and round-trips without changing meaning.
- Comparison never equals selected hackathon.
- Reset restores defaults while retaining Hackathon scope.

### TC-004: All rows are scoped to one selected hackathon

Setup:

- Seed two hackathons with applications, events, identically named classes,
  attendance, attempts, role grants, and points.

Action:

- Build every report/export and supply cross-hack event, attendee, and class IDs
  directly. Supply a distinct second Hackathon as comparison, then equal,
  unknown, and malformed comparison IDs.

Expected observations:

- Metrics and rows include only records connected through scoped IDs.
- Cross-hack identifiers return the documented safe failure and reveal no
  foreign record details.
- A distinct existing comparison Hackathon is allowed; equal, unknown, or
  malformed comparison IDs fail the documented validator/safe lookup rule.
- Matching names do not cause cross-hack alignment.

### TC-005: Current application cohorts use exact present-state definitions

Setup:

- Seed one application in every current status plus legacy anomalies such as a
  checked-in status without timestamp and a timestamp with an unexpected
  current status.

Action:

- Build Overview, Applications, and Audience engagement.

Expected observations:

- Applicants, exact current Pending/Accepted/Confirmed states, known-confirmed,
  on-site, and withdrawn use the SRD sets.
- On-site uses modern timestamp first and checked-in status as legacy fallback.
- Confirmed-to-check-in uses `onSite ∩ knownConfirmed` over knownConfirmed and
  never exceeds 100%.
- Pending-to-accepted and accepted-to-confirmed render unavailable when no
  durable historical acceptance ledger exists; a mutable current-state ratio is
  never labeled conversion.
- Copy uses Pending review, Accepted, Confirmed, and Checked in, never admitted or
  committed.
- Published program-event count excludes unpublished, deletion-intent, and
  legacy/unknown-purpose Events and reports purpose/publication coverage.
- Demographic coverage, retained check-in issue families, unresolved role
  grants, and next lifecycle deadline use the exact SRD definitions.
- The six action-brief kinds always appear in fixed order with the exact
  evidence keys, null/coverage behavior, and section/filter navigation payloads.

### TC-006: Application pace aligns to lifecycle dates

Setup:

- Seed applications before open, at open, within the final seven days, exactly
  at deadline, after deadline, and ties from bulk import. Include a comparison
  hack with different calendar dates/window length.

Action:

- View interval/cumulative series and comparison.

Expected observations:

- Half-open bucket boundaries count each application once.
- Final-seven-day count uses `[deadline - 7 days, deadline)`.
- Exactly-at/after-deadline applications appear as explicit late anomalies.
- Comparison aligns by elapsed day from each application-open date and keeps
  separate deadline markers.
- Ties are deterministic and cumulative totals finish at the included count.

### TC-007: Confirmation timing never overstates coverage

Setup:

- Seed confirmed/checked-in applications with and without `timeConfirmed`, plus
  other statuses with stale timestamps.

Action:

- View confirmation timing and current-confirmed metrics.

Expected observations:

- Current-confirmed cohort depends on current status, not timestamp.
- Timing uses only valid timestamps and reports recorded/eligible counts and
  coverage.
- Missing timestamp is unavailable, not unconfirmed or zero.

### TC-008: Every demographic has Composition and Engagement

Setup:

- Seed all Club and Hack demographic dimensions, all composition cohorts,
  missing/invalid/prefer-not-to-answer/unknown/stored-Other values, and event
  engagement.

Action:

- Select every demographic, switch Composition/Engagement, and switch each
  composition cohort.
- Search with whitespace, case differences, composed/decomposed Unicode, a
  no-match query, clear, and a query change while on a later page.

Expected observations:

- Every documented dimension supports both local views.
- Gender, Race/ethnicity, Age, inferred Class year, Level of study, and Major
  are visible local controls in that order; remaining dimensions stay available
  through the complete selector.
- Local view and cohort are URL-addressable.
- Composition is default; Club defaults to All profiles and Hack to Applicants.
- Pie legend/table show exact category, count, percent, denominator, and
  coverage.
- Engagement complete rows remain based on the full progression population and
  do not become tautological when composition cohort changes.
- Search matches the trimmed Unicode-normalized full label, changing/clearing
  resets page one, no-match is explicit, clear restores rows, and exports remain
  complete.

### TC-009: Hack engagement denominators are actionable and exact

Setup:

- For one demographic category seed applicants, exact current statuses,
  confirmation evidence, on-site, zero-event on-site hackers, one-event hackers,
  two-event hackers, repeat occurrences at one event, and known/unknown point
  snapshots.

Action:

- Build Hack Audience Engagement.

Expected observations:

- The chart compares applicants with checked-in hackers using identical
  demographic categories.
- The complete table shows exact current Accepted and Confirmed counts.
- Confirmed-to-check-in divides the on-site/known-confirmed intersection by
  known confirmed; historical acceptance conversion remains unavailable.
- Event reach counts only the intersection of on-site and event-engaged hackers
  over on-site, so it cannot exceed 100%.
- Repeat rate divides two-plus distinct program-event hackers by event-engaged.
- Average distinct events divides trusted program-event pairs belonging to
  on-site hackers by on-site and includes zero-event on-site hackers.
- Event attendance by a non-on-site hacker is reported as an anomaly and does
  not enter either numerator.
- Points share uses known valid snapshots and states coverage.
- With an event tag/type filter, demographic affinity uses distinct trusted
  pairs belonging to category onSite, divides reach/average by category onSite,
  and reports outside-onSite attendance as an anomaly.
- Every zero denominator yields unavailable/null, never 0%, `NaN`, or infinity.

### TC-010: Long-tail pies are deterministic and truthful

Setup:

- Seed more substantive categories than visible slots, ties around the cutoff,
  and all protected truth labels plus stored `Other`.

Action:

- Build the pie repeatedly and reorder source rows.

Expected observations:

- Display uses deterministic count/normalized-label ordering.
- Protected labels remain separate even if the chart exceeds nine slices.
- Stored `Other` differs from `Other categories`.
- Displayed slices including tail sum exactly to the selected cohort.
- Complete table/internal export retain every source category.
- Category color remains stable when counts/reordering change.

### TC-011: Inferred year is program-aware and shared

Setup:

- Use August 1 boundaries and Hack start dates around them.
- Seed three-plus-year undergraduates graduating in zero, one, two, and three+
  academic years; two-year students graduating in zero and one+; past
  graduation dates; high-school, graduate, bootcamp, non-student,
  prefer-not-to-answer; missing/invalid dates.

Action:

- Build Club and Hack inferred-year dimensions and resume paths.

Expected observations:

- Fall 2026 three-plus-year students graduating Spring 2030/2029/2028/2027 are
  Freshman/Sophomore/Junior/Senior (inferred).
- Fall 2026 two-year students graduating Spring 2028/2027 are first-/second-year
  two-year (inferred).
- Club uses report reference date; Hack uses selected start date.
- Past/non-undergraduate/invalid inputs receive documented explicit labels.
- UI, CSV, and resume folder helper return the same label.

### TC-012: Hack never merges two-year and three-plus-year study levels

Setup:

- Seed canonical and retired-spelling two-year rows plus three-plus-year rows.

Action:

- Build composition, engagement, event affinity, highlights, institutional and
  sponsor exports, and resume folders.

Expected observations:

- Retired spelling normalizes only into the two-year category.
- Publishable two-year and three-plus-year cells retain separate labels in every
  Hack output. Sponsor-suppressed cells may enter only neutral `Withheld / other`
  and never a combined-undergraduate label.
- Club may retain its existing combined presentation while shared raw resume
  paths preserve exact stored level.

### TC-013: Age derives from DOB at the correct reference date

Setup:

- Seed stale stored ages and birthdays before, on, and after the reference date,
  including leap-day and invalid dates.

Action:

- Build Club/Hack age composition and resume age paths.

Expected observations:

- Stored age is ignored.
- Completed years and bands use Club report date or Hack start date.
- Boundary birthdays are correct and Missing, Invalid, and Unknown never merge.

### TC-014: Demographic provenance remains honest across past hacks

Setup:

- Seed a Hacker profile used by two hackathons, then change school/major/resume;
  include a modern attendee first-time value, a heuristic migration-backfilled
  value, and a profile fallback.

Action:

- Compare the past hacks and prepare a resume bundle.

Expected observations:

- UI/export metadata says profile demographics/resume are current values, not
  application-time snapshots.
- First-time status uses attendee value first and profile fallback second, but
  metadata says native versus legacy-derived attendee provenance is unavailable
  and does not call every non-null value an application-time snapshot.
- No copy claims historical demographic snapshots.

### TC-015: Event counts deduplicate turnout and preserve occurrences

Setup:

- Seed trusted program and primary events, a legacy primary-like Event whose
  migration-defaulted purpose says `event`, repeated occurrences for one
  hacker/event, two distinct events, voided rows, and legacy null snapshots.

Action:

- Build Event summary, reach, repeat engagement, popularity, and points.

Expected observations:

- Distinct turnout counts one hacker/event once and excludes voided rows.
- Repeat engagement requires two distinct program event IDs.
- Occurrence count remains separately visible.
- Primary check-in can be isolated from the default all-events view.
- The legacy Event is `Legacy / unknown purpose`, reduces purpose coverage, and
  remains included in the default all-events attendance totals.
- Null legacy point/timestamp values reduce coverage rather than become zero.
- First/returning attendance uses each hacker's earliest/later distinct trusted
  program Event ordered by start then UUID, not `isInitialAttendance`.

### TC-016: Any selected event shows exact overall arrivals

Setup:

- Seed no-arrival, sub-eight-hour, 8-24-hour, and multi-day events; arrivals
  before start, exactly at start/end, after end; voided/null-time rows; ties for
  peak; DST-boundary timestamps.

Action:

- Select each event and view Overall interval/cumulative arrivals.

Expected observations:

- Bucket width follows 5/15/60-minute rules; start is the UTC-epoch floor of
  `min(schedule start, first arrival)`, intervals are half-open, and exclusive
  end is the UTC-epoch ceiling of `max(schedule end, last arrival + 1ms)` with
  at least one bucket.
- Each valid timestamped non-voided arrival appears once.
- Domain, schedule markers, before/after counts, earliest peak, p50, and p90
  follow the SRD.
- Exact bucket table and chart totals agree.
- No-arrival and partial timestamp coverage render honest states.

### TC-017: By-class arrivals use immutable attempt snapshots only

Setup:

- Link attendance to successful attempts with class snapshots. Rename a class,
  change a hacker's current class, and seed a pure-builder attendance fixture
  without a linked class snapshot. Do not delete a referenced class in the DB
  integration fixture because its FK is restrictive.

Action:

- View the event's By class arrivals.

Expected observations:

- Historical series retains attempt-time class name/color.
- Changed current class does not rewrite history.
- Rows without immutable snapshot appear as `Unassigned / legacy`.
- Class coverage denominator is valid timestamped arrivals.
- Series and exact table sums equal covered plus unassigned arrivals.

### TC-018: Points leaderboard ranks truthfully and opens a guarded profile

Setup:

- Seed current points including manual adjustments, event-award snapshots inside
  and outside the event filter, null legacy awards, ties, class/VIP context, and
  last attendance.

Action:

- Sort/view leaderboard, change event filter, and click a name under aggregate,
  identified-read, and edit/officer access.

Expected observations:

- Primary ordering/rank uses current points and competition ties `1,2,2,4`.
- Stable secondary order is name then attendee ID.
- Filter-scoped awards are separately labeled with coverage and do not replace
  current points.
- Aggregate-only caller receives no identified table/profile.
- Identified reader opens a read-only Hacker profile.
- Direct DTO assertions prove the combined reader and officer receive only the
  SRD allowlist; neither receives contact, DOB, resume, raw text, consent,
  blacklist, mutation-audit, or cross-hack fields through Analytics.
- Edit/status/blacklist/mail/point controls appear and execute only under their
  existing stronger server authorization.
- At 320px the dialog is full-screen with no document overflow, has an
  accessible name and deterministic initial focus, traps focus, closes by
  Escape/button, and restores focus to the invoking hacker button.

### TC-019: Live operations reports observed throughput, not queue claims

Setup:

- Seed attempts across modes, outcomes, operators (including null), events,
  class/VIP/minor snapshots, repeats, and window boundaries.

Action:

- Select every Live window and event filter.

Expected observations:

- Attempt/success counts, success rate, attempts/minute, earliest peak
  five-minute throughput, active operators, repeat, mode, outcome, event, and
  class groups match retained records.
- Minor/VIP use attempt-time snapshots and Unknown stays explicit.
- Whole hackathon is the initial/reset window. Operator aliases are stable
  within a report and expose neither source IDs nor staff names; event/class/tag
  display labels remain available.
- Attempts exactly on five-minute/window boundaries prove UTC-epoch anchoring,
  half-open clipping, one-bucket inclusion, and earliest-tie selection.
- Copy calls active operators and throughput observed measures, never queue time
  or recommended staffing.
- Links appear only with existing event/check-in access.

### TC-020: Failed-attempt retention is visible

Setup:

- Seed durable successes, retained failures, a requested window predating the
  fixed `referenceTime - 30 days` policy boundary, and no failures.

Action:

- View whole-hack and recent Live windows.

Expected observations:

- The fixed coverage boundary and optional oldest retained failure timestamp
  are shown. A window before the boundary is partial even when there are no
  failure rows.
- Durable successful history remains countable.
- A partial success/failure rate is labeled partial, not full history.

### TC-021: Discord role-grant health is sanitized and read-only

Setup:

- Seed general/class/VIP grants in pending/succeeded/failed states with retries,
  raw role/user IDs, and errors containing identifiers.

Action:

- View Live operations as an authorized aggregate reader.

Expected observations:

- Counts, age, retry count, and sanitized error families are correct.
- Raw role IDs, Discord user IDs, and unsafe error strings are absent.
- Analytics causes no retry or Discord side effect.

### TC-022: Dietary reporting does not invent “none” or expose free text

Setup:

- Seed null/blank responses, recognized comma-delimited values with casing and
  whitespace variants, multiple tags, and unmatched free text.

Action:

- View Applications and export aggregate data.

Expected observations:

- Results show recognized stated needs, Other response recorded, and No response
  recorded.
- Multi-response percentages state they need not total 100%.
- Raw unmatched text never appears in analytics DTOs/exports.

### TC-023: Internal, institutional, and sponsor reports stay distinct

Setup:

- Seed exact aggregates, named rows, sparse and complementary demographics,
  exact age/DOB, contact data, raw attendance/free text, and CSV-formula strings.

Action:

- Download each report class.

Expected observations:

- Internal organizer exports follow aggregate/identified capability.
- MLH/UCF summary has exact aggregate counts, approved fields, metadata, and a
  sensitive institutional label, with no named/person-level data.
- Institutional rows are exactly the SRD allowlist; adding a new internal
  metric does not add it automatically.
- Sponsor report contains only the headline allowlist plus applicant-composition
  demographics, applies threshold-five and complementary suppression across
  that released count/total, and says privacy reduced, not anonymous.
- Sponsor output never contains demographic engagement-stage columns.
- Both external classes exclude forbidden fields.
- Formula cells are neutralized without changing human-readable values.

### TC-024: Hack resume bundle is recruiter-oriented and safe

Setup:

- Seed candidate statuses, all demographic/inferred/horizon categories,
  prefer-not-to-answer/unknown, colliding names, traversal/control characters,
  valid PDFs, wrong-owner keys, missing/oversized/non-PDF files, and zero-valid
  variants.

Action:

- As an officer, attempt preparation without and with policy acknowledgement,
  then preview/download each candidate pool. Repeat as a non-officer identified
  reader.

Expected observations:

- Default is labeled `Confirmed + checked in` and includes only those two exact
  current statuses.
- Non-officers, wrong policy version, and missing acknowledgement are denied
  before file retrieval.
- Ordinary report load performs no object-store validation. On-demand preview
  reports only aggregate matching/valid/skipped counts, bounded part descriptors,
  and an opaque fingerprint.
- ZIP has ordered All, Recruiting horizon, Graduation term, Inferred academic
  year, exact Level, Major, University, and Demographics/Age/Gender/Race trees.
- Two-year/three-plus-year paths remain separate; unknown and prefer-not-to-
  answer are truthful folders; empty leaves are absent.
- Filenames are sanitized/deduplicated and reveal no DB/storage IDs.
- README contains definitions/counts/warning but no named manifest.
- Partial invalid files produce a bundle plus aggregate skipped count; all
  invalid/zero match produces no empty ZIP.
- Recruiting horizon uses generation date in America/New_York with inclusive
  +12/+24 calendar-month boundaries, end-of-month clamping, and distinct past,
  Missing, and Invalid folders; it does not use Hack start date.
- All valid files are covered by deterministic numbered parts under the source,
  count, and expanded-byte limits.
- Per-part GET independently reauthorizes/revalidates and rejects stale plan
  fingerprints and out-of-range part numbers without revealing file identity.
- Each archive is privately staged, finalized, reopened/verified before a 200
  download, then served private/no-store with `nosniff` and cleaned up.
- Audit records attempted/completed/failed; completed occurs only after ZIP
  verification and no audit error contains identity/object keys.

### TC-025: Club resume bundle receives shared indexes

Setup:

- Seed Members covering recruiter horizon, inferred year, exact level,
  demographic, missing/invalid, and legacy filename cases.

Action:

- Download the Member bundle as an acknowledged officer and attempt it as a
  non-officer with identified Club access.

Expected observations:

- It uses the same ordered shared taxonomy and safety rules.
- Identified Club access alone is denied; officer acknowledgement is required.
- Club Audience may combine undergraduate presentation, but resume Level paths
  retain exact stored two-year/three-plus-year values.
- The existing All/Grad/University/Major use cases remain present in expanded
  form.

### TC-026: Visual and responsive parity matches Club Analytics

Setup:

- Seed long hackathon, school, class, event, and demographic labels plus dense
  charts/tables. Use dark/light themes at desktop, 768px, and 320px.

Action:

- Capture full-page Club and Hack screenshots for every section and local
  Audience/arrival state.

Expected observations:

- Header, badges, sticky filter panel, section rail, metric-card density,
  surface hierarchy, borders, spacing, typography, chart treatment, table
  containment, loading geometry, and responsive stacking match Club Analytics.
- Hack content uses no alternate visual theme or card language.
- Section rail scrolls within its container and document width never exceeds
  320px.
- Controls remain at least 44px and long labels remain readable through full
  accessible text.

### TC-027: Loading, empty, partial, and error states remain honest

Setup:

- Exercise no hackathons, no applications, no selected cohort, no events, no
  attendance, all attendance voided, no timestamps, partial legacy snapshots,
  failed requests, and retry success.

Action:

- Render each section/state.

Expected observations:

- Shell/filter/tab/panel geometry remains stable while loading.
- Empty copy identifies the missing population.
- Partial coverage remains labeled; missing values do not render as zero.
- Error preserves URL selection and exposes retry.
- Pagination still shows correct range/total and exports are not limited to the
  visible page.

### TC-028: Scope contains no Projects or Judging

Setup:

- Seed project, submission, challenge, judge, and rubric rows for the selected
  hackathon.

Action:

- Inspect sections, report DTOs, network calls, exports, and resume bundle.

Expected observations:

- No Projects/Judging section, metric, source query, API field, export row,
  highlight, or report card exists.
- Seeded excluded records do not change any in-scope result.

## Negative / regression cases

### TC-NEG-001: Cross-hack scoped child identifiers cannot infer existence

Setup:

- Use one selected hack and a valid event/attendee UUID from another. Hack-data
  permission is global; this case tests child scoping, not per-hack grants.

Action:

- Pass the foreign UUID to aggregate event filtering, identified rows, profile,
  and export inputs; verify resume validators reject unsupported child-ID
  fields rather than accepting them.

Expected observations:

- The request fails with the documented safe error and exposes no foreign name,
  type, or metric.

### TC-NEG-002: Aggregate-only access cannot be upgraded in the browser

Setup:

- Render as `READ_HACK_DATA` only and tamper with client capability props, route
  query strings, and direct procedure calls.

Action:

- Request identified leaderboard/profile/resume behavior.

Expected observations:

- Server checks deny every identified response; no name, UUID, resume byte, or
  storage key is returned.

### TC-NEG-003: Legacy rows never fabricate purpose, class, time, or points

Setup:

- Seed a legacy primary-like Event with migration-defaulted `purpose=event`,
  attendance with null timestamp/class/initial/points snapshots, and a mutable
  current class.

Action:

- Build arrival, class, repeat, and point analytics.

Expected observations:

- Missing snapshots reduce coverage or appear in Unassigned/legacy.
- Legacy event purpose is Unknown. The default all-events view includes its
  retained attendance and tag totals without reclassifying it as modern.
- Current class is not rewritten into historical arrival.
- Null point/time does not become zero/current time.

### TC-NEG-004: Pie tail aggregation is not privacy suppression

Setup:

- Seed small categories inside and outside the chart tail.

Action:

- Compare internal pie/table, institutional, and sponsor exports.

Expected observations:

- Internal chart may group tail for readability but complete rows remain exact.
- Institutional aggregate follows its exact sensitive contract.
- Sponsor export independently applies threshold/complementary suppression.

### TC-NEG-005: Resume archive expansion remains bounded

Setup:

- Seed the maximum expected number/size of valid PDFs and every index dimension.

Action:

- Generate the archive while monitoring memory, backpressure, and completion.

Expected observations:

- PDFs are fetched/written with bounded concurrency/memory.
- Each PDF appears at most once per documented tree.
- Inputs over one part are deterministically partitioned until every valid PDF
  is covered; each part stays at or below 250 sources, 256 MiB source bytes, and
  1 GiB planned expanded bytes.
- The ZIP is staged, finalized, and reopened successfully before headers. A
  build/verification failure returns a safe non-200, records `failed`, removes
  the staged file, and never records `completed`; every completed response opens
  as a valid ZIP.

## Open questions

- None. The owner granted blanket approval; implementation tests begin after
  the independent artifact reviewers approve this bundle.
