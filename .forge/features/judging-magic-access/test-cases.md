# Judging Magic Access Test Cases

Status: Approved on 2026-09-03

> This file owns observable proof for this slice.

## Scope

These cases cover room provisioning, QR access, guest and member judge
behavior, room presence, project scoping, and protected imports. Scheduling,
scoring, rubrics, ranking, and winner selection remain outside this slice.

## Test placement plan

- **`packages/auth`:** deterministic room-link signing, session credentials,
  cookie behavior, and invalid credential handling.
- **`packages/db`:** room and challenge scope, active-link uniqueness, judge
  identity, one-room presence, migrations, and backup exclusion.
- **`packages/validators`:** room, name, selection, and import-mode validation.
- **`packages/api`:** room workflows, principal access, project filtering,
  presence, revocation, and import transactions.
- **`apps/blade`:** name gate, guest shell, room controls, room selector, QR
  states, roster, and import warnings.
- **Playwright:** guest QR and authenticated room flows on desktop and mobile.

Exact commands and results belong in `status.md` when implementation tests are
created.

## Test cases

### TC-001: Officers provision durable rooms from imported challenges

Setup:

- A hackathon has imported `General` and sponsor challenges.
- An officer opens the judging control panel.

Action:

- The officer creates several rooms, including two rooms for one sponsor
  challenge and one room for `General`.

Expected observations:

- Each room is a separate saved object with its own name and challenge.
- Multiple rooms may share a challenge.
- The `General` room is accepted and clearly indicates all-project guest access.
- No QR or guest session exists until the officer generates one from a room.

### TC-002: Room QR lifecycle preserves the room

Setup:

- An active room has no QR.

Action:

- The officer generates, reopens, copies, revokes, and then regenerates the room
  QR.

Expected observations:

- One active QR exists at a time and can be rendered again after navigation.
- Revocation prevents activation of the old QR.
- Regeneration produces a different working activation URL.
- The room and its challenge remain unchanged through every QR action.

### TC-003: Guest activation removes the credential and requires a name

Setup:

- A guest browser has no Blade account session.
- The browser opens a valid room QR.

Action:

- Blade processes the activation and redirects.

Expected observations:

- The final URL contains no activation credential.
- Only the required name dialog is rendered before completion.
- Project names, totals, details, and links are absent from the incomplete page
  response.
- Escape, outside click, browser focus changes, and an empty submission do not
  bypass the dialog.

### TC-004: Completing a guest name creates judge identity and presence

Setup:

- A valid incomplete guest session exists for one room.

Action:

- The guest submits a valid display name.

Expected observations:

- Blade opens the guest project directory without normal navigation.
- The header shows the saved name, room, hackathon, and room challenge.
- The control panel shows one guest judge in that room with joined and
  last-seen times.
- Another guest may use the same display name without an identity collision.

### TC-005: Sponsor guest access is locked to the room challenge

Setup:

- The hackathon has projects in Challenge A, Challenge B, both challenges, and
  neither sponsor challenge.
- A named guest entered through a Challenge A room.

Action:

- The guest searches, sorts, paginates, changes URL parameters, and requests
  project details directly.

Expected observations:

- Only projects associated with Challenge A appear.
- The challenge indicator cannot be changed.
- A project shared by A and B appears once.
- Challenge B and unrelated project details return safe not-found or forbidden
  behavior without leaking project data.

### TC-006: General guest access intentionally includes every project

Setup:

- A named guest entered through a room assigned to `General`.

Action:

- The guest browses the project directory and opens project details.

Expected observations:

- Every active, non-deleted project in that hackathon is available because all
  imported projects belong to `General`.
- Inactive hackathons and deleted projects remain unavailable.
- The page still presents `General` as a fixed guest scope.

### TC-007: Authenticated judges retain full access after room selection

Setup:

- A user has effective `IS_JUDGE` access and no selected room.
- Two active rooms use different challenges.

Action:

- The judge joins the first room, changes the project filter, switches rooms,
  and then leaves the room.

Expected observations:

- Joining initially selects the room challenge and adds the judge to its
  roster.
- The judge may change to any challenge without leaving the room.
- Switching closes the old presence and moves the judge to the new roster.
- Leaving removes current room presence without changing judge permission.
- No guest name dialog appears.

### TC-008: Authenticated QR scans select a room without reducing access

Setup:

- A browser is signed in with `IS_JUDGE` or `IS_OFFICER`.
- The browser opens a valid room QR.

Action:

- Blade processes the activation.

Expected observations:

- The account joins the room as an authenticated judge.
- Blade does not create a guest judge session or request a name.
- The room challenge is initially selected.
- The account keeps unrestricted challenge access and the normal Blade shell.

### TC-009: Member principal wins over stale guest state

Setup:

- A browser has both a valid guest cookie and an authenticated account session.

Action:

- The browser opens the judge directory as a judge, as an officer, and as an
  authenticated user without either permission.

Expected observations:

- Judge and officer accounts use the unrestricted member principal.
- A non-judge account may still use the valid guest principal.
- The browser never receives combined or wider permissions from both states.

### TC-010: The control panel reports current room activity

Setup:

- Rooms contain active guests, authenticated judges, recently inactive judges,
  and ended presence records.

Action:

- An officer leaves the control panel open while judge heartbeats and room
  changes occur.

Expected observations:

- Counts and names refresh without a page reload.
- Each entry identifies guest or authenticated access and shows joined and
  last-seen times.
- Active and recently inactive states are distinguishable.
- Ended presence does not count as currently in the room.

### TC-011: Officers can contain suspicious access

Setup:

- One room QR has several guest sessions and one unexpected judge name.

Action:

- The officer first revokes only the unexpected session, then rotates the room
  QR.

Expected observations:

- Individual revocation ends only that guest's access and presence.
- QR rotation ends every remaining guest session created from the old QR.
- Authenticated judge presence is not revoked by QR rotation.
- The old QR fails and the new QR works.

### TC-012: Room challenge changes revoke distributed guest access

Setup:

- A room has an active QR and named guest sessions.

Action:

- The officer confirms changing the room to another challenge.

Expected observations:

- The old QR and its guest sessions are revoked before the challenge changes.
- The room remains and keeps its presence history.
- No guest silently gains the new challenge scope.
- The room requires a newly generated QR.

### TC-013: The first QR locks project inventory

Setup:

- A hackathon is unlocked and has provisioned rooms but no generated QR.

Action:

- The officer generates the first room QR, revokes it, and returns to project
  import.

Expected observations:

- QR generation and inventory lock succeed together.
- The import page now presents add-only import as the normal action.
- Revoking every QR does not unlock the inventory.
- Another hackathon remains unaffected.

### TC-014: Locked add-only import inserts only unseen Devpost URLs

Setup:

- A locked hackathon contains manually edited projects and active room state.
- A new export repeats existing normalized submission URLs, adds unseen
  projects, and introduces one challenge label.

Action:

- The officer runs the normal add-only import.

Expected observations:

- Unseen valid projects, members, and challenge links are inserted.
- Existing project fields, members, edits, and challenge assignments are byte
  for byte unchanged.
- The new challenge is created without replacing existing challenge records.
- Rooms, QR links, guest sessions, and presence remain active.
- The result reports added, already-known, rejected, and new-challenge counts.

### TC-015: Locked destructive replacement is explicit and atomic

Setup:

- A locked hackathon has rooms, active QR links, guest sessions, projects, and
  challenges. The replacement retains every active room challenge.

Action:

- The officer tries an incorrect confirmation, then supplies the exact
  hackathon display name and performs full replacement.

Expected observations:

- Incorrect confirmation changes nothing.
- Success revokes active room QR links and guest sessions.
- Exact matching challenge IDs and room assignments survive.
- The project inventory is replaced atomically and the inventory remains
  locked.
- A forced failure rolls back both data replacement and access revocation.

## Negative and regression cases

### TC-NEG-001: Room and control-panel mutations require officer access

Setup:

- Unauthenticated, guest, ordinary authenticated, judge, and officer actors
  exist.

Action:

- Each actor calls room provisioning, QR lifecycle, roster, revocation, and
  destructive import operations.

Expected observations:

- Only the officer succeeds.
- Every other actor receives the established safe unauthorized or forbidden
  result.
- Hiding the control panel is not the authorization boundary.

### TC-NEG-002: Forged and revoked QR credentials fail safely

Setup:

- Inputs include malformed signatures, changed link IDs, unknown links,
  revoked links, archived rooms, and a link paired with another hackathon.

Action:

- A browser attempts activation with each input.

Expected observations:

- Blade creates no guest session and returns one safe invalid-link experience.
- Responses and logs expose no signing secret, valid signature, room roster, or
  project data.

### TC-NEG-003: Guest session lifecycle closes every access path

Setup:

- Sessions include incomplete, expired, individually revoked, link-revoked,
  and valid named guest states.

Action:

- Each session requests list, detail, heartbeat, name completion, and session
  end operations.

Expected observations:

- Only the valid operation for each lifecycle state succeeds.
- Expired or revoked sessions cannot regain access by changing cookies or URL
  parameters.
- Ending a session clears presence and the browser credential.

### TC-NEG-004: Cross-hackathon room relationships are impossible

Setup:

- Two hackathons have separate challenges, rooms, links, judges, and projects.

Action:

- API and direct database attempts mix challenge, room, judge, presence, link,
  and project IDs across hackathons.

Expected observations:

- API validation rejects the requests.
- Scoped database constraints reject any bypass attempt.
- Neither hackathon's control panel or project directory exposes the other.

### TC-NEG-005: Replacement cannot remove a challenge used by an active room

Setup:

- A locked hackathon has an active room assigned to a sponsor challenge.
- A replacement export omits that challenge.

Action:

- The officer confirms full replacement.

Expected observations:

- The API reports which room assignment blocks replacement.
- Projects, challenges, rooms, QR links, sessions, and presence remain
  unchanged.
- Reassigning or archiving the room allows a later valid replacement.

### TC-NEG-006: Judging access data stays out of shared development backups

Setup:

- Production-like data contains rooms, active QR link rows, guest sessions,
  judge names, and presence history.

Action:

- The filtered development backup job runs.

Expected observations:

- No judging configuration, room, link, guest session, judge, or presence rows
  appear in the shared backup.
- The backup process does not log raw credentials or guest names.
- Adding a future table without a keep-or-drop decision fails the sanitizer
  test.

## Open questions

- None blocking test-case review.
