# Compact Event Reminders Status

Current phase: implementation and validation complete; PR open; not deployed

- Branch: `cron/compact-event-reminders`.
- [Issue #542](https://github.com/KnightHacks/forge/issues/542).
- [PR #543](https://github.com/KnightHacks/forge/pull/543).

## Decisions

The full weekly announcement is the problem, including events on different days.
Sunday weekdays share one Components V2 card; Today, Tomorrow, and Next Week
share one daily card. Small schedules use the same layout. Split only at Discord
limits. The issue reminder supplied the visual reference.

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

Hackathon tags use the same emoji/override controls and compact rows, keep
Discord links and hacker-role mentions, and retain the 15-minute delivery ledger.
There is no hacker portal change. Hack events without a published Discord event
retain their description because there is no link to open it.

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

- Cron: 46 tests across eight files, including weekly/daily grouping, 60-event
  limits, routing, preview isolation, failure continuation, and hack delivery.
- API event/hack/audit/role suites: 233 tests across 30 files against disposable local
  PostgreSQL where applicable.
- Validators: 311 tests across 24 files.
- DB: 156 tests across 30 files, including all 51 migrations on fresh PostgreSQL
  and migration 0050 backfill/default/snapshot/FK regressions.
- Blade member/event/hack/tag unit suites: 172 tests across 36 files.
- Real browser scenarios: member deep-link/navigation/privacy/mobile details
  and Club/hack tag create/reload/clear, plus unrelated edits after renaming a tag
  and reusing its old name. Mobile invalid-input recovery preserves fields.
  Desktop and 320px screenshots inspected.
- Added 30 API channel tests covering permissions and endpoint authorization.
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

## Evidence and limits

The original real Discord comparison uses the same eight synthetic events across
Monday–Thursday: main sent 14 messages; the combined week sends one. Its daily
comparison contains six events in Today/Tomorrow/Next Week. The before/after
captures have the same scale and width:
[before](evidence/discord-week-before.png),
[more before](evidence/discord-week-before-more.png),
[combined week](evidence/discord-week-after.png),
[combined daily](evidence/discord-daily.png).

Those Discord captures predate the final copy, emoji, Blade links, and dues
marker. Current weekly/daily dev messages were updated and a hack preview sent;
all three API responses confirmed zero user, role, or everyone notifications.
[Current delivery evidence](evidence/discord-config-delivery.json) records links
and verification without credentials. IDs are synthetic, so preview Blade links
do not resolve to actual production events. No current native Discord capture,
native mobile check, or Channels & Roles shortcut click was available.

Blade screenshots capture the implemented UI: member details on desktop/320px,
a long-description 320px modal, and Club/hack tag settings on desktop/320px. They
use synthetic fixtures in a dedicated migrated local database.

Migration rollout: apply additive migration 0050 before the new app/cron readers.
Unmatched historical tag names keep null linkage until an event is explicitly
edited. Rollback app code first and retain new configuration columns. No
production migration or deployment was performed. Discord permission changes
after a setting is saved can still cause delivery failure; log it without
rerouting the event into the generic board.
