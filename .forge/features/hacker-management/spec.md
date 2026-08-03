# Hacker Management Spec

Status: Draft — proposed 2026-07-31. Four open questions **resolved** 2026-08-03; see the end. Awaiting owner approval of the whole document.

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Officers need to look at everyone who applied to a hackathon and move them
through it: accept, waitlist, deny for capacity, or flag someone they do not
want accepted by accident. Today that means a page whose mail is hardcoded per
hackathon, and a "soft blacklist" that is literally one person's UUID pasted
into a query (`legacy/packages/api/src/routers/hackers/queries.ts:446`).

The configuration slice made that mail officer-editable but nothing sends it.
This slice is where a status change actually reaches an applicant — and where
the readiness signal that slice computed finally means something.

## Users / actors

- **Officers** — the only actors here. They read the roster, change statuses,
  blacklist, and un-blacklist.
- **Applicants** — never see this screen. They experience it only as the mail a
  transition sends. They are the reason the guards exist.

Not actors in this slice: applicants applying (the hack sites own that, and the
SDK carrying it is two slices out), and anyone checking in (moved to the event
slice).

## User-visible interface

**`/admin/hackathon/[id]/hackers`** — the roster for one hackathon, reached from
the configuration screen.

- A table of applicants: name, email, school, status, points, and a blacklist
  marker. Searchable by name and email, filterable by status.
- Per-row status actions. Changing a status sends that hackathon's configured
  mail for the new status.
- Multi-select with bulk accept and bulk deny.
- A blacklist toggle per row, and a visible marker on blacklisted rows.
- A result summary after a bulk action naming exactly who moved and who did not.

**Copy carries two facts the officer cannot otherwise know:** that a status
change sends mail immediately and cannot be recalled, and that a blacklist is
invisible to the applicant.

## Scope

### In scope

- Roster: list, search, filter by status, for one hackathon.
- Per-hacker status transitions, which send the configured status mail.
- Bulk accept and bulk deny, best-effort, with a per-hacker result report.
- Soft blacklist: a per-hackathon, officer-only flag that does **not** change
  status.
- The readiness gate: transitions that would send mail are refused while the
  hackathon is not fully configured.
- Points shown as a read-only column.

### Out of scope

- **Check-in.** Moved to the event page slice, with class assignment and live
  Discord role application.
- **Granting points.** The column is displayed; nothing here writes it. Awarding
  arrives with events.
- **Creating hackers.** This slice operates on rows that already exist. New
  applicants arrive from the hack sites once the SDK lands.
- **The member-facing leaderboard** (`getTopHackers`, `getPointsByClass` in
  legacy). Member surface, not officer surface.
- **Hacker profile editing.** Applicants own their own data on the hack site.

## Vocabulary

- **Status** — one of the seven application states. Six send mail; `checkedin`
  does not, and is not reachable from this screen at all.
- **Capacity reject** — the officer-facing name for transitioning to `denied`.
  The status is stored as `denied`; the mail the applicant receives is the
  capacity template. Officers see "capacity"; applicants never see "denied".
- **Blacklist** — an officer-only, per-hackathon flag meaning "do not accept
  this person by accident". It is **not a status**, it is never shown to the
  applicant, and setting it changes nothing about where they sit in the funnel.
  A blacklisted applicant stays `pending` until an officer capacity-rejects them
  like anyone else.
- **Configured / ready** — a hackathon with all six sending statuses mapped to a
  template and subject. Computed by the configuration slice; enforced here.

## Acceptance criteria

**Roster**

- AC-001 An officer opening the roster sees every applicant to that hackathon
  with their status, and no applicants from any other hackathon.
- AC-002 The roster can be searched by name and email and filtered by status.
- AC-003 Points are visible per applicant and cannot be edited here.

**Transitions and mail**

- AC-004 Changing an applicant's status sends that hackathon's configured mail
  for the new status, to that applicant, once.
- AC-005 A transition to a status whose mail is not configured is refused, and
  the officer is told which status is missing.
- AC-006 A transition that would send mail is refused while the hackathon is not
  fully configured. Blacklisting and viewing stay available.
- AC-007 `checkedin` is not reachable from this screen.
- AC-008 The mail an applicant receives is the one an officer previewed in the
  configuration screen — same template, same subject, same rendered fields.
- AC-009 A failed send does not leave the applicant in the new status with no
  mail sent, nor mail sent with the status unchanged.

**Blacklist**

- AC-010 An officer can blacklist and un-blacklist an applicant, per hackathon.
- AC-011 Blacklisting does not change the applicant's status.
- AC-012 Blacklisting sends no mail and is invisible to the applicant.
- AC-013 On a blacklisted row every action is disabled except capacity reject
  and un-blacklist.
- AC-014 A blacklisted applicant cannot be accepted, including via bulk accept.
- AC-015 Blacklisting and un-blacklisting are attributable — who did it, and
  when.

**Bulk**

- AC-016 An officer can select many applicants and accept or deny them together.
- AC-017 A bulk action processes each applicant independently; one failure does
  not stop the rest.
- AC-018 After a bulk action the officer sees exactly who moved and who did not,
  and why for each one that did not.
- AC-019 A bulk action sends at most one mail per applicant.

**Honesty**

- AC-020 The screen states that a status change sends mail immediately and
  cannot be recalled, before the officer commits to it.

## Resolved questions

1. **Bulk actions get a preview-and-confirm step**, modelled on the email
   portal's existing send flow — the officer sees who is about to be mailed and
   commits deliberately, rather than a button that fires two hundred emails on
   one click. Reusing that flow rather than inventing a second one also means
   the blocker list, the suppressed-recipient count, and the confirm gate all
   behave the way officers already know.

2. **`withdrawn` is officer-settable, but not a quick action.** An officer
   withdrawing someone is rare, so it does not earn a primary button — it lives
   behind the row's overflow. This also answers the worry that its configured
   template would be unreachable: it is reachable, just deliberately not
   prominent.

3. **No transition graph.** Any status to any status stays legal. Officers fix
   mistakes, and a restrictive state machine is its own trap.

4. **Per-status counts are in**, and they are a deliberate design target rather
   than a port: legacy's version is the thing to beat, not the thing to match.

## Acceptance criteria added by those answers

- AC-021 A bulk action shows, before anything is sent, exactly which applicants
  will be mailed and which will be skipped, and requires an explicit confirm.
- AC-022 Withdrawing an applicant is available but is not a primary row action.
- AC-023 The roster shows a live count per status, and it agrees with the table
  under every filter.
