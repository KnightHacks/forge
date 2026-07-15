# Forms and Event Feedback Test Cases

Status: Complete — approved for implementation

> This file owns observable proof. Do not generate implementation tests until
> the human approves these cases.

## Scope

These cases prove generic form administration, section access, live published
editing, direct-link respondents, member history, all question families,
catalogs, uploads, responses/CSV, registered callbacks, legacy migration, and
the complete club event-feedback/reward/admin experience.

They intentionally exclude anonymous/public forms, a member open-form
directory, hackathon feedback, AI synthesis, XLSX, arbitrary webhooks, and
automatic callback/point compensation after deletion.

## Test placement plan

- `packages/validators`: unit tests for definitions, answers, mappings, dates,
  transitions, catalogs, and upload policy.
- `packages/db`: migration/constraint/index tests using legacy and new fixtures.
- `packages/api`: unit/integration tests for access, concurrency, persistence,
  callback delivery, feedback/reward, analytics, and CSV.
- `apps/blade`: component tests for presentation/accessibility and Playwright
  E2E for cross-surface journeys.

Expected commands:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/db test`
- `pnpm --filter=@forge/api test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/blade e2e`
- targeted lint, format, and typecheck for changed packages

The known accepted `@forge/guild` baseline is not treated as a regression from
this feature.

## Test cases

### TC-001: Officer creates and publishes a complete form

Setup:

- An officer and a section exist.

Action:

- The officer creates a draft, adds every supported question family and
  instruction media, selects single-locked mode, configures availability, and
  publishes it.

Expected observations:

- The form receives a stable link, enters Published, appears in its section,
  and renders every configured item in order through the respondent link.

### TC-002: Section access layers global permissions and roles

Setup:

- Outreach and Design sections have different viewer/editor roles; users hold
  different combinations of `READ_FORMS` and `EDIT_FORMS`.

Action:

- Each user opens form administration and attempts read/edit operations.

Expected observations:

- A user sees/edits only when both the global capability and matching section
  role pass; section edit implies view but never supplies a missing global
  capability.

### TC-003: Officer bypasses every form and section gate

Setup:

- An officer has no explicit section assignment.

Action:

- The officer lists, opens, edits, moves, publishes, archives, and inspects
  responses across sections.

Expected observations:

- Every action succeeds without adding section assignments.

### TC-004: Only officers provision sections

Setup:

- A section editor and an officer exist.

Action:

- Both attempt to create a section and assign viewer/editor roles.

Expected observations:

- The section editor is denied; the officer succeeds and the new gates apply
  immediately to forms referencing that section.

### TC-005: Moving a form changes its dynamic section scope

Setup:

- A form is in Outreach and an editor can edit both Outreach and Design.

Action:

- The editor moves it to Design.

Expected observations:

- The form keeps its definition/responses, disappears for Outreach-only admins,
  and appears for Design-authorized admins without copied role configuration.

### TC-006: Draft, Published, and Archived transitions remain simple

Setup:

- A new draft form exists.

Action:

- An editor publishes, archives, edits availability while archived, and
  republishes it.

Expected observations:

- The transitions are Draft to Published to Archived to Published; no Return
  to Draft action appears; archived intervals reject responses.

### TC-007: Archive is permission-filtered

Setup:

- Archived forms exist in multiple sections.

Action:

- A section reader and an officer open the Archive tab.

Expected observations:

- The reader sees only authorized sections; the officer sees all archived
  forms; retained response/file counts remain intact.

### TC-008: Stable link survives title and archive changes

Setup:

- A published form has a customized slug and downloaded QR.

Action:

- An editor renames, archives, edits, and republishes it.

Expected observations:

- The slug and QR destination do not change; the link shows the appropriate
  archived/published state over time.

### TC-009: Share controls expose the approved actions

Setup:

- An authorized form reader opens a form.

Action:

- They use Copy link, Open form, QR preview, and Download QR.

Expected observations:

- Every action targets the canonical URL, downloaded QR is a PNG, no token is
  embedded, and no Print QR action is present.

### TC-010: Published copy edits do not break historical answers

Setup:

- A member answered a published question.

Action:

- An editor changes the form title and question wording and reorders it.

Expected observations:

- The respondent link shows the new copy/order, while history and export retain
  the response-time label and stable association.

### TC-011: Safe published structural changes apply to future responses

Setup:

- A published form already has responses.

Action:

- An editor adds a question, retires an unmapped question, updates options and
  future validation, and changes respondent access/dates.

Expected observations:

- New submissions use the current definition; historical answers remain
  readable; retired questions remain in historical response/export views.

### TC-012: All question types validate and round-trip

Setup:

- One form contains valid examples of all fourteen question types.

Action:

- An editor switches question types, configures each type-specific editor, and
  saves. For manual choice questions they press Enter to add an option and
  paste newline-delimited options; for linear scale they set minimum and
  maximum. A member then submits values and an authorized reader opens the
  response/CSV.

Expected observations:

- Values retain their intended types, formatting, ordering, and labels across
  respondent success, admin inspection, history, analytics, and CSV.
- Each question card exposes only the controls relevant to its selected type;
  manual options use editable rows with add/remove/Enter behavior rather than
  a lossy bulk-text transform, and invalid definitions show an inline message
  instead of throwing from the builder.

### TC-013: Other preserves exact text

Setup:

- Multiple choice, checkboxes, and dropdown questions allow Other.

Action:

- A member enters values such as `iOS`, `C++`, and an acronym.

Expected observations:

- Exact case/text is stored; no `__OTHER__` sentinel is accepted; analytics
  groups them under Other with raw drill-down.

### TC-014: Switching manual and preset options is reversible

Setup:

- An editor enters manual options and selects a preset.

Action:

- They switch back to Manual and then to the preset again.

Expected observations:

- Neither configuration is discarded and only the active source renders.

### TC-015: Large catalogs use bounded search

Setup:

- School and Company preset questions exist.

Action:

- Desktop and mobile members search/select values using keyboard and touch.

Expected observations:

- The client does not preload thousands of options, results are bounded and
  searchable, and selected values render correctly in review/edit mode.

### TC-016: Catalog additions and removals preserve meaning

Setup:

- A member selected option A; the code-owned catalog later adds B and removes A.

Action:

- A new member opens the form and the original member reviews an editable
  response.

Expected observations:

- B is available, A cannot be newly selected, and A remains labeled in the old
  response/export. The owner may keep A unchanged but must choose an active
  value after modifying that question.

### TC-017: Response modes behave independently

Setup:

- Three forms use single-locked, single-editable, and multiple-locked modes.

Action:

- A member submits, attempts updates, and attempts additional submissions.

Expected observations:

- Only single-editable updates; only multiple-locked creates additional
  responses; every locked response remains reviewable but immutable.
- New and completed form pages provide a Back to dashboard action. A completed
  form opens directly as a submitted-response receipt with no inert hash-link
  button; option objects render their human labels, checkbox selections render
  as readable comma-separated labels, and internal value/ID fields are hidden.

### TC-018: Concurrent single submission awards only one response

Setup:

- A single-response form has no response for the member.

Action:

- Two accepted-shape submissions race for the same member/form.

Expected observations:

- Exactly one response and one durable single-response claim exist; the other
  call returns an already-submitted conflict/outcome.

### TC-019: Direct-link eligibility is server authoritative

Setup:

- Published forms cover ordinary members, dues-paid members, and selected
  respondent roles.

Action:

- Eligible/ineligible authenticated members open and submit through copied
  links while bypassing client controls.

Expected observations:

- Only server-eligible members receive/submit the form; possessing a link does
  not bypass dues or role rules.

### TC-020: Availability and manual close produce clear states

Setup:

- Forms are before opening, open, past closing, manually closed, and archived.

Action:

- A member opens each link and attempts submission.

Expected observations:

- Each receives the correct clear state and only the open non-manually-closed
  published form accepts a response.

### TC-021: Member history is not form discovery

Setup:

- A member has generic responses, unsubmitted linked forms exist, and the
  member has event feedback.

Action:

- They open `/member/forms` and the dashboard Previous forms area.

Expected observations:

- Only owned retained generic responses appear; unsubmitted open forms and
  event feedback do not; the dashboard links to history rather than listing
  open opportunities.

### TC-022: Multiple-response history distinguishes submissions

Setup:

- A member submitted a multiple-locked form more than once.

Action:

- They open history and each response.

Expected observations:

- Every submission has its own time/detail and remains locked.

### TC-023: Authorized uploads finalize and download

Setup:

- An open file-upload form and an instruction-media draft exist.

Action:

- Eligible actors upload allowed files below 100 MB, finalize them, submit/save,
  and later request downloads.

Expected observations:

- Each attachment is bound to the correct user/form/question or instruction;
  authorized short-lived downloads work and metadata is preserved.

### TC-024: Abandoned and replaced uploads are cleaned

Setup:

- Upload intents expire without submission and instruction media is replaced.

Action:

- Cleanup runs.

Expected observations:

- Unreferenced objects/rows are removed without touching finalized active
  response or instruction files.

### TC-025: Response administration is section- and permission-scoped

Setup:

- Responses exist in two sections; admins have different global and section
  combinations.

Action:

- They list, inspect, download files, and export.

Expected observations:

- Only `READ_FORM_RESPONSES` plus section view (or officer) yields identified
  response data; inaccessible resources do not leak existence.

### TC-026: Generic analytics match response types

Setup:

- A form has scale/number, single choice, checkbox, boolean, link, text, and
  file responses.

Action:

- A response reader opens aggregate and individual views.

Expected observations:

- Averages/distributions, respondent-based checkbox counts, choice categories,
  Yes/No boolean breakdowns, clickable non-empty links/text, and authorized
  downloadable file rows match the underlying responses.
- With at least 60 non-empty text responses, long labels, and both desktop and
  320px viewports, question analytics remain aggregate-first and bounded.
  Small single-choice sets use a labeled part-to-whole chart; multi-select uses
  respondent-based bars; scale distributions preserve numeric order; text and
  file collections use bounded scrolling tables without client pagination and
  expose complete values
  without per-answer cards or redundant detail dialogs.
- Individual submissions render as compact rows with a full-response dialog;
  all authorized submissions remain in one scroll-bounded table without a
  client pager. No response or question controls the page height, scroll
  regions remain keyboard reachable, charts retain count/percentage text, and
  the document has no viewport-level horizontal overflow.
- Authorized uploaded files are downloadable from both admin response views and
  the submitting member's read-only response receipt; link answers are
  clickable in aggregate, individual, and member receipt views.

### TC-027: CSV is deterministic, identified, and spreadsheet-safe

Setup:

- Responses contain identities, arrays, historical labels, commas/quotes/new
  lines, and values beginning with formula characters.

Action:

- An authorized reader exports CSV.

Expected observations:

- Column/question order is stable; identity/time/status are present; arrays and
  escaping are deterministic; spreadsheet formulas are neutralized.

### TC-028: Response deletion enforces destructive access

Setup:

- A response exists with files and no callback.

Action:

- A reader-only user and then a section editor with both required global
  permissions attempt deletion.

Expected observations:

- Reader-only deletion is denied; authorized deletion removes the response and
  files after confirmation.

### TC-029: Callback catalog communicates unavailable actions

Setup:

- Tagged Role assignment and Recruiting notification callbacks require
  different permissions.

Action:

- Editors with different permissions open the callback catalog.

Expected observations:

- Both callbacks are listed; unauthorized entries are disabled and name the
  required permission/role; mapping controls are available only when allowed.

### TC-030: Callback mapping validates sources and fixed values

Setup:

- A locked form has typed questions and system values.

Action:

- An editor maps callback fields from answers, typed fixed values, submitter/
  member/response identity, timestamp, and event identity.

Expected observations:

- Compatible complete mappings save; invalid/missing/duplicate/type-mismatched
  mappings fail before a response can trigger them.

### TC-031: Callback-connected forms remain locked

Setup:

- A single-editable form and an ordinary locked form exist.

Action:

- An editor adds a callback to each and later tries to enable editing.

Expected observations:

- The editable form conflicts until changed to locked; a connected locked form
  cannot switch to editable.

### TC-032: Multiple callbacks create independent durable executions

Setup:

- A locked form has Role assignment and Recruiting notification callbacks.

Action:

- A member submits once.

Expected observations:

- The response transaction creates one execution per callback with distinct
  idempotency keys; respondent success contains no callback status.

### TC-033: Failed callback is visible and retryable

Setup:

- A registered external callback fails once and then succeeds.

Action:

- An authorized admin inspects the failure and selects Retry twice.

Expected observations:

- The bounded error and attempt count are visible; only one retry execution
  lease runs; terminal Succeeded cannot run again or duplicate its effect.

### TC-034: Discord role callback enforces permission and allowlist

Setup:

- Allowed and forbidden Discord role IDs exist; an officer and an
  `ASSIGN_ROLES` editor configure callbacks.

Action:

- They attempt each role and a member submits the allowed configuration.

Expected observations:

- Permission controls configuration visibility; the code allowlist rejects the
  forbidden role even for the officer; allowed assignment is idempotent.

### TC-035: Recruiting callback receives the mapped typed payload

Setup:

- A locked recruiting form maps questions and fixed/system values.

Action:

- A member submits.

Expected observations:

- One durable recruiting notification is produced with the validated mapped
  values and execution reaches Succeeded.

### TC-036: Callback details remain secret to respondents

Setup:

- A form has pending, failed, and successful callback histories across
  responses.

Action:

- Members open, submit, and review their responses and inspect respondent API
  payloads.

Expected observations:

- No callback name, mapping, state, error, retry control, or execution ID is
  returned or rendered.

### TC-037: Deleting callback response cancels pending work but keeps audit

Setup:

- One response has Pending, Failed, and Succeeded callback executions.

Action:

- An authorized admin deletes the response.

Expected observations:

- Response/files are removed; Pending becomes Cancelled; Failed/Succeeded
  retain minimal form/member/action audit with a null response reference; no
  effect is automatically reversed.

### TC-038: Duplicate callback metadata fails safely

Setup:

- Two procedures register the same callback ID or metadata/input schema drift.

Action:

- Registry validation starts in test/build.

Expected observations:

- Construction fails clearly rather than silently overwriting a procedure or
  showing a broken builder mapping.

### TC-039: Qualifying event creates linked feedback atomically

Setup:

- A new public, dues, Projects-private, or Mentorship-private club event is
  created.

Action:

- The event DB reservation succeeds, regardless of later Discord/Google result.

Expected observations:

- Exactly one explicit event-to-feedback association exists with a locked form,
  no start-time gate, a deadline seven days after event end, and reward amount 5.

### TC-040: Protected and hackathon events create no feedback opportunity

Setup:

- Events require each protected organizational role, Projects/Mentorship, or
  belong to a hackathon.

Action:

- They are created and eligible attendees inspect member surfaces.

Expected observations:

- Any protected-role or hackathon event has no opportunity; Projects and
  Mentorship private events do have one.

### TC-041: Event rename, duplicate, and reschedule preserve correct ownership

Setup:

- A qualifying event has linked feedback.

Action:

- It is renamed, duplicated, and its end is changed before and after attendees
  submit feedback.

Expected observations:

- Rename keeps the same linked form/link; duplicate receives a fresh empty
  form; every end edit recomputes the seven-day deadline without introducing a
  start gate.

### TC-042: Only checked-in attendees may submit feedback

Setup:

- A still-running event has an attendee and non-attendee who both possess the
  feedback link before the scheduled event end.

Action:

- Both submit valid answers, including through a bypassed client.

Expected observations:

- The checked-in attendee succeeds without waiting for event end; the
  non-attendee is denied and receives no response or points.

### TC-043: Feedback rewards exactly five points once

Setup:

- An eligible checked-in member has no reward.

Action:

- Concurrent/retried valid feedback submissions occur.

Expected observations:

- One locked response, one unique reward row with amount 5, and one five-point
  member increment commit atomically; every retry returns completed without an
  additional award.

### TC-044: Feedback default questions and discovery behave as approved

Setup:

- An event uses the core template.

Action:

- Members answer 1-5 overall/fun/learning, worked/improve, and one source
  including Google Calendar or Other.

Expected observations:

- All core semantic fields validate; discovery accepts only the live,
  code-owned `EVENT_FEEDBACK_HEARD` catalog; Other requires exact non-empty
  details and non-Other sources reject stray Other details; reward remains 5
  regardless of ratings.

### TC-045: Event editor adds only allowed custom feedback questions

Setup:

- An event has zero feedback responses, then later one response.

Action:

- An event editor uses the event Feedback surface to add a question and tries
  to modify a core question or add another after the first response. A final
  custom-question save is also raced against the first feedback submission.

Expected observations:

- Pre-response custom addition succeeds outside generic form admin; core edits
  and post-response additions are rejected. The racing operations serialize:
  either the question commits before submission validation or the response
  commits and the question save conflicts, never a response against a stale
  definition.

### TC-046: Member cards show availability, urgency, and completion

Setup:

- Attended events are not open, open with more than 24 hours, exactly 24 hours,
  below 24 hours, expired, and completed.

Action:

- The member opens `/member/events` and dashboard recent-event cards.

Expected observations:

- Cards use a compact feedback icon without a due-date row; only below 24 hours
  adds a red `(!)` with accessible tooltip text. Completed overrides urgency,
  mutes the feedback glyph, and gives its action a green success background so
  pending and submitted states remain visually distinct.

### TC-047: Feedback stays in an event dialog and out of generic history

Setup:

- A member has available and completed feedback plus generic responses.

Action:

- They open member event cards, the feedback action, and `/member/forms`.

Expected observations:

- Feedback is completed/reviewed in the event dialog, no member feedback page
  exists, and feedback is absent from generic response history.
- On an accepted submission, the dialog closes immediately and a success toast
  confirms acceptance and points earned before background cache refreshes.

### TC-048: Completed feedback remains read-only after expiration

Setup:

- A member submitted feedback and the window later expired.

Action:

- They reopen the event dialog and attempt an update.

Expected observations:

- The dialog shows submitted and 5 points earned with original answers; no edit
  action exists and the API rejects updates.

### TC-049: Event table and feedback detail calculate deterministic metrics

Setup:

- Feedback contains varied ratings, discovery sources, text, and custom
  questions.

Action:

- An event reader opens the list and feedback detail.

Expected observations:

- The list shows overall 1-5 average/count; detail shows overall, fun,
  learning averages/distributions, discovery pie, non-empty text table, and
  custom-question summaries with no generated narrative.

### TC-050: Aggregate and raw feedback permissions stay separated

Setup:

- One user has event-read only; another also has response-read.

Action:

- Both open feedback detail and attempt identity/raw/CSV/local exclusion.

Expected observations:

- Event-read sees safe aggregates only; response-read sees identities, raw
  answers, CSV, and local exclusion controls. CSV columns retain deterministic
  core-then-custom question order and include each custom answer under its
  configured prompt.

### TC-051: Local exclusions never persist

Setup:

- A response reader opens feedback with several responses.

Action:

- They locally exclude multiple responses, inspect metrics/counts, export CSV,
  refresh, and another admin opens the event.

Expected observations:

- Current metrics show included/excluded counts and omit selected responses;
  event-list average and CSV include all; refresh/other session returns to zero
  exclusions; no DB field changes.

### TC-052: Deleting feedback preserves reward and completion

Setup:

- A member submitted feedback and received five points.

Action:

- An authorized admin deletes the response; the member revisits the event and
  attempts resubmission.

Expected observations:

- The response/files are gone, points/reward remain, member status stays
  completed, and resubmission is denied.

### TC-053: Legacy forms migrate archived without replay

Setup:

- Legacy forms, label-keyed responses, section roles, files, callbacks, member
  signup, and feedback-like forms exist.

Action:

- The migration and verification run.

Expected observations:

- General legacy forms/responses appear authorized in Archive with stable IDs
  and historical labels; member signup remains system-owned; feedback-like
  forms stay out of generic member history; no callback or points replay occurs.

### TC-054: Recent qualifying events backfill, older events do not

Setup:

- Existing qualifying events are future, in progress, ended fewer than seven
  days ago, and ended more than seven days ago.

Action:

- Feedback backfill runs repeatedly.

Expected observations:

- Exactly one opportunity is created for the first three categories; old
  events receive none; repeat migration is idempotent.

## Negative / regression cases

### TC-NEG-001: Unauthenticated form and admin access is rejected

Setup:

- No session exists.

Action:

- The caller opens respondent/admin/history endpoints.

Expected observations:

- No protected data is returned and the API reports `UNAUTHORIZED`.

### TC-NEG-002: Persisted definition cannot execute code

Setup:

- A malicious persisted definition contains code-like strings/schema content.

Action:

- The form is loaded and a response is validated.

Expected observations:

- No dynamic evaluation occurs; the definition is rejected or treated as data.

### TC-NEG-003: Question type or mapped-question retirement is blocked

Setup:

- A question has saved answers and/or a callback mapping.

Action:

- An editor changes its type or retires it.

Expected observations:

- A conflict identifies the dependency; labels/order remain editable.

### TC-NEG-004: Invalid option and Other payloads are rejected

Setup:

- A member submits removed/unknown values, blank Other, duplicate checkbox
  values, or an internal sentinel.

Action:

- Submission bypasses client validation.

Expected observations:

- Server validation rejects it without storing a partial response.

### TC-NEG-005: Unsafe or oversized uploads are rejected

Setup:

- Uploads exceed 100 MB, spoof MIME/extension, contain executable/script types,
  or belong to another user/form/question.

Action:

- Intent/finalization/submission/download is attempted.

Expected observations:

- Every unauthorized/unsafe stage fails and no durable response reference or
  cross-user download is produced.

### TC-NEG-006: Cross-section IDs do not leak resources

Setup:

- An admin knows UUIDs/slugs from an inaccessible section.

Action:

- They call detail/response/export/file/mutation endpoints directly.

Expected observations:

- Access is denied or not found without names, counts, identities, or files.

### TC-NEG-007: Untagged or unauthorized callbacks cannot be configured

Setup:

- A valid tRPC mutation lacks callback metadata, and a tagged callback requires
  a permission the editor lacks.

Action:

- The editor submits handcrafted callback configurations.

Expected observations:

- Neither configuration is stored or executed; server permission remains
  authoritative despite the catalog's visible disabled row.

### TC-NEG-008: Callback retry cannot duplicate a successful effect

Setup:

- A callback succeeded but the client retries or a lease expires ambiguously.

Action:

- Multiple retry/worker attempts occur.

Expected observations:

- The same idempotency key is reused and the external effect is not duplicated.

### TC-NEG-009: Form response deletion does not claim compensation

Setup:

- A response produced a Discord role/recruiting notification.

Action:

- An authorized admin deletes it.

Expected observations:

- The warning/audit identifies completed effects; no automatic reversal is
  attempted or reported as completed.

### TC-NEG-010: Feedback link cannot bypass time or attendance

Setup:

- A non-attendee or attendee outside the current event-derived window has the
  direct feedback URL.

Action:

- They submit directly to the API.

Expected observations:

- Submission and points are rejected.

### TC-NEG-011: Protected role uses stable identity, not display text

Setup:

- A protected Discord-linked role is renamed and an unrelated role adopts a
  similar name.

Action:

- Events using each role are created/updated.

Expected observations:

- Feedback exclusion follows the protected stable role ID, not display names.

### TC-NEG-012: Feedback deletion cannot enable a second reward

Setup:

- Feedback response was deleted but its reward row remains.

Action:

- Concurrent resubmissions are attempted.

Expected observations:

- All are rejected/completed; member points do not change.

### TC-NEG-013: Session exclusions cannot alter CSV or another session

Setup:

- A response reader submits excluded response IDs in metric requests.

Action:

- They export or another reader loads metrics.

Expected observations:

- Export and other session use all retained responses and no exclusion is
  persisted.

### TC-NEG-014: Legacy callback mappings do not silently bind by ambiguous label

Setup:

- A legacy archived form has duplicate/renamed question labels or an unknown
  callback ID.

Action:

- Migration and republish are attempted.

Expected observations:

- The connection remains disabled Needs configuration; it never executes until
  an authorized editor explicitly repairs a valid stable mapping.

### TC-NEG-015: Full-workspace baseline is not misattributed

Setup:

- The accepted `@forge/guild` missing-API baseline remains.

Action:

- Feature verification runs targeted checks and records any full-workspace
  result.

Expected observations:

- Changed packages pass targeted validation; the known baseline is reported
  separately rather than treated as a forms regression or silently ignored.

## Open questions

- None.
