# Technical requirements

The user-approved P1 plan extends existing portal clients, authorization codes, and sessions with `clientKind`. Hackathon rows require an event ID; Projects rows require a null event ID. Existing rows default to `hackathon`. Projects registration is restricted to client ID `projects` and origin `https://projects.knighthacks.org`; event clients cannot use that ID.

Keep existing event foreign keys, uniqueness, hashes, expirations, and credential history. Add `(id, clientKind)` client uniqueness and cascading `(portalClientId, clientKind)` foreign keys for codes and sessions. Credential-history storage is unchanged.

Projects authorization requires exactly `https://projects.knighthacks.org/api/projects-auth/callback`; logout requires exactly `https://projects.knighthacks.org/`. No query, fragment, credentials, alternate spelling, or loopback exception is accepted. Validate authorization redirects in routes, service, and locked store transactions. Derive scope from registered clients and validate database rows into discriminated unions.

Preserve S256, single-use codes, exact exchange redirect matching, five-minute codes, fifteen-minute access tokens, thirty-day absolute refresh families, ten-second refresh grace, historical-token revocation, and active parent-session checks. Projects exchange additionally checks parent expiry and ownership inside the transaction.

Hacker context construction excludes Projects before authentication and exposes only event clients and sessions to procedures. Anonymous reads therefore receive no enabled client for Projects. Existing upload handlers use that context before accessing bodies. Main Blade tRPC accepts no new credentials.

## Migration and rollout

Migration 0064 adds/backfills the discriminator, installs checks and composite relationships, then relaxes event-ID nullability. Existing rows and IDs remain intact. It provisions no client. Apply the expanded schema before audience-aware application code; enable Projects only after that code is deployed and registration is separately approved.

Rollback: disable Projects, revoke its families, and invalidate its outstanding codes before restoring old application code. Keep the expanded schema. Restoring event-ID NOT NULL requires deleting Projects records and is a separate destructive operation.
