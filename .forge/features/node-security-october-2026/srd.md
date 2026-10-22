# October 2026 Node.js Security Update SRD

## Evidence and boundary

The [official October advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
identifies Node 24.22.1, 22.23.4, and 26.12.1 as patched releases. It covers
DNS/TLS validation, Brotli memory corruption, HTTP behavior, and bundled libraries.
Before this change `.nvmrc` pinned EOL 25.6.1, root engines admitted Node >=20.16.0,
and 18 Node stages in 13 Dockerfiles used the floating `24-bookworm-slim` tag.
The local executable was 24.21.0. Production versions have not been observed.

## Technical requirements and compatibility

- Use 24.22.1, retaining the existing production major and Debian bookworm-slim.
- Pin `.nvmrc`; CI already consumes it via `tooling/github/setup/action.yml`.
- Restrict root engines to `^24.22.1`. An unbounded minimum would still admit
  EOL 25.x and unpatched early 26.x versions.
- The engine range is advisory for local commands. Contributors must select the
  `.nvmrc` runtime; this patch does not enforce arbitrary manual Node invocations.
- Replace every Node tools/runner base with `node:24.22.1-bookworm-slim`.
- Keep pnpm 9.12.1, Turbo, lockfile, application dependencies, and nginx unchanged.
- Update contributor instructions to agree with the supported runtime.
- Access policy, tRPC, database, authentication, and all app behavior are unchanged.

These are separate atomic checks of the same runtime invariant, consistent with
[Forge's engineering principles](../../../docs/agentic-development/forge-engineering-principles.md).
No shared application abstraction or new test harness is needed.

## Verification

Use an official Node binary with its SHA-256 checksum verified. Check all runtime
references, engine-range boundaries, native solver/image support, and repo gates.
Confirm the Docker tag exists for amd64 and arm64, then exercise Linux runtime
behavior and representative image builds when Docker is available.
A package-manager audit is supplementary; it does not audit Node itself.

## Rollout and rollback

Source changes do not patch running containers. After review/merge, rebuild and
redeploy each configured Coolify resource using these Dockerfiles, including
static-site builders, and verify `node --version` in the five Node runners
(Blade, Guild, KH9, TK, cron) is 24.22.1. Static nginx runners contain no Node.
A container restart alone is insufficient. Non-Docker deployments and CI runners
must also use the patched runtime. Do not roll back to the vulnerable versions;
use a supported release carrying the same fixes if compatibility requires a change.

## Open questions

Production inventory and deployment execution are outside this local patch.
