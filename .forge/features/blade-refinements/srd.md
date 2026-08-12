# Blade Refinements SRD

Status: Approved for implementation — technical discovery prerequisites remain

## Technical purpose

Refine the current production Blade shell and member/admin surfaces without
creating parallel product architectures. Fix localized regressions at their
owning boundaries, extend the existing attachment model for issue images and a
form banner, and preserve current permission, audit, Forms, and Discord delivery
invariants.

This bundle starts from `origin/main` commit `78857b85` on branch
`reforge/refinements` in `/Users/dvidal/Documents/forge-refinements`.

## Relevant principles

- Follow `docs/agentic-development/forge-engineering-principles.md`: make access
  policy explicit, keep apps thin, place business logic in `@forge/api`, validate
  at boundaries, preserve external-side-effect idempotency, and keep clients
  responsive but non-authoritative.
- Follow `docs/agentic-development/frontend-design.md` and
  `apps/blade/DESIGN_SYSTEM.md`: reuse Blade primitives, preserve the grid-shell
  visual language, test 320 px and long-content states, and keep focus behavior
  deliberate.
- This bundle supersedes the hover/focus desktop-rail decision in
  `admin-member-dashboard`, the intentionally divergent mobile composition in
  `mobile-member-experience`, and the prominent paid-dues/desktop-QR placement
  decisions where they conflict with this spec. It does not erase their other
  accepted behavior.
- The existing `forms-and-event-feedback` attachment and instruction-media
  contracts remain authoritative. Extend them rather than build a second upload
  system.
- The existing `club-operations-issues` contracts remain authoritative except
  that native managed **image** attachments are now explicitly in scope and the
  reminder link label changes from `Discuss` to `Chat`.

## Access policy

- `/` remains available without authentication. Session state changes its CTA,
  not its visibility.
- Member Dashboard, Settings, resume/photo operations, QR, dues, previous forms,
  and Guild preferences retain their current authenticated-member access.
- The shell derives ordinary-member versus admin navigation from the same
  server-authoritative capability projection used today. Hiding the sidebar is
  presentation only and grants no access.
- Admin routes and procedures retain their existing capability requirements.
- Issue image create/finalize/remove/read operations require the same issue edit
  or read access respectively as the owning issue. A link or guessed attachment
  ID is insufficient.
- Form banner upload/finalize/remove requires existing form edit access. Banner
  read requires the same respondent/editor visibility required to read the
  owning form in its current state.
- Issue history and Admin log reads retain their existing permissions. Name
  enrichment must not expose Member data to a caller who cannot read the row.
- System actors stay nullable/non-member actors and never resolve through a
  coincidental display-name match.

## Architecture / data flow

### Blade shell and page hierarchy

- Keep Next.js page modules server-first. The server computes the session,
  current member, and authorized admin navigation projection; focused client
  components own transient rail/drawer state.
- Replace CSS `hover`/`focus-within` expansion in `AuthenticatedShell` with an
  explicit desktop state. Do not persist the expanded state: selecting a link
  closes it by product definition, and each full navigation begins collapsed.
- Model navigation as destination groups rather than infer sections from labels
  in render components. Filter unauthorized children first and omit empty groups.
- Ordinary members render no desktop/mobile nav rail. Reuse the shared account
  controls for the top-right Settings and Sign out actions.
- Link the product mark to `/`; remove the authenticated redirect from the root
  page and select CTA copy/href from the session.
- Centralize compact title/help behavior in `AdminPageHeader`. Consumers continue
  to provide meaningful descriptions during migration; the shared component
  exposes the description alone through an accessible tooltip, does not project
  the old eyebrow copy, and removes obsolete skeleton rows.

### Member dashboard and localized regressions

- Refactor duplicated mobile/desktop dashboard blocks into shared semantic
  sections rendered once and laid out responsively. Keep Guild prominent and its
  current mutation procedures authoritative.
- Derive paid/unpaid rendering from the existing dues status query. The paid
  badge's tooltip is accessible by hover and keyboard focus; unpaid payment
  behavior is unchanged.
- Resume upload mutations return/use the existing successful result but set an
  inline success state instead of opening the viewer. The explicit View control
  opens the existing preview.
- Gate saved-photo removal behind the shared confirmation dialog; do not issue
  the mutation before confirmation.
- Remove the `key={input.query}` remount boundary from the admin members page and
  preserve debounced URL/result updates without replacing the active input.
- Split legacy employment normalization errors from current entry validation.
  Map Zod issues to entry/field UI and retain a form-level summary for assistive
  technology.
- Apply issue line-break styling at the issue description renderer/preview
  boundary rather than changing every `MarkdownContent` consumer.
- Reproduce the issue-assignee failure against the production-base code before
  selecting a fix. Add a regression at the smallest failing UI/API boundary.
- Resolve comparison-chart label collisions through deterministic placement,
  abbreviated labels, staggering, or collision-aware rendering; do not remove
  the existing text alternative.

### Managed issue images

- Reuse the Forms attachment service/object-storage conventions where practical:
  create intent, direct upload, finalize after metadata verification, reference
  from the owning entity, authorize short-lived read, and durably clean abandoned
  or removed objects.
- `@forge/api` owns issue access checks, upload lifecycle, ownership, cleanup
  scheduling, and history/audit semantics. Blade only requests intents, uploads
  bytes, finalizes, and inserts the returned stable attachment reference into the
  description model.
- `@forge/validators` owns image MIME/size/count/alt-text inputs. Server-side
  checks are authoritative and verify stored object metadata at finalization.
- Accept PNG, JPEG, WebP, and GIF up to 10 MB per image and at most 10 retained
  managed images per issue. Allow animated GIFs and reject SVG.
- Blade supports file selection, clipboard paste, and drag/drop through one
  upload pipeline, then inserts the finalized managed reference at the current
  description cursor.
- Prefer an additive generic attachment row/ownership relation if the current
  Forms model supports a safe new owner type. Do not store data URLs or permanent
  public bucket URLs in issue Markdown.
- The rendered description resolves a managed attachment reference only after
  issue-read authorization and returns a short-lived/download response. Sanitize
  ordinary external Markdown URLs under the existing Markdown policy.
- Removing an image removes its description reference immediately and schedules
  object cleanup only when no retained issue revision/reference owns it. Abandoned
  intents expire. Issue history records a safe structural image change without
  embedding signed URLs or file bytes.

### Form banner and existing instruction media

- The current `formDefinitionSchema.instructions` image/video blocks, builder
  upload procedures, and authorized respondent rendering already satisfy the
  instruction-media capability. Add focused regression coverage and improve
  discoverability only; do not revive the unrelated legacy
  `FormSchemaValidator.banner` URL field.
- Extend the active forms-platform definition with an optional managed banner
  reference, ideally an attachment ID plus alt text. Reuse the existing form
  attachment create/finalize/read/cleanup pipeline with a distinct `banner`
  purpose.
- Form create/update validation verifies the banner belongs to the same form,
  was finalized by an authorized editor, and is an allowed image. Replacing or
  removing it schedules the old unreferenced object for cleanup.
- Draft preview and respondent acquisition both project the same authorized
  banner model in a responsive 4:1 `cover` frame. The builder provides crop
  guidance, preview, and editable alt text. Do not expose a raw object name,
  storage key, or durable public URL to the client.
- A schema migration may be avoidable if the versioned JSON definition owns the
  banner reference; confirm the current persisted form revision model before
  changing `@forge/db`. Any required migration must be additive and separately
  documented in the implementation plan/status before execution.

### Actor display enrichment

- Issue history and Admin log queries should batch-resolve non-null linked Member
  IDs and project `firstName + lastName` when both/available name fields produce a
  non-empty display value.
- Fall back to the immutable stored actor snapshot when no linked Member exists,
  the profile was removed, or the resolved name is empty. Preserve explicit
  system labels.
- Resolve at read time so historical rows improve without mutation or migration.
  Avoid N+1 queries and do not join actors by Discord username/text.

### Discord reminder projection

- In `@forge/api` reminder presentation, render the sanitized issue title as the
  Blade link and append a literal separator plus linked `Chat` only when a valid
  thread URL is present.
- Preserve current Components V2 limits, allowed mentions, role/user pings,
  grouping, delivery ledger, stable nonce/idempotency, and no-live-write test
  defaults.

## tRPC/API behavior

- Existing procedures should remain backward-compatible unless a new result
  field is required for attachment/banner projection.
- Add issue-image intent/finalize/remove/read procedures under the issue router or
  shared attachment service, each with `.meta({ description })`, shared Zod input,
  permission checks before object work, and non-enumerating `NOT_FOUND` behavior
  where appropriate.
- Extend existing Forms upload procedures with `purpose: "banner"` rather than
  creating an unrelated endpoint. Existing `instruction` and respondent-file
  purposes remain unchanged.
- Name-enriched history/log results may add/replace the presentation label while
  retaining stored snapshot data internally for fallback. Do not make clients
  assemble Member names.
- The issue assignee filter fix must preserve pagination and all other filters;
  capture the failing query before changing it.
- Business logic remains tRPC/platform logic. Do not add REST business endpoints.

## Validation

- Use shared Zod validators for navigation group shape where shared, active form
  definition/banner data, attachment lifecycle inputs, image policy, and actor
  projection outputs.
- Keep client file `accept` hints aligned with server policy, but validate size,
  MIME, owner, authorization, and finalized state on the server.
- Normalize and reject empty alt text for managed images unless the approved UI
  explicitly supports a decorative-image flag.
- Preserve existing issue title/description, employment, Forms, and reminder
  limits. Newline presentation does not alter stored description text.
- Validate all external/thread URLs before Discord projection and escape user
  text under existing message safety rules.

## Data / migration / compatibility

- Navigation, headers, member composition, local regressions, and reminder label
  changes require no data migration.
- Actor display enrichment is read-time only and preserves all immutable history
  and audit rows.
- Managed issue images require durable owner/reference metadata and cleanup
  state. Prefer extending the existing attachment schema; if a new owner relation
  or enum requires a migration, make it additive and keep old issues readable.
- Form banner references should live in the active versioned definition when that
  maintains historical response rendering. Never reuse the stale legacy banner
  URL shape as authority without a compatibility analysis.
- Old forms with no banner and old issues with external Markdown images remain
  readable. Rollback hides new authoring controls but must not corrupt retained
  references or make existing issue/form pages fail.

## Discord integration

- No role, permission, guild, cadence, or channel configuration changes.
- Guild links in Blade are visually identified as external, but Guild remains an
  intentional prominent member feature.
- Reminder content changes only from the previous secondary link wording/layout
  to linked `Title | Chat` when a thread exists.
- Actor name presentation in Blade does not rewrite Discord messages or Discord
  identities.

## Configurability review

Would this require a developer change next year?

- Answer: Navigation groups and stable platform destinations remain code-owned;
  form banners, instruction media, issue images, dues state, profile content, and
  names are data-driven.
- Hard-coding the information architecture is acceptable because destinations
  and permission enums ship with code. Adding a new admin domain should require
  assigning its route to a group in the same navigation registry.
- Upload limits should use shared named policy constants rather than scattered UI
  literals once the human approves them.

## React / frontend constraints

- Do not add `"use client"` to route pages. Keep transient rail, tooltip, dialog,
  upload, and focus behavior in the smallest existing client component.
- Use existing `@forge/ui` Button, Tooltip, Dialog/AlertDialog, Badge, Skeleton,
  and Markdown primitives. Promote a new primitive only if a second real consumer
  justifies it.
- Preserve semantic navigation, `aria-current`, accessible icon labels, keyboard
  activation, focus visibility, tooltip focus support, dialog focus return, and
  reduced-motion behavior.
- No hover-only action may be required. Rail opener, collapsed destinations,
  paid tooltip, info tooltip, uploads, and removal remain keyboard-accessible.
- Avoid parallel mobile/desktop component trees for the member dashboard. Use
  responsive CSS around one semantic composition.
- Test long strings and 320 px; do not rely on `overflow-x-hidden` to conceal
  layout bugs.
- Reserve media geometry to avoid layout shift and provide loading, broken-media,
  upload progress, success, and failure states.

## Testing / verification strategy

- Component/unit tests in `apps/blade` for header semantics, navigation state and
  grouping, member dues/dashboard composition, resume/photo behavior, employment
  errors, member-search focus, issue Markdown/images, Forms banner/instruction
  media, and responsive class/DOM contracts.
- `@forge/api` integration/unit tests for issue filter reproduction, attachment
  authorization/lifecycle, form banner ownership, actor enrichment, and reminder
  formatting/idempotency preservation.
- Validator tests for managed-image and active form-definition banner shapes.
- Playwright desktop, intermediate-width, and 320 px journeys with long-content
  fixtures, ordinary member/admin actors, paid/unpaid states, and authorized/
  unauthorized media access.
- Run focused package tests while implementing; then React analyzer for changed
  frontend surfaces, `pnpm verify:precommit`, relevant reviewers selected from
  the diff, and final `git diff --check`.
- No live Discord write during automated tests. Any staging reminder smoke must
  be separately intentional and retain the approved no-ping safety path.

## Open questions

- Before implementation, confirm whether the active attachment schema can accept
  Issue and Form-banner owner types without a database migration.
- Reproduce and record the exact issue-assignee failure before selecting its
  repair.
