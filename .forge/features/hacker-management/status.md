# Hacker Management Status

Phase: **implemented** — whole bundle approved 2026-08-03 and built. Awaiting
`forge-review` and the owner's UI pass.

## Delegated hacker permissions — 2026-09-06

Phase: PR open; awaiting CI and review. Branch: `codex/blade-hacker-permissions`.

- Issue: [#538](https://github.com/KnightHacks/forge/issues/538).
- PR: [#539](https://github.com/KnightHacks/forge/pull/539).
- Rebased onto `main` before publishing to exclude the unrelated navigation
  changes in PR #537. The permission fix applied without conflicts; validation
  passed again on this standalone branch (194 API tests, 34 Blade tests, and
  seven browser tests).

- Owner approved making Read Hackers functional without officer status, with
  Edit Hackers controlling writes and blacklist/configuration remaining officer-only.
- Scope: Blade hacker navigation/page/controls, hacker API guards and responses,
  and the hacker detail's event-attendance read. No schema or dependency changes.
- Regression proof: the new API matrix failed 31 cases before implementation.
  The completed API checks pass 194 tests across hacker access, real database
  guards, hackathon configuration access, event access, and role permissions.
- Blade: 34 targeted tests pass. All seven hacker-management browser tests pass,
  including readers at 1440px and 320px, the legacy link, filtering/search,
  details and attendance, editor controls, unauthorized redirects, and existing
  officer flows. Roster/detail screenshots were inspected at both widths.
- Database and browser checks used disposable local databases, dropped afterward.
  Status-mail tests enqueue only in the disposable database; no delivery worker runs.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, and
  `pnpm analyze:react:changed` pass. Lint retains the repository's existing
  warnings. The root typecheck covers shared API consumers.
- No schema, permission-bit layout, dependency, or persistent environment changes.
  `pnpm build` was attempted before publishing and failed while collecting page
  data: Guild lacks `JUDGING_ACCESS_SECRET` and `NEXT_PUBLIC_BLADE_URL`; the 2026
  app lacks `KHIX_HACKER_PORTAL_CLIENT_ID` and `KHIX_HACKER_PORTAL_ORIGIN`.
  `pnpm --filter=@forge/blade build` also failed collecting `/judge/end` due to
  missing `JUDGING_ACCESS_SECRET` and `NEXT_PUBLIC_BLADE_URL`.
  No environment values were changed to bypass this. Deployment is not performed.
- Screenshot files are excluded from the repository at the owner's request.

## Original context

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
Cutover is confirmed to land before Knight Hacks IX, so the two-column period is
short and the profile column can be dropped in the same window rather than
lingering behind a feature flag.

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

**Write point: application, once cutover lands.** Owner confirms cutover happens
before Knight Hacks IX, which removes the constraint this was originally planned
around. When the application form is ours, the attendee row is created from an
answer given _for that hackathon_ — so the write is a copy at application time,
and no derivation rule is needed at all.

An earlier draft put the write at check-in with
`declared AND no prior checked-in attendance`. That was a workaround for the form
living in legacy, where nothing in this workspace could hook the application. It
is not needed post-cutover, and check-in is the wrong anchor anyway: attendance
is already recorded by `status = checkedin`, so the attendee row only needs to
carry what they claimed.

Waiting costs nothing. The profile value is correct for the current hackathon at
the moment someone applies, so capturing it then loses only what is already lost.
Adding the column now would ship something nothing writes and nothing reads, plus
a backfill to redo.

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

## Dev database: Discord guild config was polluted by a test

Found while fixing the club-analytics e2e spec. `knight_hacks_discord_config`
held `guild.development_id = 990000000000000401` — a constant from
`packages/api/src/tests/integration/platform-config.test.ts` (TC-009), not a real
guild. All 52 rows in `discord_archive_channel` sit under `1151877367434850364`,
so everything reading `getKnightHacksGuildId()` in development was querying an
empty guild and rendering zeros: Discord analytics, the member dialog's activity
heatmap, and the archive views.

Repaired in place on 2026-08-04: `guild.development_id` set to
`1151877367434850364`, the value the archive actually uses and the value of the
`DISCORD.KNIGHTHACKS_GUILD` constant. Previous value recorded above if a revert
is ever wanted.

**Not repaired, because the correct value is not knowable from here:**
`log_channel.production_id` is `990000000000000502`, which is the `winner`
constant from TC-NEG-002 in the same file. A _production_ id carrying a test
value is worth an officer's eyes before anyone deploys.

That suite provisions a disposable database today, so it cannot be the ongoing
cause — the pollution predates that safety. Worth confirming no other environment
took the same damage.
