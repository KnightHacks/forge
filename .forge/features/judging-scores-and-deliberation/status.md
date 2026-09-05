# Judging scores and deliberation status

Current phase: Implementation

## Decision log

- 2026-09-05: This bundle extends `project-judging` and `judging-magic-access`. It does not replace their project, room, guest-session, or judge identity models.
- 2026-09-05: The human approved the feature spec, SRD, and exactly 20 observable test cases.
- 2026-09-05: Officers configure any number of 1 through 5 rating items and short-response items per hackathon. Rubric changes require no yearly code edit.
- 2026-09-05: One evaluation belongs to one judge, project, and challenge. A judge may evaluate the same project in several challenge scopes and may edit each evaluation while judging is Open.
- 2026-09-05: An evaluation score averages its quantitative answers. Scoped and overall ratings average evaluation scores with no judge calibration or per-challenge scaling.
- 2026-09-05: A judge sees `(?)` until they evaluate the project in that challenge. Officers may reveal scoped results early to authenticated member judges. Guest result access never widens.
- 2026-09-05: Overall ratings appear only to authenticated member judges and officers.
- 2026-09-05: Short-response items carry public, public-optional, or private policies. KH IX member feedback is public. Guest optional-public feedback defaults private and lets the guest opt in.
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
- [ ] Add validator and score-math tests.
- [ ] Add schema and generated migration.
- [ ] Add API procedures, authorization, transactions, and audit coverage.
- [ ] Add project command center and compatibility routing.
- [ ] Add Projects, Submissions, and Deliberation judge tabs.
- [ ] Add matching loading, error, empty, desktop, and mobile states.
- [ ] Run automated checks and targeted visual verification.
- [ ] Run Forge review at depth 5 and clear all blockers.
- [ ] Sync and rebase onto current GitHub `main` once host Git access is available.
- [ ] Create and assign the GitHub issue with required labels.
- [ ] Push the branch and open a fully documented PR.
- [ ] Upload many screenshots to GitHub discussion only.
- [ ] Address, reply to, resolve, and re-request CodeRabbit review until approved.

## Validation and commands

- `node --experimental-strip-types scripts/create-forge-feature.ts judging-scores-and-deliberation "Judging Scores and Deliberation"`: passed.
- Repository history review: the retired 2025 rubric used five fixed 1 through 10 fields and separate public and private feedback. This bundle replaces that fixed shape with hackathon data.
- Published KH8 Devpost review: confirmed Originality, Technical Understanding, Functionality, Design, and Wow Factor as useful seed content, not code constants.
- GitHub browser review: PR #529 establishes the expected issue linking, detailed flow narrative, labels, test evidence, and externally hosted screenshots.
- GitHub CLI login attempt: blocked before device-code creation because this task shell cannot reach `github.com`. The existing CLI token is invalid. Local implementation continues while host authentication is resolved.

## Links

- PRs:
- Issues:
- Reference PR: https://github.com/KnightHacks/forge/pull/529
