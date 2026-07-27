# Discord Message Archive Spec

Status: Approved

> This file owns the non-technical user/product intent.

## User-facing purpose

Give Blade a durable record of Knight Hacks Discord activity so officers can
trust that Discord data is being collected, club leaders can understand
community activity through aggregate analytics, and future approved features
can use the archive without reconstructing history again.

The archive is infrastructure for summaries and derived products. Blade does
not provide a message browser or raw-message search.

## Users / actors

- Knight Hacks Discord participants create, edit, and delete the source
  messages that the Archive bot observes.
- Officers whose effective permissions include `IS_OFFICER` monitor archive
  health and historical-backfill progress.
- Existing Club Analytics users view approved aggregate Discord measures
  through the Analytics workspace.
- The dedicated Archive bot captures live Discord activity.
- Scheduled archive jobs discover channels and threads, reconcile recent
  history, and continue interrupted historical backfills.
- Future Blade capabilities may consume approved derived data. Individual
  member enrichment and knowledge retrieval are not included in this release.

## User-visible interface

### Archive health

- Blade provides an officer-only admin page at `/admin/discord-archive`.
- The page reports:
  - whether live capture, discovery, reconciliation, and backfill are healthy;
  - the last successful live capture, channel discovery, and reconciliation;
  - total stored messages, channels, and threads;
  - historical-backfill completion and remaining channel/thread work;
  - per-channel/thread cursor state and safe failure details; and
  - recent ingestion-event metadata without message bodies, embeds, or
    attachment contents.
- The page is read-only in the first release. Recovery occurs through the
  scheduled worker and operator tooling rather than dashboard mutation
  controls.
- Loading, empty, healthy, degraded, and failed states follow the Blade admin
  design system.

### Discord analytics

- The existing `/admin/analytics` workspace adds a `Discord` tab.
- The tab follows the Analytics workspace's existing reporting-period controls
  and access policy.
- Initial measures include:
  - messages in the selected period;
  - average messages per calendar day;
  - active days;
  - unique Discord authors;
  - visible channel and thread counts;
  - message volume over time; and
  - aggregate channel distribution.
- Analytics never return or render message bodies, embeds, attachments, user
  relationships, or a list of messages.

## Scope

### In scope

- Every message available to the dedicated Archive bot in the configured
  Knight Hacks guild.
- Human, bot, webhook, and Discord system messages.
- Text and announcement channels, forum/media posts, public threads, and
  private threads the bot can already view.
- Full available historical backfill with durable per-channel/thread cursors.
- Frequent reconciliation that repairs missed live events.
- Live create, update, delete, and bulk-delete capture.
- Current message content plus bounded Discord metadata needed for approved
  summaries and future retrieval work.
- Attachment and embed metadata without copying attachment binaries into
  Knight Hacks object storage.
- An officer-only health page and an aggregate Discord tab in Club Analytics.
- Stable Discord author IDs that can later be linked to Blade users without
  matching mutable usernames.
- Clearing stored content when Discord reports message deletion while
  retaining a content-free tombstone for aggregate correctness.
- An operational author-content purge path for approved deletion requests.
- Safe staged rollout in the development guild before production backfill.

### Out of scope

- Direct messages.
- A Blade message browser, message detail page, raw-content search, or content
  export.
- Copying Discord attachment binaries into MinIO.
- Reaction ingestion or reaction analytics.
- Edit revision history. The archive stores the current Discord state.
- Granting the Archive bot `MANAGE_THREADS`; private threads remain limited to
  those it can already view.
- Sending messages, managing channels, moderating content, or changing Discord
  state.
- Individual engagement scoring, lifecycle classification, relationship
  inference, or member ranking.
- Member-profile enrichment in this release.
- Embeddings, semantic search, retrieval-augmented generation, or model
  training.
- A new Forge application, pod, queue, or deployment unit.
- Production rollout before storage and backup encryption at rest are
  confirmed.

## Vocabulary

- `archive`: The current stored representation of Discord messages and the
  metadata required to ingest and summarize them.
- `Archive bot`: The dedicated Discord application used only for archive reads
  and live Gateway events.
- `message-bearing channel`: A Discord text, announcement, forum/media post, or
  thread resource from which message history can be read.
- `discovery`: Enumeration of message-bearing channels and threads visible to
  the Archive bot.
- `backfill`: Historical traversal from recent messages toward the oldest
  available message in each channel or thread.
- `reconciliation`: A frequent cursor-based comparison that retrieves messages
  missed by live capture.
- `live capture`: Processing Discord Gateway message create, update, delete,
  and bulk-delete events.
- `checkpoint`: Durable progress for one channel or thread. A checkpoint is
  advanced only after the corresponding messages commit.
- `tombstone`: A retained message identity and timing record whose content and
  content-bearing metadata have been erased after deletion.
- `archive health`: Operational metadata about discovery, reconciliation,
  backfill, and live-event freshness. It never includes message bodies.
- `Discord analytics`: Aggregate activity measures derived from the archive.

## Acceptance criteria

- The development Archive bot can discover every message-bearing development
  guild channel and thread that its Discord permissions allow.
- Historical ingestion resumes from committed checkpoints after interruption
  without duplicating messages or skipping history.
- Live capture and historical/reconciliation ingestion may overlap without
  producing duplicate archive records.
- A reconciliation run repairs messages missed while the Gateway listener was
  offline.
- Discord message edits update the stored current state without creating a
  user-visible revision history.
- Discord message deletes and bulk deletes clear stored content and retain
  content-free tombstones.
- Direct messages and events from any guild other than the configured
  `NODE_ENV`-selected Knight Hacks guild are rejected.
- Attachment and embed metadata are stored, but attachment binaries are not
  copied into Knight Hacks storage.
- Reactions are not captured.
- An effective `IS_OFFICER` user can open the archive-health page.
- A logged-in user without `IS_OFFICER` cannot read archive health data,
  including through direct API calls.
- The health page communicates backfill coverage, last-success times,
  reconciliation lag, and actionable safe failures without exposing message
  content.
- The Analytics workspace contains a Discord tab using its existing access and
  reporting-period policy.
- The Discord tab reports deterministic aggregate counts and trends without
  returning raw messages or individual relationship data.
- Archive tables remain excluded from sanitized development-database backups.
- Missing archive configuration disables the worker/client safely instead of
  breaking unrelated TK, cron, or Blade behavior during staged rollout.
- Production activation remains blocked until encryption at rest is confirmed.

## Open questions

None. Product intent was approved on 2026-07-26.
