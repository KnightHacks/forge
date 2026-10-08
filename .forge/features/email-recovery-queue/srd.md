# Technical plan

Keep `emailfix`. Scope: Blade Emails queue and inaccurate hacker warning, API investigation/retry workflow, provider read-only evidence adapter, validators, and regression tests. Use existing EmailSend, EmailSendRecipient and EmailSendEvent records; no migrations or new dependencies.

Evidence: match exact Forge campaign name, one complete start/finish log window, unique subscriber IDs, strict explicit SMTP 4xx vs 5xx classification, and reconcile sent + failed against total. Missing logs, malformed/ambiguous errors, bounces or inconsistent counts cannot authorize retries. Map IDs to frozen recipient snapshots, persist only recipient row IDs and sanitized codes in event metadata. Do not retain raw logs, addresses or attributes in audit metadata.

Retry: require EMAIL_PORTAL, fresh investigation token, explicit selected recipient IDs, completed original campaign, current audience membership and suppression checks. Lock original send, reject previously retried recipients, create a new queued send with frozen content remapped to the new personalization namespace, copy only selected snapshots, and record parent/child linkage atomically. Existing worker owns actual delivery and its final suppression/development gates. Re-check evidence before queueing; do not restart the original campaign. Unknown results remain investigation-only. Review is manual and names the count and message.

UI: dedicated Queue tab, server-side search and pagination for attention sends across history. Compact full-width rows, recipient search/filter/selection in a review dialog, human-readable status labels and failure reasons, explicit review confirmation, links to retry history. Use Blade tokens/components. Fix hacker warning to say delivery needs review rather than claiming non-arrival.

Validation: provider evidence tests, real PostgreSQL atomicity/idempotency tests, UI interaction tests, desktop/320px screenshots, email/API/Blade/cron and workspace checks. Live investigation is read-only. No live template or send mutation, deployment or historical resend.
