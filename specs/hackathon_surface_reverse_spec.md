# Reverse-Engineered Specification: The Hackathon Surface

Date: 2026-07-29
Companion to: `specs/non_hackathon_legacy_parity_reverse_spec.md`

## Overview

The prior reverse spec answered "what non-hackathon Legacy capability is
missing." It explicitly excluded hackathon management, hacker applications,
judging, and hackathon analytics. This specification covers exactly that
excluded remainder.

The framing here is **not** Legacy parity. The owner's direction is that the
hackathon surface is where Reforge should diverge from Legacy most, in one
structural way: **the per-hackathon hacker dashboard leaves Blade.** Each
hackathon app owns its own dashboard, the way `apps/bloomknights` and
`apps/2025` already own their marketing sites, and Blade becomes the platform
those apps authenticate into. Legacy is read here for behavior and for the
mistakes worth not repeating — not as a target.

The headline finding is different in kind from the Club work:

> The hackathon surface is not a set of missing features on top of a working
> platform. It is a whole product domain that Reforge deliberately fenced out.
> The database carries it, the permissions carry it, one validator carries it,
> and the email portal already reads it — but the API exports nothing, the app
> renders nothing, and the Club event system actively rejects it.

That fence is the central fact for planning. Every Club-side event query in
Reforge carries `isNull(Event.hackathonId)`, and `assertClubEvent` throws on any
event that has a `hackathonId`. This is not neglect; it is an enforced boundary
that must be deliberately reopened.

## Analysis Boundary

### Included

- `legacy/apps/blade` hackathon, hacker, and judge routes and components.
- `legacy/packages/api` hackathon-domain routers.
- Current `packages/db` hackathon tables.
- Current `packages/api`, `packages/consts`, `packages/validators`,
  `packages/email` hackathon-adjacent code.
- Current `apps/blade` routing, navigation, check-in, QR, and tRPC edge.
- `apps/2025`, `apps/gemiknights`, `apps/bloomknights` as the future dashboard
  hosts.

### Excluded

- Non-hackathon Legacy parity (covered by the companion spec).
- `apps/khix`. No `@forge/api` dependency.
- `apps/tk`. No `hacker`/`hackathon` references found in `apps/tk/src`.

## What Reforge Already Carries

The most important section for estimating. A large amount of hackathon substrate
is already present and current.

| Asset | Location | State |
| --- | --- | --- |
| `Hackathon` table | `packages/db/src/schemas/knight-hacks.ts:86-109` | Present, current shape (display name, theme, background/email template toggles, five-date window) |
| `Hacker` table | `packages/db/src/schemas/knight-hacks.ts:222-267` | Present |
| `HackerAttendee` (status, points, class) | `packages/db/src/schemas/knight-hacks.ts:617-641` | Present |
| `HackerEventAttendee` | `packages/db/src/schemas/knight-hacks.ts:643-669` | Present |
| `Challenges`, `Submissions`, `Teams`, `Judges`, `JudgedSubmission` | `packages/db/src/schemas/knight-hacks.ts:727-846` | Present |
| `Event.hackathonId` | `packages/db/src/schemas/knight-hacks.ts:421-423` | Present |
| Hacker class/team gamification constants | `packages/db/src/schemas/knight-hacks.ts:594-616` | Present |
| `hackathonApplicationStateEnum` | `packages/db/src/schemas/knight-hacks.ts:62-65` | Present |
| Hackathon permissions | `packages/consts/src/permissions.ts:13,28,33,43,63,68,73` | Present — `IS_JUDGE`, `READ_HACKERS`, `EDIT_HACKERS`, `READ_HACK_DATA`, `READ_HACK_EVENT`, `EDIT_HACK_EVENT`, `CHECKIN_HACK_EVENT` |
| Hackathon date-window / name / theme validators | `packages/validators/src/hackathons.ts` | Present, exported from `packages/validators/src/index.ts:1` |
| Hackathon email template plumbing | `packages/email/src/hackathons/` | Present but hardcoded — see OBS-CONFIG-001 |
| Hacker email audience by hackathon + status | `packages/api/src/utils/email/campaign.ts:85-96`, `packages/api/src/routers/email.ts:274-309` | Present and working |
| QR scan payload compatibility | `packages/api/src/utils/events/attendance.ts:78-81` | Present — accepts both `user:<uuid>` and bare uuid |

**OBS-CARRY-001.** `packages/validators/src/hackathons.ts` is not a Legacy copy.
It contains the five-date ordering rules and the background/email preset
validation, and is consumed by
`legacy/packages/api/src/routers/hackathon.ts:16-24`. Hackathon management
validation is already specified in a shared, current package.

**OBS-CARRY-002.** The email portal is already a working cross-domain hackathon
consumer. `listAudienceOptions` returns every hackathon with the seven
application statuses, and `campaign.ts` joins `HackerAttendee → Hacker →
Hackathon` to resolve recipients. This is the only current runtime path that
reads hacker data.

## The Per-Hackathon Config Mess

This is Bundle 1's actual subject, and it is worse than a naming problem.

**OBS-CONFIG-001: Adding a hackathon is a code change and a deploy.**
`packages/email/src/hackathons/templates.ts` hardcodes, in source:

- the set of valid hackathons, as a preset key union —
  `"knight-hacks-viii"`, `"bloomknights"` (lines 12-21);
- one **numeric Listmonk template id per hackathon per email kind** — ids 6–11
  for Knight Hacks VIII and 14–19 for BloomKnights (lines 36-52);
- a compile-time default preset, `"knight-hacks-viii"` (lines 32-33), which
  `HACKATHON_TEMPLATE_IDS` then resolves against (lines 58-60).

`Hackathon.emailTemplateKey` and `Hackathon.applicationBackgroundKey` are
`varchar` columns that hold a key into these hardcoded tables, not the config
itself. The database has the hook; the values live in TypeScript.

**OBS-CONFIG-002: Email kinds and application statuses do not correspond.**
Six email kinds — `Blacklist`, `Accepted`, `Apply`, `Capacity`, `Confirmation`,
`Waitlist` (`packages/email/src/hackathons/templates.ts:1-8`) — against seven
application states — `withdrawn`, `pending`, `accepted`, `waitlisted`,
`checkedin`, `confirmed`, `denied`
(`packages/consts/src/forms/index.ts:342`). `Apply` and `Capacity` are not
statuses; `pending`, `denied`, `withdrawn`, and `checkedin` have no template;
and `Blacklist` is an email kind for a status that does not exist in the enum.

A "configure the email for each status" UI cannot be built until that mapping is
decided. It is a product decision, not a schema one.

**OBS-CONFIG-003: The background preset list was dropped.**
`legacy/packages/api/src/routers/hackathon.ts:5,29-31` imports
`HACKATHONS.APPLICATION_BACKGROUND_KEYS` from `@forge/consts`. No `HACKATHONS`
export exists in `packages/consts/src/`. `legacy/` is outside the pnpm workspace
(`pnpm-workspace.yaml` lists only `apps/*`, `packages/*`, `tooling/*`), so
nothing breaks — but the background preset list is the one piece of hackathon
config that was dropped rather than carried.

**OBS-CONFIG-004: Satellite apps hardcode the Blade handoff.**
`apps/bloomknights/.../registerButton.tsx:21` links to
`https://blade.knighthacks.org/hacker/application/bloomknights`;
`apps/2025/.../register-button.tsx:9` defaults to
`https://blade.knighthacks.org/hacker/application/knighthacks-viii`. The
hackathon route name is the join key between the marketing site and Blade, and
it is a string literal on both sides.

**OBS-CONFIG-005: Status presentation is hardcoded too.**
`legacy/apps/blade/src/consts/index.ts:19-37` holds two overlapping status maps
— `HACKER_STATUS_MAP` (label + Tailwind class) and `HACKER_CLIENT_STATUS_LIST`
(label + display name + hex) — with the same seven statuses in different orders
and two different colour encodings. If per-hackathon dashboards render status,
this belongs in the platform, not copied into each app.

## What Reforge Does Not Carry

### The API export gap

Legacy exported twenty-three routers (`legacy/packages/api/src/root.ts`).
Current exports twenty-one (`packages/api/src/root.ts`), but the sets differ.
Absent from current, in the hackathon domain:

| Legacy router | Procedures | Current |
| --- | --- | --- |
| `hackathon` | `getHackathons`, `getManagedHackathons`, `getCurrentHackathon`, `getPreviousHacker`, `getHackathon`, `getHackathonById`, `getPastHackathons`, `getNumConfirmed`, `createHackathon`, `updateHackathon` | Absent |
| `hackerQuery` | `getHacker`, `getHackers`, `getAllHackers`, `getPointsByClass`, `getTopHackers`, `statusCountByHackathonId` | Absent |
| `hackerMutation` | `createHacker`, `updateHacker`, `deleteHacker`, `confirmHacker`, `withdrawHacker`, `eventCheckIn`, `giveHackerPoints`, `updateHackerStatus` | Absent |
| `hackerPagination` | `getHackersPage`, `getHackerCount`, `getHackerFilterOptions` | Absent |
| `judge` | 14 procedures incl. `getSubmissions`, `createJudgedSubmission`, `generateToken`, `activateToken`, `getJudgingMetrics`, `getRoomsWithSessionCounts`, `deleteSessionsByRoom` | Absent |
| `challenge` | `getChallenges` | Absent |
| `csvImporter` | `import` | Absent |

Evidence: `legacy/packages/api/src/root.ts`, `packages/api/src/root.ts:1-80`.

### No machine or cross-origin auth path

This is the blocking finding for Bundle 4.

**OBS-SDK-001: The tRPC edge is wildcard-CORS and cookie-authenticated, which
cannot be combined.** `apps/blade/src/app/api/trpc/[trpc]/route.ts:8-13` sets
`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: *`. Line 50
resolves identity with `await auth()` — a cookie-backed Discord session.

The Fetch spec forbids `Access-Control-Allow-Origin: *` on a credentialed
request. A browser on `bloomknights.knighthacks.org` calling
`blade.knighthacks.org/api/trpc` with `credentials: "include"` is rejected by
CORS; without credentials, `auth()` returns null and every
`protectedProcedure` throws `UNAUTHORIZED`. **Today there is no way for a
separate hackathon app to make an authenticated Blade call at all.**

**OBS-SDK-002: There are three procedure builders, all session-based.**
`publicProcedure`, `protectedProcedure`, `permProcedure`
(`packages/api/src/trpc.ts:35,37,50`). None accepts a bearer token, API key, or
service credential. Legacy added a fourth, `judgeProcedure`
(`legacy/packages/api/src/trpc.ts:181`), which is cookie-based too.

**OBS-SDK-003: The one existing multi-app pattern is same-origin-ish and
read-only.** `apps/guild` and `apps/club` consume the API through
`apps/*/src/trpc/server.ts` — server-side callers, not browsers, and both are
first-party Next apps in the same deployment family. That pattern extends to a
hackathon app's *server* but not to its *browser*, and it carries no notion of
scoping a caller to one hackathon.

**OBS-SDK-004: Nothing scopes a caller to a hackathon.** Every current
permission is global (`packages/consts/src/permissions.ts`). There is no
"this token may only read BloomKnights" concept anywhere in the schema, the
permission model, or the procedure builders.

### The event-system fence

**OBS-FENCE-001.** Reforge's event domain rejects hackathon events at every
layer:

- `assertClubEvent` throws when `event.hackathonId !== null`
  (`packages/api/src/utils/events/access.ts:22-26`).
- Club queries filter `isNull(Event.hackathonId)` in at least eight places
  (`packages/api/src/utils/events/queries.ts:85,112,161,209,291,561,609,656`).
- Event creation hard-codes `hackathonId: null`
  (`packages/api/src/routers/event.ts:791`).
- Discovery, feedback, reminders, issues, and alumni all exclude them
  (`packages/api/src/utils/events/discovery.ts:75,204,336,487`,
  `packages/api/src/utils/events/feedback.ts:236`,
  `packages/api/src/utils/events/reminders.ts:37`,
  `packages/api/src/routers/issues.ts:276,1249`,
  `packages/api/src/routers/alumni.ts:328`).

**OBS-FENCE-002.** The schema's own invariants exempt hackathon events. Two
`CHECK` constraints read
`legacy OR hackathonId IS NOT NULL OR (<Reforge invariant>)`
(`packages/db/src/schemas/knight-hacks.ts:488,500`). The invariants are "points
must be non-null and non-negative" and "creationKey and creationPayloadHash must
be present."

That is: **hackathon events are currently classified alongside legacy rows as
exempt from Reforge's event-integrity rules.** "Extensible from Club events" is
true of the table and false of the guard rails — the extension is a policy
decision plus possibly a migration, not a flag flip.

### Routing and QR

**OBS-ROUTE-001.** `apps/blade/src/app/dashboard/page.tsx` is an unconditional
redirect to the member dashboard. Legacy's `/dashboard` branched on member
versus hacker versus neither (`legacy/apps/blade/CURRENT.md:153-174`). Under the
new direction this fork should *not* come back — but the application entry
point still has to live somewhere.

**OBS-ROUTE-002.** Blade admin navigation lists twelve surfaces, none hackathon
(`apps/blade/src/app/_components/shared/admin-navigation.ts:53-133`).

**OBS-QR-001.** Current `getQRCode` requires a member profile and throws
`NOT_FOUND` with "Create a member profile before viewing your QR code."
(`packages/api/src/routers/qr.ts:15-30`). Legacy issued a code for any
authenticated user (`legacy/packages/api/src/routers/qr.ts:11-14`). A hackathon
attendee who is not a club member cannot obtain a check-in code today. The
scanner side is already compatible; only generation is gated.

## Observed Functional Requirements

### Hackathon lifecycle

**OBS-HACK-001: Five-date window.** A hackathon carries `applicationOpen`,
`applicationDeadline`, `confirmationDeadline`, `startDate`, `endDate`, ordered
open < application deadline ≤ confirmation deadline ≤ start < end.
Evidence: `packages/validators/src/hackathons.ts:96-153`,
`packages/db/src/schemas/knight-hacks.ts:96-101`.

**OBS-HACK-002: Unique name, separate display name.** `name` is unique and
route-shaped (lowercase, hyphenated, 2–64 chars); `displayName` is the human
label. Evidence: `packages/db/src/schemas/knight-hacks.ts:89-90,103-105`,
`packages/validators/src/hackathons.ts:3-19`.

**OBS-HACK-003: "Current hackathon" is derived, not flagged.** Legacy resolves
the active hackathon as *the future hackathon with the start date closest to
now*, and re-derives it independently in several procedures.
Evidence: `legacy/packages/api/src/routers/hackers/queries.ts:252-263`,
`legacy/packages/api/src/routers/hackers/mutations.ts:357-368`.

> **Inference, flagged.** This rule silently yields nothing during and after the
> event — the hackathon stops being "current" the moment it starts. Any surface
> that must work *during* the hackathon (check-in, judging, live leaderboards,
> and every per-hackathon dashboard) cannot use it. Legacy worked around it
> per-call.

### Hacker application

**OBS-APP-001: Per-hackathon application.** A user applies to a specific
hackathon by id; application state lives on `HackerAttendee`, not `Hacker`. The
`Hacker` row is the person; the attendee row is their participation in one
event. Evidence:
`legacy/apps/blade/src/app/hacker/application/[hackathon-id]/page.tsx`,
`packages/db/src/schemas/knight-hacks.ts:617-641`.

**OBS-APP-002: Seven application states.** `withdrawn`, `pending`, `accepted`,
`waitlisted`, `checkedin`, `confirmed`, `denied`.
Evidence: `packages/consts/src/forms/index.ts:342`,
`packages/api/src/routers/email.ts:298-306`.

**OBS-APP-003: Prefill.** Legacy reads current member state and previous hacker
data to prefill the application. Evidence: `legacy/apps/blade/CURRENT.md:238-243`,
`legacy/packages/api/src/routers/hackathon.ts:149` (`getPreviousHacker`).

**OBS-APP-004: MLH consent fields.** Three MLH agreements plus food allergies,
first-time-hacker status, and two free-text survey answers.
Evidence: `packages/db/src/schemas/knight-hacks.ts:253-263`.

**OBS-APP-005: Self-service confirm.** A hacker may confirm only from
`accepted`; confirming from `confirmed` returns `UNAUTHORIZED` ("already
confirmed") and from any other state `UNAUTHORIZED` ("not accepted").
Evidence: `legacy/packages/api/src/routers/hackers/mutations.ts:389-397`.

> **Observed defect.** `confirmHacker` resolves the hackathon by the
> closest-future rule (OBS-HACK-003) rather than by the attendee row it is about
> to update. A hacker confirming after the hackathon starts, or once a later
> hackathon exists, targets the wrong row or fails outright.

**OBS-APP-006: Confirmation deadline is UI-enforced.**
`legacy/apps/blade/CURRENT.md:254` records that confirmation deadlines and
status constraints are enforced "in the UI." No server-side deadline check
exists in `confirmHacker`. **If dashboards move to third-party apps, every
UI-enforced rule becomes unenforced.**

### Hacker administration

**OBS-ADM-001: Server-side pagination with faceted filters.** Three separate
procedures — `getHackersPage`, `getHackerCount`, `getHackerFilterOptions`.
Filters cover school, major, race, gender, graduation year, status.
Evidence: `legacy/packages/api/src/routers/hackers/pagination.ts:13,195,305`,
`legacy/apps/blade/CURRENT.md:450-453`.

**OBS-ADM-002: Status count cards.** `statusCountByHackathonId`.
Evidence: `legacy/packages/api/src/routers/hackers/queries.ts:420`.

**OBS-ADM-003: Status transitions are one generic mutation.**
`updateHackerStatus` handles accept, deny, waitlist, blacklist, and toggles.
Evidence: `legacy/packages/api/src/routers/hackers/mutations.ts:866`.

> `blacklisted` appears as a hacker state in `legacy/apps/blade/CURRENT.md:25`
> and as an email kind in `packages/email/src/hackathons/templates.ts:2`, but is
> not among the seven enum values. Confirm whether it is retired or unmodelled.

### Hackathon events and check-in

**OBS-EVT-001: Hackathon check-in is a distinct operation.** `eventCheckIn`
requires `CHECKIN_HACK_EVENT` or `EDIT_HACKERS`, rejects any event whose
`hackathonId` is null, and resolves the hacker by `(userId, hackathonId)` rather
than by member id.
Evidence: `legacy/packages/api/src/routers/hackers/mutations.ts:523-595`.

**OBS-EVT-002: Two separate point ledgers.** Club points accrue on
`Member.points`; hackathon points on `HackerAttendee.points`, scoped per
hackathon. Evidence: `packages/db/src/schemas/knight-hacks.ts:126,638`.

**OBS-EVT-003: Class-scoped and repeatable check-in.** `eventCheckIn` accepts
`assignedClassCheckin` (`"All"` or one of six hacker classes) and a
`repeatedCheckin` boolean.
Evidence: `legacy/packages/api/src/routers/hackers/mutations.ts:530-544`,
`packages/db/src/schemas/knight-hacks.ts:594-616`.

**OBS-EVT-004: Hackathon events cannot require dues.**
Evidence: `legacy/apps/blade/CURRENT.md:398`.

**OBS-GAME-001: Two teams, six classes, one special class.** `Humanity` and
`Monstrosity`; classes `Operator`, `Mechanist`, `Sentinel`, `Harbinger`,
`Monstologist`, `Alchemist`; special class `VIP`. `getPointsByClass` sums points
per class; `getTopHackers` ranks within a class. `HACKER_TEAMS` is exported but
**no column stores a team** — only `class` is persisted.
Evidence: `packages/db/src/schemas/knight-hacks.ts:594-616,640`,
`legacy/packages/api/src/routers/hackers/queries.ts:232-285,286`.

### Judging

**OBS-JUDGE-001: A judge is a row, not a user.** `Judges` is
`(name, roomName, challengeId)` with no user reference. A judge is identified by
selecting their name in the UI.
Evidence: `packages/db/src/schemas/knight-hacks.ts:809-820`,
`legacy/apps/blade/CURRENT.md:530`.

**OBS-JUDGE-002: HMAC magic-link sessions.** Judge access is granted by a
hand-rolled HS256 JWT signed with an HMAC secret, carrying `sub`, `roomName`,
`iat`, `exp`, 15-minute default TTL, 30-second skew allowance, constant-time
verification. Evidence: `legacy/packages/api/src/routers/judge.ts:30-127`.

**OBS-JUDGE-003: Room-scoped sessions.** `activateToken` exchanges a magic token
for a room session cookie; officers enumerate rooms with live session counts and
clear sessions per room from the control room.
Evidence: `legacy/packages/api/src/routers/judge.ts:226,558,576,589`,
`legacy/apps/blade/src/app/judge/{activate,session}/route.ts`.

**OBS-JUDGE-004: Five-criterion rubric.** `originality_rating`, `design_rating`,
`technical_understanding_rating`, `implementation_rating`, `wow_factor_rating`,
all `integer NOT NULL`, plus `privateFeedback` and `publicFeedback`.
Evidence: `packages/db/src/schemas/knight-hacks.ts:822-846`.

> **Observed defect.** Both feedback columns are `varchar(255)`. Judge prose
> silently truncating at 255 characters is a plausible operational complaint.

> **Observed defect.** No `CHECK` constrains the five ratings to a range.

**OBS-JUDGE-005: Duplicate-submission guard.** A judge may score a submission
once (`CONFLICT` on retry), and only where `judge.challengeId` matches
`submission.challengeId` (`FORBIDDEN` otherwise).
Evidence: `legacy/packages/api/src/routers/judge.ts:298-318`.

**OBS-JUDGE-006 (security): rubric submission is unauthenticated.**
`createJudgedSubmission` is declared on `publicProcedure`, not `judgeProcedure`.
The only checks are existence of the submission, existence of the judge, and
matching challenge ids. Any anonymous caller holding a `submissionId` and a
`judgeId` — both plain UUIDs, both returned by `getSubmissions` and `getJudges`,
and `getJudges` is itself `publicProcedure` — can write a rubric score.
Evidence: `legacy/packages/api/src/routers/judge.ts:183,262-326`.

> This must not be carried forward as written.

### Devpost import

**OBS-CSV-001.** `csvImporter.import` is a `permProcedure` requiring
current-hackathon context; it populates `Teams`.
Evidence: `legacy/packages/api/src/routers/csv-importer.ts:27`,
`legacy/apps/blade/CURRENT.md:612-620`.

**OBS-CSV-002.** `Teams.matchKey` is unique and formatted
`${firstName}_${lastName}:${createdAt}:${projectTitle}`. Re-importing after a
Devpost title edit produces a second team rather than updating the first,
because the title is part of the identity key.
Evidence: `packages/db/src/schemas/knight-hacks.ts:800-805`.

### Analytics

**OBS-ANL-001.** Legacy hackathon analytics covers application and confirmation
counts over time, first-time-hacker share, level of study, shirt size, school,
major, race/ethnicity, gender, food/allergy data, plus an event-analytics tab.
Evidence: `legacy/apps/blade/CURRENT.md:483-494`.

**OBS-ANL-002.** The current analytics router exports three procedures
(`getDiscordReport`, `getReport`, `exportReport`) and is Club-scoped.
Evidence: `packages/api/src/routers/analytics.ts:15,23,31`.

## Dead Assets

**OBS-DEAD-001: `Sponsor` and `HackathonSponsor` are unreferenced.** Both tables
exist in the current schema. No read or write found in `packages/api/src`, any
`apps/*/src`, `legacy/packages/api/src`, or `legacy/apps/blade/src`. Challenge
sponsorship is instead a free-text `Challenges.sponsor` column.
Evidence: `packages/db/src/schemas/knight-hacks.ts:342-363,740`.

**OBS-DEAD-002: `OtherCompanies` is Legacy-only.** Written by the Legacy member
router's free-text "how did you hear about us" capture, read by the Legacy
`companies` router. Current Reforge has a richer `Company` table and a `career`
router; nothing reads `OtherCompanies`.
Evidence: `legacy/packages/api/src/routers/companies.ts:6`,
`legacy/packages/api/src/routers/member.ts:89,193`,
`packages/db/src/schemas/knight-hacks.ts:111,848-852`.

## Work Areas

**Provisional grouping, not a proposed bundle plan.** These are six areas the
findings fall into, matching the owner's own decomposition. No `.forge/features`
bundle has been opened for any of them and the sequencing below is an
observation about dependencies, not a schedule.

Area 1 is a hard prerequisite for everything. Areas 2 and 4 depend on it and on
each other's contract. 3, 5, 6 are independent once 1 lands.

### Bundle 1 — Hackathon Configuration

The prerequisite, and the one whose value is mostly *deletion*.

Scope:

- A `hackathon` router: list, get by id, get by route name, get managed, create,
  update. Validation is already written and shared
  (`packages/validators/src/hackathons.ts`).
- `/admin/hackathon` management route plus its navigation entry.
- **Move the hardcoded per-hackathon config into rows.** Concretely, the
  Listmonk template ids, the preset key union, and the compile-time default in
  `packages/email/src/hackathons/templates.ts:12-60` become hackathon-owned
  data. Adding a hackathon stops being a deploy.
- Restore or replace the dropped background preset list (OBS-CONFIG-003).
- One authoritative definition of "the current hackathon," replacing three
  divergent inline derivations (OBS-HACK-003).

Why first: five of the six bundles take a `hackathonId`, and four of them need
"current." Getting that definition wrong once is cheap; getting it wrong after
four bundles depend on it is not.

**The decision inside this bundle:** the per-status email mapping (OBS-CONFIG-002).
Six template kinds do not line up with seven statuses. Until that is settled, the
"configure email per status" UI has no shape.

### Bundle 2 — Hacker Management

Scope:

- Paginated, searchable, faceted hacker table (school, major, race, gender, grad
  year, status).
- Status count cards.
- Status transitions: accept, deny, waitlist, withdraw, and a decision on
  blacklist (OBS-ADM-003).
- Hacker detail view, edit, destructive delete.
- Per-status email configuration surfaced on the hackathon config page, and sends
  triggered from status changes.

Strongest existing seam in the whole surface: the email portal already resolves
audiences by hackathon and status
(`packages/api/src/routers/email.ts:274-309`,
`packages/api/src/utils/email/campaign.ts:85-96`). Decision emails are close to
wired the moment statuses become settable and templates become data.

**Open dependency:** this bundle manages hacker rows. Something has to *create*
them. See the open question below.

### Bundle 3 — Judging

The beast, correctly identified. Effectively a second application with a second
auth model, and the only surface whose actors are not Blade users.

Scope:

- Challenges, teams, submissions, judges, judged submissions.
- A judge auth path — magic-link issuance, activation, room-scoped sessions
  (OBS-JUDGE-002, OBS-JUDGE-003). Legacy's `judgeProcedure` has no current
  equivalent.
- Judge portal: dashboard, rubric, results.
- Officer tooling: judge assignment, room assignment, control room.
- Devpost CSV import into `Teams` — folded in here rather than standing alone,
  since it exists only to populate the judging queue. Fix or accept the
  `matchKey` fragility (OBS-CSV-002).

Must-fix on carry:

- `createJudgedSubmission` must not remain public (OBS-JUDGE-006).
- Feedback columns need more than 255 characters.
- Rubric ratings need a range constraint.
- Decide whether judge identity stays self-asserted by name selection
  (OBS-JUDGE-001) or whether the magic link binds to a judge row.

This bundle is independent enough to run in parallel with 1→2 given capacity,
and large enough to deserve its own artifact bundle.

### Bundle 4 — Hackathon Dashboard SDK

The genuinely net-new bundle. No Legacy analogue — Legacy's dashboard was inside
Blade. This is a platform-boundary design task, not a port.

Scope:

- A credential model that lets `apps/bloomknights` (and successors)
  authenticate against Blade. Today this is impossible in a browser:
  `Access-Control-Allow-Origin: *` and cookie auth are mutually exclusive
  (OBS-SDK-001), and no bearer/API-key procedure builder exists (OBS-SDK-002).
- Hackathon-scoped authorization. Every current permission is global; nothing
  can express "this caller may only read BloomKnights" (OBS-SDK-004).
- A published, versioned endpoint surface — the "hack endpoints" a dashboard
  ingests: hacker's own status, confirm, withdraw, QR, schedule, points,
  leaderboard.
- A client package for the hackathon apps to consume.
- **Server-side enforcement of everything the Legacy UI enforced.** Confirmation
  deadlines were UI-only (OBS-APP-006). Once the UI is a third-party app, UI
  enforcement is worth nothing.

Considerations:

- The wildcard CORS on `apps/blade/src/app/api/trpc/[trpc]/route.ts:8-13` is
  worth revisiting regardless — it is permissive without buying anything, since
  credentials cannot ride on it.
- Two of the three procedure builders assume a Discord session. A hacker who
  never joins the Discord is a case the platform does not currently model.
- Blade must stop being the place hackers land, but `/hacker/application/<name>`
  is hardcoded in two satellite apps (OBS-CONFIG-004). Whatever replaces it
  needs a migration story for links already in the wild.

### Bundle 5 — Hackathon Events and Points

"Extensible from Club events" is true of the table and false of the guard rails.

Scope:

- A deliberate policy for hackathon events in the Reforge event system: which of
  the eight Club-scoped filters become hackathon-aware, and which stay Club-only
  (OBS-FENCE-001).
- Decide whether hackathon events keep their `CHECK`-constraint exemption or
  adopt the Reforge invariants (OBS-FENCE-002) — the latter is a migration.
- Hackathon event CRUD, `HackerEventAttendee` writes.
- Check-in with class scoping and repeat policy (OBS-EVT-003).
- Points to `HackerAttendee.points`, kept distinct from `Member.points`
  (OBS-EVT-002).
- Class/team gamification: per-class totals, top-hacker rankings, leaderboards.
  Note `HACKER_TEAMS` has no persisted column and the class names are one
  year's theme.
- QR generation for hacker-only users (OBS-QR-001).

**The real cost here is policy, not code.** The current event system carries
Discord sync, Google Calendar sync, lease tokens, revision counters, feedback
config, and reminder delivery — none of which Legacy hackathon events had.
"Hackathon events work like Club events" is a much bigger claim in Reforge than
it was in Legacy. Deciding they are a *separate, simpler* entity is a defensible
alternative that deserves an explicit answer rather than a default.

### Bundle 6 — Hackathon Analytics

Cheapest bundle by a wide margin. Application/confirmation timelines and
applicant demographics, mirroring the existing Club dashboard.
`packages/api/src/utils/analytics/club-report.ts` and the whole
`apps/blade/src/app/_components/admin/analytics/` chart layer already exist and
are pattern-matched.

## Cross-Cutting Considerations

1. **"Current hackathon" is the keystone.** The closest-future rule breaks the
   instant a hackathon begins — precisely when check-in, judging, leaderboards,
   and every per-hackathon dashboard need it. Every bundle after 1 inherits
   whatever is decided here.

2. **Moving the dashboard out moves the trust boundary out.** Legacy leaned on
   UI enforcement in at least one documented place (OBS-APP-006). A third-party
   dashboard makes every such rule unenforced by construction. Bundle 4 is
   partly an audit: find each UI-only rule and push it into the API.

3. **The fence is load-bearing.** `isNull(Event.hackathonId)` is what lets the
   Club event system assume dues, roles, feedback, reminders, Discord sync, and
   Google sync all apply. Reopening it without a policy risks hackathon events
   appearing in Club analytics, Club feedback prompts, Club reminder emails, and
   the operations calendar.

4. **Two point ledgers, one person.** A person can be both member and hacker.
   `Member.points` and `HackerAttendee.points` are separate. Any unified "your
   points" surface — especially one rendered by a hackathon app — has to decide
   which it means.

5. **Judges are the only non-Discord actors today; SDK callers will be the
   second.** Both bundles 3 and 4 add an auth path. Designing them
   independently risks two bespoke mechanisms. Designing them together may not
   be right either — a volunteer judge and a first-party hackathon app are very
   different threat models — but the choice should be made once, deliberately.

6. **Legacy hackathon code is a stale reference, not a source.** `legacy/` is
   outside the pnpm workspace, and
   `legacy/packages/api/src/routers/hackathon.ts` imports a `HACKATHONS` const
   that no longer exists. It does not typecheck against current packages. Read
   it for behavior, not for code.

7. **The forms platform is available leverage.** Member signup runs as a
   code-owned dynamic form with a transactional callback at `/form/[slug]`
   (`.forge/features/initial-member-onboarding/spec.md:13-15,85-92`), and the
   callback registry (`packages/api/src/utils/forms/callbacks.ts:14-39`) is
   built for exactly this shape. Whether the hacker application uses it depends
   entirely on where the application ends up living.

8. **Two dead schema regions.** `Sponsor`/`HackathonSponsor` and
   `OtherCompanies` have no consumers anywhere. Decide whether hackathon
   sponsorship is real — if so those tables are a start; if not, cleanup.

## Uncertainties and Reverse-Prompt Questions

### Settled

**Where the hacker application lives — decided 2026-07-29.** The application
moves into each hackathon app alongside the dashboard. Blade keeps the data and
the rules; the hackathon app owns the whole hacker-facing experience.

Consequences, all of which become work items in area 4:

- The SDK is **read-write**, not read-mostly. It accepts untrusted intake.
- **Applicants must be Blade users.** `Hacker.userId` is
  `NOT NULL REFERENCES User(id)`
  (`packages/db/src/schemas/knight-hacks.ts:224-227`), so an applicant has a
  Discord-backed Blade account before a `Hacker` row can exist. The hackathon
  app therefore needs *user* auth, not just service auth — two credentials, not
  one.
- **The sign-in round trip does not currently come back.**
  `sanitizeCallbackURL` returns `/` for any callback whose origin is not
  Blade's (`packages/auth/src/callback-url.ts:10-13`), and Better Auth's
  `baseURL` is Blade (`packages/auth/src/config.ts:87-88`). A hackathon app
  cannot sign a hacker in and receive them back today.
- **Every field rule becomes server-side or it does not exist.** Legacy's
  application constraints lived in the form component. A third-party client
  cannot be trusted to enforce them.
- **MLH consent capture moves to a third-party surface.** Three agreement
  columns (`packages/db/src/schemas/knight-hacks.ts:257-263`) whose wording is
  an MLH compliance matter. If each app renders its own checkboxes, each app can
  get them wrong. Argues for the SDK shipping the consent block, not just the
  endpoint.
- **Application creation becomes a publicly reachable write.** Rate limiting,
  deduplication, and abuse handling are new requirements with no Legacy
  precedent.
- The two hardcoded `blade.knighthacks.org/hacker/application/<name>` links
  (OBS-CONFIG-004) need a redirect story for links already in the wild.
- The forms platform is largely out of play for intake.

Already in Reforge's favour: resume storage anticipates hackers — 
`getReferencedResumeObjectsForUser` queries both `Member` and `Hacker`
(`packages/api/src/utils/resume/storage.ts:83-95`) — and
`packages/validators/src/upload-policy.ts` already states that the server is
"the only tier that decides anything," which is exactly the posture untrusted
intake needs.

### Configuration

- [ ] What is the authoritative definition of "the current hackathon"? Explicit
      `isActive` flag, date-range containment, or officer-selected pointer?
- [ ] Do multiple hackathons ever overlap?
- [ ] What is the intended email-kind → status mapping (OBS-CONFIG-002)? Is
      `Capacity` a status-triggered email at all?
- [ ] Should template ids stay Listmonk numeric ids in rows, or should templates
      be authored in the existing email portal?
- [ ] Besides email templates and backgrounds, what other per-hack config is
      currently hardcoded and should land here?

### Hacker management

- [ ] Is `blacklisted` a real state? It is an email kind and a documented state
      but not an enum value.
- [ ] Should status changes send email automatically, or stay manual through the
      email portal?

### SDK

- [ ] Do hackathon apps call Blade from the browser, from their own server, or
      both? Browser is the hard case and drives the whole credential design.
- [ ] What is the credential — per-hackathon API key, OAuth client, signed
      service token?
- [ ] Is the scope hackathon-wide read plus hacker-self write, or finer?
- [ ] Do hackers authenticate with Discord in the hackathon app, or does the app
      hold its own session?
- [ ] Is the SDK a published package, a generated client, or plain REST?

### Events and points

- [ ] Are hackathon events the same entity as Club events in Reforge, or a
      separate, simpler one?
- [ ] Should they adopt the Reforge event invariants or keep the exemption?
- [ ] Do they need Discord/Google sync, feedback, or reminders?
- [ ] Is the class/team system still run, or was it one year's theme? If it
      stays, should `HackerAttendee` gain a team column?

### Judging

- [ ] Should judges authenticate as themselves, or is a room-scoped shared
      session still acceptable?
- [ ] Is the five-criterion rubric still the rubric, and what is the scale?
      Nothing in the schema says.
- [ ] Are results public to hackers, or officer-only?
- [ ] Does judging need to appear in a hackathon app's dashboard, or does it stay
      entirely in Blade?

## Recommendation

Bundle 1 alone, first. It is small, its validation is already written, and it
forces the "current hackathon" decision plus the email-mapping decision that
bundles 2, 4, and 5 all inherit. Its most valuable output is deleting the
hardcoded template table.

Then answer the blocking question above before starting 2 or 4, because it
determines whether they are one campaign or two.

Bundle 3 can start in parallel at any point after 1 — it shares only
`hackathonId` with the rest, and it is carrying a live security defect that must
not be reproduced.

Bundle 5 is the one to scope carefully rather than schedule eagerly; its cost is
almost entirely in the event-system policy decision.

Bundle 6 last, and nearly free.

## Evidence Index

- `packages/api/src/root.ts`, `packages/api/src/trpc.ts`
- `packages/api/src/routers/{analytics,email,event,qr}.ts`
- `packages/api/src/utils/events/{access,attendance,queries,discovery,feedback,reminders}.ts`
- `packages/api/src/utils/email/{campaign,audience}.ts`
- `packages/api/src/utils/forms/callbacks.ts`
- `packages/db/src/schemas/knight-hacks.ts`
- `packages/consts/src/permissions.ts`, `packages/consts/src/forms/index.ts`
- `packages/validators/src/hackathons.ts`
- `packages/email/src/hackathons/templates.ts`
- `apps/blade/src/app/api/trpc/[trpc]/route.ts`
- `apps/blade/src/app/dashboard/page.tsx`
- `apps/blade/src/app/_components/shared/admin-navigation.ts`
- `apps/blade/src/app/_components/admin/events/event-check-in-panel.tsx`
- `apps/bloomknights/src/app/_components/register/registerButton.tsx`
- `apps/2025/src/app/_components/hero/register-button.tsx`
- `.forge/features/initial-member-onboarding/spec.md`, `.forge/features/*/status.md`
- `legacy/apps/blade/CURRENT.md`, `legacy/apps/blade/src/consts/index.ts`
- `legacy/packages/api/src/root.ts`, `legacy/packages/api/src/trpc.ts`
- `legacy/packages/api/src/routers/{hackathon,judge,challenges,csv-importer,companies,qr}.ts`
- `legacy/packages/api/src/routers/hackers/{queries,mutations,pagination}.ts`
- `legacy/packages/api/src/qr-code.ts`
- `pnpm-workspace.yaml`
