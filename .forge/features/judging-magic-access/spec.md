# Judging Magic Access Spec

Status: Approved on 2026-09-03

> This file owns the non-technical user and product intent. Technical design belongs in `srd.md`.

## User-facing purpose

Industry sponsor judges need to enter Blade and review the projects assigned to
their challenge without creating a Discord account, joining the Knight Hacks
server, or completing a member profile.

Officers need to provision physical judging rooms, associate each room with a
challenge, generate and revoke room QR codes, and see who is currently using
each room. Rooms must remain durable because a later judging scheduler will use
them when assigning project presentations.

Authenticated judges and officers keep the normal Blade experience. They may
optionally join a room so officers can see where they are, but room selection
does not remove their existing access to other challenges.

## Users and actors

- **Officer:** provisions rooms, assigns room challenges, manages room QR
  codes, monitors judge presence, revokes guest access, and manages protected
  project imports after judging setup begins.
- **Authenticated judge:** a Blade user whose effective permissions include
  `IS_JUDGE`. The judge may select or leave a room and may view any challenge in
  the active hackathon.
- **Authenticated officer:** a Blade user whose effective permissions include
  `IS_OFFICER`. The officer has the same unrestricted project access and
  optional room selection as an authenticated judge.
- **Guest judge:** a sponsor judge who enters through a room QR code, supplies
  a display name, and may view only projects associated with that room's
  challenge.
- **Authenticated user without judge or officer access:** may use a valid room
  QR as a guest but does not gain unrestricted judge access from their Blade
  account.
- **Unauthenticated visitor without a valid room QR:** cannot reach the judge
  project directory or judging control panel.

## User-visible interface

### Room provisioning

The officer judging control panel is reached from the project administration
workflow. An officer selects a hackathon and can:

- create a room with a human-readable name and one imported challenge;
- create several rooms for the same challenge;
- assign a room to `General`, which intentionally grants guest judges access to
  every imported project;
- rename or reorder rooms before judging;
- change a room's challenge before its QR is active;
- archive a room that is no longer used; and
- inspect room state without opening the guest judge page.

Rooms are stored separately from their QR codes and judge sessions. Revoking a
QR does not delete the room.

### Room QR management

Each active room can have one active QR code. The officer can:

- generate a QR from an existing room;
- enlarge or print the QR;
- copy its activation link;
- revoke the QR and every guest session created from it; and
- rotate the QR, which revokes the current credential and creates a new one.

The QR remains valid until an officer revokes or rotates it. Generating the
first QR for a hackathon locks that hackathon's project inventory against the
ordinary replacement-import flow.

Changing the challenge of a room with an active QR requires a destructive
confirmation. The change revokes the current QR and its guest sessions, then
the officer generates a new QR for the updated room.

### Guest judge entry

Scanning a valid room QR opens Blade and creates an individual guest browser
session. Blade immediately removes the activation credential from the visible
URL.

Before Blade loads project data, the guest sees a required name dialog. The
dialog has no close, outside-click, Escape, or skip path. It explains that the
name will be visible to organizers and attached to later judging activity.

After saving a valid name, the guest sees the responsive project directory
with:

- no normal Blade sidebar or navigation;
- the hackathon, room, challenge, and entered name in a compact header;
- search, sorting, pagination, project details, and Devpost links;
- a fixed challenge indicator that cannot be changed; and
- an action to end the guest session on that device.

A guest in a room assigned to `General` may view every project. A guest in any
other room may view only projects associated with that challenge.

### Authenticated judge room selection

An authenticated judge or officer keeps the current Blade shell and full
project directory. The page includes an optional room selector.

When the user selects a room:

- the user appears in that room's officer roster;
- the challenge filter initially changes to the room's challenge;
- the user may select another challenge afterward without leaving the room;
  and
- returning to the page restores the current room selection.

The user may switch rooms or choose no room. Scanning a room QR while signed in
with judge or officer access selects that room without creating a guest session
or showing the name dialog.

### Judging control panel

The officer control panel shows each room's:

- name and challenge;
- QR state;
- current judge count;
- judge names;
- guest or authenticated account type;
- joined and last-seen times; and
- access actions.

The roster refreshes while the control panel is open. Officers can revoke one
guest session, remove an authenticated judge from a room, revoke the room QR,
or rotate it. QR misuse detection is operational rather than identity proof. A
guest supplies their own name, so an officer uses unexpected names, counts,
and activity as warning signs.

### Protected imports after QR generation

Before the first QR is generated, Devpost import keeps its current
authoritative replacement behavior.

Generating the first QR locks the inventory. While locked, the normal import
action becomes `Add new projects`:

- normalized Devpost URL identifies an existing project;
- existing projects are skipped without overwriting fields, members, manual
  edits, or challenge assignments;
- unseen projects are added;
- new challenge labels may be added;
- existing challenges, rooms, QR codes, and sessions remain unchanged; and
- the result distinguishes added projects, already-known projects, rejected
  projects, and newly created challenges.

An officer may still choose a separate full replacement action. It requires
typing the hackathon display name and warns that every active room QR and guest
session will be revoked. Exact matching challenge records keep their identity
so rooms remain attached. Blade blocks the replacement when it would remove a
challenge still assigned to an active room. The officer must first reassign or
archive that room.

The inventory stays locked after a destructive replacement.

## Scope

### In scope

- First-class, hackathon-scoped judging rooms.
- One challenge per room, including intentional `General` access.
- Several rooms assigned to the same challenge.
- Officer room provisioning, editing, ordering, and archival.
- Officer QR generation, display, printing, copying, revocation, and rotation.
- Guest judge activation without Discord or a Blade member profile.
- Required guest display-name collection before project data loads.
- A projects-only guest judge layout.
- Guest project access limited to the room challenge.
- Optional room selection for authenticated judges and officers.
- Full challenge choice for authenticated judges and officers after room
  selection.
- Live room counts, names, actor types, and recent activity for officers.
- Individual guest-session revocation and authenticated room removal.
- Automatic project-inventory locking when the first QR is generated.
- Add-only Devpost import after the inventory locks.
- A typed-confirmation full replacement path with room safety checks.
- Audit records for officer room, QR, revocation, and destructive import
  actions without guest session credentials.

### Out of scope

- Project presentation scheduling or optimization.
- Assigning projects or teams to room time slots.
- Scores, rubrics, feedback, ranking, winners, or results.
- Verified sponsor identity or company-domain authentication.
- Email, SMS, or Discord delivery of QR codes.
- Camera scanning inside Blade. Officers display or print standard QR codes.
- IP-based blocking, device fingerprinting, geofencing, or captive-network
  controls.
- Automatic room assignment for authenticated judges.
- Multiple simultaneous room memberships for one judge.

## Vocabulary

- **Room:** a durable, hackathon-scoped physical judging location associated
  with one challenge.
- **Room challenge:** the challenge used as the default for authenticated room
  members and the enforced project scope for guest judges.
- **Room QR:** a reusable activation credential generated from one room and
  valid until an officer revokes or rotates it.
- **Guest judge:** a judge authorized through a room QR rather than Blade role
  permissions.
- **Authenticated judge:** a Blade user with effective `IS_JUDGE` or
  `IS_OFFICER` access.
- **Judge presence:** the current relationship between one judge and one room,
  including joined and recent-activity information.
- **Inventory lock:** the durable state entered when a hackathon's first room
  QR is generated. Ordinary imports become add-only afterward.
- **Add-only import:** an import that inserts projects with unseen normalized
  Devpost URLs and leaves all existing project records untouched.
- **Full replacement:** the existing authoritative inventory replacement,
  retained as a separate destructive officer action after inventory lock.

## Acceptance criteria

- An officer can create multiple rooms for one hackathon and assign each room
  to an imported challenge.
- Multiple rooms may use the same challenge.
- A room assigned to `General` grants its guest judges access to every active
  project in that hackathon.
- An officer generates a QR from a provisioned room rather than entering room
  text while generating the QR.
- Revoking or rotating a QR leaves the room intact.
- Revoking a QR prevents new activation and ends guest sessions created from
  that QR.
- A guest can scan a valid QR and enter Blade without Discord, guild
  membership, or a member profile.
- Blade removes the QR credential from the URL before showing the project
  directory.
- Project data is not loaded or rendered before the guest submits a valid name.
- The guest name dialog cannot be dismissed or skipped.
- A named guest sees a minimal projects-only layout without the normal Blade
  sidebar or navigation.
- A non-General guest sees only projects in the room challenge through list,
  search, pagination, and direct project-detail requests.
- Client URL or filter changes cannot widen guest project access.
- An authenticated judge or officer skips the guest name flow and keeps full
  challenge access.
- An authenticated judge or officer may join, switch, or leave a room.
- Joining a room initially selects its challenge but does not lock the
  authenticated user's filter.
- An authenticated judge who scans a room QR joins that room without becoming
  a guest.
- The control panel shows current judges, names, account types, joined times,
  last-seen times, and room counts.
- An officer can revoke an individual guest session without revoking unrelated
  room sessions.
- The first generated QR locks the hackathon inventory.
- Add-only import skips normalized Devpost URLs already stored for the
  hackathon and inserts only unseen projects.
- Add-only import does not change existing projects, challenge assignments,
  rooms, QR codes, or sessions.
- Full replacement after lock requires the exact hackathon display name and
  revokes active room QR codes and guest sessions.
- Full replacement preserves exact matching challenge identities and blocks
  removal of a challenge assigned to an active room.
- Room and guest access configuration requires no yearly code change.
- No scoring or scheduling controls appear in this slice.

## Open questions

- None blocking artifact review. Interface copy and the final control-panel
  route name may change during design review without changing the product
  contract.
