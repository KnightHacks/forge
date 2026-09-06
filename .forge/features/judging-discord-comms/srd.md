# Judging Discord comms SRD

Status: Approved from the 2026-09-05 implementation request

## Technical purpose

Connect judging rooms and QR access to optional, hackathon-scoped Discord
communications. Forge stores the selected root channel and each room's current
thread. Discord writes happen after judging state commits and return a separate
delivery result.

## Relevant principles

- Keep Blade pages server-first and business logic in `@forge/api`.
- Use officer-managed data instead of hard-coded yearly Discord IDs.
- Resolve the guild through the existing environment-aware Discord config.
- Keep Discord calls outside database transactions.
- Follow `apps/blade/DESIGN_SYSTEM.md` for the Command Center UI.

## Access policy

- Guests and unauthenticated users cannot list channels, configure Discord, or
  send QR messages.
- Guest QR activation stays quiet. Successful name completion may announce the
  guest to the room thread.
- Authenticated judges may trigger a self-mention only when newly assigned to a
  configured room.
- Existing officer project-management permission gates protect every
  configuration, provisioning, resend, rotation, and revocation procedure.

## Architecture and data flow

- `@forge/db` owns additive nullable channel and thread columns.
- `@forge/validators` owns the nullable channel input.
- `@forge/api` owns channel validation, thread lifecycle, payload safety,
  recipient resolution, QR attachments, and delivery status.
- Blade owns the responsive channel combobox, thread links, actions, and toasts.
- `@forge/utils/discord` remains the REST client.

### Stored state

`HackathonJudgingConfiguration` gains nullable
`judgingCommsChannelId varchar(20)`. Null disables Discord communications.
`JudgingRoom` gains nullable `discordThreadId varchar(20)`.

Changing or clearing the channel nulls active-room thread IDs. Saving a new
channel provisions replacement threads but does not delete old Discord
history. Archived rooms do not receive replacement threads.

### Thread provisioning

Saving a channel validates that it belongs to the resolved guild and supports
text messages and threads. The channel commits first. The API then creates one
starter message and public thread per active room, saving each returned thread
ID. New rooms provision after their database insert. Room renames sync the
current thread name after commit.

Provisioning is retryable and keeps successful room IDs when another room
fails. A missing or unusable stored thread is replaced. Thread names are
single-line, mention-neutralized, and limited to Discord's 100-character
maximum.

### Room arrivals

Member joins and authenticated QR activation distinguish existing same-room
presence from a new entry. Existing presence only refreshes `lastSeenAt`.
New presence commits, then sends a self-mention using the authenticated user's
stored Discord snowflake.

Guest QR activation sends nothing. `completeGuestJudge` commits the identity
and presence, then sends one arrival notice with the guest's inert display
name. It mentions authenticated judges with current presence in the room.
Guest reloads and heartbeats send nothing.

### QR and revocation delivery

First QR generation posts the new PNG and signed link. Reading an existing QR
does not post. `sendRoomQr` regenerates the PNG for the active link without
changing its ID or sessions. It resolves and mentions current authenticated
room judges at send time.

Rotation commits revocation and replacement before posting the replacement QR.
Guest revocation notices identify the guest and actor. Room-link revocation
notices identify affected named guests when available. Both resolve current
authenticated room judges after the security change.

Payloads disable parsed mentions and allowlist only validated member Discord
IDs. Room, actor, and guest names cannot create mentions. Guest identities are
never treated as Discord users.

Delivery status is `not_configured`, `delivered`, or `failed`. A Discord
failure never rolls back room entry, guest completion, QR creation, rotation,
or revocation.

## tRPC and API behavior

Extend `judgingRouter` with:

- `listDiscordChannels` for officer-only channel discovery.
- `setCommsChannel` to save a nullable channel and provision active rooms.
- `provisionRoomThreads` to retry missing threads.
- `sendRoomQr` to repost the current active QR.

`listAdmin` returns the channel ID, resolved guild ID, room thread IDs, and
missing-thread state. Current join, guest completion, QR, and revocation
procedures return delivery status beside their domain result.

Use `BAD_REQUEST` for an unsupported channel and `NOT_FOUND` for a missing
room or active QR. Do not return raw Discord errors.

## Validation

- Optional channel IDs are 17 through 20 digit snowflakes.
- Existing room and hackathon IDs remain UUIDs.
- Live validation checks guild and channel type.
- Message and filename builders enforce Discord limits and neutralize hostile
  display names.

## Data, migration, and compatibility

- Generate an additive migration for the nullable columns.
- Existing hackathons remain disconnected. No migration backfill calls Discord.
- Existing QR URLs, guest cookies, scoring, imports, and presence stay
  compatible.
- Rollback removes the columns but cannot delete Discord threads already
  created.

## Discord integration

Add a focused judging gateway under `packages/api/src/utils/judging` with
testable payload builders. Use existing Discord REST v10 dependencies and
`getKnightHacksGuildId()`. Do not add a bot command, role, environment
variable, dependency, or hard-coded guild/channel ID.

## Configurability review

No developer change is needed next year. Officers choose the channel for each
hackathon and the existing Discord config chooses the environment's guild.

## React and frontend constraints

- Add one top-level communications panel inside the Rooms tab.
- Use `ResponsiveComboBox` with channel name and ID search plus an explicit
  disconnected action.
- Show disconnected, connected, loading, and partial-failure states with text.
- Add `Open thread` and `Send QR` beside current room actions.
- Keep 44px targets, mobile wrapping, skeleton parity, and no horizontal
  document overflow.
- Warn about Discord delivery failure without claiming the judging action
  failed.
- Put screenshots only in PR discussion, never in the repository.

## Testing and verification strategy

Cover validators, payload safety, thread reuse and recovery, current-recipient
selection, member and guest arrivals, QR lifecycle rules, revocation failure
isolation, permissions, Blade states, migrations, desktop, mobile, and live
development-guild delivery.

Run targeted tests, `pnpm format`, `pnpm lint`, `pnpm typecheck`,
`pnpm analyze:react:changed`, migration checks, and the Blade build.

## Open questions

None.
