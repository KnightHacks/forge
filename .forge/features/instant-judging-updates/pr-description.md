# Why

Judges could wait up to the next 30-second poll to see an organizer's announcement.
Blade now pushes a change notification as soon as a judging transaction commits,
then refreshes the existing authorized views. In the recorded local trial, the
announcement appeared in 0.973 seconds instead of 29.987 seconds.

# What

Add a tRPC SSE subscription to the judge workspace and command center. PostgreSQL
LISTEN/NOTIFY carries invalidations between app processes; one dedicated listener
is shared by local subscribers. Announcements, room/access changes, saved schedule
changes, resets, and finalized scores publish within their transactions.

Recheck access during the stream, send keepalives, and refetch on reconnect. Skip
background page refreshes offline and reconnect immediately when networking returns.
Existing queries retain their room/guest filtering and polling remains for deadlines
and recovery. Scope is Blade and its API implementation.

Closes #574.

# Test Plan

- Repository `pnpm format`, `pnpm lint`, and `pnpm typecheck`: passed.
- API: 25 focused tests passed, including real PostgreSQL commit/rollback delivery,
  subscription authorization/revocation, schedule, reset, and API surface checks.
- Blade: 11 focused tests passed for live updates, announcements, and autosave.
- Blade production build: passed with temporary local build values for the
  existing `JUDGING_ACCESS_SECRET` and `NEXT_PUBLIC_BLADE_URL` variables.
- Four changed/new React components/pages passed strict analysis.
- `pnpm analyze:react:changed` hits an existing parser error in the tRPC provider:
  `Cannot read properties of undefined (reading 'type')`. Reproduced on main at
  361d10a5; no check bypass was added.
- [Before/after videos, screenshots, timings, and reproduction steps](evidence/README.md).
  Reassignment appeared in 0.864 seconds; recovery after an offline interruption
  took 0.214 seconds in the final local recording.

Production proxy streaming and database connection mode still need verification.
`pnpm build` is blocked in `@forge/2026` by missing local
`KHIX_HACKER_PORTAL_CLIENT_ID` and `KHIX_HACKER_PORTAL_ORIGIN`. No deployment was run. Schedule solver progress and
private draft autosaves keep their existing refresh behavior.

## Checklist

- [x] Database: no schema changes.
- [x] Environment Variables: no environment variables changed.
