# Production Container Images Test Cases

Status: Approved

## Scope

These cases cover image construction, runtime startup, production availability,
deployment ordering, environment compatibility, and disk usage. Product logic,
database behavior, and visual design remain outside this change.

## Test placement plan

Docker builds run from the repository root. Existing package build, lint, and
typecheck commands cover application source. Production checks use Coolify
deployment logs, Docker inspection on `kh-worker`, and HTTP health requests.

## Test cases

### TC-001: Static application image serves its export

Setup:

- Build a static app Dockerfile from the repository root.

Action:

- Start the image and request `/` plus one representative exported page or
  asset on its exposed port.

Expected observations:

- The request returns a successful response.
- The direct non-root request returns a successful response.
- The runtime image contains the exported site and nginx, without Node build
  dependencies or unrelated Forge apps.
- The nginx process runs as its unprivileged `nginx` user.

### TC-002: Standalone Next.js image starts with runtime variables

Setup:

- Build a standalone app image with its required public build variables.
- Provide its current server variables at container startup.

Action:

- Start the image and request its health path or root page.

Expected observations:

- Node starts the traced app server on the existing port.
- The request succeeds or returns the application's established redirect.
- Runtime secrets are absent from the final image configuration and history.

### TC-003: Cron and T.K start from production deployments

Setup:

- Build the Cron or T.K Dockerfile.
- Provide non-production test values that satisfy environment validation.

Action:

- Start the image long enough to observe process initialization.

Expected observations:

- `tsx` resolves from production dependencies.
- The application loads its source and workspace dependencies.
- A missing or invalid external credential fails through the existing
  application validation instead of a missing-module error.

### TC-004: Production deployment preserves application availability

Setup:

- Record the current container, image, URL, and rollback image.

Action:

- Update the Coolify application to its repository Dockerfile and deploy it.

Expected observations:

- Coolify finishes the deployment.
- The replacement container becomes healthy and serves the existing URL or
  continues the existing background workload.
- The previous image remains available during verification.

### TC-005: Deployments remain serialized

Setup:

- One application deployment is running or awaiting verification.

Action:

- Review the Coolify deployment queue and Docker containers.

Expected observations:

- No later application deployment starts before the active application passes
  verification.

### TC-006: Runtime image size decreases

Setup:

- Record the old and new image IDs for one application.

Action:

- Inspect their unique and virtual sizes.

Expected observations:

- The new image is smaller than the Nixpacks image.
- The final report records both sizes and the worker's available disk space.

## Negative / regression cases

### TC-NEG-001: Failed replacement keeps the current application running

Setup:

- The existing production container is healthy.

Action:

- A new image fails to build, start, or pass health checks.

Expected observations:

- Coolify does not remove the healthy current container.
- The next application deployment is not queued.
- The failure is corrected or rolled back before continuing.

### TC-NEG-002: Build-only values do not enter the final runtime image

Setup:

- Build an app with a sentinel build-only value.

Action:

- Inspect the final image configuration, history, and filesystem for the
  sentinel.

Expected observations:

- The final runtime image does not contain the sentinel value.

## Open questions

None.
