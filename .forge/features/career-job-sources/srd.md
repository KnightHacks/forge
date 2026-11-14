# Career job source adapters SRD

Status: Approved for implementation

## Technical purpose

Implement Cron-owned adapters that fetch each current job source and parse
source records into raw observations. The raw handoff is provisional until
coordinated with the owner of #649.

## Relevant principles

- Follow the package boundaries in
  [`docs/REPO-CONVENTIONS.md`](../../../docs/REPO-CONVENTIONS.md).
- Keep API-side job rules in `@forge/api`; Cron only fetches and extracts.
- Surface fetch and parse failures. Do not silently drop malformed data or
  return partial success.
- Do not add a dependency, environment variable, bot identity, or organizational
  ID for this work.

## Access policy

Adapters run inside the Cron process and fetch public source data. They do not
serve a user request, require member authentication, or access member data.

## Architecture / data flow

`apps/cron` owns source definitions, HTTP requests, and parsing. Each adapter
returns a local provisional observation containing:

- `sourceId` and `externalId`
- `track`
- raw company and title
- application URL
- optional source URL and source-provided posted date
- original location text(s)
- optional source-specific fields

`@forge/api` will own normalization, classification, deduplication, and
persistence in a later task. This slice does not schedule adapters, write to
the database, or call API services.

## tRPC/API behavior

None. These are Cron-internal adapters, not tRPC procedures or REST endpoints.

## Validation

Adapters must validate source responses and required observation fields before
returning records. A malformed response, missing required data, or unsuccessful
HTTP response must reject that source run rather than produce incomplete
observations or silent partial success.

Keep the source's posted-date and location text separate from any later API-side
normalization.

## Data / migration / compatibility

No schema, migration, or persisted state changes are in scope. Source
registrations remain code-owned so feed/board adapters can be extended with
code review; officers configure Discord routing separately in the parent
feature.

## Discord integration

None in this slice. Adapters do not post, ping, or send digests.

## Configurability review

Would this require a developer change next year?

- Answer: Yes. Source URLs, parser behavior, and recruiting-season feed
  registrations can change. Keep the source catalog easy to extend in code.
- Officer-configurable source registration is out of scope; the user confirmed
  that Discord routing, not source registrations, is the admin-managed concern.

## React / frontend constraints

None. This slice does not change Blade.

## Testing / verification strategy

Use deterministic Vitest fixtures in `apps/cron/src/tests` for each source
family. Cover field mapping and preservation for valid responses, and errors
for malformed payloads, missing required fields, and HTTP failures.

Run `pnpm --filter=@forge/cron test` and `pnpm --filter=@forge/cron typecheck`.

## Open questions

- Coordinate the provisional observation shape with the owner of #649 before
  connecting adapters to API ingestion.
- Jobright and ATS/company API adapters remain to be implemented after the
  GitHub-feed adapter family.
