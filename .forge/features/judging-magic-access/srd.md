# Judging Magic Access SRD

Status: Approved on 2026-09-03

> This file owns technical implementation constraints for this slice.

## Technical purpose

Add first-class judging rooms, reusable room QR credentials, guest judge
sessions, unified judge identities, and room presence to the existing project
directory. Guest and authenticated judges share project read procedures through
a discriminated judge principal, while the API applies different access rules
for each principal type.

The same change protects the imported project inventory once room access has
been distributed. Normal imports become add-only after the first QR is
generated. A separate destructive replacement remains available with stronger
confirmation and room-safety checks.

This slice establishes durable room and judge identity records for later
scheduling and scoring work. It does not implement either workflow.

## Relevant principles

- Blade remains a thin client. Room, session, presence, authorization, and
  import behavior belongs in `@forge/api`.
- `@forge/db` owns schema and migration mechanics, not room or auth workflows.
- `@forge/auth` owns token, cookie, and session helpers.
- `@forge/validators` owns shared room, name, pagination, and mutation inputs.
- Pages and layouts remain server components. Interactive controls stay in
  Blade client components.
- Client hiding never replaces API authorization.
- Hackathon, room, challenge, QR, and lock state is officer-managed data rather
  than yearly constants.
- Multi-table room, activation, revocation, and import changes use database
  transactions.

## Access policy

- **Public without room access:** no project, room-roster, or control-panel
  access. A direct judge route returns the established login or forbidden
  experience.
- **Valid room activation credential:** may create an incomplete guest browser
  session for that room. It cannot read projects until a valid display name is
  saved.
- **Named guest judge:** may read active, non-deleted projects belonging to the
  room's hackathon and challenge. The guest may read project details only when
  the project has that challenge. The guest cannot select another room or
  challenge.
- **Authenticated user without judge or officer permission:** has no role-based
  judge access but may use a valid room credential as a guest.
- **Authenticated judge:** effective `IS_JUDGE` may read every active project
  and challenge for the selected active hackathon. The judge may select one
  room, leave it, and change the project challenge filter independently.
- **Authenticated officer:** effective `IS_OFFICER` receives the same
  unrestricted judge access and room-selection behavior. Officer preview rules
  from the existing project directory remain intact.
- **Officer control:** only effective `IS_OFFICER` may provision, edit, archive,
  generate, revoke, rotate, inspect, remove, or perform destructive replacement
  actions.

When a request has both a qualifying Better Auth session and a guest cookie,
the authenticated judge or officer principal wins. A non-judge authenticated
session does not suppress a valid guest session.

## Architecture and data flow

### Ownership

- `packages/db`: judging configuration, room, judge, access-link, guest-session,
  and presence tables plus relations and migrations.
- `packages/auth`: room-link signing and verification, guest session token
  hashing, cookie parsing, and cookie metadata. Raw credentials never cross a
  client-visible package boundary after activation.
- `packages/validators`: room inputs, guest display name, room selection,
  control-panel pagination, QR lifecycle inputs, and protected import mode.
- `packages/api`: judge-principal resolution, room workflows, QR activation,
  guest completion, presence, project scoping, heartbeat, revocation, and
  import-lock behavior.
- `apps/blade`: officer control panel, room and QR dialogs, activation route,
  guest name gate, minimal guest layout, authenticated room selector, and live
  roster polling.
- `@forge/ui`: existing dialog, input, select, badge, table, tooltip, toast, and
  responsive overlay components only.

### Durable model

```txt
Hackathon
  |-- HackathonJudgingConfiguration
  |-- ProjectChallenge
  |-- JudgingRoom
  |     `-- JudgingRoomAccessLink
  |             `-- GuestJudgeSession
  `-- Judge
        `-- JudgingRoomPresence
```

#### HackathonJudgingConfiguration

One optional row per hackathon stores:

- `hackathonId` as the primary key;
- `projectInventoryLockedAt`;
- `projectInventoryLockedByUserId`; and
- created and updated timestamps.

The first successful room QR generation creates or updates this row in the same
transaction. Revoking every QR does not unlock the inventory.

#### JudgingRoom

A room stores:

- `id`, `hackathonId`, and `challengeId`;
- human-readable `name`;
- integer `displayOrder`;
- nullable `archivedAt` and `archivedByUserId`; and
- created and updated timestamps.

An active room name is unique within a hackathon. Several rooms may reference
the same challenge. A composite foreign key guarantees that the room challenge
belongs to the same hackathon. Archived rooms cannot mint QR codes or accept
new presence.

Changing a room challenge while it has an active QR is one transaction that
revokes the access link and its guest sessions before changing the challenge.
The room remains active and requires a newly generated QR.

#### Judge

A judge stores:

- `id` and `hackathonId`;
- `kind` with values `member` or `guest`;
- nullable `userId` for a Better Auth user;
- `displayName` as the event-visible name; and
- created and updated timestamps.

A check constraint requires `userId` for member judges and forbids it for guest
judges. A member has at most one judge record per hackathon. Display names do
not need to be unique. Future judging responses should reference `Judge.id`
rather than a name, user ID, or browser session.

For member judges, the API snapshots the current Better Auth display name when
it first creates the judge record and refreshes it when the member joins a room.

#### JudgingRoomAccessLink

An access link stores:

- `id`, `hackathonId`, and `roomId`;
- `createdByUserId` and `createdAt`;
- nullable `revokedAt` and `revokedByUserId`; and
- a safe reason code for revocation.

A partial unique index permits one active access link per room. The room and
link use a scoped foreign key so a cross-hackathon link cannot exist.

The activation URL uses the link ID plus a deterministic HMAC signature made
with a dedicated server secret. The database stores no raw reusable QR secret,
and an officer may render the same active QR again. Rotation revokes the old
row and creates a new link ID and signature.

#### GuestJudgeSession

A guest session stores:

- `id`, `accessLinkId`, and nullable `judgeId`;
- a SHA-256 hash of a random 256-bit browser credential;
- `createdAt`, `lastSeenAt`, and `expiresAt`;
- nullable `completedAt`; and
- nullable `revokedAt`, `revokedByUserId`, and revocation reason.

Activation creates an incomplete session without a judge. Saving the guest name
creates the guest `Judge`, creates room presence, connects the session, and
marks it complete in one transaction. Project procedures reject incomplete
sessions.

The raw session credential exists only in an HttpOnly, SameSite=Lax cookie with
Secure enabled in production. The cookie uses a judging-specific name and does
not collide with Better Auth. A browser session expires after eight hours.
Rescanning an active room QR creates a new session.

Revoking or rotating a room access link revokes all guest sessions created from
that link. An officer may revoke one guest session without affecting others.

#### JudgingRoomPresence

A presence record stores:

- `id`, `hackathonId`, `roomId`, and `judgeId`;
- `joinedAt` and `lastSeenAt`; and
- nullable `leftAt` and a leave reason.

Scoped foreign keys require the room and judge to belong to the same hackathon.
A partial unique index permits one active room presence per judge. Switching
rooms closes the current presence and creates a new one in one transaction.

Guest activation creates presence only after name completion. Authenticated
judges create or update presence when they choose a room or scan its QR.

### QR activation flow

1. The officer provisions a room and generates its first active access link.
2. The API locks the project inventory in the same transaction and returns the
   signed activation URL.
3. A browser opens Blade's activation route with the link ID and signature.
4. The route verifies the signature and active room and link state before
   creating any session.
5. If the browser has an authenticated judge or officer session, the API joins
   that member to the room and redirects to the normal project directory with
   the room challenge selected.
6. Otherwise, the API creates an incomplete guest session and Blade sets its
   cookie.
7. Blade redirects to a clean `/judge/projects` URL before rendering content.
8. The page resolves the principal. An incomplete guest receives only the name
   dialog. A completed guest receives the scoped project directory.

The activation route is a protocol boundary because it receives a signed URL,
sets a cookie, and redirects. It calls API-owned workflow functions rather than
implementing authorization or database changes in Blade.

### Judge principal

Add a dedicated `judgeProcedure` whose middleware resolves:

```ts
type JudgePrincipal =
  | {
      kind: "member";
      judgeId: string;
      userId: string;
      permissions: EffectivePermissions;
      roomId: string | null;
    }
  | {
      kind: "guest";
      judgeId: string;
      guestSessionId: string;
      hackathonId: string;
      roomId: string;
      challengeId: string;
    };
```

Member resolution requires `IS_JUDGE` or `IS_OFFICER`. Guest resolution requires
an unexpired, completed, non-revoked session whose access link and room remain
active. The middleware resolves scope from the database on every protected
request. Browser parameters never widen it.

The guest-name mutation uses a narrower incomplete-guest procedure that accepts
a valid session before `judgeId` exists.

### Project read changes

`projects.listJudge` and `projects.getDetail` keep their client names but move
from `permProcedure` to the dedicated judge procedure.

For a member principal:

- preserve current active-hackathon and officer-preview behavior;
- preserve unrestricted challenge filtering; and
- return selectable room and current-room context separately through judging
  procedures.

For a guest principal:

- ignore the active-hackathon resolver and use the room's hackathon;
- force the room challenge into the project query;
- return only that challenge as selectable context;
- treat `General` as the intentional all-project challenge;
- reject officer hackathon overrides and foreign challenge IDs; and
- repeat room, challenge, and project-membership checks in project detail.

Project list and detail outputs keep the existing judge PII redaction.

### Presence and live roster

The judge page sends a small heartbeat at most once per minute while visible.
It updates the active presence and guest session timestamps. The officer control
panel polls every ten seconds while open.

The control panel returns room aggregates and active presence records with
display name, judge kind, joined time, last-seen time, and revocation controls.
It does not return raw credentials, cookie values, IP addresses, or user-agent
strings.

An officer sees a judge as active when the presence remains open and its
last-seen time is within two minutes. Recent inactive records may remain visible
with their last-seen time so a sleeping browser does not erase operational
context.

## tRPC and API behavior

A new `judging` router owns rooms, judge identity, QR lifecycle, and presence.
Procedure names receive Zod descriptions and concise product-intent comments
for future generated API context.

Officer procedures:

- `judging.listAdminRooms`: room cards, QR state, counts, and recent roster for
  an explicit hackathon.
- `judging.createRoom`: create one room from an existing hackathon challenge.
- `judging.updateRoom`: rename, reorder, or change a room challenge with the
  approved revocation behavior.
- `judging.archiveRoom`: revoke active QR and guest sessions, close presence,
  and archive the room.
- `judging.generateRoomAccess`: create the only active QR link and lock the
  inventory.
- `judging.revokeRoomAccess`: revoke the active QR and all child guest
  sessions.
- `judging.rotateRoomAccess`: revoke the active QR and sessions, then return a
  new signed URL.
- `judging.revokeGuestSession`: revoke one guest browser session and close its
  presence.
- `judging.removeJudgeFromRoom`: close one member presence without changing
  account permissions.

Judge procedures:

- `judging.getContext`: return principal kind, room, challenge, name, and room
  selection options appropriate for the principal.
- `judging.completeGuestName`: validate a guest name, create the judge, and join
  the QR room.
- `judging.selectRoom`: member-only join, switch, or leave behavior.
- `judging.heartbeat`: update recent presence for the resolved principal.
- `judging.endGuestSession`: revoke the caller's guest session and clear its
  presence.

Activation uses an API-owned server function called by the Blade route rather
than a client-callable public mutation. Every officer mutation calls an explicit
`assertCanManageJudging` access helper near the top and declares audit coverage.

## Import behavior

The existing multipart route remains the transport boundary. The API import
service determines allowed modes from durable lock state.

### Unlocked replacement

Before `projectInventoryLockedAt` exists, preserve current authoritative
replacement behavior.

### Locked add-only import

The normal import route runs in add-only mode after lock:

- parse and validate the complete Devpost export with the existing parser;
- group records by normalized submission URL;
- query existing normalized URLs for the selected hackathon;
- skip existing groups without comparing or updating their fields;
- insert only accepted unseen projects and members;
- reuse exact existing challenge labels and create newly encountered labels;
- add project-to-challenge rows only for newly inserted projects;
- never delete or update existing projects, challenges, rooms, links, judges,
  sessions, or presence; and
- write one aggregate audit event without raw CSV or participant PII.

Concurrent add-only imports serialize on the selected hackathon and rely on the
existing hackathon-scoped submission URL uniqueness constraint as a final
guard.

### Locked destructive replacement

A separate request mode requires the exact hackathon display name. The API:

1. Parses the file and locks the selected hackathon.
2. Rejects the operation if an active room references a challenge label absent
   from the replacement.
3. Revokes all active room access links and their guest sessions.
4. Closes active guest presence.
5. Reconciles challenges by exact label, preserving IDs for matches, adding new
   labels, and removing unreferenced labels.
6. Replaces the project inventory atomically.
7. Leaves rooms and the inventory lock intact.
8. Writes one destructive aggregate audit event.

Any failure rolls back the replacement and revocation work together.

## Validation

- Room names are trimmed, 1 to 120 characters, and unique among active rooms in
  one hackathon.
- Room display order is a bounded non-negative integer.
- Room, challenge, project, link, judge, and session IDs are UUIDs.
- Room challenge assignment uses a database-scoped foreign key and API check.
- Guest display names are trimmed, 2 to 100 characters, permit ordinary Unicode
  names, reject control characters, and do not need to be unique.
- QR activation signatures use constant-time comparison and a dedicated secret.
- Activation rejects malformed, unknown, revoked, archived, or cross-hackathon
  link state with one safe invalid-link response.
- Session credentials contain at least 256 random bits and are stored only as
  SHA-256 hashes.
- The activation URL is removed before any page renders project data or sends
  external link referrers.
- Guest procedures derive hackathon, room, and challenge scope from the session.
- Add-only import identity is the existing normalized Devpost URL contract.
- Full replacement confirmation matches the selected hackathon display name
  exactly.
- Logs, diagnostics, and audit metadata omit QR signatures, session tokens,
  guest cookies, project PII, and guest names unless a narrow operational record
  requires the name itself.

## Data, migration, and compatibility

The feature requires new Drizzle tables, relations, indexes, checks, and scoped
foreign keys. Generate the migration through the normal Drizzle workflow.

The migration is additive. Existing project and challenge rows remain. Existing
hackathons begin unlocked with no rooms, links, judges, sessions, or presence.

The challenge table needs a stable exact-label reconciliation path. Add or
confirm a composite identity suitable for scoped room foreign keys. Do not
reuse the retired legacy judge-session schema or the old room-name string
model.

Shared development backups must drop judging configuration, rooms, links,
guest sessions, judge identities, and presence. Update the sanitizer's explicit
classification and migration-lineage tests in the same change.

Rollout order:

1. Apply the additive migration.
2. Deploy compatible API and Blade code together.
3. Provision rooms and test QR activation with synthetic judge names.
4. Generate production room QRs only after the final Devpost replacement
   import.

Rollback before QR generation may remove the new tables. Rollback after QR
generation invalidates all printed QRs and loses room presence history. Export
room configuration first if operational recovery needs it.

## Discord integration

Guest access has no Discord dependency and causes no Discord side effects.
Existing Discord-linked roles continue to supply `IS_JUDGE` and `IS_OFFICER`
for member principals. The feature does not create Discord users, join guests
to the guild, or assign roles.

## Configurability review

Would this require a developer change next year?

- Answer: No. Officers choose the hackathon, provision rooms, select imported
  challenges, generate and rotate QRs, and monitor judges through Blade.
- Session duration and heartbeat thresholds are stable security rules. Room
  names, challenge assignments, QR state, and inventory lock state live in
  hackathon-scoped tables.

## React and frontend constraints

- Keep judge and officer pages server-side. Do not add `"use client"` to a page
  or layout.
- The judge layout resolves member or guest access and renders either the
  existing `AuthenticatedShell` or a small guest judging shell.
- Do not load the project directory behind the incomplete guest name dialog.
- The guest dialog disables close, outside click, and Escape. It contains one
  name field, direct privacy copy, pending state, field error, and safe server
  error.
- The officer control panel uses full-width room rows or a compact grid with
  bounded roster disclosure. Do not create a card for every judge.
- Use a dialog for room creation and bounded edits. Use a viewport-safe dialog
  for enlarged QR display and printing.
- Use existing Blade tokens, page layers, form controls, badges, tooltips, and
  toasts. Reserve gold for live QR or judging status rather than decoration.
- The authenticated room selector applies immediately and persists through
  server state. The room's challenge becomes the initial URL filter, but later
  filter changes do not alter room presence.
- Poll the control panel only while visible. Pause guest and member heartbeat
  work when the document is hidden.
- Provide explicit loading, empty-room, no-QR, revoked, expired-session,
  reconnect, import-locked, add-only result, and destructive-error states.
- Verify the guest flow, command center, QR dialog, room selector, and project
  directory at 1440px, 390px, and 320px.

## Testing and verification strategy

- `packages/auth`: token signing, constant-time verification, cookie metadata,
  hashing, malformed credential, and secret-separation tests.
- `packages/db`: migration, scoped foreign keys, active uniqueness, one-room
  presence, and backup-sanitizer tests.
- `packages/validators`: room, name, room-selection, and protected-import inputs.
- `packages/api`: principal resolution, room lifecycle, activation, presence,
  revocation, project scoping, add-only import, and destructive replacement
  integration tests.
- `apps/blade`: guest name gate, minimal shell, member room selector, room
  control panel, QR states, and import mode component tests.
- Playwright: high-value guest and authenticated flows on desktop and mobile,
  including direct URL tampering and QR revocation.

Expected commands include targeted Vitest suites, disposable PostgreSQL
integration tests, `pnpm db:generate`, `pnpm db:migrate`, Blade Playwright,
`pnpm analyze:react:changed`, `pnpm verify:precommit`, and `pnpm build`.

## Open questions

- None blocking artifact review. The implementation may refine procedure names
  without changing their documented ownership or access rules.
