# Reverse-Engineered Specification: Remaining Non-Hackathon Legacy Parity

Date: 2026-07-23

## Overview

This specification answers one narrow question:

> Which proper non-hackathon product capabilities existed in Legacy and have
> not yet been carried into Reforge?

It does not propose net-new product systems. A capability is included only
when there is direct Legacy route, API, component, or maintained current-state
evidence.

The corrected conclusion is:

1. **Alumni Member Experience** is the largest proper Legacy feature not
   carried into Reforge.
2. **Guild Collective** is the other proper Legacy product surface still
   incomplete. Its UI remains in `apps/guild`, but the current API no longer
   exports the Guild procedures it consumes.
3. **Digital Apple Wallet Pass** is a smaller standalone Legacy capability
   still missing.
4. **Banquet Raffle** is a smaller seasonal officer feature still missing.
5. **Aggregate member points display** is a patch-sized dashboard parity gap,
   not a separate feature bundle.

The previously proposed immutable engagement ledger, point seasons, sponsor
recruiting portal, communications campaigns, event registration, and expanded
membership-finance systems are not Legacy parity. They are removed from this
roadmap.

## Analysis Boundary

### Included

- The current Reforge worktree.
- All maintained `.forge/features/*` artifacts.
- `legacy/apps/blade` route and component behavior.
- `legacy/packages/api` public and protected non-hackathon procedures.
- Current `apps/blade`, `apps/guild`, and `apps/club` consumers.
- Current API, database, validators, storage, and cron support.

### Excluded

- `apps/tk`.
- Hacker applications and dashboards.
- Hackathon management, events, points, email, imports, analytics, and
  operations.
- Judging and challenge workflows.
- Net-new features without a Legacy implementation.
- Cleanup and rollout work unless it explains why a Legacy feature is not
  currently usable.

## Architecture Summary

### Technology Stack

- **Language:** TypeScript.
- **Runtime and workspace:** Node.js 20+, pnpm 9, and Turborepo.
- **Web:** Next.js 16, React 19, Tailwind CSS, and shared Forge UI components.
- **API:** tRPC with Zod.
- **Database:** PostgreSQL with Drizzle ORM.
- **Identity and authorization:** Discord-backed auth plus database-linked
  permission roles.
- **Integrations:** MinIO, Discord, Google Calendar, Stripe, and Apple PassKit.

Evidence:

- `package.json`
- `apps/blade/package.json`
- `packages/api/package.json`
- `packages/db/package.json`

### Relevant Module Structure

```text
apps/
├── blade/       current member and officer application
├── club/        current public Club site
└── guild/       current but API-stranded Guild directory
packages/
├── api/         current tRPC domain routers
├── db/          current PostgreSQL schema
└── validators/  current domain contracts
legacy/
├── apps/blade/  old member and officer application
└── packages/api old tRPC behavior
.forge/features/ approved Reforge feature records
```

### Comparison Method

```text
Legacy route/component/procedure
              │
              ▼
Current route/component/procedure
              │
              ├── present and equivalent  → carried
              ├── deliberately superseded → carried/no feature
              ├── partial or stranded      → parity gap
              └── absent                   → parity gap
```

## Strict Legacy Parity Matrix

| Legacy product area                             | Current state                               | Classification                        |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------- |
| Auth landing and session routing                | Reimplemented                               | Carried                               |
| Member signup                                   | Reimplemented through Forms                 | Carried                               |
| Member profile settings, picture, and resume    | Reimplemented                               | Carried                               |
| Dues checkout, confirmation, and current status | Reimplemented                               | Carried                               |
| Member QR identity                              | Reimplemented                               | Carried                               |
| Member events, attendance history, and feedback | Reimplemented and expanded                  | Carried                               |
| Member form-response history                    | Reimplemented                               | Carried                               |
| Standard member aggregate points card           | Aggregate omitted; per-event points exist   | Small parity gap                      |
| Alumni-specific dashboard and engagement        | No current alumni branch                    | **Proper feature gap**                |
| Guild Collective directory                      | UI exists; API contract absent              | **Proper feature gap**                |
| Apple Wallet member pass                        | Legacy API/UI absent from current router/UI | Smaller feature gap                   |
| Admin member management and point editing       | Reimplemented                               | Carried                               |
| Club event administration and check-in          | Reimplemented                               | Carried                               |
| Forms, responses, callbacks, and feedback       | Reimplemented                               | Carried                               |
| Club analytics                                  | Reimplemented                               | Carried                               |
| Role and permission management                  | Reimplemented                               | Carried                               |
| Club operations issues                          | Implemented; production preflight remains   | Carried, rollout pending              |
| Banquet raffle                                  | No current route                            | Smaller seasonal feature gap          |
| Legacy `/admin` card hub                        | Replaced by permission-aware navigation     | Superseded                            |
| Legacy Blade sponsor page                       | Current Club sponsor page is broader        | Superseded; one broken CTA is a patch |
| General email procedure                         | No non-hackathon Legacy UI consumer found   | Not an evidenced product feature      |

Evidence:

- Current routes: `apps/blade/src/app/**/page.tsx`
- Legacy routes: `legacy/apps/blade/src/app/**/page.tsx`
- Current routers: `packages/api/src/root.ts:1-55`
- Legacy routers: `legacy/packages/api/src/root.ts`
- Completed artifacts: `.forge/features/*/status.md:3`

## Observed Functional Requirements

The following requirements describe implemented Legacy behavior or an
observable current gap. They do not add new scope.

### Alumni Member Experience

**OBS-ALUM-001: Alumni determination**

When the member's graduation date is at or before the current date, the Legacy
member dashboard shall treat the member as alumni. For high-school study
levels, Legacy additionally compares the graduation date against a four-year
cutoff.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/member-dashboard.tsx:23-56`.

**OBS-ALUM-002: Dedicated alumni branch**

While the member is alumni, the Legacy dashboard shall render an
alumni-specific experience instead of the regular member dashboard.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/member-dashboard.tsx:84-137`.

**OBS-ALUM-003: Alumni surface composition**

While the member is alumni, the Legacy dashboard shall show an alumni Discord
link, Alumni-section volunteer forms, member information, donation tiers, a
rotating history image, and a Knight Hacks recap.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/member-dashboard.tsx:98-132`.

**OBS-ALUM-004: Alumni Discord**

When an alumni member activates the Alumni Discord action, Legacy shall open a
hard-coded alumni-only Discord channel.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/AlumniDiscord.tsx`.

**OBS-ALUM-005: Alumni volunteer forms**

While an alumni member views the dashboard, Legacy shall query forms in the
`Alumni` section and link each result to its respondent route. When that
section has no forms, the card shall show a coming-soon state.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/early-access-volunteer.tsx:12-71`.

**OBS-ALUM-006: Alumni donation tiers**

When an alumni member chooses a donation tier, Legacy shall open one of four
external Stripe payment links: Supporter Alumni, Contributor Alumni, Partner
Alumni, or a custom amount.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/payment/donate.tsx:17-145`.

**OBS-ALUM-007: Alumni recap**

While the member is alumni, Legacy shall display class year, years as a member,
Club events attended, most active year, and lifetime points. Legacy also
included Hackathon attendance, which is excluded from this non-hackathon
specification.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/AlumniRecap.tsx:27-210`.

**OBS-ALUM-008: Legacy history content**

When the alumni dashboard renders its “Day in History” card, Legacy shall
select one of seven hard-coded photos based on day of year. The component
contains a TODO to replace this with a real data source.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/day-in-history.tsx:5-48`.

**OBS-ALUM-009: Current absence**

When the current Reforge member dashboard loads, it shall fetch dues, Club
events, Club attendance, and event feedback and render the same
`MemberDashboard` for every member. No alumni detection or alumni-specific
query/surface is observed.

Evidence:

- `apps/blade/src/app/_components/member/dashboard-client.tsx:205-280`
- `apps/blade/src/app/_components/member/member-dashboard.tsx:546-621`

### Guild Collective

**OBS-GUILD-001: Legacy Guild discovery**

When the Guild directory is queried, Legacy shall return only members whose
`guildProfileVisible` flag is true and shall support pagination, text search,
and current/alumni filtering.

Evidence: `legacy/packages/api/src/routers/guild.ts:506-580`.

**OBS-GUILD-002: Legacy profile projection**

When Legacy returns a Guild profile, it shall include name, tagline, about,
profile picture, graduation date, school, profile links, resume presence, and
member creation date.

Evidence: `legacy/packages/api/src/routers/guild.ts:542-556`.

**OBS-GUILD-003: Legacy team roster**

When the public Club site requests its team roster, Legacy shall derive team
membership from linked Discord/Blade roles and return a limited public roster
for opted-in Guild profiles.

Evidence:

- `legacy/packages/api/src/routers/guild.ts:315-388`
- `legacy/packages/api/src/routers/guild.ts:582-584`

**OBS-GUILD-004: Legacy resume download**

When a Guild resume is requested for a member who has one, Legacy shall return
a one-hour presigned download URL.

Evidence: `legacy/packages/api/src/routers/guild.ts:586-631`.

**OBS-GUILD-005: Current Guild UI**

When the current Guild page loads, it shall request paginated/searchable Guild
members, render the Guild Collective cards, and support current/alumni
filtering.

Evidence:

- `apps/guild/src/app/page.tsx:11-95`
- `apps/guild/src/app/_components/guild-member-display.tsx`

**OBS-GUILD-006: Current resume consumer**

When a member card's resume action is activated, the current Guild UI shall
request `guild.getGuildResume` and open the returned URL.

Evidence:
`apps/guild/src/app/_components/resume-button.tsx:12-54`.

**OBS-GUILD-007: Current public roster consumer**

When the current Club teams page loads its roster, it shall request
`guild.getPublicClubTeamRoster`.

Evidence: `apps/club/src/app/teams/team-roster.ts:4-11`.

**OBS-GUILD-008: Missing current API**

The current API shall export routers for analytics, auth, dues, events, forms,
issues, members, profile pictures, QR, resumes, and roles. It shall not export
a Guild router, leaving both current Guild consumers without their expected
contract.

Evidence: `packages/api/src/root.ts:1-55`.

### Member Points Display

**OBS-PTS-001: Legacy aggregate card**

While a regular member views the Legacy dashboard, the system shall show the
member's aggregate point balance and label it “Total accumulated points.”

Evidence:

- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard/member-dashboard.tsx:139-168`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard/points.tsx`

**OBS-PTS-002: Legacy alumni points**

While an alumni member views the Legacy recap, the system shall show the
aggregate member balance as lifetime points.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/AlumniRecap.tsx:198-206`.

**OBS-PTS-003: Current underlying balance**

The current system shall retain the aggregate `Member.points` value, award
points for Club check-in and event feedback, and allow authorized member
editors to change the aggregate value.

Evidence:

- `packages/db/src/schemas/knight-hacks.ts:126`
- `packages/api/src/utils/events/database-attendance.ts:109-143`
- `packages/api/src/utils/events/database-feedback.ts:378-426`
- `apps/blade/src/app/_components/admin/members/member-detail-dialog.tsx:381-458`

**OBS-PTS-004: Current partial presentation**

When a current member views attendance history, Reforge shall show the points
awarded by each event. No aggregate point card is observed on the current
member dashboard.

Evidence:

- `apps/blade/src/app/_components/member/member-events-dashboard.tsx:244-325`
- `apps/blade/src/app/_components/member/member-dashboard.tsx:546-621`

### Digital Apple Wallet Pass

**OBS-PASS-001: Protected generation**

When an authenticated Legacy member requests a member pass, Legacy shall load
that member's profile and reject the request when no profile exists.

Evidence: `legacy/packages/api/src/routers/passkit.ts:17-47`.

**OBS-PASS-002: Signing configuration**

When Legacy generates a pass, it shall use the configured Apple signing
certificate, signing key, pass type, team identifier, and the packaged member
pass model. Missing signing material shall produce an internal error.

Evidence: `legacy/packages/api/src/routers/passkit.ts:49-107`.

**OBS-PASS-003: Pass content**

When Legacy issues the pass, it shall include the member's name, Discord
identity, member-since date, UCF location relevance, and the same stable user
QR payload used for check-in.

Evidence: `legacy/packages/api/src/routers/passkit.ts:109-168`.

**OBS-PASS-004: Legacy download UI**

When pass generation succeeds, the Legacy member dashboard shall download the
returned base64 data as an Apple `.pkpass` file and report success or failure.

Evidence:
`legacy/apps/blade/src/app/_components/dashboard/member-dashboard/download-qr-pass.tsx:22-98`.

**OBS-PASS-005: Current absence**

The current member QR feature shall deliberately exclude pass generation. The
current API root shall not export a PassKit router.

Evidence:

- `.forge/features/member-qr-codes/spec.md:26-41`
- `packages/api/src/root.ts:1-55`

### Banquet Raffle

**OBS-RAFFLE-001: Officer access**

While the caller is not an officer, when they request the Legacy banquet
raffle route, the system shall redirect them away.

Evidence: `legacy/apps/blade/src/app/admin/banquet-raffle/page.tsx:13-24`.

**OBS-RAFFLE-002: Eligibility**

When Legacy builds the raffle pool, it shall include only members with more
than 100 aggregate points.

Evidence:
`legacy/apps/blade/src/app/admin/banquet-raffle/page.tsx:26-35`.

**OBS-RAFFLE-003: Weighting**

For each eligible member, Legacy shall repeatedly add that member to the entry
array while an integer counter remains below `member.points / 10`.

This implementation effectively creates the ceiling of `points / 10` entries
for positive point totals that are not divisible by ten, despite the comment
claiming a simple `points / 10` relationship.

Evidence:
`legacy/apps/blade/src/app/admin/banquet-raffle/page.tsx:37-43`.

**OBS-RAFFLE-004: Draw experience**

When an officer starts a draw, Legacy shall shuffle the weighted entry array,
animate names while slowing down, show a winner with sound, and offer Draw
Again and Reset controls.

Evidence:
`legacy/apps/blade/src/app/_components/admin/banquet-raffle/raffle-draw.tsx`.

**OBS-RAFFLE-005: Empty state**

While the raffle contains no entries, Legacy shall disable the draw and show
“No entries available for the raffle.”

Evidence:
`legacy/apps/blade/src/app/_components/admin/banquet-raffle/raffle-draw.tsx:344-370`.

**OBS-RAFFLE-006: No durable result**

Legacy shall keep the current winner only in client component state. No saved
draw, winner history, or exclusion of previous winners is observed.

Evidence:
`legacy/apps/blade/src/app/_components/admin/banquet-raffle/raffle-draw.tsx`.

## Observed Non-Functional Requirements

### Security and Privacy

- The Legacy Guild directory and resume procedures are public.
- Legacy resume download checks object ownership against the profile owner but
  does not authorize the requesting actor.
- Current self-service resume access is protected and verifies that the object
  belongs to the signed-in user.
- The approved current onboarding contract says private Guild profiles remain
  visible to sponsors and staff, while public profiles are additionally
  visible to members. This is more expressive than Legacy's single public
  procedure and must be reconciled before Guild is enabled.
- Apple Wallet pass generation is authenticated and requires an existing
  profile.
- Banquet raffle access is officer-only.

Evidence:

- `legacy/packages/api/src/routers/guild.ts:506-631`
- `packages/api/src/routers/resume.ts:13-44`
- `packages/api/src/utils/resume/storage.ts:185-218`
- `.forge/features/initial-member-onboarding/spec.md:44-53`
- `legacy/packages/api/src/routers/passkit.ts:17-47`

### Error Handling

| Condition                             | Legacy/current observed behavior               |
| ------------------------------------- | ---------------------------------------------- |
| Guild member has no resume            | Return `{ url: null }`                         |
| Guild resume presigning fails         | `INTERNAL_SERVER_ERROR`                        |
| Pass profile does not exist           | `NOT_FOUND`                                    |
| Pass signing configuration is missing | `INTERNAL_SERVER_ERROR`                        |
| Pass generation otherwise fails       | Logged and returned as `INTERNAL_SERVER_ERROR` |
| Alumni volunteer section has no forms | Show coming-soon copy                          |
| Raffle has no eligible entries        | Disable draw and show empty state              |

### Performance

- Legacy Guild discovery is paginated and caps page size at 100.
- Current Guild offers page sizes of 20, 40, 60, 80, and 100.
- Alumni recap computes its summary from already-loaded event arrays.
- Legacy raffle materializes repeated members into a weighted in-memory array.

### Maintainability and Staleness

- Legacy alumni status logic is duplicated UI logic based on current date.
- Legacy Alumni Recap hard-codes four officer names.
- Legacy alumni donation benefits are KH9-specific and the Stripe URLs are
  hard-coded.
- Legacy “Day in History” is a seven-image rotation with an explicit TODO for a
  real data source.
- Legacy raffle winner state is not persisted and its weighting behavior does
  not exactly match its explanatory comment.
- These are observed reasons to reverse-prompt the Legacy behavior rather than
  copy the components line for line.

## Proper Feature Bundles Still Required

### 1. Alumni Member Experience

This is the best next proper Legacy-parity feature.

#### Legacy-backed scope

- Determine alumni status from the member's graduation data.
- Provide an alumni-specific member experience.
- Surface the alumni Discord destination.
- Surface forms in the Alumni section for volunteer/engagement opportunities.
- Present verified alumni donation options.
- Show a Club-only recap: class year, years as a member, Club events attended,
  most active Club year, and lifetime points.
- Decide whether the hard-coded history-photo card remains a real requirement.
- Keep Hackathon attendance out of this bundle.

#### Why this is a proper feature

Legacy had a distinct audience, branch, content model, forms discovery,
donation journey, and recap experience. Reforge currently has no alumni
branch. This is not a route repair or single missing card.

#### Inferred acceptance criteria

**AC-ALUM-001: Detect alumni**

Given a member whose approved alumni rule is satisfied, when they open the
member dashboard, then Reforge renders the alumni experience instead of the
ordinary member dashboard.

**AC-ALUM-002: Preserve ordinary members**

Given a current member, when they open the member dashboard, then the existing
dues, Club events, form history, QR, resume, and Guild profile experience is
unchanged.

**AC-ALUM-003: Show Club recap**

Given an alumni member with retained Club attendance and points, when the
alumni recap loads, then class year, years as a member, Club event count, most
active Club year, and lifetime points are derived from current data.

**AC-ALUM-004: Show alumni forms**

Given forms in the Alumni section, when an alumni member views opportunities,
then each eligible form links to the current `/form/[slug]` respondent flow.
When none exist, the experience shows a deliberate empty state.

**AC-ALUM-005: Validate external destinations**

Given an alumni Discord or donation action, when it is displayed, then its
destination is current and approved rather than copied from a stale Legacy
constant.

### 2. Guild Collective

This is the second proper Legacy-parity feature.

#### Legacy-backed scope

- Restore a working Guild member-directory contract for `apps/guild`.
- Preserve search, pagination, and current/alumni filtering.
- Show the profile fields already rendered by the Guild app.
- Restore the limited public Club-team roster used by `apps/club`.
- Resolve resume audience authorization before enabling resume download.
- Preserve the member's existing Guild visibility setting and current profile
  editing flow.

#### Why this is a proper feature

Guild is a standalone product surface with its own application, discovery
behavior, profile cards, filters, pagination, resume actions, and public Club
roster projection. Although some UI is already present, the product is
currently unusable because its API domain was not carried.

#### Inferred acceptance criteria

**AC-GUILD-001: Discover profiles**

Given profiles visible to the current Guild audience, when a visitor uses
search, pagination, or current/alumni filtering, then the results and total
match the approved visibility policy.

**AC-GUILD-002: Preserve profile cards**

Given an eligible Guild member, when their card and detail dialog render, then
Legacy-backed identity, education, about, and profile-link fields are shown
without exposing unrelated member data.

**AC-GUILD-003: Restore Club roster**

Given opted-in members with linked Club roles, when the public teams page
loads, then the API returns only the limited public roster projection.

**AC-GUILD-004: Resolve resume privacy**

Given a Guild resume request, when the caller is not entitled under the
approved audience model, then no URL is returned. Authorized access uses a
short-lived URL.

**AC-GUILD-005: Remove the stranded contract**

Given current Guild and Club consumers, when repository typecheck and runtime
loads execute, then both expected Guild procedures exist in the current typed
API.

## Smaller Legacy Feature Carryovers

### 3. Digital Apple Wallet Member Pass

This is a real Legacy feature, but smaller than Alumni or Guild.

Strict scope:

- authenticated member-only pass generation;
- existing stable user QR payload;
- member name, Discord identity, and member-since date;
- Apple signing certificates and pass model;
- `.pkpass` download with safe errors.

Google Wallet, dues-state updates, push updates, revocation services, and a
credential-management product are not Legacy parity.

### 4. Banquet Raffle

This is a real but seasonal Legacy feature.

Strict scope:

- officer-only route;
- point-threshold eligibility;
- point-weighted draw;
- animated winner selection;
- sound toggle, draw again, reset, and empty state.

Persistent draw history, seasons, reward catalogs, and a general engagement
ledger are not Legacy parity.

The exact threshold and weighting behavior require human confirmation before
implementation because the Legacy loop and its comment disagree.

### Aggregate Member Points Card

This is not a standalone feature. It should be included in Alumni Member
Experience or a small dashboard parity change:

- show `Member.points` to the member;
- preserve the existing per-event points history;
- do not introduce a ledger, season, or reward policy under the banner of
  Legacy parity.

## Superseded or Patch-Sized Legacy Differences

These should not be proposed as feature bundles:

1. **Issues rollout:** run the Legacy-data preflight, repair the identified
   data, deploy, and enable the feature flag.
2. **Admin hub:** the approved Role Management scope explicitly left out an
   `/admin` landing page; the permission-aware navigation is the replacement.
3. **Sponsor page:** `apps/club/sponsors` is a larger successor to the Legacy
   Blade sponsor page. Its “Become a Sponsor” action still targets the removed
   Blade `/sponsor` route; fixing that destination is a patch.
4. **General email API:** Legacy contained a permission-gated general
   `sendEmail` procedure, but no non-hackathon Legacy Blade consumer was found.
5. **Member point adjustment:** current member administration can edit the
   member's aggregate points. A dedicated “Add Points” dialog would be a
   convenience patch, not a new feature.
6. **Old member checkout/success routes:** the current dues route and
   confirmation flow supersede them.
7. **Old dashboard card layout:** preserving behavior does not require
   restoring the Legacy grid or animations.

## Uncertainties and Reverse-Prompt Questions

### Alumni

- [ ] What is the authoritative alumni rule? Should graduation date alone
      control it, or can staff override status?
- [ ] Is the alumni Discord channel still current?
- [ ] Are the four Legacy Stripe donation links and KH9 benefits still active?
- [ ] Should alumni get a separate dashboard, a dashboard mode, or a dedicated
      page inside the current member shell?
- [ ] Should Alumni-section forms be restricted by graduation state in
      addition to normal form permissions?
- [ ] Is “Day in History” still wanted, and where should its content live?
- [ ] Should the recap include only Club attendance while Hackathon remains
      excluded?
- [ ] Should the regular member dashboard also regain the aggregate points
      card?

### Guild

- [ ] Is Guild accessible to the public, signed-in members, sponsors/staff, or
      some combination?
- [ ] How are sponsors authenticated if private profiles remain visible to
      them?
- [ ] Which fields can each audience see?
- [ ] Does opting into a public Guild profile also opt into public resume
      download, or is resume access separate?
- [ ] Should existing `guildProfileVisible = true` values be honored
      immediately or require renewed consent?
- [ ] Are alumni profiles visible indefinitely?

### Apple Wallet

- [ ] Are the Apple signing certificate, pass type, team identifier, and
      production pass assets still valid?
- [ ] Is member-only Apple Wallet sufficient for the non-hackathon bundle?
- [ ] Should the old name/Discord/member-since fields be preserved exactly?

### Banquet Raffle

- [ ] Is the banquet raffle still used?
- [ ] Is eligibility strictly `points > 100`?
- [ ] Should entry count be floor, ceiling, or another rule for points not
      divisible by ten?
- [ ] Can the same person win more than once across Draw Again?
- [ ] Is an ephemeral winner acceptable, as in Legacy?

## Recommendation

Yes, most non-hackathon Legacy behavior has been carried.

The next proper reverse-prompt should be **Alumni Member Experience**. It is the
largest true Legacy feature that is absent rather than merely broken or
deferred. After Alumni, complete **Guild Collective**. Treat **Apple Wallet**
and **Banquet Raffle** as smaller follow-ups unless an immediate event or
operational deadline raises their priority.

Do not use Legacy parity to justify an engagement ledger, sponsor portal,
campaign system, registration platform, or finance suite. Those may be good
ideas, but they require separate net-new product approval.

## Evidence Index

Primary sources reviewed:

- `.forge/features/*/{spec,srd,test-cases,status}.md`
- `.forge/features/initial-member-onboarding/legacy-comparison.md`
- `apps/blade/src/app`
- `apps/blade/src/app/_components/member`
- `apps/blade/src/app/_components/admin`
- `apps/club/src/app`
- `apps/guild/src/app`
- `packages/api/src/root.ts`
- `packages/api/src/routers`
- `packages/api/src/utils/events`
- `packages/api/src/utils/resume`
- `packages/db/src/schemas/knight-hacks.ts`
- `legacy/apps/blade/CURRENT.md`
- `legacy/apps/blade/src/app`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard`
- `legacy/apps/blade/src/app/_components/admin/banquet-raffle`
- `legacy/packages/api/CURRENT.md`
- `legacy/packages/api/src/root.ts`
- `legacy/packages/api/src/routers/guild.ts`
- `legacy/packages/api/src/routers/member.ts`
- `legacy/packages/api/src/routers/passkit.ts`
