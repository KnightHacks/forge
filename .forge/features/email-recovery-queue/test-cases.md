# Acceptance cases

- 252 sent + 72 distinct logged SMTP 421 rejections maps 72 eligible failures; other recipients are not labelled delivered or failed individually.
- Missing boundaries, multiple runs, duplicate IDs, wrong campaign, missing subscriber, count mismatch, bounce, timeout or malformed logs cannot authorize a retry.
- Permanent SMTP 5xx and unknown outcomes cannot be selected.
- Original content/personalization is preserved; only namespace and selected audience change.
- Concurrent/double retry requests for overlapping recipients enqueue at most one retry per original recipient. A later failure is retried from the child send.
- Changed audience membership, suppression, expired snapshots, stale investigation and missing EMAIL_PORTAL fail closed.
- Manual confirmation includes message and selected count; closing it sends nothing.
- Queue finds old failed campaigns past the latest 50 sends; search/page and empty/error/loading states work.
- At least 60 synthetic rows, desktop and 320px layouts remain usable; selection applies to named recipients and errors remain visible.
