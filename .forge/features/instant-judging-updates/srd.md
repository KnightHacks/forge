# Instant Judging Updates SRD

Use tRPC 11 SSE subscriptions on Blade's existing HTTPS endpoint. Queries and
mutations stay on HTTP. The client subscribes once per judging page and invalidates
judging/project queries and refreshes Server Components on each notification.
The subscription sends an initial invalidation after LISTEN is ready so reconnects
and the initial fetch/subscribe race recover from the database.

Use PostgreSQL LISTEN/NOTIFY through the existing driver/pool. One dedicated
connection per API module instance serves all local subscribers and is destroyed
when the last subscriber disconnects. PostgreSQL distributes notifications across
processes. Publish inside transactions; rollbacks emit nothing and Discord delivery
cannot delay the notification. Payloads contain only the hackathon ID, never scores,
messages, credentials, or personal data. Coalesce pending invalidations per subscriber.

Reuse judgeProcedure and existing hackathon selection. Guests are restricted to
their hackathon. Recheck guest access and member permissions on each event and every
30 seconds while idle. The client refetches through existing room/guest-filtered
queries. Use 15-second SSE keepalives and reconnect after 45 seconds of silence.
Retry transient stream failures with capped backoff; do not retry access denials.
Reset the subscription when the browser comes online. Skip background server
refreshes while offline: Next.js otherwise falls back to a full navigation when
an RSC request fails, losing the page needed to reconnect.

No schema, migration, dependency, environment, or production deployment changes.
The deployment requires a session-capable PostgreSQL connection (not transaction
pooling) and end-to-end unbuffered HTTPS streaming. Validate actual proxy behavior
before claiming production delivery. Existing polling remains for recovery and
clock-driven deadline reconciliation. Private draft autosaves do not broadcast.

Validate API/Blade and affected API consumers with typechecking, scoped regression
and integration tests, React analysis, lint/format, and browser recordings. Baseline
is main at 361d10a5. Capture before/after against synthetic local judging data.
