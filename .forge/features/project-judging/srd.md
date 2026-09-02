# Project Judging SRD

Status: Approved on 2026-08-31

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Replace the unused legacy judging data model with a durable project inventory
owned by `@forge/api`. Blade officers upload a Devpost CSV through a protected
multipart boundary; the API validates and atomically replaces one hackathon's
project inventory. Authenticated judges and officers read that inventory
through permission-gated, server-paginated tRPC procedures.

This slice stops at project import, management, and discovery. It deliberately
does not preserve or extend the old scoring/session implementation. Future
judge-submission work will build on the new project and challenge identifiers.

## Relevant principles

- `docs/agentic-development/forge-engineering-principles.md`: apps are thin
  clients and platform behavior belongs in `@forge/api`.
- The database package owns schema and migrations, not product workflows.
- Business reads and mutations use tRPC. A route handler is allowed here only
  for the multipart file-upload boundary.
- Routine hackathon state is associated with the selected hackathon rather than
  hard-coded by year.
- Blade pages remain server components; client components own the upload,
  filters, modal, and mutation UX.
- Every protected operation enforces access server-side; hiding navigation is
  only a UX layer.
- Multi-table replacement uses a transaction.
- Participant emails and schools are returned only through officer procedures.
  Judge procedures return names without that PII, and audit metadata contains
  no participant PII.

## Access policy

- **Unauthenticated:** no project read or write access. Blade redirects to the
  normal login flow; API and upload boundaries return `UNAUTHORIZED`/401.
- **Authenticated without access:** no project read or write access. Blade
  renders the established forbidden experience, navigation is hidden, and
  server boundaries return `FORBIDDEN`/403.
- **Judge:** effective `IS_JUDGE` may read the automatically selected active
  hackathon, list/filter projects, and open project details. Judge responses
  include team names but omit participant emails and schools. Judge access
  grants no import, edit, delete, restore, hard deletion, or inactive-hackathon
  override.
- **Officer:** existing `IS_OFFICER` bypass semantics grant judge reads and all
  `/admin/projects` management operations. Officers may explicitly preview any
  selected hackathon from the admin workflow; otherwise judge preview resolves
  the active hackathon or nearest upcoming hackathon.

`permProcedure` plus `permissions.controlPerms.or(["IS_JUDGE"], ctx)` protects
judge tRPC reads. Officer operations use the established officer/platform
configuration assertion. The multipart handler must authenticate the Better
Auth session and run the same officer assertion before reading file content or
calling the import service.

## Architecture / data flow

### Ownership

- `packages/db`: new project/challenge schema, relations, and generated
  migration; removal of unused legacy judging tables.
- `packages/validators`: project list/filter, edit, delete, restore, detail, and
  import-result schemas. Import row parsing remains server-only because raw
  Devpost columns are not a public application contract.
- `packages/api`: active/upcoming hackathon resolution, import parser/service,
  replacement transaction, project queries/mutations, permission assertions,
  and audit events.
- `apps/blade`: thin route pages, protected multipart endpoint, admin project
  management UI, judge directory, responsive detail modal, and navigation.
- `@forge/ui`: reuse existing table, dialog, pagination, form, banner, and
  Markdown primitives. Do not move Blade-specific project composition into the
  shared package.

### New durable model

The accepted model is:

```txt
Hackathon
  ├── Project
  │     └── ProjectMember
  └── Challenge

Project ──< ProjectToChallenge >── Challenge
```

`Project` stores:

- `id`, `hackathonId`;
- normalized, non-empty `submissionUrl`, unique per hackathon;
- title and optional Markdown description;
- optional demo and video URLs;
- technologies and universities as ordered text arrays;
- source project-created and submitted timestamps when supplied;
- declared participant count;
- `deletedAt` and nullable `deletedByUserId` for reversible soft deletion;
- created/updated timestamps.

`ProjectMember` stores:

- `id`, `projectId`, stable display order;
- required name and validated email for each imported/editable team contact.

`Challenge` stores `id`, `hackathonId`, exact imported label, normalized
creation-safe label if a distinct safe representation is required, and
created/updated timestamps. Its identity is unique within one hackathon using
the stored post-validation label. `General` is created/reused once per
hackathon.

`ProjectToChallenge` is the composite-key join between projects and challenges.

### Legacy removal

The owner confirmed there is no production data to preserve. The migration may
drop the legacy project/judging model rather than bridge it. The intended removal
set is:

- `knight_hacks_teams`;
- `knight_hacks_challenges`;
- `knight_hacks_submissions`;
- `knight_hacks_judges`;
- `knight_hacks_judged_submission`; and
- `auth_judge_session` if repository inspection confirms no remaining runtime
  consumer after the legacy judge surface removal.

The new tables use unambiguous names rather than reusing `Teams` for projects.
The generated migration must order foreign-key drops before table drops and be
tested against an up-to-date local database.

### Import flow

1. Officer chooses a hackathon and a `.csv` file in `/admin/projects`.
2. Blade posts multipart form data to a protected upload route.
3. The route authenticates and authorizes the officer before buffering or
   parsing the body, enforces file type/size limits, and calls the API-owned
   import service.
4. `csv-parse` parses records with relaxed column counts while preserving
   quoted Markdown, commas, and embedded newlines. The old 2025 importer is
   reference only: its use of `csv-parse/sync`, relaxed widths, a transaction,
   and `General` challenge is useful; its fixed team-email offsets, match-key
   identity, raw tRPC CSV string, and logging of CSV content must not return.
5. The parser validates required Devpost headers and groups all rows by
   normalized submission URL. Repeated rows contribute the union of opt-in
   challenges and do not create duplicate projects.
   Description, prize opt-ins, demo/video links, technologies, and school fields
   are optional; missing technology or school columns produce empty arrays.
6. Project status must start with Devpost's submitted status. Draft/incomplete
   records are counted and excluded.
7. Team cells after `Additional Team Member Count` are consumed as repeated
   first-name/last-name/email triples rather than trusted against the literal
   trailing `...` header. The declared count remains the authoritative,
   independently stored participant count: complete triples become member rows,
   blank triples are skipped, and partially populated or malformed triples
   become rejected-record diagnostics. No member is fabricated to make the
   parsed roster match the declared count.
8. The submitter plus additional team members become ordered member rows. All
   event questionnaire columns, including Discord-handle questions, are
   discarded because Devpost does not provide a sufficiently reliable mapping.
9. Within one transaction, the service locks the selected hackathon row,
   validates the complete replacement set, deletes the old project inventory
   and imported challenges, creates challenges plus `General`, inserts projects
   and members, and inserts challenge joins.
10. Any validation or database failure rolls back the entire replacement and
    leaves the previous inventory visible.
11. The response returns counts for imported projects, excluded drafts,
    collapsed duplicate URL rows, malformed/rejected records, challenges, and
    members. Rejected records include row/project context and a safe reason but
    never echo emails or the raw row.
12. The successful import writes one audit event with hackathon ID, aggregate
    counts, and file size/hash metadata; it does not store raw CSV or PII.

No separate connection pool, job queue, staging database, or background import
system is introduced.

## tRPC/API behavior

A new `projects` router owns the capability. Procedure names should remain
stable and receive Zod/JSDoc descriptions suitable for future generated API
context.

- `projects.listAdminHackathons`: officer-only selector data with project counts.
- `projects.listAdmin`: officer-only paginated project inventory for an explicit
  hackathon, including deleted-state filtering.
- `projects.listJudge`: judge/officer paginated directory. Judges receive only
  the active hackathon; an officer-only optional override supports preview.
- `projects.getDetail`: judge/officer project detail. The server repeats the
  hackathon/access decision rather than trusting a prior list response.
- `projects.update`: officer-only allowlisted field update.
- `projects.delete`: officer-only idempotent soft deletion.
- `projects.restore`: officer-only restoration.
- `projects.dropAll`: officer-only permanent removal of every project, member,
  project challenge, and challenge link for one selected hackathon. The input
  includes the selected hackathon ID and its exact display name as a typed
  confirmation. The transaction locks the hackathon, checks the confirmation,
  deletes projects before challenges, and writes one aggregate audit event.

The multipart endpoint is an upload transport, not a parallel business API. It
calls the same API-owned import service and maps known errors to safe HTTP
responses.

Active selection is inclusive: `startDate <= now <= endDate`. Judges receive
`NOT_FOUND` plus a safe empty-state contract when no hackathon is active.
Officer preview uses an explicit selected hackathon when supplied; otherwise it
uses the active hackathon, then the earliest upcoming `startDate`, with ID as a
stable tie-breaker.

List procedures use server-side offset/page pagination consistent with current
Blade tables, a bounded page-size allowlist, an allowlisted sort field/direction,
case-insensitive title search, challenge filters, and participant-count
bounds. Queries exclude soft-deleted projects except the officer deleted filter.

All mutations return the affected public/admin view model and standardized
`TRPCError` codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, and
`CONFLICT` where appropriate.

## Validation

- Validate UUIDs, pagination bounds, sort keys, participant-count ranges, and
  edit payloads in `@forge/validators`.
- Accept only `.csv` multipart uploads up to 25 MiB; reject larger bodies before
  parsing and verify content structurally rather than trusting MIME type or
  extension.
- Require Devpost headers for title, submission URL, project status, project
  timestamps, submitter identity/contact, participant count, and the dynamic
  team-member anchor. `About The Project` may be omitted or blank.
- Trim and validate URLs, then store their normalized URL string. Reject unsafe
  protocols. Optional blank links become null.
- Preserve imported challenge capitalization and punctuation. Trim accidental
  outer whitespace, reject empty/unsafe or overlong labels, use exact resulting
  equality, and reuse exact `General`.
- Render descriptions with the existing Markdown stack in a mode that does not
  allow raw HTML/script execution. External links use safe target/rel behavior.
- Treat malformed project rows as rejected diagnostics. Do not partially create
  a project whose required fields or team layout cannot be trusted.
- Do not return or log raw CSV rows or member emails in error monitoring or
  audit details.

## Data / migration / compatibility

The owner explicitly approved schema and dependency changes and confirmed the
legacy judging tables hold no production data that must survive.

Migration plan:

1. Remove remaining code/schema relations that consume the legacy judging
   tables.
2. Drop legacy foreign keys and tables in dependency order.
3. Create the new project, project-member, challenge, and join tables with
   hackathon-scoped uniqueness, indexes for list filters, and cascade behavior
   limited to true ownership relationships.
4. Generate the Drizzle migration; never hand-edit snapshots independently.
5. Apply against an up-to-date local DB and verify fresh migration plus rollback
   procedure.

Project deletion is soft. Hackathon deletion may cascade to its project
inventory because the hackathon owns it. Project-member and join rows cascade
from project deletion. Challenge deletion cascades only its join rows. User
deletion sets `deletedByUserId` null rather than preventing auth-user cleanup.

The officer-only drop-all action is the explicit exception to soft deletion. It
permanently deletes the selected hackathon's complete project inventory while
leaving the hackathon itself and every other hackathon unchanged.

Replacement import permanently replaces prior imported project rows, including
soft-deleted rows, and replaces the selected hackathon's challenge set. This is
the accepted bulk-reset behavior.

The production-to-development backup sanitizer classifies every project and
judging table as dropped. The seed workflow must not query retired legacy
judging tables after the migration, and the schema-classification test must
fail when a future table has no explicit keep-or-drop decision.

Rollout is additive at the application surface but intentionally destructive to
the six retired judging-only tables. Deploy migration and compatible application
code together. Their rows are explicitly approved for deletion and do not need
a preservation or pre-deploy emptiness gate; migration validation instead
asserts that non-judging tables and rows remain unchanged.

Rollback before new imports may restore the prior schema migration. After new
imports, rollback requires exporting or intentionally discarding the new project
inventory because there is no legacy-shape compatibility transform.

## Discord integration

No Discord API side effect is part of this slice. Existing Discord-linked role
sync supplies effective `IS_JUDGE` and `IS_OFFICER` permissions. Discord handles
and questionnaire answers are not imported.

## Configurability review

Would this require a developer change next year?

- Answer: No yearly code change is required. Officers choose the hackathon and
  the import derives that event's challenge set and projects from its Devpost
  export. `General` is the only stable product rule.
- Known Devpost column names/aliases are parser contracts rather than
  organizational configuration. Unsupported structural changes produce safe
  diagnostics instead of silently shifting data.

## React / frontend constraints

- Read `apps/blade/DESIGN_SYSTEM.md`, the Forge React skill, frontend-design
  skill, and React analyzer skill before implementation.
- `/admin/projects/page.tsx` and `/judge/projects/page.tsx` remain server
  components that perform auth/access gates and initial stable reads.
- Client components own file selection/upload progress, table filters/sorting,
  pagination transitions, edit/delete/restore mutations, and the detail modal.
- Do not client-refetch server-provided initial data merely to bridge RSC state.
- Provide explicit empty, loading/pending, success, forbidden, no-active-event,
  upload-failure, and mutation-failure states.
- Import replacement requires an explicit destructive confirmation naming the
  selected hackathon and explaining that previous projects, manual edits, and
  challenges will be replaced.
- Drop-all uses one dialog and one typed confirmation. The officer types the
  selected hackathon's display name. The dialog states that active and deleted
  projects, team contacts, and imported challenges are permanently removed.
- Disable duplicate submissions while upload/import is pending. Do not clear the
  selected file or current project inventory until success.
- Use the established responsive table/card strategy. Mobile must retain search,
  filters, project links, and access to the detail modal without horizontal
  interaction traps.
- The modal has an accessible title/description, focus management, close action,
  scroll containment, and safe Markdown/link rendering.
- A familiar Lucide eye button with an accessible name and tooltip appears to
  the left of each judge project title and opens the detail modal.
- Judge list and detail API responses omit participant email and school data.
  The admin list keeps both for officer review and editing.

## Testing / verification strategy

- Parser unit tests in `@forge/api` use sanitized fixtures derived from all four
  supplied export shapes: variable row widths, embedded Markdown/newlines,
  repeated submission URLs, multiple opt-ins, missing optional fields, and
  malformed team triples.
- API integration tests cover atomic replacement/rollback, challenge derivation,
  `General`, URL uniqueness, active/upcoming resolution, soft delete/restore,
  hard deletion, filters/pagination, judge response redaction, and PII-safe
  diagnostics/audit events.
- Access tests cover unauthenticated, ordinary authenticated, judge, and officer
  actors at every read/write boundary, including the multipart route.
- Blade component tests cover import confirmation/results, project table states,
  filters, the typed hard-delete guard, restore, and Markdown detail rendering.
- Playwright covers officer import through judge discovery on desktop and mobile
  using sanitized fixture data.
- Migration validation applies the approved destructive removal of legacy
  judging tables and exercises new constraints, including same-hackathon
  project-to-challenge links.

Expected commands include targeted package tests/typechecks, Blade tests/e2e,
`pnpm db:generate`, `pnpm db:migrate`, `pnpm analyze:react:changed`, and the
repository-wide format/lint/typecheck/push gates documented by Forge.

## Open questions

- None. The owner confirmed removal of
  `auth_judge_session`, a 25 MiB upload limit, independent declared participant
  count, normalized-only URL storage/display, and exclusion of Discord handles.
