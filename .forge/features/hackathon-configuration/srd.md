# Hackathon Configuration SRD

Status: Draft — proposed 2026-07-29, **not approved**. Six open questions below, three of which change the data model.

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Move the hackathon roster, its transactional mail wiring, and its hacker class
names out of source and into officer-editable data, then expose that data through
a `hackathon` router and an officer screen.

Three things currently require a developer and a deploy:

- which hackathons exist, and their per-hackathon Listmonk template ids
  (`packages/email/src/hackathons/templates.ts:12-60`);
- the six hacker class names and the two-team constant
  (`packages/db/src/schemas/knight-hacks.ts:594-616`);
- the application background preset list, which no longer has a reason to exist.

After this, none of them do.

This is also the first hackathon-domain router in Reforge. `packages/api` exports
no hackathon procedures today, so this establishes how the domain is shaped for
hacker management, events, judging, and the SDK.

## Relevant principles

From `docs/agentic-development/forge-engineering-principles.md`:

- _Product/architecture philosophy_ — "New hackathon setup should become
  configuration/data-driven over time, not a pile of hard-coded constants and
  database rewiring." This bundle is that sentence.
- _Architectural sins to avoid_ — "Requiring developer changes for behavior that
  should be configurable by officers/admins" and "Hard-coding yearly hackathon
  constants."
- _Sharing and package boundaries_ — hackathon domain logic belongs in
  `@forge/api`, not a new package. `@forge/db` gets schemas only.
- _React and Next.js principles_ — server-first page, no page-level
  `"use client"`, focused hooks over scattered state.

## Access policy

Every procedure in this bundle is `permProcedure` with
`permissions.controlPerms.or(["IS_OFFICER"])` asserted at the top of the
resolver, matching the admin config console. There is no read-only tier:
`READ_HACK_DATA` and `READ_HACKERS` exist but are deliberately not accepted here,
because writing applicant-facing mail is not a read-tier action and no
non-officer audience for hackathon config was identified.

- **Unauthenticated:** no access to any procedure or route.
- **Logged-in non-officer:** no access. `/admin/hackathon` redirects, matching
  the existing admin route guards.
- **Officer:** full read and write.

Two forward notes, both out of scope but load-bearing for whoever picks them up:

- The **application link** is written here by an officer but will be read by a
  member-facing dashboard banner. That future read needs its own
  `protectedProcedure` returning only open hackathons and their links — it must
  not reuse an officer procedure that returns the whole config.
- Class **Discord role ids** are written here and consumed at check-in. The
  consumer is a side effect against a live Discord guild, so its access policy is
  a separate decision, not inherited from this one.

## Architecture / data flow

```txt
apps/blade  /admin/hackathon        server page: officer gate + initial read
            _components/admin/hackathon/*   client form components
                       │
                       ▼
@forge/api  routers/hackathon.ts    procedures + workflow
            utils/hackathon/*       only if a helper earns a clearer home
                       │
                       ▼
@forge/db   schemas/knight-hacks.ts schema only, no queries
@forge/validators  hackathons.ts    extended, already exists
@forge/email       hackathons/      mostly deleted
```

Blade stays a thin client: the page performs the officer gate and a server-side
read, then passes data down. No business logic in components.

Per `docs/REPO-CONVENTIONS.md`, the router registers in
`packages/api/src/root.ts` under the key `hackathon`, giving `api.hackathon.*`.

## tRPC/API behavior

Proposed procedures, all `permProcedure`:

| Procedure                                     | Shape                                                    | Notes                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                                        | query → hackathons with configuration completeness       | Powers the list. Newest first by `startDate`. Includes whether required mail is set, so the list can flag unconfigured hackathons without N+1 reads. |
| `get`                                         | query(`{ id }`) → hackathon, status mail, classes        | Single read for the edit screen.                                                                                                                     |
| `create`                                      | mutation(identity + dates) → id                          | Classes and mail are configured after creation, matching the spec's "saveable while incomplete."                                                     |
| `update`                                      | mutation(`{ id }` + identity + dates)                    |                                                                                                                                                      |
| `remove`                                      | mutation(`{ id }`)                                       | Refuses when any `HackerAttendee` row exists.                                                                                                        |
| `setStatusEmail`                              | mutation(`{ hackathonId, status, templateId, subject }`) | Upsert on `(hackathonId, status)`.                                                                                                                   |
| `clearStatusEmail`                            | mutation(`{ hackathonId, status }`)                      |                                                                                                                                                      |
| `createClass` / `updateClass` / `removeClass` | mutation                                                 | `removeClass` refuses when any attendee references it.                                                                                               |

Errors: `NOT_FOUND` for unknown ids, `CONFLICT` for a duplicate route name or a
second VIP entry, `PRECONDITION_FAILED` for deleting a hackathon with
applications or a class with members, `BAD_REQUEST` for validation failures.

Every procedure gets a `.meta({ description })` line — the forms platform already
relies on procedure metadata (`packages/api/src/utils/forms/callbacks.ts`), and
a future generated API manifest will want these.

**Audit.** Per `forge-api`, officer-facing mutations here should emit admin audit
events through `createAdminAuditEvent`, the way
`packages/api/src/utils/email/templates.ts` already does. Editing the mail every
applicant receives is exactly the sort of change that should be attributable.

## Validation

`packages/validators/src/hackathons.ts` already owns the five-date ordering
rules, route-name shape, display-name, and theme schemas, and is already exported
from the package index. Extend it rather than starting a new module:

- delete `createHackathonApplicationBackgroundKeySchema` and
  `createHackathonEmailTemplateKeySchema`; both lose their only callers;
- add an application-link schema — absolute `http`/`https` URL, optional,
  trimmed, empty string normalised to null;
- add a class-name schema and a hex-colour schema (`^#[0-9a-fA-F]{6}$`, matching
  `Roles.teamHexcodeColor` and `Event.tagColor`, both `varchar(7)`);
- add a Discord snowflake schema — `^[0-9]{17,20}$`, matching the CHECK
  constraints already on `DiscordConfig`.

The sending-status list is derived from `FORMS.HACKATHON_APPLICATION_STATES`
minus `checkedin`, not written out by hand, so the two cannot drift.

### Personalization catalog

`PERSONALIZATION_FIELDS` (`packages/email/src/templates.ts:72-81`) gains four
hackathon fields: `hackathon.confirmationDeadline`, `hackathon.startDate`,
`hackathon.endDate`, and `hackathon.applicationUrl`.

The deadline is the load-bearing one. Today the catalog carries no dates at all,
so an acceptance email cannot state the date by which its recipient must confirm
— the single most actionable line in that email. Every other addition here is
convenience; this one is a correctness gap.

Dates need a rendering decision the existing catalog has not had to make: every
current field is a `string`, `number`, or `string[]`. These are timestamps and
must reach a template already formatted in a fixed, human-readable, timezone-safe
form rather than as a raw ISO string.

`DEFAULT_TEMPLATE_SAMPLE` (`packages/api/src/utils/email/templates.ts:20-32`)
gains matching sample values so the preview required by spec AC-010 has something
hacker-shaped to render.

**The catalog becomes scoped, not flat.** `PERSONALIZATION_FIELDS` splits by
`EmailTemplate.domain`:

| Domain      | Offered                                                    |
| ----------- | ---------------------------------------------------------- |
| `club`      | `member.*`, `team.*`, `recipient.*` — unchanged from today |
| `hackathon` | `hacker.*`, `hackathon.*`, `recipient.*`                   |

`recipient.*` is shared; nothing else crosses. A hacker need not be a club
member, so a hackathon template referencing `member.graduationYear` or
`team.roleNames` would render blank for exactly the people receiving it — the
concrete reason hack and club fields stay strictly separate.

Validation rejects a template referencing a field outside its domain, so this is
enforced rather than merely un-offered. Existing club templates are unaffected:
their fields are all still in the `club` set.

## Data / migration / compatibility

### New tables

**`HackathonStatusEmail`** — `knight_hacks_hackathon_status_email`

| Column        | Type                                                 | Notes                                  |
| ------------- | ---------------------------------------------------- | -------------------------------------- |
| `id`          | uuid pk                                              |                                        |
| `hackathonId` | uuid → `Hackathon`, cascade                          |                                        |
| `status`      | text, enum from `FORMS.HACKATHON_APPLICATION_STATES` |                                        |
| `templateId`  | uuid → `EmailTemplate`, **restrict**                 | Points at the template, not a revision |
| `subject`     | varchar(200)                                         | Matches `EmailSend.subject`            |

Unique on `(hackathonId, status)`. A CHECK excludes `checkedin`.

**Templates, not revisions.** The pointer is to `EmailTemplate`, so a send always
renders that template's latest revision. Editing a template changes what future
applicants receive and leaves already-sent mail alone, which is the behavior an
officer expects from "fix a typo in the acceptance email." Pinning a revision was
rejected: it makes edits silently inert until someone re-pins, and the audit
trail lives on `EmailSend` rather than the pointer.

**A referenced template cannot be removed.** The FK is `restrict`, so deleting a
template a hackathon points at is refused rather than silently unconfiguring the
hackathon. An officer edits it or repoints the hackathon at a replacement.

`EmailTemplate.archivedAt` is a soft delete the FK cannot see, so archiving must
be refused in the same way at the procedure level while a hackathon references
the template. _Owner confirmed refusal on delete; extending that to archive is my
reading of "only edit/replace" and should be corrected if wrong._

**`HackathonClass`** — `knight_hacks_hackathon_class`

| Column          | Type                        | Notes                                                   |
| --------------- | --------------------------- | ------------------------------------------------------- |
| `id`            | uuid pk                     |                                                         |
| `hackathonId`   | uuid → `Hackathon`, cascade |                                                         |
| `kind`          | text, `'class' \| 'vip'`    | VIP is a distinct type, not a flag on an ordinary class |
| `name`          | varchar(64)                 | Per-hackathon themed name                               |
| `discordRoleId` | varchar(20)                 | CHECK `~ '^[0-9]{17,20}$'`, copying `DiscordConfig`     |
| `color`         | varchar(7)                  | CHECK hex, explicitly stored not derived                |

No uniqueness on `discordRoleId` or `color` — the owner confirmed classes may
share both. A partial unique index enforces at most one `kind = 'vip'` per
hackathon.

**Why not reuse `Roles`:** `Roles.discordRoleId` is `unique`
(`packages/db/src/schemas/auth.ts:40`), which alone forbids two classes sharing a
role. `Roles` also carries permission bitstrings and Discord-sync semantics that
a class does not have. A class role grants channel access in Discord; it is not a
Blade permission role, and it must never appear in the `/admin/roles` table.

Nothing in this bundle writes to `Roles`, references it, or reads it. A hackathon
class is invisible to role administration.

**Reuse the Discord read gateway, not the table.** `resolveRoleDiscordGateway`
(`packages/api/src/utils/roles/discord-gateway.ts:126`) exposes `getGuildRoles()`
independently of the `Roles` table, so the class editor can offer a picker of
real Discord roles by name instead of asking an officer to paste a snowflake.
That is a strictly better answer to "did I paste the right id," which the CHECK
constraint cannot help with.

Two helpers on that path must **not** be reused:

- `filterDiscordRolesForLinking` excludes roles already linked in `Roles`.
  Classes are not links and may share roles, so filtering would hide valid
  choices.
- `assertUniqueDiscordRole`, used by `previewDiscordRole`, rejects a role that is
  already linked — wrong for the same reason.

The raw `discordRoleId` column stays regardless: the picker is a convenience over
a stored snowflake, not a foreign key.

### `EmailTemplate` gains a domain

`EmailTemplate.domain` — text, `'club' | 'hackathon'`, not null, default
`'club'`.

Declared by the author, not derived. A derived mark — "this template is a
hackathon template because a `HackathonStatusEmail` row points at it" — is empty
at authoring time, which is exactly when the field list and the badge matter.

It carries two jobs:

- the portal's list badge required by spec AC-009;
- scoping `PERSONALIZATION_FIELDS`, so a hackathon template is never offered
  `member.graduationYear` or `team.roleNames`.

Named `domain` rather than `audience` deliberately: the email portal already uses
"audience" for recipient targeting (`listAudienceOptions`, `resolveAudience`,
`EmailAudienceDefinition`), and a second meaning on the same word would be worse
than a slightly duller one.

Every existing template is a club template, so the `'club'` default backfills
correctly with no data step. `EmailTemplate.kind` is untouched — it means
authoring format (`'code' | 'visual'`) and this is a second, independent
dimension.

### Changed columns

`HackerAttendee.class` is today `varchar(20)` holding a class _name_, typed
`$type<HackerClass | null>` (`packages/db/src/schemas/knight-hacks.ts:640`). It
becomes:

- `classId` — nullable uuid → `HackathonClass`, restrict;
- `isVip` — boolean not null default false.

`varchar(20)` is also too narrow for arbitrary themed names.

### Dropped columns

Four on `Hackathon` (`packages/db/src/schemas/knight-hacks.ts:93-96`):
`applicationBackgroundEnabled`, `applicationBackgroundKey`,
`emailTemplateEnabled`, `emailTemplateKey`.

One added: `applicationUrl`, nullable text.

### Deleted code

`packages/email/src/hackathons/templates.ts` in full —
`HACKATHON_EMAIL_KINDS`, `HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS`,
`HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS`,
`DEFAULT_HACKATHON_EMAIL_TEMPLATE_PRESET_KEY`,
`HACKATHON_EMAIL_TEMPLATE_IDS`, `HACKATHON_TEMPLATE_IDS`.

`getHackathonEmailTemplateId` and the per-kind subject switch in
`packages/email/src/hackathons/index.ts` go with them; subjects now come from
`HackathonStatusEmail.subject`. `buildHackathonEmail` survives in reduced form,
or its caller moves to plain `sendEmail`.

`HACKER_CLASSES`, `SPECIAL_HACKER_CLASSES`, `HACKER_CLASSES_ALL`, `HackerClass`,
`HACKER_TEAMS`, and `AssignedClassCheckinSchema` all leave
`packages/db/src/schemas/knight-hacks.ts:594-616`. `AssignedClassCheckinSchema`
has no current consumer — the only caller is legacy `eventCheckIn`, which is not
in the current API.

### Migration

**No backfill.** Legacy `HackerAttendee.class` values are string literals from a
retired theme and are deliberately abandoned rather than mapped into
`HackathonClass` rows. Existing attendees keep `classId = NULL` and
`isVip = false`.

This removes what would otherwise have been the riskiest transform in the bundle.
Legacy put `VIP` in the _same_ union as the six class names
(`HACKER_CLASSES_ALL`), so live rows may hold `'VIP'` as a class, meaning "VIP,
no class." Mapping that correctly was easy to get silently wrong. Abandoning the
values makes the question moot — but it is the reason the old `class` column must
not be quietly reinterpreted by anything later.

**This bundle ships additive-only.**

1. Add `HackathonStatusEmail` and `HackathonClass`.
2. Add `HackerAttendee.classId` and `HackerAttendee.isVip`.
3. Add `Hackathon.applicationUrl`.

Nothing is dropped, nothing is rewritten, and every existing row stays valid.

**Rollback is not a one-liner**, contrary to an earlier claim here. Drizzle has
no down migrations, so reverting means a manual `DROP`, removing the entry from
`packages/db/drizzle/meta/_journal.json`, and deleting the snapshot. And
`EmailTemplate.domain` is _declared by the author, not derived_ — dropping it
loses every template's club/hackathon classification with no way to recompute
it, because "is a `HackathonStatusEmail` pointing at it" is precisely the
derivation this design rejected. Treat the revert as a data-loss operation.

### What defers, and why

The line is **shared state versus branch-local state**, not schema versus code.

The database is shared across mixed-version deploys — the `Event.legacy` column
exists precisely so "old Blade writers" and Reforge writers can coexist against
one database
(`packages/db/src/schemas/knight-hacks.ts:414-417`). A dropped column therefore
breaks production Blade the moment the migration runs, regardless of which branch
ran it.

Source is not shared. `main` carries its own copy of every package, so deleting a
module here cannot affect production until cutover merges it.

**Correction to an earlier claim in this document:** the mixed-deploy risk on
`EmailTemplate.domain` was overstated. `main` carries ten migrations to this
branch's twenty-eight and never creates `email_template` at all — its
`0008_email_template_columns.sql` renames `knight_hacks_hackathon.email_theme_*`
to `email_template_*`, which is a different thing. Adding a column to a table
production does not have is zero-risk. That same evidence _hardens_ the other
half: production demonstrably touches `email_template_enabled`/`_key` on
`knight_hacks_hackathon`, so deferring those drops is correct.

**Deferred to cutover — shared database:**

- Drop `HackerAttendee.class`. Production Blade writes it at check-in.
- Drop `Hackathon.applicationBackgroundEnabled`, `applicationBackgroundKey`,
  `emailTemplateEnabled`, `emailTemplateKey`. Production's hackathon manager
  reads them.

Until then these columns coexist with the new tables, untouched by Reforge code.
That is what the compatibility tests assert. The owner's explicit intent is that
the drops happen at cutover rather than becoming permanent debt.

**In this bundle — branch-local source:**

The deletions listed above under _Deleted code_ all land here. Within the current
tree the only consumers of the hackathon email helpers are re-exports in
`packages/email/src/index.ts:147-168` and `packages/email/src/client.ts:2-7`; no
`packages/api` or `apps/*` module imports them, because no hackathon router
exists yet. Removing them and their re-exports compiles cleanly.

One consequence to record per the branch policy: `main` still imports these, so a
future `main` → `reforge/main` merge will conflict on them. Resolve in favour of
the deletion and note it in this `status.md`.

## Discord integration

**No side effects in this bundle.** A class stores a Discord role id and nothing
acts on it. No role is granted, no role is created, no role is modified, and no
row is written to `Roles`. Hackathon class roles never appear in `/admin/roles`.

Role application happens at check-in, which does not exist yet. The screen must
say so — spec AC-015 — following the honest-copy precedent in the admin config
console, which states plainly that a Discord config change does not reach the
T.K. bot until it restarts.

**One read.** The class editor lists the guild's roles through the existing
gateway so an officer picks by name, and additionally accepts a pasted snowflake
under an "Other" option. Both paths store the same `varchar(20)`.

The picker is the default because it is the only thing that catches a valid id
belonging to the _wrong_ role — the CHECK constraint catches a pasted role
_mention_ or a trailing space, which is the realistic typo, but not that.

The paste path is not merely a fallback for taste. `getGuildRoles()` returns an
`available` flag, so the gateway can be down, and a brand-new Discord role can
lag the cache. Class configuration must not be blocked on either, so paste stays
permanently available rather than appearing only on failure.

This read mutates nothing and touches no `Roles` row.

## Configurability review

**Would this require a developer change next year?**

- **Answer: no.** Standing up Knight Hacks X is data entry — a row, five dates,
  six templates, and however many classes. No source change, no deploy. That is
  the point of the bundle.
- Three things remain in code, all deliberately:
  - `FORMS.HACKATHON_APPLICATION_STATES` — the status set is a contract other
    code branches on, not officer-editable copy.
  - The rule that `checkedin` sends no mail — behavior, not configuration.
  - Smallest-class assignment at check-in — the owner explicitly rejected making
    this configurable.
- Everything the current hardcoding covers becomes data.

## React / frontend constraints

- `/admin/hackathon/page.tsx` and `/admin/hackathon/[id]/page.tsx` stay server
  components. No page-level `"use client"`. Pages own the officer gate, the
  redirect, and the initial server-side tRPC read, then pass data down.
- Interactive form state lives in client components under
  `apps/blade/src/app/_components/admin/hackathon/`, following the existing
  `_components/admin/<domain>/` layout.
- Prefer focused hooks over scattered `useState`/`useEffect` — the date window,
  the six mail rows, and the class list are three distinct pieces of form state
  and should not share one blob.
- Explicit save, no save-on-toggle, no optimistic update — matching the admin
  config console and the house pattern.
- Read `apps/blade/DESIGN_SYSTEM.md` before building the unconfigured state; the
  red treatment must use existing tokens rather than inventing a warning colour.
- The Discord role picker uses `ResponsiveComboBox`
  (`packages/ui/src/responsive-combo-box.tsx`), already used by the members and
  events admin surfaces. It is searchable with match scoring and acronym
  matching, which matters because a guild's role list is long and a plain
  `Select` would be unusable. Do not build a bare dropdown.
- The template editor is reused, not reimplemented. Whether that means extracting
  the portal's editor into a shared component or rendering it in place is an
  implementation decision, but duplicating it is not acceptable.

## Testing / verification strategy

| Layer         | Location                            | Covers                                                                                                                                                 |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validators    | `packages/validators/src/tests/`    | Date ordering, route name, colour, snowflake, application URL                                                                                          |
| API           | `packages/api/src/tests/hackathon/` | Access policy per procedure, delete refusals, single-VIP constraint, upsert semantics, audit emission                                                  |
| Compatibility | `packages/api/src/tests/hackathon/` | Existing attendees survive with a null class; no Reforge read path touches the retained legacy `class` column or the four retained `Hackathon` columns |
| Blade         | `apps/blade/src/tests/admin/`       | Unconfigured state renders, preview uses hacker-shaped sample, non-officer redirect                                                                    |

Commands: `pnpm format`, `pnpm lint`, `pnpm typecheck`, then
`pnpm --filter=@forge/api test` and `pnpm --filter=@forge/blade test`.
`pnpm db:generate` produces the migrations; they are reviewed before
`pnpm db:migrate`.

Because the bundle is additive, the sharp edge is no longer a data transform but
coexistence: production Blade keeps reading `HackerAttendee.class` and the four
retained `Hackathon` columns while Reforge reads the new tables. The
compatibility tests exist to prove Reforge never writes or depends on the old
ones, so the cutover drops stay safe to perform later.

## Open questions

None. All questions raised during intake are recorded as decisions in
`status.md`.

Two items are deliberately deferred rather than unresolved:

- The five column drops, tracked under _What defers, and why_.
- A date-formatting choice for the four new hackathon personalization fields.
  Every existing catalog field is a plain string, number, or array; these are
  timestamps and must reach a template already formatted, human-readable, and
  timezone-safe. The format itself is an implementation decision, but "not a raw
  ISO string" is a constraint.
