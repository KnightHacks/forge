# Compact Event Reminders Status

Current phase: implementation and validation complete; PR open; not deployed

- Branch: `cron/compact-event-reminders`.
- [Issue #542](https://github.com/KnightHacks/forge/issues/542).
- [PR #543](https://github.com/KnightHacks/forge/pull/543).

## Decisions

The full weekly announcement is the problem, including events on different days.
Sunday weekdays share one Components V2 card; Today, Tomorrow, and Next Week
share one daily card when multiple dates remain for a destination. A non-Sunday
destination with just one eligible date keeps one full card per event, regardless
of count. Sunday stays compact even with one event. The issue reminder supplied
the digest's visual reference.

The user approved concise copy, the Blade QR/signup footer, and an outside role
opt-in/Channels & Roles prompt. Obsolete RSVP instructions are removed. Club
links now open `/member/events?selected=<UUID>` with the complete description.
The authenticated modal preserves URL navigation, calendar/Discord actions, dues
requirements, and keyboard focus. Unknown or inaccessible IDs show no details.

Tag settings own emoji and optional announcement-channel overrides. Club tags
also own Skip Next Week. Only OPS and Project Launch receive the initial skip
default; the setting applies to the entire tag. Override channels receive both
weekly and daily announcements. Without an override, the normal destination is
used. The 08:00 preview stays in its preview webhook; 11:00 posts use overrides.

Hackathon tags use the same emoji/override controls, keep full cards with
descriptions, Discord links and hacker-role mentions, and retain the 15-minute
delivery ledger. There is no hacker portal change.

## Implementation

- [x] Combined cards, bounded continuations, mention controls, and per-card error logging.
- [x] Stable tag IDs, scoped migration/backfill, configuration, and audit contracts.
- [x] Club/hack tag administration with optional destination, fallback explanation,
      channel loading/error/retry, and mobile alignment refinements.
- [x] UUID member event modal, full descriptions, and effective dues display.
- [x] Channel routing and emoji/dues formatting for applicable announcements.
- [x] Local PostgreSQL and real browser validation with screenshots.
- [x] Forge standard review across access/API/validation, migration/delivery,
      React/boundaries, and test quality.
- [x] Complete final checks and prepare the expanded PR description/evidence.

## Validation and review

The initial Forge gate caught test-fixture lint errors, then a missing member DTO
field in an existing dashboard test. Both were corrected. Subsequent
`pnpm verify:precommit` passed React analysis, formatting, lint, and repository-wide
typechecking. The final rerun after review corrections also passed.

Completed validation:

- Cron: 53 tests across eight files, including weekly/daily grouping, full cards
  at 1/2/8/60 same-date events, per-destination layout selection, bounded compact
  continuations, routing, preview isolation, failure continuation, and hack delivery.
- Full API suite: 900 tests across 115 files against disposable local PostgreSQL
  where applicable. This includes event/hack/audit/role consumers.
- Validators: 311 tests across 24 files.
- DB: 156 tests across 30 files, including all 51 migrations on fresh PostgreSQL
  and migration 0050 backfill/default/snapshot/FK regressions.
- Full Blade suite: 825 tests across 146 files with `--maxWorkers=4`.
- Real browser scenarios: member deep-link/navigation/privacy/mobile details
  and Club/hack tag create/reload/clear, plus unrelated edits after renaming a tag
  and reusing its old name. Mobile invalid-input recovery preserves fields.
  Desktop and 320px screenshots inspected.
- Added 30 API channel tests covering permissions and endpoint authorization.
- CI exposed two missing entries for the new channel-choice endpoints in the API
  surface snapshot. Reproduced the failure and added those entries; API surface,
  channel authorization/permissions, and audit coverage passed 41 tests in four files.
- `pnpm --filter=@forge/blade build` initially failed during page-data collection
  because local `JUDGING_ACCESS_SECRET` and `NEXT_PUBLIC_BLADE_URL` were missing.
  It passed with temporary command-local build values for those settings; no
  environment file changed. Earlier root build was blocked in unchanged
  `apps/2026` by local hacker-portal configuration.

Browser checks caught missing audit keys and two dropped tag-setting read
projections. Regression checks also confirmed the 08:00 preview could otherwise
post directly to override destinations. The standard review found two further
issues: missing bot posting-permission validation, and name-based form selection
that could replace a renamed tag's identity. Both are corrected with
permission precedence and rename/replacement-name regression coverage.

The review also suggested moving save errors beside Save for small screens. The
proposed invisible-error scenario did not reproduce in the browser test; the
placement was still clarified and error recovery remains covered. The reviewer
withdrew that scenario as a confirmed defect and verified both P2 corrections;
no review findings remain open.

The final single-date correction received a standard review of cron delivery and
test quality after a green static gate. It found that channel overrides also need
Embed Links when sending full cards. Added that permission requirement and three
regressions for missing, role-denied, and member-denied embed permission; all
three failed before the fix and the 33 targeted tests passed after it.
An independent closure review verified the permission correction and unchanged
plain channel callers. The final `pnpm verify:precommit` passed all checks.

The broader local test run exposed two setup/resource limits. API's existing
production-mode Discord config test requires `NEXT_PUBLIC_BLADE_URL`; the full
900-test suite passes with a command-local `http://localhost:3100` value. Blade's
existing dues-webhook test repeatedly exceeded five seconds at default worker
concurrency, also when workspaces were serialized. It passed in isolation, and
all 825 Blade tests passed with four workers. No environment file, test timeout,
payment code, or runner configuration changed. The default `pnpm test` run is
therefore not reported as passing.

## Evidence and limits

The real Discord web comparison uses the same eight synthetic events across
Monday–Thursday: main sent 14 messages; the combined week sends one. Its daily
comparison contains six events in Today/Tomorrow/Next Week. The refreshed
before/after captures have the same browser scale, width, and crop height:
[before](evidence/discord-week-before.png),
[combined week](evidence/discord-week-after.png),
[combined daily](evidence/discord-daily.png),
[single-date full card](evidence/discord-single-day.png),
[hack full card](evidence/discord-hack.png).

The current captures show configured emojis, Blade links, dues, the revised
footer, and the outside opt-in prompt. The single-date fixture has three events,
each rendered as a full card. Hack previews retain their Discord links. New and
updated messages were read back with zero user, role, or everyone notifications.
[Current delivery evidence](evidence/discord-config-delivery.json) records links
and verification without credentials. IDs are synthetic, so preview Blade links
do not resolve to actual production events. The dev-only Reminders (Test) role
replaces production role IDs in the preview payloads. No production role changed.
The Channels & Roles shortcut renders outside the card, but a click in this dev
server did not open a settings view; navigation remains unverified. Native Discord
mobile rendering remains unverified.

Blade screenshots capture the implemented UI: member details on desktop/320px,
a long-description 320px modal, and Club/hack tag settings on desktop/320px. They
use synthetic fixtures in a dedicated migrated local database.

Migration rollout: apply additive migration 0050 before the new app/cron readers.
Unmatched historical tag names keep null linkage until an event is explicitly
edited. Rollback app code first and retain new configuration columns. No
production migration or deployment was performed. Discord permission changes
after a setting is saved can still cause delivery failure; log it without
rerouting the event into the generic board.
