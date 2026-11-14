# Career job source adapters Spec

Status: Approved for implementation

## User-facing purpose

Make current job listings from the existing public feeds and boards available
to Forge's Career experience while keeping the existing Discord job-posting
experience in scope for the parent feature.

## Users / actors

- Members benefit from the listings through the Career experience and Discord.
- The Cron process fetches and parses public source data.

## User-visible interface

This subtask adds no new interface. Its output is consumed by later Career API,
delivery, and Blade work.

## Scope

### In scope

- Fetch and parse the current GitHub, Jobright, first-party company API, and
  direct ATS source families into raw job observations.
- Preserve source-specific identifiers, posted-date text, location text, and
  optional source fields when available.
- Keep each adapter independently extendable.

### Out of scope

- Job normalization, classification, deduplication, persistence, and
  first-run baseline; those belong to `@forge/api`.
- Scheduling and per-source failure isolation; those belong to the Cron
  polling work.
- Discord delivery, digest generation, and Blade UI.

## Vocabulary

- **Source adapter**: Cron code that fetches one source and extracts its job
  records.
- **Raw observation**: A source-specific job record before API-side
  normalization, classification, or deduplication.

## Acceptance criteria

- Every current source is parsed into complete raw observations, or the reason
  a source is not carried forward is recorded in #633.
- Required observation fields are present, and optional source data is
  preserved without replacing the original posted-date or location text.
- Fetch and parse failures surface as errors instead of silently returning
  incomplete or partial success.

## Open questions

- The provisional observation type still needs agreement with the owner of
  #649 before Cron and API integrate.
