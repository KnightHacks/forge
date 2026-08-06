# Hacker SDK Status

Current phase: KH IX manual UI pass

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
- 2026-08-06: Profile edits update non-terminal applications whose hackathons
  have not started. Denied and withdrawn applications retain their pinned
  profile and resume snapshots, and each remaining application pins its
  sponsor-visible revision when its hackathon starts.
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
  actions. Reads use Hackathon Event read/edit access; changes use
  `EDIT_HACK_EVENT`. New hackathons default both providers off; existing
  hackathons with current projections backfill the matching provider on.
- 2026-08-06: Publication includes primary check-in. Disabling requires a
  provider-and-count confirmation. Requested state persists while visible
  progress, automatic retry, manual retry, and Discord ambiguity repair
  converge remote state.
- 2026-08-06: Provider payload limits remain enforced while disabled. By a
  two-to-one adversarial review decision, Discord announcement reminders remain
  independent of Scheduled Event publication. With publication off, the
  reminder still pings the hack role from Forge data and omits the event link.
- 2026-08-06: Three independent reviewers unanimously selected a versioned
  `@forge/hacker-sdk` package, isolated participant API, same-origin Next
  adapter, Blade-brokered PKCE authorization-code handoff, and opaque portal
  sessions. Browser inputs never select authoritative hackathon scope.
- 2026-08-06: Three independent reviewers unanimously selected an additive
  canonical `HackerProfile` plus immutable revisions. Legacy `Hacker` rows stay
  as mixed-version application snapshots until current `main` consumers are
  retired.
- 2026-08-06: Provider publication uses per-hack/provider desired-state rows
  and durable per-event/provider work. External projection health no longer
  gates hack check-in, schedule, attendance, or points.
- 2026-08-06: Knight Hacks IX is the sole live SDK consumer for this release.
  Ended KH VIII, GemiKnights, and BloomKnights sites keep their historical
  themed presentation while dead application entry points and legacy runtime
  dependencies are removed silently.
- 2026-08-06: Portal QR issuance is an explicit idempotent mutation. The Next
  adapter coalesces concurrent refreshes, buffers replayable request bodies
  within explicit byte caps, and treats Discord identity as Blade-owned
  authenticated data.
- 2026-08-06: Deep review hardened portal credentials around a fixed 30-day
  family lifetime, historical hash-only replay detection, serialized origin
  cutovers, bounded request bodies, and retryable cross-instance refresh races.
- 2026-08-06: Check-in QR payloads are HMAC-derived from safe command identity;
  durable command results retain metadata rather than usable bearer secrets.
- 2026-08-06: KH IX renders and submits the exact active Blade agreement
  definitions. It never infers or records consent for an agreement the hacker
  was not shown.
- 2026-08-06: Final deep review requires event deletion to preserve attendance
  and scanner-attempt history, and exact concurrent creation-key retries to
  converge on one event and one creation audit.
- 2026-08-06: Manual review found that the SDK consumer was adapted from the
  older KH IX tree inherited through `reforge/main`, while authoritative KH IX
  frontend work continued on `origin/main`. The complete current
  `origin/main:apps/khix` presentation is now the visual and interaction source
  of truth. This slice will transplant that app in isolation and replace only
  its legacy auth/API coupling with the Hacker SDK; regular `main` Blade/API
  architecture will not be merged into Reforge.

## Open questions

None. The delegated adversarial SRD review completed.

## Task list

- [x] Create isolated `reforge/hacker-sdk` worktree and feature artifact bundle.
- [x] Mine current Reforge, Legacy, and authoritative `origin/main` KH IX/Bloom
      participant behavior.
- [x] Record the evidence and unresolved product boundaries in `research.md`.
- [x] Complete and approve `spec.md` under the owner's blanket approval.
- [x] Complete and approve `srd.md` after three independent architecture passes.
- [x] Complete and approve `test-cases.md` under the delegated approval.
- [x] Owner approved the full artifact and implementation pipeline.
- [x] Add canonical profile/revision, agreement, portal-session, check-in-pass,
      idempotency, publication, and durable-work schemas.
- [x] Add aborting migration preflight and legacy-safe profile, agreement, and
      publication backfills.
- [x] Add strict participant/auth/publication/admin validators.
- [x] Implement the headless @forge/hacker-sdk contracts, client, React hooks,
      Next adapter, lifecycle helpers, documentation, and tests.
- [x] Implement Blade-brokered PKCE primitives, hashed portal sessions,
      rotation/replay protection, and auth protocol routes.
- [x] Decouple Hackathon Event readiness and reminders from external projection
      availability.
- [x] Implement durable Discord/Google desired-state reconciliation and cron
      processing.
- [x] Complete the isolated participant v1 API, binary resume routes, lifecycle
      transactions, opaque QR scanner support, and participant audit.
- [x] Complete Blade portal/agreement provisioning and publication controls.
- [x] Migrate KH IX to the SDK; decouple ended KH VIII, GemiKnights, and
      BloomKnights sites from live participant flows.
- [x] Run focused database-backed participant, publication, reminder, and
      check-in integration checks.
- [x] Run full precommit/push/build validation.
- [x] Run React analysis and visible Playwright QA at desktop and 320 px for
      Blade admin, historical static sites, and authenticated KH IX status/QR.
- [x] Complete deep Forge Review and prepare the manual UI-pass server.
- [x] Audit the complete authoritative `origin/main:apps/khix` tree against the
      working SDK consumer and record the transplant boundary.
- [x] Transplant the authoritative KH IX app and assets without merging regular
      `main` Blade/backend implementation.
- [x] Reconnect application, profile, status, agreements, resume, QR, schedule,
      attendance, points, and leaderboard through `@forge/hacker-sdk`.
- [ ] Re-run the final deep Forge Review gate after the manual UI pass.

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
- pnpm --filter @forge/hacker-sdk typecheck: passed.
- pnpm --filter @forge/hacker-sdk test: 18 tests passed.
- pnpm --filter @forge/auth typecheck: passed.
- pnpm --filter @forge/auth test: 8 tests passed.
- pnpm --filter @forge/validators typecheck: passed.
- Validator suite: 218 tests passed.
- pnpm --filter @forge/db typecheck: passed.
- Database suite: 117 passed against a disposable database.
- Drizzle schema check and no-diff generation check passed.
- Participant/auth/publication integration: 25 database-backed cases passed;
  Hackathon Event check-in integration: 12 passed.
- Authenticated Playwright: Blade → KH IX PKCE sign-in, dashboard, responsive
  status, QR issuance, and checked-in Hackathon Events schedule rendered without
  console errors or horizontal overflow at 1440px and 320px.
- `pnpm verify:precommit`: passed after the deep-review fixes.
- Full workspace test graph: 25/25 tasks passed, including API 660/660, Blade
  653/653, SDK 23/23, auth 18/18, KH IX 10/10, and database 117/117.
- Full production build graph: 17/17 tasks passed, including Blade, KH IX,
  Club, Guild, KH VIII, GemiKnights, and BloomKnights.
- Deep Forge Review resolved token-family revocation and replay, origin-cutover
  races, fixed refresh-family retention, streamed request limits, QR secret
  persistence, participant-command expiry, event publication serialization,
  audit atomicity, resume sequencing, dynamic consent, stable retry identity,
  shared validation, and locked-profile UX findings with regression coverage.
- Final authenticated 390 px Playwright pass: dashboard, regenerated QR,
  checked-in schedule, and editable pre-start profile rendered with no console
  errors or horizontal overflow.
- Final post-review Playwright pass: authenticated Blade provisioning at 390
  px, KH IX profile at 390 px, and KH IX event schedule at 1440 px rendered
  without console errors or horizontal overflow; screenshots were inspected
  with vision for consistency.
- Final three-way adversarial re-review: GREEN after protecting terminal
  snapshots, preserving event attendance/check-in history, eliminating
  duplicate and concurrent creation-key audit races, and closing KH IX
  submission/editability timing windows.
- `pnpm knip:strict` reports only the pre-existing `US_CITY_SOURCE` export in
  `packages/api/src/data/us-cities-2025.ts`; this feature adds no Knip finding.
- Isolated transplant pinned `origin/main:apps/khix` at `0aa390a0`, preserved
  its full marketing/credits/font asset tree, and removed the transplanted local
  Better Auth, participant tRPC proxy, direct database, and hackathon-package
  seams. The Team Cascade remains an explicit public-read Blade tRPC consumer.
- KH IX now exposes a themed My Hack page backed by SDK attendance, points,
  overall/class leaderboards, configured class, VIP, and age-at-event data.
  Resume removal and irreversible withdrawal have confirmation UI.
- Post-transplant checks passed: KH IX typecheck; SDK/API typecheck; KH IX 10/10
  tests; SDK 23/23 tests; KH IX lint with zero errors; React analysis across 44
  files and 34 components with zero failures; KH IX production build across 14
  routes.
- Authenticated Playwright against the populated development database completed
  Blade PKCE sign-in and rendered checked-in dashboard plus My Hack at 1440px
  and 390px. Points (300), attendance (4), configured Alchemist class, and both
  rank-one leaderboards came from Blade. The authoritative public landing page
  rendered with no console errors after preserving its current roster-image
  host configuration. Desktop/mobile screenshots were inspected with vision.
- Post-review hardening added an atomic `updateParticipant` contract so KH IX
  profile, application-answer, and agreement edits commit or roll back together.
  A stale-revision database regression asserts that no hackathon answer leaks
  through a failed composite save.
- Portal adapter cookies are now deterministically namespaced by public client
  ID and request origin. The SDK adapter suite includes two instances of the
  same client on different localhost ports without access, refresh, state, or
  verifier-cookie collisions.
- Visible Playwright network tracing confirmed dashboard, lore, events, and My
  Hack fetch only their rendered participant datasets. A forced batched Blade
  failure rendered responsive `Unavailable` and retry states rather than false
  zero/empty data; `/tmp/khix-journey-error-mobile.png` was inspected with
  vision. Attendance timestamps now use the configured hackathon timezone.
- Latest `pnpm verify:precommit`: 29/29 tasks passed after the transplant review
  fixes.
- Latest `pnpm verify:push`: 29/29 tasks passed after the final retry,
  origin-isolation, atomic-update, and journey-key hardening.
- Final KH IX production build passed across all 14 routes, including the
  SDK-backed application, dashboard, profile, events, and My Hack journey.
- Final three-agent adversarial Forge Review returned GREEN with no remaining
  P0-P2 findings. The branch is ready for the owner's manual UI pass.

## Links

- PRs:
- Issues:
- Discord/thread context: current Codex task, owner intake on 2026-08-06
