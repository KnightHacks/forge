# Forms and Event Feedback Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-15: The slice includes a general forms platform for creating forms,
  collecting and viewing responses, exporting responses, controlling form
  visibility, and sharing forms by link and QR code.
- 2026-07-15: Event feedback is a distinct member and admin flow within this
  slice rather than an undifferentiated generic form.
- 2026-07-15: Club events receive a default feedback form and completing an
  eligible event-feedback opportunity is worth 5 points.
- 2026-07-15: Eligible feedback opportunities must surface on
  `/member/events` and the member-dashboard event cards.
- 2026-07-15: Feedback results are represented in the normal admin event table
  and a richer event Feedback tab/dialog rather than the generic forms UI.
- 2026-07-15: Legacy behavior is evidence for reverse-prompting, not an
  automatic requirement. In particular, Reforge should not preserve the
  legacy event-name-derived feedback-form association.
- 2026-07-15: Event feedback is available immediately to checked-in attendees
  with no event-end start gate and closes seven days after event end.
- 2026-07-15: Member event-history and dashboard cards show the feedback due
  date. With less than 24 hours remaining, the due state becomes red and shows
  an exclamation-mark urgency treatment.
- 2026-07-15: The first valid feedback submission awards exactly 5 member
  points. Edits, retries, or a reopened opportunity do not re-award points,
  and deleting the response does not remove awarded points.
- 2026-07-15: Authorized admins may identify feedback respondents and may
  session-locally exclude any number of responses from calculated analytics
  without changing or deleting the underlying records.
- 2026-07-15: Default event feedback uses 1-5 scales for overall rating, fun,
  and learning; prompts for what worked and what should improve;
  and asks how the attendee discovered the event. The 5-point member reward is
  independent of all rating answers.
- 2026-07-15: Event feedback analytics belong to event administration rather
  than the generic forms platform. The normal event table shows an overall
  1-5 average that opens richer metrics, and event administration also has a
  dedicated feedback tab/page.
- 2026-07-15: Event feedback is completed in a dialog from `/member/events`
  and member-dashboard event cards. There is no separate member feedback page.
- 2026-07-15: Every non-hackathon event gets feedback except events whose
  visibility requires a protected Knight Hacks organizational role.
- 2026-07-15: The protected-role exclusion set consists of the Dev, Workshop,
  Sponsorship, Outreach, Design, and Hackathon team roles; executive roles
  (President, Vice President, Treasurer, Secretary, Hack Lead, Dev Lead, and
  Officers); and director roles (Design Director, Sponsorship Director,
  Outreach Director, Workshop Director, and Directors). Projects and
  Mentorship roles are deliberately not excluded because their private events
  warrant feedback.
- 2026-07-15: Default feedback discovery sources are Discord, Instagram,
  KnightConnect, word of mouth, CECS emailing list, Reddit, LinkedIn, class
  presentation, another club, Google Calendar, and Other.
- 2026-07-15: Generic forms are acquired through direct links/QR only. There is
  no directory of open forms for members.
- 2026-07-15: Generic forms use Draft, Published, and Archived states.
  Drafts are visible only to administrators who can create/edit forms;
  published definitions are visible to administrators with form-read access,
  while eligible authenticated members can respond through the direct link.
  Forms also support scheduled opening/closing and manual close.
- 2026-07-15: `/member/forms` is response history, not form discovery. Members
  can review prior generic-form responses and edit them when the form permits.
  The main member dashboard gets a small Previous forms section linking there.
  Event-feedback forms and responses are excluded from both generic surfaces.
- 2026-07-15: Published forms have stable URLs independent of title changes.
  Historical responses remain accurate through immutable question/option IDs
  and response-time definition/label snapshots rather than replacement form
  versions.
- 2026-07-15: The builder includes all legacy field types plus respondent file
  uploads and instruction blocks with image/video media, redesigned in the
  current Reforge design system rather than copying the legacy editor UX.
- 2026-07-15: Every form response is identified. Identity is not a per-form
  export option.
- 2026-07-15: Form sections provide both organization and admin-side access
  control. Global read/edit form permission is checked first, followed by the
  actor's view/edit access to the form's section.
- 2026-07-15: CSV is the required export format; XLSX is not required.
- 2026-07-15: Locally excluded feedback responses remain included in CSV
  exports, while the analytics UI shows included and excluded counts separately.
- 2026-07-15: Generic form response behavior uses exactly three mutually
  exclusive modes: single locked response, single editable response while the
  form is open, or multiple individually locked responses. Members may review
  all owned responses from response history.
- 2026-07-15: Event feedback is a single locked response and cannot be edited.
- 2026-07-15: `IS_OFFICER` bypasses all form permission, role, and section
  access gates. Officers alone create form sections and provision their view
  and edit access groups.
- 2026-07-15: Any administrator with `READ_FORM_RESPONSES` may locally exclude
  feedback responses from the current analytics inspection. This exclusion is
  session-only UI state, is not persisted, resets on refresh/new sessions, and
  does not alter the response or CSV export.
- 2026-07-15: `READ_CLUB_EVENT` permits aggregate feedback metrics;
  `READ_FORM_RESPONSES` permits respondent identity, individual answers, CSV,
  and session-local inclusion/exclusion controls.
- 2026-07-15: Feedback analytics are deterministic only: averages for overall,
  learning, and fun; all non-empty qualitative responses in tables; a
  discovery-source pie chart; and comparable per-question metrics. No
  generated narrative or AI synthesis is required.
- 2026-07-15: Archiving preserves form definitions, responses, files, section
  association, access configuration, and member history. Normal lists omit
  archived forms; an Archive tab exposes only forms the current administrator
  is authorized to see. Permanent deletion is limited to forms with no
  responses.
- 2026-07-15: Legacy forms migrate into the archive with a migration-time close
  boundary and may later be republished with a new availability window. This
  supports restoring forms such as club-site team applications.
- 2026-07-15: Respondent files and instruction media all use a 100 MB maximum,
  enforced server-side alongside content-type and access validation.
- 2026-07-15: Admin-configurable form callbacks are required in this slice.
  Eligible tRPC operations must opt in through metadata and appear in a
  redesigned builder mapping experience. Procedural role assignment from a
  form submission is a critical callback use case.
- 2026-07-15: The first configurable callback catalog includes Discord role
  assignment and recruiting notification. Callback-only actions may live in a
  dedicated callback router rather than being mixed into general routers.
- 2026-07-15: Callback metadata declares the permission required to discover
  and configure the callback. The builder hides callbacks the current admin is
  not authorized to use, and the server independently enforces that permission.
- 2026-07-15: Conditional business logic belongs inside a registered callback,
  not in a generic form rule engine. Builder mappings connect immutable form
  fields to typed callback inputs or supply typed fixed/custom values such as a
  Discord role ID.
- 2026-07-15: Durable callback execution is asynchronous for external effects.
  The response is saved, each callback receives an independent
  pending/succeeded/failed execution state, failures show an error to
  authorized admins, and admins may retry them.
- 2026-07-15: A form may configure multiple independent callbacks. Forms with
  callbacks are locked-response forms; callbacks run once for each newly
  created response and never run from response editing.
- 2026-07-15: Callback configuration and execution status are never exposed to
  members/respondents. The respondent sees only the normal form-submission
  experience.
- 2026-07-15: Callback input mappings may source typed form answers, typed
  fixed values, submitter user/member identity, response ID, submission time,
  and applicable event ID.
- 2026-07-15: Event-feedback points and member signup remain system-owned
  workflows rather than admin-removable callbacks.
- 2026-07-15: Only explicitly metadata-tagged internal callback procedures are
  supported. Arbitrary outbound webhooks are out of scope.
- 2026-07-15: Builder support for reusable constant-backed option lists such as
  schools and majors is required and is being re-specified from legacy behavior.
- 2026-07-15: All twelve retained code-owned option catalogs ship in the
  builder: levels of study, allergies, majors, genders, races/ethnicities,
  countries, schools, companies, shirt sizes, event discovery sources, short
  levels of study, and short races/ethnicities. Admin-managed reusable catalogs
  are out of scope; manual per-question options remain supported.
- 2026-07-15: Published questions reference the live code-owned catalog so
  newly added options become available without republishing the form. Removed
  options are unavailable to new responders, but stable option identities and
  response-time label snapshots preserve prior selections in history,
  analytics, and exports.
- 2026-07-15: Catalog and manual options have stable machine values separate
  from display labels.
- 2026-07-15: Option lists above approximately 15 entries use searchable
  selection. Very large catalogs such as Schools and Companies load on demand.
  The builder warns about unwieldy radio/checkbox presentation but does not
  reject a preset solely because it is large.
- 2026-07-15: Multiple choice, checkboxes, and dropdowns support Other. Other
  text is required, preserved exactly, and grouped under Other in analytics
  with raw-value drill-down.
- 2026-07-15: Event discovery source is single-choice with Other so its pie
  chart uses respondent-based percentages.
- 2026-07-15: Switching between manual and preset option sources preserves
  both configurations so the admin can switch back without losing work.
- 2026-07-15: If an editable response contains a removed catalog option, the
  member may retain it unchanged. Once that question is modified, the member
  must choose an active option.
- 2026-07-15: Submitted event feedback remains available in its event dialog
  as a read-only confirmation showing that feedback was submitted and 5 points
  were earned, including after the opportunity expires.
- 2026-07-15: Event creation transactionally provisions its linked feedback
  form. The form has no start gate and closes seven days after event end.
  Migration backfills qualifying future, in-progress, and still-open recent
  events; older events receive no new opportunity.
- 2026-07-15: Officers own the global feedback template for future events.
  Core analytics questions remain locked. Event editors may add event-specific
  questions before the first response, but only through the event detail or
  Feedback UI rather than the generic forms platform.
- 2026-07-15: Section access has separate viewer and editor role sets. Editors
  imply viewing; response access additionally requires
  `READ_FORM_RESPONSES`; respondent roles remain form-specific; officers
  bypass all gates.
- 2026-07-15: Published forms do not return to draft and do not require a
  replacement-version lifecycle for ordinary edits. Forms and questions use
  immutable IDs rather than titles as answer and callback keys so compatible
  published edits do not break presentation or historical association.
- 2026-07-15: Instruction images accept common image formats; instruction
  videos accept browser-playable formats; respondent uploads accept common
  documents, spreadsheets, presentations, images, videos, text, and ZIP up to
  100 MB. Executables and scripts are rejected.
- 2026-07-15: Form sharing includes Copy link, Open form, QR preview, and QR PNG
  download. Printing QR codes is out of scope. Slugs may be customized before
  first publication and are immutable afterward.
- 2026-07-15: Authorized admins may hard-delete responses. Deletion does not
  automatically reverse callback side effects or awarded feedback points;
  officers are responsible for any necessary external/manual compensation.
- 2026-07-15: Published forms edit in place. Safe live edits include form copy,
  instructions/media, question wording/order, adding or retiring questions,
  option changes, future-facing validation/requiredness, respondent access,
  availability, manual close, and callbacks for future responses. Question
  type may change only before it has answers and while it is not callback-
  mapped; mapped questions cannot retire until disconnected.
- 2026-07-15: `READ_FORMS` plus section-view access permits definition and
  share controls. `EDIT_FORMS` plus section-edit access permits create,
  publish, edit, close, archive, move, and authorized callback configuration.
  `READ_FORM_RESPONSES` plus section-view access permits identified response
  inspection, CSV, and local analytics exclusion. Response deletion requires
  `EDIT_FORMS`, `READ_FORM_RESPONSES`, and section-edit access. Officers bypass
  every gate.
- 2026-07-15: Deleting event feedback does not reopen the opportunity. The
  durable reward record keeps the member completed and prevents another
  submission while retaining the original 5-point award.
- 2026-07-15: Response deletion removes the response and its files, cancels
  pending callbacks, and retains a minimal callback execution audit. Completed
  external effects require manual officer reversal.
- 2026-07-15: Discord-role callback configuration requires `ASSIGN_ROLES` and
  validates fixed role IDs against a code-owned assignable-role allowlist.
  Officers bypass the metadata permission but not the target-role allowlist.
- 2026-07-15: Callback selection shows the full tagged catalog. Unauthorized
  callbacks are disabled, show the permission/role needed to configure them,
  and remain server-enforced.
- 2026-07-15: Event rescheduling always recomputes the feedback deadline to
  seven days after the latest event end.
- 2026-07-15: The final form state flow is `Draft -> Published <-> Archived`.
  Forms never return to Draft; published and archived definitions edit in
  place, and archived forms republish with their current definition and newly
  configured availability.
- 2026-07-15: The user approved the specification, SRD, and observable test
  contract as the implementation baseline. Development proceeds test-first and
  returns for human UI verification only after the targeted automated checks
  pass.
- 2026-07-15: UI verification found that migrated response snapshots retain the
  legacy `{ definition }` wrapper and prompt-keyed answers. A deterministic
  compatibility adapter now presents those archived definitions and responses
  through stable platform IDs without mutating their stored historical data.
- 2026-07-15: UI verification removed the forms workspace's two asymmetric
  right-rail layouts. Section create/edit is now a searchable, tabbed role
  dialog; builder access, callbacks, sharing, and deletion are dialogs around a
  full-width definition canvas with compact configuration summaries.
- 2026-07-15: E2E fixture roles are filtered from Forms and Event product
  selectors at the API boundary while remaining visible in role administration.
- 2026-07-15: Checked-in members may submit feedback before scheduled event end
  so an event ending early does not lose responses. Event cards use a compact
  bottom-right due-date/action footer; only the final 24 hours receive red
  urgency treatment.
- 2026-07-15: Form administration now treats section as an explicit,
  URL-backed workspace context. Its compact selector lives in the Forms/Archive
  control bar and auto-swaps the `section` query parameter while preserving the
  active/archive view and search query; the all-sections view groups forms
  beneath named section headings and counts instead of relying on small card
  badges alone.
- 2026-07-15: Generic form response UI is mobile-first at 320px and above:
  reduced nested padding, overflow-safe controls, 16px text entry, compact
  native dropdowns, 44px scale targets, question position, focused required
  validation, and a safe-area-aware submit/error bar. Phone inputs use mobile
  telephone semantics.
- 2026-07-15: Section access cards use a compact responsive grid: one column
  on phones, two on normal screens, and three on wide screens.
- 2026-07-15: Generic response review was rebuilt after product-scale UI
  verification exposed unbounded qualitative answers and expanded response
  rows. The reader now separates analytics, compact individual submissions,
  and callback delivery; uses donut charts only for small mutually-exclusive
  choices, respondent-based bars for multi-select, ordered scale
  distributions, bounded scrolling text tables, and mobile-safe detail
  dialogs. Frontend skill and Blade design guidance now require explicit
  density strategies and 60-record/320px stress validation.
- 2026-07-15: Follow-up UI review replaced the uneven two-column question-card
  grid with one divided full-width analytics panel. Qualitative collections are
  bounded unpaginated tables with complete inline values, and categorical and
  numeric graphics use the shared shadcn/Recharts chart primitives rather than
  hand-built CSS charts.
- 2026-07-15: Builder follow-up restored the legacy interaction model inside
  the new design system: Add Question creates a short-answer row, each row owns
  its type selector, and questions support pointer and keyboard drag/reorder
  with stable IDs plus explicit up/down fallbacks. Dashboard feedback is now an
  icon-only action; only due-soon feedback adds a red `(!)` tooltip marker.
- 2026-07-15: Type-specific builder bodies now follow the useful legacy form
  flow: choice questions use one editable option row at a time with Enter,
  add/remove, and multiline paste; linear scales expose minimum/maximum and a
  preview; number, text, paragraph, and file questions expose their applicable
  constraints; the remaining types identify their response format. Builder
  schema failures render inline instead of escaping as an uncaught exception.
- 2026-07-15: Member form response review now behaves as a receipt instead of
  an inert anchor jump. Submitted choice and checkbox values render human
  labels rather than serialized objects, internal identifiers stay hidden,
  the receipt has no redundant Review button, and every generic form state
  exposes a compact Back to dashboard action.
- 2026-07-15: Accepted event feedback now closes its dialog immediately and
  emits a success toast with points earned. Completed feedback actions retain
  read-only review access but use a muted message glyph on a green success
  background, making them visibly distinct from pending feedback icons.
- 2026-07-15: Event-feedback discovery is validated against the live
  `EVENT_FEEDBACK_HEARD` catalog. Other requires its exact free-text detail,
  while non-Other selections reject stray detail values.
- 2026-07-15: Event-feedback CSV exports append configured custom questions in
  definition order and export their answers under the configured prompts.
- 2026-07-15: The first feedback submission and event-specific question edits
  share an event-level transaction lock. Question edits recheck response state
  under that lock and use the current form revision, eliminating the stale
  definition race at the first response boundary.

## PR review swarm

- 2026-07-15: Three independent review passes covered backend/data security,
  frontend state/permissions, and tests/migrations/operations. Confirmed
  findings were fixed before handoff rather than deferred as review comments.
- Response integrity now preserves distinct `multiple_locked` receipts, blocks
  non-members from generic submissions, protects answered and callback-mapped
  questions, keeps file replacement writes transactional, and preserves legacy
  uploaded files as authorized downloads.
- Callback configuration validates required keys, source compatibility, and
  fixed values against the registered input schema. Assign-role callbacks
  enforce the code-owned Discord-role allowlist at configuration, enqueue, and
  dispatch. Retry/disable enforce callback-specific permission, expired leases
  are reclaimable, terminal writes are fenced, recruiting delivery has a
  deterministic provider nonce, and deleted responses have callback inputs
  scrubbed and cannot be retried.
- Uploads enforce each file question's size/MIME limits at signing and response
  attachment, verify stored MIME and common file signatures after upload, block
  executable signatures, and prevent submission while an upload is pending.
- The additive `0015_forms_response_indexes` migration classifies legacy member
  signup as `system`, legacy Feedback convention forms as `event_feedback`, and
  adds form/created and user/created response indexes. Admin form counts now use
  grouped SQL rather than loading every response row.
- The repository frontend skill and Blade design-system guidance now encode the
  review feedback: mine proven legacy flows, prefer compact dialog-first
  actions, avoid arbitrary one-third side panels, bound dense content with
  deliberate overflow, use URL-backed immediate selectors, and require
  type-specific form editors, respondent controls, and analytics.

## Open questions

- None. Newly discovered contradictions or missing decisions will be returned
  to reverse-prompting instead of guessed.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Establish the failing automated test baseline.
- [x] Implement forms, callbacks, event feedback, and their UI flows.
- [x] Pass targeted unit/integration tests, package type checks and lint, the
      feature browser journey, migration drift validation, and formatting.
- [x] Hand the green build to the user for human UI verification.

## Validation / commands

- `pnpm forge:feature forms-and-event-feedback "Forms and Event Feedback"`:
  created the empty feature artifact bundle on
  `reforge/forms-and-event-feedback`.
- Legacy source review: confirmed form editor, response views/aggregations,
  CSV export, QR sharing, role and dues gates, response edit/resubmission,
  uploads, and sections.
- Legacy feedback review: confirmed lazy feedback-form generation and
  name-derived event association; no feedback-point award was found in the
  active generic form-response mutation.
- Artifact draft review: product, technical, and observable-test contracts have
  no remaining placeholders or declared open questions and were approved by the
  user on 2026-07-15.
- `pnpm exec prettier --check .forge/features/forms-and-event-feedback/{spec.md,srd.md,test-cases.md,status.md}`:
  passed; pnpm emitted the repository's existing ignored-overrides warning.
- `pnpm --filter=@forge/db test -- forms-platform-migration.test.ts`: expected
  RED; all three migration-contract tests fail because the reviewed forms
  platform migration does not exist yet.
- `pnpm --filter=@forge/validators test -- forms-platform.test.ts`: expected
  RED; the shared `forms-platform` validator/runtime module does not exist yet.
- `pnpm --filter=@forge/api test -- access.test.ts callbacks.test.ts`: expected
  RED; the section access and durable callback modules do not exist yet. The
  existing forms-manager tests selected by the filename filter remain green.
- `pnpm --filter @forge/validators test`: passed, 64 tests.
- `pnpm --filter @forge/db test`: passed, 8 tests with 9 environment-dependent
  integration tests skipped by their existing guards.
- `pnpm --filter @forge/api test`: passed, 210 tests, including legacy archived
  definition/snapshot/answer compatibility.
- `pnpm --filter blade test`: passed, 122 tests, including typed boolean, link,
  and authorized file-download response rendering.
- `pnpm --filter=@forge/blade test -- src/tests/forms/form-responses-dashboard.test.tsx`:
  passed 7 response-reader density, visualization, link, and file-action tests,
  including a 60-answer qualitative fixture.
- `pnpm --filter=@forge/blade typecheck`: passed after the response-reader
  redesign.
- `pnpm --filter @forge/cron test`: passed, 7 tests.
- Targeted type checks passed for Blade, API, validators, database, cron,
  constants, and utilities.
- Targeted lint passed for every changed application/package.
- `pnpm db:generate` produced the reviewed follow-up migration that removes the
  event-feedback opening column/check; `pnpm db:migrate` applied it locally.
- Event feedback tests verify a checked-in attendee can submit before scheduled
  event end while the deadline remains event end plus seven days.
- `pnpm --filter @forge/api test -- src/tests/events/feedback.test.ts`: passed,
  12 tests covering feedback policy/rewards, code-owned discovery validation,
  custom-question analytics/CSV, and local exclusion behavior.
- `pnpm --filter @forge/api test`: passed all 214 tests in the final PR-review
  rerun after the legacy/minimal attachment-definition compatibility adjustment.
- Final PR-review rerun: API lint/typecheck and 220 tests passed; Blade
  lint/typecheck and 126 tests passed; validators typecheck and 65 tests passed;
  database lint/typecheck and 10 tests passed with the existing 9 guarded
  integration skips.
- `playwright test src/tests/e2e/forms-platform.spec.ts`: passed the focused
  cross-surface forms journey after response-history URLs were made
  response-specific.
- `playwright test src/tests/e2e/admin-member-dashboard.spec.ts --grep "edits the selected profile"`:
  passed after preserving the code-owned admin maintenance path for closed
  member-signup responses.
- `pnpm --filter=@forge/db migrate`: applied the additive response-index and
  legacy-classification migration locally.
- `playwright test forms-platform.spec.ts`: passed the officer create/publish,
  section/settings dialog, hidden E2E role, member submit/history, and officer
  response-inspection browser journey. Response inspection seeds 60 long-form
  answers and verifies bounded analytics at 1440px and a no-overflow detail
  flow at 320px.
- The Forms browser journey also passed at a 320x740 viewport, including
  section selection, URL persistence, zero document overflow, a visible mobile
  submit action, 16px respondent input text, submission, and response review.
- The exact archived form reported during UI verification normalized three
  stored responses across five questions and produced five analytics entries
  without error.
- Response rendering now treats booleans, links, and files as first-class
  response types: booleans receive a Yes/No distribution, links remain
  clickable, and authorized files can be downloaded from aggregate/admin detail
  views and the member's submitted-response receipt.
- Full-workspace typecheck still reaches only the documented intentional Guild
  router baseline failure; full-workspace lint reaches that same Guild failure
  and the unchanged Club consumer of `api.guild`.

## Links

- PRs:
- Issues:
- Discord/thread context:
