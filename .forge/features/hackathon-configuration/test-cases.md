# Hackathon Configuration Test Cases

Status: Draft — proposed 2026-07-29, **not approved**. Four open questions below.

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

Covers the nineteen acceptance criteria in `spec.md`: hackathon CRUD, per-status
mail configuration, class and VIP configuration, the unconfigured state, access
policy, and the template-domain scoping introduced in `srd.md`.

Intentionally excluded:

- **Anything requiring check-in.** Class assignment, Discord role application,
  and real class headcounts do not exist yet. Headcount is testable only as
  "renders zero" — see open question 2.
- **The member-facing applications-open banner.** Out of scope in `spec.md`; only
  the stored link is tested here.
- **The five column drops.** Deferred to cutover, so their continued _absence
  from Reforge read paths_ is what gets asserted, not their removal.
- **Listmonk delivery.** The provider gateway already has its own fake; this
  bundle changes what is sent, not how.

## Test placement plan

| Area                         | Location                                                   | Command                                |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| Validators (date rules only) | `packages/validators/src/tests/hackathons.test.ts`         | `pnpm --filter=@forge/validators test` |
| API behavior and access      | `packages/api/src/tests/hackathon/`                        | `pnpm --filter=@forge/api test`        |
| Template domain scoping      | `packages/api/src/tests/email/`                            | `pnpm --filter=@forge/api test`        |
| Blade UI states              | `apps/blade/src/tests/admin/hackathon-config.test.tsx`     | `pnpm --filter=@forge/blade test`      |
| End-to-end                   | `apps/blade/src/tests/e2e/hackathon-configuration.spec.ts` | `pnpm --filter=@forge/blade e2e`       |

Follows the established pattern: one Playwright spec per feature bundle, domain
folders under `packages/api/src/tests/`, one validator test file per domain. The
Discord gateway is stubbed through the existing
`packages/api/src/tests/support/role-management-discord.ts` harness rather than a
new one.

**Why validators get their own tests at all**, given the API tests exercise the
same rules: `getHackathonDateWindowIssues` is asymmetric in a way review does not
catch. `applicationOpen >= applicationDeadline` and `startDate >= endDate` are
strict; `applicationDeadline > confirmationDeadline` and
`confirmationDeadline > startDate` permit equality
(`packages/validators/src/hackathons.ts:118-152`). Two rules allow equal dates
and two do not — exactly the sort of inconsistency someone later "tidies" into
uniformity, silently changing behavior.

Four assertions against a pure function pin that. In exchange, TC-NEG-003 shrinks
to a single case proving the procedure calls the validator, rather than
re-testing every rule through the expensive layer. This is less total testing
than testing both fully, not more.

The file has no tests today despite being live and consumed by legacy; these are
its first. Rules are pinned as they currently behave — if one turns out to be
wrong, that is a separate change, not a silent correction here.

## Test cases

### TC-001: Create a hackathon (AC-001)

Setup: officer session; no hackathon named `knight-hacks-x`.

Action: create with display name, route name, theme, five ordered dates.

Expected: returned with an id and present in `list`. No source file is consulted
to determine that it exists.

### TC-002: List order and labelling (AC-004)

Setup: three hackathons with different start dates.

Action: call `list`.

Expected: newest first; display name and route name returned as separate values.

### TC-003: Configure one status email (AC-005)

Setup: officer session; a hackathon; a template with `domain = 'hackathon'`.

Action: `setStatusEmail` for `accepted` with that template and a subject.

Expected: `get` returns the pair for `accepted` and nothing for the other five.

### TC-004: Status email is an upsert (AC-005)

Setup: `accepted` already configured.

Action: `setStatusEmail` again for `accepted` with a different template.

Expected: one row for `(hackathon, accepted)` holding the new values. No
duplicate, no error.

### TC-005: Unconfigured until all six are set (AC-006, AC-007)

Setup: a hackathon with five of six statuses configured.

Action: read `list` and `get`; configure the sixth; read again.

Expected: unconfigured before, configured after. The completeness flag comes from
the API rather than being recomputed in the UI.

### TC-006: Unconfigured state is visible (AC-006)

Setup: rendered config screen for an unconfigured hackathon.

Action: render.

Expected: a banner stating the hackathon is not ready to use, and the same
signal on the list entry. Assert the user-visible text, not a CSS class.

**Amended.** This originally expected a banner saying no status changes are
allowed. Nothing enforces that: `isConfigured` is computed by `list` and `get`
and read only by this screen, and no status mutation exists yet — hacker
management owns it. A test written to the original wording would have asserted
copy the UI deliberately does not render, and would have encoded the false claim
into the suite. The banner states readiness instead.

### TC-007: Delete with no applications (AC-008)

Setup: a hackathon with zero `HackerAttendee` rows.

Action: `remove`.

Expected: succeeds; absent from `list`.

### TC-008: Configure classes (AC-012)

Setup: officer session; a hackathon.

Action: create three classes with distinct names, role ids, and colors.

Expected: all three returned by `get`, each retaining its own values.

### TC-009: Classes may share a role and a color (AC-012)

Setup: one class exists.

Action: create a second with the same `discordRoleId` and color.

Expected: succeeds. This is the behavior that rules out reusing `Roles`, whose
`discordRoleId` is unique.

### TC-010: VIP is configured alongside classes (AC-012)

Setup: a hackathon with two classes.

Action: create an entry with `kind = 'vip'`.

Expected: succeeds; `get` distinguishes it from ordinary classes.

### TC-011: A hackathon needs no classes (AC-013)

Setup: a hackathon with all six status emails and zero classes.

Action: read `list`.

Expected: reported as configured. Class count does not affect completeness.

### TC-012: Application link is optional (AC-017)

Setup: a hackathon with no application link.

Action: read `list`; set a link; clear it.

Expected: configured throughout. The link round-trips and clears to null.

### TC-013: Role picker offers guild roles by name

Setup: stubbed gateway returning three guild roles, one already linked in
`Roles`.

Action: open the class editor.

Expected: all three offered. The linked one is **not** filtered out — the class
editor must not reuse `filterDiscordRolesForLinking`.

### TC-014: Paste path works when the gateway is unavailable

Setup: stubbed gateway returning `available: false`.

Action: enter a valid snowflake through the "Other" path and save.

Expected: the class saves. Configuration is never blocked on Discord being
reachable.

### TC-015: Honest copy about role application (AC-015)

Setup: rendered class section with a linked role.

Action: render.

Expected: text stating the role is not granted here and applies at check-in. Its
absence is the failure mode, so assert the claim directly.

### TC-016: Preview uses hacker-shaped data (AC-010)

Setup: a `domain = 'hackathon'` template referencing `recipient.firstName`,
`hackathon.displayName`, and `hackathon.confirmationDeadline`.

Action: request a preview.

Expected: all three resolve from the sample. The deadline renders formatted and
human-readable, not as a raw ISO string.

### TC-017: New hackathons start blank (AC-011)

Setup: an existing hackathon with all six templates configured.

Action: create a second hackathon.

Expected: zero status emails. Nothing is copied forward.

### TC-018: Hackathon templates are badged (AC-009)

Setup: one `club` and one `hackathon` template.

Action: list templates in the portal.

Expected: both appear; only the hackathon one is badged. The badge derives from
the declared `domain`, so it is present before any hackathon points at it.

### TC-019: Adding a hackathon needs no source change (AC-016)

Setup: a database with no hackathons.

Action: create and fully configure one through the API alone.

Expected: fully configured. No module exports a hardcoded hackathon list,
template-id map, or class-name list.

### TC-020: Existing hackathons and attendees survive (AC-019)

Setup: a hackathon and attendees created before the migration.

Action: run the migration; read both.

Expected: identity, dates, and applications unchanged. Attendees carry
`classId = NULL` and `isVip = false`. Nothing is backfilled from the legacy
`class` column.

## Negative / regression cases

### TC-NEG-001: Unauthenticated access (AC-002)

Action: call each procedure with no session.

Expected: `UNAUTHORIZED` from every one. No partial data.

### TC-NEG-002: Logged-in non-officer (AC-002)

Setup: a session holding `READ_HACK_DATA` and `READ_HACKERS` but not
`IS_OFFICER`.

Action: call each procedure; load `/admin/hackathon`.

Expected: `FORBIDDEN` from every procedure, redirect from the route. These two
permissions are deliberately insufficient per the SRD access policy, so this case
guards a decision rather than an accident.

### TC-NEG-003: Date validation is wired up (AC-003)

Action: submit one hackathon whose start date follows its end date.

Expected: rejection naming the offending date, and no hackathon created.

Deliberately **one** case, not four. The four ordering rules are pinned against
the pure function in `packages/validators`; this only proves the procedure calls
it and surfaces the message. Re-enumerating every rule here would test the same
logic twice at the more expensive layer.

### TC-NEG-004: Duplicate display name

Setup: a hackathon named "Knight Hacks X" exists.

Action: create another with the same display name.

Expected: succeeds. The derived route name gains a numeric suffix rather than
colliding — officers no longer type a slug, so a duplicate name is not an error.
Under concurrency the unique constraint is the real guard and surfaces as
`CONFLICT`, never as a raw constraint name.

_(Supersedes the original TC-NEG-004/005, which tested an officer-entered route
name. That field no longer exists.)_

### TC-NEG-006: Delete with applications (AC-008)

Setup: a hackathon with one `HackerAttendee`.

Action: `remove`.

Expected: `PRECONDITION_FAILED` with a reason. Hackathon and attendee both
survive.

### TC-NEG-007: Second VIP

Setup: a hackathon with a VIP entry.

Action: create another `kind = 'vip'`.

Expected: `CONFLICT`. Enforced by the partial unique index, so it holds against a
direct write too.

### TC-NEG-008: Delete a class with members (AC-018)

Setup: an attendee referencing a class.

Action: `removeClass`.

Expected: `PRECONDITION_FAILED` with a reason. Both survive.

### TC-NEG-009: Mail configured for `checkedin`

Action: `setStatusEmail` for `checkedin`.

Expected: rejected. The CHECK constraint holds against a direct write too.

### TC-NEG-010: Delete a referenced template

Setup: a hackathon pointing at a template.

Action: delete that template.

Expected: refused by the `restrict` FK. The hackathon does not become
unconfigured.

### TC-NEG-011: Archive a referenced template

Setup: as above.

Action: archive it.

Expected: refused at the procedure level. A foreign key cannot catch this —
`archivedAt` is a soft delete — so without an explicit check a hackathon is
silently unconfigured.

### TC-NEG-012: Hackathon template references club fields

Action: save a `domain = 'hackathon'` template referencing
`member.graduationYear`; then one referencing `team.roleNames`.

Expected: both rejected. A hacker need not be a club member, so these render
blank for exactly the recipients hackathon mail targets.

### TC-NEG-013: Club templates keep their fields

Setup: an existing club template referencing `member.graduationYear` and
`team.roleNames`.

Action: save and render it.

Expected: unchanged. Scoping must not regress club campaigns — the reason
`team.roleNames` was kept rather than deleted.

### TC-NEG-014: Malformed Discord snowflake

Action: submit a role mention (`<@&123…>`), a value with a trailing space, and a
sixteen-digit number.

Expected: rejected. These are the realistic paste failures the CHECK exists for.

### TC-NEG-015: Malformed color

Action: submit a named color, a three-digit hex, and a hex without `#`.

Expected: rejected.

## Deliberately not tested

**That Reforge never reads the retained legacy columns.** This is the
precondition making the cutover drops safe, but it is an _absence_, and no
runtime test can prove it. A grep or a Drizzle-level assertion would look like
proof while catching only the spellings it anticipated — worse than nothing,
because it invites confidence it has not earned. Code review at cutover covers
it; the SRD records the dependency.

**Class headcount (AC-014).** Assignment does not exist until check-in, so the
only assertable behavior is "renders zero" — which passes trivially and would
keep passing if the query were broken. Deferred to the check-in bundle, where it
can assert something real.

**The four date-ordering rules, at the API layer.** Pinned once against the pure
function instead. See TC-NEG-003.

## E2E authentication

No new fixture. `/api/e2e/signin?userId=…` sets an auth cookie for any seeded
user (`apps/blade/src/app/api/e2e/signin/route.ts`); permissions come from the
roles that user holds. Six existing specs seed a role carrying
`permissionBitstring("IS_OFFICER")`, attach a user to it, and sign in as that id
— `role-management.spec.ts:181-249,298` is the closest model.

`permissionBitstring` is currently copy-pasted into six spec files. Follow that
pattern rather than extracting it; consolidating it is unrelated cleanup and
belongs in its own change.

## Open questions

None.
