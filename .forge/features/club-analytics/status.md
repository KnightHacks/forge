# Club Analytics and Dues Reporting Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-16: Created the feature bundle on `reforge/club-analytics`.
- 2026-07-16: The user selected non-hackathon Club analytics and dues
  reporting; hackathon analytics remains deferred.
- 2026-07-16: Spec Miner classified Legacy Blade as behavioral evidence rather
  than a parity target. Reforge will not preserve its any-history dues status,
  inflated attendance counts, or client-side aggregation over full records.
- 2026-07-16: Product research shaped the workspace around five questions:
  Overview, Events, Audience, Dues, and Reports.
- 2026-07-16: `READ_CLUB_DATA` or officer status authorizes the complete
  read-only analytics workspace, including named Club events and named member
  operational lists. It does not authorize edits.
- 2026-07-16: A Member profile is the unit of membership. Every current Member
  profile belongs in the current dues-paid denominator.
- 2026-07-16: Approved current semester, current and previous academic years,
  all-time, and custom date controls with preceding-period comparison.
- 2026-07-16: Approved full unsuppressed internal demographic analysis,
  member-versus-attendee comparison, and demographic/event affinity views.
- 2026-07-16: Approved distinct member/event attendance, first-time and
  returning cohorts, mature 30/60/90-day return rates, and period deltas.
- 2026-07-16: Approved paid/unpaid, payment timing, academic-year, collection
  pace, milestone, active/stale, and named unpaid-member reporting. Dollar and
  payment-provider reporting are excluded.
- 2026-07-16: Approved separate internal analytical CSVs and a sponsor-safe
  aggregate CSV.
- 2026-07-16: Deferred registration, capacity, promotion, event target/cost,
  and sponsor-activation data capture.
- 2026-07-16: Approved a compact Grafana-inspired information hierarchy using
  Blade design-system surfaces and chart primitives.
- 2026-07-16: The user approved the product direction and authorized artifact
  completion and implementation.
- 2026-07-16: Approved a schema-free, server-aggregated implementation with one
  complete report query and one section-aware CSV export query.
- 2026-07-16: Approved deterministic metric version `club-analytics-v1`,
  five-response reliability thresholds, and sponsor sparse-cell threshold five.
- 2026-07-16: The approved first implementation reuses current linked event
  feedback and does not revive the unused fixed-column Legacy feedback table.
- 2026-07-16: SRD and observable test cases were completed under the user's
  delegated technical judgment; implementation may proceed after generated
  tests demonstrate the intended missing behavior.
- 2026-07-16: Generated focused validator, access, report-builder, and CSV
  tests. Their pre-implementation runs failed only because the planned
  analytics modules did not exist, establishing the intended TDD baseline.
- 2026-07-16: Implemented a schema-free server report builder, strict
  analytics-only source projections, shared access guard, section exports,
  and a separately assembled sponsor-safe export. Dues amounts and payment
  provider identifiers are neither selected nor returned.
- 2026-07-16: Implemented the Blade `/admin/analytics` workspace, conditional
  navigation, URL-owned filters, compact shadcn/Recharts panels, complete
  tables, named read-only operational rows, loading/error/empty behavior, and
  permission-aware links into existing Event and Member administration.
- 2026-07-16: The final artifact-to-code audit expanded each internal CSV to
  include every visible analytical family for its section: comparisons,
  highlights, trends, cohorts, groupings, affinity, collection curves,
  milestones, engagement, and authorized named rows.
- 2026-07-16: Sponsor output now includes aggregate growth, turnout,
  retention, satisfaction, programming, and every demographic dimension.
  Sparse and complementary demographic cells are suppressed independently
  inside each dimension.
- 2026-07-16: Browser execution reached the deterministic analytics E2E setup
  but the configured PostgreSQL endpoint refused the connection before the
  page could render. No development server or browser process was left
  running.
- 2026-07-16: Started the local Colima/PostgreSQL runtime, applied every
  committed migration, and completed the deterministic analytics flow in a
  visible Chromium browser at 1440px and 320px.
- 2026-07-16: Visual review covered Overview, Events, Audience, Dues, and
  Reports screenshots. It corrected the E2E dues-date fixture, stacked the
  long Audience member drill-down below affinity to remove a large empty
  column, improved Reset control spacing, and delayed Recharts mounting until
  a positive measured container size was available.
- 2026-07-16: The shared `ChartContainer` accepts an optional initial measured
  dimension. This additive compatibility change removes Recharts negative-size
  warnings without changing existing chart callers.
- 2026-07-17: The user requested that deterministic `What changed` facts become
  a richer, sectioned action brief. Approved lanes are Grow turnout, Plan
  programming, Understand audience, Follow up on dues, and conditional Improve
  measurement; observations remain formula-backed, non-causal, and linked to
  their evidence.
- 2026-07-17: Follow-up product and analytics research replaced the initial
  grouping with lifecycle-oriented lanes: Grow membership, Deepen engagement,
  Plan programming & turnout, Understand audience, Collect & renew dues, and
  conditional Improve measurement. The research memo is maintained in
  `insights-research.md`.
- 2026-07-17: Attendance changes now separate programming volume from average
  turnout; schedule insight prefers a within-event-type turnout index; dues
  pace is decomposed into renewed, first-recorded, reactivated, and not-yet-renewed
  cohorts. Attendance remains labeled measured activity rather than a complete
  engagement or risk score.
- 2026-07-17: Real-data visual review promoted retained new-profile count and
  mature 30-day first-attendee return into the Overview headline grid. These
  decision-useful lifecycle metrics fill the previous two-cell desktop gap.
- 2026-07-18: Replaced nested highlight cards with one compact, horizontally
  divided evidence register per lifecycle section. Real-data vision review at
  1440px and 320px confirmed the quieter hierarchy, complete section order,
  and zero horizontal overflow.
- 2026-07-18: Discord is recognized as a likely future engagement signal, but
  its data lake, identity mapping, governance, and derived measures remain an
  explicitly separate deferred feature. The current report makes no Discord
  activity claim or composite engagement score.
- 2026-07-18: Corrected an implementation/status mismatch: the earlier visual
  review identified long tables but did not actually paginate them. Event
  detail, complete segments, program affinity, Member drill-down, and unpaid
  follow-up now share compact client-side pagination over the complete report
  arrays, while CSV exports remain complete.
- 2026-07-26: Discord Analytics now includes selected-period message counts for
  stable Discord authors matched to retained Members. Discord, Audience, and
  Dues named Member rows open the shared full Member dialog only when the
  caller separately has Member-admin read access; Analytics-only access remains
  read-only and profile-limited.
- 2026-07-18: Renamed the generic `What changed` panel to `Member lifecycle
findings` and made its scope explicit so the already-implemented activation,
  continuation, return, programming, audience, dues, and measurement findings
  are discoverable rather than implied.
- 2026-07-18: The user accepted the completed workspace and requested merge
  into `reforge/main`; the feature is closed with no remaining in-scope work.

## Challenge notes carried into technical design

- Historical membership cannot include deleted profiles because Blade keeps no
  roster snapshots. Historical labels and denominators must say `retained
profiles` where that limitation matters.
- Repeat scans may create more than one attendance row. Person and event
  metrics must deduplicate the member/event pair.
- Return-rate cohorts need a full observation window. Immature cohorts cannot
  count as failures to return.
- Feedback discovery sources describe respondents, not every attendee.
- `READ_CLUB_DATA` now authorizes names in this workspace, which is broader
  than the earlier aggregate-only proposal. The API must select and return only
  approved analytical fields rather than full Member rows.
- External reporting has a different disclosure boundary from the internal
  workspace. Sponsor exports must never reuse an internal CSV unchanged.
- New registration, capacity, marketing, cost, target, and sponsor-activation
  fields could add valuable metrics, but the user deferred that write-side
  scope.

## Open questions

- None for the approved first implementation.

## Research and source map

### Repository evidence

- Legacy route and access: `legacy/apps/blade/src/app/admin/club/data/page.tsx`.
- Legacy member analytics:
  `legacy/apps/blade/src/app/_components/admin/club/data/MemberDemographics.tsx`.
- Legacy event analytics:
  `legacy/apps/blade/src/app/_components/admin/club/data/EventDemographics.tsx`.
- Legacy query flaws: `legacy/packages/api/src/routers/member.ts` and
  `legacy/packages/api/src/routers/event.ts`.
- Current permission vocabulary: `packages/consts/src/permissions.ts`.
- Current dues semantics: `packages/api/src/utils/dues/status.ts`.
- Current event and feedback ownership: `packages/api/src/routers/event.ts` and
  `packages/api/src/utils/events/feedback.ts`.
- Current records: `packages/db/src/schemas/knight-hacks.ts`.
- Overlapping feature boundaries:
  `.forge/features/admin-member-dashboard`,
  `.forge/features/member-dues-payment`,
  `.forge/features/event-management`, and
  `.forge/features/forms-and-event-feedback`.

### External product and design research

- Grafana dashboard best practices: question-led panels, shared variables,
  large-to-small progression, and reduced cognitive load.
- shadcn Chart documentation: reusable labels, theme tokens, tooltips, legends,
  responsive containers, and accessible chart layers.
- Cvent and Eventbrite event-reporting guidance: attendance, repeat behavior,
  demographics, feedback, historical comparison, and audience-specific
  reports.
- Census and NIST disclosure guidance: external aggregate releases still need
  protection against sparse-cell and linkage disclosure.

## Task list

- [x] Add matched-Member Discord counts and permission-aware shared Member
      dialogs across every named Member analytics drill-down.

- [x] Create the feature branch and artifact bundle.
- [x] Read the repository workflow, engineering principles, design system, and
      relevant artifact-writing and implementation skills.
- [x] Inventory Legacy Blade analytics and current Reforge ownership.
- [x] Research event, membership, sponsor-reporting, privacy, and dashboard
      design practices.
- [x] Complete reverse-prompting and receive product approval.
- [x] Revise and approve `spec.md`.
- [x] Complete and approve `srd.md`.
- [x] Complete and approve `test-cases.md`.
- [x] Generate focused tests and confirm their pre-implementation failure.
- [x] Implement API analytics and exports.
- [x] Implement Blade navigation, route, filters, panels, tables, and states.
- [x] Run targeted and broad verification.
- [x] Review the complete diff against all four artifacts.
- [x] Run the deterministic Playwright analytics flow and inspect every
      section at desktop and the full workspace at 320px.
- [x] Specify grouped deterministic action-brief behavior and reliability
      rules.
- [x] Implement and test the grouped action brief.
- [x] Visually verify the action brief at desktop and 320px against the local
      production snapshot.
- [x] Refine the action brief into compact divided evidence lists and repeat
      the real-data desktop/mobile vision review before formal validation.
- [x] Paginate every unbounded analytical table and verify page transitions
      against the populated local replica.
- [x] Make the lifecycle action brief explicit in the Overview hierarchy.

## Validation / commands

- `pnpm forge:feature club-analytics "Club Analytics and Dues Reporting"`:
  created the four-file feature bundle.
- Earlier draft Markdown formatting and whitespace checks passed; the approved
  artifacts will be checked again after SRD/test-case authoring.
- `pnpm --filter=@forge/validators test -- analytics`: expected red baseline;
  failed because `src/analytics.ts` did not yet exist.
- `pnpm --filter=@forge/api test -- analytics`: expected red baseline; focused
  suites failed because the planned analytics access, report, and export
  modules did not yet exist.
- `pnpm --filter @forge/validators test -- analytics`: 4 tests passed.
- `pnpm --filter @forge/api test -- analytics`: 12 tests passed across access,
  report, export, and integration-form coverage.
- `pnpm --filter @forge/blade test -- analytics-dashboard`: 4 tests passed.
- `pnpm test`: 21 tasks passed, including 69 Validator tests, 230 API tests,
  and 130 Blade tests.
- Feature-scoped lint and type checks passed for `@forge/validators`,
  `@forge/api`, and `@forge/blade` after the final implementation edits.
- Targeted React analysis covered six changed Blade files and two exported
  components with zero failures.
- `pnpm analyze:react:changed` inspected the wider worktree against
  `origin/main` and reported two pre-existing Legacy React analyzer failures;
  neither is in this feature's files.
- `pnpm verify:push` reached formatting and stopped on the unrelated existing
  `apps/blade/src/app/form/[slug]/page.tsx`. The feature paths pass targeted
  Prettier checks.
- Repository-wide lint and typecheck were also attempted independently. All
  relevant packages passed; existing `apps/club` and `apps/guild` tRPC typing
  failures remain outside this feature's diff.
- `pnpm with-env playwright test admin-club-analytics.spec.ts
--pass-with-no-tests` selected the intended deterministic E2E file but could
  not complete fixture cleanup because PostgreSQL refused the connection.
- `pnpm db:migrate`: passed after starting Colima and the compatible local
  PostgreSQL container.
- `pnpm --filter @forge/blade with-env playwright test
admin-club-analytics.spec.ts --headed --pass-with-no-tests`: 2 tests passed
  in visible Chromium, including authorized navigation/filter/export,
  unauthorized redirect, and 320px no-overflow behavior.
- The final headed browser run emitted no Recharts container-size warnings.
  Full-page screenshots of Overview, Events, Audience, Dues, Reports, and the
  320px workspace were inspected directly.
- `pnpm --filter @forge/ui build` and `pnpm --filter @forge/ui lint` passed for
  the additive chart-container sizing contract.
- Final targeted React analysis covered five files and five exported/shared
  components with zero failures.
- `pnpm test` was rerun after the visual-review fixes: all 21 tasks passed,
  including 69 Validator, 230 API, and 130 Blade tests.
- The final feature-scoped Prettier and whitespace checks passed after the
  implementation and status updates.
- `pnpm --filter @forge/api test -- analytics`: 13 focused analytics tests
  passed after the lifecycle insight expansion.
- `pnpm --filter @forge/blade test -- analytics-dashboard`: 5 dashboard tests
  passed, including stable action-group ordering and evidence links.
- `pnpm --filter @forge/api typecheck`, `pnpm --filter @forge/blade typecheck`,
  and both package lint tasks passed after the final edits.
- A read-only Playwright visual pass used the existing local replica and a
  temporary auth-only development switch. The real-data Overview and action
  brief were inspected at 1440px and 320px; both widths had zero document
  overflow and no analytics error state. The normal development server was
  restored afterward and temporary screenshots were removed.
- Final targeted Prettier and `git diff --check` validation passed.
- 2026-07-18 real-data Playwright vision review inspected the refined action
  brief and full Overview at 1440px plus the action brief at 320px. All six
  lifecycle groups rendered in order, the page emitted no browser errors, and
  document width matched the viewport at both sizes.
- After the evidence-list refinement, the five focused Blade dashboard tests,
  Blade typecheck, Blade lint, and targeted Prettier checks all passed.
- The pagination correction was exercised against the populated local replica:
  Event detail moved from rows 1–10 to 11–20 of 90, Member drill-down from
  1–10 to 11–20 of 1,124, and unpaid follow-up from 1–10 to 11–20 of 667 at
  both 1440px and 320px. All inspected pages matched viewport width and emitted
  no browser errors.
- After pagination, six focused Blade dashboard tests, Blade typecheck, Blade
  lint, targeted React analysis, targeted Prettier, and whitespace validation
  passed. The wider package React scan still reports the existing unrelated
  analyzer limitation in `src/trpc/react.tsx`; the directly analyzed Analytics
  dashboard has zero failures.
- Final merge validation: `pnpm test` completed all 21 tasks, including 69
  Validator, 231 API, and 132 Blade tests. Validator, API, and Blade typecheck
  and lint passed; the shared UI build and lint passed; feature-scoped
  formatting and `git diff --check` passed after this status update.
- 2026-07-26 Member-insights follow-up validation: the Discord section now
  includes selected-period matched-member message counts, and every named
  Member drill-down in Audience, Dues, and Discord opens the shared Member
  presentation. API and Blade typechecks/lint, 14 focused API tests, 15 focused
  Blade tests, changed React analysis, and all seven focused Member/Analytics
  Playwright scenarios pass.
- The populated-database Playwright fixture now searches explicitly for its
  seeded dues target instead of assuming it appears on the first result page.
  Repository-wide formatting remains blocked only by unchanged Guild
  `globe-renderer.tsx`; the changed files pass Prettier and whitespace checks.

## Links

- PRs:
- Issues:
- Discord/thread context:
