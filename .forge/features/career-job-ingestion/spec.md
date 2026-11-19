# Career job ingestion

Status: Approved (2026-11-17)

## User-facing purpose

Part of #633. Turns raw listings from every job feed and board into one clean,
deduplicated set of jobs, so Career search (#651/#655) and Discord posts (#654)
show each real opening once with a usable company, track, category, location
and apply link. Adds no UI of its own.

## Users / actors

- Members see the results in Career search and in job pings or posts.
- Cron (#652/#653) hands each source's listings to ingestion.
- Officers see no direct surface. Source health reporting belongs to #653.

## User-visible interface

- A job seen on several feeds or boards appears once.
- Each job shows its company, title, track (internship or new grad), category,
  apply link, and every location the sources gave. Unparsed location text shows
  as written.
- Jobs that are no longer posted drop out of default search but stay on members'
  applications.
- Discord shows nothing from the first run of a new source. After that, new jobs
  go out once.

## Scope

### In scope

- Group listings by company and merge the same job seen across sources.
- Decide the track, classify the role category, and parse U.S. locations.
- Record when a job was first and last seen, and whether it's still active.
- Silent first-run baseline for each source.

### Out of scope

- Fetching or parsing feeds (#652), polling and failure handling (#653),
  sending to Discord (#654), alert matching (#650), and search (#651).
- An officer view of ingest results. Cron gets counts only.
- Fuzzy title matching across sources.
- Non-U.S. jobs.
- Reposting a reopened job.
- Importing old CS Job Poster data.
- Creating or approving Guild companies.

## Vocabulary

- `source`: one feed or employer board, such as a GitHub list or a Greenhouse board.
- `listing`: one entry from one source.
- `job`: the single opening that one or more listings describe.
- `full inventory` vs `rolling feed`: a full inventory lists every open role, so
  a missing listing means the role closed. A rolling feed doesn't, so a missing
  listing proves nothing.
- `baseline`: a source's first successful run, which is recorded but never posted.

## Acceptance criteria

- The same opening from two sources appears as one job.
- Rerunning an unchanged source changes nothing a member can see.
- Listings that are neither internship nor new grad, or that are only outside
  the U.S., never appear.
- A city, a state, U.S. remote, several locations, and unparsed text all display
  correctly.
- A job missing from a full inventory goes inactive. A job missing from a rolling
  feed doesn't.
- A closed job that reappears is active again, with no second Discord post.
- When sources disagree on track, the first accepted track stays, and a track
  change never causes another post.
- Title, description, posted date and compensation follow the latest listing.
  The employer's own apply link wins over an aggregator's.
- A new source's first run posts nothing. New jobs after that are queued for
  Discord once, and only if that track has a channel configured.

## Open questions

- Should upstream's "recent catch-up" of baseline jobs be ported? Currently skipped.
