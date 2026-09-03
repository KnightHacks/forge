# Project Judging Status

Current phase: Reviewer follow-up complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-31: The first slice imports submitted Devpost projects into a
  selected existing hackathon and gives judges a searchable project directory.
- 2026-08-31: Only officers manage project imports and the imported project
  inventory. Judges cannot add or remove projects.
- 2026-08-31: An import includes a preview and merges projects by Devpost
  submission URL when the selected hackathon already has projects.
- 2026-08-31: Draft and incomplete Devpost projects are excluded.
- 2026-08-31: Judges and officers can view every imported project for the
  selected hackathon. The directory supports title search, sorting,
  pagination, prize/category filters, challenge filters, and team-size filters.
- 2026-08-31: The judge table shows project title, Devpost link, prize
  categories, and opted-in challenges. Selecting a project opens a responsive
  modal that renders the project's Markdown description and remaining approved
  project details.
- 2026-08-31: The original contract allowed judges to view team member names,
  email addresses, and Discord handles for operational outreach. The owner
  removed Discord handles later that day and removed judge access to emails on
  2026-09-02.
- 2026-08-31: Officers can edit approved imported fields or delete individual
  projects from the separate project-management/import surface.
- 2026-08-31: Existing permission semantics remain: `IS_JUDGE` grants judge
  access and `IS_OFFICER` bypasses the ordinary judge permission gate.
- 2026-08-31: Unauthenticated visitors are redirected to login. Authenticated
  users without access receive a forbidden state, and judge navigation is
  hidden from users without effective access.
- 2026-08-31: Scoring, feedback, judge assignment, rooms, judging sessions,
  ranking, winner selection, hacker matching, a public gallery, and Devpost API
  synchronization are out of scope for this slice.
- 2026-08-31: `/admin/projects` is the officer-only import and project-management
  surface. `/judge/projects` is the judge-facing project directory.
- 2026-08-31: The judge directory automatically uses the currently active
  hackathon. Officers can preview the judge experience outside that window
  using the hackathon whose start date is closest.
- 2026-08-31: Judging availability is controlled per hackathon from the officer
  project-management surface. A judge sees an explanatory banner and no project
  directory while judging is disabled.
- 2026-08-31: Devpost opt-in prize values are the source for hackathon
  challenges. Every project also receives a `General` challenge.
- 2026-08-31: The owner superseded the earlier merge/upsert decision. A
  re-import authoritatively drops the selected hackathon's imported project
  inventory and reinserts submitted projects from the new CSV, overwriting
  manual edits without conflict resolution or preview.
- 2026-08-31: Individual projects are soft-deleted after confirmation. The
  original contract used replacement import as the only bulk reset mechanism;
  the owner added a typed-confirmation hard-delete action on 2026-09-02.
- 2026-08-31: Project details include the approved description, links,
  technologies, challenge/category, team-contact, school, and submission data.
  Judge responses remain out of scope.
- 2026-08-31: Pagination follows established Forge table conventions.
- 2026-08-31: A hackathon is active inclusively from its configured start time
  through its configured end time.
- 2026-08-31: Imported challenge labels retain their source value and are not
  merged by case, whitespace, or punctuation equivalence. Challenge input is
  sanitized when challenge records are created.
- 2026-08-31: Replacement import also replaces the selected hackathon's prior
  imported challenge list so minor changes in a later export take effect.
- 2026-08-31: Officers can edit the project title, URLs, description, categories,
  challenge assignments, technologies, universities, roster/contact fields,
  and participant count.
- 2026-08-31: Import results report imported projects, excluded drafts,
  collapsed duplicate URLs, and malformed or rejected records.
- 2026-08-31: Soft-deleted projects are restorable in this slice.
- 2026-08-31: When no hackathon is active, officer preview selects the hackathon
  with the nearest upcoming start date rather than a recently ended hackathon.
- 2026-08-31: The owner revised the approved product contract to defer the
  judging-enabled toggle to the future judge-submission slice. Judges can view
  projects whenever a hackathon is active; this slice stores no judging-open
  state and shows no judging-disabled banner.
- 2026-08-31: The legacy project/challenge/submission/judge/judgment data model
  has no production data requiring preservation and may be dropped rather than
  bridged to the new project model.
- 2026-08-31: The owner explicitly approved the required Drizzle schema and
  migration work, a default-closed future judging state outside this slice, an
  atomic replacement transaction, a protected multipart upload boundary, and
  adding an established CSV parser dependency if one is not currently present.
- 2026-08-31: Project reads require judge or officer access; officer mutations
  require officer access. Import, edit, delete, and restore actions are audited
  without copying raw CSV or contact PII into the audit log.
- 2026-08-31: Historical importer review found the 2025 implementation used
  `csv-parse/sync`, relaxed column counts, one transaction, challenge derivation,
  and `General`. The new SRD keeps those useful lessons but rejects its raw CSV
  tRPC payload, fixed member-email offsets, name/date/title match key, partial
  upserts, raw CSV logging, and legacy `Teams` model.
- 2026-08-31: Drafted `srd.md` around new project/member/challenge/join tables,
  a protected multipart route calling an API-owned atomic import service,
  server-paginated reads, reversible soft deletion, PII-safe audit behavior,
  and explicit destructive migration/rollback checks.
- 2026-08-31: The owner confirmed `auth_judge_session` is removed with the
  legacy judging tables, the multipart limit is 25 MiB, declared participant
  count is stored independently from roster rows, and normalized URLs are the
  only stored/displayed URL representation.
- 2026-08-31: The owner removed Discord handles from the approved product and
  technical contracts because Devpost cannot map them reliably. All
  questionnaire columns are ignored; judges retain access to member names and
  email addresses.
- 2026-08-31: All SRD reverse-prompt questions are resolved and `srd.md` is
  proposed for explicit owner approval.
- 2026-08-31: The owner approved `srd.md` as the technical contract. The feature
  moved to test-case reverse-prompting; no implementation or test generation has
  started.
- 2026-08-31: The owner approved importer-focused behavioral defaults: valid
  projects may import alongside safely rejected malformed projects; conflicting
  duplicate-URL groups are rejected; any submitted row makes a project eligible;
  judge no-active/no-project states are distinct; restore preserves associations;
  Markdown is rendered safely; replacement uses a confirmation dialog without
  typed text; fixtures contain no supplied PII; and oversized bodies are rejected
  before parsing.
- 2026-08-31: The owner initially capped this slice at 15 high-value cases
  because future judge/scoring passes will add their own behavioral coverage.
  The 2026-09-02 follow-up expanded the contract to 18 cases for hard deletion,
  judge privacy, the eye-button affordance, and backup safety.
- 2026-08-31: The owner approved `test-cases.md` and the complete artifact
  bundle, then authorized implementation through completion with explicit use
  of the frontend-design and Playwright verification skills.
- 2026-08-31: All product-level reverse-prompt questions are resolved and
  `spec.md` is proposed for explicit owner approval.
- 2026-08-31: The owner approved `spec.md` as the product contract and
  authorized the SRD phase.
- 2026-09-01: The owner clarified that Devpost opt-in prizes and challenges are
  one concept. The directory now presents one challenge-tag column/filter,
  keeps the stored derived values synchronized, and displays `General` first.
- 2026-09-01: Project descriptions are optional during import and officer
  editing. Missing descriptions render a neutral empty state.
- 2026-09-01: Officer team editing uses repeatable, separately validated name
  and email inputs instead of parsing `name | email` text lines.
- 2026-09-02: Officers may permanently drop one selected hackathon's complete
  imported inventory after typing that hackathon's display name in one dialog.
- 2026-09-02: Judge list and detail responses expose team names but omit
  participant emails and schools. Officers retain both on `/admin/projects`.
- 2026-09-02: The judge directory uses a Lucide eye button to the left of each
  project title as an explicit detail affordance.
- 2026-09-02: Every project and judging table is excluded from shared
  development backups. The seed sanitizer must not reference legacy judging
  tables removed by migration `0041`.
- 2026-09-02: Technologies and schools are optional import fields. Blank or
  missing columns produce empty lists and do not reject a project.
- 2026-09-02: The standard Forge review tightened multipart size enforcement,
  duplicate-row identity, draft diagnostics, URL filter normalization,
  pagination, pending-import behavior, deleted-project edits, and stale backup
  compatibility.
- 2026-09-02: Duplicate Devpost rows compare only the declared additional-team
  count and its corresponding member triples. Questionnaire cells do not affect
  duplicate identity.
- 2026-09-02: Team member email is required by the approved import and editing
  contract. Validation, UI types, importer output, and the database constraint
  now enforce the same rule through migration `0043`.
- 2026-09-02: Development restore filtering consumes complete SQL statements
  for retired judging tables, including multiline inserts, without matching
  retired-table text inside values for retained tables.
- 2026-09-03: The judge directory shows participant names in the list so
  duplicate project titles are distinguishable. It hides the team-size bounds
  and the universal `General` challenge from judge filters while the admin
  importer retains team-size filtering.
- 2026-09-03: Judge project descriptions contain wide tables and code inside
  the dialog, omit remote Markdown images, and collapse long copy behind one
  expand button. The judge count now reads `N projects`.

## Open questions

- None blocking implementation.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Replace the unused legacy judging schema with project/member/challenge
      tables, dropping the explicitly retired judging data.
- [x] Implement the Devpost parser, atomic replacement service, PII-safe audit
      events, project router, and protected multipart upload route.
- [x] Implement SSR-first `/admin/projects` and `/judge/projects` workspaces with
      responsive loading, empty, table/card, filtering, detail, and mutation states.
- [x] Verify import, edit, soft-delete, restore, replacement, role access,
      filtering, Markdown detail, and 1440px/320px layouts.
- [x] Complete Forge review, deslop, React analyzer, production build, and
      repository-wide quality gates.
- [x] Add and verify the officer-only hard-delete action.
- [x] Remove judging PII from judge responses while retaining admin data.
- [x] Add the judge eye-button affordance on desktop and mobile.
- [x] Verify the production backup sanitizer against the post-migration schema.
- [x] Address and resolve the CodeRabbit follow-up review findings.
- [x] Address Faris's judge-directory layout and participant feedback.

## Validation / commands

- `pnpm forge:feature project-judging "Project Judging"`: passed; created the
  four-file feature bundle.
- `pnpm exec prettier --check .forge/features/project-judging/spec.md .forge/features/project-judging/status.md`:
  passed.
- `git diff --check`: passed.
- `pnpm --filter=@forge/api exec vitest run src/tests/projects
src/tests/root/api-surface.test.ts src/tests/audit/coverage.test.ts`: passed; 4
  files and 18 tests.
- Supplied-export parser compatibility check: passed for all four exports; a
  missing project description is accepted rather than rejecting the project.
- Legacy migration: `pnpm db:migrate` passed while dropping only the six
  explicitly retired judging tables, including populated legacy fixtures.
- `pnpm analyze:react apps/blade/src/app/_components/projects
apps/blade/src/app/admin/projects apps/blade/src/app/judge`: passed; 12 files,
  7 components, 0 failures.
- `pnpm analyze:react:changed`: passed; 13 files, 7 components, 0 failures.
- Cross-hackathon constraint verification: local migration backfilled all
  existing links, installed both scoped composite foreign keys, and reported 0
  mismatched project/challenge rows.
- `pnpm --filter=@forge/blade build`: passed; both project routes are dynamic
  SSR routes.
- Playwright visible-browser verification: passed multipart import, desktop and
  320px mobile views, detail scrolling, zero horizontal overflow, edit,
  soft-delete, restore, replacement, search/filter, and 401/403/400 access
  boundaries with no page/console errors.
- Playwright follow-up verification: passed the unified challenge table,
  `General`-first ordering, structured member rows, browser email validation,
  and 375px mobile layout with no horizontal overflow.
- `pnpm format`: passed across 24 participating packages.
- `pnpm lint`: passed across 31 tasks with only pre-existing repository
  warnings outside this feature.
- `pnpm typecheck`: passed across 33 tasks.
- `pnpm build`: passed across 21 build tasks; `/admin/projects`, the multipart
  import route, and `/judge/projects` are present in the production route map.
- 2026-09-03 focused project UI suite: 5 files and 19 tests passed.
- 2026-09-03 browser verification: passed at 1440px and 390px with duplicate
  titles, participant-name disambiguation, judge-only filter reductions, no
  participant email or school leakage, contained wide descriptions, working
  collapse/expand controls, and no page-level horizontal overflow.
- 2026-09-03 `pnpm verify:precommit`: passed React analysis, formatting, lint,
  and all 33 typecheck tasks. Repository lint reported only existing warnings.
- 2026-09-03 `pnpm build`: passed all 21 build tasks.
- `pnpm db:pull -- --truncate`: restored the shared development snapshot into
  the local database through the migration-compatible restore path; the PR
  migrations were then applied. The local database contains 78 users, 4
  hackathons, and 0 imported projects.
- Local connection check: `.env` resolves to `localhost:5433/local`.
- Post-migration sanitizer SQL check: executed inside a local database
  transaction and intentionally rolled back; no removed judging table was
  referenced.
- `pnpm --filter=@forge/db exec vitest run
src/tests/dev-db-backup-sanitizer.test.ts`: passed; 17 tests.
- CodeRabbit-focused Blade tests: passed; 2 files and 8 tests.
- CodeRabbit-focused database tests: passed; 3 files and 9 tests.
- Devpost importer tests: passed; 11 tests, including questionnaire-insensitive
  duplicate comparison.
- Drop-all database integration test: passed; 1 test.
- Project validator tests: passed; required email rejects blank and invalid
  values and trims valid input.
- `pnpm db:migrate`: passed against the local database with migration `0043`.
- `pnpm db:pull -- --truncate`: passed against `localhost:5433/local` after the
  multiline restore-filter fix.
- `pnpm verify:precommit`: passed; React analysis, formatting, lint, and all 33
  typecheck tasks completed successfully.
- `pnpm build`: passed; all 21 build tasks completed successfully.
- `pnpm --filter=@forge/api exec vitest run src/tests/projects
src/tests/audit/coverage.test.ts src/tests/root/api-surface.test.ts`: passed;
  6 files and 22 tests. The API snapshot includes `projects.dropAll`.
- `pnpm --filter=@forge/blade exec vitest run src/tests/projects`: passed; 2
  files and 6 tests covering typed deletion, judge privacy, retained admin
  details, and the eye-button interaction.
- `pnpm --filter=@forge/validators exec vitest run src/tests/audit.test.ts`:
  passed; 6 tests.
- Live local SSR verification with a fake project: admin output retains the
  project email and school and exposes the hard-delete action; judge output
  exposes the project, member name, and eye button while omitting both private
  fields.
- `pnpm --filter=@forge/api exec vitest run src/tests/projects
src/tests/audit/coverage.test.ts src/tests/root/api-surface.test.ts`: passed; 6
  files and 26 tests after the standard Forge review fixes.
- `pnpm --filter=@forge/blade exec vitest run src/tests/projects`: passed; 4
  files and 11 tests after the standard Forge review fixes.
- `pnpm --filter=@forge/db exec vitest run src/tests/prod-db-restore.test.ts
src/tests/dev-db-backup-sanitizer.test.ts`: passed; 2 files and 20 tests.
- `pnpm --filter=@forge/api with-env vitest run
src/tests/integration/projects-drop-all.test.ts`: passed against a disposable
  migrated PostgreSQL database; the selected inventory cascaded while the
  second hackathon survived.
- `pnpm db:pull -- --truncate`: passed against `localhost:5433/local` using the
  migration-compatible streaming backup filter; restored 78 users, 4
  hackathons, and 0 project rows while keeping current project tables and no
  retired judging tables.
- `pnpm --filter=@forge/blade exec vitest run src/tests/projects`: passed; 4
  files and 13 tests after the final URL, filter-state, and accessibility fixes.
- `pnpm --filter=@forge/api exec vitest run
src/tests/projects/devpost-import.test.ts`: passed; 10 parser tests, including
  duplicate rows with conflicting team data.
- `pnpm verify:precommit`: passed after all Forge review fixes; React analysis,
  formatting, lint, and typechecks are green.
- `pnpm build`: passed across 21 build tasks after the final review fixes.
- Final Forge review: API/security, React/UI/accessibility, and
  database/backup/destructive-operation passes reported no remaining findings.
- CodeRabbit escape-string follow-up: the restore filter now keeps `E'...'`
  backslash escapes inside the quoted value. The six restore-filter tests,
  `pnpm db:pull -- --truncate` against `localhost:5433/local`, and
  `pnpm verify:precommit` passed.
- Visual verification: refreshed and inspected six screenshots covering the
  import warning, typed hard-delete dialog, judge directory eye affordance,
  judge detail privacy, and desktop/mobile layouts.

## Links

- PRs: [#527](https://github.com/KnightHacks/forge/pull/527)
- Issues: [#526](https://github.com/KnightHacks/forge/issues/526)
- Discord/thread context:
