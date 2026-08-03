# Hacker Management SRD

Status: Draft — proposed 2026-08-03, **not approved**. One question at the end changes an acceptance criterion in `spec.md`.

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Give `HackerAttendee` an officer-facing read and write surface, and connect a
status transition to the mail the configuration slice made editable.

Nothing today reads `HackathonStatusEmail` for delivery — verified by grep, it
is written and read as configuration only. `isConfigured` is computed by `list`
and `get` and consumed by nothing but the config screen. This slice makes both
load-bearing.

## Relevant principles

From `docs/agentic-development/forge-engineering-principles.md`:

- _Architectural sins to avoid_ — "Requiring developer changes for behavior that
  should be configurable." Legacy's soft blacklist is a hardcoded UUID
  (`legacy/packages/api/src/routers/hackers/queries.ts:446`); this replaces it
  with data.
- _Sharing and package boundaries_ — hacker logic belongs in `@forge/api`.
  `@forge/db` gets the schema change only.
- _React and Next.js principles_ — server-first page, no page-level
  `"use client"`.

## Access policy

Every procedure is `permProcedure` asserting officer, matching the
configuration router it sits beside.

- **Unauthenticated / non-officer:** no access; the route redirects.
- **Officer:** full read and write.

Two notes that are not obvious:

- **`READ_HACKERS` exists and is deliberately not accepted.** A read-only tier
  would be defensible for the roster, but the roster carries applicant PII
  (email, school, phone via the hacker record) and every write on this screen is
  officer-only anyway. Splitting the tier is a decision for whoever needs it,
  not a guess to make now.
- **The blacklist flag must never leave the officer tier.** It is a judgement
  about a person recorded where they cannot see it. No procedure reachable by a
  member or by an applicant may return it, and the SDK slice must not expose it
  when it starts serving hacker data to external sites.

## Architecture / data flow

```txt
apps/blade  /admin/hackathon/[id]/hackers   server page: officer gate + read
            _components/admin/hackathon/hackers/*   client table + dialogs
                       │
                       ▼
@forge/api  routers/hacker.ts        roster + transitions + blacklist
            utils/hacker/*           transition + send orchestration
                       │
                       ▼
@forge/api  utils/email/campaign.ts  EXISTING send pipeline, reused
@forge/db   schemas/knight-hacks.ts  blacklist columns only
```

## The send path, and what reusing the pipeline actually means

This is the load-bearing decision, and it has a consequence the spec has not
absorbed yet.

**The campaign pipeline is asynchronous.** `confirmSend` does not send. It marks
an `EmailSend` row confirmed; `apps/cron/src/crons/email-delivery.ts` runs
`runEmailDeliveryCycle()` on `*/2 * * * *`, and that creates a Listmonk campaign
and sets it running. So:

- Delivery lags a status change by **up to two minutes**, plus Listmonk's own
  queue.
- Each send becomes **one Listmonk campaign**. A hackathon that accepts people
  one at a time produces one campaign per acceptance.

The alternative is `EmailProviderGateway.sendTransactional`, which is
synchronous and 1-of-1. `sendEmail` in `packages/email/src/index.ts` already
wraps it and currently has zero callers — it was reshaped in the previous slice
for exactly this use and never wired up.

**Recommendation: use the campaign pipeline for both single and bulk**, despite
the campaign-per-acceptance ugliness, because the pipeline is where suppression
(`lookupSubscriberStates`), the delivery record, the retry lease, and the audit
trail already live. `sendTransactional` has none of those, and a status email is
exactly the kind of mail that must respect an unsubscribe.

**What this changes in the spec:** AC-009 says a failed send must not leave the
applicant in the new status with no mail sent. With an async pipeline that
invariant cannot hold as written — the transition commits, and delivery is
attempted later. The achievable invariant is:

> The status change and the **enqueue** are atomic. Delivery failure is visible
> in the send log and retried by the existing lease mechanism, never silent.

That is weaker than AC-009 and needs an explicit decision. See the open question.

## Bulk operates on a filter, not a list of ids

Bulk is the primary flow, and "select every applicant matching these filters" is
the shape officers actually want. That rules out the obvious design.

**Why not an id list.** Filtering to UCF undergraduates on a real hackathon
selects hundreds of people. Sending that many uuids to `previewBulk` and again
to `confirmBulk` is wasteful, but the real problem is correctness: between the
officer clicking select-all and clicking confirm, rows change. Someone gets
blacklisted; someone withdraws on the hack site. An id list captured at
select-all time silently acts on stale membership.

**So the filter is the selection.** `previewBulk` takes the same filter the
roster is showing, resolves it server-side, and returns the resolved set plus a
`previewVersion`. `confirmBulk` takes that version and acts on the snapshot the
officer was actually shown. Anything that changed in between is reported in the
result rather than silently included or dropped — which is AC-029.

This is deliberately the same shape as `email.previewSend` / `email.confirmSend`,
which already solves this problem for campaigns with `previewVersion`,
`audienceHash`, and `previewExpiresAt`. Officers already know the interaction,
and the snapshot semantics are proven.

**Show-all is a read concern, not a bulk concern.** AC-028's unpaginated view
raises the page limit for display; it does not change how selection works.
Selection is always the filter. A roster of 2537 is renderable if the row is
cheap, but the ceiling needs measuring rather than assuming — and the count
query stays server-side regardless.

## Filters and what the data actually supports

Filterable: `status` and the blacklist flag from `HackerAttendee`; `school`,
`levelOfStudy`, and `gradDate` from `Hacker`.

**`levelOfStudy` is degree type, not academic year** — "Undergraduate University
(3+ year)", "(2 year — community college or similar)", "Graduate", "Secondary /
High School", plus opt-outs. There is no freshman/sophomore/junior/senior field,
and `spec.md` explains why deriving one from `gradDate` is a guess that would
put officers on the wrong cohort. Filter is on **graduation year**, labelled as
such.

Distribution in the dev database, which is what these filters will be exercised
against: 1969 of 2538 hackers are UCF, 1905 are undergraduate 3+ year. A filter
that returns most of the table is the normal case here, not the edge case — so
the filtered path has to be as fast as the unfiltered one, and `school` and
`levelOfStudy` are the indexes to consider.

## tRPC/API behavior

New `hacker` router, registered in `root.ts` as `api.hacker.*`.

| Procedure          | Shape                                                            | Notes                                                                         |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `listForHackathon` | query(`{hackathonId, search?, status?, cursor?}`) → page         | Paginated. 2537 rows exist today; the largest hackathon must not be one read. |
| `statusCounts`     | query(`{hackathonId}`) → count per status                        | One grouped query, not seven.                                                 |
| `setStatus`        | mutation(`{attendeeId, status}`)                                 | Enqueues the configured mail. Refuses on blacklist and on unconfigured.       |
| `previewBulk`      | mutation(`{hackathonId, filter, status}`) → who sends, who skips | Takes a **filter**, not an id list. Nothing is written.                       |
| `confirmBulk`      | mutation(`{previewVersion}`) → per-hacker result                 | Acts on the snapshot the preview took. Best-effort.                           |
| `setBlacklist`     | mutation(`{attendeeId, blacklisted, reason?}`)                   | Never changes status. Sends nothing.                                          |

Errors: `NOT_FOUND` for unknown ids, `PRECONDITION_FAILED` for a blacklisted
accept and for an unconfigured hackathon, `BAD_REQUEST` for validation.

**Audit.** Every mutation writes `createAdminAuditEvent`, and the new keys must
be declared in `packages/validators/src/audit.ts` and
`packages/api/src/utils/audit/coverage.ts` — the coverage test discovers routers
from disk and fails otherwise. `hacker.status_changed` carries a before/after
diff; blacklist events carry the reason.

## Validation

New module `packages/validators/src/hackers.ts`, or an extension of the existing
hackathon validators if it stays small. `hackathonSendingStatusSchema` already
exists and is exactly the set reachable here — `checkedin` is excluded by
construction, which is what AC-007 needs, so it should be reused rather than
re-derived.

## Data / migration / compatibility

Two columns on `knight_hacks_hacker_attendee`:

- `blacklisted_at timestamptz null`
- `blacklisted_by uuid null references auth_user(id)`
- `blacklist_reason text null`

A `CHECK` keeps the three consistent: either all null, or `blacklisted_at` and
`blacklist_reason` both set. A flag with no reason is the thing a year-later
officer cannot interpret, so the database refuses it rather than trusting the
form.

Nullable and additive, so existing rows stay valid and production `main` — which
reads this table in `campaign.ts` and writes it at check-in — is unaffected.
Presence of `blacklisted_at` is the flag; storing who and when rather than a
boolean is what makes AC-015 answerable.

**Shared-database caveat, unchanged from last slice:** production `main` and
Reforge share one `__drizzle_migrations` table, and Drizzle's migrator is a
timestamp watermark. A migration generated on `main` with an earlier timestamp
than Reforge's newest will be skipped silently. That hazard is not introduced
here but this slice adds to the watermark.

## Discord integration

None. Class assignment and role application moved to the event slice with
check-in. This slice must not write `classId` or touch a guild.

## Configurability review

Would this require a developer change next year?

- **No.** The blacklist becomes data. Status mail is already officer-editable.
- The one hardcode replaced is legacy's blacklisted UUID.
- Nothing here is per-hackathon in source.

## React / frontend constraints

- Server component page doing the officer gate and the first page of the roster;
  the table is a client component below it.
- The bulk flow mirrors the email portal's preview → confirm, per the resolved
  spec question. `email-portal-workspace.tsx` is the reference, but note its
  confirm-gate tests are known-vacuous (spun off separately) — copy the
  interaction, not the test approach.
- Per-status counts are a deliberate design target. `apps/blade/DESIGN_SYSTEM.md`
  is the contract; legacy's version is the thing to beat.
- 2537 rows: the table needs pagination or virtualization, and the count query
  must not be a client-side length of a fetched array.

## Testing / verification strategy

| Area                 | Location                                            | Command                                |
| -------------------- | --------------------------------------------------- | -------------------------------------- |
| Validators           | `packages/validators/src/tests/hackers.test.ts`     | `pnpm --filter=@forge/validators test` |
| Access policy        | `packages/api/src/tests/hacker/access.test.ts`      | `pnpm --filter=@forge/api test`        |
| Transition + enqueue | `packages/api/src/tests/integration/`               | `pnpm --filter=@forge/api test`        |
| Blacklist guards     | `packages/api/src/tests/integration/`               | `pnpm --filter=@forge/api test`        |
| Blade UI states      | `apps/blade/src/tests/admin/hacker-roster.test.tsx` | `pnpm --filter=@forge/blade test`      |

The previous bundle promised a Blade test file and an e2e spec and shipped
neither. Both are listed here as commitments, not aspirations, and `status.md`
will say plainly if either is skipped.

Guards get DB-backed integration tests with positive controls, following
`hackathon-destructive-guards.test.ts` — a guard test that passes against an
unconditionally-refusing guard proves nothing.

## Resolved: what "enqueued" actually guarantees

The async invariant was accepted on the condition that it still means the mail
_gets there_. Here is exactly what carries that, read out of
`packages/api/src/utils/email/delivery.ts`:

1. **The transition and the enqueue commit together.** One transaction writes
   the new status and an `EmailSend` row at `queued`. There is no window where a
   hacker is accepted with nothing queued, or something queued for a status
   change that rolled back.
2. **The cron claims work under a five-minute lease**
   (`retryLeaseExpiresAt`), so two cron ticks cannot process the same send twice
   and a crashed tick releases its claim instead of stranding the row.
3. **One Listmonk campaign per send, carrying every recipient.**
   `createCampaign` takes a `recipientData` array — so a bulk accept of two
   hundred is one campaign with two hundred recipients, which is the behaviour
   observed in the Listmonk portal and the behaviour we want.
4. **Failure is retried, bounded, and recorded.** A failed attempt increments
   `retryAttemptCount` and sets `nextRetryAt`; at the fifth attempt the send goes
   terminal with `status: "failed"` and a human-readable `safeError`.
5. **Every state change is logged.** `EmailSendEvent` records `fromStatus`,
   `toStatus`, `type`, actor and metadata per send, so "what happened to that
   acceptance email" is answerable after the fact.

So the guarantee is not fire-and-forget: it is a durable row, bounded retry, a
terminal state, and an event log.

### The gap that leaves, and how it gets closed

**Confirmed in scope:** officers need to see which emails failed and who they
were for, so they can reach those people another way — phone or Discord —
rather than leaving an accepted hacker who never heard anything.

That is a stronger requirement than a badge, and it constrains the design in a
way worth writing down before any code:

**The link cannot lean on `EmailSendRecipient`.** That table holds the
per-recipient snapshot (`email`, `attributes`, `exclusionReason`), and
`runEmailDeliveryCycle` **deletes it** once a send passes its retention window,
along with the provider-side recipient namespace. Recipient rows for expired
drafts are deleted outright. So "which hackers were in that failed send" is not
answerable from the email tables after retention — exactly when an officer is
most likely to go looking.

**So this slice owns the link.** When a transition enqueues mail, it records the
`EmailSend` id against each attendee it covered:

- `knight_hacks_hacker_attendee.last_status_send_id uuid null references email_send(id) on delete set null`

Many attendees to one send, which is correct for bulk: two hundred acceptances
share one send id. `on delete set null` because expired drafts are hard-deleted
and a dangling FK would break the roster. `EmailSend` rows for completed and
failed sends are **not** deleted — only their recipient snapshots are — so the
status stays readable indefinitely.

The roster then joins attendee → `EmailSend` and reads `status` and `safeError`
directly. No dependence on purged data, and it works for both single and bulk.

**What the officer sees, given the purpose is manual outreach:**

- A per-row indicator when the last status email is `failed`, showing
  `safeError` so they know whether it was a bad address or a provider problem.
- A filter for "delivery failed", so the list can be worked through rather than
  hunted for.
- The contact fields already on `Hacker` — `email`, `phoneNumber`, `discordUser`
  — surfaced on those rows, since reaching out is the entire point.

**Note on `discordUser`:** it is the only one of the three that may be absent or
stale, and it is a username rather than a link. Displaying it is fine; making it
actionable is not something this slice should promise.

### Superseded note

Without the above, a permanently failed status email sits at `failed` in the
email portal's send list with nothing tying it to the hacker it was for — the
officer who clicked accept saw a success toast, and the applicant never heard
anything. Same class of problem as the previous slice's `isConfigured`: a signal
that exists and is read by nothing. Not repeating it.

## Resolved decisions

1. **Async is accepted.** Up to two minutes to delivery is fine given the
   guarantees above. AC-009 is replaced by the enqueue-atomicity invariant, plus
   proposed AC-024 so terminal failure is visible where it matters.
2. **One campaign per bulk action** — which is what the pipeline already does,
   and confirmed against the Listmonk portal. A single transition is a batch of
   one. My earlier phrasing suggested a campaign per recipient; that was wrong.
3. **Blacklisting requires a written reason.** Stored on `HackerAttendee`,
   shown only in hacker management. It is officer-only, like the flag itself —
   `blacklist_reason` must never appear in any member-facing or SDK payload.

## Open questions

None blocking. `test-cases.md` is next, then implementation once the bundle is
approved.
