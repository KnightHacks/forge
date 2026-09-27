# Forms Delivery and Action Feedback Test Cases

Status: Callback parity regression tests implemented and passing

## API and provider boundary

- **TC-001:** Given a canonical execution UUID, derive a stable string nonce
  of at most 25 characters. Distinct UUIDs (including a difference in the last
  byte) remain distinct. Invalid identities fail before an outbound request.
- **TC-002:** Enqueue a synthetic configured recruiting submission in a
  disposable local test environment; dispatch through the actual database
  dispatcher with mocked Discord. Assert the request meets the nonce limit,
  preserves `enforce_nonce` and mention restrictions, and records Succeeded.
- **TC-003:** Mock a provider rejection. Response remains saved, delivery is
  Failed with bounded error and attempts. Retry uses the same nonce; completed
  and cancelled executions cannot send again. Existing lease tests stay green.
- **TC-004:** No active configuration produces no execution. A valid active
  configuration creates work for new submissions only. Configuration changes
  do not rewrite existing execution inputs or enqueue old responses.
- **TC-005:** Distinguish automatic dispatch of due pending/expired running
  work from explicitly retried failed work. Exercise deleted-response guards.

## Callback editor and responsive browser checks

- **TC-006:** At 320px, 375px, 768px, and desktop widths plus 200% browser zoom,
  open the real callback dialog with a long question prompt, long permission
  label, and active configuration. The dialog and document have no horizontal
  overflow. Save, Disable, and Close remain reachable. Verify real bounding
  boxes and screenshots; jsdom cannot prove layout.
- **TC-007:** Role assignment unavailable, recruiting available: no unavailable
  action is selected for configuration. If none are available, saving is
  disabled with an explanation. Keyboard selection remains usable.
- **TC-008:** Configure every recruiting input independently from compatible
  questions, respondent fields, or fixed values. Team can be fixed. Saved
  labels and source summaries match persisted mappings on reopen.
- **TC-009:** Successful configure/disable updates the visible state and
  announces completion. Failed operations display errors where the user is
  working. Callback saves must not erase unsaved question edits.
- **TC-015:** Catalog discovery includes only tRPC procedures with valid form
  callback metadata and returns their declared input labels, descriptions,
  source restrictions, and placeholders. Duplicate paths cannot occur.
- **TC-016:** Configuration rejects missing or unknown inputs, incompatible
  sources, and reusing one question for two inputs. Fixed-only inputs reject
  respondent and question sources on the server as well as in the UI.
- **TC-017:** Enqueue resolves Member ID, respondent name, respondent email,
  auth user ID, and Discord user ID from the response owner. Similar IDs remain
  distinct and missing nullable profile data fails required inputs visibly.
- **TC-018:** Dispatch resolves the saved registered tRPC path, validates its
  input schema again, and invokes it once. Removed metadata, changed schemas,
  and unknown paths record Failed without reporting success.
- **TC-019:** Recruiting produces the structured applicant embed, configured
  director mention, role-derived team color, restricted allowed mentions, and
  stable execution nonce. An unknown team fails without sending.
- **TC-020:** Discord role assignment accepts a fixed Discord role ID, rejects
  disallowed roles at save and delivery, and grants the allowed role to the
  mapped respondent Discord ID.
- **TC-021:** A disabled callback with complete current mappings exposes Enable
  and reuses those mappings through the configure path. Legacy mappings cannot
  be enabled until an admin edits and resaves them.
- **TC-022:** A question type explicitly declared compatible by callback
  metadata can map to a constrained schema such as graduation year. Types not
  declared compatible are rejected, and submitted values still undergo schema
  validation before execution.

## Member submission and response administration

- **TC-010:** Submit a `multiple_locked` form through the actual route. A clear
  receipt uses the returned response ID, survives refresh, and shows saved
  answers. Only "Submit another response" opens a new blank form.
- **TC-011:** Repeat for `single_locked` and `single_editable`. Locked behavior
  is preserved; updating an editable response visibly confirms the update.
- **TC-012:** Failed submit/update retains answers and exposes an accessible
  error. Pending state prevents repeated clicks. A different user's response
  ID cannot be viewed through the receipt URL.
- **TC-013:** Delete from the response detail. The existing warning precedes
  deletion. Successful deletion closes detail, updates count/list, preserves
  search/tab, and announces success. Rejected deletion retains detail and
  reports the error; cancelled confirmation does not mutate anything.
- **TC-014:** Retry failure is not reported as delivery success. Cancelled rows
  have no Retry button. Friendly names retain diagnostic procedure identifiers
  as secondary detail. Respondents never see callback errors or controls.

## Verification placement and limits

- API contract/dispatch tests: `packages/api/src/tests/forms/`, using the real
  handler with mocked provider and disposable test data where persistence is
  needed. Do not start Cron against a real database to run tests.
- Blade interaction tests: `apps/blade/src/tests/forms/`; browser flows and
  screenshots: `apps/blade/src/tests/e2e/forms-platform.spec.ts` or a focused
  adjacent spec. Test all generic form modes and both desktop/mobile.
- API shared changes require affected Blade/Cron typechecks and tests. Finish
  with required root format/lint/typecheck/test/build checks and changed React
  analysis once implementation exists.
- Production smoke testing is an explicitly authorized maintainer action.
  Local tests must not send Discord messages or load production data.
