# Club Analytics and Dues Reporting Spec

Status: Approved for implementation

## User-facing purpose

Knight Hacks officers and organizers need one place in Blade to understand who
the Club reaches, what drives event turnout, which programs bring people back,
and how dues collection is progressing. They should be able to use that
information to plan programming, grow attendance, follow up on unpaid dues, and
prepare credible reports for sponsors or other partners.

The analytics workspace should expose as much useful information as Blade can
support without inventing conclusions that the recorded data cannot prove. It
should restore useful Legacy Blade analytics, correct known counting errors,
and add comparisons, cohorts, and export-ready reports.

## Users / actors

- Officers with full administrative access.
- Organizers with `READ_CLUB_DATA`, who receive full read-only Club analytics,
  named event results, and named operational member lists.
- Sponsors and other third parties who receive exported aggregate reports but
  do not access Blade.
- Signed-in users without Club-data access, who cannot see the navigation item,
  page, or report data.

The unit of membership is a Member profile. Analytics does not depend on a
separate user-account count.

## User-visible interface

### Analytics workspace

- Authorized users open `/admin/analytics` through an `Analytics` item in the
  existing admin navigation.
- The workspace has six URL-addressable sections:
  - `Overview`;
  - `Events`;
  - `Discord`;
  - `Audience`;
  - `Dues`;
  - `Reports`.
- A compact filter bar controls the reporting period, comparison period, event
  type, and individual event where those filters apply.
- Period choices include current semester, current academic school year,
  previous academic school years, all time, and a custom date range.
- Current academic school year is the default period. The default comparison is
  the preceding equivalent period.
- Filters apply as soon as they change. Active filters remain visible, may be
  cleared, and appear in the URL so an authorized user can share the same view.
- Each metric identifies its population, period, and denominator through
  nearby copy or a definition tooltip.
- The layout takes its density and hierarchy from an operations dashboard:
  compact summary tiles, full-width analytical panels, precise tables, and
  drill-downs. It still follows Blade's colors, surfaces, typography, and
  responsive behavior.
- Every chart has a text or table equivalent. Color never carries meaning by
  itself.

### Overview

- The overview answers whether the Club is reaching more members, bringing
  them back, running stronger events, and collecting dues.
- Headline metrics include:
  - Member profiles;
  - retained profiles created in the selected period;
  - Club events held;
  - distinct member-event attendances;
  - distinct attendees;
  - member reach;
  - repeat-attendee rate;
  - mature 30-day first-attendee return rate;
  - median attendance per event;
  - current dues-paid rate and unpaid count;
  - average overall event rating with its response count.
- Metrics that can be compared show the absolute and percentage difference
  from the selected comparison period. Copy distinguishes growth from decline
  without claiming why the change happened.
- A `What changed` action brief groups formula-backed observations into Grow
  membership, Deepen engagement, Plan programming & turnout, Understand
  audience, Collect & renew dues, and, when data limits the analysis, Improve
  measurement.
- The brief favors lifecycle transitions over isolated percentage changes:
  retained profile creation and 30-day activation, attendee continuation and
  mature return, event-type change decomposed into programming volume and
  average turnout, gateway event types, over- and underrepresented audience
  segments, comparable-day renewed/first-recorded/reactivated/not-yet-renewed dues
  cohorts, and attended unpaid profiles.
- The action brief remains explicitly non-causal. Action-oriented section
  names help an officer decide where to investigate without presenting a
  measured association as a recommendation or explanation.
- Each lifecycle section uses one compact, divided evidence register with a
  section count. Individual observations are rows rather than nested cards so
  the full brief remains scannable at desktop and narrow widths.
- Every highlight links to the section and filters that support it.

### Events

- Event analytics includes every non-hackathon Club event, including internal
  or role-restricted events. `READ_CLUB_DATA` authorizes the event's name and
  read-only analytics even when the user cannot edit that event.
- Hackathon events never appear and there is no hackathon-inclusion toggle.
- The selected period includes an event according to its scheduled start time.
- Attendance counts one member at most once per event. Repeat check-ins never
  inflate turnout, reach, or popularity.
- Summary metrics include total events, distinct member-event attendances,
  distinct attendees, member reach, repeat-attendee rate, and average and
  median attendance per event.
- The section shows:
  - attendance trends by week or month;
  - first-time versus returning attendees;
  - attendance-frequency bands of zero, one, two to three, four to six, and
    seven or more events;
  - return attendance within 30, 60, and 90 days when a cohort has had enough
    time to mature;
  - most-attended and fastest-growing events;
  - event count and attendance by type, weekday, start-time band, month,
    location, and duration band;
  - event-type and weekday/time performance against the comparison period;
  - event attendance versus overall rating;
  - overall, fun, and learning feedback trends;
  - feedback response rate and response count;
  - event-discovery sources among feedback respondents.
- Discovery-source charts state that they describe feedback respondents, not
  every attendee.
- A sortable event table shows event name, date, type, location, distinct
  attendance, first-time and returning attendance, overall/fun/learning
  ratings, response count, and response rate.
- A user may open a read-only event analytics detail from the table. Existing
  Event administration remains the place for edits, attendance correction,
  raw responses, qualitative feedback, and event-specific CSV files.
- Low-response events retain their measured feedback but are not labeled as
  reliable top-rated events without enough responses for comparison.

### Audience

- The audience section compares all current Member profiles with the profiles
  that attended at least one Club event during the selected period.
- Summary metrics include total profiles, new profiles in the period, profiles
  reached by events, profiles with repeat attendance, and data coverage for the
  selected demographic.
- Available demographic views include:
  - age bands;
  - school;
  - major;
  - level of study;
  - graduation cohort;
  - gender;
  - race/ethnicity;
  - shirt size.
- Each demographic view shows exact counts and percentages for the member base
  and attending audience. `Prefer not to answer`, missing, and invalid values
  remain visible categories instead of disappearing from the denominator.
- The section shows participation rate, attendance share, representation gap,
  repeat-attendance rate, and current dues-paid rate for each segment.
- Organizers may compare a demographic against event type to see which programs
  attract or miss each segment.
- School and major views support long category lists through ranking, search,
  and a complete table instead of discarding the tail.
- Named member drill-downs may show a member's name and analytical context,
  including attendance count, last attended Club event, current dues status,
  and relevant demographic category. The analytics workspace does not expose
  email, phone number, payment identifiers, or editing controls.
- Named Member rows in Audience and Dues open the shared Member presentation
  dialog when the caller separately has Member-admin read access.
  Analytics-only users retain the analytical rows without gaining full profile
  access.
- Profile-growth history reflects retained Member profiles. The interface
  explains that deleted historical profiles cannot be reconstructed.

### Discord

- The Discord section shows selected-period aggregate activity plus a bounded
  table of archived human-message counts for stable Discord authors matched to
  retained Member profiles.
- Each matched row includes the Member name, stored Discord username, message
  count, active days, active surfaces, and last-message time. Unmatched authors
  remain represented only in aggregate measures.
- Member names open the shared admin Member dialog only when the caller
  separately has Member-admin read access. Analytics alone grants no contact,
  file, full-profile, or mutation access.

### Dues

- Every current Member profile is expected to pay dues and belongs in the
  current paid/unpaid denominator.
- The section shows the current academic school year, paid and unpaid profile
  counts, paid coverage rate, and the change from the comparable point in the
  previous academic year.
- Dues history shows:
  - recorded dues entitlements by week and month;
  - cumulative collection curves by academic school year;
  - academic-year entitlement-count comparisons;
  - progress toward 25%, 50%, 75%, and 90% profile coverage;
  - the date each reached milestone was met;
  - active and inactive retained dues entitlements;
  - attendance reach and repeat attendance for paid and unpaid profiles.
- Historical academic-year coverage uses retained profiles that existed by the
  end of that academic year. The report identifies that denominator and does
  not imply that deleted profiles are still represented.
- The section does not report dollars, Stripe/manual splits, revenue, refunds,
  or accounting reconciliation.
- A named unpaid-member table supports dues follow-up. It shows member name,
  graduation cohort, current event count, last Club attendance, and current
  points. It contains no edit controls or contact fields.
- A user with separate member-administration access may follow a link to the
  existing Members dashboard. Analytics access alone never grants edits.
- Copy uses `Paid`, `Unpaid`, or `No active dues credit recorded`. The
  user-facing credit maps to `DuesEntitlement`; it does not call a member
  delinquent or overdue because Blade has no dues deadline or waiver policy.

### Reports and exports

- The Reports section separates internal operational exports from reports
  intended for sponsors or other third parties.
- Internal CSV downloads include the active filters, full unsuppressed
  analytical values, named events, and any named operational table visible in
  the selected section.
- Organizers can download separate internal CSVs for overview, events,
  audience, and dues instead of receiving one ambiguous mixed table.
- The sponsor report CSV contains aggregate reach, growth, event performance,
  audience composition, satisfaction, response coverage, and programming
  highlights for the selected period.
- Sponsor reports exclude member names, member identifiers, dues data,
  individual attendance histories, exact ages, raw or qualitative feedback,
  internal payment details, and editing links.
- Sparse sponsor-report demographic categories are combined or marked as
  withheld when publishing them would expose a person through a small or
  overlapping group.
- Sponsor reports include the reporting period, active filters, generation
  time, metric-definition version, numerator, denominator, and data-coverage
  percentage where applicable.
- CSV files neutralize spreadsheet formulas without changing the displayed
  value a human expects to read.

### Loading, empty, and error states

- Loading states keep the admin shell, filters, tabs, and approximate panel
  layout stable.
- An empty period explains that no matching events or dues records exist and
  keeps current-profile information visible.
- Missing feedback leaves turnout analytics available and labels feedback-only
  panels as unavailable for that selection.
- Failed requests preserve the selected section and filters and offer a retry.
- Partial data never appears as a measured zero.
- The complete workspace remains usable at a 320px viewport without document
  overflow. Wide analytical tables use a labeled contained scroll region.
- Unbounded Event detail, demographic segment, program-affinity, Member
  drill-down, and unpaid-follow-up tables show 10 rows initially with 10, 25,
  and 50-row choices, an exact visible range and total, and previous/next page
  controls. Pagination changes presentation only; internal CSVs still contain
  every matching authorized row.

## Scope

### In scope

- A read-only `/admin/analytics` workspace with Overview, Events, Discord,
  Audience, Dues, and Reports sections.
- Access through `READ_CLUB_DATA` or officer status.
- Named read-only member and event drill-downs without edit or contact fields.
- Selected-period Discord aggregates and matched-Member message-count
  drill-down.
- Current semester, academic-year, previous-year, all-time, and custom periods.
- Equivalent-period comparisons and deterministic highlights.
- Distinct-attendance, reach, frequency, first-time/returning, and mature return
  metrics.
- Event performance by type, schedule, location, duration, and feedback.
- Full demographic comparison and event-program affinity for Member profiles.
- Current and historical dues counts, coverage, pace, milestones, and named
  unpaid-member follow-up.
- Internal analytical CSVs and a separate sponsor-safe CSV.
- Responsive Blade design using compact, accessible analytical panels.

### Out of scope

- Hackathon analytics, hacker demographics, hacker attendance, or a hackathon
  inclusion toggle.
- Event or member editing from Analytics.
- Member email, phone number, resume, payment identifiers, or other contact and
  file fields in Analytics.
- Registration, RSVP, no-show, capacity, marketing-impression, campaign-cost,
  event-cost, target, or sponsor-activation tracking. Those require new data
  capture and are deferred.
- Dues prices, dollars, payment-provider splits, refunds, settlements, waiver
  policy, rollover controls, or accounting reconciliation.
- Raw attendance rows, attendance correction, individual payment history, raw
  feedback responses, qualitative answers, or generic-form analytics.
- Predictive scoring, causal claims, AI-generated recommendations, scheduled
  reports, saved snapshots, or external business-intelligence integrations.
- A formula-identical or visual port of Legacy Blade.
- New permissions or changes to the permission vocabulary.

## Vocabulary

- `Member profile`: A retained Member record. It is the unit counted as a
  member whether or not another user-account concept is relevant.
- `Club event`: An event that is not associated with a hackathon.
- `Reporting period`: The selected inclusive start and exclusive end used for
  event, attendance, feedback, profile-growth, and dues-history results.
- `Comparison period`: The immediately preceding equivalent period unless the
  user selects another academic school year.
- `Distinct attendance`: One Member profile attending one Club event,
  regardless of repeated check-in rows.
- `Member reach`: Member profiles with at least one distinct attendance in the
  period divided by all current Member profiles.
- `First-time attendee`: A Member profile whose first known Club-event
  attendance occurs at that event.
- `Returning attendee`: A Member profile with a known Club-event attendance
  before that event.
- `Repeat-attendee rate`: Profiles attending at least two Club events in the
  period divided by profiles attending at least one.
- `Mature return cohort`: First-time attendees who have had the full 30, 60, or
  90 days available to return before the report's observation end.
- `Representation gap`: A segment's share of attendees minus its share of all
  Member profiles.
- `Current dues status`: Whether an active dues entitlement counts for the Member
  profile under the shared academic-school-year rules.
- `Dues entitlement`: A retained member/year row whose active state determines
  whether the member is current for that academic year.
- `Data coverage`: Profiles with a usable value divided by the applicable
  profile population.
- `Internal CSV`: A full read-only operational export for a user with
  `READ_CLUB_DATA`.
- `Sponsor report`: An aggregate CSV prepared for external sharing.

## Acceptance criteria

- A user with `READ_CLUB_DATA` or officer access can open `/admin/analytics`,
  see the Analytics navigation item, and request every internal report.
- Any other signed-in user is denied at the page and report boundaries and
  receives no analytics data.
- Analytics contains no mutation or editing control.
- Section, period, comparison, event-type, and event filters survive refresh,
  back/forward navigation, and sharing through the URL.
- The default report covers the current academic school year and compares it
  with the preceding equivalent period.
- Every Member profile contributes to the current dues-paid denominator.
- Every attendance metric deduplicates repeated check-ins for the same member
  and Club event, and excludes hackathon events.
- First-time, returning, frequency, reach, and repeat metrics follow the
  definitions in this spec.
- A 30-, 60-, or 90-day return rate includes only cohorts with enough elapsed
  observation time.
- Event analytics includes named internal and role-restricted Club events for a
  Club-data reader but never provides an edit action.
- Event rankings display distinct attendance. Rating comparisons display their
  response count and response rate.
- Discovery-source results state that their population is feedback
  respondents.
- Audience charts show exact counts, percentages, data coverage, and explicit
  missing or `Prefer not to answer` categories.
- A demographic segment can be compared with the member base, attendees,
  repeat attendees, dues status, and event types.
- The named analytical member drill-down excludes contact, file, payment, and
  edit fields.
- Discord matched-Member rows expose only the approved analytical identity and
  activity counts; full Member presentation opens only under the existing
  Member-admin read policy.
- Dues reporting shows current paid/unpaid counts, entitlement timing,
  academic-year comparisons, collection pace, milestones, and active/inactive
  history without showing dollars.
- The unpaid-member table contains names and analytical context but no contact
  fields or edits.
- Internal CSVs match the active filters and include the full values and named
  rows authorized by `READ_CLUB_DATA`.
- Sponsor CSV contains no names, identifiers, dues information, raw feedback,
  or individual history and identifies withheld sparse categories.
- Every CSV is safe to open in spreadsheet software and identifies its period,
  filters, definitions, coverage, and generation time.
- Empty, partial, loading, and failed states preserve available information and
  explain what is missing.
- Charts expose readable text/table equivalents, do not rely on color alone,
  and remain usable with keyboard and screen-reader navigation.
- At 320px, the page has no document-level horizontal overflow and all controls
  retain usable touch targets.

## Open questions

- None.
