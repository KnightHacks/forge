# Judging scores and deliberation status

Current phase: Implementation

## Decision log

- 2026-09-05: This bundle extends `project-judging` and `judging-magic-access`. It does not replace their project, room, guest-session, or judge identity models.
- 2026-09-05: The human approved the feature spec, SRD, and exactly 20 observable test cases.
- 2026-09-05: Officers configure any number of 1 through 5 rating items and short-response items per hackathon. Rubric changes require no yearly code edit.
- 2026-09-05: One evaluation belongs to one judge, project, and challenge. A judge may evaluate the same project in several challenge scopes and may edit each evaluation while judging is Open.
- 2026-09-05: An evaluation score averages its quantitative answers. Scoped and overall ratings average evaluation scores with no judge calibration or per-challenge scaling.
- 2026-09-05: A judge sees `(?)` until they evaluate the project in that challenge. Officers may reveal scoped results early to authenticated member judges. Guest result access never widens.
- 2026-09-05: The member table labels the scoped score `Challenge rating` and the cross-challenge score `Rating`. Members can sort by the visible score data.
- 2026-09-05: Short-response policies control hacker delivery. KH IX member feedback is always shared with hackers. Guest optional-public feedback defaults to not shared and lets the guest opt in. Authenticated judges and officers can review all feedback.
- 2026-09-05: The Projects tab hides the current judge's completed projects by default and restores them with `See previously judged`. Guest views omit other challenge data. Member challenge badges turn green after the first evaluation in that scope.
- 2026-09-05: Judging state is Draft, Open, or Closed. Closed is read-only and may reopen. At least one rating item is required to open.
- 2026-09-05: The judge workspace tabs are `Projects`, `Submissions`, and `Deliberation`. Deliberation is private, available to guests and members, accepts judged projects, and supports accessible ordering.
- 2026-09-05: The first evaluation locks rubric changes and destructive inventory replacement. Ordinary imports remain add-only by normalized Devpost URL.
- 2026-09-05: The officer project command center combines project import, rubric and lifecycle configuration, result visibility, rooms, QR controls, and live rosters. Existing admin entry points remain compatible.
- 2026-09-05: Exit condition is a depth-5 Forge review with no blockers, an issue and PR that follow repository standards, many externally hosted review screenshots, and CodeRabbit approval after every actionable thread is fixed, replied to, and resolved.
- 2026-09-05: Screenshots must never be committed to the feature branch.

## Open questions

None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Record human approval for the SRD and 20 test cases.
- [x] Add validator and score-math tests.
- [x] Add schema and generated migration.
- [x] Add API procedures, authorization, transactions, and audit coverage.
- [x] Add project command center and compatibility routing.
- [x] Add Projects, Submissions, and Deliberation judge tabs.
- [x] Add matching loading, error, empty, desktop, and mobile states.
- [x] Run automated checks and targeted visual verification.
- [x] Run Forge review at depth 5 and clear all blockers.
- [x] Sync and rebase onto current GitHub `main` once host Git access is available.
- [x] Create and assign the GitHub issue with required labels.
- [x] Push the branch and open a fully documented PR.
- [x] Upload many screenshots to GitHub discussion only.
- [x] Address, reply to, resolve, and re-request CodeRabbit review until approved.

## Validation and commands

- `node --experimental-strip-types scripts/create-forge-feature.ts judging-scores-and-deliberation "Judging Scores and Deliberation"`: passed.
- Repository history review: the retired 2025 rubric used five fixed 1 through 10 fields and separate public and private feedback. This bundle replaces that fixed shape with hackathon data.
- Published KH8 Devpost review: confirmed Originality, Technical Understanding, Functionality, Design, and Wow Factor as useful seed content, not code constants.
- GitHub browser review: PR #529 establishes the expected issue linking, detailed flow narrative, labels, test evidence, and externally hosted screenshots.
- GitHub CLI and Git network access: authenticated as `DVidal1205`. The feature branch is based on `origin/main` at `f4436df1`.
- Full package tests: `@forge/db` 147 passed, `@forge/api` 768 passed, `@forge/blade` 775 passed, and `@forge/validators` 268 passed. Total: 1,958 passing tests.
- Repository verification: `pnpm verify:precommit`, `pnpm --filter @forge/db with-env drizzle-kit check`, `pnpm --filter @forge/blade build`, and `git diff --check` passed.
- Depth-5 Forge review: completed security and access control, persistence and migration, API contracts, UI and accessibility, and test and product-behavior passes. All identified blockers were fixed and reverified.
- Browser verification: completed guest naming, challenge-scoped project access, hacker feedback visibility, submission history, and deliberation flows. Also checked the authenticated member workspace, score sorting, completion badges, aggregate columns, project command center, room QR controls, evaluation audit history, and 390px and 320px layouts against the KH VIII import.
- PR evidence: 15 screenshots were generated in `/tmp/forge-judging-pr`. These files stay outside the repository and will be attached through GitHub-hosted review media only.
- CodeRabbit review: all four major threads and four grouped accessibility and test-quality findings were fixed. Every inline thread has a reply and resolution. CodeRabbit approved the PR after the final checks passed.

## Links

- PRs: https://github.com/KnightHacks/forge/pull/532
- Issues: https://github.com/KnightHacks/forge/issues/531
- Reference PR: https://github.com/KnightHacks/forge/pull/529
