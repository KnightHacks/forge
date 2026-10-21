# October 2026 Node.js Security Update Status

Current phase: Validated locally; ready for user commit and operator rollout.

## Decisions

- 2026-10-21: User requested Node security maintenance from main, the branch
  `update-vulernerability`, no commit, and manual commit commands.
- Branch starts at freshly fetched `origin/main` (8097334e). Local main is checked
  out in another worktree and was left untouched. Existing untracked work is preserved.
- Keep the production Node 24 major; use patched 24.22.1 everywhere, restrict
  engines to 24.x, and leave application dependencies/lockfile unchanged.
- Independent read-only investigation confirmed every runtime reference and
  installed Next/Vitest/Vite/OR-Tools/Sharp compatibility with Node 24.
- User confirmed: keep dependency remediation out of this Node branch; report
  audit findings separately.

## Progress

- [x] Verify official advisory and source runtime inventory.
- [x] Create requested branch and feature bundle.
- [x] Align development/CI, engines, documentation, and all Node Docker stages.
- [x] Complete focused runtime/native validation and repository gates.
- [x] Complete independent patch review (no actionable bypass/regression found).
- [x] Prepare readiness report and scoped manual commit commands.

## Validation

- Official macOS arm64 24.22.1 archive downloaded; SHA-256 matches SHASUMS256.txt.
- Docker registry manifest confirms 24.22.1-bookworm-slim for amd64 and arm64.
- Runtime-reference assertions: all 18 Node stages, root engines, `.nvmrc`, and
  CI version-file consumption agree. Engine range boundary checks passed.
- DNS NUL regression: old local 24.21.0 sent a query for both embedded-NUL and
  trailing-NUL names. Patched 24.22.1 rejected both with ERR_INVALID_ARG_VALUE
  before any query. Valid local DNS and Brotli round trips passed on macOS,
  Linux arm64, and Linux amd64. Other upstream CVEs were not individually reproduced.
- `pnpm --filter @forge/api test src/tests/judging-schedule/solver.test.ts`:
  passed, 10 tests. Native Sharp PNG encode/decode passed.
- `pnpm format`: passed, 24 tasks. Targeted Prettier check also covers root JSON,
  setup docs, and this feature bundle.
- `TURBO_FORCE=true TURBO_CONCURRENCY=1 pnpm typecheck`: passed, 33 tasks,
  no Turbo cache hits. Validation used the verified 24.22.1 binary via PATH.
- `TURBO_FORCE=true TURBO_CONCURRENCY=1 pnpm lint`: passed, 31 tasks, no Turbo
  cache hits; existing warnings and no lint errors.
- Docker tools-stage build passed; its isolated container reports Node 24.22.1,
  pnpm 9.12.1, and Turbo 2.8.11. Full app container builds were cancelled with the
  initial concurrent attempts and were not completed. Linux base/runtime behavior
  and the shared tools stage were validated; final application images and running
  production containers still require operator rollout verification.
- Initial concurrent lint/typecheck/container attempts were explicitly cancelled
  because of host memory pressure; they are not recorded as passing checks.
- Full build passed, 21 tasks, no Turbo cache hits. Exact command, with the verified
  Node 24.22.1 binary on PATH:
  `CI=1 TURBO_FORCE=true TURBO_CONCURRENCY=1 pnpm exec dotenv -e .env.example -- pnpm build --env-mode=loose --concurrency=1`.
  Example values were injected into the build process; existing env files were not
  changed. The operator's default local Node installation was not upgraded.
- `pnpm audit --json`: exited 1; metadata reports 6 critical, 69 high,
  77 moderate, and 18 low vulnerability counts. The advisory dictionary contains
  152 distinct records across 45 packages. Critical records involve Next.js and
  Handlebars. These registry matches were not individually reproduced; the report
  and raw JSON are retained separately outside the repository. Dependencies remain
  unchanged at the user's request.

## Open questions and links

- Actual production runtime inventory and rollout require operator verification.
- The local DNS regression script, dependency report, and raw audit JSON were
  retained through Codex Security artifact storage and linked in the handoff.
- No issue/PR was supplied or created; no commit or push will be performed.
- Source: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
