# Project claims and hacker judging status

Current phase: Implementation and validation.

## Decision log

- 2026-09-11: Captured the user's brief with unresolved choices explicitly marked.
- 2026-09-11: Created `blade/project-claims` from origin/main at `3cd0aecb`, including scheduler PR #545 and challenge-group PR #550. Preserved existing untracked files.
- 2026-09-11: Claims use imported Devpost emails, not a typed-email ownership form. The initial confirmation-dialog request was superseded by direct member selection in round one.
- 2026-09-11: KHIX Judging starts locked. Its itinerary includes relevant collapsed challenges and scheduler status semantics. Authenticated feedback is immediate after judging; guest feedback is excluded.
- 2026-09-11: Recovery includes copied claim links and emergency search without claims or feedback. The user explicitly rejected a full schedule view.
- 2026-09-11: Read artifact skills, framework, project conventions, frontend workflow, Blade design system, preceding judging specs, import parsing, and KHIX navigation. QMD search found no relevant saved scheduler note.

- 2026-09-11, round one: A project link opens a team-member selector. Selecting an available member claims immediately, without a second step or recipient-bound restriction. Add email invitations for teammates omitted from Devpost.
- 2026-09-11, round one: One project per hacker per hackathon and one claim per member.
- 2026-09-11, round one: Claims precede scheduling and room assignment. Separate Open schedule action publishes timings, independent of emergency mode.
- 2026-09-11, round one: Show only written feedback and individual rubric scores from completed authenticated evaluations, without judge names. Exclude guest scores and feedback.
- 2026-09-11, round one: Hacker heartbeat every two minutes, plus a final verification request after appointment end before red and the missed dialog.
- 2026-09-11, round one: Emergency mode is controlled by officers in Command Center, hides scores and feedback, and restores normal claimed access when disabled. Search viewer eligibility remains open.

- 2026-09-11, round two: Any claimed teammate may invite an existing hacker account by email. Team limit is four.
- 2026-09-11, round two: Emergency search is for hackers checked in to KHIX, on the KHIX portal.
- 2026-09-11, round two: Missed dialog says to expect an organizer message. Officers contact teams and reschedule when time permits.
- 2026-09-11, round two: Bulk send plus individual resend/copy accepted. Links are single-use; no revoke/rotate controls.
- 2026-09-11, round two: First claim blocks replacement imports and switches to add-only mode.
- 2026-09-11, round two: Later judge edits appear. Unscheduled challenges go at the bottom with rooms and guidance to visit during available time.
- 2026-09-11, round two: Add linked hacker Discord contacts to organizer project contacts for quick manual messaging. Existing hacker admin code distinguishes stable User.discordUserId from the typed Hacker.discordUser handle.

- 2026-09-11, round three: The system must be hackathon-agnostic and configurable. KHIX is the initial UI consumer. Shared API and Hacker SDK behavior must support other configured events.
- 2026-09-11, round three: Separate single-use link per emailed recipient; select any available project member; consume on successful selection; resend/copy uses the same unused link.
- 2026-09-11, round three: Final answer requires Open schedule before either normal or emergency timings are visible. This supersedes the briefly considered bypass.
- 2026-09-11, round three: Check-in to the relevant event is required for all hacker operations, including claims and invitation acceptance before scheduling. Organizer controls retain officer permissions.

- 2026-09-11, round four: Four members is a fixed platform limit, not event-configurable. Block Devpost teams larger than four without truncation.
- 2026-09-11, round four: Invitations consume capacity immediately. Imported, invited, and claimed identities share the same four slots. Claiming links an existing slot to the real hacker profile, never adds a second person.
- 2026-09-11, round four: Missed dialog says to expect an organizer message and respond to avoid disqualification across all challenges. No offer or promise of rescheduling. This supersedes earlier rescheduling copy; officers retain discretion.
- 2026-09-11, round four: Updated all four draft artifacts and added shared-capacity/oversized-import acceptance cases. Implementation has not started.

## Implementation progress

- [x] Human authorized implementation after four clarification rounds.
- [x] Event-scoped claims, recipient links, invite capacity, first-claim import lock, and additive migration.
- [x] Hacker SDK procedures/hooks and strict anonymous DTOs.
- [x] Blade delivery, copy/resend recovery, publication, emergency controls, and Discord contacts.
- [x] KHIX direct claiming, invitations, own itinerary/feedback, missed warning, and emergency search.
- [x] Branded claim email delivered to dylan@dvidal.dev and visually inspected in Zoho.
- [x] Initial standard Forge review; three reviewers covered API/access, schema/validation, and UI/boundaries. Findings fixed: cross-member link recovery, malformed URL validation, emergency restoration, undefined CSS token.
- [x] Final static gate and review verification.
- [ ] MR with hosted screenshot evidence.
- [ ] CodeRabbit findings addressed.

## Validation

- Full API suite: 122 files / 947 tests passed before review corrections. Expanded claim integration suite: 6 tests passed, including anonymous feedback/emergency restoration and cross-member link recovery.
- Email: 86 tests passed. Validators: 318 tests passed. Hacker SDK: 31 tests passed. KHIX: 14 tests passed.
- Initial `pnpm verify:precommit`: passed, including React analysis, formatting, lint, and monorepo typecheck. Final rerun passed after review fixes.
- Disposable PostgreSQL migration and claim/invite concurrency tests passed. Local migration applied successfully.
- Browser: direct claim, invite capacity, separate publication, completed rubric/feedback, emergency suppression, and 390px overflow passed. No-reload emergency restoration, missed dialogs, and check-in gate also passed. Nineteen hosted captures include desktop/mobile and email.
- No production migrations, deployment, or merge performed. Visual fixtures use a disposable loopback database.

## Links

- Issue: https://github.com/KnightHacks/forge/issues/559
- Visual evidence: https://github.com/KnightHacks/forge/issues/559#issuecomment-5637758122
- MR: pending.
- Prior scheduler PR #545, challenge groups PR #550.

## Scope decisions

- Expire unused links at event end; erase the recoverable token only after successful claim. A replay returns a conflict and preserves the original claim.
- Acknowledge missed dialogs for the current mounted page/appointment attempt. Persistent warning remains; refreshing may show the dialog again.
- Mistaken-claim correction and invitation cancellation are deferred. No revoke/rotate/reset controls or automatic disqualification.
- Over-four Devpost projects are rejected individually and reported through the existing import result. Valid projects in the same file retain the existing import behavior.

## Implementation authorization and defaults

- User authorized implementation, migrations needed for claims, email delivery, an issue/MR, CodeRabbit follow-up, and screenshot evidence across Blade/KHIX. Test email to dylan@dvidal.dev is explicitly authorized; inspect in Zoho using computer use. No merge or deployment requested.
- Preserve roster provenance with a separate claim association. Unique member and event/user constraints enforce one claim per slot and one project per hacker per event.
- Reuse the hackathon row lock for import, invitation capacity, and claim transactions. Fixed maximum four members, including pending invitations.
- Recover unused random 256-bit credentials only through officer controls. Remove the credential after consumption. Links expire at event end; failed claims do not consume them. Email delivery happens after commit and retries use the existing unused link.
- Missed dialogs may be acknowledged for an appointment attempt on the current page; a persistent warning stays visible. No disqualification automation.
- Officer recovery copies/resends unused recipient links, including when a different teammate claimed the recipient’s original slot. No reset of used credentials.
- Exit: required checks, Forge review capped at five rounds, issue/MR with hosted desktop/mobile screenshots, CodeRabbit findings addressed, and real email inspection.
