# Instant Judging Updates Test Cases

- Publish, replace, and clear an announcement while a separate judge session is
  open; observe the change before its 30-second poll.
- Move a scheduled team while a separate judge session is open; observe its new
  room/time before the 15-second refresh. Record baseline and changed behavior.
- Roll back a transaction that queues an invalidation; no listener receives it.
- Commit from a separate database connection; all subscribed app instances receive
  the invalidation, and unrelated hackathons are ignored.
- Multiple browser subscribers share one database listener. Closing the last
  subscriber releases it; failed LISTEN/disconnects do not leak connections.
- Anonymous users cannot subscribe; guests cannot select another hackathon.
  Revocation terminates the stream and refreshes the page access gate. Existing
  announcement room and guest visibility rules still apply.
- Disconnect/reconnect while updates happen; the initial invalidation restores the
  current state. Check server restarts and stream failures with retry backoff.
- A pushed update refreshes React Query and server-provided data, preserving answers
  that a judge is typing. Keep existing deadline polling effective.
