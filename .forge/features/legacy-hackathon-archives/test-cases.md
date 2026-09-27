# Legacy Hackathon Site Archives Test Cases

Status: Approved

## Scope

These cases define observable proof for the public 2020, 2021, 2023, and 2024 archives, removal
of historical full-stack behavior, static build boundaries, visual fidelity,
and the later serialized deployment. They intentionally exclude testing old
application, account, dashboard, database, and upload behavior because those
features must not exist.

## Test placement plan

- Year-local unit and rendering tests: `apps/<year>/**` through
  `pnpm --filter=@forge/<year> test`.
- Year-local route, link, console, network, and screenshot checks:
  `pnpm --filter=@forge/<year> e2e`.
- Production-static checks: build each app, serve `out/` through the same nginx
  route policy used in its image, and rerun the route matrix.
- Container checks: build the dedicated Dockerfile and inspect its filesystem,
  image size, health endpoint, effective user, and port.
- Cross-app gate: `pnpm verify:precommit` and `pnpm build` from the Forge root.
- Visual evidence: baseline/local desktop and mobile screenshots reviewed with
  image vision and then accepted by the human before push.

## Shared test cases

### TC-001: Public archive loads without credentials

Setup:

- Build and serve one year archive in a clean browser context with no cookies,
  local storage, environment secrets, or legacy service credentials.

Action:

- Open the year root URL and each retained route directly.

Expected observations:

- Every route renders public content with a successful response.
- No sign-in prompt, Access challenge, auth redirect, or personalized state
  appears.
- Reloading a nested retained route succeeds.

### TC-002: Historical workflows are absent from discoverable UI

Setup:

- Serve the production-static output for a year.

Action:

- Inspect navigation, mobile navigation, hero actions, footer, FAQ links, and all
  retained pages.

Expected observations:

- No Apply, Register, Sign in, Sign up, Hacker Dashboard, application-status,
  resume-upload, or account-management control appears.
- No retained link targets a removed workflow.

### TC-003: Removed workflow URLs are inert

Setup:

- Serve the production-static output with the final nginx route policy.

Action:

- Visit every former workflow route directly, including capitalization and
  trailing-slash variants.

Expected observations:

- The response follows the approved 404/410 archival behavior.
- The page has no inputs, auth controls, user data, or mutation mechanism.
- No legacy SDK or backend request occurs.

### TC-004: Unknown routes are not swallowed by an SPA fallback

Setup:

- Serve the production-static output.

Action:

- Request a random nonexistent path and a path resembling an old API endpoint.

Expected observations:

- The response is a real 404 and does not render the home page with status 200.
- No server/API handler is available.

### TC-005: Archive has no legacy runtime traffic

Setup:

- Open every representative route in a clean browser with request recording.

Action:

- Load, navigate, scroll, open menus, and exercise retained client interactions.

Expected observations:

- There are no requests to Firebase, Clerk, tRPC, a retired API, database proxy,
  upload service, or unknown first-party host.
- All first-party requests succeed.
- Approved external links or fonts are recorded; archival assets load locally.

### TC-006: Visual fidelity is reviewed at three widths

Setup:

- Capture the best available baseline for each representative route.
- Build local production output with motion reduced for deterministic captures.

Action:

- Capture full-page screenshots at `1440x900`, `390x844`, and `320px` wide.
- Compare them with image vision and manual inspection.

Expected observations:

- Theme, type hierarchy, content order, artwork, spacing, and responsive intent
  match the baseline closely.
- No horizontal document overflow, clipped essential content, broken image,
  invisible text, or overlapping navigation exists.
- Every deliberate difference is listed in `status.md` and approved.

### TC-007: Keyboard and reduced-motion behavior remain usable

Setup:

- Serve each archive with a keyboard-only session and reduced-motion preference.

Action:

- Traverse links and controls; open and close mobile navigation; scroll through
  animated sections.

Expected observations:

- Focus order and focus visibility are usable, interactive elements have names,
  and mobile navigation can be dismissed.
- Essential content remains available with reduced motion and no animation traps.

### TC-008: Static image contains runtime files only

Setup:

- Build the year-specific production Dockerfile.

Action:

- Inspect image history, image size, filesystem contents, configured user, port,
  and health check; run the container.

Expected observations:

- Only nginx runtime files and static export assets are present.
- Forge source, `.git`, package-manager caches, `node_modules`, and unrelated app
  outputs are absent.
- The container runs unprivileged, becomes healthy, serves the configured port,
  and has zero restarts during the validation window.

### TC-009: Build scope is isolated per year

Setup:

- Record a cold build, then change one harmless source file in a single year app
  and prepare a warm rebuild without deploying.

Action:

- Build that year's Dockerfile and inspect Turbo/prune output.

Expected observations:

- Only the selected app and actual workspace dependencies are installed/built.
- Unrelated apps are absent from the pruned build context.
- Cold and warm build durations and final image size are recorded.

## Per-year test cases

### TC-2020-001: 2020 public landing is preserved

Setup:

- Use the live 2020 deployment plus the pinned source as the baseline.

Action:

- Load the root page, traverse its sections, and exercise public navigation.

Expected observations:

- Historical art, copy, sections, and intentional public links render.
- Firebase is not initialized and registration/acceptance content is absent.
- Obsolete Slack, Zoom, dues, resume, membership, operations, and feedback
  aliases follow the approved removed-route policy.

### TC-2021-001: 2021 retained route set is complete

Setup:

- Use the live Pages deployment at its audited commit as the baseline.

Action:

- Visit Home, About, Sponsors, Schedule, FAQ, and Attributions directly and by
  navigation.

Expected observations:

- Each route preserves its historical content and responsive styling.
- `/register` and `/success` are absent and inert.

### TC-2023-001: 2023 public site works without Firebase

Setup:

- Use the live `hackathon-site-v2-2023` deployment as the baseline.

Action:

- Load the home page and approved `/social` route, then inspect requests and
  browser storage.

Expected observations:

- Public visuals and approved graphic behavior work.
- `/auth` and `/register` are inert.
- No Firebase script, request, local state, Firestore operation, Storage upload,
  or auth provider is present.

### TC-2024-001: 2024 public site works without its retired stack

Setup:

- Use the pinned source, recovered public screenshots, and approved sponsor
  snapshot as the baseline.

Action:

- Load and scroll through Hero, About, Sponsors, FAQ, and Contact at all required
  widths.

Expected observations:

- The underwater theme, artwork, navigation, animations, and public content
  render deterministically.
- The approved sponsors render from local immutable data and local assets.
- No application CTA, auth UI, dashboard UI, Clerk provider, tRPC call, backend
  request, or remote sponsor image request exists.

## Deployment test cases

### TC-DEPLOY-001: One-year deployment gate

Setup:

- All four local matrices have passed and the human has approved a single year
  for deployment.
- Record host disk, Docker image/container counts, and resource baseline.

Action:

- Deploy only the approved year to its Coolify preview/origin.

Expected observations:

- Exactly one new application deployment is queued.
- Its container is healthy, serves the complete route matrix, has zero restarts,
  and stays within the static-app resource profile.
- Image size, container RSS/CPU, logs, health, and disk delta are recorded before
  any domain cutover or next deployment.

### TC-DEPLOY-002: Year-domain cutover and rollback

Setup:

- The approved year's Coolify deployment has passed TC-DEPLOY-001.
- Capture the prior Cloudflare configuration and confirm a rollback target.

Action:

- Point only that year hostname at the Forge origin and test through Cloudflare.

Expected observations:

- TLS, caching, canonical URLs, retained routes, removed routes, and assets work
  on the public hostname.
- No Access challenge remains on a public archive.
- The prior origin/configuration remains recoverable until the observation window
  is accepted.
- The next year is not queued until the human accepts this result.

## Negative / regression cases

### TC-NEG-001: Secretless build

Setup:

- Remove all optional environment variables and provide no legacy credentials.

Action:

- Build all four apps and Docker images.

Expected observations:

- Every build succeeds without Firebase, Clerk, database, tRPC, storage, or API
  secrets.
- Generated files and images contain no secret values or legacy service config.

### TC-NEG-002: Broken and unsafe links fail review

Setup:

- Crawl every internal and external link emitted by each archive.

Action:

- Classify redirects, errors, mixed content, auth walls, and event-specific
  operational destinations.

Expected observations:

- No internal link is broken.
- Any external failure or unsafe/outdated destination is removed or documented
  for explicit human approval; it is not silently ignored.

### TC-NEG-003: One archive cannot contaminate another

Setup:

- Build all archives, then change a year-local asset or style.

Action:

- Rebuild the changed app and compare other app outputs.

Expected observations:

- Other years' output and visual snapshots do not change.
- No historical component or stylesheet was placed in a shared package without
  an approved stable contract.

### TC-NEG-004: No push before complete visual proof

Setup:

- Leave any one local build, route matrix, or required screenshot unverified.

Action:

- Review release readiness.

Expected observations:

- `status.md` remains incomplete and the branch is not pushed or deployed.

## Resolved expectations

- Removed workflows use a styled archival notice with HTTP 410 semantics.
- The unfinished 2022 prototype is excluded because no matching event exists in
  the official or internal history.
- The 2023 `/social` route remains if it passes the client-only, secretless test.
- No 2020 utility redirect alias remains.
- A ten-minute health and resource observation gates the next production year.
