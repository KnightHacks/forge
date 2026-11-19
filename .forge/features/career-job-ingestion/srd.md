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
3. Ingestion rejects the snapshot if `complete` is false, or if the snapshot's
   envelope (source, fetchedAt, inventory) is invalid. Otherwise it finds or
   creates the `JobSource` row by (provider, boardKey).
4. Each listing is validated on its own (an invalid one is counted as
   `invalid_listing`, and the rest still ingest), then goes through a pure prepare step: clean the apply URL, decide the
   track, parse locations, classify the category, and build the company key and
   the identity keys. A rejected listing is counted by reason.
5. Each accepted listing then runs in its own transaction:
   - Find the job by observation (sourceId + externalId), then by any identity
     key, and insert one only if neither exists.
   - Insert or update the observation.
   - Refresh the job's fields and add any new location rows.
6. If `inventory = "full"`, observations missing from this run close. A job with
   no open observations goes inactive.
7. A successful run sets `baselineCompletedAt` (if unset) and `lastSuccessAt`.
   Attempts and errors (`lastAttemptAt`, `lastError`) belong to #653.

### Identity

- Candidate keys, strongest first:
  - `ats:greenhouse:<id>`, `ats:lever:<id>`, `ats:ashby:<id>`, `ats:workday:<tenant>:<req>` from the apply URL;
  - `url:<cleaned apply URL>`, only when the URL identifies one posting (a digit
    in its last path segment or in a query value). A shared careers landing page
    or an aggregator URL is never an identity. A Workday key needs a
    `_<requisition>` suffix;
  - `source:<provider>:<boardKey>:<externalId>`.
- A new job's `identityKey` is the strongest key it has. Lookup tries every key, so
  a later source with a stronger key still finds the job.
- Lookups compare the hash column (Node SHA-256 of the UTF-8 key, which matches
  the generated column) and also compare the raw key. A row with a matching hash
  but a different raw key is an error.
- A job insert uses `ON CONFLICT (identity_hash) DO NOTHING` and selects the row
  again, so two concurrent ingests produce one job.
- Company and title never form an identity.
- Known limit: a job stores only one identity key, taken from its first listing.
  If an aggregator listing (source key only) creates the job and an employer
  board later lists the same posting, they don't match, and the job is posted
  twice. Fixing that needs a per-job key table (a schema change); not in #649.

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
  state stays as it was, so it isn't posted again. A snapshot fetched before the
  job (or observation) closed is stale and doesn't reopen it.
- A listing rejected this run counts as unseen, so a full inventory closes its
  job.

### Delivery state on insert

- The job is `pending`, with `deliveryTrack = track` and `discordChannelId` set,
  only when the source already has `baselineCompletedAt` and
  `destinations[track]` is set.
- Otherwise it keeps the default `suppressed`.

### Track and location rejection

- `not_student_role`: there's no adapter track, the title has no internship or
  new-grad signal, or the title carries a seniority signal (senior, staff,
  principal, director, vp, architect).
- `non_us`: every location is explicitly outside the U.S. Any U.S. evidence (a
  state code, state name, or "US") keeps a text in scope, so "London, KY" and
  "ON-SITE - Austin, TX" stay. A province code counts only after a comma.
- `invalid_apply_url`: the URL has credentials or isn't http(s).
- `invalid_listing`: the listing fails the schema, or its company label has no
  ASCII letters or digits to build a company key from.
- No locations, or unparsed text, keeps the job with an `unknown` location.

## tRPC/API behavior

No procedures. `ingestJobSnapshot` returns:

```
{ created, updated, rejected: Record<reason, number>, deactivated, baselined }
```

## Validation

Add `careerJobSourceSnapshotSchema` and its inferred type to
`packages/validators/src/job-board.ts`. The fields are the ones agreed in #633:
`source`, `fetchedAt`, `complete`, `inventory`, and `listings[]` with optional
`track`, `postedAt`, `description`, and `compensation`. Listings are strict (an
unknown field rejects that listing). A description longer than 20,000
characters is truncated, not rejected.

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
