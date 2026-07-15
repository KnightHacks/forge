# Forms and Event Feedback Spec

Status: Complete — approved for implementation

> This file owns the non-technical user/product intent.

## User-facing purpose

Blade should provide one polished forms platform for Knight Hacks officers and
teams to create, publish, share, and review identified member forms without
requiring a developer for ordinary form changes. Members receive forms through
intentional links or QR codes, complete them in a modern responsive experience,
and can later review their own submissions without being shown a confusing
directory of unrelated open forms.

The same platform should power a deliberately separate event-feedback
experience. Every qualifying club event creates a five-point feedback
opportunity for checked-in attendees. Feedback stays attached to the event in
member and admin experiences, provides comparable event-quality metrics, and
does not expose the generic form-management machinery.

Forms may also trigger explicitly registered Knight Hacks automations, such as
assigning a Discord role or posting a recruiting notification. Officers and
team editors configure these through an understandable mapping interface while
respondents see only the form and its normal success state.

## Users / actors

- Authenticated Knight Hacks members who receive a direct form link or QR code.
- Members reviewing their own previous generic-form submissions.
- Checked-in event attendees completing a time-limited feedback opportunity.
- Form readers who can inspect forms in assigned sections.
- Response readers who can inspect identified responses and export CSV for
  forms in assigned sections.
- Form editors who create and manage forms in assigned sections.
- Event readers who inspect aggregate event-feedback metrics.
- Event editors who inspect feedback and add event-specific questions before
  the first response.
- Officers, who bypass all form permissions, section gates, and callback
  visibility gates; create sections; provision access; and manage the global
  feedback template.
- Registered callback actions that process completed form responses.

Hackers and hackathon-event feedback are not actors in this slice.

## User-visible interface

### Form administration

- Form administration lives in the existing Blade admin shell under
  `/admin/forms`.
- The normal view presents only forms in sections the administrator may view.
  Officers see every section and form.
- Forms are organized into officer-managed sections. Each section has distinct
  viewer and editor role groups; editors also receive view access.
- The forms view supports useful search, section selection, form state, and
  response-count context without loading every response merely to draw a form
  card.
- Forms use the simple state flow `Draft -> Published <-> Archived`.
- Draft forms are visible only to authorized editors. They do not accept member
  responses.
- Published forms may accept responses when their scheduled opening and closing
  times and manual-open state permit.
- Archived forms do not accept responses and are omitted from normal lists.
  The Archive tab shows each administrator only the archived forms from
  sections they could otherwise view. Officers see all archived forms.
- An archived form retains its definition, section, responses, files, access
  policy, and automation history. An editor may configure a new availability
  window and republish it directly.
- A published or archived form never returns to Draft.
- A form with no responses may be permanently deleted. A form with responses is
  archived rather than permanently removed.
- Forms have a stable share URL. Editors may customize its slug before first
  publication; titles may change later without changing the URL.
- Share controls include Copy link, Open form, QR preview, and QR PNG download.
  Printing a QR code is not a dedicated product action.

### Form builder

- The builder follows Reforge's current design system and interaction patterns.
  It should not reproduce the dense, awkward flow of Legacy Blade.
- Editors can set form title, description, instructions, media, response mode,
  respondent access, section, availability, manual close, and registered
  callbacks.
- Instructions may contain formatted text, an image, or a browser-playable
  video and may be reordered with questions.
- Question types include:
  - short answer;
  - paragraph;
  - multiple choice;
  - checkboxes;
  - dropdown;
  - file upload;
  - linear scale;
  - date;
  - time;
  - email;
  - number;
  - phone;
  - yes/no;
  - link.
- Questions support required/optional behavior, applicable limits, ordered or
  searchable options, and an optional Other answer for multiple choice,
  checkboxes, and dropdowns.
- Other answers require non-empty text, preserve exactly what the member typed,
  and appear as one Other category in aggregate charts with access to the raw
  values.
- Editors may enter manual options or use a registered code-owned preset list.
  Switching between manual and preset choices does not discard either setup.
- Presets include levels of study, allergies, majors, genders,
  races/ethnicities, countries, schools, companies, shirt sizes, event
  discovery sources, short levels of study, and short races/ethnicities.
- Large option catalogs use search rather than rendering thousands of choices
  at once. Large radio or checkbox presentations receive a design warning but
  are not rejected solely because of their size.
- Newly added values in a code-owned preset become available to already
  published forms. Removed values disappear for new answers while remaining
  readable in earlier submissions and exports.
- If an editable response already contains a removed value, the member may
  preserve it unchanged. Changing that question requires selecting an active
  value.
- Respondent and instruction uploads have a 100 MB maximum. Instruction-image
  fields accept common image formats, instruction-video fields accept common
  browser-playable formats, and respondent file questions accept common
  documents, spreadsheets, presentations, images, videos, text, and ZIP files.
  Executables and scripts are rejected.

### Response modes and respondent access

- Every response is tied to the authenticated member who submitted it.
- A form chooses exactly one response mode:
  - one response, locked after submission;
  - one response, editable while the form accepts responses;
  - multiple responses, each locked after submission.
- A form with configured callbacks must use a locked response mode.
- Respondent eligibility may be open to authenticated members or restricted to
  dues-paid members and/or selected member roles. Possessing a link never
  bypasses those checks.
- A scheduled form clearly communicates not-yet-open, closed, manually closed,
  ineligible, already submitted, successful, reviewable, and editable states.
- A published form is acquired only through its direct link or QR code. Blade
  does not provide members with a directory of currently open forms.

### Member response history

- `/member/forms` is a private history of the signed-in member's generic-form
  responses, not a form-discovery page.
- Members can review every retained submission and edit only a single-editable
  response while its form remains open.
- Multiple-response forms show each submission distinctly.
- A small Previous forms area on the member dashboard links to this history.
- Event-feedback definitions and responses never appear in the generic member
  history or Previous forms area.

### Generic responses and exports

- Authorized response readers use a dedicated response view for each form.
- Response administration supports aggregate question summaries and identified
  per-response inspection without exposing forms from unauthorized sections.
- Choice questions show useful distributions, checkbox questions show
  respondent-based selection counts, numeric and scale questions show averages
  and distributions, free-text questions show non-empty answers, and file
  questions provide authorized downloads.
- CSV export is generated for authorized response readers, includes every
  response identity, preserves stable question order and historical labels,
  represents arrays consistently, includes status/audit context where
  relevant, and is safe to open in spreadsheet software.
- An authorized administrator may delete a response after explicit warning.
  Its uploaded files are removed. Completed callback effects and feedback
  points are not automatically reversed; officers handle any needed external
  compensation.

### Form callbacks

- The builder includes a Callbacks/Automations area containing every explicitly
  registered internal form callback.
- Available callbacks initially include Discord role assignment and recruiting
  notification.
- Each callback shows a human-readable label and description. A callback the
  current editor may not configure remains visible but disabled and explains
  which permission or role is required, so the editor knows whom to contact.
- Editors map callback inputs from compatible form questions, typed fixed
  values, submitter identity, member identity, response identity, submission
  time, or an applicable event identity.
- Fixed values support cases such as entering a specific assignable Discord
  role ID instead of deriving the role from an answer.
- Conditional business behavior belongs to the registered callback itself;
  the generic builder does not expose a general rules engine.
- A form may contain multiple independent callbacks.
- Respondents never see callback configuration, execution status, errors, or
  retry controls.
- After a response is accepted, external callbacks run durably. Authorized
  admins see Pending, Succeeded, or Failed status. Failed callbacks show a
  useful error and may be retried.
- Deleting a response cancels pending callbacks and retains minimal execution
  history for completed or failed callbacks so officers know which external
  effects may need manual reversal.
- Arbitrary webhooks and unregistered tRPC operations are not configurable.
- Event-feedback points and member signup remain locked system behaviors rather
  than removable admin callbacks.

### Member event-feedback experience

- Every qualifying non-hackathon event receives a linked feedback form when
  the event is created.
- No feedback opportunity is created when event visibility requires any of the
  protected organizational roles:
  - Dev Team, Workshop Team, Sponsorship Team, Outreach Team, Design Team, or
    KH IX Team;
  - President, Vice President, Treasurer, Secretary, Hack Lead, Dev Lead, or
    Officers;
  - Design Director, Sponsorship Director, Outreach Director, Workshop
    Director, or Directors.
- Projects and Mentorship roles are intentionally not protected by this
  exclusion; their private events still receive feedback.
- Only a checked-in attendee may submit feedback.
- Feedback has no start-time gate: a checked-in attendee may respond before the
  scheduled event end. It closes seven days after event end, and editing the
  end time always recomputes that deadline.
- Event feedback uses one locked response. It cannot be edited after
  submission.
- The default feedback dialog asks:
  - overall event rating from 1 through 5;
  - fun from 1 through 5;
  - learning from 1 through 5;
  - what worked;
  - what should improve;
  - one discovery source, with Other available.
- Discovery sources are Discord, Instagram, KnightConnect, word of mouth, CECS
  emailing list, Reddit, LinkedIn, class presentation, another club, Google
  Calendar, and Other.
- The five-point reward is independent of every answer and rating.
- The first successful feedback submission awards exactly 5 member points.
  Retries and later system activity never award the points again.
- Feedback actions appear on attended-event cards in `/member/events` and the
  recent-event cards on the member dashboard. There is no `/member/feedback`
  page and no separate respondent route for event feedback.
- Available actions show the due date. With less than 24 hours remaining, the
  due state turns red and displays an exclamation-mark urgency indicator.
- After submission, the event dialog becomes a read-only confirmation showing
  that feedback was submitted and 5 points were earned. It remains reviewable
  after the window closes.
- If an admin deletes the feedback response, the existing reward remains and
  the member remains completed and unable to submit again.

### Event-feedback administration

- Event feedback remains siloed within event administration.
- The normal admin event table shows the included average overall rating on the
  1-5 scale. Activating it opens richer event-feedback metrics.
- Event detail has a dedicated Feedback tab or equivalent focused surface.
- Event readers see included aggregate metrics. Response readers additionally
  see respondent identity, individual answers, raw qualitative responses, CSV,
  and inspection controls.
- Metrics include:
  - included average overall rating;
  - included average fun rating;
  - included average learning rating;
  - rating distributions;
  - a table of every non-empty qualitative answer;
  - a discovery-source pie chart using one response per attendee;
  - useful summaries for any event-specific questions.
- Response readers may exclude any number of responses from the metrics during
  their current inspection. This is local, temporary UI state that resets on
  refresh, does not modify the response, and does not affect CSV.
- The UI distinguishes included and locally excluded counts.
- Officers manage the global feedback template for future events. The core
  analytics questions remain locked so event comparisons stay valid.
- Event editors may add event-specific questions before the event receives its
  first feedback response, but only through the event Feedback surface rather
  than generic form administration.

## Scope

### In scope

- General identified-member form builder, publishing, archiving, sharing, and
  response history.
- Officer-managed sections with separate viewer and editor role access.
- All retained question types, preset catalogs, files, and instruction media.
- Server-authoritative eligibility, scheduling, response-mode, upload, and
  section enforcement.
- Identified response administration, analytics, deletion, authorized file
  download, and CSV export.
- Permission-aware registered callbacks, durable execution status, errors, and
  retry for role assignment and recruiting notification.
- Legacy-form migration into Archive and later direct republishing.
- Event-owned feedback creation, checked-in eligibility, due-date presentation,
  five-point reward, read-only completion, and event-specific analytics.
- Backfill for qualifying future events, in-progress events, and past events
  whose seven-day feedback window remains open at migration time.

### Out of scope

- Anonymous or unauthenticated responses.
- A member directory of open forms.
- Hackathon forms, hacker forms, or hackathon-event feedback.
- A dedicated member feedback inbox or page.
- Editable or multiple event-feedback responses.
- AI-generated feedback synthesis.
- Persisted response hiding/exclusion.
- XLSX export or a dedicated QR-print action.
- Admin-created reusable preset catalogs.
- Arbitrary webhooks or arbitrary untagged tRPC execution.
- General conditional-logic/rules builder for callbacks.
- Automatic reversal or compensation of callback side effects or feedback
  points after response deletion.

## Vocabulary

- `Draft`: An editor-only form that has never been published.
- `Published`: A form whose direct link may accept eligible responses while its
  availability rules permit.
- `Archived`: A retained, non-respondable form omitted from normal lists and
  available through authorized archive views.
- `Section viewer`: A role allowed to inspect forms in a section when it also
  has the global form-read capability.
- `Section editor`: A role allowed to edit forms in a section when it also has
  the global form-edit capability; editing implies viewing.
- `Respondent role`: A form-specific role that controls who may submit and is
  unrelated to admin section access.
- `Locked response`: A submitted response the member cannot edit.
- `Preset catalog`: A code-owned reusable option list referenced by a question.
- `Callback`: An explicitly registered internal action triggered by an accepted
  locked response.
- `Local exclusion`: A response omitted only from the current feedback metrics
  inspection without any persisted response change.
- `Qualifying event`: A non-hackathon event whose visibility does not require a
  protected organizational role.

## Acceptance criteria

- Authorized editors can create a draft, build every supported question type,
  add instruction media, configure access and schedule, publish it, and share a
  stable link or downloaded QR code.
- A member cannot discover open forms through a directory but can complete an
  eligible published form from its direct link and later review the response in
  `/member/forms`.
- Server behavior enforces authentication, published/archive state, schedule,
  manual close, dues, respondent roles, response mode, section access, upload
  constraints, and callback permissions even when client controls are bypassed.
- Officers see and manage every form and section. Non-officer admins see only
  forms permitted by both their global capability and section access.
- Published forms edit in place without changing their link, while historical
  responses retain recognizable question and option meaning.
- Preset additions reach existing forms; removed options cannot be newly chosen
  but remain visible in historical submissions and exports.
- Callback-connected forms are locked, callback mappings use stable fields or
  typed fixed/system values, and respondents receive no callback information.
- Role and recruiting callbacks expose durable per-execution status; failure is
  visible to authorized admins and retry does not duplicate a completed action.
- CSV export is permission-gated, identified, complete, deterministic, and
  spreadsheet-safe.
- Creating or rescheduling a qualifying event creates or updates its linked
  feedback deadline to seven days after event end without a start gate.
- Only a checked-in attendee can submit feedback; the first accepted response
  grants exactly 5 points once.
- Member event cards show feedback availability and due dates, apply the red
  exclamation treatment below 24 hours, and use an in-context dialog.
- Event administration shows comparable 1-5 feedback metrics and identified
  drill-down according to permission, while temporary local exclusions affect
  only the current metric inspection.
- Protected-role and hackathon events never expose a feedback opportunity;
  Projects and Mentorship private events remain eligible.
- Deleting feedback leaves its five-point reward and completed state intact;
  deleting any callback response does not silently claim to reverse external
  effects.
- Migrated legacy forms begin archived and can be deliberately republished with
  current access and availability settings.

## Open questions

- None.
