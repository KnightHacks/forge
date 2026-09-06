# Judging Discord comms status

Current phase: Review and delivery

## Decision log

- 2026-09-05: The human approved a separate PR for optional, per-hackathon
  judging Discord communications.
- 2026-09-05: Forge uses the existing environment-aware Knight Hacks guild.
  No guild or channel ID is hard-coded.
- 2026-09-05: Active rooms receive one current thread. Channel changes create
  replacements and keep old Discord history.
- 2026-09-05: Newly assigned authenticated judges receive a self-mention.
  Heartbeats and same-room activity remain quiet.
- 2026-09-05: Guest name completion posts one arrival notice and mentions the
  authenticated judges currently assigned to the room.
- 2026-09-05: First QR generation, explicit resend, and rotation post the QR.
  Every explicit resend mentions the authenticated judges assigned at that
  moment. Viewing an existing QR does not post.
- 2026-09-05: Database security and presence actions commit independently of
  Discord delivery.
- 2026-09-05: Screenshots belong in PR discussion only.
- 2026-09-05: Discord copy uses the linked member profile's full name. The
  Discord account label remains a fallback for members without a profile.

## Open questions

None blocking.

## Task list

- [x] Create a worktree and branch from merged `origin/main`.
- [x] Review repository, database, design-system, Discord, and judging guidance.
- [x] Complete the product spec, SRD, and test plan.
- [x] Add schema, migration, validators, and Discord comms gateway.
- [x] Add API configuration, thread, arrival, QR, and revocation behavior.
- [x] Add Command Center channel and room-thread controls.
- [x] Add automated tests and run required checks.
- [x] Run desktop and mobile visual QA against KH VIII data.
- [x] Test delivery in the development guild bot-testing channel.
- [x] Create and assign the GitHub issue.
- [x] Commit, push, open the PR, and attach screenshots outside the repo.
- [ ] Address and resolve CodeRabbit review threads until approved.

## Validation and commands

- `git fetch origin main` and `git rebase origin/main`: passed. The branch is
  based on `bd97fccb` after PR #533 merged.
- `pnpm forge:feature judging-discord-comms "Judging Discord Comms"`: passed
  after linking the existing dependency directory.
- `pnpm db:generate`: passed; created additive migration `0048_little_tarot`.
- `pnpm db:migrate`: passed against the pulled local database.
- `pnpm format`: passed.
- `pnpm lint`: passed after resolving two feature errors; repository warning
  baseline remains.
- `pnpm typecheck`: passed, 33 tasks.
- `pnpm --filter=@forge/validators test -- judging audit`: passed, 16 tests.
- `pnpm --filter=@forge/api test -- judging`: passed, 13 tests.
- `pnpm --filter=@forge/db test -- migration`: passed, 65 tests.
- `pnpm analyze:react:changed`: passed, two components and zero failures.
- `pnpm --filter=@forge/blade build`: passed; 58 static pages generated.
- Desktop Command Center, QR dialog, authenticated room assignment, live
  roster, and 390px guest-dialog visual checks: passed.
- Live Discord delivery through T.K in Dev@KnightHacks `#bot-testing`: passed.
  The check covered thread provisioning, member arrival, guest arrival,
  current-QR delivery, rotation, member mentions, and guest revocation.
- Live testing caught Discord's 25-character nonce limit. QR and thread
  messages now use a 22-character base64url nonce, backed by a regression test.
- Live copy check: passed. Member arrivals and organizer actions show the
  linked member profile name, such as `Dylan Vidal`, instead of a Discord
  username.

## Links

- PRs: https://github.com/KnightHacks/forge/pull/535
- Issues: https://github.com/KnightHacks/forge/issues/534
- Discord/thread context: Dev@KnightHacks `#bot-testing`, Sponsor Suite A
