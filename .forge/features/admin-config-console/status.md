# Admin Config Console Status

Current phase: Intake / reverse-prompting

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Why this bundle exists

Three tables hold officer-managed configuration that today can only be changed
by hand-written SQL: `knight_hacks_discord_config` (14 rows),
`knight_hacks_club_team` (8) and `knight_hacks_club_team_role` (18). The data
model, the backfills and the read paths all landed during the
[codebase-maintainability](../codebase-maintainability/status.md) work, with the
UI deferred each time by explicit owner decision. This is that deferred UI.

It matters more than "nice to have" for one reason: club team classification is
the thing that decides who appears on the public Club site and under which team.
Getting it wrong is publicly visible, and the only way to change it right now is
a `psql` session.

## Decision log

- 2026-07-28: **Scope is both config domains in one settings area**, not one or
  the other. Owner's words: "Both tables, one settings area". Two half-features
  in two places was the alternative and was rejected.
- 2026-07-28: **The `auth_roles.event_feedback_excluded` toggle goes on
  `/admin/roles`, not in this console.** Owner reversed an earlier answer after
  the friction was pointed out: an officer manages Discord role linking on
  `/admin/roles`, so putting one role attribute in a different screen splits a
  single mental object across two pages. Mirroring it in both places was
  considered and rejected — two write paths to one column is how a flag drifts.
  This console owns the three config tables; `/admin/roles` owns role attributes.
- 2026-07-28: The toggle needs a home at all because
  `packages/api/src/routers/roles.ts` used to guess the flag by matching a newly
  linked Discord role's _name_ against a hardcoded list. That guess was deleted
  in `f34428f8` — a role being linked has no classification yet, so there was
  nothing honest to derive it from. The column is correct for all 19 live roles
  today and will drift the first time someone links a new staff role.
- 2026-07-28: **Proposed, pending spec review — the console edits rows, it does
  not create or delete them.** `ClubTeamRole.teamId` is `ON DELETE restrict`, so
  Postgres already refuses to orphan a team's roles. But
  `knight_hacks_discord_config` keys are read from code by name
  (`getKnightHacksGuildId()` and friends), so deleting a row there breaks a code
  path with no database error. Keeping the key set a migration concern preserves
  it as a code contract.

## Open questions

- Which permission gates the console? Config editing is a capability-tier
  concern, but the specific permission is not settled.
- Does club team creation belong here eventually, or does adding a team stay a
  migration? The decision above defers it; revisit if officers ask.

## Task list

- [x] Scaffold bundle.
- [x] Owner settles scope and the `event_feedback_excluded` home.
- [x] Ground the spec in repo conventions — five-scout discovery over admin UI
      shape, API/audit conventions, the three domains' read paths, and prior art.
- [x] `spec.md` written and settled with the owner.
- [x] `srd.md` and `test-cases.md` authored, attacked by two agents instructed to
      disprove them, and revised. 3 blockers and 16 lower findings applied.
- [ ] **Human approves artifact bundle before implementation.** ← blocking

## Review record

The authored bundle was attacked before it was believed. Both documents came
back `needs-revision`. The blockers:

1. An audit metadata key, `impactedPastEventCount`, that could never be
   populated — the input schema is `.strict()` and does not declare it. Dropped
   rather than added, because a client-supplied count is a number the log cannot
   vouch for.
2. **Acceptance criterion 11 was unbuildable as I first wrote it.**
   `roles.listLinks` (`packages/api/src/routers/roles.ts:81-85`) takes no input
   and returns every row in `Roles`, so no URL parameter can scope `/admin/roles`
   and a full-page baseline is hostage to whatever the shared dev database holds.
   This is the third surface to hit that wall, after the analytics dashboard and
   the email portal. Replaced with element-scoped captures of the dialog, which
   renders one role addressed by `?role=<id>`.
3. A fixture spec that identified roles by name prefix while believing the e2e
   gateway override replaced the name. The reviser established the override only
   overlays seven hard-coded ids, and resolved it the other way.

Two findings worth keeping visible because they are recurring failure shapes:

- The impact count **over-counted**, including past events already unreadable
  because they carry a different flagged role — the warning would have overstated
  the harm.
- Two cases were **vacuous-safe**: pure negative assertions that pass on an empty
  result. That exact failure already shipped once on this branch, in the
  audience-resolution test.

Eight further defects were found during revision that neither attacker caught,
including a claim about how non-snowflake ids render that was false under the
override, and a documented command naming a script that does not exist.

## Validation / commands

- <!-- command: result -->

## Links

- PRs:
- Issues:
- Discord/thread context:
