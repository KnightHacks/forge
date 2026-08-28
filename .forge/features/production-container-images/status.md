# Production Container Images Status

Current phase: Production rollout

## Decision log

- 2026-08-28: Keep Coolify pinned to `v4.0.0-beta.426`.
- 2026-08-28: Use repository-owned multi-stage Dockerfiles with a root build
  context and Turbo-pruned workspaces.
- 2026-08-28: Deploy one application at a time in the approved order:
  GemiKnights, KH8, BloomKnights, Guild, Cron, T.K, Club, Blade, KH9.
- 2026-08-28: Keep each prior image until its replacement passes production
  checks.
- 2026-08-28: The user approved repository, dependency, Coolify configuration,
  and production deployment changes for this rollout.

## Open questions

None.

## Task list

- [x] Complete and approve `spec.md`.
- [x] Complete and approve `srd.md`.
- [x] Complete and approve `test-cases.md`.
- [x] Remove the 15 abandoned Coolify helper containers.
- [x] Add and test the production Dockerfiles.
- [ ] Complete the serialized production rollout.
- [ ] Record final image sizes and worker disk usage.

## Validation / commands

- `docker system df` before implementation: 20 running containers, 44.52 GB of
  images, 81.49 MB of writable container data, and 2.848 GB of referenced build
  cache.
- `df -h /` after helper cleanup: 82 GB used, 42 GB available, 67% utilization.
- `pnpm format`: passed.
- `pnpm lint`: passed with pre-existing warnings and no errors.
- `pnpm typecheck`: passed.
- All nine Dockerfiles built successfully on ARM64.
- Local runtime image sizes: GemiKnights 40.8 MB, KH8 69.7 MB,
  BloomKnights 23.6 MB, Guild 116.9 MB, Cron 357.4 MB, T.K 369.1 MB,
  Club 28.2 MB, Blade 123.3 MB, and KH9 116.9 MB.
- Static GemiKnights and BloomKnights images served successful root requests.
- Cron and T.K production `tsx` entrypoints resolved from their runtime images.
- Guild and Blade standalone entrypoints resolved, and sentinel server build
  values were absent from their runtime filesystems.
- Guild and Blade builds use two non-sensitive placeholder build arguments
  instead of exposing production secrets to Docker build history or cache.
- All four nginx images served root and representative direct URLs as UID 101
  (`nginx`).

## Links

- PRs: pending
- Issues: https://github.com/KnightHacks/forge/issues/520
- Discord/thread context: production rollout approved in the infrastructure
  investigation task on 2026-08-28.
