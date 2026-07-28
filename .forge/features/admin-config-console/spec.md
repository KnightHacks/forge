# Admin Config Console Spec

Status: Draft — scope settled with the owner 2026-07-28, awaiting bundle approval

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Three tables decide things members and the public see, and none of them can be
changed without a `psql` session:

- `knight_hacks_club_team_role` decides **who appears on the public Club site and
  under which team**. Getting it wrong is publicly visible.
- `knight_hacks_club_team` decides the team tabs that site renders.
- `knight_hacks_discord_config` holds the guild, channel and role snowflakes the
  bot, the crons and Blade all resolve at runtime.

The data model, the backfills and the read paths landed during the
[codebase-maintainability](../codebase-maintainability/status.md) work. The UI
was deferred each time by explicit owner decision. This is that UI.

It also gives `auth_roles.event_feedback_excluded` a home. That flag used to be
guessed from a newly linked Discord role's _name_; the guess was deleted in
`f34428f8` because a role being linked has no classification yet. The column is
correct for all 19 live roles today and will drift the first time someone links
a new staff role.

## Users / actors

- **Officers** (`IS_OFFICER`) — the only actors. Every surface here is gated on
  it, and nothing in this feature is member-facing.
- Indirect consumers who never see the UI but feel it: the public Club team page,
  Guild profile badges, the T.K. Discord bot, `apps/cron`, the Discord archive,
  and the dev-database backup sanitizer.

## User-visible interface

### `/admin/roles/config` — the console

An officer-only sub-route of `/admin/roles`, reached by a link on the roles
dashboard. It has no sidebar entry, matching `/admin/forms/sections` and
`/admin/events/feedback-template`. A non-officer is redirected to `/admin/roles`.

Two sections on one page.

**Discord configuration.** All fourteen rows, grouped by `kind` (guild, channel,
role). Each row shows its key, label, description, and its production and
development snowflakes; label, description and both snowflakes are editable. Keys
cannot be added or removed here.

Two things the screen must say out loud, because the data does not:

- **Ten of the fourteen keys are read by nothing.** They are visually marked as
  unused, so an officer neither wastes care on an inert row nor assumes the same
  of a live one. The distinction must be structural, not a sentence buried in the
  `description` column, whose text currently reads identically for both.
- **The `guild` row is not like the others.** Changing it re-points the Discord
  archive, role sync, event projection, the bot and both crons at a different
  server. It gets a confirmation that names those consumers. Everything else
  saves without one.

**Club roster classification.** The eighteen classified roles and the eight teams
they resolve into. Per role: its kind (executive / director / team), its rank
within that bucket, the team it belongs to or leads, and the two label overrides
(`rosterLabel`, `calloutLabel`). Teams are shown as context and are **not**
editable here.

A role with no classification row is shown as unclassified and can be given one.
That is what makes `pnpm db:club-roles` unnecessary on a fresh environment.

### Save semantics and honest copy

Saving is explicit — an officer edits, then presses Save. No save-on-toggle, no
optimistic update; both match the house pattern.

Success copy must describe the mechanism, not the intention. A Discord config
change reaches other Blade instances and `apps/cron` within about sixty seconds,
and does **not** reach the T.K. bot until it restarts, because the bot resolves
the guild id once at module scope. The console must not say "changes are live".

### `/admin/roles` — the feedback toggle

`event_feedback_excluded` gets a switch in the existing role detail dialog,
beside the team email audience toggle it should look and behave exactly like.

Turning it **on** has a consequence the officer must be told before they confirm:
past events attached to that role stop being readable for feedback analytics and
CSV export, because eligibility is re-checked against the live role set rather
than the set that applied when the feedback was collected. The confirmation names
how many past events that affects.

## Scope

### In scope

- Editing the fourteen `knight_hacks_discord_config` rows: `label`,
  `description`, `productionId`, `developmentId`.
- Marking the ten Discord keys nothing reads, and a distinct confirmation for the
  `guild` row.
- Classifying roles into existing teams: `kind`, `rank`, `teamId`, `rosterLabel`,
  `calloutLabel`, including giving an unclassified role its first classification.
- An `event_feedback_excluded` switch in the role detail dialog on `/admin/roles`,
  with a confirmation stating the effect on past events.
- An **element-scoped** visual baseline of the role detail dialog, captured
  before the feedback toggle is added to it.

  Not a full-page `/admin/roles` baseline — that is impossible, and the reason
  matters. `roles.listLinks` takes no input and returns every row in the `Roles`
  table, so no URL parameter can scope the page and the capture would be hostage
  to whatever roles the shared dev database happens to hold. This is the same
  failure that keeps the analytics dashboard and the email portal unbaselined.

  The dialog is different: it renders exactly one role, addressed by
  `?role=<id>`, so a fixture role produces a deterministic tree. That is also
  precisely where the risky change lands. It requires one addition to
  `visual-harness.ts` — an element-scoped capture alongside the existing
  full-page `expectVisualBaseline` — which is in scope for this feature.

### Out of scope

- **Creating or deleting anything.** Not Discord config rows, whose keys are a
  code contract read by name; not teams, where deleting the `executive` or
  `directors` row succeeds at the database level and silently empties those
  buckets from the public site; not classifications, whose removal is silent
  across four consumers and shrinks the dev-backup dataset.
- **Editing teams** — renaming, re-heading, reordering. Reordering in particular
  is not a small addition: the `displayOrder` unique index is non-deferrable, so
  two rows cannot exchange values in one statement, and order silently decides
  which badge a multi-team member displays.
- A new permission key. Permissions are positional bits on `auth_roles`; adding
  one is a migration-shaped change.
- Teaching `getDependencyCounts` about `ClubTeamRole` so unlinking a
  club-classified role warns first. Recorded as a known gap below.
- Changing _when_ `event_feedback_excluded` is evaluated so that enabling it stops
  hiding already-collected feedback. That is a behaviour change in
  `utils/events/feedback.ts`, and it deserves its own decision.
- A generic key/value config editor unifying the two schemas. "One settings area"
  was a UI grouping, not a data-model instruction.
- An `/admin` landing page; a sidebar entry for the console.

## Vocabulary

- **Classification** — a `knight_hacks_club_team_role` row. Says how one Blade
  role participates in the public roster. Keyed by `auth_roles.id`, never by name.
- **Kind** — `executive`, `director` or `team`. Decides which bucket a role's
  holders land in.
- **Lead** — an executive or director role that also names a team. Appears in both
  its own tier and at the top of that team. There is no `is_lead` column; it is
  exactly `kind <> 'team' AND team_id IS NOT NULL`.
- **Inert key** — a `knight_hacks_discord_config` row no code reads. Ten of the
  fourteen.
- **Live key** — one that is read. Four: the guild and three others.

## Acceptance criteria

1. A non-officer visiting `/admin/roles/config` is redirected to `/admin/roles`.
   The check happens server-side, before anything renders.
2. An officer can change a Discord snowflake and see the new value after a reload.
3. The ten inert keys are distinguishable from the four live ones without reading
   the description text.
4. Changing the `guild` row requires a confirmation that names the archive, role
   sync, event projection, the bot and the crons.
5. Success copy after a Discord change states the ~60s convergence window and the
   bot restart. It does not claim the change is already live everywhere.
6. An officer can classify a previously unclassified role, and
   `getVisiblePublicClubRoster()` reflects it without a deploy or a script run.
7. An officer can change a role's kind, rank, team and label overrides, and the
   public roster and the Guild badge both follow.
8. No affordance anywhere creates or deletes a row in any of the three tables.
9. Toggling `event_feedback_excluded` on warns, with a count, that past events
   attached to that role become unreadable for analytics and export.
10. Every mutation writes an audit event naming the actor, the row and the change.
11. The role-detail-dialog baselines, recorded before the toggle exists, still
    pass after it is added. The toggle renders for every role, so the captures
    are scoped to the regions the new section sits **below** — the dialog header
    and the email-audience region — and are paired with an assertion on section
    order, because an element-scoped screenshot cannot by itself tell a region
    that stayed put from one that was merely translated.

    The console link is added in a separate, earlier commit, so it sits inside
    the recorded baseline rather than invalidating it. Order is: link, then
    baseline, then toggle.

## Known gaps this feature does not close

Recorded so they are not mistaken for oversights:

- **Unlinking a role at `/admin/roles` can silently empty a team.**
  `getDependencyCounts` checks events, form responses, form sections, issues and
  issue visibility — not `ClubTeamRole` — and `club_team_role.role_id` cascades.
  The console mitigates by showing classification, so an officer can see it before
  unlinking, but the unlink path itself is unchanged.
- **Enabling the feedback flag hides past feedback.** Warned about, not fixed.
- **`pnpm db:club-roles` still parses the seed literal out of
  `0026_cute_sersi.sql`.** The console supersedes the script's purpose; retiring
  it and its regex coupling is separate cleanup.

## Open questions

None blocking. Settled with the owner on 2026-07-28: placement and gate,
classification-only scope, edit-only with inert keys marked, and the feedback
toggle living on `/admin/roles`.
