# Production Container Images Spec

Status: Approved

## User-facing purpose

Forge applications must continue serving their existing sites and Discord
workloads while using less disk space on the production worker. Deployments
must run one at a time so each application produces one Discord deployment
notification before the next deployment starts.

## Users / actors

- Visitors using Knight Hacks websites
- Members and officers using Blade and Guild
- Discord users served by T.K and Cron
- Dev team members deploying Forge through Coolify

## User-visible interface

The change adds no pages, controls, commands, or copy. Existing URLs, Discord
behavior, and application ports remain unchanged.

## Scope

### In scope

- Repository-owned production images for the nine deployed Forge applications
- Serialized production deployment in the approved order
- Production verification and image-size measurement after each deployment
- Rollback through the previous Coolify image while each application is tested

### Out of scope

- Upgrading or patching Coolify
- Changing application features, authentication, authorization, or data
- Changing production environment-variable values
- Removing application volumes, databases, or unrelated Docker resources

## Vocabulary

- `runtime image`: the image used by a production application container
- `builder stage`: a Docker stage that installs dependencies and compiles an app
- `standalone output`: the traced Next.js server files needed at runtime
- `static export`: HTML, CSS, JavaScript, and assets served without a Node server

## Acceptance criteria

- Each listed application remains available at its existing production URL or
  continues its existing Discord workload after deployment.
- No deployment starts until the preceding deployment finishes and passes its
  verification checks.
- Production runtime images omit unrelated Forge applications and build tools.
- Coolify stays on `v4.0.0-beta.426`.
- The final report records per-application image size and worker disk usage.

## Open questions

None. The deployment order and Coolify version constraint are approved.
