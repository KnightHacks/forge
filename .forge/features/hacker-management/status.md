# Hacker Management Status

Phase: **implemented** — whole bundle approved 2026-08-03 and built. Awaiting
`forge-review` and the owner's UI pass.

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
- [x] Owner approved `test-cases.md` and the whole bundle.
- [x] Platform tier: migration 0031, validators, `hacker` router, audit
      registration.
- [x] Roster UI with amendable multi-select, filters, bulk preview/confirm,
      blacklist, and the failed-delivery surface.
- [x] Tests, **including both files the previous bundle promised and skipped**.
- [ ] `forge-review` until clean.
- [ ] Owner UI pass.

## Deviations from the approved SRD

Two, both deliberate and commented at the point of deviation:

1. **`confirmBulk` takes the selection, not a stored preview handle.** The SRD
   proposed a `previewVersion`. Persisting a preview would add a row with its
   own lifecycle and expiry for no gain, because the ids _are_ the selection —
   and it would act on eligibility frozen at preview time. Re-resolving at
   confirm catches anyone blacklisted in between and names them, which is what
   AC-029 actually asks for.
2. **`school` and `levelOfStudy` compare with `sql` rather than `eq`.** Both
   columns are typed as unions of several thousand literals, so `eq` demands a
   member of that union while the filter carries whatever the officer typed.
   Identical SQL, different type-level narrowing.

## Validation / commands

- `pnpm format` — 19/19. `pnpm lint` — 25/25, zero errors. `pnpm typecheck` —
  27/27. `pnpm test` — 23/23.
- Test totals: db 102, validators 197, email 79, api 494, blade 565.
- `pnpm --filter=@forge/db migrate` — 0031 applied to the local dev database.
  The CHECK was verified against the database directly: it rejects
  `blacklisted_at` without a reason and accepts the pair.

**Guards proven by breaking them.** Every guard test was verified by
reintroducing the bug it exists for, then reverting:

- Removing the officer check from `listForHackathon` fails the access test.
- Neutering the blacklist guard fails three integration cases.
- Neutering the readiness gate fails one.
- Making a shift-range replace the selection rather than add to it fails the
  amendability case.

A guard that refuses unconditionally passes every negative case, so each guard
also asserts it _allows_ the legal one.

**Not verified in a browser by me.** The route compiles and returns 307 for an
unauthenticated request, which proves the officer gate fires, but signing in
needs Discord OAuth. The dev server is left running for the owner's pass.

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

## Deferred: move `isFirstTime` onto the attendance record

**Decision (owner):** keep both fields for now, take the schema change as a
manual migration, and drop `Hacker.isFirstTime` only after cutover — the legacy
application form writes it, so dropping it before then breaks applications.

**Why.** `isFirstTime` is a claim about a person _at one hackathon_, stored on
the profile where the next application overwrites it. 181 hackers have applied to
more than one hackathon and 97 of those still read as first-timers, so the field
is already wrong for over half the people it can be wrong about. The per-event
answer for past hackathons is unrecoverable: one boolean cannot be un-overwritten.
This is the same shape as the `age` bug — a point-in-time fact kept somewhere
mutable.

Self-declared is kept deliberately. Deriving it from our own attendance would
answer a narrower question ("first Knight Hacks") under the same label, and count
someone who has done three hackathons elsewhere as a first-timer. Sponsors and
MLH ask the applicant; the applicant's answer is the data.

**Shape.** `HackerAttendee.isFirstTime`, **nullable, no default.** Not
default-`false`: that makes every pre-existing row assert "not a first-timer",
conflating "they said no" with "nobody asked", and the first statistic pulled off
it is understated with nothing to reveal that. `null` means unrecorded, which is
true.

**Write point: check-in**, in the event slice, not here. At check-in:

```
isFirstTime = declared_on_profile AND no prior checked-in attendance
```

computed once and frozen. Waiting costs nothing — the profile value is correct
for the current hackathon at the moment someone applies or checks in, so
capturing it at check-in loses only what is already lost. Adding the column now
would ship something nothing writes and nothing reads, plus a backfill to redo.

**The one thing that changes this:** if check-in will not ship before Knight
Hacks IX, add the column early and snapshot before the event, or KH IX's
first-timer number is lost the same way KH VIII's was.

**Backfill, when it happens.** `true` on the earliest checked-in attendance for
hackers currently declaring true; `false` on their later checked-in ones; `null`
everywhere else, including the majority who have never checked in. No value is
manufactured for rows we cannot speak to.

**Not extended to the other profile fields.** `school`, `levelOfStudy`,
`shirtSize` and `foodAllergies` drift too, so "what year were our KH VIII
attendees" is already unanswerable — but those are slowly-changing attributes,
where `isFirstTime` is definitionally a point-in-time claim. Owner's call, and a
reasonable one.

## Links

- PRs:
- Issues:
- Discord/thread context:
