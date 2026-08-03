# Hacker Management Test Cases

Status: Draft — proposed 2026-08-03, **not approved**. Three challenges to the approved spec at the end, and two open questions.

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

Covers the twenty-six acceptance criteria in `spec.md`: the roster, status
transitions and the mail they enqueue, the blacklist, bulk actions, the
readiness gate, and the failed-delivery surface.

Intentionally excluded:

- **Actual delivery.** The provider gateway has a fake
  (`packages/email/src/provider.ts`); these cases assert what is _enqueued_ and
  what the pipeline records, never that Listmonk sent anything.
- **Check-in.** Moved to the event slice. `checkedin` appears here only as a
  status that must be unreachable (TC-NEG-004).
- **Awarding points.** Read-only this slice; the only assertion is that nothing
  writes the column.
- **The cron itself.** `runEmailDeliveryCycle` is pre-existing and tested by
  whatever covers it today; these cases stop at the `EmailSend` row.

## Test placement plan

| Area                      | Location                                                        | Command                                |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| Validators                | `packages/validators/src/tests/hackers.test.ts`                 | `pnpm --filter=@forge/validators test` |
| Access policy             | `packages/api/src/tests/hacker/access.test.ts`                  | `pnpm --filter=@forge/api test`        |
| Transitions, guards, bulk | `packages/api/src/tests/integration/hacker-transitions.test.ts` | `pnpm --filter=@forge/api test`        |
| Blacklist guards          | `packages/api/src/tests/integration/hacker-blacklist.test.ts`   | `pnpm --filter=@forge/api test`        |
| Roster UI states          | `apps/blade/src/tests/admin/hacker-roster.test.tsx`             | `pnpm --filter=@forge/blade test`      |
| End-to-end                | `apps/blade/src/tests/e2e/hacker-management.spec.ts`            | `pnpm --filter=@forge/blade e2e`       |

**The last two rows are commitments, not aspirations.** The hackathon
configuration bundle promised a Blade test file and an e2e spec in this exact
table and shipped neither; `status.md` recorded it, but the promise was still
made and broken. If either is skipped here, `status.md` says so before the
bundle is called done, in the same sentence as the reason.

**Why guard tests are DB-backed rather than mocked.** The blacklist and
readiness guards stand in front of real SQL and a real send enqueue. Mocking the
drizzle chain asserts the mock; the previous bundle tried it, failed four times,
and the failures were the signal that the test was wrong. Following
`hackathon-destructive-guards.test.ts`: a disposable database, and **a positive
control for every guard** — a guard that refuses unconditionally passes every
negative case, and the only way to know is to assert it also allows the legal
one.

## Test cases

### TC-001: The roster shows one hackathon's applicants (AC-001)

Setup: two hackathons, each with applicants.

Action: read the roster for the first.

Expected: only that hackathon's applicants, with their statuses. No row from the
other hackathon appears at any page size.

### TC-002: Search and filter (AC-002)

Setup: applicants with distinguishable names, emails, and statuses.

Action: search by a name fragment; search by an email fragment; filter to
`pending`.

Expected: each narrows to the matching set. Filter and search compose.

### TC-003: Pagination holds at real scale (AC-001)

Setup: more applicants than one page.

Action: page through the roster.

Expected: every applicant appears exactly once across pages, none twice, none
missing. The dev database has 2537 attendees; a roster that silently truncates
is the failure this catches.

### TC-004: Status counts agree with the table (AC-023)

Setup: a hackathon with a known distribution across statuses.

Action: read the counts and the unfiltered roster.

Expected: each count equals the number of rows with that status. Counts come
from the server, not from the length of a fetched page — a client-side count
over a paginated list is wrong the moment there is a second page.

### TC-005: A transition enqueues the configured mail (AC-004, AC-008)

Setup: a fully configured hackathon; an applicant at `pending`.

Action: set their status to `accepted`.

Expected: the applicant is `accepted`, and exactly one `EmailSend` exists
carrying that hackathon's `accepted` template and subject, addressed to that
applicant. The template id matches what the configuration screen shows.

### TC-006: Status and enqueue are atomic (AC-009, revised)

Setup: a configured hackathon; an applicant at `pending`.

Action: force the enqueue to fail, then attempt the transition.

Expected: the applicant is still `pending` and no `EmailSend` exists. The two
commit together or not at all. This is what replaced the original AC-009, so it
is the case that proves the replacement is real rather than a downgrade.

### TC-007: Bulk accept produces one send (AC-016, AC-019)

Setup: a configured hackathon; twenty applicants at `pending`.

Action: bulk accept all twenty.

Expected: all twenty are `accepted`; **exactly one** `EmailSend` exists carrying
twenty recipients. Not twenty sends. This pins the behaviour confirmed against
the Listmonk portal.

### TC-008: Bulk is best-effort and reports honestly (AC-017, AC-018)

Setup: twenty applicants, three of which will fail — blacklisted, or otherwise
ineligible.

Action: bulk accept all twenty.

Expected: seventeen move, three do not, and the result names each of the three
with its reason. The seventeen are not rolled back because three failed.

### TC-009: Bulk preview shows who is about to be mailed (AC-021)

Setup: a selection including at least one blacklisted applicant.

Action: request the preview.

Expected: the preview lists who will be mailed and who will be skipped, and
**nothing is written** — no status change, no `EmailSend`. Confirming is a
separate step.

### TC-010: Blacklisting does not touch status (AC-011, AC-012)

Setup: an applicant at `pending`.

Action: blacklist them with a reason.

Expected: still `pending`. No `EmailSend` is created. `blacklisted_at`,
`blacklisted_by`, and `blacklist_reason` are set.

### TC-011: Blacklist is attributable (AC-015)

Setup: an officer blacklists, a different officer un-blacklists.

Action: read the audit trail.

Expected: both events, each naming its actor, time, and — for the set — the
reason.

### TC-012: Failed delivery is visible against the applicant (AC-024, AC-026)

Setup: an applicant whose status email reached `failed` with a `safeError`.

Action: read the roster.

Expected: that applicant's row reports the failure and the reason, and carries
their email, phone, and Discord username. Filtering to failed deliveries returns
them.

### TC-013: The failure link survives recipient purge (AC-024)

Setup: a failed send whose `EmailSendRecipient` rows have been deleted, as the
delivery cycle does after retention.

Action: read the roster.

Expected: the failure is still attributed to the applicant. This is the case the
whole `last_status_send_id` design exists for — if the link went through the
recipient snapshot, this is where it would break, and it would break silently
and late.

### TC-014: Points are read-only (AC-003)

Setup: an applicant with a nonzero point total.

Action: exercise every mutation in the router.

Expected: the total is unchanged by all of them.

## Negative / regression cases

### TC-NEG-001: Access (AC — SRD access policy)

Setup: unauthenticated; a logged-in non-officer; an officer.

Action: call every procedure in the router.

Expected: the first two are refused for every procedure; the officer succeeds.
Asserted against the router's actual procedure list so a procedure added later
without a guard fails this test rather than slipping through.

### TC-NEG-002: A blacklisted applicant cannot be accepted (AC-014)

Setup: a blacklisted applicant at `pending`.

Action: accept them, singly and via bulk.

Expected: refused both ways with `PRECONDITION_FAILED`. Status unchanged, no
`EmailSend`. **Positive control:** the same accept succeeds once un-blacklisted.

### TC-NEG-003: Only capacity and un-blacklist are available (AC-013)

Setup: a rendered roster row for a blacklisted applicant.

Action: render.

Expected: every action disabled except capacity reject and un-blacklist. Asserted
by accessible name, not by class or `data-*`.

### TC-NEG-004: `checkedin` is unreachable (AC-007)

Setup: a configured hackathon.

Action: attempt a transition to `checkedin`.

Expected: rejected at the input boundary. `hackathonSendingStatusSchema` already
excludes it, so this proves the router uses that schema rather than the wider
one — which is the mistake worth catching.

### TC-NEG-005: An unconfigured hackathon blocks mail-sending transitions (AC-006)

Setup: a hackathon missing at least one status email.

Action: attempt `pending → accepted`; then blacklist someone; then read.

Expected: the transition is refused; the blacklist and the read succeed.
**Positive control:** the same transition succeeds once the hackathon is fully
configured. Without that control this test passes against a guard that refuses
everything.

### TC-NEG-006: A missing template for the target status is refused (AC-005)

Setup: a hackathon configured for every status except `waitlisted`.

Action: attempt a transition to `waitlisted`.

Expected: refused, and the message names `waitlisted`. An officer who cannot
tell which of six is missing has to guess.

### TC-NEG-007: Blacklisting without a reason is refused (AC-025)

Setup: an applicant.

Action: blacklist with an empty reason.

Expected: rejected. Also asserted at the database: a row with `blacklisted_at`
set and `blacklist_reason` null violates the CHECK. The schema is the guarantee;
the validator is the good error message.

### TC-NEG-008: The blacklist never leaves the officer tier (SRD access policy)

Action: inspect every procedure reachable by a member or an applicant for
`blacklisted_at`, `blacklisted_by`, or `blacklist_reason`.

Expected: none returns any of them. Written as a shape assertion over the router
outputs rather than a grep, so it keeps holding as procedures are added — and it
is the case the SDK slice will need to keep passing.

## Challenges to the approved spec

1. **AC-020 is not testable as written.** "The screen states that a status change
   sends mail immediately and cannot be recalled" — asserting copy fires on every
   rewording and stays silent when the behaviour changes. I propose testing the
   _behaviour_ it protects (TC-009: preview writes nothing; confirm is separate)
   and treating the sentence as a design-review item rather than a test. Flagging
   because dropping an AC from the suite should be a decision, not an omission.

2. **AC-022 — "not a primary row action" — is a layout claim.** Testable only as
   something like "withdraw is not in the row's top-level buttons", which is
   close to asserting markup. I propose covering it in the e2e spec as "withdraw
   is reachable" and leaving prominence to design review.

3. **TC-006 needs a failure injection point the SRD has not specified.** Forcing
   an enqueue failure requires either a seam in the transition helper or a
   provider-fake that can be told to fail. The latter is cleaner and the fake
   already exists. Confirming that is acceptable before it is built.

## Open questions

1. **What is the roster's page size, and is it officer-adjustable?** TC-003
   asserts pagination is correct but not what the page is. 2537 rows across seven
   statuses; 50 feels right for scanning, 25 for phones. Not blocking, but it
   changes the UI work.

2. **Should TC-013 be a DB-backed test or is it enough to assert the join
   shape?** Simulating retention purge means deleting `EmailSendRecipient` rows
   mid-test, which is realistic but couples the test to the delivery cycle's
   cleanup. The cheaper version asserts the roster query never reads that table
   at all — arguably a better test, since it pins the design decision rather than
   the symptom.
