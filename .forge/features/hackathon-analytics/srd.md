# Hackathon Analytics SRD

Status: Approved for implementation on 2026-08-06

## Technical purpose

Add server-aggregated, hackathon-scoped analytics to the existing Analytics
experience and extend Club Audience/reporting with composition pies, inferred
year of study, and recruiter-oriented resume indexes. The implementation must
reuse the current Club Analytics presentation and metric primitives while
keeping Hackathon data definitions, access checks, and legacy coverage explicit.

No Projects/Judging data path is part of this system boundary.

## Relevant principles

This feature follows:

- `docs/agentic-development/forge-engineering-principles.md`: package
  boundaries, server-first reads, explicit authorization, observability,
  accessibility, and deliberate compatibility.
- `docs/agentic-development/frontend-design-skill.md`: established product
  language, aggregate-first hierarchy, URL-addressable state, honest dense
  dashboards, and mobile validation.
- `apps/blade/DESIGN_SYSTEM.md`: Blade surfaces, colors, typography, spacing,
  form controls, chart accessibility, table containment, and 320px behavior.
- `.forge/features/club-analytics/spec.md` and `srd.md`: existing metric,
  export, privacy, pagination, and visual contracts unless explicitly replaced
  below.

## Access policy

Every procedure, streaming route, and server page repeats authorization. Client
visibility is not an access boundary.

| Capability                                                                                    | Required access                                             |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Open aggregate Hackathon Analytics and aggregate internal CSVs                                | `IS_OFFICER` or `READ_HACK_DATA`                            |
| Read named hacker analytical rows, identified points leaderboard, or read-only Hacker profile | `IS_OFFICER` or (`READ_HACK_DATA` and `READ_HACKERS`)       |
| Prepare/download Hacker resume bundle and demographic folder trees                            | `IS_OFFICER` only, plus explicit policy acknowledgement     |
| Mutate a Hacker, status, blacklist, mail, or points                                           | Existing mutation policy; Analytics grants nothing          |
| Open linked Hackathon Event administration                                                    | Existing `READ_HACK_EVENT`/`EDIT_HACK_EVENT`/officer policy |
| Read Club Audience additions and aggregate Club exports                                       | Existing `IS_OFFICER` or `READ_CLUB_DATA`                   |
| Prepare/download expanded Member resume bundle                                                | `IS_OFFICER` only, plus explicit policy acknowledgement     |

`requireHackathonAnalyticsRead` is the aggregate helper.
`requireIdentifiedHackathonAnalyticsRead` composes Hack-data and Hacker-read
access. Resume preparation uses a separate officer-only helper and a required,
audited policy-acknowledgement input; identified analytical access alone never
authorizes resume bytes.

Aggregate DTOs contain no person/hacker/operator names (apart from documented
report-local operator aliases), application/profile UUIDs, contact fields,
resume keys, DOBs, free-text dietary/application responses, Discord identifiers,
blacklist data, or consent fields. Organizer-defined Event/class/tag display
names are allowed. Named-person DTOs and resume transport are separate so
aggregate callers cannot obtain identified data by changing a client option.

An unscoped, unknown, cross-hackathon, or unauthorized identifier returns
`NOT_FOUND` where distinguishing existence would reveal data; malformed inputs
return `BAD_REQUEST`.

## Architecture / data flow

### Ownership

- `@forge/validators` owns Hackathon Analytics input schemas and exported input
  types.
- `@forge/api` owns access helpers, source loading, pure aggregation, metric
  definitions, CSV generation, resume planning/streaming, and audit events.
- `@forge/db` remains schema/client only. Analytics never moves business logic
  into the database package.
- Blade Server Components authenticate, parse URL state, resolve an initial
  hackathon when needed, fetch DTOs, and render the shell.
- Small client components own URL controls, section/local tabs, chart/table
  presentation, pagination, profile dialog state, and streamed-download status.
- No source-record aggregation, privacy filtering, or authorization decision is
  performed in the browser.

### Route and shell

The existing `/admin/analytics` page remains the Analytics entry. URL parameter
`scope=club|hackathon` selects the workspace. Before any scope-specific fetch,
the server resolves it against the caller's capabilities: an absent/invalid
scope becomes Club when Club-readable, otherwise Hackathon when Hack-readable;
an explicitly unauthorized scope redirects to the readable scope; and a caller
with neither capability receives the existing denied state. A dual-capability
caller preserves the existing Club default. The Hackathon workspace also
carries `hackathon=<uuid>`.

The implementation should share shell primitives instead of copying the
current monolithic dashboard:

- admin page header and context badges;
- sticky filter surface;
- section navigation rail;
- metric grid/card;
- raised and inset analytical panels;
- chart legend/table alternatives;
- paginated table region;
- empty/partial/error presentation; and
- internal/external report cards.

Refactoring is permitted only where behavior remains covered by existing Club
tests. It must not redesign Club Analytics.

### Source tables and trust

| Source                    | Use                                                                                                   | Trust / coverage rule                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Hackathon`               | Identity and lifecycle dates                                                                          | Scope by `id`; display `displayName`; do not use retired configuration fields                              |
| `Hacker`                  | DOB, graduation, school, major, stored level, gender, race, country, shirt, dietary response, resume  | Derive age from DOB; do not expose raw free text; account deletion creates survivorship bias               |
| `HackerAttendee`          | Per-hack current status, application time, points, class/VIP, first-time snapshot, whole-hack arrival | `status` is current-only; `timeConfirmed` is partial; `classId` is modern; retired `class` is never reused |
| `Event`                   | Hack-scoped event identity, schedule, purpose, tag, location, points                                  | Verify `Event.hackathonId`; separate `event` and `primary_check_in`                                        |
| `HackerEventAttendee`     | Attendance occurrence, time, point snapshot, first/repeat occurrence, void state                      | Exclude voided; nullable snapshots are legacy/unknown                                                      |
| `HackerCheckInAttempt`    | Mode, outcome, operator, event/class snapshots, minor/VIP/repeat, attempted time                      | Successful attempts durable; failed attempts expire and require retention coverage                         |
| Discord role-grant tables | Current grant state and attempt history                                                               | Report state/errors without Discord IDs                                                                    |
| Resume object store       | Valid owned PDFs                                                                                      | Preserve ownership, size, PDF-magic, streaming, and no-store controls                                      |

Application and demographic joins use:

`Hackathon.id -> HackerAttendee.hackathonId -> HackerAttendee.hackerId -> Hacker.id`.

Event engagement uses scoped keys:

`Hackathon.id -> Event.hackathonId -> HackerEventAttendee(eventId,
hackathonId, hackerAttId) -> HackerAttendee(id, hackathonId)`.

No query may join Hacker event attendance to Club Member attendance.

### Read shape and performance

Select only required columns and filter by selected Hackathon ID in SQL before
aggregation. Aggregate on the server through deterministic pure builders. The
complete authorized result may support client-side table pagination, matching
Club Analytics, but raw source tables never cross the API boundary.

Expensive independent source reads may run concurrently. Cross-hack comparison
loads exactly two explicit hackathons. No `all hackathons × all hackers × all
events` scan is acceptable. Add/verify indexes only after measured query-plan
review; do not add a migration speculatively.

## Selection and time contract

### Selected hackathon

- The report API requires `hackathonId` after server-page resolution.
- Blade resolves a missing selection to:
  1. the most recently started hackathon satisfying
     `startDate <= now < endDate`;
  2. otherwise the greatest `startDate <= now`;
  3. otherwise the earliest future `startDate`;
  4. otherwise an empty no-hackathons state.
- Candidates sort by `startDate` descending for active/past selection and
  ascending for future selection; equal dates sort by Hackathon UUID ascending.
- Comparison defaults to the immediately previous Hackathon by `startDate`,
  never by retired slug/name.

### Reference dates and zone

- Hack age and inferred year use selected `Hackathon.startDate`.
- Club age and inferred year use report generation/reference date because the
  base population is current retained profiles.
- Calendar derivations use `America/New_York`, the Club academic-year convention,
  with August 1 as the academic-year boundary.
- Stored event/check-in timestamps remain instants; labels and bucket boundaries
  render in the event calendar zone.

### Comparison alignment

- Application series use integer elapsed days from each hackathon's
  `applicationOpen`; deadline markers use elapsed days from open.
- Hackathon/event series use elapsed minutes/hours from each hackathon's
  `startDate` only for cross-hack comparisons.
- Per-event arrival panels never overlay an unrelated comparison event unless a
  future explicit event-pairing contract is added.
- A missing comparison denominator returns `null` percentage change; absolute
  change may remain available.

## Metric contract

Metric version is `hackathon-analytics-v1`. Club additions increment the Club
version to `club-analytics-v2` because demographic derivation and resume index
contracts change.

Counts are non-negative integers. Ratios are decimals from zero through one or
`null` when the denominator is zero/unavailable. No metric returns `NaN`,
infinity, or a fabricated zero for missing coverage.

### Current application cohorts

- `applicants`: every retained `HackerAttendee` for selected Hackathon ID,
  including withdrawn.
- `pending`: exact current status `pending`.
- `accepted`: exact current status `accepted`.
- `confirmed`: exact current status `confirmed`.
- `onSite`: `checkedInAt IS NOT NULL`; for legacy rows lacking that modern
  timestamp, current `status = checkedin` is an explicit fallback.
- `knownConfirmed`: status in `confirmed | checkedin` or a non-null
  `timeConfirmed`. This retains confirmation evidence for a person whose later
  mutable status is withdrawn.
- `pendingReview`: current status `pending`.
- `withdrawn`: current status `withdrawn`.

The builder may retain `currentSelected` and `currentConfirmed` as internal
present-state intersections for compatibility and anomaly calculations. Product
copy never calls them historical conversion and never uses admitted/committed
terminology.

Rates exposed as defensible product metrics are:

- confirmed-to-check-in rate = count(`onSite ∩ knownConfirmed`) /
  `knownConfirmed`;
- pending-to-accepted and accepted-to-confirmed historical rates are unavailable
  until a durable acceptance-transition ledger exists.

The total onSite count remains the observed cohort. Current-state intersections
and their anomaly counts remain available internally, but are not presented as
transition rates.

These present-state sets may be non-monotonic in dirty legacy data. Builders do
not clamp or silently repair them; anomaly counts and coverage accompany the
snapshot.

`timeConfirmed` does not define currentConfirmed. Timing results include:
`recordedTimestampCount`, `eligibleCurrentConfirmedCount`, `coverage`, and
timestamp buckets. A null timestamp is missing, not evidence of no confirmation.

### Application time and pace

- Application time is `HackerAttendee.timeApplied`, never Hacker profile
  creation time.
- Daily interval and cumulative buckets begin at `applicationOpen` and extend
  through the later of application deadline or last application for historical
  display. Before/after-window application counts remain explicit anomalies.
- `finalSevenDayApplicationCount` is applications in
  `[applicationDeadline - 7 days, applicationDeadline)`.
- Pending-review age uses the duration from `timeApplied` to report reference
  time in `<24h`, `1-2d`, `3-6d`, `7+d`, and invalid/future buckets.

### Action brief

The Overview evidence register always returns these six kinds in this fixed
order; it does not apply subjective severity thresholds or omit nulls:

1. `manage_application_demand`: applicants, final-seven-day count, pendingReview,
   pendingReview aged 7+ days, and comparison application delta;
2. `advance_application_funnel`: exact current statuses, known-confirmation
   coverage, confirmed-to-check-in rate, and unavailable historical-transition
   disclosure;
3. `prepare_people_and_supplies`: currentConfirmed, recorded dietary-response
   count, shirt-size coverage, and selected-demographic coverage;
4. `staff_live_operations`: retained issue count, failure-coverage state, peak
   successful throughput, active operators, and unresolved role grants;
5. `strengthen_event_engagement`: trusted published program-event count, onSite,
   onSite-eventEngaged intersection/reach, and repeat rate; and
6. `improve_measurement`: confirmation-time, arrival-time, class-snapshot,
   point-snapshot, first-time, and selected-demographic coverage.

Every entry contains stable kind, ordered evidence keys with
value/numerator/denominator/coverage, `available`, and a navigation payload
limited to section plus documented filters. Navigation maps in order to
Applications, Applications, Applications, Live operations, Events, and
Audience. A missing denominator yields `available=false` for that evidence; the
row remains visible as a measurement gap. Copy is descriptive and never claims
causation or recommended staffing.

### Overview definitions

- `publishedProgramEventCount` counts selected-hackathon,
  non-deletion-intent, non-legacy Events with `purpose=event` and non-null
  `publishedAt`. Non-legacy program Events missing `publishedAt` are
  unpublished; legacy Events have unknown publication/purpose coverage and are
  not guessed.
- `selectedDemographicCoverage` is records with a usable selected-dimension
  value divided by the applicable Audience base. Explicit `Prefer not to
answer` and stored `Other` are usable recorded values; `Missing`, `Invalid`,
  `Unknown`, and `Not applicable` are reported separately and are not usable.
- `retainedCheckInIssueCount` counts retained attempts with outcomes
  `invalid_qr | hacker_not_found | wrong_status | not_checked_in | wrong_class |
not_ready`. `already_checked_in` is reported as an outcome but not an issue.
  `unresolvedRoleGrantCount` is a separate pending/failed count; the Overview
  issue card displays their sum and both components.
- `nextLifecycleDeadline` is the earliest future application or confirmation
  deadline at report reference time, or null when neither remains.

### First-time state

Effective first-time is:

`coalesce(HackerAttendee.isFirstTime, Hacker.isFirstTime)`.

`true`, `false`, and null map to `First-time hacker`, `Returning hacker`, and
`Unknown`. Unknown is never combined with returning. Existing non-null attendee
values include both values recorded by modern flows and heuristic migration
backfills; no provenance column distinguishes them. DTO/report metadata exposes
`nativeVsLegacyDerivedProvenance=unavailable` and copy calls this an effective
stored/fallback value rather than an exact historical application answer.

### Event attendance and engagement

- `validOccurrence`: HackerEventAttendee where `voidedAt IS NULL`.
- `distinctEventAttendance`: distinct `(eventId, hackerAttId)` among valid
  occurrences.
- `trustedProgramEvent`: non-legacy Event with `purpose=event` and no deletion
  intent. A legacy Event's defaulted purpose is unknown unless a future explicit
  mapping records otherwise.
- `eventEngaged`: at least one distinct attendance at a matching selected Event.
- `repeatEventEngaged`: distinct attendance at two or more different
  matching Event IDs; repeated occurrences at one event do not qualify.
- `eventReach`: count of `onSite ∩ eventEngaged` divided by onSite. Attendance
  by a person outside the current onSite cohort is retained as a separate
  anomaly count and cannot make reach exceed 100%.
- `repeatEventAttendeeRate`: repeatEventEngaged/eventEngaged.
- `pointsAwardedFromEvents`: sum non-null `pointsAwarded` over valid occurrence
  snapshots at matching Events. Null legacy points remain uncovered, not zero.
- The default purpose is all hackathon Events. Primary-check-in, modern program,
  and `Legacy / unknown purpose` are explicit narrower choices. Purpose and
  snapshot coverage accompany event results.

First-versus-returning program attendance derives from distinct
`(eventId,hackerAttId)` pairs at trusted program Events. For each hacker, order
events by `Event.start_datetime`, then Event UUID; attendance at the earliest
distinct event is first attendance and later distinct events are returning.
The nullable legacy `isInitialAttendance` occurrence snapshot does not define
this event-level metric.

Event rankings use distinct attendance. Median attendance uses the ordinary
mathematical median of per-event distinct counts. Empty input returns null.

### Event arrival series

For a selected Event:

- Include non-voided occurrences with non-null `checkedInAt`.
- Bucket width is five minutes when observed domain is at most eight hours,
  fifteen minutes when over eight through twenty-four hours, and sixty minutes
  when longer.
- Let `width` be the selected bucket width in milliseconds and
  `rawStart=min(event.start, firstValidArrival)` (or Event.start with no
  arrivals). `bucketStart=floor(rawStartEpoch/width)*width` on the UTC epoch.
  Let `requiredEnd=max(event.end, lastValidArrival + 1 millisecond)` when an
  arrival exists, otherwise Event.end. `endExclusive=ceil(requiredEnd/width)*
width`, increased by one width when needed so at least one bucket exists.
  Buckets are half-open `[start,end)` UTC instants. This includes an arrival
  exactly at scheduled/domain end once and remains deterministic across DST;
  labels render in the event zone. Invalid negative event durations do not
  remove valid arrivals; schedule markers report invalid schedule coverage.
- Each bucket returns interval count and cumulative count. Empty buckets inside
  the domain return zero.
- `peakBucket` is the earliest bucket with the maximum interval count.
- `p50Bucket`/`p90Bucket` are the earliest buckets where cumulative arrivals
  reach at least 50%/90% of valid timestamped arrivals.
- `beforeStartCount` uses timestamps before Event.start; `afterStartCount` uses
  timestamps at or after Event.start. An after-end count is also returned for
  audit context.

Class-at-arrival resolution uses only the durable successful
HackerCheckInAttempt linked by `attendanceId` and its class ID/name/color
snapshots. Rows without that immutable class snapshot are labeled `Unassigned /
legacy`; a mutable current class is never backfilled into history. The DTO
reports snapshotted and unassigned counts. The retired free-text
`HackerAttendee.class` is never interpreted.

### Demographic event affinity

For the selected demographic category and explicit Event tag/type filter,
`categoryOnSite` is onSite hackers in that category;
`categoryEventEngaged` is the intersection with hackers having at least one
distinct attendance at a matching trustedProgramEvent; `categoryReach` is the
intersection/categoryOnSite; and `averageMatchingEvents` is distinct matching
`(eventId,hackerAttId)` pairs belonging to categoryOnSite divided by
categoryOnSite. Zero denominators return null. Attendance by category members
outside onSite is a separate anomaly count. Event tag/type filters never admit
primary-check-in or legacy-unknown-purpose Events when a narrower purpose is
selected. The organizer default is `all`, with legacy snapshot coverage shown.

### Points leaderboard

The identified leaderboard is scoped to selected HackerAttendee rows and
returns only:

- attendee UUID for stable row/profile selection;
- display name;
- current `HackerAttendee.points`;
- trusted event-awarded points inside the active event filter plus coverage;
- distinct qualifying events attended;
- current class name/color and VIP state;
- last valid event attendance name/time.

The primary rank uses current points descending with SQL-style competition
ranking (`1, 2, 2, 4`). Stable row order then uses normalized display name and
attendee UUID. Current points may include manual adjustments and therefore are
not represented as the same quantity as filter-scoped event awards.

The aggregate report contains only distribution/summary values. Identified rows
come from a separately authorized procedure.

### Live operations

For the selected window:

- `attemptCount`: retained HackerCheckInAttempt rows.
- `successCount`: attempts with outcome `checked_in`.
- `successRate`: successCount/attemptCount.
- `attemptsPerMinute`: attemptCount divided by selected window duration in
  minutes.
- `peakThroughput`: maximum successful attempts in one five-minute bucket. Only
  attempts in the selected half-open window `[windowStart,windowEnd)` qualify;
  buckets anchor at `floor(windowStartEpoch/5 minutes)*5 minutes` on the UTC
  epoch and are half-open. The first/last buckets are clipped to the selected
  window for inclusion, and the earliest tied bucket wins.
- `activeOperatorCount`: distinct non-null operator IDs; null operators remain
  an `Unknown operator` bucket.
- `repeatOccurrenceCount`: retained attempts where `isRepeatOccurrence=true`.
- VIP/minor counts use attempt-time snapshots; missing minor values remain
  Unknown.

Results group by time bucket, outcome, mode, event snapshot, class snapshot,
and report-local operator alias. Non-sensitive event/class/tag names and colors
may appear because they are organizer-defined analytical labels. Operator
aliases are assigned deterministically by sorting distinct non-null operator
IDs and labeling them `Operator 1..n`; neither source IDs nor staff names leave
the builder. No raw QR, email, phone, DOB, or Discord ID is returned.

The response includes the fixed policy boundary
`failureCoverageStartsAt=referenceTime-30 days` and optional
`oldestRetainedFailedAttemptAt`. Any requested window beginning before the
policy boundary is partial even when no failure rows remain. Successful history
remains usable; mixed success/failure rates are labeled partial rather than
silently comparing unlike retention.

Live windows resolve as half-open instants:

- `last_15_minutes` and `last_hour` end at the server reference time.
- `since_event_start` is valid only with one selected event. It begins at that
  event's start and ends at the earlier of the reference time and the later of
  event end or latest retained attempt for that event. The option is absent for
  All events and a direct invalid combination fails validation.
- `whole_hackathon` begins at Hackathon start and ends at the earlier of the
  reference time and the later of Hackathon end or latest retained attempt.
- A future/zero-duration window returns an empty unavailable rate rather than
  dividing by zero. Historical windows stop at their bounded observation end,
  so months since an event do not dilute attempts per minute.

Discord role health groups current HackerDiscordRoleGrant rows by kind/state
and returns pending/failed counts, retry count, oldest unresolved time, and the
finite safe error family enum `rate_limited | timeout_or_network |
missing_permission | role_unavailable | user_unavailable | discord_api |
unknown`. Case-insensitive keyword/status mapping is evaluated in that order:
429/rate-limit; timeout/network/socket/fetch; permission/forbidden/403;
role+missing/not found/unknown; user/member+missing/not found/unknown;
Discord/API/5xx; otherwise unknown. Only the enum/count leaves the builder. It
never returns desired role IDs, Discord user IDs, or raw error strings.

### Dietary response

`Hacker.foodAllergies` is free text and cannot prove that blank means "no
restriction." Analytics therefore reports:

- recognized known dietary/allergy tags from `@forge/consts` `ALLERGIES`;
- `Other response recorded` for non-empty unmatched text; and
- `No response recorded` for null/blank.

One application may contribute to multiple recognized tags. This panel is a
multi-response distribution and states that percentages need not sum to 100%.
Raw text is excluded from analytics DTOs and reports.

Parsing Unicode-normalizes and case-folds the source, splits on comma,
semicolon, pipe, or newline, trims tokens, and exact-matches canonical labels or
this finite alias map: `dairy -> Milk`, `egg -> Eggs`, `shellfish -> Crustacean
Shellfish`, `tree nut -> Tree Nuts`, `peanut -> Peanuts`, `soy | soybean ->
Soybeans`. Canonical singular/plural aliases listed here normalize to the
canonical plural. Unmatched non-empty tokens set `Other response recorded`;
recognized tokens still remain counted. The parser does not infer restrictions
from arbitrary prose.

## Demographic contract

### Dimensions

Club:

`age | school | major | level_of_study | inferred_year_of_study | graduation |
gender | race_or_ethnicity | shirt_size`.

Hackathon adds:

`country | first_time_status`.

Class, VIP, status, and dietary response are operational cohorts, not
demographic dimensions.

### Category semantics

- `Prefer not to answer`: an explicit stored response.
- `Missing`: null or blank source data.
- `Invalid`: malformed/impossible date or value.
- `Unknown`: an otherwise applicable per-hack snapshot was not recorded.
- `Not applicable`: a valid profile to which the requested derivation does not
  apply.
- Stored `Other`: the person's stored answer; distinct from chart-only `Other
categories`.

Hackathon Level of Study normalizes the retired
`Undergraduate University (2 year)` spelling into the canonical two-year label.
It never combines that category with `Undergraduate University (3+ year)`.
Club may retain its existing render-time combined-undergraduate view.

### Age

Calculate completed years from DOB at the defined reference date. Do not use
stored `Member.age` or `Hacker.age`. Bands are `Under 18`, `18-20`, `21-24`,
`25-34`, `35+`, `Missing`, and `Invalid`. A source with an explicitly
applicable-but-unrecorded snapshot may use `Unknown`; age does not merge
Missing, Invalid, and Unknown.

### Program-aware inferred year

The stable dimension key is `inferred_year_of_study`. Every user-facing label
includes `inferred`.

1. Parse graduation date as a calendar date in `America/New_York`.
2. Missing/invalid becomes `Unknown`/`Invalid`.
3. A graduation date before the reference date becomes `Graduated / alumni`.
4. Academic year starts August 1. `academicYear(date)` is the calendar year of
   the August 1 at or before that date.
5. `remaining = academicYear(gradDate) - academicYear(referenceDate)`.
6. Stored three-plus-year undergraduate maps `remaining >= 3` to `Freshman
(inferred)`, `2` to `Sophomore (inferred)`, `1` to `Junior (inferred)`, and
   `0` to `Senior (inferred)`.
7. Either two-year spelling maps `remaining >= 1` to `First year - 2-year
program (inferred)` and `0` to `Second year - 2-year program (inferred)`.
8. Other valid stored levels return explicit non-inferred categories:
   high-school, graduate/postdoctoral, bootcamp/trade, not currently a student,
   other, or prefer not to answer.

This derivation assumes the expected graduation date follows a standard
program path; it does not assert actual credits or enrollment year.

### Composition cohorts

Club: `all_profiles` (default) or `reached` in the selected Club period.

Hackathon: `applicants` (default), exact current `pending`, `accepted`, or
`confirmed`, `on_site`, or `event_engaged`.

Composition cohort is a local URL-addressable Audience control. It changes the
pie denominator and percentages but does not remove categories from the
complete engagement table.

### Engagement rows

Club retains existing definitions: base profile count/share, reached
count/share, participation, representation gap, repeat rate, dues-paid rate,
program affinity, and authorized named rows.

Hackathon returns for every category:

- applicant count/share;
- current-selected count and rate/applicants;
- current-confirmed count and rate/current-selected;
- on-site count, intersection-with-current-confirmed rate/current-confirmed,
  and on-site share; on-site-outside-current-confirmed remains an anomaly;
- representation gap = on-site share - applicant share;
- event-engaged-on-site count and rate/on-site;
- repeat-event-engaged count and rate/event-engaged;
- average distinct trusted program events per on-site hacker, using only
  distinct pairs whose hacker is in onSite and including on-site hackers with
  zero program events; and
- trusted awarded-point count/share plus point-snapshot coverage.

Every denominator is explicit above. Any zero denominator yields null. The
current stage sets and observed event sets are independently calculated;
event attendance by non-on-site hackers is a separate anomaly count. Anomalies
are shown, not forced into a monotonic funnel.

### Pie aggregation

The pie has a nominal cap of nine substantive/tail displayed slices; protected
truth labels may exceed the total rather than be hidden:

1. retain `Prefer not to answer`, `Missing`, `Invalid`, `Unknown`, and `Not
applicable` as independent slices when present;
2. sort substantive categories by selected-cohort count descending, then
   normalized label;
3. fill remaining slots with the largest substantive categories;
4. combine the remaining substantive tail into `Other categories`;
5. keep stored `Other` distinct from `Other categories`.

Displayed slice counts sum to the selected composition cohort. The complete
table/internal CSV retains every raw category. Category colors are stable by
canonical category key or normalized-label hash, never by current rank.

Internal aggregate charts remain exact and unsuppressed. Chart tail aggregation
is a readability rule, not privacy suppression. External reports apply the
existing threshold-five and complementary-cell rules.

## Reports, CSV, and resume bundles

### Internal and external CSV

`overview | applications | events | live_operations | audience |
points_leaderboard | institutional_summary | sponsor` are separate export kinds. The identified
leaderboard export uses identified-data access; the aggregate Events export does
not embed names.

All CSV follows RFC 4180, UTF-8, and the existing spreadsheet-formula
neutralization rule. Metadata includes selected/comparison hackathon IDs and
display names, generated time, filters/cohorts, metric version, numerator,
denominator, and coverage where applicable.

The institutional summary contains exact aggregate counts and is labeled
sensitive for approved MLH/UCF reporting. Its allowlist is limited to:

- total applications, final-seven-day applications, exact current Pending,
  Accepted, and Confirmed statuses, and checked in;
- selected hackathon-event count, distinct checked-in event-engaged count,
  repeat-event-engaged count, and attendance/point-snapshot coverage;
- retained check-in attempt/success totals and the enumerated mode/outcome
  marginals with failure-retention coverage; and
- applicant composition for each documented Hack demographic dimension, with
  category, count, denominator, and field coverage.

The sponsor summary allowlist is limited to total applications, exact current
Pending, Accepted, and Confirmed statuses, checked in, hackathon-event count,
checked-in event-engaged count, repeat-event-engaged count, and privacy-reduced
applicant composition for the documented dimensions. It never releases status-stage or
event-engagement demographic columns. Threshold five and complementary
suppression operate across this one applicant-composition count column and its
total. New internal metrics do not enter either allowlist automatically.

Both reports exclude person names, person/application/attendance/operator/
storage identifiers, contact/resume fields, exact DOB/age, raw attendance,
named operators, free text, blacklist data, consent fields, and class/hacker
cross-tabs. Selected/comparison Hackathon IDs and display names remain allowed
scope metadata.

### Resume bundle candidate pool

Hack bundle is scoped to the selected hackathon. Candidate pool choices are:

- `current_confirmed` (default, displayed as `Confirmed + checked in`);
- `on_site`;
- `current_selected` (displayed as `Accepted + confirmed + checked in`); or
- `custom_current_statuses`.

The aggregate Reports card shows matching candidate count and profiles with a
resume reference; it does not touch object storage or claim file validity.
Officer-triggered on-demand preview reports validated available/skipped counts
and deterministic parts.
Pending, waitlisted, denied, or withdrawn applicants never enter the default
pool.

Club bundle remains all current retained Members with an available resume; it
is not affected by the selected Club analytics period.

### Resume archive taxonomy

Use the shared, ordered index model below. Each available PDF appears once in
`00 All resumes` and once in every applicable independent tree:

1. `00 All resumes/`
2. `01 Recruiting horizon/`
   - `Graduation date passed`
   - `Graduating within 12 months`
   - `Graduating in 13-24 months`
   - `Graduating in 25+ months`
   - `Unknown`
3. `02 Graduation term/`
4. `03 Inferred academic year/`
5. `04 Level of study/`
6. `05 Major/`
7. `06 University/`
8. `07 Demographics/Age band/`
9. `07 Demographics/Gender/`
10. `07 Demographics/Race or ethnicity/`

Hack level and inferred-year paths preserve two-year versus three-plus-year
programs. Club Level of Study paths preserve exact stored values even though
the Club Audience UI may visually combine undergraduate rows.

Folders use explicit sanitized `Unknown`, `Invalid`, and `Prefer not to answer`
labels; no person is placed in a guessed folder. Empty leaves are omitted.
Filename is sanitized `Last_First_GradTerm_GradYear.pdf` with deterministic
`_2`, `_3` collision suffixes. It contains no database/storage identifier.

Root `README.txt` includes hackathon/candidate pool or Club scope, generation
time, derivation definitions, included/available/skipped counts, folder index,
and sensitive-use warning. It does not list named people. A machine-readable
named manifest is out of v1 because it would duplicate identified demographic
data beyond the requested recruiter indexes.

Recruiting horizon always uses the archive generation calendar date in
`America/New_York`, never the selected Hack start. An invalid graduation date
maps to `Invalid`; a missing date maps to `Unknown`; a valid date before the
generation date maps to `Graduation date passed`. Let `plus12` and `plus24` be
the generation date advanced by 12 and 24 calendar months with end-of-month
clamping. A graduation date from generation date through `plus12`, inclusive,
is `Graduating within 12 months`; one after `plus12` through `plus24`, inclusive,
is `Graduating in 13-24 months`; a later date is `Graduating in 25+ months`.

Preserve current object-ownership validation, per-source max size, PDF magic,
bounded concurrency, content disposition, private/no-store response, `nosniff`,
deterministic planning, and audit behavior. All validated resumes are sorted by
normalized last name, first name, then profile UUID and partitioned into
deterministic numbered parts. Each part contains at most 250 source PDFs, at
most 256 MiB validated source bytes, and at most 1 GiB planned expanded bytes,
where expanded bytes are the sum of source size for every copy across all
applicable trees. Thus all valid files in the chosen pool are covered without
an unbounded archive. The preview returns valid/skipped counts, part count, and
per-part limits. A zero-match or zero-valid-file result returns a clear
non-download state. Partial invalid files produce available parts plus an
aggregate skipped count; no object name or applicant identity appears in the
error.

Preparation requires `policyVersion="resume-sensitive-index-v1"` and
`policyAcknowledged=true` from an officer after the UI shows the corresponding
versioned sensitive-use warning. MLH consent and Guild visibility are not
recruiter consent and do not satisfy this acknowledgement. The tool prepares an
internal download only and never sends files externally.

Each ZIP is written to a private, securely created staging file. The planner
finishes every entry, finalizes the central directory, reopens/verifies the ZIP,
and only then returns download headers and streams the staged file. The staged
file is deleted after completion/abort and by bounded stale-file cleanup. A
build failure before finalization returns a safe non-200 error, so no 200 body
can masquerade as a completed archive.

Audit events have `attempted | completed | failed` phases. Attempted is written
before source retrieval; completed is written only after the staged ZIP has
finalized and verified; failed contains an audit-safe family and no identity or
object key. Metadata includes actor, selected hackathon/candidate pool where
relevant, policy version and acknowledgement, included index keys, part
number/count, valid
resume count, skipped count, and generation time.

## tRPC/API behavior

Extend the analytics API rather than adding REST business logic.

### `analytics.listHackathonOptions`

- `permProcedure.query` using aggregate Hack Analytics access.
- Returns explicit ID, display name, lifecycle dates, and deterministic default
  and comparison candidates.
- Returns no retired name/configuration fields.

### `analytics.getHackathonReport`

- `permProcedure.query` using `requireHackathonAnalyticsRead`.
- Input: `hackathonAnalyticsReportInputSchema`.
- Output: metadata, filter options, coverage, and complete aggregate Overview,
  Applications, Events, Live operations, Audience, and Reports DTOs.
- No person/hacker/operator names, person UUIDs, or source rows; documented
  report-local aliases and organizer-defined Event/class/tag labels are allowed.

### `analytics.getHackathonIdentifiedRows`

- `permProcedure.query` using `requireIdentifiedHackathonAnalyticsRead`.
- Input contains selected Hackathon ID, row kind (`points_leaderboard |
audience`), and matching filters.
- Returns only the approved analytical identity/context fields. It never returns
  contact, resume object, DOB, free text, blacklist, or consent fields.

### `analytics.getHackerAnalyticsProfile`

- `permProcedure.query` using identified-data access.
- Input contains selected Hackathon ID and attendee UUID; both must match.
- Returns a dedicated read-only allowlisted DTO: display name; selected-hack
  current status, points, check-in time, class/VIP; school, major, stored level,
  inferred year, graduation term, shirt size, effective first-time state, and
  displayed demographic categories; plus aggregate event attendance/award
  summary. Both combined identified readers and officers receive this same DTO.
- It never returns email, phone, Discord identity, DOB, raw dietary/application
  text, resume URL/key/bytes, MLH/Guild consent, blacklist fields/reason/actor,
  mutation audit fields, or cross-hack rows. Officers use existing independently
  authorized management routes for those fields. Mutation controls remain
  server-guarded by their existing procedures.

### `analytics.exportHackathonReport`

- Read-only `permProcedure.query`.
- Aggregate kinds use aggregate access; identified leaderboard uses identified
  access.
- Returns `{ content, fileName, mimeType }` and records an admin audit event.

### Resume streaming routes

`analytics.previewResumeBundle` is an officer-only, on-demand read for Hack or
Club scope. Input includes scope/selected-hack/pool/statuses and the exact
policy version/acknowledgement. It validates ownership, size, and PDF magic;
builds deterministic part descriptors; and returns only aggregate
matching/valid/skipped counts, part number/source count/planned bytes, and an
opaque plan fingerprint. It returns no name, path, or object key. This work is
never part of `getHackathonReport` or ordinary page load.

Use GET route handlers only for the resulting per-part ZIP transport. Input
repeats the preview parameters plus `partNumber`, `planFingerprint`, and policy
version/acknowledgement. The route independently repeats officer auth, rebuilds
and validates the current plan, rejects a stale fingerprint or out-of-range
part, stages/verifies exactly that part, then sends it with private/no-store and
`nosniff` using the existing download signal pattern. Hack and Club transports
call shared `@forge/api` planner/security helpers; REST contains no business
logic.

Procedure names, validators, and DTO types receive concise JSDoc describing
population, denominator, legacy coverage, and disclosure boundary.

## Validation

Add schemas under `packages/validators/src/analytics.ts` or a focused
`hackathon-analytics.ts` re-exported from `@forge/validators`.

- Hack section:
  `overview | applications | events | live_operations | audience | reports`.
- Hack demographic: Club dimensions plus `country | first_time_status`.
- Composition cohort:
  `applicants | pending | accepted | confirmed | on_site | event_engaged`.
- Club composition cohort: input field `clubAudienceCohort`, URL key
  `audienceCohort`, values `all_profiles | reached`, default `all_profiles`.
  Hack uses the same URL key with its scope-specific enum/default. The Blade
  adapter replaces an invalid cross-scope value with that scope's default.
- Audience view: `composition | engagement`.
- Event purpose: `program | primary_check_in | legacy_unknown | all`; initial
  and reset default is `all`.
- Live window: `last_15_minutes | last_hour | since_event_start |
whole_hackathon`; initial/reset default is `whole_hackathon`.
- Resume pool: documented candidate-pool enum plus at most seven deduplicated
  valid current statuses for custom pool.
- Resume preparation: officer-only `policyVersion` must equal
  `resume-sensitive-index-v1`, `policyAcknowledged` must be literal `true`, the
  plan fingerprint is a bounded opaque token, and selected `partNumber` is a
  positive integer no greater than the rebuilt plan's part count.
- Hackathon/event/comparison IDs are UUIDs. Event IDs must scope to selected
  hackathon. Comparison ID must differ from selected ID.
- Event tags are trimmed, nonempty, deduplicated bounded strings.
- Unknown URL values fall back through the Blade adapter to documented defaults;
  invalid direct API inputs fail validation.

The API takes its own reference time; clients cannot submit a production
`referenceDate`. Pure builders accept an injected reference date for tests.

## Data / migration / compatibility

- No schema migration is required for v1.
- No source record is modified. Analytics is additive and read-only except for
  existing audit-event writes on exports.
- Existing Club routes and default URLs remain valid for Club-readable users;
  absent `scope` resolves permission-aware as defined under Route and shell.
- Club metric version changes to v2; old exports remain interpretable through
  their embedded v1 version.
- Resume ZIP folder names change intentionally. Report-card copy and tests must
  set the new contract; there is no promise of path compatibility for scripts
  consuming the old four-folder bundle.
- Existing Hacker mutable detail access is not widened. A separate read-only
  analytical profile path prevents an Analytics change from granting writes.
- Failed-attempt retention remains unchanged. The UI reports coverage rather
  than introducing a migration or indefinite retention.
- Reports are read-time views, not stored snapshots. Generation timestamps make
  that explicit.

## Discord integration

This slice reads current Hackathon Discord role-grant and grant-attempt records
for operational health. It creates no roles, retries, messages, events, threads,
or external side effects.

Hackathon Discord message analytics is excluded because archive messages and
channels have no dependable Hackathon ID. Date-windowed guild activity must not
be mislabeled as selected-hackathon engagement.

## Configurability review

Would this require a developer change next year?

- Answer: No for ordinary annual use. Hackathons, lifecycle dates, events,
  classes, tags, statuses, and comparison candidates come from stored records.
  Academic-year boundaries reuse the shared August 1 convention.
- Developer change is appropriate when the organization changes cohort
  semantics, stores a new demographic, changes disclosure policy, changes
  check-in retention, or adds projects/judging/feedback instrumentation. Those
  are product/data-contract changes, not yearly configuration.

## React / frontend constraints

- `/admin/analytics/page.tsx` stays an async Server Component. No page-level
  `"use client"`.
- Hack content should use focused section components and shared Club primitives;
  do not add another 2,000-line dashboard component.
- URL state includes scope, selected/comparison hackathon, section, event
  purpose/tag/event, demographic, composition cohort, local Audience view, and
  live window when applicable.
- The visual acceptance reference is current Club Analytics as inspected in
  `apps/blade/src/tests/e2e/admin-club-analytics.spec.ts`: same header, sticky
  filter geometry, section rail, metric density, surface hierarchy, and mobile
  stacking.
- Use existing Blade/shadcn/Recharts wrappers and tokens. No decorative
  gradients, alternate hackathon theme, raw hex chart palette, nested card
  stacks, or visualization-library switch.
- The selected demographic panel owns one local segmented tab control. Switching
  Composition/Engagement does not create a new page section or duplicate panels.
- Pie charts use exact adjacent legends/tables, keyboard-reachable controls,
  stable category colors, and non-color labels. Avoid pie labels inside narrow
  slices.
- Long labels truncate only on chart axes/legend previews; accessible text,
  tooltip, and complete table retain full labels.
- Complete category search trims the query, applies Unicode normalization and
  case-insensitive substring matching to the full category label, and resets to
  page one whenever the query changes or clears. Clear restores every row; no
  match renders an explicit empty result. Search and pagination never change
  export contents.
- Event arrival charts expose Overall/By class and interval/cumulative values in
  one coherent panel. The exact bucket table is available without hover.
- Hacker names are buttons only when `canOpenHackers` is true. Otherwise they
  render as text or the identified table is absent according to access DTO.
- The read-only Hacker dialog is full-screen at phone width and bounded at
  desktop, matching the existing detail-dialog pattern. It has an accessible
  name, puts initial focus on its close control or first content control, traps
  focus, closes on Escape/close activation, restores focus to the invoking
  hacker button, and creates no document overflow at 320px.
- Loading preserves shell/filter/tab/panel geometry. Error retains the selected
  URL and retry. Partial coverage is a labeled state, not zero.
- Tables use contained labeled horizontal scroll, 10/25/50 pagination, exact
  range/total, and 44px touch targets. The document must not overflow at 320px.
- Reduced motion disables chart/transition animation. Light/dark themes retain
  readable chart contrast.

## Testing / verification strategy

- Validator tests: URL/input defaults, UUID scoping, section/demographic/cohort,
  comparison inequality, status deduplication, and invalid direct inputs.
- Pure report tests: application cohorts, half-open time buckets and DST,
  before/on/after deadline, non-monotonic legacy
  states, attendance deduplication, void exclusion, primary-event exclusion,
  arrival buckets/percentiles, absent/changed class snapshots, points coverage/rank,
  live retention coverage, role health, dietary multi-response parsing,
  demographic rows/pies, inferred year, and comparison alignment.
- Access tests: aggregate versus identified versus resume capabilities,
  unauthorized page/API/route behavior, cross-hack IDs, and unchanged mutation
  authorization.
- CSV tests: complete authorized rows, external exclusions, deterministic
  threshold/complementary suppression, metadata, and formula neutralization.
- Resume tests: candidate pools, exact two-/three-plus-year paths, ordered
  indexes, recruiter horizon, unknown/prefer-not-to-answer, sanitization,
  collision suffixes, no empty leaves, validation skips, zero-valid behavior,
  streaming headers, auditing, and bounded expansion.
- Blade rendering tests: exact six sections, same shell primitives, local
  Audience tabs/cohorts, chart table alternatives, coverage/empty copy, and
  permission-gated profile controls.
- E2E: authorized scope switch/selection/filter/share, Club regression, event
  arrival Overall/By class, points-to-profile flow, report/bundle preparation,
  unauthorized denial, and mobile overflow.
- Visual QA: compare Hack and Club full-page screenshots at desktop, 768px, and
  320px in dark and light themes. Verify geometry/taste consistency rather than
  adding Analytics to a global baseline without deterministic analytics data.
- Run narrow unit/package tests first, then relevant typechecks/lints, Blade E2E,
  React analysis, `pnpm verify:push`, and `git diff --check` during implementation.

## Open questions

- None. Architecture, acceptance/testability, and UI reviewers approved the
  current bundle under the owner's blanket approval.
