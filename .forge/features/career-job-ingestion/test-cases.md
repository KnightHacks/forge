# Career job ingestion Test Cases

Status: Draft, awaiting human review

## Scope

The rules and ingest flow in `@forge/api` `utils/job-board`.

## Test placement plan

- `packages/api/src/tests/job-board/ingestion-rules.test.ts` covers the pure
  rules, with no database.
- `packages/api/src/tests/integration/job-board-ingest.test.ts` covers the
  ingest flow against a disposable PostgreSQL database.

## Test cases

| ID     | Setup                                                                                   | Action                 | Expected                                                                |
| ------ | --------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| TC-001 | Apply URLs from Greenhouse (`gh_jid`, path), Lever, Ashby and Workday                   | Build identity keys    | Each yields its `ats:` key first, then `url:` and `source:`             |
| TC-002 | URL with `utm_*`, `ref` and a trailing `/apply`                                         | Clean it               | Tracking parameters and `/apply` are removed and the host is lowercased |
| TC-003 | Title "Software Engineer Intern", no adapter track                                      | Classify track         | `internship`                                                            |
| TC-004 | "New Grad SWE" / "Senior Software Engineer"                                             | Classify track         | `new_grad` / rejected                                                   |
| TC-005 | Adapter track given                                                                     | Classify track         | The adapter's track wins                                                |
| TC-006 | Titles for each category                                                                | Classify category      | Matches the upstream rules, with unknown roles going to `other`         |
| TC-007 | "Orlando, FL", "Florida", "Remote - US", "Seattle, Washington, United States", "Remote" | Parse locations        | City (with state and cityKey), state, `remote_us`, city, and `unknown`  |
| TC-008 | "London, UK" alone; "London, UK" + "Austin, TX"                                         | Check U.S. scope       | Rejected `non_us` / kept                                                |
| TC-009 | Same Greenhouse job from a GitHub feed and the Greenhouse board                         | Ingest both            | One Job with two observations                                           |
| TC-010 | Same snapshot ingested twice                                                            | Ingest                 | Second run: 0 created, every field but `lastSeenAt` unchanged           |
| TC-011 | New source                                                                              | First ingest           | All jobs `suppressed`, `baselineCompletedAt` set                        |
| TC-012 | Baselined source, internship channel set                                                | New internship listing | `pending`, with `deliveryTrack` and channel set                         |
| TC-013 | Baselined source, no new-grad channel                                                   | New new-grad listing   | `suppressed`                                                            |
| TC-014 | Full inventory missing a listing                                                        | Ingest                 | Observation and job closed; after reopening they can close again        |
| TC-015 | Rolling feed missing a listing                                                          | Ingest                 | Job stays active                                                        |
| TC-016 | Inactive `pending` job reappears                                                        | Ingest                 | Active again, observation open, still `pending`                         |
| TC-017 | Existing internship job, new source says `new_grad`                                     | Ingest                 | Track stays `internship`                                                |
| TC-018 | Aggregator URL first, employer URL later                                                | Ingest                 | `applyUrl` becomes the employer's link                                  |
| TC-019 | Approved Company whose alias matches                                                    | Ingest                 | `companyId` set, no Company inserted                                    |
| TC-020 | Job also listed by a second source; the full source drops it                            | Ingest                 | Job stays active                                                        |
| TC-021 | Snapshot with listings rejected for each reason plus one valid                          | Ingest                 | Counts per reason; the valid listing is created                         |
| TC-022 | Run fetched before a newer run closed the job                                           | Ingest stale run       | Job and observation stay closed                                         |
| TC-023 | Richer source stored description/compensation; sparse feed re-sees job                  | Ingest                 | Stored values kept                                                      |
| TC-024 | Two listings with the same careers landing-page URL                                     | Ingest                 | Two jobs                                                                |
| TC-025 | "ON-SITE - Austin, TX", "London, KY", "Mexico, MO", "Austin, TX or Toronto, ON"         | Check U.S. scope       | All kept; "Toronto, ON", "London, UK" foreign                           |
| TC-026 | Company label with no ASCII; 120+ character name                                        | Build company key      | Rejected `invalid_listing`; key passes `companyKeySchema`               |

## Negative / regression cases

| ID         | Setup                                       | Expected                   |
| ---------- | ------------------------------------------- | -------------------------- |
| TC-NEG-001 | `complete: false`                           | Rejected before any write  |
| TC-NEG-002 | Four concurrent ingests of one identity     | One Job created, 3 updated |
| TC-NEG-003 | Invalid listing (non-http URL, blank title) | Fails validation           |
| TC-NEG-004 | Destination that isn't a Discord ID         | Rejected before any write  |

## Open questions

- None.
