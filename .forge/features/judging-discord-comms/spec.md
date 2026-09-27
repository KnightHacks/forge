# Judging Discord comms spec

Status: Approved from the 2026-09-05 implementation request

> This file owns the user and product behavior. Technical design belongs in `srd.md`.

## User-facing purpose

Judging rooms need a quiet way to reach organizers while pitches are underway.
Walkie-talkies interrupt presenters, and authenticated organizers already have
Discord on their phones. Officers should be able to connect the judging room
workspace to one Discord channel, then use a room-specific thread for updates
and guest QR delivery. Officers also need a fast way to place an operational
notice over the judging workspace without interrupting a pitch.

## Users and actors

- **Officer:** chooses or removes the hackathon's judging communications
  channel and manages room QR access.
- **Authenticated judge:** a Blade user with judge or officer access who may
  select a room. Discord mentions let this judge find that room's thread.
- **Guest judge:** enters through the existing room QR flow. Completing the
  full-name dialog announces the guest to that room's authenticated judges. The
  guest does not need Discord and is never mentioned as a Discord user.

## User-visible interface

### Communications channel

The Rooms tab in Command Center has a `Judging communications` panel. An
officer can search the active environment's Knight Hacks guild text channels,
select one, save it, or disconnect Discord communications.

The setting is optional. Rooms, QR generation, room assignment, and revocation
continue to work when no channel is selected or Discord is unavailable.

Saving a channel creates a thread named after each active room. A room created
later receives its thread automatically. Changing the channel creates new room
threads under the new channel. Existing Discord history stays in the old
channel.

The panel shows the selected channel, connection state, and any rooms whose
thread could not be provisioned. Officers can retry provisioning without
changing the channel.

### Room thread access and arrivals

When an authenticated judge newly selects or switches into a room, Blade posts
a short notice in that room's thread and mentions that judge. The mention makes
the thread visible in Discord. Reopening the page and presence heartbeats do
not send another notice.

Authenticated judges who enter a room by scanning its QR receive the same
mention.

When a guest completes the required name dialog, Blade posts a guest-arrival
notice with the entered name and mentions the authenticated judges currently
assigned to the room. QR activation alone stays quiet because the guest has not
identified themselves yet. Guest heartbeats and page reloads do not post.

Every Blade view that identifies an authenticated judge uses the current full
name from that judge's Member profile. This includes room rosters, feedback,
scores, evaluation history, and deliberation. The linked Discord account label
is the fallback only when no Member profile name is available. Guest judges
keep the full name they entered during QR access.

Each connected room includes an `Open thread` link in Command Center.

### QR delivery

Creating a room's first active QR posts the QR image and activation link in the
room thread. It mentions the authenticated judges currently assigned to the
room.

An active room has a separate `Send QR` action. It posts the current QR again
without rotating or revoking it. Opening the QR preview does not post to
Discord.

Rotating a QR revokes the old access, creates the replacement, and posts the
new QR image and link. The notice mentions assigned authenticated judges.

### Revocation notices

Revoking one guest session posts the guest's display name and the officer who
revoked access. Revoking a whole room QR identifies the affected guest judges,
when any are named, and explains that the room QR is no longer valid. Both
notices mention authenticated judges currently assigned to the room.

Discord delivery never controls the security result. A join, guest sign-in,
revocation, or rotation still succeeds if the message cannot be sent. Blade
reports the Discord failure where an initiating user is present. The live room
roster remains the source of truth for guest presence.

### Judging announcements

The Rooms tab lets an officer publish either a hackathon-wide announcement or
an announcement for one room. Each scope has one current announcement.
Publishing another message in the same scope replaces the current one, and an
officer can clear either scope independently.

Announcements target authenticated judges by default. An explicit `Include
guest judges` switch also shows the announcement to QR guests. A guest never
sees a room announcement for another room.

Current announcements appear over the judging workspace. A standard notice is
a persistent banner with an X. It never disappears on a timer. An urgent notice
opens as a blocking dialog that the judge must acknowledge. Both forms remain
available on Projects, Submissions, Deliberation, project details, and while a
judge fills out feedback. Their labels identify whether they apply to all
judging rooms or the selected room.

Publishing also posts to Discord. A global announcement posts in the root
judging communications channel and mentions every authenticated judge for the
hackathon who has a linked Discord account. A room announcement posts in that
room's thread and mentions the authenticated judges currently assigned there.
Guest judges can see eligible Blade notices but are never Discord recipients.
The announcement remains published in Blade if Discord delivery fails.

The server renders the current notices on first load. While the judging page
stays open, Blade checks every 30 seconds for replacements and cleared notices,
including while the tab is hidden. Announcements do not depend on Discord or a
webhook.

## Scope

### In scope

- Optional communications channel per hackathon judging configuration.
- Searchable guild text-channel selection through the existing combobox pattern.
- One durable Discord thread reference per active judging room.
- Thread provisioning when the channel is saved and when rooms are created.
- Authenticated judge room-entry mentions.
- Named guest arrival notices with authenticated room-judge mentions.
- QR image and link delivery on first generation, explicit resend, and rotation.
- Guest-session and room-link revocation notices.
- Links from Command Center to room threads.
- Safe partial-failure feedback and retry.
- Hackathon-wide and room-scoped judging announcements.
- Authenticated-only delivery by default, with optional guest delivery.
- Server-rendered notices followed by 30-second polling.
- Persistent banners, urgent acknowledgement dialogs, and Discord delivery.

### Out of scope

- Discord accounts or mentions for guest judges.
- General judging chat outside room threads.
- Mirroring messages between Blade and Discord.
- Reading Discord thread messages inside Blade.
- WebSockets or a new Discord bot command.
- Deleting old threads when an officer changes or removes the channel.
- Scheduling presentations or notifying hackers.
- Push notifications and WebSockets for announcements.

## Vocabulary

- **Root communications channel:** the optional Discord text channel that owns
  all judging room threads for one hackathon.
- **Room thread:** the Discord thread tied to one durable judging room.
- **Assigned authenticated judge:** a member judge with current presence in
  the room. Guest sessions do not count as Discord recipients.
- **Guest arrival:** the one-time notice sent after a guest successfully saves
  their display name.
- **Send QR:** repost the current active room QR without changing its access
  credential.
- **Judging announcement:** the current operational notice for either the
  hackathon or one room.

## Acceptance criteria

- An officer can search and select a text channel from the configured
  development or production guild.
- Saving is allowed with no channel selected, and all non-Discord judging
  behavior remains available.
- Saving a channel creates or reuses one thread for every active room.
- A room created after channel setup receives a thread.
- Changing the channel creates replacement room threads without deleting old
  Discord history.
- A newly assigned authenticated judge is mentioned once in the room thread.
- Authenticated QR entry sends the same room-entry mention.
- A guest's completed name step posts one arrival notice and mentions current
  authenticated room judges.
- The guest identity field is labeled `Full name`.
- Authenticated judge names shown in judging views come from current Member
  profiles, with the Discord account label as fallback.
- Guest QR activation, page reloads, and heartbeat polling send no message.
- First QR generation posts its image and link in the room thread.
- Viewing an existing QR does not post it again.
- `Send QR` posts the current QR without changing its URL or link ID.
- QR rotation posts only the replacement QR and leaves the security change in
  effect if Discord delivery fails.
- Guest revocation names the revoked guest and actor in the room thread.
- Room-link revocation names affected guests when available.
- QR, guest-arrival, and revocation messages mention only current
  authenticated room judges.
- Discord messages cannot produce `@everyone`, `@here`, role, or arbitrary
  user mentions from room names or guest names.
- Command Center shows the configured channel and provides room-thread links.
- A Discord outage never rolls back a room join, guest sign-in, QR creation,
  rotation, or revocation.
- An officer can publish, replace, and clear a global announcement or one room's
  announcement.
- Publishing a global announcement posts it in the root communications channel
  and mentions authenticated hackathon judges. Publishing a room announcement
  posts it in the room thread and mentions assigned authenticated judges.
- Announcements default to authenticated judges. Guests see only announcements
  whose officer enabled guest delivery.
- Authenticated judges see the global announcement and the announcement for
  their selected room. Guests see the eligible global announcement and the
  eligible announcement for their QR room.
- Room announcements never cross room boundaries.
- Current notices render on the first server response and update within 30
  seconds while the judging page remains open.
- Standard notices stay above the judging workspace until the judge dismisses
  them with an X. Urgent notices block interaction until acknowledged. No notice
  disappears on a timer.
- A Discord failure is reported to the officer but does not undo the Blade
  announcement.

## Open questions

None blocking. Message wording may tighten during visual and live Discord
review without changing this contract.
