# Judging Magic Access Status

Current phase: Implementation complete; PR open

> This file tracks accepted decisions, open questions, task progress, validation, and links for this feature.

## Decision log

- 2026-09-03: Sponsor judges need a QR path that does not require Discord,
  guild membership, or a Blade member profile.
- 2026-09-03: A guest supplies a required display name before Blade loads any
  project data.
- 2026-09-03: Guest judges see a projects-only layout without the normal Blade
  navigation or sidebar.
- 2026-09-03: Guest project access is tied to the room challenge and enforced
  by the server. Browser filters never widen it.
- 2026-09-03: `General` is an intentional room challenge for sponsors who have
  paid for all-project access.
- 2026-09-03: `IS_JUDGE` and `IS_OFFICER` users keep unrestricted challenge
  access and skip the guest name flow.
- 2026-09-03: A qualifying member principal wins when both member and guest
  session state exist. A non-judge member may still use guest access.
- 2026-09-03: Rooms are first-class hackathon entities with one challenge.
  Several rooms may share one challenge.
- 2026-09-03: Rooms are separate from QR credentials because a later scheduler
  will use rooms as project-presentation nodes.
- 2026-09-03: Officers provision rooms before generating QRs and use a judging
  control panel for QR lifecycle and room rosters.
- 2026-09-03: Room QRs remain usable until revoked. Revocation leaves the room
  intact and ends guest sessions created from that QR.
- 2026-09-03: Guest browser sessions last eight hours and may rescan an active
  room QR.
- 2026-09-03: Officers see live room counts, judge names, account types, joined
  times, and recent activity. They may revoke one guest or rotate the room QR.
- 2026-09-03: Authenticated judges and officers may optionally select a room.
  Selection adds them to its roster and initially selects the room challenge,
  but they may change the project filter afterward.
- 2026-09-03: Scanning a room QR while signed in as a judge or officer selects
  the room without creating guest state.
- 2026-09-03: The first generated room QR durably locks the hackathon project
  inventory. Revoking all QRs does not remove the lock.
- 2026-09-03: Normal imports become add-only after lock. Normalized Devpost URL
  is project identity, existing projects are skipped, and only unseen projects
  are inserted.
- 2026-09-03: Locked add-only imports may create new challenges but do not
  alter existing projects, challenges, rooms, QR links, judges, sessions, or
  presence.
- 2026-09-03: Full replacement remains a separate typed-confirmation action.
  It revokes active QR links and guest sessions, preserves exact matching
  challenge identities, leaves rooms and lock state intact, and blocks removal
  of a challenge assigned to an active room.
- 2026-09-03: The retired KH8 system supplied useful activation and cookie
  lessons but will not be restored. The new flow avoids plaintext session
  tokens, room-name-only scope, public judge mutations, and client-only filters.
- 2026-09-03: Four supplied Devpost project exports were inspected without
  copying source PII. KH8 contained 188 submitted projects and 18 challenge
  labels across 452 submitted CSV rows.
- 2026-09-03: Scoring, rubrics, scheduling, presentation assignments, rankings,
  and winners are separate future slices.
- 2026-09-03: The owner approved the spec, SRD, and 21 behavioral test cases.

## Open questions

- None blocking artifact approval.

## Task list

- [x] Review current project-judging artifacts and implementation.
- [x] Inspect the retired room QR and judge-session history.
- [x] Inspect supplied Devpost export volume without retaining source PII.
- [x] Reverse-prompt the owner on room, QR, access, presence, and import rules.
- [x] Create `blade/judging-magic-access` from current `main`.
- [x] Instantiate the four-file feature bundle.
- [x] Draft `spec.md`, `srd.md`, `test-cases.md`, and `status.md`.
- [x] Owner reviews and approves the artifact bundle.
- [x] Create or link the required GitHub issue.
- [x] Generate behavioral tests from the approved test cases.
- [x] Confirm new tests fail for the intended missing behavior where practical.
- [x] Implement database, auth, API, and Blade changes.
- [x] Run targeted checks, browser verification, repository gates, and build.
- [x] Open a PR with the required issue, labels, assignee, test evidence, and
      screenshots.

## Validation and commands

- `git switch -c blade/judging-magic-access`: passed from `main` at `1c1457e0`.
- `pnpm forge:feature judging-magic-access "Judging Magic Access"`: passed and
  created the four-file bundle.
- `pnpm exec prettier --check .forge/features/judging-magic-access/*.md`:
  passed.
- `git diff --check`: passed.
- `pnpm --filter=@forge/db generate`: passed and created migration `0044`.
- `pnpm --filter=@forge/db migrate`: passed against the local development
  database.
- Judging-focused validator, auth, database, API integration, and Blade tests:
  passed.
- `pnpm analyze:react:changed`: passed for all tracked changed React files.
- `pnpm analyze:react --strict` for the new judging components and routes:
  passed with zero failures.
- `pnpm format`: passed across 24 workspace tasks.
- `pnpm lint`: passed across 31 workspace tasks with existing warning-only
  findings.
- `pnpm typecheck`: passed across 33 workspace tasks.
- `pnpm test`: passed across 29 workspace tasks. The final totals include 748
  API tests, 724 Blade tests, 140 database tests, 261 validator tests, and 22
  auth tests; five environment-dependent auth integration tests were skipped.
- `JUDGING_ACCESS_SECRET="$(openssl rand -hex 32)" pnpm --filter=@forge/blade build`:
  passed. A production build without the new secret failed closed as intended.
- Browser verification used a local fixture built from the supplied KH8
  Devpost export: 188 projects and 18 challenge labels. Desktop and mobile
  officer, QR, required-name, guest directory, and project-detail states were
  inspected. Escape did not dismiss the name gate, the signed credential was
  removed from the URL, and the browser logged no warnings or errors.
- The supplied CSV exports, imported PII, and review screenshots are not part of
  the repository. The KH8 fixture remains only in the local development
  database for manual verification.
- Deep Forge review completed two passes across authorization and privacy,
  database transactions and migrations, and frontend quality. The final pass
  found no merge blockers.
- Unslop and Forge deslop review: passed with no em dashes, decorative Unicode,
  filler transitions, or generic conclusion text left in the bundle.

## Links

- Prior project inventory PR: [#527](https://github.com/KnightHacks/forge/pull/527)
- Prior project inventory issue: [#526](https://github.com/KnightHacks/forge/issues/526)
- Implementation issue: [#528](https://github.com/KnightHacks/forge/issues/528)
- Implementation PR: [#529](https://github.com/KnightHacks/forge/pull/529)
