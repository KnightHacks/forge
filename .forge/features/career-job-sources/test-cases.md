# Career job source adapters Test Cases

Status: Approved

## Scope

Verify that Cron source adapters fetch and parse source responses into complete
snapshots aligned with the merged `JobSource`, `Job`, and `JobObservation`
schema. API normalization/deduplication, persistence, scheduling, and Discord
delivery are tested in their owning tasks.

## Test placement plan

Use deterministic Vitest unit tests in `apps/cron/src/tests`.
Run `pnpm --filter=@forge/cron test`.

## Test cases

### TC-001: GitHub Markdown feeds map to schema-aligned snapshots

Setup:

- A Markdown feed contains a valid job row with company, title, apply URL, and
  location, plus optional source-provided date and fields.

Action:

- Parse the feed using its configured source ID and track.

Expected observations:

- The adapter returns a complete snapshot with provider `github`, stable
  `boardKey`, and label.
- Each listing has a stable external ID, track, company label, title, apply URL,
  optional parsed `postedAt`, source URL, source data, and original location
  text.

### TC-002: GitHub JSON feeds map to schema-aligned snapshots

Setup:

- A JSON feed contains valid job records and optional source fields.

Action:

- Parse the feed using its configured source ID and track.

Expected observations:

- Each valid record maps to the same listing contract as Markdown feeds,
  preserving source-provided date text in `sourceData` and original location
  text.

### TC-003: Other source families preserve the raw handoff

Setup:

- Jobright, first-party company API, or direct ATS source returns a valid record.

Action:

- Parse the source response.

Expected observations:

- The adapter returns a complete source snapshot, and each listing carries the
  source-specific data required by `Job` and `JobObservation`.

## Negative / regression cases

### TC-NEG-001: HTTP and malformed-payload failures surface

Setup:

- A source returns a non-success HTTP status or an invalid/unexpected payload.

Action:

- Fetch and parse the source.

Expected observations:

- The adapter rejects with a source error and does not return partial success.

### TC-NEG-002: Missing required fields are not silently dropped

Setup:

- A record is missing a required company, title, or application URL.

Action:

- Parse the response.

Expected observations:

- The source fails explicitly; no incomplete snapshot or listing is returned as a
  successful result.

### TC-NEG-003: Adapters have no unrelated side effects

Setup:

- A valid source fixture is available.

Action:

- Run the adapter.

Expected observations:

- It only fetches/parses source data; it does not call `@forge/api`, write to
  the database, or send Discord messages.

## Open questions

- The snapshot/listing validator contract is pending coordination with #649.
