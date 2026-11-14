# Career job source adapters Test Cases

Status: Approved

## Scope

Verify that Cron source adapters fetch and parse the current source families
into complete raw observations. API normalization/deduplication, persistence,
scheduling, and Discord delivery are tested in their owning tasks.

## Test placement plan

Use deterministic Vitest unit tests in `apps/cron/src/tests`.
Run `pnpm --filter=@forge/cron test`.

## Test cases

### TC-001: GitHub Markdown feeds map to raw observations

Setup:

- A Markdown feed contains a valid job row with company, title, apply URL, and
  location, plus optional source-provided date and fields.

Action:

- Parse the feed using its configured source ID and track.

Expected observations:

- The adapter returns an observation with source and stable external IDs,
  configured track, raw company/title/apply URL, optional source URL/date,
  original location text, and available source fields.

### TC-002: GitHub JSON feeds map to raw observations

Setup:

- A JSON feed contains valid job records and optional source fields.

Action:

- Parse the feed using its configured source ID and track.

Expected observations:

- Each valid record maps to the same raw observation contract as the Markdown
  feeds, preserving source-provided date and location text.

### TC-003: Other source families preserve the raw handoff

Setup:

- Jobright, first-party company API, or direct ATS source returns a valid record.

Action:

- Parse the source response.

Expected observations:

- The adapter returns the source ID, stable external ID, track, raw company,
  title, apply URL, optional source URL/date, original location text, and
  optional source-specific fields.

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

- The source fails explicitly; no incomplete observation is returned as a
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

- The raw observation type is provisional pending coordination with #649.
