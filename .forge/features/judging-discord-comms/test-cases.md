# Judging Discord comms test cases

Status: Approved from the 2026-09-05 implementation request

## Scope and placement

These cases cover channel configuration, room threads, arrival notices, QR
delivery, revocation, permissions, message safety, failure isolation, and the
Command Center UI. Validators, API utilities and router tests, migration tests,
Blade tests, and manual desktop/mobile checks own the proof.

## Test cases

### TC-001: connect judging communications

Saving a valid guild text channel persists it and provisions one named thread
for every active room. Command Center shows the connected channel and links.

### TC-002: keep Discord optional

With no channel, room assignment and every QR action still work. Delivery
returns `not_configured` and the UI never claims a message was sent.

### TC-003: change or clear the channel

Changing channels creates replacement active-room threads and leaves old
history intact. Clearing the channel clears current thread references without
disabling judging.

### TC-004: provision new rooms

Creating a room after channel setup commits the room and creates its sanitized
thread.

### TC-005: retry partial provisioning

If one room fails, successful thread IDs stay saved, failed rooms are named,
and retry provisions only missing threads.

### TC-006: mention a member on new entry

Selecting a room or entering through an authenticated QR commits presence and
sends one notice that allowlists and mentions that member.

### TC-007: keep repeated member activity quiet

Same-room selection, reloads, and heartbeats refresh presence without another
Discord post.

### TC-008: announce a named guest

Successful guest name completion commits identity and presence, posts the inert
guest name once, and mentions authenticated judges currently in the room.

### TC-009: keep other guest activity quiet

Guest QR activation, reloads, and heartbeats do not post.

### TC-010: post only a newly generated QR

First generation posts the PNG and link with current member mentions. Viewing
an existing QR sends nothing.

### TC-011: resend the current QR

`Send QR` posts the unchanged active link and a fresh PNG. It mentions every
authenticated judge assigned at send time and does not change guest sessions.

### TC-012: rotate and deliver the replacement

Rotation revokes old access, commits a new link, and posts only the replacement
QR with current member mentions.

### TC-013: announce guest revocation

Individual revocation commits, identifies the guest and actor in the thread,
and mentions current member judges without treating the guest as a Discord user.

### TC-014: announce room-link revocation

Room-link revocation commits, identifies affected named guests within Discord
limits, and mentions current member judges.

### TC-015: render thread links safely

An active room thread links to
`https://discord.com/channels/{resolvedGuildId}/{threadId}` in a new tab.

### TC-016: support desktop and mobile channel search

Channel name and ID search works with long and numerous channels at desktop and
390px widths. Controls retain 44px targets and no document overflow appears.

### TC-017: publish a global announcement

An officer publishes a message with the default audience. Every authenticated
judge for the hackathon sees an `All judging rooms` notice. QR guests do not.
The root Discord channel receives the message and linked member mentions.

### TC-018: include guests in a global announcement

Enabling `Include guest judges` exposes the global Blade notice to authenticated
judges and active QR guests for that hackathon. Guests are not Discord
recipients.

### TC-019: publish a room announcement

An authenticated judge assigned to the room sees its notice. A member in
another room and a member without a room do not. A QR guest in the room sees it
only when guest delivery is enabled. The room thread receives the message and
mentions assigned authenticated judges.

### TC-020: replace and clear an announcement

Publishing again in the same scope clears the old row and makes only the new
message current. Clearing removes the notice from the next read while retaining
the stored history.

### TC-021: render notices before hydration

The first server response includes every announcement visible to the principal.
There is no empty announcement flash while the client hydrates.

### TC-022: poll every 30 seconds

An open judging page picks up publications, replacements, and clears within 30
seconds. Polling continues while the document is hidden.

### TC-023: dismiss standard notices explicitly

A standard notice never expires on a timer. Selecting its X hides that exact
announcement in the browser. A replacement in the same scope appears because
it has a new ID.

### TC-024: acknowledge urgent notices

An urgent global or room announcement opens above the judging workspace and an
open feedback form. Judging interaction remains blocked until the judge
acknowledges that announcement ID.

### TC-025: expose current state in Command Center

The Rooms tab shows the current global notice and each room's current notice,
including guest visibility and urgency. Officers can replace or clear either
one.

### TC-026: show human names for every judge

Room rosters, score feedback, and officer evaluation history show an
authenticated judge's current Member full name even when the stored Judge label
contains a Discord username. An authenticated judge without a linked Member
profile keeps the stored Discord label. Guest judges keep the full name entered
through the field labeled `Full name`.

## Negative and regression cases

### TC-NEG-001: reject a foreign or unsupported channel

The API returns `BAD_REQUEST`, preserves prior configuration, and creates no
threads.

### TC-NEG-002: enforce officer access

Guests and non-officer judges cannot discover channels, save configuration,
retry provisioning, or send a QR.

### TC-NEG-003: isolate Discord failures

Room entry, guest completion, QR creation, rotation, and revocation remain
committed when Discord fails. Delivery reports `failed`.

### TC-NEG-004: contain hostile names

Markdown, `@everyone`, `@here`, and mention syntax in names stay inert.
Allowed mentions contain only validated current member IDs.

### TC-NEG-005: skip invalid Discord IDs

Malformed member Discord IDs are omitted without affecting other recipients.

### TC-NEG-006: recover a missing room thread

A deleted or unusable stored thread is replaced and saved before delivery.

### TC-NEG-007: require an active QR for resend

`sendRoomQr` returns `NOT_FOUND` and sends nothing when no active link exists.

### TC-NEG-008: preserve archived-room history

Archived rooms receive no replacement thread and show no active send controls.

### TC-NEG-009: prevent announcement scope spoofing

Guests and members cannot request announcements for an arbitrary room. The API
derives room visibility from the signed guest session or current member
presence.

### TC-NEG-010: enforce announcement permissions

Guests and non-officer judges cannot publish, replace, or clear announcements.

### TC-NEG-011: reject invalid announcement content

Blank text, text over 1,000 characters, and control characters fail validation
without replacing the current message.

### TC-NEG-012: serialize same-scope publication

Concurrent publications leave exactly one current row in a scope. Global and
room scopes do not clear one another.

### TC-NEG-013: isolate announcement Discord failure

Blade publication stays current and the officer sees `failed` when Discord
cannot accept the global or room announcement.

## Open questions

None.
