# Production Container Images SRD

Status: Approved

## Technical purpose

Replace the single-stage Nixpacks images used by Forge with repository-owned,
multi-stage Dockerfiles. Each builder receives a Turbo-pruned workspace. Each
runtime receives only the static export, traced Next.js server, or deployed bot
workspace required by that application.

## Relevant principles

- [Branch and review policy](../../../docs/agentic-development/forge-engineering-principles.md#branch-and-review-policy)
- [Testing principles](../../../docs/agentic-development/forge-engineering-principles.md#testing-principles)
- [Security and data hygiene](../../../docs/agentic-development/forge-engineering-principles.md#security-and-data-hygiene)

## Access policy

The images do not change application access policy. Public, authenticated, and
officer-only routes retain their current server-side checks. Deployment access
remains restricted to the existing Coolify team.

## Architecture / data flow

The repository provides one Dockerfile per deployed application under
`deploy/dockerfiles` and a shared nginx template for static exports.

- GemiKnights, Knight Hacks VIII, BloomKnights, and Club build Next.js static
  exports and run on nginx.
- Guild, Blade, and Knight Hacks IX build Next.js standalone output and run on
  Node.
- Cron and T.K use `pnpm deploy --prod` to produce isolated workspaces and run
  TypeScript through the production `tsx` dependency.

Every Dockerfile keeps `/` as the Coolify base directory so Turbo can trace
workspace dependencies. The pruner stage receives the repository checkout,
while the installer receives the pruned manifests and lockfile before source
files. This ordering allows dependency-layer reuse when source files change.

## tRPC/API behavior

No procedure, router, input, output, or error behavior changes. Standalone
tracing must include the workspace packages used by Blade, Guild, and KHIX.

## Validation

No Zod schema changes. Builds use the existing Coolify variables marked for
build. Dockerfiles redeclare client variables that Next.js embeds and the
server variables required while Next.js inspects server modules. Multi-stage
builds keep those server values out of the final runtime image. Coolify
continues injecting runtime variables through the generated Compose
environment file.

## Data / migration / compatibility

No database or volume migration.

Compatibility requirements:

- Keep Coolify on `v4.0.0-beta.426`.
- Preserve each application's exposed port.
- Preserve current environment values and build-time flags.
- Keep the prior production image available until the replacement passes
  verification.
- Deploy in this order: GemiKnights, KH8, BloomKnights, Guild, Cron, T.K, Club,
  Blade, KH9.
- Queue one deployment at a time.

Rollback uses Coolify's prior image for the affected application. Repository
rollback restores the Nixpacks build pack or deploys the preceding commit.

## Discord integration

Cron and T.K retain their current token and command behavior. Serialized
deployment prevents overlapping deployment notifications. The change sends no
new Discord messages from application code.

## Configurability review

Would this require a developer change next year?

- Answer: a new Forge deployment unit needs its own Dockerfile and Coolify
  configuration.
- This is acceptable because application runtime construction is deployment
  code. Routine event, officer, and hackathon configuration remains outside
  these Dockerfiles.

## React / frontend constraints

No React code or visible design changes. GemiKnights and BloomKnights may use
static export only after their existing pages build without server-only Next.js
features. Static image optimization must use the existing unoptimized behavior
or an explicit equivalent.

## Testing / verification strategy

- Run `pnpm format`, `pnpm lint`, and `pnpm typecheck` before commit.
- Run targeted Next.js builds for every web application.
- Build every Dockerfile on ARM64, matching the production worker.
- Start each local image and check its root endpoint or process health.
- After each Coolify deployment, verify container health, production endpoint,
  image size, and deployment logs before queuing the next application.
- Record final `docker system df` and root filesystem usage.

## Open questions

None.
