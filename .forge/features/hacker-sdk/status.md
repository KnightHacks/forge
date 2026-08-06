# Hacker SDK Status

Current phase: Spec approved / SRD architecture review

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
- 2026-08-06: The SDK is intentionally Forge- and React-opinionated for better
  developer experience. Portability outside Forge is not a goal.
- 2026-08-06: Profile edits update all applications whose hackathons have not
  started. Each application pins its sponsor-visible profile revision when its
  hackathon starts, avoiding a global lock across overlapping hacks.
- 2026-08-06: Pending, waitlisted, accepted, and confirmed hackers may withdraw
  before the event starts. An explicit confirmation dialog states that it is
  irreversible. There is no hacker-facing undo; denied and checked-in hackers
  cannot withdraw, while officers retain correction authority.
- 2026-08-06: MLH and Knight Hacks agreements are versioned per application with
  acceptance times; confirmation records its own terms acceptance. Marketing
  consent remains optional.
- 2026-08-06: Minors may apply and confirm. Age is derived from DOB; organizers
  receive a minor flag and check-in retains its prominent under-18 warning.
- 2026-08-06: Authenticated confirmed and checked-in hackers may view overall
  and arbitrary-class leaderboards derived only from Hackathon Event points.
  Rows show first name plus last initial; the signed-in row is identified, and
  VIPs remain ranked in their normal class.
- 2026-08-06: Schedule and timeline stay hidden until `checkedin`, preserving
  the intended surprise even though Discord and Google calendars may be public.
- 2026-08-06: Explicitly added independent per-hack Discord and Google Calendar
  publication controls. Disabled providers keep events database-only. Enabling
  reconciles all existing events and future changes; disabling removes all
  remote projections but retains Forge rows. Bulk work needs visible progress,
  durable retry, partial-failure health, and manual repair.
- 2026-08-06: The owner granted blanket approval for the artifact bundle and
  implementation, delegating remaining architecture and test choices to three
  independent Forge-skilled reviews.
- 2026-08-06: Publication controls live beside the selected hackathon's event
  actions and require hackathon configuration authority. New hackathons default
  both providers off; existing hackathons backfill both on.
- 2026-08-06: Publication includes primary check-in. Disabling requires a
  provider-and-count confirmation. Requested state persists while visible
  progress, automatic retry, manual retry, and Discord ambiguity repair
  converge remote state.
- 2026-08-06: Provider payload limits remain enforced while disabled. Discord
  reminders stop immediately when Discord publication is off; Google Calendar
  state does not control them.

## Open questions

None at the product level. Technical ambiguities are being resolved by the
delegated adversarial SRD review.

## Task list

- [x] Create isolated `reforge/hacker-sdk` worktree and feature artifact bundle.
- [x] Mine current Reforge, Legacy, and authoritative `origin/main` KH IX/Bloom
      participant behavior.
- [x] Record the evidence and unresolved product boundaries in `research.md`.
- [x] Complete and approve `spec.md` under the owner's blanket approval.
- [ ] Complete and approve `srd.md` after three independent architecture passes.
- [ ] Complete and approve `test-cases.md` under the delegated approval.
- [x] Owner approved the full artifact and implementation pipeline.

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
