# Guild Career Network SRD

Status: Proposed

## Technical purpose

Replace the single free-text member company field with a durable company
directory and multi-entry employment history. Expose the same platform
capability to Blade membership, Member Settings, Member Admin, and public Guild
without adding a new domain package or REST API.

## Relevant principles

- [Agentic Development Framework](../../../docs/agentic-development/README.md)
- [Forge Engineering Principles](../../../docs/agentic-development/forge-engineering-principles.md)
- [Database Usage](../../../docs/DATABASE-USAGE.md)
- [Frontend Design Skill](../../../docs/agentic-development/frontend-design-skill.md)
- [Blade Design System](../../../apps/blade/DESIGN_SYSTEM.md)

The implementation keeps apps thin, owns business behavior in `@forge/api`,
stores schemas and migrations in `@forge/db`, and owns reusable input/output
contracts in `@forge/validators`.

## Access policy

### Public

- Read approved companies represented by public employment entries.
- Read public company detail and member relationships.
- Read current-city globe clusters and profiles only when the member's Guild
  profile and current city are public.
- Public procedures must exclude pending, rejected, and merged companies.

### Logged-in member

- Read approved companies and companies created by that member.
- Search the U.S. city catalog.
- Create a pending company.
- Create, update, replace, or delete employment owned by that member.
- Update the member's current city and location visibility.
- A member cannot approve a company, edit canonical company metadata, alter
  another member's employment, or create an unconfirmed employment state.

### Permission-based officer/admin

- `READ_MEMBERS` or `EDIT_MEMBERS` can read company intelligence and member
  relationships.
- `EDIT_MEMBERS` can approve, reject, edit, alias, and merge companies and can
  correct member employment through the existing admin member capability.
- Existing officer bypass behavior remains authoritative through the control
  permissions router. Client-side navigation is not an authorization boundary.

## Architecture / data flow

### Database

Add exactly two domain tables.

`Company` owns:

- UUID primary key.
- Display name and normalized display name.
- Optional legal name and domain.
- Aliases as a text array.
- Review state: `pending`, `approved`, `rejected`, or `merged`.
- Optional self-reference to the canonical company after a merge.
- Optional creating user reference so a signed-in prospective member can
  propose a company before their Member row exists.
- Created and updated timestamps.

`Employment` owns:

- UUID primary key.
- Member and company foreign keys.
- Optional position title for legacy compatibility.
- Optional experience type: `internship`, `full_time`, `part_time`, `co_op`,
  `contract`, `fellowship`, `self_employed`, or `other`.
- State: `current`, `past`, or `unknown`.
- Optional start month and end month stored at month precision.
- Optional Census city key.
- Public visibility, defaulting to true.
- Created and updated timestamps.

The existing `Member` table gains:

- Optional current Census city key.
- Current-city Guild visibility, defaulting to true.

No company alias, location, moderation-queue, or globe table is added.

### Company identity and review

- Search compares normalized display names, aliases, legal names, and domains.
- Member creation performs exact normalized duplicate checks before inserting a
  pending company. A new-company proposal submitted with membership is created
  in the same transaction as the Member and Employment rows.
- Pending companies are visible only to their creator and authorized officers.
- Approval makes a company eligible for public surfaces.
- Rejection preserves referential history but excludes the company and its
  employment rows from public surfaces.
- Merge runs in a transaction: repoint every employment to the canonical
  company, preserve useful aliases, mark the duplicate as merged, and record
  the canonical self-reference.
- Company counts use distinct member IDs and never count merged companies as
  separate employers.

### Employment rules

- New member-authored employment must use `current` or `past`.
- `unknown` is reserved for migrated legacy data and authorized corrections.
- Current employment must not include an end month.
- Past employment may include an end month. If both dates exist, the end month
  must not precede the start month.
- Complete-history writes use a transaction so membership creation and its
  initial employment entries cannot partially diverge.
- A current employment city can prefill, but never silently replace, the
  member's current city.

### U.S. city catalog

- Check in a generated, versioned server-side dataset derived from the current
  U.S. Census national Places Gazetteer.
- Each record contains a stable Census place key, city name, state
  abbreviation, representative latitude, and representative longitude.
- A reproducible generation script records the Census source year and URL.
- The browser searches cities through a tRPC procedure and receives a bounded
  result set. The complete dataset is not bundled into Blade or Guild clients.
- Validators enforce key shape; API writes verify that a submitted key exists
  in the generated catalog.
- Annual Census refreshes require a data regeneration change. Officers do not
  manage geographic reference data.

### Client flow

- Blade membership and Member Settings share a composed employment-history
  editor and company/city search controls.
- Blade sends structured membership and employment input to platform
  procedures.
- Guild server pages call public company and globe procedures and pass stable
  initial data into isolated interactive client components.
- Globe data is grouped by current Census city key. The public output contains
  the representative city coordinate, label, distinct member count, and public
  profile summaries.

## tRPC/API behavior

Add a career/company router or a clearly delimited career section in the member
router. Procedure names must communicate actor and intent.

Expected logged-in procedures:

- `searchCompanies`
- `createCompany`
- `listMyEmployment`
- `replaceMyEmploymentHistory`
- `updateMyCurrentCity`
- `searchUsCities`

Expected public Guild procedures:

- `listPublicCompanies`
- `getPublicCompany`
- `getPublicGlobeLocations`

Expected permission-aware procedures:

- `listAdminCompanies`
- `getAdminCompany`
- `updateCompany`
- `approveCompany`
- `rejectCompany`
- `mergeCompanies`

All reusable procedure inputs and outputs belong in `@forge/validators`.
Mutations return canonical identifiers and enough normalized state for clients
to invalidate or update affected queries. Missing resources use `NOT_FOUND`;
invalid lifecycle changes use `BAD_REQUEST` or `CONFLICT`; access failures use
the existing permissions behavior.

## Validation

- Company display names are trimmed, have a bounded length, and pass the
  platform's disallowed-content validation before creation.
- Normalization is case-insensitive and removes insignificant punctuation and
  whitespace for duplicate detection without changing the approved display
  value.
- Aliases are trimmed, unique within a company, bounded in count and length,
  and managed only by authorized officers.
- Domains are optional, lowercase, and stored without protocol or path.
- Titles are optional for migrated records and required for new member-authored
  records.
- Employment arrays are bounded to 50 entries per member submission.
- Month values use `YYYY-MM`.
- City queries are trimmed and bounded; search results are capped.
- Current-city and employment city keys must exist in the generated Census
  catalog.

## Data / migration / compatibility

- Generate a Drizzle migration for the two tables, enums, indexes, member
  columns, foreign keys, and checks.
- Seed one approved company per distinct non-empty legacy `Member.company`
  value.
- Seed one `unknown` employment per affected member with no invented title,
  type, city, or dates.
- Preserve the original company display value in the canonical company or its
  aliases.
- Keep `Member.company` during the compatibility window, stop using it for new
  writes, and have new readers prefer employment history with a legacy fallback
  only where required for mixed-version safety.
- The migration is idempotent in intent: repeated preflight checks must not
  create duplicate companies or employment.
- Rollback may remove new feature data only before new writes are accepted.
  After members create history, rollback must retain the two tables and disable
  only the new readers/writers.
- Current production `main` remains compatible because existing columns are not
  removed or made stricter.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Company names, aliases, domains, review decisions, merges, employment
  histories, and visibility do not require developer changes.
- Census reference data requires a generated dataset refresh when Knight Hacks
  chooses to update the source year. This is external geographic reference data,
  not routine officer configuration.
- Adding international locations requires a future product and data-source
  decision and is intentionally deferred.

## React / frontend constraints

- Keep route pages server-side.
- Isolate repeatable form state, dialogs, company moderation, filters, and globe
  interaction in client components.
- Reuse one employment-history editor across membership and Member Settings
  without duplicating mutation or validation behavior.
- Follow the Blade top-level and nested surface hierarchy. Member Admin keeps
  People and Companies at equal navigational weight rather than nesting company
  intelligence inside a filter dialog.
- Guild Companies uses the established Guild visual language and card rhythm
  without company logos.
- Add `three` to Guild for a custom client-only globe. Do not ship a generic map
  or default third-party globe presentation.
- Lazy-load the WebGL renderer. Render an immediate static placeholder and an
  accessible city/profile list when WebGL is unavailable.
- Respect reduced motion, stop idle animation while hidden, and preserve
  keyboard access to every city represented on the globe.
- Verify desktop and mobile screenshots for membership history, Member
  Settings, Member Admin Companies, public Companies, company detail, and
  Globe.

## Testing / verification strategy

- Validator unit tests cover company, employment, dates, visibility, and city
  keys.
- Database migration tests cover schema constraints and legacy backfill.
- API integration/contract tests cover ownership, permissions, lifecycle,
  merging, distinct counts, and public privacy.
- Blade Vitest tests cover repeatable history editing, pending states, and
  admin company workflows.
- Guild Vitest tests cover Companies and accessible globe list rendering.
- Playwright covers membership history submission, member editing, officer
  moderation, public company discovery, and current-city globe discovery.
- Run targeted tests first, then `pnpm verify:precommit`,
  `pnpm analyze:react:changed`, relevant builds, and desktop/mobile browser
  validation.

## Open questions

- Human approval of adding the direct `three` dependency is captured by
  approving this SRD.
