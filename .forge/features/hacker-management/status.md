# Hacker Management Status

Phase: **artifacts** — spec and SRD approved 2026-08-03; `test-cases.md` drafted
and awaiting approval. No implementation started.

## Context

The slice after hackathon configuration. That slice made per-status mail
officer-editable; nothing sends it, and `isConfigured` is computed and read by
nothing. This slice makes both load-bearing, and gives `HackerAttendee` an
officer-facing surface.

## Decision log

**Scope, from the first reverse-prompt round:**

- **Check-in moved out**, to the event page slice, taking class assignment and
  live Discord role application with it. This was originally in this slice.
- **Points moved in**, but read-only — the column is displayed and nothing here
  writes it. Awarding arrives with events.
- **Bulk accept/deny is in.**
- **Hackers come from existing rows only.** The hack sites own application, and
  the SDK carrying it is two slices out.

**Send path:**

- **Reuse the campaign pipeline**, for suppression, delivery records, retry and
  audit, rather than a second transactional path.
- The pipeline is **asynchronous**: `confirmSend` marks an `EmailSend` row
  confirmed and `apps/cron` delivers on `*/2 * * * *`. Up to two minutes to
  delivery, accepted.
- **One campaign per send, carrying every recipient.** `createCampaign` takes a
  `recipientData` array, so a bulk accept of two hundred is one campaign. This
  corrects a claim in an earlier draft of the SRD that read as one campaign per
  recipient; the owner caught it against the Listmonk portal.
- AC-009 was **revised** as a result: the status change and the enqueue are
  atomic; delivery failure is retried to a bounded five attempts, recorded, and
  surfaced. The original wording required the send itself to be atomic with the
  transition, which an async pipeline cannot do.

**Blacklist:**

- Per-hackathon, stored on `HackerAttendee`, and **orthogonal to status** — it
  never changes where someone sits in the funnel. A blacklisted applicant stays
  `pending` until an officer capacity-rejects them like anyone else.
- **Never a status value**, so it can never be shown to the applicant.
- On a blacklisted row, every action is disabled except capacity reject and
  un-blacklist.
- **A written reason is required**, enforced by a CHECK constraint so a flag
  without a reason cannot exist. Visible in hacker management only — never to the
  applicant, a member surface, or the SDK.
- Replaces legacy's implementation, which is one person's UUID hardcoded in a
  query (`legacy/packages/api/src/routers/hackers/queries.ts:446`).

**Failed delivery, added mid-conversation:**

- Officers need to see which status emails failed and who they were for, to
  reach those people by phone or Discord instead.
- **The link cannot use `EmailSendRecipient`** — the delivery cycle deletes those
  snapshots after retention, and outright for expired drafts, so "who was in that
  failed send" stops being answerable exactly when someone goes looking.
- So this slice owns the link: `last_status_send_id` on `HackerAttendee`,
  many-to-one so a bulk shares one send id, `on delete set null` because expired
  drafts are hard-deleted. `EmailSend` rows for completed and failed sends
  survive.

**Other:**

- No transition graph — any status to any status stays legal.
- `withdrawn` is officer-settable but not a primary action.
- Per-status counts are in, and legacy's version is explicitly the thing to beat.
- Bulk gets a preview-and-confirm step modelled on the email portal's send flow.

## Open questions

From `test-cases.md`, none blocking implementation of the platform tier:

1. Roster page size, and whether it is officer-adjustable.
2. Whether TC-013 should simulate a retention purge, or simply assert the roster
   query never reads `EmailSendRecipient` — the latter pins the design decision
   rather than the symptom.

Three challenges to approved acceptance criteria are recorded in
`test-cases.md`: AC-020 and AC-022 are copy and layout claims that are not
usefully testable, and TC-006 needs a failure-injection seam that the SRD has
not specified.

## Task list

- [x] Branch and worktree off merged `reforge/main`.
- [x] Instantiate the bundle.
- [x] Reverse-prompt and fill `spec.md` — 26 acceptance criteria.
- [x] Reverse-prompt and fill `srd.md` — send path worked out against the code.
- [x] Owner approved `spec.md` and `srd.md`.
- [ ] Owner approves `test-cases.md`.
- [ ] Implement the platform tier: schema, migration, validators, `hacker`
      router, audit registration.
- [ ] Implement the roster UI.
- [ ] Write the tests, including the Blade and e2e files this bundle commits to.

## Validation / commands

Nothing run yet beyond the environment check below. No code written.

## Environment

- Worktree needed its own `.env`, copied from `forge-reforge-main` and confirmed
  gitignored before anything else ran.
- Docker was down after a machine restart — colima had a stale host-agent socket
  and needed `colima stop --force` before it would start. The database is the
  same container the previous slice used; verified by writing a marker row
  through `docker exec` and reading it back through the host port.
- Data available: **2537 attendees** across all seven statuses — 1058 checkedin,
  465 confirmed, 462 pending, 387 denied, 60 withdrawn, 54 waitlisted, 51
  accepted. Enough to exercise pagination and counts against something real.

## Links

- PRs:
- Issues:
- Discord/thread context:
