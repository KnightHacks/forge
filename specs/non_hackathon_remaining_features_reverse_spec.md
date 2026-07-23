# Reverse-Engineered Specification: Remaining Non-Hackathon Features

Date: 2026-07-23

## Overview

This review covers the current Reforge worktree, the maintained feature
artifacts, and the non-hackathon behavior still present in Legacy. It excludes
Hackathon, hacker, judging, and TK work.

The main conclusion is that the non-hackathon core platform is substantially
complete. Reforge now covers member onboarding and profile management, mobile
member experience, QR identity, dues, member administration, role management,
Club events and check-in, forms and event feedback, analytics, and Club-wide
issue management.

Only two substantial product systems remain strongly supported by repository
evidence:

1. **Club Engagement & Rewards** — turn the existing, fragmented point writes
   into a member-visible, auditable engagement system and absorb the old
   banquet raffle into it.
2. **Guild Talent Network & Sponsor Recruiting** — finish the Guild product
   with the audience tiers already promised during onboarding, safe resume
   access, and working member/roster consumers.

A **Digital Member Credential** is a smaller optional extension. It is real
legacy behavior, but it should follow the two systems above or be folded into a
future member-experience bundle.

Everything else found in the review is either:

- rollout or data repair;
- an intentionally deferred enhancement to an already complete product;
- a net-new idea without meaningful Legacy evidence; or
- Hackathon work, which is outside this review.

## Analysis Boundary

### Included

- `.forge/features/*` product, technical, test, and status artifacts.
- `apps/blade` member and officer surfaces.
- `apps/guild` member-directory surface.
- `apps/club` public Club site and team-roster integration.
- `apps/cron` non-hackathon operational jobs.
- `packages/api`, `packages/db`, `packages/validators`, and supporting packages.
- Relevant non-hackathon behavior in `legacy/apps/blade` and
  `legacy/packages/api`.

### Excluded

- `apps/tk` and all TK interface changes.
- Hacker applications, Hackathon administration, Hackathon event operations,
  judging, challenge assignment, and Hackathon analytics.
- Cleanup-only work unless it blocks a product rollout.
- Product ideas with no material code, artifact, or Legacy evidence.

## Architecture Summary

### Technology Stack

- **Language:** TypeScript on Node.js 20 or newer.
- **Workspace:** pnpm 9 and Turborepo.
- **Web:** Next.js 16, React 19, Tailwind CSS, and shared Forge UI components.
- **API:** tRPC with Zod validation.
- **Database:** PostgreSQL with Drizzle ORM and additive migrations.
- **Identity and authorization:** Discord-backed authentication plus
  database-linked role permissions.
- **Storage and integrations:** MinIO, Discord, Google Calendar, Stripe, and
  cron workers.

Evidence:

- `package.json`
- `apps/blade/package.json`
- `packages/api/package.json`
- `packages/db/package.json`

### Module Structure

```text
apps/
├── blade/       member and officer product
├── club/        public Club site and public team roster
├── cron/        scheduled operational work
└── guild/       member talent directory
packages/
├── api/         authorization and application workflows
├── db/          PostgreSQL schema and migrations
├── validators/  shared request and domain validation
└── ui/          shared interface primitives
.forge/features/ approved feature contracts and implementation records
legacy/           old-world behavior retained for archaeology
```

### Current Data Flow

```text
Blade / Guild / Club
        │
        ▼
   tRPC router
        │
        ├── permission and ownership checks
        ├── domain workflow
        ├── PostgreSQL / MinIO
        └── Discord / Google / Stripe
```

The current API exports routers for analytics, authentication, dues, Club
events, forms, issues, members, profile pictures, QR codes, resumes, and roles.
It does not export a Guild router.

Evidence: `packages/api/src/root.ts:1-55`.

## Implemented Capability Map

The maintained feature artifacts report the following non-hackathon bundles as
complete:

| Product area                   | Artifact                    | State                                              |
| ------------------------------ | --------------------------- | -------------------------------------------------- |
| Member onboarding              | `initial-member-onboarding` | Complete                                           |
| Member profile editing         | `member-field-editing`      | Complete                                           |
| Mobile member experience       | `mobile-member-experience`  | Complete                                           |
| Member QR identity             | `member-qr-codes`           | Complete                                           |
| Member dues                    | `member-dues-payment`       | Complete                                           |
| Member administration          | `admin-member-dashboard`    | Complete                                           |
| Role and permission management | `role-management`           | Complete                                           |
| Club events and check-in       | `event-management`          | Complete                                           |
| Forms and event feedback       | `forms-and-event-feedback`  | Complete                                           |
| Club analytics                 | `club-analytics`            | Complete                                           |
| Club operations issues         | `club-operations-issues`    | Implementation complete; rollout preflight remains |

Evidence: `.forge/features/*/status.md:3`.

The current Blade route surface confirms that the primary member and officer
journeys exist:

- member dashboard, dues, events, forms, settings, and form response;
- officer analytics, check-in, events, forms, issues, members, and roles.

The only meaningful non-hackathon Legacy routes not represented as current
Blade routes are the banquet raffle and the old admin landing page. The landing
page was explicitly replaced by permission-aware navigation, and the raffle is
too narrow to port without fixing the underlying points model.

Evidence:

- `apps/blade/src/app/**/page.tsx`
- `legacy/apps/blade/src/app/**/page.tsx`
- `.forge/features/role-management/spec.md:87-97`
- `legacy/apps/blade/CURRENT.md`

## Observed Functional Requirements

These are behaviors observed in the current or Legacy implementation. They are
not proposed scope.

### Core Coverage

**OBS-COV-001: Completed Reforge bundles**

The Reforge artifact system shall record onboarding, profile editing, mobile
member experience, QR identity, dues, member administration, roles, Club
events, forms and feedback, analytics, and Club issues as complete or
implementation complete.

Evidence: `.forge/features/*/status.md:3`.

**OBS-COV-002: Current non-hackathon API**

The current API shall expose the implemented non-hackathon domains through
typed tRPC routers and shall not expose the Legacy Guild router.

Evidence: `packages/api/src/root.ts:19-55`.

### Points and Engagement

**OBS-PTS-001: Aggregate member balance**

The current system shall store one mutable aggregate point balance on each
member, defaulting to zero.

Evidence: `packages/db/src/schemas/knight-hacks.ts:126`.

**OBS-PTS-002: Event point configuration**

Where a Club event tag is configured, the current system shall store a
non-negative default point value and allow an event to capture its point value.

Evidence:

- `packages/db/src/schemas/knight-hacks.ts:221-238`
- `packages/db/src/schemas/knight-hacks.ts:269`

**OBS-PTS-003: Check-in award**

When a member is checked into an event for the first time, the current system
shall record the points awarded on the attendance row and increment the
member's aggregate balance. When repeat check-in is allowed for an existing
attendance, the additional award shall be zero.

Evidence:

- `packages/api/src/utils/events/attendance.ts:175-206`
- `packages/api/src/utils/events/database-attendance.ts:109-127`

**OBS-PTS-004: Attendance reversal**

When an attendance row with a known award is removed, the current system shall
decrement the member's aggregate balance by the captured award. When the
captured award is unavailable, the current system shall reject the reversal as
a conflict.

Evidence:

- `packages/api/src/utils/events/attendance.ts:226-252`
- `packages/api/src/utils/events/database-attendance.ts:129-143`

**OBS-PTS-005: Feedback reward**

When a member submits the first eligible event-feedback response, the current
system shall record one feedback reward and increment the aggregate member
balance. The current schema fixes that reward at five points and prevents more
than one reward for the same event and member.

Evidence:

- `packages/db/src/schemas/knight-hacks.ts:987-1048`
- `packages/api/src/utils/events/feedback.ts:720-755`
- `packages/api/src/utils/events/database-feedback.ts:378-426`

**OBS-PTS-006: Direct administrative mutation**

While the caller can edit members, when an officer updates a member, the
current system shall allow the aggregate point value to be replaced directly
and shall attempt a Discord audit log.

Evidence: `packages/api/src/routers/member-admin.ts:531-563`.

**OBS-PTS-007: Missing unified history**

The current system shall retain source-specific attendance and feedback reward
records, but no general point-ledger table or member-facing point-history query
is observed.

Evidence:

- `packages/db/src/schemas/knight-hacks.ts:410-443`
- `packages/db/src/schemas/knight-hacks.ts:1023-1049`
- `packages/api/src/root.ts:19-55`
- `apps/blade/src/app/_components/member/dashboard-client.tsx:214-270`

**OBS-PTS-008: Legacy banquet weighting**

While a member has more than 100 points, when Legacy builds the banquet raffle,
the system shall add the member to the draw approximately once per ten points.
The Legacy route shall be officer-only.

Evidence: `legacy/apps/blade/src/app/admin/banquet-raffle/page.tsx:13-45`.

### Guild and Recruiting

**OBS-GUILD-001: Member-controlled visibility contract**

While a Guild profile is private, the product contract shall keep it visible
to sponsors and Knight Hacks staff. While it is public, the contract shall
also make it visible to other members on `guild.knighthacks.org`.

Evidence:

- `.forge/features/initial-member-onboarding/spec.md:44-53`
- `.forge/features/initial-member-onboarding/spec.md:118-124`

**OBS-GUILD-002: Legacy directory discovery**

When the Legacy Guild member directory is queried, it shall return only
members whose single `guildProfileVisible` flag is true and shall support
pagination, text search, and current/alumni filtering.

Evidence: `legacy/packages/api/src/routers/guild.ts:506-580`.

**OBS-GUILD-003: Legacy public roster**

When the public Club site requests a team roster, the Legacy system shall
derive role-based team buckets and return a limited public projection for
opted-in Guild profiles.

Evidence:

- `legacy/packages/api/src/routers/guild.ts:315-388`
- `legacy/packages/api/src/routers/guild.ts:582-584`

**OBS-GUILD-004: Legacy resume access**

When any caller supplies a member ID to the Legacy Guild resume procedure, the
Legacy system shall issue a one-hour presigned resume URL when a resume exists.
The procedure is public and does not enforce the sponsor/staff/member audience
contract.

Evidence: `legacy/packages/api/src/routers/guild.ts:586-628`.

**OBS-GUILD-005: Current owner-only resume access**

When the signed-in member requests their own resume, the current system shall
verify object ownership and issue a one-hour presigned URL. It shall reject an
object that does not belong to the current user.

Evidence:

- `packages/api/src/routers/resume.ts:13-44`
- `packages/api/src/utils/resume/storage.ts:185-218`

**OBS-GUILD-006: Current consumer/API mismatch**

When the current Guild app loads, it expects `guild.getGuildMembers`; when the
public Club site loads its team roster, it expects
`guild.getPublicClubTeamRoster`. The current API root exports neither
procedure.

Evidence:

- `apps/guild/src/app/page.tsx:34-40`
- `apps/guild/src/app/_components/resume-button.tsx:19`
- `apps/club/src/app/teams/team-roster.ts:4-11`
- `packages/api/src/root.ts:19-55`

### Member Credential

**OBS-CRED-001: Current QR identity**

While a signed-in member has a completed profile, when they open the QR action,
the current product shall generate a view-only QR code whose payload is the
stable auth user ID.

Evidence: `.forge/features/member-qr-codes/spec.md:7-44`.

**OBS-CRED-002: Legacy Apple Wallet pass**

When an authenticated Legacy member requests an Apple Wallet pass, the Legacy
system shall generate a signed `.pkpass` containing member identity and the
same check-in QR payload.

Evidence:

- `legacy/packages/api/src/routers/passkit.ts:18-178`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard/download-qr-pass.tsx:22-98`

**OBS-CRED-003: Current pass capability boundary**

The current QR feature shall exclude pass generation, even though the current
API package still carries the pass-generation library.

Evidence:

- `.forge/features/member-qr-codes/spec.md:35-44`
- `packages/api/package.json`

### Issues Rollout

**OBS-ISS-001: Gated enablement**

Where the Issues feature flag is disabled, the current product shall keep the
new Issues workspace and reminder scheduler unavailable. Before production
enablement, operators shall repair blocking Legacy issue relationships and
resolve invalid templates reported by the preflight.

Evidence: `.forge/features/club-operations-issues/status.md`.

## Observed Non-Functional Requirements

### Security and Privacy

- Current member resume access is authenticated and ownership-scoped.
- Current officer workflows use database-backed role permissions; officer
  bypass is an explicit product rule for Issues.
- Guild profile visibility has an audience contract more expressive than the
  single stored boolean.
- Legacy public resume access is not safe enough to reuse unchanged.
- Any future recruiting system must avoid exposing contact or file fields
  through the public Club roster projection.

### Consistency and Auditability

- Event attendance records capture their awarded points, allowing a specific
  reversal.
- Event feedback rewards have a uniqueness constraint per event and member.
- Direct member editing can replace the total without a durable, queryable
  point-entry record.
- Issues history establishes a stronger immutable-history precedent than the
  current aggregate-only point design.

### Error Handling

| Condition                                  | Observed behavior              |
| ------------------------------------------ | ------------------------------ |
| Resume object is not owned by current user | `FORBIDDEN`                    |
| Resume presigning fails                    | `INTERNAL_SERVER_ERROR`        |
| Attendance reversal lacks captured award   | `CONFLICT`                     |
| Pass profile does not exist                | `NOT_FOUND`                    |
| Pass signing configuration is missing      | `INTERNAL_SERVER_ERROR`        |
| Guild member has no resume                 | Legacy returns `{ url: null }` |
| Issues Legacy preflight fails              | Feature remains disabled       |

### Performance and Scale

- Legacy Guild discovery is paginated and caps the requested page size at 100.
- The current member dashboard loads dues, events, attendance, and feedback as
  separate bounded queries.
- A future point ledger will require pagination and indexed member/time/source
  access rather than loading complete histories.
- Sponsor resume access should use short-lived object URLs, not proxy entire
  files through Blade.

## Recommended Product Roadmap

### 1. Club Engagement & Rewards

**Recommendation:** implement next.

This is the strongest remaining product feature because the system already
creates points through multiple workflows, officers can replace totals, Legacy
shows points to members, and the banquet raffle consumes those totals. What is
missing is the product that makes those writes understandable and trustworthy.

#### Proposed bundle

- Immutable point ledger with source, reason, actor, event/form reference,
  timestamp, idempotency key, and reversal linkage.
- Reconciled member balance, either derived from the ledger or maintained as a
  verified cache.
- Member-facing engagement summary with balance and paginated earning history.
- Officer adjustment flow with explicit reason, permission check, preview, and
  audit history.
- Configurable engagement seasons and a documented carry/reset policy.
- Banquet/reward eligibility based on explicit rules rather than an opaque
  mutable total.
- Auditable draw runs with a stored candidate snapshot, algorithm version,
  winners, reroll reason, and export.
- No Hackathon points or Hackathon leaderboards in this bundle.

#### Why this is one feature, not several patches

The member view, officer adjustments, ledger, and raffle all depend on the same
source-of-truth decision. Porting the old raffle first would preserve an
unverifiable weighting system. Adding only a member point total would expose a
number the member cannot reconcile. The coherent unit is the engagement
system.

#### Inferred acceptance criteria

**AC-ENG-001: Earn points**

Given an eligible first event check-in or first feedback reward, when the
workflow succeeds, then one idempotent ledger entry is created and the
member's displayed balance changes by the same amount.

**AC-ENG-002: Reverse points**

Given an awarded source entry, when its source is reversed, then the system
adds a linked reversal entry and preserves the original entry.

**AC-ENG-003: Explain balance**

Given a member with earnings, reversals, and officer adjustments, when the
member opens Engagement, then the displayed balance reconciles to the visible
paginated history and each row explains its source.

**AC-ENG-004: Adjust safely**

Given an authorized officer, when they add or subtract points, then a reason is
required, the write is idempotent, and the actor and before/after balance are
auditable.

**AC-ENG-005: Run a reward draw**

Given a configured season and eligibility policy, when an officer starts a
draw, then the system snapshots eligible entries, records the algorithm and
result, and does not silently change a completed draw after later point writes.

**AC-ENG-006: Separate Club and Hackathon**

Given Hackathon point data, when the Club engagement system calculates a
balance or eligibility, then Hackathon data is excluded.

### 2. Guild Talent Network & Sponsor Recruiting

**Recommendation:** implement after Engagement & Rewards, unless sponsor
recruiting has a near-term deadline.

This should not be framed as “restore the Guild router.” The current consumers
prove the product is unfinished, while the onboarding contract proves the
Legacy public-only authorization model is wrong. The proper feature is a
privacy-tiered talent network.

#### Proposed bundle

- Explicit Guild audiences instead of relying only on one boolean:
  member-visible, sponsor/staff-visible, and hidden/disabled as product policy
  requires.
- Authenticated member directory with existing profile cards, search,
  pagination, and current/alumni filters.
- Sponsor/staff recruiting view with the fields those actors are permitted to
  see.
- Authenticated, authorized, audited resume access with short-lived URLs and
  immediate revocation when visibility changes.
- Safe public Club-team roster projection that never leaks recruiting fields.
- Member preview showing exactly what each audience can see.
- Privacy-default and Legacy backfill decision before enabling the feature.
- Accessibility and responsive visual review for the existing Guild UI rather
  than a blind Legacy port.

#### Inferred acceptance criteria

**AC-GUILD-001: Respect audience**

Given a private Guild profile, when an ordinary member browses Guild, then the
profile is absent; when an authorized sponsor or staff user browses, then the
permitted recruiting projection is available.

**AC-GUILD-002: Protect resumes**

Given a profile with a resume, when a caller requests it, then the system
verifies the caller's audience entitlement, records the access, and returns a
short-lived URL. A public or unauthorized caller receives no URL.

**AC-GUILD-003: Revoke promptly**

Given a member who removes resume access or changes profile visibility, when a
new recruiting request is made, then access reflects the new state
immediately.

**AC-GUILD-004: Preserve public roster safety**

Given a public Club-team page, when the roster is loaded, then only opted-in
team members and the explicitly public roster fields are returned.

**AC-GUILD-005: Explain visibility**

Given a member editing their Guild profile, when they choose a visibility
level, then the interface previews which fields members, sponsors, staff, and
the public can see.

### 3. Digital Member Credential

**Recommendation:** optional follow-on or part of a later member-experience
bundle.

This is a real product feature, not a repair, but it is smaller than the first
two. The current QR already satisfies check-in identity. A worthwhile new
credential should add lifecycle value instead of merely restoring the Apple
Wallet button.

#### Proposed bundle

- Authenticated Apple Wallet issuance using the current stable QR payload.
- Product decision on Google Wallet before the technical design is approved.
- Member name and Club identity without embedding unnecessary profile data.
- Current membership/dues presentation only if it can be updated or expired
  safely.
- Versioning, revocation, signing-certificate operations, and failure
  observability.
- Reissue behavior when identity or membership state changes.

#### Inferred acceptance criteria

**AC-CRED-001: Issue safely**

Given a signed-in member, when they request a supported wallet credential, then
the issued credential contains the stable check-in QR and only approved member
fields.

**AC-CRED-002: Preserve check-in**

Given a valid wallet credential, when its barcode is scanned through the
existing Club check-in flow, then it resolves to the same user identity as the
dashboard QR.

**AC-CRED-003: Handle lifecycle**

Given an expired, revoked, or superseded credential, when it is presented or a
new credential is requested, then the system follows the approved revocation
and reissue policy.

## Conditional Net-New Features

These may be valuable, but the repository does not establish them as remaining
Legacy product obligations.

### Club Communications and Campaigns

The repository has low-level email and Discord delivery machinery, but no
evidenced non-hackathon campaign-management product or durable campaign model.
Treat segmentation, templates, scheduling, and delivery reporting as a net-new
feature only if officers identify a real operating need.

### Event Registration and Capacity

Registration, RSVP, capacity, waitlists, no-shows, and ticketing were
explicitly excluded from Event Management and Analytics because the required
data capture does not exist. This could become a proper product later, but it
is not unfinished Legacy parity.

### Membership Finance and Policy

Member-visible payment history, configurable pricing, waivers, refunds, and
accounting reconciliation are intentionally outside the implemented dues
slice. They form a possible finance bundle, but Legacy evidence is limited and
does not justify placing it ahead of Engagement or Guild without an officer
need.

## Work That Is Not a New Product Feature

The following should be tracked and completed, but should not be counted as
remaining feature bundles:

1. Run and resolve the Issues Legacy-data preflight, smoke staging, and enable
   `ISSUES_FEATURE_ENABLED`.
2. Repair the known invalid Legacy issue assignee/team relationship and decide
   what to do with the invalid Legacy template.
3. Deploy the already implemented Issues migration, Blade surface, and cron
   worker.
4. Remove the old issue `date` column only after the expand/contract window.
5. Restore root health after the current Guild consumer/API mismatch.
6. Run real Discord/Google staging smoke tests where credentials and external
   state permit.
7. Keep the broader navigation redesign, issue comments, issue attachments,
   and TK changes out of scope unless separately approved.

The Guild consumer/API mismatch belongs inside the Guild feature if that
feature is approved; a minimal router shim by itself is only a repair.

## Uncertainties and Reverse-Prompt Questions

### Engagement & Rewards

- [ ] Are Club points lifetime, academic-year, semester, or configurable by
      season?
- [ ] Do old points carry into the first ledger season, reset, or remain as a
      labeled Legacy opening balance?
- [ ] Is the banquet raffle still an active annual workflow?
- [ ] What eligibility threshold and weighting policy should replace or
      preserve the Legacy `> 100` and `points / 10` behavior?
- [ ] Can an officer create negative adjustments, and may a balance become
      negative?
- [ ] Should members see a leaderboard, an anonymized percentile, or only
      their own history?
- [ ] Which permission controls point adjustment and reward administration?
- [ ] Are rewards only raffle entries, or will the system later support
      milestones, redemptions, or catalogs?

### Guild

- [ ] How are sponsors authenticated, assigned to organizations, and removed
      when access ends?
- [ ] Which profile fields are visible to ordinary members, sponsors, staff,
      and the public?
- [ ] Is resume access available to all sponsors or only approved recruiting
      contacts?
- [ ] Should every resume view/download create a member-visible access record?
- [ ] Do alumni remain discoverable indefinitely, opt in again, or expire?
- [ ] Should existing `guildProfileVisible = true` rows be enabled
      automatically or require renewed consent?
- [ ] Is direct contact or shortlisting in scope, or should Guild remain a
      discovery-only product?

### Credential

- [ ] Apple Wallet only, or Apple and Google Wallet?
- [ ] Should the credential display current dues status?
- [ ] Who owns pass-signing certificates, rotation, and production recovery?
- [ ] Can a credential be revoked server-side, or is expiration and reissue
      sufficient?

## Recommendation

Yes: most of the non-hackathon platform has been implemented.

The next reverse-prompt should target **Club Engagement & Rewards**. It is the
largest remaining domain with active current writes, visible Legacy behavior,
and a real integrity gap. After that, the next substantial bundle is **Guild
Talent Network & Sponsor Recruiting**. The **Digital Member Credential** can
wait unless Wallet access is an immediate member priority.

Do not open a standalone banquet-raffle feature or a minimal Guild-router
repair as the next feature. Those would recreate the same patch-sized planning
problem this review was intended to avoid.

## Evidence Index

Primary evidence reviewed:

- `.forge/features/*/{spec,srd,test-cases,status}.md`
- `apps/blade/src/app`
- `apps/blade/src/app/_components/member/dashboard-client.tsx`
- `apps/club/src/app/teams/team-roster.ts`
- `apps/guild/src/app`
- `apps/cron/src`
- `packages/api/src/root.ts`
- `packages/api/src/routers`
- `packages/api/src/utils/events`
- `packages/api/src/utils/resume`
- `packages/db/src/schemas/knight-hacks.ts`
- `packages/validators/src`
- `legacy/apps/blade/CURRENT.md`
- `legacy/apps/blade/src/app/admin/banquet-raffle`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard`
- `legacy/packages/api/src/routers/guild.ts`
- `legacy/packages/api/src/routers/passkit.ts`
