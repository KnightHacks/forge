# Legacy Hackathon Site Archives Status

Current phase: Pull request preparation complete. Production changes remain
blocked pending human approval.

## Decision log

- 2026-08-28: Scope is the 2020, 2021, 2023, and 2024 public hackathon frontends. Historical
  application, registration, auth, upload, and dashboard behavior will not be
  migrated.
- 2026-08-28: KHIX/2026 and future dashboards remain on the maintained Hacker SDK
  path and are outside this migration.
- 2026-08-28: Cloudflare research was read-only. No DNS, Pages, Workers, Access,
  or account setting was changed.
- 2026-08-28: No Coolify upgrade will be proposed as part of this work.
- 2026-08-28: No branch push or production deployment is allowed until every year
  builds locally and passes the full visual matrix with image-based inspection.
- 2026-08-28: Later deployment will be serialized one year at a time, with image,
  container, health, visual, link, resource, and disk inspection before advancing.
- 2026-08-28: Approved current Forge Next.js static export plus an unprivileged
  nginx runtime for all four apps.
- 2026-08-28: Approved styled HTTP 410 archival notices, retention of the 2023
  `/social` route when secretless, and removal of every 2020 utility alias.
- 2026-08-28: Excluded the `hackathon-2022` prototype after confirming that the
  official club history and internal records contain no 2022 event. Its source
  uses explicitly labeled test statistics and empty Schedule and Sponsors pages.
- 2026-08-28: Approved a ten-minute post-deployment health/resource gate before
  advancing to the next year.
- 2026-08-28: Human supplied the authoritative 2024 sponsor roster: Gold —
  ServiceNow, IBM, NextEra Energy, BNY Mellon, Siemens Energy; Silver — Impress
  Ink; Bronze — Kinde Auth, Synopsys, GEICO. Logo and website provenance will be
  researched and vendored during implementation.

## Research findings

### Hosting

- 2020 is live from `knighthacks-web-2020.pages.dev` through Cloudflare DNS, but
  its Pages project is not visible in either accessible Cloudflare account. The
  GitHub source is available.
- 2021 is a visible Cloudflare Pages project linked to
  `KnightHacks/hackathon-2021-frontend`; production matches the audited commit.
- The unused 2022 hostname currently redirects to a Cloudflare Access app named
  `2022 KnightHacks Site`. No matching Pages/Workers project or DNS record was
  visible in the accessible Knight Hacks account.
- 2023 production is the visible Cloudflare Pages project
  `hackathon-site-v2-2023`, not the older full-stack `hackathon-site-2023` repo.
- 2024 is the visible, manually deployed Pages project
  `2024`/`2024-dxt.pages.dev`; its public custom domain currently returns HTTP 500. The project has no database/storage binding. Its public sponsor request
  went through the separate `knighthacks-api` Worker, whose current read fails on
  the retired database path.

### Source boundaries

- 2020 mixes a CRA public site with Firebase initialization, registration,
  acceptance, and many historical shortcut routes.
- 2021 is a CRA/CRACO public site with a broken registration route and success
  page still present in source.
- The excluded 2022 CRA prototype has a registration form, visible
  registration/dashboard affordances, test statistics, and empty public pages.
- 2023 v2 is a CRA public site whose auth and registration routes use Firebase
  Auth, Firestore, Storage, and resume uploads.
- 2024 is a Next app whose root/public components depend on Clerk, tRPC, and
  database-backed sponsors; public sections and artwork can be extracted.

## Completed implementation evidence

- The 2024 sponsor roster is static and matches the human-supplied tiers exactly.
  Existing Forge assets supplied the ServiceNow, IBM, NextEra Energy, BNY,
  Impress Ink, Synopsys, and GEICO marks. The Kinde mark came from
  `https://app.kinde.com/logo` on 2026-08-28 and has SHA-256
  `e8875d825f08b2d2733df75369b442d38429f67413edfa07d4769f9524e9bc86`.
  The Siemens Energy mark came from
  `https://www.siemens-energy.com/content/dam/siemensenergy-aem/images/logo/SE_Logo_White.png`
  on 2026-08-28 and has SHA-256
  `9cfea1d0e7d97578359c91d2bcc2b48fdf21c7c6680bbe65b61da1da48ce734d`.
  BNY's June 2024 rebrand predates the October 2024 event, so the current BNY
  mark is historically appropriate.
- Every compatibility deviation is recorded below. All four retained sites were inspected
  from local production-static output at 1440px, 390px, and 320px, with retained
  subpages and interactive states checked where applicable.

## 2020 implementation evidence

- Source provenance: `KnightHacks/knighthacks-web-2020` at
  `a0097bea42c87d4d24b5b64ee6fcc79bb1432214`.
- Retained: the public desktop Home, About, Sponsors, Schedule, and FAQ scenes;
  the public mobile narrative; historical artwork, sponsor roster, social links,
  and the locally vendored official MLH 2020 badge.
- Removed: the Register call to action, registration/acceptance/Firebase code,
  obsolete utility redirects, and every application/auth/dashboard surface.
- Approved compatibility differences: the removed registration control; a
  stable ten-logo sponsor grid for reduced-motion visitors instead of overlapping
  animated sponsor boats; current semantic buttons, focus treatment, and local
  font/assets.
- Production screenshots were inspected at 1440x900, 390x844, and 320x720,
  including every desktop scene, the full mobile narrative, reduced-motion
  sponsors, and the styled 410 page. The 320px document had no horizontal
  overflow or broken images.
- The production-static browser audit produced no warning/error and no external
  runtime request. The only links are the historical MLH/social destinations.
- The first full-bundle Docker build sent a 47.38 MB context. Cached rebuilds
  transferred only changed files. The final image was 26,773,986 bytes,
  with a 5.4 MB/80-file static document root and no source tree, package manifest,
  `node_modules`, or `/app` directory in the runtime.
- The local container ran as `nginx`, became healthy with zero restarts, and was
  idle at 0.00% CPU and approximately 11.16 MiB RAM. `/` returned 200; removed
  workflow and utility paths returned the styled HTTP 410 page case-insensitively;
  an unknown route returned a real 404. The temporary container was stopped and
  removed after inspection.

## 2021 implementation evidence

- Source provenance: `KnightHacks/hackathon-2021-frontend` at
  `00a8fa3bfc002346e6c1e88f44b0ab9733df217f`.
- Retained: `/`, `/about`, `/sponsors`, `/schedule`, `/faq`, and `/attributions`,
  including the original koi artwork, local music, sponsor marks, and MLH badge.
- Removed: `/register`, `/success`, form/backend behavior, Firebase, Sentry, and
  the historical router/form stack. Removed workflow variants return styled 410;
  unknown and API-like paths return 404.
- Compatibility differences: accessible local SVG controls and native
  disclosures replace retired UI dependencies; corrected source copy; three dead
  sponsor URLs now use official destinations; registration is described as closed
  without exposing a control.
- Root validation passed format, typecheck, lint, no-unit test, React analysis,
  static build, and 5/5 Playwright tests against the production nginx image.
  Desktop/mobile visual comparisons and every retained page passed without
  overflow, missing artwork, backend traffic, or browser errors.
- Final image: 45,334,264 bytes. It runs as `nginx`, with a 41.4 MB/110-file
  static document root, no `/app`, source, or `node_modules`, zero restarts, and
  about 12.01 MiB idle memory. The larger payload is the preserved 17 MB music
  file plus two approximately 8.5 MB koi animation files.

## 2022 exclusion evidence

- Source provenance: `KnightHacks/hackathon-2022` at
  `aa5e54b6bbc7ec11ccd0ee338e4861dec98e01f1`. The later release commit differs
  only in `README.md`; application code is identical.
- Knight Hacks' official club history and internal Notion history both omit a
  2022 event, moving directly from Knight Hacks V in 2021 to Knight Hacks VI in 2023.
- The original statistics source says its `100` hacker and `20` sponsor values
  are test values. The Schedule and Sponsors pages contain headings only.
- The related 2022 admin frontend is also a prototype: it hard-codes duplicate
  Knight Hacks sponsor rows and includes TODO comments for unimplemented APIs.
- The local port was validated before this discovery, then removed along with its
  app, Dockerfile, workspace importer, and build/dev graph entries. No 2022
  deployment or domain cutover will be created.

## 2023 implementation evidence

- Source provenance: the live `KnightHacks/hackathon-site-v2-2023` repository at
  `1c7c688807bf81d0df0aa88303a11d62d300b232`, not the older full-stack repo.
- Retained: `/`, static `/social` and `/social/`, and the local post/story image
  downloads.
- Removed: Firebase Auth, Firestore, Storage, resume upload, registration,
  application status, and dashboard code/UI. Removed paths return styled 410;
  unknown/API-like paths return 404.
- Compatibility differences: Register controls are replaced by a quiet past-event
  treatment; the MUI FAQ is now an accessible local disclosure; the dead
  ToolCharm destination was removed while its historical mark remains.
- Root validation passed format, typecheck, lint, no-unit test, React analysis,
  static build, 5/5 Playwright tests against the production nginx image,
  provider/secret scans, and desktop/mobile visual comparison against the live
  Pages site.
- Final image: 28,458,501 bytes. It runs as `nginx`, with a 5.9 MB/57-file static
  document root, no `/app`, source, lockfile, package manifest, or `node_modules`,
  healthy with zero restarts.

## 2024 implementation evidence

- Source provenance: `KnightHacks/knighthacks` `apps/2024` at
  `f0236309a7d52e5516f1b2b4b0ae5aed1fe2d5ea`. Both the custom domain and visible
  Pages deployment currently fail, so retained source artwork is the baseline.
- Retained: the pirate/ocean public experience, About, exact supplied sponsor
  roster, FAQ, contact, footer, and safe external/community links.
- Removed: Clerk, tRPC, database-backed sponsors, Apply/Register/Login controls,
  dashboards, application routes, and operational acceptance artwork. Removed
  paths return styled 410; unknown/API-like paths return 404.
- Sponsor logos are local and load eagerly so below-the-fold archive captures and
  non-scrolling clients do not render empty bubbles. No external runtime asset or
  service request is needed.
- Root validation passed format, typecheck, lint, no-unit test, React analysis,
  static build, and 4/4 Playwright tests against the production nginx image.
  Desktop, 390px, 320px, open mobile menu, sponsor loading, overflow, console,
  and styled 410 visuals passed.
- Final image: 29,366,217 bytes. It runs as `nginx`, with a 9.4 MB/66-file static
  document root, no `/app`, source, or `node_modules`, healthy with zero restarts,
  and about 11.7 MiB idle memory.

## Task list

- [x] Locate candidate source repositories for the requested year range.
- [x] Distinguish the live 2023 v2 source from the older full-stack 2023 repo.
- [x] Audit public routes and historical full-stack dependencies by year.
- [x] Inspect Cloudflare Pages, DNS, and Access topology read-only.
- [x] Record pinned upstream commits and current hosting state.
- [x] Draft `spec.md`, `srd.md`, and `test-cases.md`.
- [x] Resolve product decisions and obtain the 2024 sponsor roster.
- [x] Human approves the artifact bundle before implementation/test generation.
- [x] Create failing/contract tests from the approved test cases where practical.
- [x] Import and patch 2020; validate build, routes, network, and visuals.
- [x] Import and patch 2021; validate build, routes, network, and visuals.
- [x] Audit and exclude the unfinished 2022 prototype after confirming no event
      record exists.
- [x] Import and patch 2023; validate build, routes, network, and visuals.
- [x] Import and patch 2024; validate build, routes, network, and visuals.
- [x] Run all four retained production-static apps through the complete local matrix.
- [x] Run repo-wide precommit checks and inspect the final diff. The aggregate
      repo build was also attempted; every archive built, but the unrelated KHIX app
      stopped the aggregate build because three required local environment variables
      are absent.
- [ ] Human approves local evidence and authorizes push.
- [ ] Push/open review only after approval and required Forge issue/PR metadata exist.
- [ ] Human separately authorizes production rollout.
- [ ] Deploy, inspect, and cut over one year at a time.

## Validation / commands

- `pnpm forge:feature legacy-hackathon-archives "Legacy Hackathon Site Archives"`:
  passed; created the required four-file feature bundle.
- `git fetch origin --prune`: passed; based the task branch on current
  `origin/main` at `a0800c62`.
- Source audit: completed against local read-only clones at the commits recorded
  in `srd.md`.
- Cloudflare UI audit: completed read-only; no account state changed.
- `pnpm exec prettier --write '.forge/features/legacy-hackathon-archives/*.md'`:
  passed; all four bundle files are formatted.
- `pnpm exec prettier --check '.forge/features/legacy-hackathon-archives/*.md'`:
  passed.
- Whitespace, required-link, and unresolved-template-marker checks: passed.
- `pnpm --filter @forge/2020 format`: passed.
- `pnpm --filter @forge/2020 typecheck`: passed.
- `pnpm --filter @forge/2020 lint`: passed with no browser image warnings in the
  final test run.
- `pnpm --filter @forge/2020 build`: passed; emitted only static `/` and static
  not-found output.
- `pnpm --filter @forge/2020 e2e`: passed, 4/4 Chromium tests, covering public
  content, removed controls, retained desktop sections, mobile content, no legacy
  service traffic, and reduced-motion sponsors.
- `docker build -f deploy/dockerfiles/kh2020.Dockerfile -t
forge-archive-2020:test .`: passed using `turbo prune @forge/2020 --docker` and
  the shared BuildKit pnpm cache.
- Local nginx container route, health, filesystem, user, size, resource, log,
  link, console/network, and 1440/390/320 visual inspections: passed. The local
  image remains available for repeatable evidence; no production deployment was
  attempted.
- `pnpm --filter @forge/2020 e2e`, `pnpm --filter @forge/2021 e2e`, `pnpm
--filter @forge/2023 e2e`, and `pnpm --filter @forge/2024 e2e`: passed against
  the production nginx images. The retained archive matrix is 19/19 Playwright
  tests.
- Root-level format, typecheck, lint, test, React analysis, and static build
  commands passed independently for every archive app.
- Each archive package declares `.next/**` and `out/**` as Turbo build outputs.
  A cache-hit restoration test recreated `apps/2020/out/index.html` after the
  local output directory was moved aside.
- Final frozen-lock Docker builds passed for all four retained apps. Final images contain
  only nginx plus their static payloads and use unprivileged `nginx` at runtime.
- The shared nginx matrix passed retained routes with and without trailing slashes,
  case-insensitive retired-workflow 410s, and true 404s for unknown/API-like
  paths. A discovered Next 16 flat-export trailing-slash bug was corrected with a
  dedicated nginx lookup for `$1.html`.
- `pnpm verify:precommit`: passed across all 27 remaining packages after the 2022
  prototype was removed. Existing warning-only lint findings remain in unrelated
  packages; none are emitted by the archive apps.
- `pnpm build`: all four retained archives built successfully inside the aggregate run.
  The repo-wide command stopped on unrelated `@forge/khix` because local
  `BLADE_URL`, `KHIX_HACKER_PORTAL_CLIENT_ID`, and
  `KHIX_HACKER_PORTAL_ORIGIN` values are absent; dependent aggregate builds were
  then interrupted by Turbo.
- `pnpm lint:ws`, `git diff --check`, generated/source provider scans, and final
  container cleanup checks passed. No test container remains running.

## Links

- Branch: `repo/legacy-hackathon-archives` (pushed)
- PR: [#524 — Archive legacy hackathon sites in Forge](https://github.com/KnightHacks/forge/pull/524)
- Issue: [#523 — archive legacy hackathon sites in Forge](https://github.com/KnightHacks/forge/issues/523)
- Discord/thread context: current Codex task; no DMs sent
