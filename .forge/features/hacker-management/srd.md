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

## tRPC/API behavior

New `hacker` router, registered in `root.ts` as `api.hacker.*`.

| Procedure          | Shape                                                    | Notes                                                                         |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `listForHackathon` | query(`{hackathonId, search?, status?, cursor?}`) → page | Paginated. 2537 rows exist today; the largest hackathon must not be one read. |
| `statusCounts`     | query(`{hackathonId}`) → count per status                | One grouped query, not seven.                                                 |
| `setStatus`        | mutation(`{attendeeId, status}`)                         | Enqueues the configured mail. Refuses on blacklist and on unconfigured.       |
| `previewBulk`      | mutation(`{attendeeIds, status}`) → who sends, who skips | Mirrors `email.previewSend`; nothing is written.                              |
| `confirmBulk`      | mutation(`{previewVersion, ...}`) → per-hacker result    | Best-effort. Mirrors `email.confirmSend`.                                     |
| `setBlacklist`     | mutation(`{attendeeId, blacklisted, reason?}`)           | Never changes status. Sends nothing.                                          |

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

Nullable and additive, so existing rows stay valid and production `main` — which
reads this table in `campaign.ts` and writes it at check-in — is unaffected.
Presence of `blacklisted_at` is the flag; storing who and when rather than a
boolean is what makes AC-015 answerable.

**Open for the spec, not for me:** whether a reason is required. The spec's
AC-015 asks only for attributability. A required reason is a product call.

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

## Open questions

1. **AC-009 cannot hold as written.** The pipeline is async, so "a failed send
   does not leave the applicant in the new status with no mail sent" is not
   achievable — the transition commits and delivery happens up to two minutes
   later, in a cron. I propose replacing it with: the status change and the
   enqueue are atomic, and delivery failure is visible in the send log and
   retried, never silent. **Does that satisfy what AC-009 was protecting, or do
   you want the transition to block until delivery is confirmed?** The latter is
   possible via `sendTransactional`, but costs suppression and delivery records.

2. **Is one Listmonk campaign per single acceptance acceptable?** Accepting
   fifty people individually creates fifty campaigns in Listmonk. Functionally
   fine, operationally noisy. The alternative is single transitions going
   through `sendTransactional` and bulk going through the pipeline — two paths,
   which is what the pipeline choice was meant to avoid.

3. **Is a reason required when blacklisting?** AC-015 asks only for
   attributability. A required free-text reason is more useful a year later and
   more friction now.
