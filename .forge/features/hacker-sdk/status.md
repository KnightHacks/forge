# Hacker SDK Status

Current phase: Research complete / product reverse-prompting

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-08-06: Blade remains the data, validation, lifecycle, audit, and admin
  owner. Hackathon frontends own the complete participant presentation and
  interaction design.
- 2026-08-06: The SDK is headless. It will not provide a required component
  library, styles, assets, layouts, or hackathon theme.
- 2026-08-06: A stable base application field set must support prefill from
  retained Hacker data, while each hackathon may add custom questions.
- 2026-08-06: The SDK must not require club membership or dues.
- 2026-08-06: Existing approved Reforge rules remain authoritative: explicit
  hack scope, per-attendee first-time status, configured arbitrary classes,
  orthogonal VIP, primary-check-in-only `checkedin`, and separate hacker points.
- 2026-08-06: `origin/main` KH IX/Bloom portal code is prototype evidence. It
  is not treated as the final SDK contract or silently merged into this branch.
- 2026-08-06: Supported SDK consumers are React apps in the Forge monorepo on
  Knight Hacks subdomains, plus registered localhost origins and ports for
  development. React hooks are a first-class surface; arbitrary frameworks,
  repositories, and production domains are out of scope.
- 2026-08-06: Approved a Blade-hosted participant API with a thin site adapter.
  Hack sites do not mount the platform backend or hold database, storage, email,
  Discord, or auth secrets. The current `main` auth proxy must be replaced with
  a defined sign-in, callback, session, retry, and localhost flow.
- 2026-08-06: Approved one reusable Hacker profile with per-hack facts kept
  separate. First-time status is always asked and recorded per hackathon. Age is
  derived from DOB at the relevant timestamp rather than stored again.
- 2026-08-06: Per-hack custom questions are deferred because KH IX applications
  are already active. The contract may leave a future extension point, but this
  feature does not add officer question authoring or change the current form.
- 2026-08-06: Hacker-controlled application/profile data remains editable until
  the selected hackathon starts, then locks for organizer and sponsor use.
- 2026-08-06: The feature covers application, profile, status lifecycle, resume,
  QR, Hackathon Events-backed schedule/timeline, personal attendance, points,
  and leaderboard. Past-hackathon history is out of scope.

## Open questions

- Profile revision behavior when one user has multiple not-yet-started or
  overlapping hackathons.
- Self-withdrawal graph and whether withdrawal can be reversed.
- Required versioned MLH and Knight Hacks agreement records.
- Under-18 application and participation policy. Age storage itself is settled:
  derive it from DOB and the relevant timestamp.
- Leaderboard identity/privacy/access policy.
- Schedule/timeline access policy.

## Task list

- [x] Create isolated `reforge/hacker-sdk` worktree and feature artifact bundle.
- [x] Mine current Reforge, Legacy, and authoritative `origin/main` KH IX/Bloom
      participant behavior.
- [x] Record the evidence and unresolved product boundaries in `research.md`.
- [ ] Complete reverse-prompting for `spec.md`.
- [ ] Complete reverse-prompting for `srd.md`.
- [ ] Complete reverse-prompting for `test-cases.md`.
- [ ] Human approves artifact bundle before implementation/test generation.

## Validation / commands

- `git fetch origin main`: confirmed authoritative KH IX portal at
  `origin/main` `0aa390a0`; local `main` was stale.
- `pnpm forge:feature hacker-sdk "Hacker SDK"`: failed before dependencies were
  available in this worktree.
- `/Users/dvidal/Documents/forge-reforge-main/node_modules/.bin/tsx scripts/create-forge-feature.ts hacker-sdk "Hacker SDK"`:
  created the required artifact bundle.
- Read-only repository archaeology: current Reforge, Legacy, `origin/main` KH IX
  and Bloom, participant router, `@forge/hackathon`, forms, resume, QR, auth,
  audit, feature decisions, and architecture rules inspected.

## Links

- PRs:
- Issues:
- Discord/thread context: current Codex task, owner intake on 2026-08-06
