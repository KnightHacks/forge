# Career job source adapters Status

Current phase: Implementation

## Decision log

- 2026-11-13: Start with #652, Cron source adapters; keep API, DB, scheduling,
  Discord delivery, and Blade integration out of this slice.
- 2026-11-13: Cron emits a provisional raw observation with source/external
  IDs, track, raw company/title/apply URL, optional source URL/date, original
  location text(s), and optional source fields. Coordinate with #649 before API
  hookup.
- 2026-11-13: Keep source registrations code-owned and easy to extend; Discord
  routing remains officer-configurable separately.
- 2026-11-13: Test source families for valid field mapping and explicit failure
  on HTTP, malformed-payload, and required-field errors; adapters have no API,
  DB, or Discord side effects.

## Open questions

- Final approval of the Cron-to-API observation contract with the owner of
  #649.
- Jobright, direct ATS, and company API adapter implementation and verification
  remain after the GitHub-feed slice.

## Task list

- [x] Confirm source-adapter-only scope and provisional handoff.
- [x] Approve observable test cases.
- [ ] Implement GitHub feed registry and Markdown/JSON parsing.
- [ ] Implement Jobright, direct ATS, and company API adapters.
- [ ] Coordinate the raw observation contract with #649.

## Validation / commands

- `pnpm install --frozen-lockfile`: completed; workspace reports Node 22.23.1
  while the repo requests Node `^24.22.1`.
- `pnpm forge:feature career-job-sources "Career job source adapters"`:
  completed.

## Links

- PRs:
- Issues: #633, #652, #649
- Discord/thread context:
