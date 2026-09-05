# Judging scores and deliberation SRD

Status: Approved

## Technical purpose

Add configurable rubric, evaluation, aggregate-score, personal history, and private deliberation capabilities to the current room-scoped judging system. Consolidate the officer's project and room work into one command center while keeping old admin links compatible.

## Relevant principles

- Follow `docs/agentic-development/forge-engineering-principles.md`, especially thin apps, shared validators, server-enforced authorization, configurable yearly behavior, auditable mutations, and testable business rules.
- Follow `docs/REPO-CONVENTIONS.md` for Blade server components, tRPC boundaries, database ownership, and package imports.
- Follow `docs/DATABASE-USAGE.md` for current project, challenge, room, judge, and import semantics.
- Follow `apps/blade/DESIGN_SYSTEM.md` for dark-first tokens, border-led hierarchy, full-width workspaces, responsive overlays, accessible reordering, and skeleton parity.

## Access policy

### Unauthenticated users

Ordinary unauthenticated users cannot read judging data. A valid guest judging cookie remains the only unauthenticated entry. The server validates its hashed credential, expiry, revoked link state, room, hackathon, and challenge on every protected judging operation.

### Guest judges

Guest principals can read projects assigned to the room challenge, read the active rubric, save an evaluation while judging is Open, review their own submissions, manage their own deliberation sections while Open, and read a scoped aggregate after submitting in that scope.

Guest inputs never choose `hackathonId`, `challengeId`, or `judgeId` as trusted authority. The API derives those values from the validated guest session. Guests never receive overall scores, out-of-scope projects, other judges' answers, or the member result-visibility override.

### Authenticated member judges

A member principal requires role-derived `IS_JUDGE` or `IS_OFFICER`. The API upserts or resolves the member's hackathon-scoped `Judge` row before personal operations.

Member judges can select an imported challenge, submit and edit within it, see their own submissions, and manage their own deliberation sections. They see an overall rating column. Scoped aggregate visibility follows the own-submission gate unless the hackathon's `displayAllResultsToMembers` setting is true.

### Officers

Officer procedures use `permProcedure` and call an explicit `IS_OFFICER` guard before any database work. Officers configure the rubric and judging state, control member result visibility, import projects, manage rooms and QR links, and inspect evaluation revision history for audit or dispute resolution.

Every officer mutation has audit coverage. Evaluation text does not enter generic audit metadata.

## Architecture and data flow

- `@forge/db` owns the new tables, enums, relations, indexes, and generated migration.
- `@forge/validators` owns rubric, evaluation, deliberation, lifecycle, and reorder schemas.
- `@forge/api` owns principal resolution, lifecycle rules, score math, visibility filtering, import guards, transactions, and audit events.
- Blade pages remain server components. They authenticate, check route access, load initial tRPC data, and render feature components.
- Blade client components own dialogs, tabs, optimistic movement, mutations, toasts, URL state, and `router.refresh()` after server-prop changes.
- Do not add REST routes. The existing guest-cookie exchange remains the auth boundary established by `judging-magic-access`.

### Judge page flow

1. The server resolves the guest or member principal and loads hackathon context, rubric, lifecycle state, current challenge, project rows, the judge's submissions, and deliberation sections needed for the selected tab.
2. `Projects` sends challenge selection through URL state for members. Guests receive a locked challenge control or label.
3. Opening an evaluation uses the loaded rubric and project summary. Submitting calls a principal-aware mutation.
4. The API derives scope, validates lifecycle and answers, upserts the current evaluation transactionally, stores a revision snapshot, and returns the fresh score visibility state.
5. The client closes the overlay, shows a toast, and refreshes server-rendered data.

### Score math

For evaluation `e` with `n` quantitative answers:

`evaluationMean(e) = sum(answer.value) / n`

For project `p` and challenge `c` with `m` evaluations:

`scopedMean(p, c) = sum(evaluationMean(e)) / m`

For project `p` with `k` evaluations across all challenges:

`overallMean(p) = sum(evaluationMean(e)) / k`

Each completed evaluation has equal weight. Do not average criterion columns globally, weight challenges equally, normalize judges, or round stored data. Compute with database numeric expressions or application decimals and round only the displayed value to two decimal places. Return the evaluation count with an aggregate. No evaluations returns `null`, rendered as `(?)`.

### Short-response visibility

Each short-response rubric item stores separate policies for member and guest judges with enum values `public`, `public_optional`, and `private`.

- `public`: the judging team may read the response.
- `public_optional`: the author chooses at submission time. Default the choice to private.
- `private`: only the author and officers handling a judging dispute may read it.

The default rubric policy is `public` for member judges and `public_optional` for guests. This matches the current product rule that authenticated judge feedback is public while retaining an explicit schema for future hackathons. The command center presents both policies. For KH IX, the member policy control is fixed to `public`; changing that policy requires an explicit future product decision.

Project teams do not receive short responses in this slice.

## tRPC and API behavior

Extend the current project and judging routers rather than introducing a parallel auth stack. Procedure names may adapt to existing router organization, but the capabilities are:

### Judge reads

- `projects.listJudge`: add `ownEvaluation`, `scopedRating`, `overallRating`, and visibility-safe counts. Preserve pagination, search, challenge filtering, and guest scope.
- `judging.getWorkspace`: return lifecycle state, display-safe rubric items, principal kind, selected challenge, room context, and result visibility flags.
- `judging.listMySubmissions`: return only the resolved judge's evaluations with answers, computed score, project availability, challenge, and timestamps.
- `judging.listMyDeliberation`: return only the resolved judge's ordered sections and entries.

### Judge mutations

- `judging.saveEvaluation`: create or edit one evaluation for the resolved judge, project, and derived or selected challenge. Reject Draft and Closed states, deleted projects, ineligible challenges, incomplete quantitative answers, invalid visibility choices, and stale guest access.
- `judging.createDeliberationSection`, `renameDeliberationSection`, `deleteDeliberationSection`, and `reorderDeliberationSections`.
- `judging.addDeliberationProject`, `removeDeliberationProject`, and `reorderDeliberationProjects`.

Every deliberation mutation checks ownership and lifecycle state. Adding a project also checks that the judge has an evaluation for that project in any eligible challenge.

### Officer reads and mutations

- `judging.getCommandCenter`: load hackathon config, rubric, project/import summary, rooms, QR state, and live roster through bounded queries.
- `judging.saveRubric`: replace ordered rubric items only while Draft and before the first evaluation. Stable item IDs carry identity through edits and reordering.
- `judging.setState`: permit Draft to Open only with at least one rating item. Permit Open to Closed and Closed to Open. Do not return to Draft after an evaluation exists.
- `judging.setDisplayAllResults`: update the member-only result setting.
- Existing room, link, revoke, import, restore, and project procedures remain callable and appear in the command center.

Use stable error codes and plain messages for `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, and `BAD_REQUEST`. Never reveal whether an out-of-scope guest project or challenge exists.

## Validation

Add shared Zod schemas with the following rules:

- rubric label: trimmed, 1 to 120 characters;
- rubric description: trimmed, optional, at most 500 characters;
- rubric kind: `rating` or `short_response`;
- rubric array: stable IDs unique, display orders normalized;
- rating answer: integer from 1 through 5;
- short answer: trimmed, at most 2,000 characters, optional unless the item marks it required;
- response visibility: accepted only for `public_optional`; the server derives it for `public` and `private`;
- project and challenge IDs: positive integers;
- section name: trimmed, 1 to 80 characters;
- reorder payload: unique positive IDs, complete membership checked against server state;
- selected tab: `projects`, `submissions`, or `deliberation`;
- judging state: `draft`, `open`, or `closed`.

The server validates that answer item IDs exactly match the current rubric's required items. Reject missing, duplicate, extra, or wrong-kind answers. Opening judging requires at least one rating item.

## Data, migration, and compatibility

### Configuration

Extend `HackathonJudgingConfiguration` with `state`, enum `draft | open | closed`, default `draft`; `displayAllResultsToMembers`, boolean, default `false`; and nullable `openedAt` and `closedAt` timestamps.

Keep the existing inventory-lock fields. A missing configuration row behaves as Draft with result display disabled.

### Rubric

Add `JudgingRubricItem` with `id`, `hackathonId`, `kind`, `label`, `description`, `displayOrder`, `required`, `memberVisibilityPolicy`, `guestVisibilityPolicy`, and timestamps. Visibility policy columns are null for rating items and required for short-response items. Add unique `(hackathonId, displayOrder)` and same-hackathon relation checks where supported.

### Evaluations

Add:

- `ProjectEvaluation`: hackathon, project, challenge, judge, revision, created and updated timestamps, unique `(judgeId, projectId, challengeId)`;
- `ProjectEvaluationRating`: evaluation, rubric item, integer value, unique `(evaluationId, rubricItemId)`;
- `ProjectEvaluationResponse`: evaluation, rubric item, text response, resolved `isPublic`, unique `(evaluationId, rubricItemId)`;
- `ProjectEvaluationRevision`: evaluation, revision number, actor kind, rating and response snapshots as protected JSON, created timestamp, unique `(evaluationId, revision)`.

Use composite foreign keys or transactional same-hackathon checks so project, challenge, rubric, judge, and evaluation records cannot cross hackathons. Ratings need a database check constraint from 1 through 5.

An edit writes a complete snapshot as the next revision in the same transaction. Generic audit logs record the mutation and identifiers, never response text.

### Deliberation

Add:

- `JudgeDeliberationSection`: hackathon, judge, name, display order, timestamps, unique `(judgeId, displayOrder)`;
- `JudgeDeliberationEntry`: section, project, display order, timestamps, unique `(sectionId, projectId)` and `(sectionId, displayOrder)`.

Project foreign keys use restrict for hard deletion. Section deletion cascades to its entries. Judge deletion follows the existing identity retention policy.

### Import and deletion rules

- The first evaluation sets the existing inventory lock if it is not already set.
- After any evaluation exists, an ordinary Devpost import remains add-only and identifies new projects by normalized Devpost URL.
- Full replacement returns `CONFLICT` after any evaluation exists, even if all QR links are revoked.
- Hard project deletion returns `CONFLICT` when evaluations or deliberation entries reference the project.
- Soft deletion remains available to officers. Personal submissions and deliberation return the row with `available: false` and disable navigation or editing.
- Never cascade-delete evaluations, responses, revisions, or deliberation entries from a project operation.

### Backup policy

Treat evaluations, text responses, revisions, and deliberation lists as sensitive judging data. Add the new tables to the same development-backup exclusion policy as judge identities and guest sessions unless the repository's sanitizer supports deterministic replacement.

### Compatibility and rollout

- Preserve `/admin/projects` with a server redirect to the project command center's projects tab.
- Preserve current guest QR URLs and cookies.
- Existing hackathons start in Draft and have no rubric until an officer configures one.
- The migration is additive. Rollback drops only new tables and columns before production data exists. After evaluations exist, rollback requires an explicit data export and maintenance window.

## Discord integration

No new Discord calls or role writes. Member access continues to use the existing role permission model. The server reads `IS_JUDGE` and `IS_OFFICER`; Discord remains the source of role membership.

## Configurability review

Would this require a developer change next year?

- No for criterion count, labels, descriptions, order, required state, short-response policies, judging state, project inventory, challenges, rooms, or the member result reveal.
- A code change is appropriate only for a new answer type, a different score formula, or a new access model.

## React and frontend constraints

- Keep route pages thin and server-first. Do not put `use client` on a page.
- Pass server-read data into client feature components. Do not immediately re-fetch it with client tRPC.
- Use `Tabs` with URL-backed state. Keep guest restrictions visible and disabled rather than hiding the current challenge.
- Use the existing responsive project table and mobile cards. Add `Rating` and member-only `Overall rating` columns without creating document-level horizontal overflow.
- Use a dialog on desktop and a viewport-safe drawer or dialog on mobile for evaluation and bounded rubric editing.
- Use radio groups or segmented 1 through 5 controls with visible numeric labels, 44px targets, keyboard input, and focus rings.
- Show feedback visibility beside each text field and again near Submit. Do not rely on color alone.
- Deliberation uses pointer drag and drop, keyboard movement, and explicit move buttons. Stable database IDs carry identity.
- Mutation success closes overlays, shows a toast, and refreshes server props. Failure leaves entered data intact and places the error beside the action.
- Add route-level loading files or equivalent skeletons for the judge workspace and command center. Skeleton geometry must match the loaded desktop and mobile layouts.
- Use only design tokens and existing `@forge/ui` primitives. Gold is limited to live or award-related status, not ordinary controls.
- Verify at 1440 by 1000, 390 by 844, and 320px width. Honor reduced motion.

## Testing and verification strategy

- Validator unit tests cover rubric and evaluation payloads.
- API unit or integration tests cover principal scope, lifecycle, visibility, score math, editing, revision history, and mutation authorization.
- Database migration checks cover a fresh database and an upgrade from the current schema.
- Blade component or Playwright tests cover the three tabs, dialog copy, score gating, command center controls, mobile behavior, and accessible reordering.
- Add deterministic visual baselines only if the fixture can isolate the judging hackathon and project rows. Otherwise capture review screenshots without committing them.
- Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm analyze:react:changed`, relevant package tests, migration checks, Blade build, and targeted Playwright tests.

## Open questions

None. The human approved this SRD and the 20-case test plan on 2026-09-05.
