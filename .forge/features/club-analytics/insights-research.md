# Club Analytics Actionable-Insights Research

Date: 2026-07-17

## Product conclusion

The analytics workspace should treat the `What changed` surface as a lifecycle
action brief, not a feed of unusually large numbers. The most useful sequence
for this Club is:

1. a retained Member profile is created;
2. the profile records a first Club-event attendance;
3. the first-time attendee returns and develops consistent attendance;
4. the profile receives and renews an academic-year dues credit; and
5. programming and audience patterns are compared with those transitions.

No observed transition explains why another transition happened. Blade should
use `associated with`, `followed by`, `returned`, and `recorded`; it should not
use `caused`, `converted by`, `at risk`, or `disengaged` without stronger data.

## Evidence that shaped the metric hierarchy

- ASAE recommends aligning community measures with engagement, growth,
  retention, and contribution rather than collecting vanity metrics. It also
  cautions that participation is useful behavioral evidence but is not a proxy
  for a member's emotional connection or perceived value.
- The 2024 Membership Marketing Benchmarking Report found organization-level
  associations between increasing participation and stronger membership and
  renewal outcomes. Those results justify testing the relationship inside
  Blade; they are not causal evidence or a benchmark for a university club.
- Longitudinal fitness-membership research found that early attendance
  frequency and consistency were associated with later attendance and
  retention. This supports activation, recency, frequency, and consistency
  cohorts while remaining an analogy rather than a Knight Hacks target.
- Product-retention methodology counts distinct people once and excludes
  people who have not had the full opportunity to complete a return window.
  Blade should continue using mature 30/60/90-day cohorts.
- Membership and fundraising cohort methods separate renewed/repeat,
  not-yet-renewed, first-recorded, and reactivated populations. A lifecycle
  waterfall is more diagnostic than a single total-credit delta.

## Priority 0: action brief from current data

### Activate Member profiles

- **Retained profile creation change:** retained profiles created in the
  selected period versus an equivalent comparison period. This is not net
  membership growth because deleted profiles are unavailable.
- **30-day profile activation:** profiles created in the selected period with
  at least 30 observable days that record a first Club-event attendance within
  30 days. Report activated and mature counts.
- **30-day first-attendee return:** mature first-time attendees who record a
  later Club-event attendance within 30 days. Report returned and mature
  counts.

### Grow event engagement

- **Event-type change decomposition:** total distinct member-event attendance,
  event count, and average attendance per event for current and comparison
  periods. A total-attendance increase caused mathematically by holding more
  events must not be presented as stronger per-event turnout.
- **Period attendee continuation:** comparison-period attendees who also
  attend in the selected period, plus the count with no selected-period
  attendance. This is recorded-attendance continuation, not Member retention.
- **Attendance frequency and consistency:** retain the current frequency bands;
  later add weeks or months active so one burst of check-ins is distinguishable
  from steady participation.

### Plan programming

- **Schedule-window performance:** average attendance per event, not aggregate
  attendance, with at least three events and deterministic tie-breaking.
- **Gateway event type:** 30-day return by a profile's first Club-event tag,
  with at least five mature first-time attendees. Report the numerator,
  denominator, and event-type filter.
- **Acquisition versus retention matrix:** in a dedicated later panel, compare
  first-time-attendee yield, returning-attendee share, and mature return rate
  per event type. Do not collapse these distinct jobs into one score.

### Understand the audience

- **Representation gaps:** show the largest qualifying over- and
  underrepresented categories rather than only the largest absolute gap.
- **Reach and repeat gaps:** later compare each category's participation and
  repeat rates with the all-profile baseline. Use demographic results to audit
  access and programming, never to prioritize dues collection against a
  protected group.

### Collect and renew dues

- **Comparable-day pace:** unique recorded credits on the same elapsed day of
  each academic year.
- **Dues lifecycle:** among retained profiles, split the current academic year
  into renewed (credit in both years), not yet renewed (prior but not current),
  first-recorded (current with no earlier credit), and reactivated (current,
  skipped prior year, had an older credit). Historical percentages must use a
  known prior-payer cohort, not today's profile count.
- **Reached unpaid profiles:** current unpaid profiles with selected-period
  attendance, with repeat attendees called out separately. These are warm
  operational cohorts, not propensity scores.
- **Next current milestone:** additional active credits required for the next
  25%, 50%, 75%, or 90% of current retained profiles.

### Improve measurement

- Show absent or low linked-feedback coverage only when matching events exist.
- Show selected-demographic profile coverage below 80%.
- Prefer explicit missingness over fabricated rankings or zeros.

## Priority 1: dedicated analysis from current data

- Academic-year dues lifecycle waterfall and year-over-year cohort table.
- Renewal rate among prior-year payers by prior-year attendance band
  (`0`, `1`, `2`, `3+`) with denominators and percentage-point gaps.
- Event-type association with payer renewal, labeled as overlapping cohorts and
  requiring at least 20 eligible profiles, five outcomes, and three events.
- Mature first-event-to-dues and first-payment-to-event 7/30/60/90-day cohorts.
- Current payers with no recorded attendance in a window where Club events
  actually occurred; never label them disengaged.
- Payment-day median and interquartile range for completed academic years.
- Event-type acquisition/retention matrix and monthly attendance-consistency
  bands.

Rate/lift insights should normally require at least 20 eligible profiles per
comparison group and five measured outcomes. Smaller counts may still appear
as descriptive totals, but Blade should suppress the comparative claim and say
why. Confidence intervals belong in definitions/tooltips when these analyses
become full panels.

## Future data capture

- **Governed Discord activity warehouse:** after a separate privacy and data
  ownership design, measure identity-linked activity recency, frequency,
  active weeks, and participation breadth. Compare those signals with profile
  activation, event return, and dues transitions without reading message
  content into Blade or collapsing distinct behaviors into one engagement
  score.
- **Registration, capacity, and check-in timestamps:** registration conversion,
  show-up/no-show rate, capacity utilization, and arrival curves.
- **Acquisition source, referral, and campaign identifiers:** recruitment
  conversion and channel quality rather than raw profile creations.
- **Outreach timestamp, channel, and campaign:** reminder-to-payment and
  re-engagement response. Randomized variants are required for causal claims.
- **Academic-year eligibility snapshots, due date, and waiver state:** accurate
  historical coverage, lateness, and churn denominators.
- **Event goal, target, cost, and sponsor activation:** efficiency and ROI.
- **Short value/belonging and intent questions:** perceived usefulness,
  likelihood of using the Club as a resource, and renewal intent. Attendance
  alone cannot measure these forms of engagement.

## Sources

- ASAE, [Measuring Community Success: What Metrics Matter (and Why)](https://www.asaecenter.org/resources/articles/an_plus/2025/08-august/measuring-community-success-what-metrics-matter-and-why)
- ASAE, [Measure Member Engagement, Not Participation](https://www.asaecenter.org/resources/articles/an_plus/2017/august/measure-member-engagement-not-participation)
- ASAE Research Foundation, [The Future of Association Engagement](https://www.asaecenter.org/-/media/Foundation/Files/Research/Membership/FutureofAssnEngagement.ashx?hash=B2D9B92EFA263B5317E18B0FA99B6699CC10D3C7&la=en)
- Marketing General, [2024 Membership Marketing Benchmarking Report](https://aro.org/wp-content/uploads/2024/08/The_2024_Membership_Marketing_Benchmarking_Report.pdf)
- Amplitude, [Retention Analysis FAQ](https://amplitude.com/docs/analytics/charts/retention-analysis/faq)
- Rand et al., [Why do new members stop attending health and fitness venues?](https://doi.org/10.1016/j.psychsport.2020.101771)
- Yeomans et al., [Exploring the interplay between attitudinal and behavioural determinants of fitness centre member retention](https://doi.org/10.1080/23750472.2023.2267571)
- Fundraising Effectiveness Project, [2024 Quarterly Fundraising Report](https://afpglobal.org/sites/default/files/attachments/resource/FEP_Report_Q4_2024_Final.pdf)
- Eventbrite, [Event Attendance Tracking Tools and Tips](https://www.eventbrite.com/blog/event-attendance-tracking/)
- U.S. Department of Education, [What constitutes de-identified records and information?](https://studentprivacy.ed.gov/faq/what-constitutes-de-identified-records-and-information)
