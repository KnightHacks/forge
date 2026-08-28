# Legacy Hackathon Site Archives SRD

Status: Approved

## Technical purpose

Add four independent, frontend-only archive applications to Forge for Knight
Hacks 2020, 2021, 2023, and 2024. Each application must build from the current Forge toolchain to
a static export, run in a minimal nginx container, and have no runtime dependency
on historical auth, API, database, storage, or serverless infrastructure.

## Relevant principles

- [Agentic development framework](../../../docs/agentic-development/README.md):
  specs and observable proof precede implementation.
- [Forge engineering principles](../../../docs/agentic-development/forge-engineering-principles.md):
  frontend-only hackathon apps remain approachable contribution surfaces;
  package boundaries stay small; validation is proportional to risk.
- [Frontend design skill](../../../docs/agentic-development/frontend-design-skill.md):
  inspect the existing experience, use real domain assets, verify desktop and
  mobile screenshots, accessibility, overflow, and reduced motion.
- Existing static deployment pattern:
  `deploy/dockerfiles/kh8.Dockerfile` and
  `deploy/nginx/default.conf.template`.

Historical fidelity is the visual contract for this work. The current Blade
design system does not apply to these archives.

## Access policy

- All retained pages are unauthenticated and public.
- There is no logged-in state, role-based state, officer surface, admin surface,
  personalized content, or private data in any archive.
- Removed workflow routes must not initialize an auth SDK, inspect cookies, call
  an API, or disclose whether a historical account existed.
- Any later deployment administration remains restricted to the existing
  Coolify and Cloudflare operators; this feature adds no application-level admin
  mechanism.

## Source and hosting inventory

The migration pins source provenance rather than relying on repository default
branches continuing to point at the same content.

| Year | Source of record                            | Audited commit                             | Observed hosting state on 2026-08-28                                                                                                                 |
| ---- | ------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2020 | `KnightHacks/knighthacks-web-2020`          | `a0097bea42c87d4d24b5b64ee6fcc79bb1432214` | Cloudflare-proxied CNAME to `knighthacks-web-2020.pages.dev`; the Pages project is not visible in either accessible Cloudflare account               |
| 2021 | `KnightHacks/hackathon-2021-frontend`       | `00a8fa3bfc002346e6c1e88f44b0ab9733df217f` | Cloudflare Pages project `hackathon-2021-frontend`; production deployment points at the audited commit                                               |
| 2022 | `KnightHacks/hackathon-2022`                | `aa5e54b6bbc7ec11ccd0ee338e4861dec98e01f1` | Excluded: official history and internal records contain no 2022 event; source is an unfinished prototype with test statistics and empty public pages |
| 2023 | `KnightHacks/hackathon-site-v2-2023`        | `1c7c688807bf81d0df0aa88303a11d62d300b232` | Cloudflare Pages project `hackathon-site-v2-2023`; this is the live CRA site, not the older full-stack `hackathon-site-2023` repository              |
| 2024 | `KnightHacks/knighthacks`, path `apps/2024` | `f0236309a7d52e5516f1b2b4b0ae5aed1fe2d5ea` | Manually deployed Cloudflare Pages project `2024` at `2024-dxt.pages.dev`; the public custom domain currently returns HTTP 500                       |

The observations above are read-only research. They are not authorization to
modify or delete Cloudflare resources.

## Architecture / data flow

### Proposed app layout

```text
apps/2020/                    # @forge/2020, local port 3008
apps/2021/                    # @forge/2021, local port 3009
apps/2023/                    # @forge/2023, local port 3011
apps/2024/                    # @forge/2024, local port 3012
deploy/dockerfiles/kh2020.Dockerfile
deploy/dockerfiles/kh2021.Dockerfile
deploy/dockerfiles/kh2023.Dockerfile
deploy/dockerfiles/kh2024.Dockerfile
```

Package names and ports are reserved by this SRD but may change before
implementation if they conflict with work merged into `main`.

### Build strategy

Approved approach: port each site to the Forge-supported Next.js/React versions
and use `output: "export"` with unoptimized images. This is preferred over
carrying four obsolete CRA/CRACO stacks and the retired 2024 monorepo runtime:

- 2020 currently depends on React 16, `react-scripts` 4, `node-sass` 4, and
  Firebase packages.
- 2021 currently depends on React 17, CRACO, `react-scripts` 4, `node-sass` 4,
  and an old Tailwind/PostCSS compatibility stack.
- 2023 uses CRA and initializes Firebase auth, Firestore, and Storage.
- 2024 is Next 14 but its root layout and public home depend on Clerk, tRPC, and
  backend sponsor data.

Porting must preserve each site's assets, DOM intent, and styling while replacing
only incompatible framework seams. Do not move historical visual components
into `@forge/ui`; there is no stable cross-year design contract to justify a
shared package.

Each app produces `apps/<year>/out/`. Its multi-stage Dockerfile must:

1. run `turbo prune @forge/<year> --docker`;
2. install only the pruned workspace with a BuildKit pnpm-store cache;
3. build only the target app;
4. copy only `out/` into `nginxinc/nginx-unprivileged:1.29-alpine`;
5. run as the `nginx` user with a health check on the app port.

No source, `.git`, root monorepo, dependency tree, package-manager store, or
build tool may be copied into the final stage.

### Routing and archival behavior

- Retained routes are emitted as static HTML and assets.
- Year-specific route casing from old links is either emitted directly or
  redirected once to a canonical retained route.
- Removed workflow paths resolve locally to a static archival notice with a
  non-success status chosen during implementation (recommended: HTTP 410).
- Unknown paths return a real 404; nginx must not use an unrestricted SPA
  fallback that makes deleted app routes appear valid.
- Anchor navigation must work both after a direct load and during in-page
  navigation.
- The current-event link is a plain external link configured once per archive,
  not an auth-aware or API-driven control.

### Historical data and assets

- Images, fonts, icons, and downloadable public artifacts are copied into the
  owning year app and served locally when licensing permits.
- Runtime hotlinks to old Firebase Storage, Cloudflare storage, or an unknown
  personal account are not accepted as archive dependencies.
- Public sponsor records that originally came from a backend become typed,
  immutable data inside the owning archive. This deliberate hard-coding records
  a completed event and is not operational configuration.
- No user, applicant, resume, auth, or analytics data is imported.
- Asset provenance and any missing/replaced asset are recorded in `status.md`.

## Per-year extraction constraints

### 2020

- Preserve the public landing composition from `knighthacks-web-2020`.
- Remove `RegistrationPage`, `AcceptancePage`, Firebase initialization, and
  Firebase/backend dependencies.
- Remove operational aliases including Slack, Zoom, dues, resume, membership,
  feedback, and internal operations links unless the human explicitly retains a
  specific public alias.
- Replace `node-sass` usage with the supported Sass/CSS pipeline and document
  visual corrections caused by compiler differences.

### 2021

- Preserve the public Home, About, Sponsors, Schedule, FAQ, and Attributions
  routes from the deployed commit.
- Remove the broken registration and success routes and their unused form code.
- Replace CRACO, `node-sass`, and the old PostCSS compatibility layer with the
  Forge build path while retaining the event's Tailwind/CSS output.

### 2023

- Use `hackathon-site-v2-2023`, not the older `hackathon-site-2023` full-stack
  repository.
- Preserve the public home and approved public graphic route.
- Remove Firebase initialization, `/auth`, `/register`, all sign-in providers,
  Firestore reads/writes, Storage resume uploads, and application status UI.
- Confirm the built archive makes zero requests to Firebase domains.

### 2024

- Extract only the public main-page sections and artwork from
  `KnightHacks/knighthacks/apps/2024`.
- Remove `ClerkProvider`, auth routes, tRPC providers and clients, API routes,
  application/profile/survey routes, dashboard routes, and application CTA
  reads.
- Replace `sponsor.userAll` with an approved immutable sponsor snapshot and
  locally owned logos.
- The authoritative sponsor roster is:
  - Gold: ServiceNow, IBM, NextEra Energy, BNY Mellon, Siemens Energy.
  - Silver: Impress Ink.
  - Bronze: Kinde Auth, Synopsys, GEICO.
- Source the 2024-era official website and logo for each sponsor from an official
  brand kit or archived official source, record its provenance, and vendor the
  selected asset locally. Do not substitute an unverified current rebrand when a
  historically accurate mark is available.
- The Pages project has no database/storage binding. The sponsor query went
  through the separate public `knighthacks-api` Worker, whose current read fails
  on its retired database path; do not treat that API as a recoverable runtime
  dependency.
- Make server rendering deterministic; the original sponsor layout uses
  `Math.random()` during render and must use stable positions/delays instead.
- Confirm the built archive makes zero requests to Clerk, tRPC, the retired
  database, or remote sponsor-logo origins.

## tRPC/API behavior

None. The archives expose no tRPC procedures, route handlers, server actions,
webhooks, REST endpoints, or mutation surface. Any imported code that requires
one is outside scope and must be removed.

## Validation

No user input is submitted. Small year-local TypeScript types may validate
immutable content records at build time. Adding shared Zod validators is not
justified unless implementation uncovers a real cross-app contract.

## Data / migration / compatibility

There is no production database migration.

The content migration is source-to-source and must keep a provenance ledger in
`status.md`: upstream repository, pinned commit, copied paths/assets, omitted
workflows, and deliberate visual deviations.

### Cloudflare/Coolify rollout (later approval required)

For each year, in chronological order:

1. Create one Coolify application from the Forge repository using its dedicated
   Dockerfile, repository-root build context, assigned port, and year domain.
2. Configure exact watch paths for the year app, its Dockerfile, shared nginx
   template, workspace manifests, lockfile, and any imported workspace package.
3. Deploy once and inspect the image, container, logs, health, route matrix,
   screenshots, network requests, memory, restart count, and disk usage.
4. Change only that year's Cloudflare origin/DNS after local and Coolify preview
   approval. Keep the old Pages project or Access configuration intact for
   rollback until the custom domain is healthy.
5. Observe the public domain, including redirects and cache behavior, before
   moving to the next year.

The exact DNS target must be copied from a healthy existing Forge app rather
than invented in the implementation. For 2020, lack of access to the old Pages account does not block DNS
cutover, but ownership cleanup remains a separate follow-up.

Rollback changes only the affected year domain back to its prior origin where a
working origin exists. For 2024, preserve a captured pre-cutover state
even though the current public experience is already unavailable/broken.

No Coolify upgrade is part of this rollout.

## Discord integration

None. Build and deploy operations must be serialized one year at a time to limit
existing deployment notifications, but the applications themselves do not call
Discord.

## Configurability review

Would this require a developer change next year?

- Answer: adding another historical site would require a new migration because
  each archive intentionally preserves a unique, completed design.
- Hard-coding is acceptable for finalized historical copy, schedules, sponsors,
  and asset placement. These values must never change with current operational
  state. Current/future application behavior remains configurable through the
  maintained Hacker SDK instead of being copied into archives.

## React / frontend constraints

- Next pages remain server components unless a preserved animation or browser-
  only interaction requires a small client boundary.
- No page-level `"use client"` solely to ease a port.
- Replace effects used only for derived state; keep historical animation logic
  deterministic and reduced-motion aware.
- Preserve semantic headings, keyboard navigation, focus visibility, readable
  contrast, alternative text, and touch targets while maintaining visual
  fidelity.
- Do not introduce a shared archive design system. Year-local components and CSS
  are easier to audit and less likely to cause cross-year visual regressions.
- External fonts and assets should be vendored when permitted so an archive does
  not fail when a third-party host disappears.

## Testing / verification strategy

Each app must expose `test`, `test:watch`, `e2e`, `analyze:react`, and
`analyze:react:changed` scripts. Verification proceeds in this order:

1. targeted typecheck, lint, unit tests, and build for each app;
2. route/link/network Playwright checks for each app;
3. desktop `1440x900`, mobile `390x844`, and narrow `320px` screenshots for the
   representative routes in `test-cases.md`;
4. visual inspection with image vision against the recorded baseline, including
   full-page overflow and missing assets;
5. all four local production exports served through the nginx configuration;
6. repo-wide `pnpm analyze:react:changed`, `pnpm format`, `pnpm lint`,
   `pnpm typecheck`, and `pnpm build`;
7. final diff and secret scan.

No push is allowed until the four-app local matrix and visual review are
complete and the human approves the evidence. Deployment adds the operational
checks defined above and remains one year at a time.

## Resource constraints

- Record `docker image inspect` size for each final image. A final image is
  rejected if application source or dependencies are present, regardless of its
  numeric size.
- Compare each result to the existing Forge static nginx images. Material growth
  requires an asset/output explanation before deployment.
- Record build duration separately for a cold build and a warm cached rebuild.
- After deployment, record container RSS/CPU, restart count, health, image count,
  and host filesystem use before advancing.
- Do not prune images, stop containers, or alter build cache as part of archive
  verification unless separately approved.

## Resolved implementation decisions

- Use Next static export as the common build target.
- Use a styled archival notice with HTTP 410 semantics for removed workflows.
- Exclude the unfinished 2022 prototype because no corresponding event exists in
  the official or internal history.
- Keep the 2023 `/social` route subject to the secretless/client-only test.
- Remove every 2020 utility redirect alias.
- Observe each later production deployment for ten minutes before advancing.
