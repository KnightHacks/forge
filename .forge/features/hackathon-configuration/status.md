# Hackathon Configuration Status

Current phase: Implemented — platform tier and Blade UI built and verified. Column drops deferred to cutover. Remaining behavioural tests, inline template authoring, and the status-email preview are open.

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Context

First hackathon-domain bundle. Opened after
`specs/hackathon_surface_reverse_spec.md` established that the hackathon surface
is a whole domain Reforge fenced out, not a set of gaps.

Branch: `reforge/hackathon-config`.

## Decision log

- 2026-07-29: The hacker application moves into each hackathon app. Blade keeps
  the data and the rules; the hackathon app owns the hacker-facing experience,
  including intake. Recorded in the reverse spec's "Settled" section.
  Consequences land mostly in the SDK work, not here.
- 2026-07-29: Configuration is the first area of the hackathon surface. Five of
  the six identified areas take a `hackathonId` and four need "current," so the
  resolution rule and the config store are prerequisites.
- 2026-07-29: **No single "current hackathon," and no pointer either.** Hackathon
  state is derived per caller from the already-validated date window. The phases
  that matter are _applications open_, _during the event_, and _after the
  event_. Because the hacker-facing experience moves to the dedicated hackathon
  site, Blade admin never needs a default at all — admin surfaces list every
  hackathon in a chronological dropdown and the officer picks. This removes both
  Legacy's nearest-future-start rule and the officer-set pointer considered
  earlier; there is no stored notion of "current" anywhere.
- 2026-07-29: **Hackathon status emails are authored in the Blade email
  portal.** The hardcoded Listmonk id table in
  `packages/email/src/hackathons/templates.ts` is deleted rather than moved into
  rows. Blade renders and sends transactionally through the existing raw-content
  fallback. Officers never touch Listmonk to change hackathon copy, and adding a
  hackathon becomes pure data.
- 2026-07-29: **One template per transition, per hackathon — not a shared
  template with interpolation.** Hackathon emails are themed, so BloomKnights
  and Knight Hacks VIII need visually different mail for the same transition.
  Each hackathon points at a stored `EmailTemplate` row for each of its
  transitions. This supersedes the interpolation-only model considered earlier;
  `hackathon.*` personalization fields remain useful inside a template but are
  not the mechanism for per-hackathon variation.
- 2026-07-29: **Subject is configured per hackathon per transition**, alongside
  the template pointer, rather than stored on the template or its revision.
  Reason: subjects are expected to churn more often than bodies. This also
  resolves the open gap that `EmailTemplate` has no subject column.
- 2026-07-29: **Six statuses send mail:** pending, accepted, waitlisted,
  confirmed, denied, withdrawn. `checkedin` sends nothing. (Written during
  intake as "transitions" with a `capacity` kind; the later no-rename decision
  collapsed that vocabulary into the status names themselves.)
- 2026-07-29: **Blacklist is not an email and not a status.** Historically
  "blacklisted" meant a hard reject. After real-world friction, blacklisted
  applicants are now simply left to wait and then receive the capacity email.
  What remains wanted is a **soft-blacklist flag** — it prevents accidental
  acceptance, sends nothing, and leaves capacity as the only available action.
  **Out of scope for this bundle**; it belongs to hacker management. Recorded
  here so the status enum is not extended with a `blacklisted` value by mistake.
- 2026-07-29: **`Capacity` is the only rejection path.** It means "rejected
  because we filled up," and it is what a soft-blacklisted applicant eventually
  receives. There is no second, distinct denial reason.
- 2026-07-29: **No enum rename. `denied` is the word everywhere except inside
  the email.** Admin surfaces say Denied; only the email's own subject and body
  carry the capacity framing. "Capacity" therefore disappears as a system
  concept — there is no separate email-kind vocabulary, and
  `HACKATHON_EMAIL_KINDS` goes away with the rest of
  `packages/email/src/hackathons/templates.ts`. The transition set collapses to
  "the status that was reached."
- 2026-07-29: **A transition with no configured template is blocked.** The
  status change does not happen. Rejected alternatives: allowing the change and
  silently skipping the mail (an officer accepts 200 applicants and none are
  told), and allowing it then failing at send (leaves the status already
  changed). Blocking is the only option that cannot half-succeed.
- 2026-07-29: **Templates are soft-required at creation, loudly surfaced, and
  enforced elsewhere.** A hackathon can be created without its templates
  attached, but it renders in an unmistakable unconfigured state — heavy red
  treatment plus a banner to the effect of "no status changes allowed" — until
  every required template is set. The _enforcement_ check stays on the hacker
  management page; this screen's job is to make the gap impossible to miss
  before anyone reaches that page.
- 2026-07-29: **Template authoring is reused inline on this screen.** An officer
  does not leave for the email portal and come back. The portal's existing
  template-editing surface is reused here so a hackathon can be configured in
  one place, and the template and its subject are edited together rather than
  living on separate screens. This closes the subject/body drift risk raised
  during intake.
- 2026-07-29: **Mail fires on transition.** The separate manual path stays
  available through the existing email portal, which already resolves audiences
  by hackathon and status, but status changes themselves send.
- 2026-07-29: **`applicationBackgroundEnabled` and `applicationBackgroundKey`
  are dead.** They existed to style the Blade-hosted application. The
  application is moving to the standalone hackathon site, which owns its own
  styling. Both columns and the dropped `HACKATHONS.APPLICATION_BACKGROUND_KEYS`
  const are obsolete; nothing needs to replace them.

- 2026-07-29: **Product surface.** `IS_OFFICER` only — no read-only tier for
  `READ_HACK_DATA` holders. Top-level `/admin/hackathon` route with its own
  sidebar entry, unlike `/admin/roles/config`. Hackathons are listed newest
  first by `displayName` ("Knight Hacks IX"); `name` remains the route slug
  (`knight-hacks-ix`) and is not the label. No archive cutoff on the list.
- 2026-07-29: **Deletion is allowed only while a hackathon has zero
  applications.** The first application makes it undeletable. An earlier
  "deletable until first check-in" rule was rejected: applications cascade, so
  that window allowed silently destroying hundreds of pending applications.
- 2026-07-29: **Hackathon templates live in the shared email-template store.**
  They remain visible and usable from the email portal, deliberately — if an
  odd one-off send is needed, an officer can reach the same template from the
  portal rather than being locked into the automatic path.
- 2026-07-29: **The four obsolete `Hackathon` columns are retired**:
  `applicationBackgroundEnabled`, `applicationBackgroundKey`,
  `emailTemplateEnabled`, `emailTemplateKey`
  (`packages/db/src/schemas/knight-hacks.ts:93-96`). Originally agreed as "in
  this bundle"; **superseded later the same day** by the additive-only decision
  below, once it was established that the database is shared with production
  Blade. They are annotated as retired in the schema and dropped at cutover.

- 2026-07-29: **Spec review answers.** Hackathon templates get a "hack" badge in
  the email portal's template list. Status-email previews render against an
  example applicant, and the sample must be hacker-shaped rather than
  member-shaped — name inference and available fields differ. New hackathons
  start with blank templates rather than duplicating the previous hackathon's,
  so a hackathon never reads as ready before it truly is.
- 2026-07-29: **Route name is no longer a public link.** Hackathon sites will not
  link to `blade.knighthacks.org/hacker/application/<name>` — the application
  form lives on the hackathon site, and the SDK is what connects it. The route
  name remains a stable identifier (and the likely SDK key) but editing it no
  longer breaks links in the wild.
- 2026-07-29: **Per-hackathon hacker classes are in scope.** Every hackathon may
  define its own set of classes. The purpose is logistical — roughly a thousand
  people cannot eat at once, so they are split into buckets and the split is
  themed to make it enjoyable. Each class has a hackathon-specific name and an
  associated Discord role, used to ping the group and grant channel access. The
  count is arbitrary: a small event may want three. This replaces the six
  hardcoded theme-specific names in
  `packages/db/src/schemas/knight-hacks.ts:595-608` and the unused two-value
  `HACKER_TEAMS` constant. Detail still being reverse-prompted.
- 2026-07-29: **Classes are one flat list of N per hackathon.** No grouping
  level above them. `HACKER_TEAMS` is dropped rather than revived.
- 2026-07-29: **VIP is orthogonal to class, not a member of the list.** Legacy
  put `VIP` in the same union as the six classes
  (`SPECIAL_HACKER_CLASSES`, `HACKER_CLASSES_ALL`), so a hacker was VIP _or_
  classed. The new behavior is both: a hacker holds a normal class and may
  additionally be VIP. VIP is still configured per hackathon — it needs its own
  name, Discord role, and color — it simply is not one of the N.
- 2026-07-29: **Each class carries an explicitly configured color**, not one
  inferred from its Discord role. The color may drive hacker-facing surfaces
  such as the dashboard, and must be able to change without touching Discord.
  Precedent: `Event.tagColor` is a stored `varchar(7)`, not derived.
- 2026-07-29: **Per-class Discord roles are linked, not created.** An officer
  makes the role in Discord and links it here, matching how `auth_roles` and
  `discord_config` already work. Blade does not mutate the server's role list.
- 2026-07-29: **VIP is a bypass, not a label.** A VIP ignores class gating
  entirely: when class A is called, a VIP assigned to class B may still go. This
  settles the "is VIP one instance of a general overlay-role concept" challenge
  — it is not. Its semantics are "ignore class bounds," which no mentor or
  volunteer concept would share, so it stays a single configured entry rather
  than a generic stacking flag.
- 2026-07-29: **Classes are optional.** A hackathon with no classes is valid and
  is not flagged unconfigured. Only missing status mail triggers that state.
- 2026-07-29: **Class assignment is not configurable.** On check-in a hacker is
  assigned to whichever class currently has the fewest people. There is no
  capacity, target size, weighting, or manual assignment to configure. The
  config screen does show the current headcount per class.
- 2026-07-29: **Blade applies the Discord role at check-in — deferred.** Linking
  a role here therefore has no runtime effect within this bundle. The screen must
  say so plainly rather than implying the link is live, following the honest-copy
  precedent set by the admin config console. Both the headcount display and the
  role application depend on hackathon check-in, which is a later area.

- 2026-07-29: **Route name is freely editable.** The hackathon site owns its own
  application path and that path may change, so nothing in Blade should treat the
  route name as immutable.
- 2026-07-29: **A hackathon carries an application link.** Newly surfaced: Blade
  should show a "hackathon is open" banner pointing at the hackathon site's
  application page. The link is configured, not derived from the route name,
  precisely because the site owns its path. Banner scope still being
  reverse-prompted — it would be the first non-officer-facing surface in this
  bundle.
- 2026-07-29: **The application link is a field in this bundle; the banner is
  not.** Actors stay officer-only. The link is optional and blocks nothing. The
  banner, when built, lives on the member dashboard as a member-to-hacker
  conversion prompt, follows the application window automatically, and renders
  once per open hackathon — several at once if windows overlap. No stored
  "current hackathon" is needed for it, which is why it can wait.
- 2026-07-29: **A class cannot be deleted once hackers are assigned to it.**
  Same shape as the hackathon deletion rule.
- 2026-07-29: **VIP is opt-in per hackathon and is its own type.** A hackathon
  may configure it or not. Its name varies by hackathon but its behavior never
  does, which is the argument for modelling it as a distinct kind of hacker role
  rather than a flag on an ordinary class.
- 2026-07-29: **Classes may share a Discord role or a color.** No uniqueness
  constraint on either. This alone rules out reusing the `Roles` table, whose
  `discordRoleId` is `unique` (`packages/db/src/schemas/auth.ts:40`).
- 2026-07-29: **Hackathon class roles are not `Roles` rows and must never appear
  in `/admin/roles`.** A class role grants Discord channel access; it is not a
  Blade permission role. Nothing in this bundle reads, writes, or references the
  `Roles` table. The snowflake is stored directly on the class. Reusing the
  read-only `RoleDiscordGateway` for a by-name role picker remains on the table
  as a UX convenience — it touches no `Roles` rows — but
  `filterDiscordRolesForLinking` and `assertUniqueDiscordRole` must not be
  reused, since both assume link uniqueness that classes deliberately do not
  have.
- 2026-07-29: **The class Discord role is chosen with a searchable picker, plus
  an "Other" option to paste a snowflake.** Both paths store the same value. The
  picker must be genuinely searchable, not a plain dropdown — use
  `ResponsiveComboBox` (`packages/ui/src/responsive-combo-box.tsx`), which
  already backs the members and events admin surfaces and does match scoring and
  acronym matching. Paste stays permanently available rather than appearing only
  on gateway failure, because `getGuildRoles()` can be unavailable and a
  freshly-created Discord role can lag it.
- 2026-07-29: **Owner pre-approved the schema migrations** for this bundle. The
  SRD still proposes them for review before `pnpm db:generate` runs; approval
  covers the intent, not an unreviewed diff.

- 2026-07-29: **No backfill of legacy class assignments.** Existing
  `HackerAttendee.class` values are string literals from a retired theme and are
  abandoned rather than mapped into class rows. Existing attendees keep a null
  class. This also makes the `class = 'VIP'` ambiguity moot — it was the
  riskiest transform in the bundle and it no longer happens.
- 2026-07-29: **All six status emails are required for a hackathon to count as
  configured.** No per-status optionality; a partially configured hackathon is
  unconfigured. Chosen for predictability over flexibility.
- 2026-07-29: **The schema change ships additive-only; the code deletions ship
  now.** The dividing line is shared state versus branch-local state, not schema
  versus code. The database is shared across mixed-version deploys — that is why
  `Event.legacy` exists — so a dropped column breaks production Blade whichever
  branch runs the migration. Source is per-branch, so deleting
  `packages/email/src/hackathons/templates.ts` and the class constants is safe
  here; nothing outside re-exports imports them in the current tree. Only the
  five column drops defer to cutover, and they are tracked in the SRD rather than
  abandoned. A later `main` → `reforge/main` merge will conflict on the deleted
  modules; resolve toward the deletion and record it here.

- 2026-07-29: **Status mail points at an `EmailTemplate`, not a pinned
  revision.** A send renders the template's latest revision, so editing a
  template changes what future applicants receive and leaves sent mail alone.
  Pinning was rejected for making edits silently inert until re-pinned.
- 2026-07-29: **A referenced template cannot be deleted.** The FK is `restrict`;
  an officer edits the template or repoints the hackathon at a replacement.
  Extending the same refusal to _archiving_ is an open reading of "only
  edit/replace" — `archivedAt` is a soft delete no FK can catch.
- 2026-07-29: **The personalization catalog gains four hackathon fields:**
  `confirmationDeadline`, `startDate`, `endDate`, `applicationUrl`. The deadline
  is the reason: the catalog has no dates at all today, so an acceptance email
  cannot state when its recipient must confirm. These are timestamps, and every
  existing field is a plain string/number/array, so formatting is a decision the
  catalog has not previously had to make.
- 2026-07-29: **`team.roleNames` stays; hackathon templates simply must not be
  offered it.** The request to delete it rested on reading it as hacker teams; it
  is a club field feeding club campaigns. Hack roles and club roles are to be
  kept strictly distinct, which points at scoping the personalization catalog per
  template audience rather than removing a club field.
- 2026-07-29: **`EmailTemplate` gains a declared `domain` (`club` | `hackathon`,
  default `club`).** It does two jobs at once: the portal list badge that spec
  AC-009 requires, and scoping `PERSONALIZATION_FIELDS` so a hackathon template
  is never offered `member.*` or `team.*` fields. Declared rather than derived
  from "is any hackathon pointing at it," because a derived mark is empty at
  authoring time — precisely when the field list and the badge matter. Named
  `domain` rather than `audience` because the email portal already uses
  "audience" for recipient targeting. Existing templates backfill to `club` via
  the default; `kind` (`code` | `visual`) is untouched and orthogonal.

- 2026-07-29: **Two proposed tests were cut rather than weakened.** "Reforge
  never reads the retained legacy columns" is an absence no runtime test can
  prove — a grep would look like proof while catching only anticipated spellings,
  which is worse than nothing given the cutover drops depend on it. Code review
  covers it. Class headcount is deferred to the check-in bundle, where it can
  assert something other than zero.
- 2026-07-29: **Date rules are tested once, at the pure-function layer.** The
  four ordering rules are asymmetric — two strict, two permitting equality
  (`packages/validators/src/hackathons.ts:118-152`) — which is the kind of thing
  a later tidy-up flattens silently. Four assertions pin it; the API test shrinks
  to proving the procedure calls the validator.
- 2026-07-29: **E2E needs no new fixture.** `/api/e2e/signin?userId=…` sets a
  cookie for any seeded user and permissions follow that user's roles; six
  existing specs seed an `IS_OFFICER` role and sign in as its holder
  (`apps/blade/src/tests/e2e/role-management.spec.ts:181-249,298`).
  `permissionBitstring` is duplicated across those six specs — follow the
  pattern; consolidating it is unrelated cleanup.

- 2026-07-30: **Subject lines interpolate.** They did not before — the provider
  hands `subject` to Listmonk verbatim, and in raw-content mode its template
  only knows about the body, so `{{...}}` would have reached an inbox as literal
  braces. `renderSubject` and `assertSubjectFieldsAllowed` now live in
  `@forge/email/templates`, scoped by the same domain rule as the body, and
  `setStatusEmail` rejects an unknown or club-only field at save.
- 2026-07-30: **VIP is a toggle on the class form**, not a mode button beneath
  it, and it disables itself once a VIP exists.
- 2026-07-30: **The config screen is deliberately verbose.** An officer opens it
  roughly once a year, so it re-teaches rather than assumes: a field guide, and
  per status what fires it, a realistic example subject, a one-click "use this",
  and why that subject is shaped that way.
- 2026-07-30: **Route name is cut as an officer-facing field.** Nothing links to
  it and no Reforge code reads it. The column is `NOT NULL UNIQUE` and
  production Blade still routes on it, so it is derived from the display name
  (`deriveHackathonRouteName`, with a numeric suffix on collision) and drops at
  cutover with the other retired columns. The owner accepted that the cutover
  migration is manual regardless.
- 2026-07-30: **Bug found by the owner: `EmailTemplate.domain` had no UI.** The
  column and the filter shipped without any way to set it, so every template
  stayed `club` and the hackathon picker was permanently empty. Fixed with a
  "Used for" picker in the template editor and a Hackathon badge in the portal
  list (spec AC-009).

- 2026-07-30: **Bug: saving a template silently reset its domain to club.**
  `onSaveTemplate` in `email-portal-admin.tsx` rebuilds the mutation payload
  field by field and dropped `domain`; the schema's `.default("club")` then put
  it back, so the officer got a success toast and no change. Fixed by passing
  it — and, durably, by **removing the default and making `domain` required**,
  which turns the whole bug class into a compile error at every call site.
  Pinned by `packages/validators/src/tests/email.test.ts`.
- 2026-07-30: **Every template is badged with its domain, not just hackathon
  ones**, plus an All / Club / Hackathon filter with counts. Badging only
  hackathon meant a portal containing none showed no distinction at all, which
  reads as the feature being absent. Pinned by
  `apps/blade/src/tests/admin/email-portal-workspace.test.tsx`.

## Findings that shape scope

- **The hardcoded config is one file, not a sprawl.**
  `packages/email/src/hackathons/templates.ts` holds the preset-key union,
  twelve numeric Listmonk template ids, and a compile-time default. Adding a
  hackathon is currently a code change plus a deploy. Everything else the sweep
  found (`DEFAULT_TEMPLATE_SAMPLE` at
  `packages/api/src/utils/email/templates.ts:20-32`, the Club site's hackathon
  page and asset map) is either preview data or genuinely per-site content.
- **The transport already supports template-free transactional sends.**
  `sendTransactional` uses `input.templateId` when present, and otherwise falls
  back to `ensureRawContentTemplate` with `{ body: rawContentHtml(input) }`
  (`packages/email/src/provider.ts:810-828`). Blade-rendered HTML can be sent
  transactionally today. The Listmonk id table may be removable rather than
  merely movable.
- **Email kinds are transitions, not statuses.** Six kinds against seven
  statuses, non-corresponding: `Apply` and `Capacity` are not statuses;
  `pending`, `denied`, `withdrawn`, `checkedin` have no template; `Blacklist`
  names a status the enum does not contain.
  (`packages/email/src/hackathons/templates.ts:1-8`,
  `packages/consts/src/forms/index.ts:342`.)
- **"Current hackathon" is three different questions.** Legacy's single
  closest-future rule serves "which is taking applications," "which is running
  now," and "which do admin surfaces default to" — and yields nothing for the
  second the moment the event starts.
- Validation is already shared and current in
  `packages/validators/src/hackathons.ts`; the `Hackathon` table is already the
  current shape.

## Open questions

All blocking questions are answered. Remaining for the SRD rather than the spec:

- [ ] Does dropping `emailTemplateEnabled` / `applicationBackgroundEnabled` /
      `applicationBackgroundKey` / `emailTemplateKey` happen in this bundle or as
      a follow-up? Production rows hold values in all four.
- [ ] Bulk transitions: does one confirm step cover a batch, and what does it
      name — count, template, subject?
- [ ] Do multiple hackathons ever overlap? Affects only the admin dropdown's
      ordering and labelling, not correctness.

### Shape implied by the decisions

Six statuses each need a template pointer and a subject, per hackathon.
`Hackathon.emailTemplateKey` is a single column and cannot hold six pointers, so
this is a new join table rather than a column change — roughly
`(hackathonId, status) → (templateId, subject)`.

Four existing `Hackathon` columns become obsolete:
`emailTemplateEnabled`, `emailTemplateKey`, `applicationBackgroundEnabled`,
`applicationBackgroundKey`. Production rows hold values in all of them.

The whole of `packages/email/src/hackathons/templates.ts` goes away —
`HACKATHON_EMAIL_KINDS`, the preset options, the id table, and the compile-time
default. `getHackathonEmailTemplateId`,
`createHackathonEmailTemplateKeySchema`, and
`createHackathonApplicationBackgroundKeySchema` lose their callers.

Status-to-mail mapping:

| Status reached   | Sends | Note                                |
| ---------------- | ----- | ----------------------------------- |
| `pending`        | yes   | on application submit               |
| `accepted`       | yes   |                                     |
| `waitlisted`     | yes   |                                     |
| `confirmed`      | yes   |                                     |
| `denied`         | yes   | body carries the capacity framing   |
| `withdrawn`      | yes   |                                     |
| `checkedin`      | no    |                                     |
| _soft blacklist_ | no    | a flag, not a status — out of scope |

Non-blocking:

- [ ] Where should the dropped `HACKATHONS.APPLICATION_BACKGROUND_KEYS` list
      live now?
- [ ] Do multiple hackathons ever overlap?

## Task list

- [x] Open bundle and branch.
- [x] Settle the blocking open questions.
- [x] Complete reverse-prompting for `spec.md` — 19 acceptance criteria, two
      non-blocking open questions remain. **Awaiting owner approval.**
- [x] Complete reverse-prompting for `srd.md` — no open questions remain.
      **Awaiting owner approval.**
- [ ] Complete reverse-prompting for `test-cases.md`.
- [ ] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md` — 20 cases, 15 negative, no
      open questions.
- [x] Human approved the artifact bundle for implementation (2026-07-29).
- [x] Implement the platform tier: schema, migration, validators, email catalog,
      `hackathon` router, audit registration.
- [x] Implement the Blade UI, verified in a browser against real dev data.
- [x] Fix the disposable-database harness and write the destructive-guard
      integration tests against real SQL.
- [x] Address the first `forge-review` round (30 findings; all five blocking).
- [x] Address the second `forge-review` round (7 reviewers), including a
      production-data defect in the `0027` backfill that no static check could
      have found.
- [x] Address the third `forge-review` round (2 reviewers), including two
      procedures the UI never called and a compiler hole that let a template
      pass save and fail at send.
- [x] Address the fourth round, which caught a regression introduced by round 3
      and a role picker that could hide a stored value.
- [x] Rounds 5–8: send-path personalization parity, copy that promised
      unenforced behaviour, and a failing `@forge/db` test that filtered runs
      had been hiding. Round 8 found one comment.
- [ ] Write `hackathon-config.test.tsx` and the e2e spec the bundle promised.
- [ ] Cover `setStatusEmail`, `clearStatusEmail`, and the class mutations.
- [ ] Fix `analyze:react:changed` so `verify:precommit` can pass (pre-existing,
      not this branch).
- [ ] Write the remaining behavioural test cases.
- [ ] Embed the template editor for inline authoring.
- [ ] Wire the status-email preview (AC-010).

## Validation / commands

- `pnpm install` — clean (fresh worktree).
- `pnpm --filter=@forge/db typecheck` — passes.
- `pnpm db:generate` — produced `packages/db/drizzle/0027_worried_monster_badoon.sql`.
  **Reviewed and additive: no `DROP` statements.** Creates
  `knight_hacks_hackathon_class` and `knight_hacks_hackathon_status_email`,
  adds `email_template.domain` (default `'club'`, backfills existing rows),
  `knight_hacks_hackathon.application_url`,
  `knight_hacks_hacker_attendee.class_id` and `.is_vip`, plus the partial unique
  index enforcing one VIP per hackathon and the `restrict` FK on `template_id`.
- `pnpm db:migrate` — applied to the local dev database
  (`postgresql://…@localhost:5432/local`), owner-approved. Migrations `0029`
  (email-template domain backfill) and `0030` (the `classId` index) applied in
  round 2, both verified against real rows rather than assumed.
- `pnpm format` — 19/19 clean.
- `pnpm lint` — zero errors. Pre-existing `max-lines` warnings only.
- `pnpm typecheck` — 27/27 clean.
- `pnpm --filter=@forge/validators test` — 173 passed, including 25 new.
- `pnpm --filter=@forge/email test` — 56 passed, including 15 new.
- `pnpm --filter=@forge/api test` — initially 421 passed, 28 skipped, **3
  failed**; now **459 passed, 0 failed**. The three failures
  (`integration/platform-config`, `integration/forms-respondent-access`,
  `integration/role-feedback-exclusion`) were pre-existing — reproduced on the
  clean baseline by stashing this branch — and were **root-caused and fixed
  here** rather than left alone, because this bundle needed the same harness.

  `packages/db/src/env.ts` skipped validation on `NODE_ENV === "test"`, but that
  branch was unreachable: `pnpm test` runs through `dotenv -e ../../.env`, which
  sets `NODE_ENV="development"`. So `createEnv` ran for real and snapshotted
  `process.env` at import — after which `provisionDisposableDatabase`
  reassigning `DATABASE_URL` had no effect and every "disposable" test wrote to
  the shared dev database, colliding on fixture rows
  `10000000-…-0001`/`-0002`. Adding `!!process.env.VITEST` to `skipValidation`
  fixes it. Worth flagging beyond this bundle: **every integration test in the
  repo was silently running against the shared dev database.**

- `pnpm --filter=@forge/blade test` — 552 passed.
- **Browser verification** against the local dev database, signed in as an
  officer. `/admin/hackathon` listed four real hackathons newest-first, each
  flagged unconfigured at 0/6. The detail screen rendered the red banner, all
  five dates in UTC, six status-mail rows, and the classes section. Exercised
  the write path directly: creating a class succeeded; a second VIP was refused
  with `CONFLICT`; a pasted role _mention_ and a three-digit hex were both
  rejected by validation; `checkedin` was refused as a mail status. Test rows
  were deleted afterwards — `knight_hacks_hackathon_class` is back to 0.
- **One real defect found and fixed by that verification:** `Badge` renders a
  `<div>`, and `ClassRow` had it inside a `<p>`, which is a hydration error.
  Caught only because the page was actually loaded.

## Review round 1 — fixes applied

Six reviewers, thirty findings, five blocking. All five and most should-fixes
are closed. The load-bearing ones:

- **Mixed-deploy column reads.** Every hackathon read now goes through an
  explicit `HACKATHON_COLUMNS` allowlist rather than `select()`, so the four
  retired columns are provably absent from Reforge read paths and their drop at
  cutover cannot break this router.
- **`update` no longer writes `name`.** Route name is derived on create only.
  Production Blade routes on that column; rewriting it under a live deploy would
  404 an in-flight hackathon. `allocateRouteName` suffixes on collision instead
  of failing, and the unique constraint is mapped through `asConflict` so a
  concurrent create surfaces as `CONFLICT`, never a raw `23505`.
- **Destructive guards were racy.** `remove` and `removeClass` counted
  dependants outside the transaction, so a check-in landing between the count
  and the delete would be lost. Both now count inside `db.transaction` with
  `.for("update")`.
- **Template bindings were unguarded.** A template bound to a status could be
  archived, or have its domain flipped out from under the binding, silently
  breaking applicant mail. `archiveTemplate` and `saveTemplateDraft` now refuse,
  naming the bindings via `describeBindings()`.
- **`domain` defaulted rather than being required.** That default is what made
  the user-reported "change to hackathon, save, it stays club" bug possible: the
  portal rebuilt the payload without `domain` and the schema quietly restored
  `"club"`. Removing `.default("club")` turns that omission into a compile
  error, and the three call sites that were dropping it (`previewTemplate`,
  `sendTest`, and the campaign send path) now pass it through.
- **`@forge/email/fields`.** The router was pulling `typescript` into its
  dependency graph through the email package's main entrypoint. The field
  catalog and renderers moved to a leaf module with its own subpath export.

Two verification checks, run by temporarily reintroducing each regression to
confirm the new tests actually catch it, then reverting: moving the officer
guard after the read in `get` (test failed as it should), and pointing
`removeClass`'s guard at the wrong column (test failed as it should). A guard
test that passes against a broken guard is worth nothing, and the only way to
know is to break it.

## Review round 2 — fixes applied

Seven scope-derived reviewers. The static gate ran first and was green
(`format`, `lint`, `typecheck`); `analyze:react:changed` reports two parse
failures in `trpc/react.tsx` files this branch does not touch, and both
reproduce on the `forge-reforge-main` baseline.

### The one that would have broken production data

`0027` added `email_template.domain` with `DEFAULT 'club'` and no backfill.
Before this branch the personalization catalog was **flat** — verified against
`git show reforge/main:packages/email/src/templates.ts`, which lists
`hacker.status`, `hackathon.displayName`, and `hackathon.name` — so those fields
were legal in _any_ template. Scoping the catalog made them illegal in a club
template, and the migration had just stamped every existing template `club`.

Any pre-existing template using one of those three becomes unpreviewable,
unsavable, and unsendable at once: `previewTemplate`, `sendTest`,
`saveTemplateDraft`, and the campaign send path all reach
`assertFieldsAllowedForDomain`. A campaign that sent last week would fail, and
the error names a _field_, never `domain`, so there is no way to self-diagnose
it. Two reviewers found this independently; neither `tsc` nor a grep can, because
the breakage lives entirely in row data.

Fixed by `0029_backfill_email_template_domain.sql`, a `--custom` data migration
that re-stamps `hackathon` any template with a `hacker.*`/`hackathon.*` field in
**any** revision's contract (not just the newest — `previewTemplate` can render
an older one). It only ever moves `club → hackathon`, so it cannot demote a
template an officer classified by hand. Verified by planting exactly the broken
row and running the migration: the planted template moved, and a genuine club
template did not.

### Correctness

- **`setStatusEmail` validated the template outside its transaction.**
  `archiveTemplate` and `saveTemplateDraft` both take `FOR UPDATE` on the
  template row when checking bindings, so a check outside raced them: their guard
  saw no binding, ours saw a live template, both committed, and a status ended up
  bound to an archived or club-domain template. The FK cannot catch it because
  nothing was deleted. Now read and locked inside the transaction.
- **`removeClass` counted inside a transaction but took no row lock**, which two
  reviewers flagged. Under READ COMMITTED a concurrent check-in can insert after
  the count and commit before the delete. Now takes `FOR UPDATE` on the class,
  which conflicts with the `FOR KEY SHARE` that insert takes on its FK parent.
  The `ON DELETE restrict` violation (`23503`) is mapped through a new
  `asRestrictConflict` so it reads as the same sentence rather than a raw
  constraint name.
- **`create`/`update` used a bare `.returning()`**, handing back all four retired
  columns and defeating the point of `HACKATHON_COLUMNS`. Both now narrow.
- **Subject validation silently accepted a whole class of typo.** The pattern
  required two dot-separated alpha segments, so `{{hackathonDisplayName}}` and
  `{{hackathon.confirmationDeadline.date}}` did not match it — invisible to both
  the check and the renderer, and shipped to the applicant as literal braces.
  This directly contradicted the officer-facing copy promising rejection at save
  time. Now matches any `{{ ... }}` and rejects what is not in the catalog;
  proven by reverting the pattern and watching five new tests fail.
- **`hackathon.updated` and `hackathon.class_updated` declared `changeFields` and
  never emitted any.** Every edit logged "something changed" with no before/after
  — for a `discordRoleId` repoint, which re-grants Discord access, that is the
  one question the log exists to answer. Both now diff, using the same shape
  `company.updated` uses.
- **The `create` conflict message named the display name** for a constraint that
  is on the derived route name, telling an officer to change a field that was not
  the problem.
- **`(hackathonId, classId)` did not serve `removeClass`**, which filters on
  `classId` alone, nor the RESTRICT integrity probe — a composite only serves its
  prefix, and the schema comment claimed otherwise. Added a `(classId)` index and
  corrected the comment; `EXPLAIN` now shows an Index Only Scan where it was a
  sequential scan.

### User-facing

- **Delete had no confirmation.** It sits one button from "Edit details", and the
  server only refuses a hackathon that already has applications — so a misclick
  on a freshly configured one took its six status emails and every class with it.
  Now confirms, matching `FormDeleteDialog`.
- **The edit dialog seeded once at mount.** Any `router.refresh()` — which saving
  a status email triggers — left it holding stale values that visibly
  contradicted the header behind it, and saving wrote them back over another
  officer's change. Re-seeds on open, via the render-phase pattern rather than an
  effect, gated on the transition so a refresh mid-edit cannot clobber typing.
- **The template picker rendered blank** when its configured template was
  archived or moved to Club, reading as "nothing configured" while the row still
  counted as complete. Now says which and why.
- **The sidebar highlighted nothing** on `/admin/hackathon`.
  `isAdminNavigationActive` takes `id: string`, so the missing branch was not a
  type error. Added, plus the per-feature nav test every other feature has — its
  absence is why this slipped.
- **`STATUS_COPY` was `Record<string, StatusCopy>`**, so adding an application
  state would compile and render a row with a raw slug for a label and no
  guidance, while blocking every status change. Typed to the union; this
  immediately made six defensive `copy?.` chains provably dead, and they are gone.
- **`SUBJECT_FIELDS` had already drifted** from the server catalog —
  `recipient.email` was valid and undocumented, so no officer could discover it.
  Added, with `hackathon.name` explicitly withheld (it is the retired route slug)
  and a test pinning the list against the catalog so the next addition fails
  loudly.
- **Uppercase schemes were rejected.** `HTTPS://bloomknights.org` is a valid
  https link; the `startsWith` refine was case-sensitive, and RFC 3986 schemes
  are not.
- Both pages now go through `canAccessHackathonAdmin` instead of inlining
  `IS_OFFICER`, so broadening the helper cannot produce a nav link that redirects.

### Verification discipline

Three regressions were reintroduced deliberately to prove the new tests catch
them, then reverted: the old subject pattern (5 failures), the `VITEST` line in
`env.ts` (the new disposable-database assertion failed, exactly as it should),
and the index removal (checked via `EXPLAIN`, not a test).

The `env.ts` assertion is worth calling out. That line is load-bearing for
**every integration test in the repo**, and nothing guarded it — remove it and
all four destructive-guard tests still pass while running `DELETE` statements
against the developer's real dev database. The integration test now asserts
`env.DATABASE_URL` actually points at the disposable database before it asserts
anything else.

### Deliberately not fixed

- **The shared `drizzle.__drizzle_migrations` watermark.** Drizzle's migrator is
  a timestamp watermark, not a per-hash check, and production `main` and Reforge
  share one migrations table. The watermark is now 2026-07-31; production
  `main`'s newest migration is 2026-07-03. A migration generated on `main` with a
  `when` below the watermark would be **skipped silently, exiting 0**. Confirmed
  by querying the table directly. This is a real hazard, but it is inherent to
  the shared-database arrangement and predates this branch by 28 migrations —
  fixing it is its own change, not this one.
- **Six vacuous assertions in `email-portal-workspace.test.tsx`.** A reviewer
  mutation-tested them: setting the mass-send confirm button to
  `disabled={false}` leaves all six tests passing, because the regex matches an
  unrelated always-disabled button. Verified via `git diff` that all of them
  predate this branch — this bundle only appends a new `describe` block, which
  deliberately avoids that pattern. Flagged separately rather than expanding this
  PR's scope.
- **No send path consumes `HackathonStatusEmail` yet.** `isConfigured: true`
  means "configuration is complete", not "mail will send" — hacker management
  owns the send path. Called out here because the two read alike on screen.
- **Binding details in the archive-refusal message** are visible at the
  `EMAIL_PORTAL` tier, one below the officer tier that gates hackathon config.
  `listAudienceOptions` already exposes hackathon display names at that tier, so
  the genuinely new leak is the template↔status relation. Judged acceptable;
  noted so it is a decision rather than an oversight.

## Review round 3 — fixes applied

Two reviewers: one adversarially verifying each round-2 fix, one deliberately
looking where the first two rounds had not. Round 2's fixes held except where
noted below.

### Two procedures the UI could not reach

`updateClass` and `clearStatusEmail` were implemented, audited, tested for
access, and **wired to nothing**. The consequences were not cosmetic: an officer
who pasted the wrong Discord role id onto a class had exactly one recovery path,
delete and re-add, and `removeClass` refuses as soon as any hacker is assigned —
so the class would have been permanently wrong. A configured status could be
overwritten but never unset, which is also how an officer deliberately takes a
hackathon back out of the configured state.

Both now have UI: an edit dialog per class row, and a Clear button on each
configured status row. This is the kind of gap that survives a green test suite,
because every test called the procedure directly.

### The compiler hole behind "rejected at save"

`assertFieldsAllowedForDomain` reads the contract, and the contract is populated
_while rendering_. On the sample path a `When` whose condition the sample does
not satisfy returned early without rendering its children, and an `Each` over a
collection absent from the sample did the same — so fields inside them never
reached the contract. The send path always renders every branch into a Go
conditional, so its contract was complete.

The result: a template with a club field inside a conditional passed
`saveTemplateDraft` and then failed at send, naming a field the officer never
saw. That contradicts the promise made on screen, and it applies to **club
campaigns too**, which do send today. It also meant the stored
`personalization_contract` under-reported what a template references.

Both branches now render their children and discard the output. Three tests pin
it, including the two compile paths agreeing, and a positive control that a legal
skipped branch still compiles. Verified by reverting the fix: all three fail.

### Corrections to round 2's own work

- **`archiveTemplate` never took the lock my comment claimed it did.** Round 2
  moved `setStatusEmail`'s template check inside a transaction and justified it
  by saying both binding guards take `FOR UPDATE` — true of `saveTemplateDraft`,
  false of `archiveTemplate`, which read bindings before locking anything. The
  race it was supposed to close was still open in that direction. Both reviewers
  caught it independently. The lock is now real, and the ordering is consistent
  (`EmailTemplate` first everywhere, nothing locks `HackathonStatusEmail` ahead
  of it), so it cannot deadlock.
- **`update` read its audit `before` outside the transaction**, which is exactly
  the flaw round 2 fixed in `updateClass` and left in place one function above.
  A concurrent edit made the diff name a value the update did not replace.
- **The backfill promoted mixed templates.** A template referencing both
  `member.*` and `hackathon.*` was legal under the old flat catalog and is legal
  under neither domain now, so stamping it `hackathon` would not fix it — it
  would only change which field the error names, while making it bindable to
  applicant mail. Those now stay `club`. Verified across five cases on a scratch
  database: pure-hackathon moves, pure-club, mixed, no-revisions, and
  empty-contract all stay.
- **The delete dialog could fire twice.** `isPending` goes false the moment the
  mutation resolves, but `router.push` is not instantaneous, so the confirm
  button re-enabled while still on screen; a second click ran `remove` on the
  deleted id and surfaced "Hackathon not found." behind the success toast.
- **`templateArchived` was computed and never read**, while the round-2 banner
  inferred the same thing by set-difference against a list capped at 100 — which
  would have accused a valid binding of being retired. The server now returns
  `templateDomain` too, and the screen distinguishes archived from moved using
  both, exactly.

### Also fixed

- `classes` and `statusEmails` had no `ORDER BY`, so the class list visibly
  reshuffled after unrelated edits.
- The Discord role field's toggle read its label from `preferPicker` alone while
  the control shown also depended on whether any roles loaded. With Discord
  unreachable the link said "Other — paste an ID" next to a paste field that was
  already showing, and clicking it wiped what had been typed. Typing now pins the
  paste field, so a role list resolving mid-type cannot swap the control and hide
  the value.
- Two comments asserted things that were not true: why `hackathon.name` is kept
  in the catalog, and that the portal preview wants an unscoped compile.

## Review round 4 — a regression I introduced

Round 4 verified round 3's fixes and found that one of them **broke a
previously-working case**. This is the clearest argument in the log for looping
rather than stopping when a round looks clean.

- **The `Each` fix omitted the loop alias.** Round 3 made a `When` miss and an
  absent collection render their children so the fields inside reach the
  contract. For `Each` it passed the parent context, leaving the alias out of
  `locals` — and since `resolvePath` and `fieldType` both test `field in locals`,
  `<Merge field="role" />` inside the loop stopped resolving as a loop-local and
  was reported as an unknown personalization field. A template that used to
  compile to nothing now failed outright. The comment I wrote claiming "the alias
  resolves to nothing, so every merge inside it renders empty" was simply false.
  Fixed by binding `[alias]: undefined`, which `in` still reports as present.
- **The same fix missed the case that actually occurs.** It handled an absent or
  null collection but not an **empty array** — and `roleNames` defaults to `[]`,
  so the empty array is the realistic sample, not the absent one. The two compile
  paths still disagreed for any template whose sample had no rows. Now handled by
  the same branch.
- **The role picker could hide a real value.** `roles.listDiscordOptions` runs
  `filterDiscordRolesForLinking`, which drops managed roles and any role already
  linked to a `Roles` row — but a class is explicitly allowed to use exactly
  those. So the new edit dialog would show "Choose a Discord role" over a stored
  id it could not display, with Save enabled to write the invisible value back:
  precisely the failure the field's own doc comment claimed to have eliminated.
  The field now falls back to showing the id whenever the picker cannot display
  it, and says why. A comment asserting this procedure was _not_ filtered — which
  is what let the bug through — is corrected.

Both fixes are pinned by tests verified against the broken code: reverting the
`Each` change fails three of them.

**Checked against real data rather than argued.** Every stored template revision
in the shared database — 18, across both the sample and provider compile paths —
recompiles cleanly under the new compiler. The empty-array branch is the riskiest
part of this change, because rendering a loop body that previously never ran
could in principle reject a template that used to save; it does not, for anything
that actually exists.

## Rounds 5–8

Round 5 verified round 4's fixes clean. Rounds 6, 7 and 8 then found progressively
less, which is the signal the loop had converged.

**Round 6** — two reviewers over the full diff, weighted at the surface added
late. The substantial finds:

- **Four catalog fields were never populated on the send path.** This branch
  added `hackathon.applicationUrl`, `.confirmationDeadline`, `.startDate` and
  `.endDate` to `PERSONALIZATION_FIELDS` and to the preview sample, but not to
  `campaign.ts`/`audience.ts`. A template using one previewed correctly and
  delivered blank — the exact drift the shared sample exists to prevent,
  inverted, and mine. Now selected, formatted with the same helper the preview
  uses, and pinned by a test that derives its expectation from the catalog.
- **Copy promising enforcement that does not exist.** Four screens said a
  hackathon "cannot change anyone's application status" until its mail is
  configured. `isConfigured` is read by nothing but those screens; no status
  mutation exists. An officer would have believed the platform was protecting
  them. All corrected to state readiness.
- `clearStatusEmail` logged an audit event for a delete that removed nothing;
  a malformed id in the URL was a 500 rather than a 404; the Delete button
  offered an action the server would refuse, because the screen had no
  application count; colour and role were free text with no client validation,
  so a bad paste surfaced a raw ZodError blob; the class edit dialog leaked one
  class's picker mode into the next and could wipe a stored role id.

**Round 7** — mostly follow-through misses from round 6, plus one I should not
have needed a reviewer for:

- **`pnpm test` was red and I had not noticed.** I had been running four
  packages by `--filter`, which skipped `@forge/db` entirely. Its
  dev-backup-sanitizer test fails when a schema table is classified in neither
  `TABLES_TO_KEEP` nor `TABLES_TO_DROP`, and both new tables were unclassified —
  so an officer's whole hackathon configuration would have shipped empty in
  every dev backup. That gate exists precisely because
  `knight_hacks_discord_config` did this once already. Fixed, and the gate is
  now run unfiltered from the root.
- An `aria-label` a previous round reported as added had never landed (the
  target text had been re-indented). `clear.onError` did not refresh, so the new
  `NOT_FOUND` left a permanently stale row. Name and subject inputs had no
  `maxLength`, so an over-long paste still reached Zod.
- The parity test's own comment overstated it: it hardcoded expected keys while
  claiming to be drift-proof. Now derived from the catalog, and verified by
  adding a field and watching it fail.

**Round 8** — one defect: a comment above the Clear button still asserted the
enforcement the round-7 copy pass removed everywhere else. The pass had covered
user-facing strings; this was a comment.

## Verification coverage, stated plainly

Round 8 audited what is actually being run, rather than what was claimed:

- `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass from the
  repo root, unfiltered — 19/19, 25/25, 27/27, 23/23. Test totals: `db` 102,
  `validators` 179, `email` 79, `api` 464, `blade` 558.
- **`pnpm verify:precommit` cannot pass on this branch**, for a reason that
  predates it: `analyze:react:changed` exits 1 on `apps/blade/src/trpc/react.tsx`
  and its `legacy/` twin, both untouched here and both failing identically on
  `reforge/main`. All seven new hackathon components analyze clean. Worth fixing
  separately — a permanently red gate hides the next real failure.
- **The two Blade test files the bundle promised do not exist**:
  `hackathon-config.test.tsx` and the e2e spec `hackathon-configuration.spec.ts`.
  `pnpm test:e2e` runs zero hackathon assertions today. The two Blade tests that
  do exist cover navigation and the subject-field guide, not the config screen's
  states.
- **API behavioural coverage is thinner than the plan.** `setStatusEmail`,
  `clearStatusEmail`, and the class mutations have no test calling them; only
  access policy and the destructive guards are covered. TC-003/004, TC-005/006,
  TC-NEG-007 and TC-NEG-010/011 remain unwritten.
- The parity test exercises `audience.ts` but hand-builds its fixture, so it does
  not reach `campaign.ts`. A field added to the catalog and to `audience.ts` but
  never selected in `campaign.ts` would still deliver blank.

None of these are blockers for what this bundle does, but none of them should be
read as done.

### Built

- **Schema and migration** — additive, applied.
- **Validators** — `applicationUrl`, class name, hex colour, and the class
  Discord role (composed from the shared `discordSnowflakeSchema` rather than a
  sixth copy of the pattern), plus every router input schema. The two dead
  preset factories and both preset-issue helpers are gone.
- **`@forge/email`** — `hackathons/` deleted in full, along with the now-empty
  `@forge/email/client` entrypoint and its package export. `sendEmail` reshaped
  to send rendered HTML with no Listmonk template id, which is what lets status
  mail be authored in Blade. `PERSONALIZATION_FIELDS` gained the four hackathon
  fields and is now scoped by domain, enforced in `finalize` — the one choke
  point both compile paths pass through.
- **`hackathon` router** — ten procedures, registered in `root.ts`, all
  officer-only, all audited. Eight new audit action keys, a `hackathons` audit
  domain, and two target types.
- **Tests** — 25 validator, 15 email domain-scoping, 21 access-policy.

- **Blade UI** — `/admin/hackathon` list and `/admin/hackathon/[id]` detail,
  both server components doing the officer gate before any read. Client
  components under `_components/admin/hackathon/`: the list, the create/edit
  dialog, the status-mail section, and the class section. Officer-only access
  helper, sidebar entry, admin-layout gate, and two page eyebrows.
- **`EmailTemplate.domain` threaded through the portal** — save, duplicate (a
  copy stays in its source's domain), and list, which now takes an optional
  `domain` filter so the hackathon picker only ever sees hackathon templates.

### Not built

- **Remaining behavioural test cases.** TC-001 through TC-020 minus the access
  and domain-scoping ones written here. They need a live database harness, and
  the three pre-existing integration failures show that harness is currently
  unreliable on this machine — worth fixing before writing more against it.
- **Inline template authoring.** The status-mail section picks an existing
  hackathon template and sets its subject; writing the template body still
  happens in the email portal. `CodeEmailEditor` and `VisualEmailEditor` are
  small and reusable, so embedding them is a contained follow-up rather than a
  rewrite.
- **Status-email preview** (spec AC-010). `email.previewTemplate` exists and the
  four hackathon personalization fields are in the catalog; the section does not
  yet call it.

### Note on the removed class constants

`HACKER_CLASSES`, `HACKER_TEAMS`, `SPECIAL_HACKER_CLASSES`,
`HACKER_CLASSES_ALL`, `HackerClass`, and `AssignedClassCheckinSchema` had **zero
consumers** across `packages/*/src` and `apps/*/src` before removal — they were
already dead in the current tree, as the reverse spec predicted. `RepeatPolicy`
was kept; it is unrelated.

### Local environment

This worktree needed its own `.env` (gitignored, so it does not come across from
a `git worktree add`). Copied from `forge-reforge-main` and confirmed ignored via
`git check-ignore` before anything else ran.

## Links

- PRs:
- Issues:
- Discord/thread context:
