# Career job ingestion Status

Current phase: Implemented, awaiting human review (not committed)

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-11-13: Cross-source dedupe matches only on IDs: ATS requisition keys and the normalized apply URL, with a source-scoped key as the fallback. No fuzzy or company/title matching, per the #647 SRD.
- 2026-11-13: The API classifies track from the title, using the adapter's track when one is given. Listings that are neither internship nor new grad are rejected.
- 2026-11-13: Listings whose only locations are explicitly outside the U.S. are rejected. Location text that can't be parsed is kept as `unknown`.
- 2026-11-13: Before a source's first successful run finishes, its jobs stay `suppressed`. After that, new jobs become `pending` with a frozen track and the channel that cron passes in. A track with no channel stays `suppressed`.
- 2026-11-17: A closed job that reappears becomes active again with no second Discord post, following #647's one-post-per-job rule. The user first picked "repost", then chose to follow #647 because of spam risk from flaky boards.
- 2026-11-17: When sources disagree on track, the track from the first accepted listing stays unless employer evidence says otherwise. A changed track never causes a repost.
- 2026-11-17: Title, description and compensation update from the latest listing. Apply links prefer the employer's own page over an aggregator. Track and first-seen date never change.
- 2026-11-17: No officer view of ingest results. Ingestion returns counts, including rejections by reason, to cron, and #653 decides how to report them.
- 2026-11-17: Build on the `CareerJobSourceSnapshot` shape from the #652 branch instead of a separate draft.

## Open questions

- Resolved 2026-11-17: #652 owner replied "LGTM" to the contract (https://github.com/KnightHacks/forge/issues/633#issuecomment-6961617503): split `complete` into `complete` plus `inventory: "full" | "rolling"`, look up or create `JobSource` by provider and boardKey, make `track` optional, and move the zod schema into `@forge/validators`.
- Should upstream's "recent catch-up" posting of jobs from the first run be ported? Currently skipped.

## Task list

- [x] Agree the snapshot contract in #633.
- [x] Complete reverse-prompting for `spec.md`.
- [ ] Human review of `srd.md` (drafted from the approved plan, not reverse-prompted).
- [ ] Human review of `test-cases.md` (drafted from the approved plan, not reverse-prompted).
- [ ] Human approves the full artifact bundle (spec approved 2026-11-17).
- [x] Pure functions: normalize, classify, locations (+ `findUsCity`).
- [x] `ingest.ts` + `job-board.server.ts` export.
- [x] Tests: per-source fixtures + DB ingest scenarios.

## Validation / commands

- 2026-11-17 `pnpm format`: pass
- 2026-11-17 `pnpm lint`: pass (0 errors; one max-lines warning in the new integration test)
- 2026-11-17 `pnpm typecheck`: pass (33/33)
- 2026-11-17 `@forge/api` vitest, full suite against local PostgreSQL 16: 151 files, 1248 tests pass, including 13 rule tests and 12 ingest DB tests
- 2026-11-17 `@forge/validators` vitest: 29 files, 380 tests pass

## Links

- PRs: #670 (#651 router, shares `utils/job-board/`)
- Issues: #633, #649, #652 (branch `career/job-poster-to-cron`), #653, #654
- Discord/thread context:
