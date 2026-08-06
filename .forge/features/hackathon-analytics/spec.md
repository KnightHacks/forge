# Hackathon Analytics Spec

Status: Approved for implementation on 2026-08-06 under owner blanket approval

## User-facing purpose

Hackathon organizers need one place in Blade to understand application demand,
who the hackathon is reaching, whether accepted hackers are progressing toward
attendance, how people move through the event, where check-in operations need
staffing, and what organizers can safely report to MLH, UCF, sponsors, and
recruiters.

The workspace should bring the depth and actionability of the current Club
Analytics experience to hackathons while restoring the useful parts of Legacy
Hack Analytics. It must report what the recorded data supports, make missing or
legacy coverage visible, and avoid presenting current-state application data as
a historical transition log.

This slice also restores demographic composition charts and inferred year of
study to Club Analytics so Club and Hackathon audience reporting share one
coherent interaction model.

## Users / actors

- Officers, directors, and hackathon organizers with Hack Analytics access.
- Hacker-data readers who may inspect named analytical rows and, when they also
  have Hacker-profile access, open a hacker's existing profile/detail view.
- Event operations leads who use check-in cadence, class load, and failure
  signals while staffing the hackathon.
- Recruiting, MLH, UCF, and sponsor contacts who receive purpose-built exports
  but do not access Blade directly.
- Club-data readers who receive the Audience improvements in existing Club
  Analytics.
- Signed-in users without the applicable data permission, who cannot see the
  navigation entry, page, named results, or report contents.

## User-visible interface

### Workspace entry and visual contract

- Hackathon Analytics is a read-only admin workspace reached through the
  existing Analytics area. Club Analytics remains the default Club workspace;
  a clear `Club` / `Hackathon` scope control makes the current data source
  unmistakable and persists in the URL.
- A Hackathon-only reader enters the Hackathon scope without loading forbidden
  Club data. A reader with both capabilities still defaults to Club. Choosing a
  scope the reader cannot access returns them to their permitted scope.
- The Hackathon workspace has six URL-addressable sections, in this order:
  `Overview`, `Applications`, `Events`, `Live operations`, `Audience`, and
  `Reports`.
- A hackathon selector is always visible and defaults deterministically to the
  active hackathon, then the most recently started hackathon when none is
  active. It never relies on a hidden definition of "current."
- Hackathon, section, event type, individual event, demographic, composition
  cohort, audience view, Live operations window, and comparison selections
  appear in the URL so
  an authorized organizer can refresh, use back/forward navigation, or share
  the same view.
- Hackathon Analytics uses the same shell and visual grammar as current Club
  Analytics: the dark grid-backed admin canvas, `Analytics` page header,
  compact context badges, sticky bordered filter surface, horizontal section
  rail, four-column desktop metric grid, inset analytical panels, tables,
  spacing, typography, radius, shadow, chart tokens, loading geometry, and
  responsive breakpoints.
- On narrow screens the filter surface stacks, the section rail scrolls within
  its own container, metric cards become one column, and the document does not
  overflow at 320 CSS pixels, matching Club Analytics behavior.
- Hackathon-specific identity comes from its lifecycle and content, not a
  different card system, color language, or visual theme.
- Every categorical chart has an exact count/percentage legend. Every timeline
  has an exact accessible bucket table. Color is never the only carrier of
  meaning.

### Shared filters and comparison behavior

- The hackathon selector scopes every metric, chart, row, and export to one
  explicit Hackathon ID.
- An optional comparison selector compares the chosen hackathon with one other
  explicit hackathon. It defaults to the immediately preceding hackathon by
  start date when one exists; organizers may select `No comparison`.
- Cross-hackathon comparisons align application timelines by days from
  application open and event timelines by elapsed time from hackathon start;
  they do not compare unrelated calendar dates as if they were equivalent.
- Event type and event filters affect Events and relevant Live operations
  panels. `All events` and a single event are explicit choices.
- Filters apply when changed, active filters remain visible, and one reset
  action restores documented defaults without changing the selected scope.

### 1. Overview

- Overview answers whether application demand is healthy, the current active
  pipeline is progressing, operations are ready, the audience is sufficiently
  represented, and hackers are engaging with programming.
- Headline metrics include:
  - total applications;
  - applications submitted in the final seven days before the deadline;
  - exact current Pending review, Accepted, and Confirmed status counts;
  - whole-hack checked-in count;
  - checked-in share of hackers with recorded confirmation evidence;
  - published program events;
  - distinct event attendees and event reach among checked-in hackers;
  - repeat event-attendee rate;
  - applications with a dietary/allergy response recorded;
  - demographic data coverage; and
  - check-in/Discord-role issues needing attention.
- A stage summary shows `Pending review`, `Accepted`, `Confirmed`, and `Checked in`
  using exact current-state labels. It never presents mutable current-state
  intersections as historical conversion.
- A formula-backed action brief uses the same compact evidence-register style
  as Club Analytics and groups observations under:
  - `Manage application demand`;
  - `Advance application funnel`;
  - `Prepare people & supplies`;
  - `Staff live operations`;
  - `Strengthen event engagement`; and
  - `Improve measurement`.
- Highlights link to the supporting section and filters. They report measured
  counts, coverage, and comparisons without inferring motive, quality, or
  causation.

### 2. Applications

- Applications shows demand and the present operational state of the selected
  hackathon.
- Summary metrics include application count, exact current Pending review, Accepted,
  and Confirmed counts, checked in, withdrawn, and time remaining to the next
  configured deadline.
- The section shows:
  - applications over time, with daily cumulative and interval views;
  - application pace aligned to application open and deadline;
  - the current status distribution;
  - exact current-status counts and an explicit historical-conversion coverage
    disclosure;
  - pending-review age bands;
  - applications and current stages by school, level of study, inferred year,
    first-time status, and other Audience dimensions;
  - first-time, returning, and unknown hackathon participation;
  - shirt-size demand;
  - dietary/allergy responses as recognized stated needs, other recorded
    responses, and no response recorded; and
  - confirmation-timestamp coverage where recorded.
- Application and comparison lines retain deadline markers so organizers can
  distinguish raw volume from pace within the available application window.
- `timeConfirmed` is never treated as a complete confirmation ledger. A
  timestamp chart appears only with an explicit coverage numerator and
  denominator, and missing timestamps are not converted to zero or to
  unconfirmed.
- Current-status operational cohorts link to the existing Hacker roster with
  the selected hackathon/status filter when the caller has the required roster
  access. Analytics itself remains read-only.
- Most demographic fields and resumes are current Hacker-profile values, not
  application-time snapshots. Applications states that provenance wherever it
  compares past hackathons. First-time status uses the per-hack attendee value
  when present, with profile fallback and coverage shown. Legacy attendee values
  were heuristically backfilled without a provenance flag, so the UI discloses
  that native versus legacy-derived provenance is unavailable and does not call
  every value an application-time answer.

### 3. Events

- Events includes every event scoped to the selected hackathon, including
  internal or role-restricted events visible under Hack-data access. Primary
  check-in events are labeled and may be included or excluded rather than
  silently mixed with program events.
- Legacy Events whose purpose was migration-defaulted are labeled `Legacy /
unknown purpose`. The organizer default includes all hackathon events so
  historical attendance remains useful; modern-only, primary-check-in, and
  legacy filters remain explicit. Missing timestamp and point snapshots are
  disclosed as coverage gaps.
- Attendance metrics exclude voided rows. `Distinct attendance` counts one
  hacker once per event; repeat occurrences remain available as a separate
  operational measure and never inflate reach or popularity.
- Summary metrics include selected events, distinct hacker-event attendance,
  distinct event attendees, event reach among whole-hack checked-in hackers,
  repeat event-attendee rate, median attendance, total valid occurrences, and
  points awarded from trustworthy snapshots.
- The section shows:
  - attendance over the hackathon timeline;
  - first event versus returning event attendance;
  - attendance-frequency bands;
  - most-attended events;
  - popular event tags compared by unique hackers and retained check-ins;
  - event count, attendance, and reach by type/tag, weekday, start-time band,
    location, and duration band;
  - class participation and class reach;
  - event attendance by audience demographic; and
  - a sortable complete event table.
- Selecting any event reveals a `Check-ins over time` panel with:
  - an `Overall` view for interval arrivals and cumulative arrivals;
  - a `By class` view using immutable successful check-in-attempt class
    snapshots, separate class series, and explicit `Unassigned/legacy`
    coverage;
  - scheduled start/end markers;
  - peak interval, peak time, arrivals before start, arrivals after start, and
    the interval containing 50% and 90% of arrivals; and
  - an exact accessible bucket table.
- The arrival panel uses actual non-voided `checkedInAt` occurrence timestamps.
  It does not invent timestamps for legacy rows. Coverage states how many valid
  attendances have usable timestamps and modern class assignments.
- A current/mutable class assignment is never presented as the class at a past
  arrival. Rows without a linked attempt-time class snapshot remain
  `Unassigned/legacy`, even when the hacker has a class today.
- Check-in buckets are five minutes for observed windows up to eight hours,
  fifteen minutes for windows over eight and up to twenty-four hours, and one
  hour for longer windows. The visible domain covers the earlier of scheduled
  start or first valid arrival through the later of scheduled end or last valid
  arrival.
- The section includes a points leaderboard scoped to the selected hackathon.
  It shows rank, hacker, current points, valid points awarded in the selected
  event filter, distinct events attended, class, VIP state, and last event
  attendance. Ties share the same competition rank and then sort by hacker name
  and attendee ID for stable display.
- Hacker names in the leaderboard and named analytical tables are interactive
  for callers with Hacker-profile read access. They open the existing Hacker
  profile/detail experience in read-only mode; edit, status, blacklist, email,
  and point-adjustment actions render only for callers with their existing
  stronger permissions. Analytics-only users never gain profile access merely
  from a clickable presentation.

### 4. Live operations

- Live operations is optimized for active-event monitoring and post-event
  staffing review. It uses the same visual components as Club Analytics but
  prioritizes recent check-in and delivery signals.
- Summary metrics include successful check-ins, attempts per minute, peak
  interval throughput, active operators, success rate, repeat occurrences,
  issue count, and pending/failed Discord role grants.
- The section shows:
  - check-in attempts over time;
  - successful throughput over time;
  - outcome distribution;
  - scanner versus manual mode;
  - throughput and outcome by report-local operator alias;
  - throughput and outcomes by event;
  - class assignment/load and arrival cadence;
  - VIP and minor-at-attempt counts where recorded;
  - repeat-occurrence volume and points behavior; and
  - Discord general/class/VIP role-grant state, attempt count, and failures.
- A selectable time window offers `Last 15 minutes`, `Last hour`, `Since event
start`, and `Whole hackathon`, which is the initial/reset default. Historical
  failed check-in attempts may be
  incomplete after their retention window; the UI states the oldest retained
  failed attempt and does not imply full-history failure rates.
- `Active operators` means distinct recorded operator IDs in the selected time
  window. It is an observed staffing measure, not a headcount recommendation.
- Aggregate reports label operators `Operator 1`, `Operator 2`, and so on within
  that report. They do not expose staff names or stable IDs.
- Peak throughput and class arrival cadence help organizers plan staffing for
  future food drops and rush windows, but the workspace does not claim queue
  time or optimal staffing because those fields are not recorded.
- Issue lists are read-only and link to the existing check-in or Hackathon Event
  administration surface when the caller has that separate access.

### 5. Audience

- Audience explains both who applied and how each demographic participates in
  the current pipeline and event program.
- Summary metrics include applicants, exact current Confirmed status, whole-hack
  checked-in hackers, event-engaged hackers, repeat event attendees, and
  selected-dimension data coverage.
- Available Hackathon demographic dimensions include:
  - age at hackathon start;
  - gender;
  - race/ethnicity;
  - country;
  - school;
  - major;
  - level of study;
  - inferred year of study;
  - graduation cohort;
  - shirt size; and
  - first-time hackathon status.
- Every demographic dimension has one local two-view control inside the same
  analytical panel:
  - `Composition` shows a pie chart of the selected applicant/status population
    with an exact count-and-percent legend and complete table.
  - `Engagement` compares applicants with checked-in hackers and shows exact
    current Accepted and Confirmed statuses, confirmed-to-check-in rate where
    confirmation evidence exists, event reach, repeat event-attendee rate,
    average distinct events attended, and share of awarded points.
- The local demographic controls put Gender, Race/ethnicity, Age, inferred
  Class year, Level of study, and Major first in that order. School, graduation
  cohort, country, first-time status, and shirt size remain available where the
  corresponding product records them.
- Composition includes a local cohort selector. Hackathon choices are
  `Applicants`, exact current `Pending review`, `Accepted`, and `Confirmed`
  statuses, `Checked in`, and `Event engaged`; `Applicants` is the default. The selector changes only the
  composition denominator and never turns Engagement stage rates into
  tautologies.
- Composition and Engagement reuse the same category order, labels, and colors
  so an organizer does not have to relearn the dimension between views.
- Bounded dimensions show every category in the pie. Long-tail dimensions use
  a nominal cap of nine substantive/tail slices: protected truth labels remain
  explicit and may make the rendered total exceed nine, the
  largest substantive categories fill the remaining slots, and the remaining
  tail becomes `Other categories`. The adjacent/searchable table retains every
  category. `Other categories` never absorbs stored `Other`, `Unknown`,
  `Missing`, `Invalid`, `Not applicable`, or `Prefer not to answer`.
- The complete table supports a case-insensitive category search. Clearing the
  search restores all categories; no match produces an explicit empty result;
  changing or clearing the search returns pagination to page one.
- Exact counts and percentages remain visible beside the pie. Tooltips are
  additive and are not the only way to read a value.
- Missing, invalid, unknown, self-described, and prefer-not-to-answer values
  remain explicit categories where applicable and stay in the stated
  denominator.
- Hackathon level-of-study reporting keeps
  `Undergraduate University (2 year - community college or similar)` and
  `Undergraduate University (3+ year)` separate everywhere: composition,
  engagement, highlights, CSVs, sponsor-safe reports, resume folders, and
  comparisons. It never applies Club Analytics' combined-undergraduate
  presentation. Sponsor disclosure may replace sparse cells with neutral
  `Withheld / other`; a publishable cell never receives a combined-undergraduate
  label.
- Inferred year of study is a separate derived dimension; it never overwrites
  the stored level of study. Undergraduate categories remain program-aware so
  two-year and three-plus-year students are not merged under a shared inferred
  bucket. Unsupported programs, invalid dates, and ambiguous records are
  labeled `Not inferred` or `Invalid`, not guessed.
- The shared inference uses the August 1 America/New_York academic-year
  boundary. For three-plus-year undergraduates, three-or-more academic years
  remaining is `Freshman (inferred)`, then two `Sophomore`, one `Junior`, and
  zero `Senior`. For two-year undergraduates, one-or-more remaining is `First
year - 2-year program (inferred)` and zero is `Second year - 2-year program
(inferred)`. Past graduation dates and non-undergraduate programs receive
  explicit non-inferred labels.
- Organizers can cross the selected demographic with event type to identify
  reach and engagement differences. The interface describes associations and
  denominators without claiming an event caused the difference.

### Club Analytics Audience additions

- Existing Club Analytics receives the same local `Composition` / `Engagement`
  view model for age, school, major, level of study, inferred year of study,
  graduation cohort, gender, race/ethnicity, and shirt size.
- `Composition` adds the pie chart and exact legend/table; `Engagement` retains
  and deepens the existing base-versus-attendee analysis, participation,
  representation gap, repeat attendance, dues-paid rate, and program affinity.
- Club Composition can switch between `All profiles` and `Reached`; `All
profiles` is the default. This local cohort selector uses the same visual
  treatment and URL behavior as Hackathon Composition.
- Club Analytics keeps its existing combined-undergraduate level-of-study
  presentation. Its new inferred-year dimension remains a separate view and
  includes explicit unsupported/invalid categories.
- Club pie charts use current retained Member profiles as their base population.
  Engagement continues to compare that base with selected-period attendees.
- Program affinity and named Member analytical rows live in Engagement. The
  Club E2E flow switches to Engagement before asserting those panels.
- These additions reuse the existing Club Analytics route, filters, permissions,
  visual shell, and export disclosure rules.

### 6. Reports and exports

- Reports uses the same report-card layout as Club Analytics and separates
  internal operational exports from privacy-reduced external reports and
  recruiter deliverables.
- Internal CSV downloads include:
  - Overview and current pipeline snapshot;
  - Applications and current status cohorts;
  - Events and event arrival buckets;
  - Live operations and retained check-in outcomes;
  - Audience composition/engagement; and
  - Points leaderboard.
- `Organizer data` is the group of separate exact internal section downloads
  plus the identified points download when the caller has that additional
  access; it is not one ambiguous combined file.
- An `MLH / UCF institutional summary` contains exact aggregate application,
  pipeline, check-in, engagement, operations, and demographic counts for
  required institutional reporting. It is labeled sensitive and is not the
  sponsor-safe artifact.
- A separate `Sponsor-safe summary` applies the existing sparse and
  complementary-cell disclosure rules. It states the threshold, coverage,
  denominator, selected hackathon, generation time, and metric-definition
  version.
- Both external summaries exclude names, contact details, resumes, blacklist
  information, free-text applications, and raw attendance records.
- Institutional rows are limited to headline cohorts, program-event
  count/attendance/engagement, event-type aggregates, retained check-in
  mode/outcome coverage, the documented demographic compositions, and coverage
  metadata. Sponsor-safe rows are limited to headline cohort/program metrics
  and privacy-reduced applicant composition. New internal metrics never enter
  either export automatically.
- A `Hacker resume bundle` prepares every current available, valid resume for
  the selected hackathon and selected candidate pool as one or more
  deterministic numbered ZIP parts. It is
  recruiter-oriented and includes a complete `All resumes` folder plus
  independent top-level folder trees for:
  - recruiter horizon (graduated, within 12 months, 13-24 months, or 25+
    months);
  - graduation term and year;
  - inferred year of study;
  - level of study, preserving separate two-year and three-plus-year buckets;
  - university;
  - major;
  - age band, gender, and race/ethnicity under a Demographics tree.
- Each resume appears once in `All resumes` and once in every applicable folder
  tree. A person is never placed into a guessed demographic folder. Missing,
  invalid, unknown, and prefer-not-to-answer values use explicit, sanitized
  folders rather than disappearing.
- The bundle includes a root README with scope, derivation definitions, folder
  index, included/available/skipped counts, and a warning that it contains
  identified resumes grouped by sensitive attributes. It includes no named
  manifest; skipped files are reported only as aggregate counts.
- Resume export defaults to the explicit `Confirmed + checked in` pool
  (`confirmed` or
  `checkedin`). The scope is visible and must be intentionally changed to
  `On site`, `Accepted + confirmed + checked in`, or custom exact current
  statuses. Files are streamed,
  validated, deterministically named, and audited using the same safety model
  as the existing Member resume bundle. Zero valid resumes produces no empty
  ZIP; partial failures disclose only an aggregate skipped count.
- Resume bundles are officer-only internal tools. Before preparation, an
  officer confirms that the selected event/Club policy authorizes the
  recruiting export and sensitive demographic indexing. The system does not
  reinterpret MLH consent or Guild visibility as recruiter consent and never
  sends a bundle to a third party automatically.
- Club Analytics' Member resume bundle receives the same recruiter-oriented
  folder expansion where the corresponding Member fields exist: recruiting
  horizon, graduation term/year, inferred year, level of study, university,
  major, age band, gender, and race/ethnicity, plus `All resumes`.

### Loading, empty, partial, and error states

- Loading keeps the header, selector/filter panel, section rail, metric grid,
  and major panel geometry stable.
- A hackathon with no applications remains selectable and explains which
  measures need applications rather than presenting zeros for unavailable
  data.
- A hackathon with no event attendance retains application and Audience data.
- Legacy attendance without timestamps, class, initial-occurrence, or point
  snapshots is counted only where the definition remains trustworthy and is
  otherwise surfaced as missing coverage.
- Failed requests preserve the selected hackathon, section, and filters and
  offer a retry. Partial data never appears as a measured zero.
- Long category, event, leaderboard, and named-hacker tables start at 10 rows,
  support 10/25/50 rows, show visible range and total, and provide accessible
  previous/next controls. Pagination changes presentation only; authorized
  exports include the complete filtered result.

## Scope

### In scope

- Hackathon Analytics with Overview, Applications, Events, Live operations,
  Audience, and Reports.
- Explicit hackathon selection and optional explicit hackathon comparison.
- Current application pipeline, application pace, first-time participation,
  shirt-size, dietary-needs, and demographic analysis.
- Event attendance, per-event overall/class arrival curves, event programming
  performance, class reach, and a points leaderboard.
- Read-only Hacker profile opening under the existing profile-access boundary.
- Live check-in throughput, retained outcomes, operators, classes, repeat
  occurrences, and Discord role-grant health.
- Hackathon Audience composition pies and engagement views for all listed
  demographics, with exact two-year/three-plus-year separation.
- Club Audience composition pies, engagement views, and inferred year of study.
- Internal exports, an aggregate Organizer/MLH/UCF report, and recruiter-focused
  institutional and sponsor-safe reports, and recruiter-focused Hackathon and
  Club resume bundles.
- Responsive, accessible presentation visually consistent with Club Analytics.

### Out of scope

- Projects, submissions, Devpost conversion, challenges, judging, judges,
  rubric scores, rankings, winners, or prizes.
- Hackathon event-feedback analytics until hacker eligibility and read paths
  use Hacker attendance rather than Club Member attendance.
- Hackathon Discord-message engagement; archived Discord messages are not
  reliably scoped to one hackathon.
- Historical status-transition reconstruction, time-in-stage, or claims that a
  withdrawn hacker never reached a later stage.
- Predictive acceptance, attendance, staffing, or success scores.
- Causal explanations, AI-authored recommendations, or automated applicant
  decisions.
- Raw free-text applications, blacklist data, phone numbers, email addresses,
  dates of birth, consent segmentation, or raw Discord message content in
  analytics reports.
- Queue wait time, venue occupancy, meal consumption, inventory depletion, or
  staffing-optimum claims; those require new instrumentation.
- Editing events, hackers, points, statuses, check-ins, classes, roles, or
  applications from Analytics.
- A visual port of Legacy Hack Analytics.

## Vocabulary

- `Selected hackathon`: The explicit Hackathon ID chosen in the workspace.
- `Application`: One HackerAttendee record for the selected hackathon.
- `Current application state`: The exact mutable status stored on the
  HackerAttendee row. Accepted, Confirmed, and Checked in are separate visible
  states.
- `Historical acceptance conversion`: Unavailable when no durable acceptance
  transition ledger exists. Analytics displays unavailable rather than deriving
  a misleading rate from mutable current states.
- `Whole-hack checked in`: A recorded whole-hack `checkedInAt` timestamp, with
  current status `checkedin` as the legacy fallback when that modern timestamp
  is absent.
- `Trusted program event`: A selected-hackathon, non-legacy,
  non-deletion-intent Event whose configured purpose is `event`. A legacy Event
  with migration-defaulted purpose remains `Legacy / unknown purpose`.
- `Distinct event attendance`: One HackerAttendee attending one Event,
  regardless of repeat occurrence rows.
- `Event reach`: Selected-hackathon checked-in hackers with at least one
  distinct selected trusted-program-event attendance divided by all
  selected-hackathon checked-in hackers.
- `Repeat event attendee`: A hacker with distinct attendance at two or more
  selected trusted program events.
- `Valid occurrence`: A non-voided HackerEventAttendee row.
- `Arrival`: A valid occurrence with a usable `checkedInAt` timestamp.
- `Class`: The modern selected-hackathon class referenced by `classId`; the
  retired free-text class field is never reinterpreted.
- `First-time status`: Per-hackathon attendee value when present, otherwise the
  Hacker profile fallback; null remains `Unknown`, and native versus legacy
  backfill provenance is unavailable.
- `Inferred year of study`: A labeled derivation from expected graduation date,
  selected-hackathon reference date, and stored program type. It does not
  replace stored level of study.
- `Data coverage`: Records with a usable value divided by the stated applicable
  population.
- `External report`: An aggregate, privacy-reduced export intended for MLH,
  UCF, sponsors, or similar partners; institutional and sponsor-safe disclosure
  classes are distinct, and neither is anonymous.

## Acceptance criteria

- Hackathon Analytics appears only for an authorized user and every data/report
  endpoint independently repeats the access check.
- The page exposes exactly the six in-scope sections and no Projects or Judging
  section, card, metric, API payload, or export.
- The selected hackathon and every applicable filter survive refresh,
  back/forward navigation, and an authorized shared URL.
- All visible and exported rows are scoped to the selected Hackathon ID; an
  event, class, application, or attendance from another hackathon cannot leak
  through a supplied identifier.
- Hackathon Analytics matches the current Club Analytics shell at desktop,
  tablet, and 320px widths, including header hierarchy, sticky filters, section
  rail, metric cards, panel treatment, tables, loading states, and no document
  overflow.
- Current pipeline metrics are labeled as a snapshot and do not claim a
  historical transition or use `timeConfirmed` without visible coverage.
- Event popularity and reach deduplicate hacker/event pairs and exclude voided
  attendance. Repeat occurrences remain separately measurable.
- Any selected event can show check-ins over time overall and by modern class,
  with exact buckets, cumulative arrivals, schedule markers, peak interval, and
  timestamp/class coverage.
- The points leaderboard uses current selected-hackathon points, reports
  snapshot coverage for filter-scoped awards, ranks ties deterministically, and
  does not mutate points.
- A hacker row opens a profile only when the caller has Hacker-profile read
  access; mutation actions remain guarded by their existing stronger access.
- Live operations reports retained check-in outcomes, mode, operator, event,
  class, and role-grant health without claiming queue time or full-history
  failures beyond retained coverage.
- Every Hackathon Audience dimension and every listed Club dimension offers
  `Composition` and `Engagement` views with exact counts, percentages,
  denominator, coverage, and a complete accessible table.
- Hackathon level-of-study categories preserve separate two-year and
  three-plus-year undergraduate buckets in UI, highlights, reports, resume
  paths, and comparisons.
- Inferred year of study exists in both Club and Hackathon Audience, remains a
  separate dimension, and never guesses unsupported or invalid records.
- Long-tail pies combine only the tail into `Other categories`; unknown,
  invalid, and prefer-not-to-answer remain explicit.
- Internal exports include all filtered authorized results regardless of the
  visible table page and neutralize spreadsheet formulas.
- External reports exclude named/person-level data and apply deterministic
  disclosure rules: the institutional export is exact aggregate and labeled
  sensitive; the sponsor-safe export applies deterministic sparse/complementary
  protection with threshold and coverage metadata.
- Hackathon and Club resume bundles include the approved recruiter folder
  trees, validate and stream only available owned PDF files, preserve explicit
  unknown/prefer-not-to-answer folders, include the non-identifying README, and
  record an admin audit event.
- Aggregate-only readers cannot obtain names, attendee IDs, profile DTOs,
  resumes, or storage keys through direct API or streaming-route calls.
- Empty, partial, legacy, and error states preserve the shell and never render
  missing data as zero.

## Open questions

- None. Product direction is approved; changes during implementation must update
  this artifact and receive equivalent review.
