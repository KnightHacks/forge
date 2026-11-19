# Career job ingestion SRD

Status: Draft, awaiting human review

## Technical purpose

`@forge/api` owns the job rules for #633. Cron hands `ingestJobSnapshot` one
source's parsed snapshot. Ingestion classifies, deduplicates, and writes `Job`,
`JobObservation`, `JobLocation`, and `JobSource` state. It doesn't fetch, poll,
or send anything.

## Relevant principles

- Keep pure rules (normalize, classify, locations) separate from DB writes so they
  can be unit-tested without a database (forge-api "where workflow logic lives").
- No Discord calls. Ingestion only sets delivery state for #654 to claim.
- Reuse `normalizeCompanyName` (`@forge/validators`) and the U.S. city catalog
  (`utils/career/us-cities.ts`).

## Access policy

There is no tRPC procedure. The service is exported only through
`@forge/api/job-board.server`, following the `discord-archive.server` pattern,
for cron. Nothing in Blade imports it.

## Architecture / data flow

1. Cron adapter (#652) builds a `CareerJobSourceSnapshot`, which the
   `careerJobSourceSnapshotSchema` validator checks.
2. Cron reads channel IDs from the #648 config keys and calls
   `ingestJobSnapshot(snapshot, destinations)`.
3. Ingestion rejects the snapshot if `complete` is false. Otherwise it finds or
   creates the `JobSource` row by (provider, boardKey).
4. Each listing goes through a pure prepare step: clean the apply URL, decide the
   track, parse locations, classify the category, and build the company key and
   the identity keys. A rejected listing is counted by reason.
5. Each accepted listing then runs in its own transaction:
   - Find the job by observation (sourceId + externalId), then by any identity
     key, and insert one only if neither exists.
   - Insert or update the observation.
   - Refresh the job's fields and add any new location rows.
6. If `inventory = "full"`, observations missing from this run close. A job with
   no open observations goes inactive.
7. A successful run sets `baselineCompletedAt` (if unset), `lastSuccessAt`, and
   `lastAttemptAt`.

### Identity

- Candidate keys, strongest first:
  - `ats:greenhouse:<id>`, `ats:lever:<id>`, `ats:ashby:<id>`, `ats:workday:<tenant>:<req>` from the apply URL;
  - `url:<cleaned apply URL>`;
  - `source:<provider>:<boardKey>:<externalId>`.
- A new job's `identityKey` is the strongest key it has. Lookup tries every key, so
  a later source with a stronger key still finds the job.
- Lookups compare the hash column (Node SHA-256 of the UTF-8 key, which matches
  the generated column) and also compare the raw key. A row with a matching hash
  but a different raw key is an error.
- A job insert uses `ON CONFLICT (identity_hash) DO NOTHING` and selects the row
  again, so two concurrent ingests produce one job.
- Company and title never form an identity.

### Field rules

- `track`: on a new job, use the adapter's track if given, otherwise classify it
  from the title. On an existing job it never changes.
- `title`, `description`, `compensation`, `postedAt`, `category`: take the latest
  listing's values. Description and compensation aren't overwritten with null.
- `applyUrl`: keep the employer's own link over an aggregator's (jobright,
  simplify, speedyapply). Otherwise take the latest.
- `companyLabel` and `companyKey` come from the first listing. `companyId` is set
  when an approved `Company` matches by `normalizedDisplayName` or by a
  normalized alias, following `mergedIntoCompanyId`. Ingestion never inserts a
  `Company`.
- A job that reappears gets `active = true` and `inactiveAt = null`. Its delivery
  state stays as it was, so it isn't posted again.

### Delivery state on insert

- The job is `pending`, with `deliveryTrack = track` and `discordChannelId` set,
  only when the source already has `baselineCompletedAt` and
  `destinations[track]` is set.
- Otherwise it keeps the default `suppressed`.

### Track and location rejection

- `not_student_role`: there's no adapter track, the title has no internship or
  new-grad signal, or the title carries a seniority signal (senior, staff,
  principal, director, vp, architect).
- `non_us`: every location is explicitly outside the U.S.
- No locations, or unparsed text, keeps the job with an `unknown` location.

## tRPC/API behavior

No procedures. `ingestJobSnapshot` returns:

```
{ created, updated, rejected: Record<reason, number>, deactivated, baselined }
```

## Validation

Add `careerJobSourceSnapshotSchema` and its inferred type to
`packages/validators/src/job-board.ts`. The fields are the ones agreed in #633:
`source`, `fetchedAt`, `complete`, `inventory`, and `listings[]` with an optional
`track`.

## Data / migration / compatibility

No schema change. Uses the 0065 tables as merged. #670 also writes to
`utils/job-board/` with different file names.

## Discord integration

None. #654 claims `pending` rows.

## Configurability review

The channel for each track comes from DiscordConfig through the caller. Sources
are rows, not code constants. Category regexes and aggregator hosts are
code-owned rules, like upstream.

## React / frontend constraints

None.

## Testing / verification strategy

- Unit tests (no database) for normalize, classify, and locations, with fixtures
  for each source type.
- Database tests through `provisionDisposableDatabase` cover the ingest flow and
  are skipped when no loopback DB is available.

## Open questions

- Should upstream's recent catch-up of baseline jobs be ported? Currently skipped.
