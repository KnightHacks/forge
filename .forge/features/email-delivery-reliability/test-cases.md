# Email Delivery Reliability Test Cases

Status: Regression cases derived from the confirmed review; part of the authorized fix/test scope.

1. Two concurrent sends to one existing subscriber retain both namespaces and list memberships. Concurrent retention removes only its own namespace. Different subscribers do not block each other.
2. A campaign mutation without a shared lock fails before provider traffic. Test/fake/disabled policy restrictions remain intact.
3. A provider response with bounces=7 records seven bounces. Every HTTP request has a finite timeout.
4. Successful campaign start followed by a failed GET remains running with its campaign ID. A later delivery cycle reconciles it without creating another campaign.
5. Finished 3/10, finished 0/0 with a frozen audience of one, and finished with bounces become failed with an explanation. Finished with all intended messages accepted becomes completed. Paused becomes failed/nonterminal and returns to running when the provider resumes it.
6. Legacy queued-with-ID and completed-with-gap rows are selected for reconciliation. Terminal timestamps do not move forward on repeat reads.
7. The UI hides Retry for provider-started failures and retains it for safe preparation failures.
8. Live: send a labeled pair of independent one-recipient campaigns to directors@knighthacks.org; inspect recipient membership, personalization, final counts, and logs. Report SMTP acceptance separately from inbox receipt.
9. Additional live request: prepare 100 overlapping one-recipient campaigns to the user-selected replacement mailbox, verify all accumulated namespaces and memberships before each batch, and inspect campaign counts and error logs. Respect suppression checks; leave the directors test-list unsubscribe intact as requested.
10. A finished campaign reporting two sends for one recipient is flagged for review, including a legacy completed row. Do not assert duplicate inbox delivery from the provider counter alone.
11. Exercise 100 campaigns sharing 100 synthetic recipients through the actual queue, PostgreSQL, Listmonk v6.0.0, and a local SMTP capture service. Compare all 10,000 expected campaign/recipient pairs with captured messages and personalized subjects; check for missing/duplicate messages, namespace loss, and provider count inconsistencies.
12. Default HTML campaigns use a content-only wrapper. Preserve the authored document, personalization, links, and text alternative; keep unsubscribe/browser-view links and one tracking pixel inside the body. Support visual fragments, existing controls, and explicit custom provider wrappers. Plain-text and transactional sends retain their behavior.
13. Render the reported pre-event campaign through the new wrapper on mobile and desktop, then send exactly one provider test to directors@knighthacks.org. Verify its existing subscription state is unchanged. Do not start a real campaign or resend to the original audience.
14. Start three overlapping batches of 20 recipient writes while provider responses are blocked. At most four transactions hold connections, no excess calls wait inside the database pool, and an unrelated query on the same pool completes before provider responses are released. All 60 writes eventually complete. Queued calls drain in order, and checkout, advisory-lock, provider, and commit failures return capacity to later callers.
