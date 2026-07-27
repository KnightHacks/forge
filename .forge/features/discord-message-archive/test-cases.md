# Discord Message Archive Test Cases

Status: Approved for test generation

> This file owns observable proof.

## Scope

These cases prove the Discord guild/DM boundary, normalized current-state
storage, idempotent message and tombstone writes, durable discovery/backfill
checkpoints, frequent reconciliation, live Gateway recovery, archive-health
access, aggregate Discord analytics, and authorized matched-Member drill-downs.

They intentionally exclude reaction ingestion, attachment binary storage,
message-content search or display, individual engagement scoring, knowledge
retrieval, and production infrastructure encryption verification.

## Test placement plan

- `packages/validators/src/tests/discord-archive.test.ts`
  - normalized channel/message contracts, snowflakes, bounded metadata, and
    query inputs.
- `packages/api/src/tests/discord-archive/ingestion.test.ts`
  - idempotent upserts, partial updates, tombstones, transactions, checkpoints,
    author purge, and guild boundary.
- `packages/api/src/tests/discord-archive/access.test.ts`
  - officer-only archive health and existing Club Analytics access.
- `packages/api/src/tests/discord-archive/analytics.test.ts`
  - deterministic aggregate metrics and raw-data exclusion.
- `apps/cron/src/tests/discord-archive.test.ts`
  - discovery, thread pagination, historical traversal, reconciliation, lease
    behavior, and failure recovery.
- `apps/tk/src/tests/discord-archive.test.ts`
  - live Gateway event filters/adapters and listener isolation.
- `apps/blade/src/tests/admin/discord-archive-dashboard.test.tsx`
  - health dashboard states and raw-content exclusion.
- Existing Analytics dashboard tests
  - Discord tab navigation, metrics, empty/loading/error states, and report
    filter integration.
- `apps/blade/src/tests/e2e/admin-discord-archive.spec.ts`
  - selected officer/non-officer routing and dashboard/tab verification when
    seeded fixtures support the flow.

Expected narrow commands will follow existing package scripts:

- `pnpm --filter=@forge/validators test -- discord-archive`
- `pnpm --filter=@forge/api test -- discord-archive`
- `pnpm --filter=@forge/cron test -- discord-archive`
- `pnpm --filter=@forge/tk test -- discord-archive`
- `pnpm --filter=@forge/blade test -- discord-archive`

## Validation and persistence

### TC-001: Snowflake identifiers remain lossless text

Setup:

- Prepare valid 17 to 20 digit guild, channel, message, author, and reply IDs,
  including values above JavaScript's safe integer range.

Action:

- Parse a normalized message and persist/reload it.

Expected observations:

- Every ID remains the original string.
- No contract or persistence layer converts an ID to JavaScript `number`.

### TC-002: Normalized messages preserve approved current-state fields

Setup:

- Prepare one guild message with text, author snapshot, bot/application flags,
  reply identity, mentions, embeds, attachment metadata, components, stickers,
  poll metadata, message type, flags, and timestamps.

Action:

- Normalize and persist the message.

Expected observations:

- The approved fields round-trip through validation and persistence.
- Attachment bytes and an unrestricted raw Discord payload are absent.
- Authorization headers and bot tokens are absent.

### TC-003: Metadata contracts reject unbounded Discord payloads

Setup:

- Prepare oversized content metadata, too many nested values, malformed
  snowflakes, and an arbitrary raw-payload property.

Action:

- Parse each input through the archive validators.

Expected observations:

- Each invalid input fails with a bounded validation error.
- The error does not echo message content or credentials.

### TC-004: Repeated complete observations are idempotent

Setup:

- Use one complete message observation.

Action:

- Upsert it through live, backfill, and reconciliation paths in different
  orders.

Expected observations:

- Exactly one message row exists.
- Current content and metadata are identical regardless of path order.
- Processed counters do not claim duplicate stored messages as new records.

### TC-005: A complete edit replaces current content without revisions

Setup:

- Persist an original message.
- Prepare a later complete observation with edited content, embeds, attachment
  metadata, and `editedAt`.

Action:

- Apply the edit.

Expected observations:

- The message row contains the edited current state.
- `editedAt` is updated.
- No revision-history row or old-content copy exists.

### TC-006: A partial edit cannot erase omitted fields

Setup:

- Persist a complete message with content and attachment metadata.
- Prepare a Gateway update that contains only a changed pinned state.

Action:

- Apply the partial update when a complete Discord fetch is unavailable.

Expected observations:

- Pinned state changes.
- Existing content and attachment metadata remain unchanged.
- The update records a safe recoverable observation for later reconciliation.

### TC-007: A delete purges content and retains a tombstone

Setup:

- Persist a message containing text, embeds, mentions, components, stickers,
  poll data, and attachment metadata.

Action:

- Apply a Discord delete event.

Expected observations:

- Message identity, guild/channel/author identity, creation time, type, and
  deletion time remain.
- Every content-bearing field is empty or null.
- A repeated delete is idempotent.

### TC-008: Bulk delete purges every identified message

Setup:

- Persist three messages in one channel and leave one unrelated message in a
  second channel.

Action:

- Apply a bulk-delete event containing the three IDs.

Expected observations:

- The three target rows become content-free tombstones in one transaction.
- The unrelated message is unchanged.
- Repeating the event does not fail or create new rows.

### TC-009: Approved author purge removes content without deleting aggregates

Setup:

- Persist non-deleted messages from two Discord authors across several
  channels.

Action:

- Run the approved operator purge for one stable Discord author ID.

Expected observations:

- Content-bearing fields for that author are erased.
- Other authors are unchanged.
- Message identities and timing facts remain available for documented
  aggregate/deletion accounting.
- The operation never matches by username.

## Guild, channel, and thread scope

### TC-010: The configured Knight Hacks guild is the only accepted guild

Setup:

- Resolve the development Knight Hacks guild through the existing
  `NODE_ENV`-derived constant.
- Prepare otherwise valid messages from that guild and a second guild.

Action:

- Process both observations.

Expected observations:

- The development-guild message persists.
- The other-guild message fails closed before persistence.
- The rejection does not reveal message content.

### TC-011: Direct messages are rejected

Setup:

- Prepare a message with no guild ID and a DM channel type.

Action:

- Pass it through the Gateway adapter and the server-side persistence boundary.

Expected observations:

- Both boundaries reject it.
- No channel, message, checkpoint, or health row is created from the DM.

### TC-012: Discovery selects only message-bearing visible channels

Setup:

- Discord returns a category, text channel, announcement channel, forum/media
  channel, voice channel, stage channel, and one inaccessible channel.

Action:

- Run discovery.

Expected observations:

- Text, announcement, forum/media message surfaces receive channel records and
  checkpoints as appropriate.
- Category metadata may be referenced but has no message checkpoint.
- Voice, stage, and inaccessible channels receive no message checkpoint.
- A permission failure is recorded safely and does not stop other channels.

### TC-013: Discovery includes active and archived public threads

Setup:

- Provide active public/announcement/forum threads and more archived public
  threads than one Discord response page.

Action:

- Run thread discovery.

Expected observations:

- Every visible active and archived public thread is stored.
- Archived pagination continues until Discord reports completion.
- Each thread has an independent message checkpoint.

### TC-014: Private-thread scope requires visibility, not management

Setup:

- Provide one active private thread visible to the bot, one archived private
  thread the bot joined, and one private thread it cannot view.

Action:

- Run discovery without `MANAGE_THREADS`.

Expected observations:

- The two visible/joined threads are discovered.
- The inaccessible thread is absent.
- No mutation-capable permission or Discord write is attempted.

### TC-015: Channel metadata updates and confirmed deletion converge

Setup:

- Persist a channel and checkpoint, then provide a rename/thread-archive event
  followed by a confirmed channel deletion.

Action:

- Apply the metadata events.

Expected observations:

- Current name/archive state updates without resetting message cursors.
- Confirmed deletion marks channel state without deleting archived messages.
- A temporarily missing discovery response alone does not mark the channel
  deleted.

## Durable historical backfill and reconciliation

### TC-016: A new checkpoint starts from the newest page

Setup:

- An eligible channel has 250 historical messages and no checkpoint.

Action:

- Process its first backfill page.

Expected observations:

- The newest page is stored.
- The checkpoint records the newest observed ID and the next backward cursor.
- Backfill remains incomplete.

### TC-017: Committed pages advance the historical cursor atomically

Setup:

- An incomplete checkpoint points before message `M200`.
- Discord returns the next historical page.

Action:

- Persist the page and checkpoint.

Expected observations:

- All page messages and the new cursor commit together.
- The cursor points before the page's oldest message.
- Restarting begins at that committed cursor.

### TC-018: Failed pages never advance their checkpoint

Setup:

- Discord returns a valid page, but the database write fails before commit.

Action:

- Run one backfill step and then retry it.

Expected observations:

- The first attempt leaves the checkpoint unchanged and records a safe error.
- The retry requests the same page.
- A successful retry stores one copy of each message and advances once.

### TC-019: Backfill completion survives restart

Setup:

- A channel's final historical page contains fewer than the requested limit.

Action:

- Commit that page, restart the worker, and select backfill work again.

Expected observations:

- The checkpoint is marked complete with a completion timestamp.
- The channel is not selected for another historical page.
- Reconciliation and live capture remain active for it.

### TC-020: One failed channel does not discard other channel progress

Setup:

- Three channels have incomplete checkpoints. Discord returns success, a
  retriable error, and success respectively.

Action:

- Run bounded backfill work.

Expected observations:

- Both successful channels commit progress.
- The failed channel retains its cursor and increments safe retry health.
- The worker completes without treating successful channels as failed.

### TC-021: Reconciliation repairs a Gateway outage

Setup:

- Persist newest cursor `M100`.
- Discord contains `M101` through `M108`, none captured live.

Action:

- Run reconciliation.

Expected observations:

- All eight messages are stored.
- The newest cursor advances to `M108` only after commit.
- Health reports the successful reconciliation time.

### TC-022: Reconciliation cannot skip a gap larger than one page

Setup:

- Persist newest cursor `M100`.
- More than two full Discord pages now exist after `M100`.

Action:

- Reconcile from the newest page backward until the stored cursor overlaps.

Expected observations:

- Every message after `M100` is stored exactly once.
- Pagination does not jump directly from the latest page to a new high-water
  mark.
- The final newest cursor equals the newest Discord message.

### TC-023: Live capture and backfill can overlap

Setup:

- Backfill is traversing older pages while the Gateway receives a new message
  and reconciliation observes it again.

Action:

- Commit the three paths in multiple interleavings.

Expected observations:

- Old and new history are complete.
- The new message has one row.
- The historical and newest cursors each move in the correct direction.

### TC-024: Worker coordination prevents overlapping reconciliation

Setup:

- Two cron instances attempt the same one-minute run.

Action:

- Both try to claim the advisory-lock-protected durable lease.

Expected observations:

- One instance owns the active lease and performs Discord reads.
- The second exits without changing checkpoints.
- An expired lease can be reclaimed after the documented timeout.

### TC-025: Discovery cadence does not require a developer change

Setup:

- Complete a normal reconciliation, then add a visible channel and thread in
  Discord.

Action:

- Run workers before and after the configured discovery-staleness boundary.

Expected observations:

- Early runs reconcile known checkpoints without excessive topology calls.
- The stale run rediscovers topology and creates checkpoints for the new
  surfaces.
- No code/configuration change is required.

## Live Gateway capture

### TC-026: Live create writes current state and health

Setup:

- The Archive Gateway client is ready in the development guild.

Action:

- Receive a valid `messageCreate`.

Expected observations:

- The normalized message is stored.
- The channel newest cursor and live-health timestamp advance after commit.
- No message content is written to application logs.

### TC-027: Live edit converges through complete fetch or partial merge

Setup:

- Persist a message, then receive one complete and one partial update fixture.

Action:

- Process each update.

Expected observations:

- The complete update replaces current fields.
- The partial update fetches current Discord state when possible.
- If fetch fails, explicitly supplied fields merge without erasing omitted
  fields.

### TC-028: Live deletes work for cached and uncached messages

Setup:

- Prepare one cached message delete and one ID-only uncached delete.

Action:

- Process both events.

Expected observations:

- Both IDs become tombstones.
- The uncached path does not require message content to succeed.
- Reconciliation remains able to correct channel cursors.

### TC-029: Archive listener failure does not terminate TK

Setup:

- Force the archive database write to fail while the existing TK command
  client remains connected.

Action:

- Deliver a live archive event and then an existing TK interaction.

Expected observations:

- The archive error is recorded without content or credentials.
- The process remains alive.
- The existing TK interaction still executes.
- Reconciliation can later recover the missed message.

### TC-030: Missing optional token disables archive clients safely

Setup:

- Start TK and cron without `DISCORD_ARCHIVE_BOT_TOKEN`.

Action:

- Initialize both applications and run registered schedules.

Expected observations:

- Existing TK and cron behavior starts normally.
- Archive client/schedules remain disabled with one safe diagnostic.
- No login loop, token text, or repeated per-minute error occurs.

## Health and analytics access

### TC-031: Archive health is officer-only

Setup:

- Create unauthenticated, ordinary authenticated, director-only, unrelated
  permission, and effective `IS_OFFICER` callers.

Action:

- Open the page and call `discordArchive.getHealth`.

Expected observations:

- Only effective `IS_OFFICER` succeeds.
- Every other caller is redirected or receives the appropriate
  `UNAUTHORIZED`/`FORBIDDEN` result.
- Client-side route knowledge cannot bypass the server check.

### TC-032: Club Analytics access governs the Discord tab

Setup:

- Create callers accepted and rejected by the existing Club Analytics policy.

Action:

- Request the Discord aggregate report and render Analytics.

Expected observations:

- Existing authorized Analytics callers can open the Discord tab.
- Rejected callers gain no data from the new report.
- The feature does not broaden any caller's existing Analytics access.

### TC-033: Health DTOs never contain message bodies

Setup:

- Store messages containing unique sentinel strings in content, embeds, and
  attachment filenames.

Action:

- Request guild health, channel coverage, and recent ingestion metadata.

Expected observations:

- No sentinel content/embed value appears in the serialized DTO.
- Recent metadata contains only approved channel/author/event/timestamp facts.
- Safe errors contain no Discord response bodies or tokens.

### TC-034: Analytics never expose raw message or unmatched-author identity

Setup:

- Store messages with unique message IDs, author IDs/names, reply targets,
  content, embeds, and attachments.

Action:

- Request every Discord Analytics section and serialize it.

Expected observations:

- Counts, labels, dates, shares, and approved matched-Member rows are present.
- Message IDs, raw author IDs/labels, reply targets, content, embeds, and
  attachment metadata are absent.
- No unmatched-author identity, engagement score, or relationship table exists.

## Analytics correctness

### TC-035: Selected-period summary uses deterministic denominators

Setup:

- Store messages across ten calendar days, including four active days, five
  unique human authors, bot messages, and tombstones.

Action:

- Build the Discord report for the ten-day period.

Expected observations:

- Message count follows the documented deleted-message rule.
- Average messages per calendar day divides by ten, not four.
- Active days equals four.
- Unique-author count follows the approved aggregate scope.
- Bot/system counts remain distinguishable where reported.

### TC-036: Time-series buckets and empty periods are stable

Setup:

- Store messages in a finite Analytics range with empty intervals and in a
  longer range that triggers the existing larger grain.

Action:

- Build Discord trends for both ranges.

Expected observations:

- Grain follows the existing Analytics period rules where applicable.
- Empty in-range buckets are returned as zero.
- Reordering source rows does not change buckets or labels.

### TC-037: Channel distribution uses current labels and complete counts

Setup:

- Store messages across channels and threads, rename one channel, and tombstone
  one message.

Action:

- Build channel distribution.

Expected observations:

- Current channel labels render with stable channel identity.
- Counts and shares use one documented denominator and add up consistently.
- Threads remain distinguishable from parent channels.
- No message list is returned for a channel.

### TC-038: Empty archive returns useful empty states

Setup:

- Apply the migration with no discovery, checkpoint, or message rows.

Action:

- Request health and Discord analytics.

Expected observations:

- Health identifies not-yet-started/disabled state rather than reporting
  healthy.
- Analytics returns zero/unavailable measures without NaN or Infinity.
- Blade renders an actionable empty state without exposing implementation
  errors.

## Blade surfaces

### TC-039: Health dashboard renders operational states

Setup:

- Provide healthy, actively backfilling, stale, partially failed, disabled, and
  empty health fixtures.

Action:

- Render `/admin/discord-archive`.

Expected observations:

- Each state has distinct text, icon, and safe supporting detail.
- Backfill progress and last-success times are understandable on desktop and
  mobile.
- Color is not the only status signal.
- The page contains no mutation control or raw-message affordance.

### TC-040: Health loading skeleton matches the final page structure

Setup:

- Render the route loading state and the loaded dashboard.

Action:

- Compare the page header, summary cards, health panels, and coverage table
  structure.

Expected observations:

- Blade card shells and page geometry render in both states.
- Skeletons replace content inside those shells.
- The purple eyebrow is not rendered as one oversized skeleton card.

### TC-041: Analytics adds a responsive Discord tab

Setup:

- Render the existing Analytics workspace with a Discord report.

Action:

- Select the Discord tab on desktop and mobile.

Expected observations:

- Existing filters remain available and update Discord measures.
- Summary metrics, trend, and channel distribution use existing Analytics
  visual conventions.
- The selected tab remains visually identifiable.
- Other Analytics tabs and reports are unchanged.

### TC-042: Blade cannot discover a raw-content API

Setup:

- Inspect the registered tRPC router and rendered health/Analytics clients.

Action:

- Enumerate archive-related public procedures and client DTO properties.

Expected observations:

- Only officer health and aggregate Analytics reads are exposed.
- No list-message, get-message, search-content, content-export, or attachment
  read procedure exists.
- Blade client bundles receive no raw archive payload type.

### TC-045: Matched Member activity supports authorized drill-down

Setup:

- Archive human messages for a stable Discord user linked to a retained Member,
  and include unmatched and bot authors in the same reporting period.
- Render Analytics once with only Club Analytics access and once with separate
  Member-admin read access.

Action:

- Open the Discord tab and inspect the per-Member activity table.

Expected observations:

- The matched Member row contains the selected-period message count, active
  days, active surfaces, stored Discord username, and human-readable last
  message time.
- Aggregate totals continue to include unmatched human authors while their
  identities are not returned.
- The Member name is plain text for Analytics-only access and opens the shared
  enriched Member dialog when Member-admin read access is also present.
- No message body, message ID, or raw Discord author ID enters the client DTO.

## Migration and backup safety

### TC-043: Migration applies to fresh and upgraded databases

Setup:

- Prepare a fresh database and the repository's sanitized upgrade fixture.

Action:

- Apply all committed migrations.

Expected observations:

- Archive tables, constraints, and indexes are created successfully.
- Existing rows and applications remain intact.
- No backfill runs as a migration side effect.

### TC-044: Sanitized development backups exclude the archive

Setup:

- Put sentinel Discord content into every archive table alongside ordinary
  allowlisted development data.

Action:

- Run the filtered development-backup sanitizer/export path.

Expected observations:

- Archive channel, message, checkpoint, and state rows are absent from the
  sanitized output.
- Existing allowlisted development data remains available.
- No sentinel Discord content appears in the artifact.

## Negative / regression cases

### TC-NEG-001: Message Content intent failure is visible and safe

Setup:

- Connect an Archive bot that receives message objects with content-bearing
  fields unavailable.

Action:

- Run live capture and a reconciliation page.

Expected observations:

- Health reports a configuration/capability failure.
- The system does not mark the affected history complete as though content were
  captured successfully.
- Logs and health do not include message bodies or token values.

### TC-NEG-002: Rate limits do not corrupt cursors

Setup:

- Discord returns a rate limit during discovery, backfill, and reconciliation
  fixtures.

Action:

- Run each worker path.

Expected observations:

- The REST client respects Discord retry timing.
- Uncommitted cursors remain unchanged.
- Completed work in other channels remains committed.

### TC-NEG-003: Unknown Discord channel types fail closed

Setup:

- Discovery returns a channel type the current contract does not classify.

Action:

- Process discovery.

Expected observations:

- No message checkpoint is created for the unknown type.
- A safe diagnostic makes the coverage gap visible.
- Known channel types continue processing.

### TC-NEG-004: Stored error detail cannot leak sensitive data

Setup:

- Raise an error containing an authorization header, bot token, and message
  content sentinel.

Action:

- Persist worker health and request it through the officer API.

Expected observations:

- Sensitive values are removed.
- The retained code/message is sufficient to identify the operation and
  channel safely.

### TC-NEG-005: Production activation remains an explicit rollout step

Setup:

- Build/deploy code with the optional token absent and encryption confirmation
  incomplete.

Action:

- Start applications.

Expected observations:

- Existing applications remain healthy.
- Production archive ingestion and backfill do not start.
- The status artifact continues to show production enablement as blocked.

## Open questions

None. The behavioral contract was approved on 2026-07-26.
