# Hacker SDK Research

Status: Evidence gathered for reverse-prompting on 2026-08-06

## Goal stated by the owner

Blade should remain the system of record and the administrative control plane for
hackathons. A hackathon's own frontend should own participant interactions:
application, status, profile, resume, dashboard, schedule, points, leaderboard,
timeline, and related event-specific experiences.

The shared product is a headless Hacker SDK. It should expose reliable business
operations and typed data while leaving markup, copy, layout, animation, assets,
and theme behavior to each hackathon site. A yearly site is expected to be a new
frontend. The SDK must make that frontend safe to build without forcing it to look
like another hackathon.

The owner also requires:

- a stable set of base questions that feed the reusable Hacker profile;
- prefill from an existing Hacker profile;
- per-hack custom questions;
- retained data and history across hackathons;
- no coupling between hacker participation and club membership or dues.

## Repository state and evidence sources

The feature worktree is
`/Users/dvidal/Documents/forge-reforge-hacker-sdk` on branch
`reforge/hacker-sdk`, based on `reforge/main` at `a9df3ec58`.

The authoritative KH IX portal is newer than that base. It lives on
`origin/main` at `0aa390a0`; the shared Bloom participant substrate landed in
`afd2f894`, followed by the KH IX portal in `82da1e1c`. The current feature branch
does not contain those commits. This research reads them as prototype evidence,
not as code already approved for Reforge.

Sources inspected:

- current Reforge hackathon, hacker, events, forms, resume, QR, auth, email, and
  audit models;
- approved or settled decisions in the hackathon configuration, hacker
  management, hackathon events, and forms feature artifacts;
- the legacy Blade application, dashboard, profile, confirmation, withdrawal,
  QR, points, history, and leaderboard flows;
- the production KH IX and Bloom participant portals on `origin/main`;
- the `origin/main` participant router and internal `@forge/hackathon` package;
- repository architecture, API, permission, placement, and engineering rules.

## Existing product model

### Current Reforge

`Hackathon` stores identity, application dates, a frontend-owned application
URL, classes, VIP configuration, Discord roles, and event delivery settings.
There is no stored "current hackathon". Admin and event operations take an
explicit hackathon ID.

`Hacker` looks like a reusable person profile, but `Hacker.userId` is not unique.
One user may have several Hacker rows. It also contains facts that do not belong
to a reusable profile, including two event surveys, MLH agreements, and the
legacy first-time answer.

`HackerAttendee` is the per-hack application and attendance record. It owns the
hackathon, status, application and confirmation time, points, class, VIP,
first-time snapshot, check-in metadata, blacklist state, and status-delivery
state. The current uniqueness rule covers `(hackerId, hackathonId)`, so two
Hacker rows for one user could still create two applications to the same hack
unless the service also guards it.

Reforge already settled several rules that the SDK must inherit:

- `HackerAttendee.isFirstTime` is the permanent per-hack answer. Application
  intake asks it every time. The mutable `Hacker.isFirstTime` field is a legacy
  bridge scheduled for retirement.
- `checkedin` is written only by primary hackathon check-in and cannot be undone
  by an applicant or ordinary status editor.
- class count and class names come from hackathon configuration. VIP is
  independent of class membership.
- hacker event attendance and points remain separate from club member attendance
  and points.
- status changes and their notification enqueue share one transaction. Delivery
  happens asynchronously and remains observable to officers.
- blacklist state and its reason are officer-only and must never enter a hacker
  payload.

The new hackathon event model can support participant schedule, attendance, point
ledger, and leaderboard reads, but all current event procedures are for officers
or check-in operators. The SDK needs purpose-built participant-safe projections.

### Legacy Blade

Legacy provides the behavioral baseline:

- Discord-authenticated application with application-window enforcement;
- eight themed form steps with identity, contact, demographics, education, two
  survey answers, links, resume, allergies, first-time status, and MLH terms;
- prefill from the latest Hacker row, then Member if no Hacker exists;
- fresh survey, first-time, and consent answers for each application;
- pending status after submission;
- status dashboard, confirmation, withdrawal, QR, resume, past hackathons,
  points, class, and leaderboard.

Legacy creates a new Hacker row for every hack and copies the previous row into
the next application. Its settings mutation can rewrite every Hacker row for a
user, which changes historical data. Confirmation finds an inferred future
hackathon, and deadline/capacity checks live partly in the UI. Leaderboards
assume a fixed six-class theme. These are behaviors to replace, not compatibility
contracts.

### KH IX and Bloom prototype on `origin/main`

The production prototype already demonstrates the desired visual boundary. KH IX
owns a 2,700-line themed application renderer, a large dashboard renderer, custom
assets, animation, status scenes, navigation, and interaction patterns. Bloom
uses the same participant package with a separate renderer. A diff between the
two application components contains 843 KH IX additions and 86 removals; the
dashboard diff contains 3,212 additions and 461 removals. The sites share
workflow calls, not their appearance.

The prototype package is `@forge/hackathon`. It exposes:

- `HackathonPortalProvider`;
- application, dashboard, and profile hooks;
- application and profile schemas;
- prefill helpers;
- a pure lifecycle-state helper;
- a server-side participant caller.

The participant router exposes public hackathon facts and authenticated
application context, application submission, profile update, resume operations,
confirmation, withdrawal, QR, schedule, and issue reporting.

This prototype proves the direction but does not define a durable SDK:

- it is an internal monorepo package rather than a portable client;
- each hack site mounts a same-origin participant backend and imports API, auth,
  database, storage, email, Discord, and validator code transitively;
- auth depends on Blade-specific return routes and a production cookie shared
  across `*.knighthacks.org`;
- calls are scoped by mutable `hackathonName` supplied by the browser;
- contract types expose full database-shaped Hackathon, Hacker, and Member rows;
- the package fixes eight form steps and the complete field list in shared code;
- presentation state such as active step and transition direction lives in the
  supposedly headless hook;
- custom questions are unsupported;
- application and profile schemas duplicate and disagree on some rules;
- KH IX and Bloom manually map most fields into and out of the hooks;
- TOS acceptance is client-only and not recorded as a versioned acceptance;
- profile editing mixes reusable facts with surveys and hack-specific consents;
- `pastHackathons` and participant points are returned but not rendered by KH IX;
- KH IX does not consume the available schedule and has no leaderboard or
  timeline contract;
- the package and participant router have no meaningful automated tests.

The prototype's strongest parts should survive: narrow participant-only routing,
server-owned lifecycle enforcement, a pure lifecycle helper, same-site themed
rendering, resume ownership validation, concurrency-safe confirmation, and lazy
QR access.

## Data boundary that the SDK must define

The current model mixes four kinds of data:

1. account identity owned by the authenticated Blade user;
2. reusable Hacker profile facts;
3. answers and agreements for one hackathon application;
4. operational state for one hackathon attendance.

A reliable SDK needs those meanings to stay separate.

Candidate reusable profile facts include name, contact information,
demographics, education, portfolio links, DOB, graduation date, allergies, and
resume metadata. The exact set remains a product decision because some values,
such as shirt size and school, may need a historical snapshot even if they also
prefill later applications.

Per-hack facts include first-time status, custom answers, survey answers, legal
agreement versions, application time, status, confirmation, class, VIP, points,
and check-in. These cannot be read later from a mutable profile without changing
historical analytics.

The current generic forms platform has the right concepts for custom questions:
stable question IDs, typed definitions, revisions, immutable response snapshots,
and retirement rules after answers exist. Its response runtime is member-only,
uses dues and member-role eligibility, and has no HackerAttendee relationship.
The SDK can reuse or extract the definition rules. It should not create fake
Member rows or route hacker applications through the club respondent model.

## Candidate ownership boundary

This is a research recommendation, pending owner approval.

The recommended deployment boundary is a centrally hosted, versioned
participant API on Blade with a headless client package. Yearly hack sites should
not mount `@forge/api`, connect to the production database, or receive storage,
email, Discord, and auth secrets. That is the largest security correction from
the `origin/main` prototype.

The likely package split is:

- a framework-neutral `@forge/hacker-sdk` client with explicit DTOs, Zod
  schemas, domain error codes, and application-definition helpers;
- optional `@forge/hacker-sdk/react` TanStack Query hooks;
- optional `@forge/hacker-sdk/server` helpers for a same-origin site adapter,
  auth return, and token exchange.

The public contract should be a versioned participant surface with types that do
not import the full tRPC `AppRouter` or database selection types. tRPC can remain
an internal server implementation detail. A stable JSON contract makes a yearly
portal independently deployable and prevents an added database column from
becoming public data by accident.

The recommended auth default is a thin same-origin server adapter on the hack
site. Blade handles Discord login, validates an allowlisted return URL, and
exchanges a one-time handoff for short-lived user credentials scoped to one
provisioned portal client and one hackathon ID. A browser-supplied slug may help
with routing but must never select the authoritative hackathon. This design can
support both Knight Hacks subdomains and a future branded domain without giving
the themed site platform credentials.

Direct browser calls with shared cookies should not be the first contract. The
current Blade edge combines wildcard CORS with cookie-backed sessions, callback
sanitization permits only the Blade origin, and production shared cookies work
only for Knight Hacks subdomains. Supporting browser-direct access later would
require a separate CORS, CSRF, audience, and token design.

Blade and shared platform code should own:

- authentication and hack-site audience authorization;
- hackathon resolution and public configuration;
- base field definitions and authoritative validation;
- custom question definitions, revisions, and answer validation;
- application uniqueness, windows, age policy, and submission transaction;
- reusable-profile and per-application persistence rules;
- status/action eligibility, confirmation capacity, and withdrawal policy;
- resume ownership, upload, finalization, and downloads;
- participant-safe schedule, attendance, points, leaderboard, and history reads;
- QR/pass issuance;
- notification enqueue, audit, idempotency, and rate limits.

Each hackathon frontend should own:

- markup and component selection;
- field order, page grouping, and navigation;
- copy and labels except authoritative legal text supplied by the platform;
- animation, theme, assets, responsive behavior, and status scenes;
- whether a capability appears as a button, modal, page, timeline, or another
  event-specific interaction.

The SDK should return authoritative state and capabilities rather than requiring
each site to recreate policy. For example, a dashboard response can say whether
confirmation or withdrawal is allowed and provide a reason code, deadline, or
capacity state. The frontend decides how to present that fact.

## Capability inventory

The full requested product points toward these capability groups. The first
implementation slice may be smaller after reverse-prompting.

### Auth and public hackathon facts

- authenticated Blade user session without requiring club membership;
- safe sign-in, return, retry, sign-out, and callback handling;
- one authoritative hackathon scope bound to the client or request audience;
- public application state, dates, location/timezone, terms, guide, support, and
  enabled participant features.

### Application and reusable profile

- load application context and prefill source;
- get base field definitions and typed option catalogs;
- get per-hack custom question definitions and revision;
- submit exactly one application for the signed-in user and hackathon;
- restore an unfinished form only if draft applications become an approved
  feature;
- read and update the reusable profile under explicit snapshot rules;
- read the current application and its recorded answers;
- list the user's retained hackathon applications or attendance history.

### Lifecycle and dashboard

- authoritative status and timestamps;
- allowed actions with reason codes;
- accepted to confirmed transition with deadline, capacity, and agreement
  enforcement;
- an approved self-withdrawal transition;
- class, VIP, points, and check-in state;
- participant-safe next dates and status refresh.

### Resume and pass

- create, finalize, replace, remove, and download a hacker resume;
- avoid base64-in-tRPC because current request limits are smaller than the raw
  resume policy after base64 expansion;
- issue a hacker check-in pass without requiring a Member row;
- decide whether the current bare user UUID payload remains acceptable or moves
  to a hack-scoped signed/opaque value.

### Hackathon activity

- published schedule or timeline;
- the participant's event attendance and point ledger;
- overall and class leaderboard data using arbitrary configured classes;
- privacy and display-name rules for leaderboard rows;
- current and past hackathon history with a precise distinction between applied,
  confirmed, and attended.

## Required invariants

- A hacker workflow never requires club dues or a Member row.
- Every participant read and write is scoped to one authorized hackathon.
- One user can submit at most one application per hackathon, enforced under
  concurrency and idempotent retries.
- Server code enforces windows, age, required answers, terms, capacity, status
  transitions, and resume ownership.
- Historical application facts do not change when the reusable profile changes.
- Custom answers retain the question ID and definition revision used at submit.
- `checkedin` remains exclusive to primary check-in and cannot be self-reversed.
- Blacklist state, mail health, provider identifiers, raw resume object names,
  and operator-only check-in details never enter SDK responses.
- Participant schedule and event DTOs expose only published, safe fields.
- Hacker points and club member points remain separate.
- Applicant mutations are auditable, retry-safe, rate-limited, and abuse-aware.
- Public mutations return stable error codes, field issues, a request ID, and a
  retryability signal; hack sites own the displayed error copy.
- Profile edits use a revision or equivalent precondition to prevent one device
  from overwriting newer data silently.
- The contract is versioned before a second independently deployed frontend can
  depend on it.
- The SDK contains no required UI, styles, assets, or theme copy.

## Decisions needed before `spec.md`

These questions change the product or its security boundary and cannot be
filled from repository evidence.

1. Where will yearly hackathon sites live? Supporting only Forge monorepo apps
   under `*.knighthacks.org` permits the current shared-session model. Supporting
   another domain, repository, or deployment requires a portable auth handoff
   and a remote API boundary.
2. Should browser code call Blade directly, should each hack site use a thin
   server adapter/BFF, or should the SDK support both? This decides package
   shape, secrets, CORS/CSRF controls, and framework support.
3. Should Forge establish one canonical Hacker profile per Blade user, with
   separate per-hack application snapshots, or keep per-application Hacker rows
   and make copy-forward explicit? The canonical profile plus immutable
   application snapshots is the research recommendation.
4. Which base fields are reusable profile facts, and which must also freeze on
   each application for review and historical analytics?
5. Who authors custom questions: officers in Blade, each frontend in code, or a
   combination? If both, which source wins and can a frontend add an undeclared
   question?
6. Can applicants edit their application after submission? If yes, which fields
   and until which state or deadline? A reusable profile edit and a current
   application correction need distinct semantics.
7. Which statuses can an applicant withdraw from, and can they undo withdrawal
   or reapply? Legacy permits only `confirmed -> withdrawn` and treats it as
   terminal.
8. Which agreement records are required? MLH and Knight Hacks terms can be
   stored with document version and acceptance time instead of editable profile
   booleans.
9. Is 18 at hackathon start a permanent Knight Hacks rule or a per-hack policy?
   The current KH IX browser schema enforces it, while Reforge check-in now
   presents an under-18 warning rather than defining application eligibility.
10. Does the first SDK release include schedule/timeline, attendance, points,
    leaderboard, QR, and past history, or should the first release stop after
    application, profile, and status lifecycle?
11. For leaderboards, which identity is visible, can a hacker opt out, and are
    rankings public, authenticated, or checked-in only?
12. Should schedule/timeline data be public or limited by application status?
    The production prototype limits schedule to checked-in participants.

## Recommended next artifact sequence

1. Resolve the product and deployment questions above.
2. Draft and approve the non-technical `spec.md`.
3. Write an SRD that defines the auth/audience model, data migration, contract
   versioning, package boundaries, and compatibility with `origin/main` portals.
4. Draft contract, lifecycle, migration, security, and two-renderer behavioral
   tests before implementation.
