# Career Job Storage SRD

Status: Implementing the design agreed in the local November 3 conversation. The
#633 GitHub design review is still outstanding.
References: #647, parent #633, vocabulary #646 / PR #658.

## Ownership and access

Eight tables live in packages/db/src/schemas/job-board.ts, with relations registered
in the existing client. Enums reuse JOB_BOARD. API owns matching, normalization,
transactions and access; Cron orchestrates adapters/delivery; Blade owns interfaces.
No API/Cron/UI behavior is implemented here. Career reads require sign-in and a
Member profile. Members mutate only their applications/preferences. Community DTOs
exclude private applications and never select privateNotes. Officer changes require
explicit control permissions and audits in the later API/settings issue. The DB
schema does not enforce end-user authorization.

## Tables

| Table                 | Identity and state                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Job                   | Unique identityKey; company label/key and optional Company FK; title/track/category/URL/description/compensation/arrangement; posted/first-seen/last-seen dates; active/inactive state; single Discord destination, frozen delivery track, receipt and retry/claim state |
| JobSource             | Unique provider/boardKey; label, optional Company FK, enabled flag, polling interval/checkpoints, baseline completion, conditional-request validators and claim/error state                                                                                              |
| JobObservation        | Unique source/external ID; Job FK; source URL/data, posted/first/last-seen dates and inactivity evidence                                                                                                                                                                 |
| JobLocation           | Job FK; original text; city/state/remote_us/unknown kind; Census city key and state                                                                                                                                                                                      |
| JobAlertPreference    | Unique member/track/kind/targetKey; optional original custom value                                                                                                                                                                                                       |
| JobApplication        | Unique member/job; stage/round/optional interview label/visibility/private notes; timestamps                                                                                                                                                                             |
| JobApplicationHistory | Application FK; dated stage/round/optional interview label snapshot for each change                                                                                                                                                                                      |
| JobDigest             | Unique track/scheduled instant; frozen window/destination; receipt and retry/claim state                                                                                                                                                                                 |

Member gets two non-null, false-default digest opt-in booleans. All eight tables
count against the limit; no join-table exception. Reuse DiscordConfig for channel
and role IDs in the later settings implementation, with no routing changes here.

Provider is a code-owned adapter key. boardKey is officer-managed feed/board identity.
New providers require code; existing supported boards can be registered later via
Blade. Sources default disabled; jobs default suppressed. No seed or runtime import.
Polling baselines and source health live on JobSource, not a generic config store.

API computes identityKey from a namespaced employer requisition ID or normalized
employer apply URL; unknown identities use namespaced source/external identity.
Never match on company/title alone. Unique identities protect concurrent inserts;
cross-source matching and conflict retries require API code. Create/find a job and
link its observation in one transaction. Source/observation history is retained;
disable sources and inactivate jobs rather than deleting them.

Keep companyLabel/companyKey even if Company resolution fails. Do not automatically
create/approve Guild companies. Company FKs SET NULL on delete; future reads resolve
mergedIntoCompanyId and merge integration needs API tests. Existing moderation is
unchanged. Locations use existing NN-NNNNN Census keys. City requires city/state;
state requires state alone; remote/unknown have neither. Preserve original text;
remote alone is not U.S. evidence. Catalog membership is API validation. Multiple
source descriptions may resolve to the same city.

Alert targetKey is a normalized company key, Census city key, remote_us or normalized
custom location text. customValue preserves Other input. API normalization dedupes
semantically equivalent targets. Applications reference Member.id; deleting a member
cascades preferences/applications. Jobs with applications cannot be deleted. Rounds
are integers 1..10 only for interviewing. Notes are capped at 2000 characters.
Application history uses the same stage enum and round constraint. An optional
interview label on the current row and history can describe a round as behavioral,
technical, or another format; it is only valid for `interviewing`. The future
application mutation must write the current row and a history snapshot in one
transaction, including the initial state and changes between interview rounds.
Visibility and private notes do not go into history. Deleting a member cascades
through applications to their history.

## Delivery contracts for follow-up work

Sent requires message ID and timestamp. Sending requires a claim; token/expiry are
paired. Non-suppressed job delivery requires channel and frozen delivery track.
Workers atomically claim rows and fence completion by token. Discord calls happen
outside DB transactions. Expired sending becomes uncertain: reconcile a deterministic
job/digest marker before retrying. Schema alone does not guarantee exactly-once sends.
A sent job is never requeued merely because its classification or channel changes.

Digests use a row per track/scheduled instant, even if routing changes. Select sent
jobs by frozen delivery track/channel and deliveredAt in (windowStart, windowEnd].
Window end cannot exceed scheduledAt. Freeze boundaries before sending; suppress
empty windows. Preserve daily 4 PM America/New_York behavior in the future worker.
Member flags represent desired digest role subscriptions; role reconciliation uses
User.discordUserId, never Member.discordUser (a username).

Posted dates remain separate from discovery. Closure requires explicit evidence or
absence from a successful complete employer inventory. Rolling-feed disappearance
and failures do not close observations. API aggregates trustworthy observation
activity. No closure, track-selection or delivery triggers are introduced.

## Migration and verification

Generate additive SQL, snapshot and journal. Validate only in disposable local DBs.
No existing job/preference import or production migration. Existing member opt-ins
become false. Application rollback leaves unused storage intact; never drop user
history casually. Root format/lint/typecheck cover affected consumers; run DB tests
and validator regressions. No React changes. User approval authorizes local work;
GitHub #633 review remains separately recorded, not claimed complete.

### Identifier fingerprints

Job.identityHash, JobSource.boardKeyHash and JobObservation.externalIdHash are
stored, database-generated SHA-256 hex fingerprints of the original UTF-8 keys.
Unique constraints target the fingerprint, with provider/sourceId where applicable,
so long URLs and provider identifiers do not exceed PostgreSQL B-tree limits.
The original values remain intact. Future writers must use these columns as
Drizzle conflict targets and verify the original key matches before updating a
conflicting row; a mismatched key is an error, never permission to overwrite.
Indexed lookups should compute the same SHA-256 fingerprint and compare the raw
key as well. No ingestion/upsert service is implemented in this database-only work.
Migration 0065 creates the fingerprint columns and their unique constraints directly.
