# Project Judging Test Cases

Status: Approved on 2026-08-31

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

These fifteen cases cover only the highest-value contracts for this slice:
Devpost parsing, authoritative replacement, access, migration, project
maintenance, and basic judge discovery. Future scoring, feedback, assignment,
room, session, ranking, and winner-selection passes will define their own cases.

## Test placement plan

- **`packages/api`:** sanitized parser fixtures plus service/router integration
  tests for replacement, access, selection, CRUD, filters, and audit behavior.
- **`packages/validators`:** focused project input and URL validation tests.
- **`packages/db`:** migration and constraint verification.
- **`apps/blade`:** critical import, table, empty-state, and modal component tests.
- **Playwright:** one sanitized officer-import-to-judge-discovery flow on desktop
  and mobile.

Exact commands are recorded in `status.md` when implementation tests are
generated.

## Test cases

### TC-001: Supported Devpost export shapes import correctly

Setup:

- An officer selects an existing hackathon.
- Four small synthetic fixtures reproduce the supplied Bloom Knights, Gemi
  Knights, Knight Hacks VI, and Knight Hacks VIII structures without source PII.
- Fixtures include quoted commas, embedded Markdown/newlines, optional blanks,
  variable-width team triples, repeated URLs, and multiple opt-ins.

Action:

- The officer imports each fixture independently.

Expected observations:

- Exactly one project exists per normalized submission URL.
- Project fields and ordered member names/emails remain aligned.
- Repeated rows contribute the union of exact opt-in challenges.
- Questionnaire fields and Discord handles are never imported.

### TC-002: Submitted selection and challenge rules are deterministic

Setup:

- Projects include submitted visible/hidden/pending variants, draft-only rows,
  and one URL with both draft and submitted rows.
- Challenge values include blanks, `General`, exact duplicates, outer whitespace,
  and capitalization variants.

Action:

- The file is imported.

Expected observations:

- A project is included when at least one row is submitted; only submitted rows
  supply authoritative fields/challenges.
- Draft-only projects are excluded and counted.
- Outer challenge whitespace is trimmed, while case/punctuation remain
  significant.
- Exactly one `General` exists and is associated with every project.

### TC-003: Valid projects survive rejectable malformed groups

Setup:

- A structurally valid file contains valid projects, malformed project groups,
  and duplicate-URL groups with conflicting title, description, or submitter.
- One project declares a participant count different from its complete roster.

Action:

- The officer imports the file.

Expected observations:

- Valid projects import; malformed/conflicting groups are rejected rather than
  resolved by row order.
- Declared participant count remains independent and no member is fabricated.
- Safe diagnostics report counts/context without raw rows, prose, names, or
  emails.

### TC-004: Replacement is authoritative, atomic, and hackathon-scoped

Setup:

- Two hackathons have inventories.
- The selected one has manual edits, soft-deleted projects, members, challenges,
  and joins.
- Scenarios include a valid replacement, a forced database failure, and two
  concurrent replacements.

Action:

- Each scenario runs.

Expected observations:

- Success leaves only the selected hackathon's accepted replacement inventory
  and `General`; the other hackathon is unchanged.
- Failure rolls back to the complete prior inventory.
- Concurrent imports serialize and never produce a mixed inventory.

### TC-005: Import confirmation and result are operationally clear

Setup:

- An officer selects a populated hackathon and a CSV.

Action:

- The officer cancels, then repeats and confirms the replacement dialog.

Expected observations:

- Cancel performs no upload.
- The dialog names the hackathon and explains replacement of projects, edits,
  deleted projects, and challenges without typed confirmation.
- Duplicate submission is disabled while pending.
- Success reports imported, excluded-draft, collapsed-duplicate, and rejected
  counts.

### TC-006: Canonical URLs and PII-safe auditing hold

Setup:

- Valid URLs contain accidental outer whitespace and synthetic project/member
  PII.

Action:

- An officer imports and views the projects.

Expected observations:

- Normalized URLs are the only stored/displayed representation.
- The import audit records actor, hackathon, aggregate counts, file size, and
  safe hash metadata.
- Raw CSV, descriptions, names, emails, and questionnaire values are absent from
  logs, diagnostics, and audit metadata.

### TC-007: Officer can edit, soft-delete, and restore one project

Setup:

- A project has members and challenge associations.

Action:

- An officer edits all allowlisted fields, confirms deletion, views deleted
  projects, and restores it.

Expected observations:

- Edits persist; deletion removes it from normal admin/judge reads.
- Restore returns fields, members, and challenge associations unchanged.
- Each mutation has a PII-safe audit event and no batch-delete control exists.

### TC-008: Hackathon selection follows actor and date rules

Setup:

- Past, active, and upcoming hackathons exist, including exact boundaries and
  tied upcoming start times.

Action:

- A judge and officer open the project directory with/without an officer
  override.

Expected observations:

- `startDate <= now <= endDate` is active.
- Judges see only the active hackathon and cannot override it.
- Officer selection order is explicit override, active, then nearest upcoming
  with stable ID tie-breaking; recently ended does not win.

### TC-009: Judge directory discovery controls compose correctly

Setup:

- The active hackathon has multiple pages of varied and soft-deleted projects.

Action:

- A judge searches titles, sorts, paginates, and combines/clears challenge and
  participant-count filters.

Expected observations:

- Server results, totals, page boundaries, and ordering remain consistent.
- Only matching non-deleted projects appear; clearing restores the full result.

### TC-010: Project details are safe and responsive

Setup:

- A project contains long Markdown, approved details/contact data, attempted raw
  active HTML/script, and unsafe URLs.

Action:

- A judge opens the modal on desktop and mobile.

Expected observations:

- Approved Markdown/details render legibly and authorized names/emails appear.
- Unsafe content does not execute; external links use safe behavior.
- Focus, scrolling, closing, and mobile layout remain accessible.

## Negative / regression cases

### TC-NEG-001: Access is enforced before reads or upload processing

Setup:

- Unauthenticated, ordinary authenticated, judge, and officer actors exist.

Action:

- Each attempts project reads, multipart import, edit, delete, and restore.

Expected observations:

- Judge/officer may read; only officer may mutate/import.
- Others receive established login/401 or forbidden/403 behavior.
- Upload authorization happens before buffering/parsing; hidden navigation is not
  the security boundary.

### TC-NEG-002: Invalid files preserve the existing inventory

Setup:

- A hackathon has projects.
- Inputs include a body over 25 MiB, empty/invalid CSV, headers-only CSV, missing
  required headers, unsafe URLs, and zero accepted submitted projects.

Action:

- An officer attempts each import.

Expected observations:

- Oversized content is rejected before parsing; other failures return safe,
  specific reasons.
- Inventory remains unchanged with no partial write or success audit.
- Raw content and PII are not logged.

### TC-NEG-003: Judge empty states do not leak inactive data

Setup:

- Scenarios include no active hackathon, active with no imported projects, and a
  filter with zero matches.

Action:

- A judge opens the directory.

Expected observations:

- Distinct states explain no active event, projects not imported, and no filter
  matches.
- None appears as forbidden or exposes inactive/deleted projects.

### TC-NEG-004: Invalid mutations fail without partial state

Setup:

- Requests contain missing/cross-hackathon IDs, unsafe URLs, invalid participant
  bounds, unsupported sort/page values, unauthorized overrides, and a restore
  whose required associations are missing.

Action:

- Relevant actors submit the requests.

Expected observations:

- Stable `NOT_FOUND`, `BAD_REQUEST`, `FORBIDDEN`, or `CONFLICT` behavior is
  returned without database leakage.
- No invalid edit or broken restoration becomes visible.
- Direct project-to-challenge links across hackathons violate the scoped
  composite foreign keys and are rejected by PostgreSQL.

### TC-NEG-005: Migration removes only approved legacy judging data

Setup:

- Legacy team, challenge, submission, judge, judged-submission, and
  judge-session tables may contain disposable data approved for removal.

Action:

- The generated migration is validated and applied.

Expected observations:

- The approved legacy tables are removed and new project/member/challenge/join
  constraints and indexes exist.
- No runtime code references removed exports.
- Non-judging tables and rows are unchanged.

## Open questions

- None blocking test-case approval.
