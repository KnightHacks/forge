# Forms and Event Feedback SRD

Status: Complete — approved for implementation

> This file owns technical implementation constraints.

## Technical purpose

Extend the retained Forms schema and current server-side response manager into
a secure, version-tolerant forms platform with a generic admin builder,
identified member response history, section-scoped administration, authorized
analytics/export, protected uploads, and a metadata-registered durable callback
system. Add event feedback as an event-owned specialization of that platform
with explicit relational linkage, attendance eligibility, a seven-day window,
and transactional once-only points.

The implementation must preserve the existing code-owned member-signup flow,
migrate legacy forms/responses into an authorized archive, remove Legacy
Blade's name-derived event linkage and browser-fired callbacks, and avoid
reviving the unused fixed-column `EventFeedback` table.

## Relevant principles

This feature follows
[`docs/agentic-development/forge-engineering-principles.md`](../../../docs/agentic-development/forge-engineering-principles.md),
especially:

- apps remain thin clients and `@forge/api` owns platform behavior;
- `@forge/db` owns schema/client only and `@forge/validators` owns shared input
  contracts;
- permissions and eligibility are server authoritative;
- common organizational changes should be admin-configurable rather than
  requiring annual developer edits;
- external side effects require durable state, idempotency, observable
  failures, and retry rather than browser fire-and-forget behavior;
- historical records preserve the facts and labels visible when they were
  created;
- migrations and mixed-version behavior must be deliberate and reversible.

## Access policy

| Capability                                                    | Required access                                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Open a respondent link                                        | Authenticated session, published/non-archived form, active availability, and form respondent eligibility              |
| Review own generic responses                                  | Authenticated response owner                                                                                          |
| Edit own response                                             | Authenticated owner, `single_editable` mode, active form window, and current respondent eligibility                   |
| Inspect a form definition/share controls                      | `READ_FORMS` and section-view access                                                                                  |
| Create/edit/publish/close/archive/move a form                 | `EDIT_FORMS` and section-edit access                                                                                  |
| Inspect identified responses/export/download response files   | `READ_FORM_RESPONSES` and section-view access                                                                         |
| Delete a response                                             | `READ_FORM_RESPONSES`, `EDIT_FORMS`, and section-edit access                                                          |
| Create/reconfigure/delete sections or provision section roles | `IS_OFFICER`                                                                                                          |
| Discover a callback                                           | Any form editor may see catalog identity; configuration controls are enabled only when its metadata permission passes |
| Configure/retry a callback                                    | Form-edit and section-edit access plus callback metadata permission                                                   |
| Configure Discord-role callback                               | Above plus `ASSIGN_ROLES`; target role must pass the code-owned allowlist even for officers                           |
| View event-feedback aggregate                                 | `READ_CLUB_EVENT` or officer                                                                                          |
| View identities/raw feedback/CSV/local exclusions             | `READ_FORM_RESPONSES` plus event-read access, or officer                                                              |
| Add event-specific feedback questions                         | `EDIT_CLUB_EVENT` or officer; only before first feedback response                                                     |
| Manage global feedback template                               | `IS_OFFICER`                                                                                                          |

Additional rules:

- `IS_OFFICER` bypasses every global form permission, section gate, callback
  metadata permission, and event read/edit gate. It does not bypass the
  code-owned safe-target allowlist inside the Discord-role callback.
- Section editors imply section viewing. Global permissions do not imply access
  to every section for non-officers.
- Respondent roles are independent of section roles. `READ_FORMS` is an admin
  capability and is never required merely to submit through a link.
- Every procedure repeats its access checks; client hiding and disabled catalog
  rows are UX only.
- Generic respondent and member-history procedures never return callback
  configuration, execution status, section policy, admin identity fields, or
  unrelated responses.
- Hackathon event IDs behave as not found to event-feedback procedures.

## Architecture / data flow

### Package ownership

- `apps/blade` owns `/admin/forms`, `/member/forms`, the form respondent route,
  builder/response/share UI, member-dashboard Previous forms, member event
  feedback dialogs, and admin event-feedback presentation.
- `@forge/api` owns form state, access, runtime answer validation, availability,
  response concurrency, analytics, CSV, attachment authorization, callback
  registry/execution, feedback eligibility, reward transactions, migration
  adapters, and event integration.
- `@forge/validators` owns discriminated form-definition schemas, question and
  option schemas, response modes, list/filter inputs, callback mapping inputs,
  destructive confirmations, attachment constraints, and feedback DTO inputs.
- `@forge/db` owns the evolved tables, enums, relations, indexes, migrations,
  and client only.
- `apps/cron` (or the existing durable worker surface selected during
  implementation) drains durable external callback executions through a
  server-only `@forge/api` dispatcher. It does not duplicate callback logic.
- Existing MinIO, Discord, QR, role, dues, event, member, and CSV utilities are
  reused through server-owned adapters.
- No REST business endpoint or arbitrary webhook endpoint is added.

### Form definition and live editing

- Reuse the existing `FormsSchemas` table and migrate it rather than creating a
  competing forms root. Preserve existing UUIDs and slugs.
- Add explicit form kind (`general`, `event_feedback`, `system`), state
  (`draft`, `published`, `archived`), `opensAt`, `closesAt`, `manuallyClosed`,
  response mode (`single_locked`, `single_editable`, `multiple_locked`),
  `publishedAt`, `archivedAt`, and an optimistic concurrency revision.
- New forms have a required `sectionId`; migration creates/uses General for
  legacy rows that have only the old section string.
- The definition JSON uses immutable UUIDs for every question, instruction,
  manual option, and catalog option value. Human labels are presentation, not
  response keys.
- Published and archived definitions edit in place. Each response stores the
  form revision plus the response-time question label/type and selected option
  value/label snapshots needed for history and export. There is no user-visible
  replacement-form version lifecycle.
- Live edits permitted by the spec update the form revision atomically. A
  question type change is rejected after any saved answer references the
  question or while a callback mapping references it. Retiring a mapped
  question is rejected until the mapping is removed.
- Retired questions remain in definition history/snapshots and are omitted from
  new respondent renders. Old answers remain queryable.
- Requiredness, validation, option, access, availability, and callback edits
  apply to future create/update attempts. Existing response display uses its
  snapshots.
- Stable slugs are unique. Slug changes are allowed only while state is Draft
  and `publishedAt` is null; title edits never rewrite the slug.
- State transitions are exactly Draft to Published, Published to Archived,
  Archived to Published. No transition returns to Draft.

### Sections

- Retain `FormSections` and replace/extend the ambiguous legacy section-role
  mapping with explicit section-view-role and section-edit-role joins.
- A form references its section dynamically; it does not copy section roles.
  Archived forms keep that reference.
- Migration treats each legacy section-role assignment as both view and edit
  for users who also possess the matching global permission, preserving the
  legacy effective scope until officers reprovision it.
- Only officers create, rename, reorder, or remove sections and edit their role
  groups. Removing a nonempty section requires moving its forms in the same
  officer operation; forms are never silently orphaned.
- Moving a form requires section-edit access to both source and destination,
  unless the actor is an officer.

### Preset catalog registry

- Replace the duplicated `AVAILABLE_DROPDOWN_CONSTANTS`/switch contract with
  one typed, code-owned catalog registry. Each catalog has stable ID, label,
  searchable/load strategy, and stable `{ value, label, active }` options.
- Retain all twelve existing catalogs. `EVENT_FEEDBACK_HEARD` gains Google
  Calendar and uses stable values for every approved source.
- A preset-backed question stores the catalog ID. New renders use the current
  active option set, so additions appear automatically and removals disappear
  for new answers.
- Responses snapshot selected value and label. A removed value remains valid
  only when an owner edits an existing response without changing that question;
  once changed, current active values apply.
- Manual and preset configurations coexist in the definition so switching the
  active source is reversible.
- Lists over the UI threshold use searchable controls. Schools and Companies
  are loaded through bounded indexed search rather than bundling their complete
  arrays in the generic respondent client.
- Other answers have a separate typed shape from catalog/manual options. They
  never use an internal string sentinel, preserve raw text, and validate a
  nonempty bounded value.

### Runtime response validation

- Replace the current DB-schema-to-code `new Function` path. Runtime form
  validation is built directly from the discriminated trusted definition using
  normal Zod composition; persisted strings are never evaluated as JavaScript.
- Validate unknown question IDs, duplicate answer keys, requiredness, type,
  numeric/scale bounds, string lengths, formats, option activity, Other,
  attachment ownership, and additional fields on the server.
- Client validation mirrors server copy for responsiveness but is never the
  authority.
- The response payload is keyed by immutable question UUID. Persist normalized
  values plus response-time labels/option snapshots.
- Single-response creation takes a `(formId,userId)` advisory lock and uses a
  durable unique submission claim so concurrent requests cannot create two
  responses. Multiple mode does not create that claim.
- Single-editable updates verify ownership, current state/window/access, and the
  current definition. Locked responses never update.
- Response deletion removes the response and finalized response attachments,
  retains feedback reward records, cancels pending callback executions, and
  retains minimal non-pending callback audit rows.

### Attachments and media

- Replace legacy generic presigned URLs with upload intents tied to user,
  form, form revision, owner type, and question/instruction ID.
- Before issuing a PUT URL, verify edit/respond access, form state/window,
  question type, declared filename, MIME class, and size no greater than
  100 MB.
- Finalization verifies object metadata rather than trusting the browser and
  creates an attachment row with original name, safe object key, MIME, size,
  checksum where available, state, and owner.
- A submitted response may reference only finalized attachments created by the
  same user for that form/question. Instruction media may be finalized only by
  an authorized section editor.
- Download URLs are short-lived and issued only after response-owner or admin
  authorization. QR/link access never grants object access.
- Response deletion schedules object removal. Replaced instruction media and
  expired/abandoned upload intents are cleaned durably.
- Executable/script detection uses both allowed extension and detected/declared
  MIME policy; a renamed executable is rejected.

### Callback registry and execution

- Extend the tRPC initialization with a typed metadata contract. Only mutations
  declaring a `formCallback` metadata object enter the catalog.
- Required metadata includes stable callback ID/version, label, description,
  configuration permission enum, delivery class, shared Zod input schema,
  input-field UI metadata, and safe source kinds. The real `.input()` and
  metadata reference the same schema constant to prevent drift.
- Callback discovery walks the server router during registry construction,
  rejects duplicate IDs at startup/test time, and emits a sanitized catalog.
  Unauthorized catalog entries expose only label/slug, description, and the
  required permission; their input mapping details remain disabled.
- Callback-only procedures live in a dedicated router/module but cannot be
  called as arbitrary dynamic routes. The dispatcher resolves an ID through
  the constructed allowlist.
- `FormCallbackConfig` stores form ID, callback ID/version, enabled state,
  mappings keyed by input path, and a config revision. Mappings may source an
  immutable question ID, typed fixed value, submitter User/Member ID, response
  ID, submitted timestamp, or event ID.
- Saving a callback config validates edit/section access, metadata permission,
  target callback existence/version, source compatibility, required inputs,
  and fixed values. Published configuration changes affect only responses
  submitted afterward.
- Callback-connected forms must use a locked response mode. Adding a callback
  to an editable form or enabling editable mode with a callback returns a
  conflict.
- Response insertion snapshots each enabled callback config and creates one
  `FormCallbackExecution` per response/config in the same DB transaction. A
  unique idempotency key prevents duplicate execution creation.
- External actions use durable statuses `pending`, `running`, `succeeded`,
  `failed`, and `cancelled`, with attempt count, bounded error text, lease,
  timestamps, callback/config snapshot, mapped input snapshot, submitter, form,
  and nullable response reference.
- The dispatcher acquires a fenced lease, invokes the registered callback, and
  records terminal status. Automatic/manual retries reuse the same execution
  and idempotency key. A succeeded action cannot run again.
- Authorized admins may retry Failed executions after the same current form,
  section, and callback metadata permission checks. Pending/running work is not
  manually duplicated.
- Response deletion cancels Pending work. Running work is fenced/cancelled when
  safe but must record a terminal result if the external provider already
  accepted it. Succeeded and Failed rows retain the minimal audit after their
  response FK becomes null. Deletion scrubs answer-derived mapped payloads and
  retains only execution identity, callback/config identity, submitter/form
  references, status, attempts, timestamps, and bounded error/result metadata
  needed to identify manual compensation.
- The first catalog contains:
  - Discord role assignment, gated by `ASSIGN_ROLES`, accepting a typed fixed or
    mapped role ID, and enforcing `ALLOWED_ASSIGNABLE_DISCORD_ROLES` inside the
    callback for every actor including officers;
  - recruiting notification, with a typed payload and permission declared by
    its metadata.
- Discord role application is idempotent for the execution key/current member.
  Arbitrary webhooks and arbitrary router traversal are prohibited.
- Respondent DTOs and success UI contain no callback fields or status.
- Code-owned member signup continues using its system callback path. Event
  feedback reward remains an event-owned transaction, not a configurable
  callback.

### Event-feedback ownership and lifecycle

- Do not use the event-name/slug convention and do not revive the unused
  fixed-column `EventFeedback` table.
- Add an explicit event-feedback configuration/association keyed uniquely by
  club Event UUID with a unique form UUID, reward amount, close deadline, and
  core-template revision. The linked form has kind `event_feedback` and is
  omitted from generic form administration/member history.
- Qualifying-event evaluation checks `hackathonId IS NULL` and requires that no
  selected event Role resolves to a code-owned protected Discord role ID. The
  protected registry represents the approved Dev, Workshop, Sponsorship,
  Outreach, Design, Hackathon Team, executive, and director roles. Projects and
  Mentorship are deliberately absent. Display-name comparison is not an access
  control.
- During event creation's DB reservation transaction, create the linked
  feedback form/config for qualifying events with no start-time gate and
  `closesAt = event.end + 7 days`. External Discord/Google synchronization does
  not create the feedback form.
- Event update recomputes the deadline from the latest end time. Member and
  submission queries always use the current server value.
- Event duplication creates a fresh form/config with no responses. Event rename
  changes presentation only and never changes the feedback relationship or
  form slug.
- A qualifying event changed to protected visibility stops offering feedback;
  its existing form/responses/rewards remain event-owned historical data. If it
  becomes qualifying again, the existing linked form follows the current
  event-derived window rather than creating another form. (This is the direct
  consequence of the approved visibility rule and must be verified in tests.)
- The core feedback question IDs and semantic keys are fixed for overall, fun,
  learning, worked, improve, and discovery. Core rating bounds are
  1-5; discovery is single-choice with Other.
- Officers edit the global future-event template without mutating existing
  event forms. Event editors may add non-core questions to one event only while
  it has zero feedback responses. Core questions cannot be removed, retired,
  retyped, or remapped.

### Feedback submission and points

1. Resolve the feedback config by event/form ID and reject hackathon,
   nonqualifying, expired, or unavailable events. Event end is not an opening
   gate.
2. Resolve the authenticated Member and require an `EventAttendee` row for the
   member/event pair. Link possession is insufficient.
3. Begin a transaction and acquire a pair-scoped advisory lock for
   `(eventId,memberId)`.
4. Recheck event, window, attendance, existing reward, and existing response
   under the lock.
5. Validate the locked response and insert it.
6. Insert one durable feedback-reward row with unique `(eventId,memberId)`,
   stored amount `5`, response reference, and timestamp; increment
   `Member.points` by that stored amount.
7. Commit response, reward, and balance together. Concurrent/retried requests
   return the existing completed outcome and never increment twice.

- Feedback cannot be edited or resubmitted. Deleting its response sets the
  reward's response reference null but does not remove the reward, decrement
  points, or reopen submission.
- The reward row, not response existence, is the member's durable completed
  marker. The member receives no retroactive reward for migrated legacy
  feedback.

### Member event surfaces

- Extend `listMemberAttendance` with feedback state derived server-side:
  `not_applicable`, `available`, `due_soon`, or `completed`, plus the due
  timestamp and reward amount where safe.
- Feedback is never attached to upcoming-event discovery without attendance;
  it appears on attendance-history rows and the dashboard's recent-attendance
  cards.
- `due_soon` is `now < closesAt` and `closesAt - now < 24 hours`; exactly 24
  hours is not urgent. Completed wins over due states.
- The feedback dialog fetches the event-owned definition and current member
  state. Completed responses remain read-only even after expiry. Deleted
  responses show completed/reward state without offering resubmission.
- `/member/forms` explicitly filters `event_feedback` and returns only
  response-owner-safe generic/system history allowed by product scope.

### Feedback analytics

- Admin event-list rows return overall average/count calculated from every
  retained feedback response; session-local exclusions never alter the list.
- Aggregate-only event readers receive counts, 1-5 rating averages and
  distributions, discovery distribution, and safe aggregate data without
  identities or individual text.
- Response readers receive identified responses, non-empty
  qualitative answers, extra-question summaries, and CSV.
- Local exclusion is never stored. The rich-feedback query may accept a bounded
  set of response UUIDs to exclude for the current calculation only after
  `READ_FORM_RESPONSES`; alternatively the client may calculate from an already
  authorized response payload. Either implementation must produce the same
  deterministic metrics and cannot affect the event-list average, DB, or CSV.
- UI count is `included` and `locally excluded`; initial excluded count is zero.
- Discovery percentages use respondent count, not total checkbox selections,
  because the field is single-choice.
- No model/API call or generated narrative is introduced.

## tRPC/API behavior

Exact procedure names may follow current router conventions, but the contracts
must cover:

- admin form list/detail/create/update/publish/archive/republish/permanent-delete;
- officer section list/create/update/reorder/remove and viewer/editor role
  provisioning;
- respondent form-by-slug, create response, update owned response;
- member response history and owned-response detail;
- bounded admin response list/detail, deterministic analytics, CSV export,
  authorized attachment download, and response deletion;
- upload intent/create/finalize/delete for respondent and instruction assets;
- full sanitized callback catalog, callback config CRUD, execution list, and
  failed-execution retry;
- event feedback definition/state/submission, admin aggregate/detail/CSV, and
  global/event-specific template editing;
- member-attendance and admin-event DTO extensions.

API behavior requirements:

- Use `protectedProcedure` or `permProcedure`; no public form response API.
- Return `UNAUTHORIZED` for no session, `FORBIDDEN` for permission/section/
  respondent ineligibility, `NOT_FOUND` for inaccessible resources where
  revealing existence would leak cross-section or hackathon data, `CONFLICT`
  for state/response-mode/concurrency conflicts, and `BAD_REQUEST` for invalid
  definitions/answers/mappings.
- Reads are bounded. Response screens use one scroll-bounded table without a
  client pager; form cards never issue one query per form or load all responses
  merely to calculate counts.
- CSV is server-generated, stable ordered, UTF-8, RFC-compatible, and neutralizes
  cells beginning with spreadsheet formula characters.
- Destructive operations require explicit IDs/current revision and return
  deterministic conflict detail rather than partial silent success.
- Procedure metadata/descriptions explain access and side effects for future
  generated API/LLM context.

## Validation

- Shared validators use discriminated unions keyed by question type and reject
  unknown keys.
- IDs and slugs are normalized and bounded; slugs remain unique and immutable
  after first publish.
- Form state transitions, dates, response modes, question-edit compatibility,
  preset IDs, option uniqueness, and callback compatibility validate on the
  server.
- Generic-form opening may be null/immediate. Generic-form closing may be
  null/manual but, when both are set, must be after opening. Event feedback has
  no opening value and always has its derived close deadline.
- Rating bounds, min/max ordering, required Other text, email/date/time/phone/
  link formats, file metadata, and manual options receive type-specific checks.
- Callback custom values are parsed by the callback's real Zod input field,
  not stored as untyped strings.
- Every write uses optimistic form revision or an equivalent lost-update guard.

## Data / migration / compatibility

- Evolve existing tables in additive migrations first; do not drop the unused
  `EventFeedback` table in this slice without separate migration evidence.
- Backfill immutable question/instruction/option IDs deterministically for
  legacy definitions and transform legacy label-keyed response JSON into the
  new stable answer/snapshot shape. Preserve original raw payload during the
  migration window for audit/rollback.
- Every legacy general form becomes Archived with a migration-time closing
  boundary and retains its slug, responses, files, and section.
- Preserve the code-owned member-signup UUID/slug/config as `system`; do not
  archive or expose it as a generic open form.
- Detect legacy feedback forms using the known Feedback section/name convention
  and mark them `event_feedback` so they remain absent from generic member
  history. Link only unambiguous event/form matches; retain ambiguous historical
  data without granting points or creating a guessed event association.
- Backfill fresh event-feedback configs/forms for qualifying future events,
  in-progress events, and past events whose `event.end + 7 days` remains in the
  future. Do not generate new opportunities for older events.
- Existing legacy callback connections migrate only when their callback ID is
  registered and every label mapping resolves uniquely to a stable question
  ID/type. Otherwise preserve them as disabled Needs configuration records in
  the archived form; never replay historical callbacks.
- Migrate legacy section access to viewer/editor joins as described above.
- New FK behavior must prevent deleting forms with responses, cascade safe join
  rows/config, set callback-audit response references null, and preserve reward
  ledgers after feedback response deletion.
- Add indexes for slug/state/section, form response list and owner history,
  feedback event/member uniqueness, callback pending leases/status, and
  attachment cleanup.
- Mixed-version rollout must ensure Legacy Blade cannot create new incompatible
  forms/responses once the migration switches answer shape. Cut over form writes
  behind one deployment boundary or compatibility adapter; rollback retains raw
  legacy payload until verification completes.

## Discord integration

- Discord role assignment runs only through its tagged internal callback and
  the existing server-only Discord client.
- The callback operates on the submitting member's linked Discord identity,
  checks the code-owned assignable-role allowlist, and is idempotent when the
  role is already present.
- Callback failure records bounded provider-safe error information. It does not
  expose tokens, raw auth headers, or Discord credentials to admins.
- Recruiting notification uses the registered callback and durable execution;
  it is never browser-fired.
- Event feedback itself does not create Discord messages or roles.

## Configurability review

Would this require a developer change next year?

- Answer: Ordinary forms, sections, questions, schedules, respondent gates,
  event-specific feedback questions, and callback mappings do not.
- Developer changes remain intentional for new preset catalogs/options,
  protected feedback-exclusion role IDs, assignable Discord-role IDs, global
  core feedback semantics, and new callback procedure implementations. These
  are security/domain boundaries rather than ordinary content changes.

## React / frontend constraints

- App Router page files remain server-first for auth/access and initial data.
  Client components own builder drag/reorder, dialogs/drawers, uploads, local
  metric exclusions, callback mapping, search comboboxes, and mutations.
- Use the established Reforge shell, responsive dialog/drawer patterns,
  searchable combobox, cards/tables, skeletons, error boundaries, badges,
  charts, toasts, and focus-visible behavior.
- The builder clearly communicates unsaved/saving/saved/conflict state and
  protects against accidental loss. It must not silently overwrite a newer
  revision.
- Question editing uses stable keys; drag/reorder never remounts answers or
  changes IDs.
- Large catalogs load/search incrementally and support keyboard and mobile use.
- File upload shows type/size constraints, progress, retry, and safe removal.
- Respondent pages/dialogs render all not-open/closed/ineligible/duplicate/
  success/review states without exposing admin or callback concepts.
- QR generation uses only the canonical form URL and never embeds auth or
  access tokens.
- Feedback due dates use Knight Hacks event display conventions; urgent styling
  includes text/icon meaning and does not rely on red alone.
- Aggregate charts remain accessible with textual labels/counts and tabular
  fallbacks.

## Testing / verification strategy

- `@forge/validators`: definition discriminators, state/date/mode transitions,
  option catalogs, callback mappings, upload types, and answer validation.
- `@forge/db`: migration, constraints, indexes, legacy transformation,
  feedback/reward uniqueness, callback execution FK behavior, and rollback
  fixtures.
- `@forge/api`: access matrix, section scope, live-edit compatibility,
  concurrent single responses, uploads, catalogs, analytics, CSV safety,
  callback catalog/config/execution/retry/idempotency, event qualification,
  deadline changes, and atomic five-point reward.
- `apps/blade`: component tests for builder/respondent/history/admin metrics,
  callback disabled metadata, QR actions, urgent due state, and accessible
  charts/dialogs.
- Blade E2E: publish/share/respond/review/export/archive/republish, section
  isolation, callback failure/retry invisibility to members, and event-feedback
  member/admin journeys.
- Use targeted workspace checks because the accepted `@forge/guild` baseline
  prevents a meaningful full-workspace typecheck.

Expected commands include:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/db test`
- `pnpm --filter=@forge/api test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/blade e2e`
- targeted lint/typecheck/format commands for changed packages

## Open questions

- None.
