# Behavioral proof

- Issue, exchange, authenticate, refresh, and revoke Projects credentials with only a User and parent session, without event, Member, or Hacker records.
- Reject missing event IDs, Projects event IDs, unsupported kinds, reserved event client IDs, arbitrary Projects registrations, orphan credentials, and kind/event mismatches directly in PostgreSQL.
- Reject wrong callback/verifier/audience, expired or replayed codes, and expired/deleted parent sessions. Recheck redirects after a concurrent client registration change.
- Preserve refresh grace, replay revocation, absolute expiry, stale-token revocation, disabled-client cleanup, and global logout cookie forwarding.
- Reject Projects from anonymous hacker reads, participant mutations, resume uploads, and printing uploads before their bodies are read.
- Event deletion leaves Projects credentials intact; deleting Projects clients, parent sessions, or users cascades to their credentials.
- Apply migrations to an empty database and upgrade synthetic sanitized event records with unchanged IDs and values.
- Run SDK Next-adapter tests, event provisioning, hacker lifecycle, printing regressions, and root format/lint/typecheck gates.
