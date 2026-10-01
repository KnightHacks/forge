# KHIX Hacker Teams Status

Current phase: PR review

## Decision log

- 2026-09-30: Created worktree `/Users/dvidal1205-mini/Documents/forge-worktrees/khix-hacker-teams` on `codex/khix-hacker-teams` from current `origin/main`, including merged Point Store PR #586.
- Teams live in the KHIX dashboard and unlock after attendance confirmation.
- Hackers can create a named team and request to join another team. The owner can rename it and accept or deny requests.
- The owner controls a together/separate class preference, defaulting to together. Explain the tradeoff between attending with friends and staggering work.
- Preference concerns individual classes, not Bloom/Blight factions. Initial check-in must honor the preference while selecting the least-populated eligible class.

- Teams are hackathon-scoped, with at most four members including the owner and one team per hacker per hackathon.
- Search by hacker name or team name. No invite links. Joining requires owner approval.
- Together: the first arriving member receives the least-populated class; later teammates follow that class without reserving capacity for absent members.
- Separate: prefer classes not already occupied by teammates across all configured ordinary classes, then pick the least-populated eligible class. Spread as much as possible if there are fewer classes than members.
- Members can leave. If the owner leaves, randomly choose a remaining member as owner. Delete the team if nobody remains.
- These teams remain separate from project submissions and judging memberships.
- Add a Blade Teams page showing teams, member names, and actual class assignments/check-in state. View/edit rules and organizer actions are recorded below.
- After scope is settled, continue through issue creation, implementation, PR, attached screenshots, and completed green CodeRabbit review. Use local databases and do not commit screenshots.

## Existing behavior

- Initial check-in assigns each confirmed attendee to the least-populated configured ordinary class, counting checked-in attendees. Allocation is serialized per hackathon.
- Class configuration contains a name, color, Discord role, and ordinary/VIP kind. It does not model faction or schedule equivalence.
- Project memberships already exist for imported submissions and judging. This feature will remain separate.

## Final decisions

- User approved freezing joins/preferences at first check-in, while allowing departure without class reassignment.
- Either READ_HACKERS or EDIT_HACKERS views Blade Teams; only EDIT_HACKERS mutates.
- Owners may remove members. Organizer controls are rename, remove member, and delete team; no extra ownership/preference override or request approval.
- One cancellable pending request at a time; acceptance consumes capacity.
- User approved implementation and the same issue/PR/green CodeRabbit exit condition.

## Open questions

None blocking implementation.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Record approved scope and decisions before implementation.

## Validation / commands

- Inspected the current primary check-in allocator and class schema.
- `pnpm forge:feature` could not run because this new worktree has no installed dependencies yet. Ran the same generator with the existing checkout's tsx executable successfully.
- Implemented the schema, shared API/SDK, KHIX dashboard, Blade Teams page, and check-in integration using a local-only environment.

## Links

- PR: https://github.com/KnightHacks/forge/pull/588
- Issue: https://github.com/KnightHacks/forge/issues/587

## Implementation validation

- Static gate passed: changed React analysis, formatting, lint, and all consumer typechecks.
- Shared suites: API 1,006 tests, DB 159, validators 321, SDK 31. Blade 883 and KHIX 14 tests passed.
- Real browser workflow passed with no page errors: create, settings, approvals/denials, search, requests/cancel, leave, empty-team deletion, locked/frozen states, Blade read/edit controls, and active navigation. Screenshots captured outside the repository at desktop, 390px, and 320px.
- Standard Forge review covered access/API shape, migration/validation/test quality, React/boundaries, and placement. Fixed review findings around legacy bulk check-in and account deletion. Targeted lifecycle regressions passed, the final static gate passed, and reviewers confirmed both fixes.
- Legacy bulk check-in rejects team members and pending applicants, directing organizers to Hackathon Check-in for class allocation. Account deletion requires leaving teams first; the FK prevents concurrent cascades from orphaning teams.

- Blade and KHIX production builds passed.
- Density check passed with 62 teams and 64-character names at 320px. Evidence remains in `/tmp/khix-teams-evidence` for GitHub attachment upload.
- Required final handoff: PR CI green, completed CodeRabbit review with findings resolved, and screenshots attached. No merge/deployment requested.

- KHIX screenshot gallery: https://github.com/KnightHacks/forge/pull/588#issuecomment-5924156988
