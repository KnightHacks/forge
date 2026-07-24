# Guild Collective SRD

Status: Approved

> This file owns technical implementation constraints. Product behavior lives
> in `spec.md`.

## Technical purpose

Restore Guild as a current `@forge/api` domain, add the minimum member data
needed for public résumé control and opportunity signals, and rebuild
`apps/guild` as a server-first public directory with cursor-based discovery
and stable profile routes.

The implementation must also update Blade's owner-editing surfaces, preserve
private MinIO object ownership, expose only purpose-built public DTOs, and
retire the repository's obsolete Issues rollout flag so authorized Issues
access and reminders are always active.

## Relevant principles

This feature follows:

- [`forge-engineering-principles.md`](../../../docs/agentic-development/forge-engineering-principles.md):
  apps remain thin clients; product workflows and access checks live in
  `@forge/api`; schemas remain in `@forge/db`; shared validation remains in
  `@forge/validators`.
- [`REPO-CONVENTIONS.md`](../../../docs/REPO-CONVENTIONS.md): register the
  router in `packages/api/src/root.ts`, keep server pages thin, and do not add
  ordinary product REST handlers.
- [`DATABASE-USAGE.md`](../../../docs/DATABASE-USAGE.md): preserve existing
  `Member`, `Roles`, `Permissions`, and MinIO-reference semantics.
- [`frontend-design-skill.md`](../../../docs/agentic-development/frontend-design-skill.md)
  and [`apps/blade/DESIGN_SYSTEM.md`](../../../apps/blade/DESIGN_SYSTEM.md):
  use semantic tokens, app-owned composition, accessible controls, deliberate
  density, responsive dialogs, and visual verification.

## Access policy

### Public reads

The following procedures use `publicProcedure`:

- `guild.listProfiles`
- `guild.getProfile`
- `guild.getFilterOptions`
- `guild.getResumeUrl`
- `guild.getSitemapProfiles`

Every public profile read applies `Member.guildProfileVisible = true` before
projecting data. `guild.getResumeUrl` additionally requires:

- the profile is publicly visible;
- `Member.guildResumeVisible = true`;
- a non-empty member résumé exists; and
- the stored object resolves to the requested member's `userId`.

Hidden, missing, or résumé-ineligible member IDs return the same `NOT_FOUND`
shape. Public procedures never return email, phone number, date of birth, age,
gender, race/ethnicity, shirt size, Discord identity, auth identity,
permission bits, raw role rows, or MinIO object names.

### Owner writes

`member.updateGuildPreferences` uses `protectedProcedure` and derives the
owner from `ctx.session.user.id`. It does not accept a member ID or user ID.
`member.updateMember` remains owner-scoped and atomically persists the same
Guild preferences when the full settings form is submitted.

There is no Guild permission, officer override, private sponsor view, or
authenticated read tier. Existing permissioned member administration remains
separate from Guild.

## Architecture / data flow

### Package and app ownership

- `@forge/consts` owns opportunity status values/labels and the code-owned
  Guild role precedence/mapping.
- `@forge/validators` owns public Guild query schemas, public DTO schemas, and
  member preference write schemas.
- `@forge/db` adds columns/check constraints to `Member` and otherwise remains
  schema/client-only.
- `@forge/api` owns Guild queries, access filtering, search/ranking,
  cursor encoding/decoding, role-callout projection, media signing, and owner
  preference writes.
- `apps/guild` owns public directory/profile presentation, route metadata,
  sitemap generation, URL state, and client interaction.
- `apps/blade` owns member signup, dashboard quick editing, profile settings,
  and all authenticated Guild preference controls.
- `@forge/ui` continues to provide app-agnostic primitives. Guild-specific
  cards, filters, and profile composition stay in `apps/guild`.

### Directory request flow

1. The Guild root server page parses and validates public search parameters.
2. For an unsearched directory request it creates a random UUID seed for that
   render and calls `guild.listProfiles` for the first 24 items.
3. `@forge/api` filters public rows before ranking or pagination.
4. It computes a five-point completeness score from non-empty profile picture,
   tagline, about, company, and at least one external profile link.
5. Non-search ordering uses completeness descending, then a deterministic
   member-ID hash derived from the active seed, then member ID.
6. Active text search uses parameterized relevance ranking with exact/prefix
   matches ahead of general contains matches, then completeness and a stable
   name/ID tie-breaker.
7. The API fetches whitelisted role rows for only the selected page's user IDs
   and projects one highest-precedence callout without letting role joins
   duplicate or reorder member rows.
8. The API returns public DTOs and an opaque continuation cursor.
9. The client island retains the initial seed and cursor. `Load more` uses
   both, so the active browse session has no duplicate or missing cards.
10. A full browser refresh creates a new seed and therefore a new eligible
    profile order.

Filter or search changes start a fresh result request and replace the
user-visible query/filter URL state. The random seed and cursor are not
shareable URL parameters. Directory-card routes carry the sanitized current
directory path as a return parameter; profile pages accept only `/` or a
root-directory query path and fall back to `/` for any other value.

### Cursor behavior

The cursor is an opaque, bounded, server-encoded record containing only the
last public ordering values required to continue the active query. Inputs are
strictly decoded and validated before use. Cursor values remain parameterized;
they are never interpolated through `sql.raw`.

Public list limits default to 24 and are capped at 48. Multi-value filters use
OR within one dimension and AND across dimensions.

### Role callout projection

No `Roles` columns or Role Management fields are added.

Eligibility and precedence use the existing code-owned lists in
`@forge/consts`:

1. specific officer roles;
2. aggregate officer role;
3. specific director roles;
4. aggregate director role;
5. configured team membership roles.

Specific role names are their public labels. Aggregate roles display
`Officer` or `Director`; team membership appends `Team` to the configured
public label, except the KH IX team which displays `Organizer`.
Same-tier conflicts follow existing configured order. Unknown roles are
ignored. The existing `Roles.teamHexcodeColor` may be returned as an optional
validated callout accent, but permission bits and unrelated role metadata are
never returned.

### Media projection

Persisted `Member.profilePictureUrl` and `Member.resumeUrl` remain private
object references despite their legacy column names.

- Listing/profile reads may resolve legacy profile-picture URLs to owned
  object names with the existing security helper.
- Public DTOs contain a one-hour signed profile-picture URL or `null`, never
  the persisted reference.
- Profile-picture signing failure degrades to `null` and the UI renders
  initials; it does not fail the member list/profile request.
- Public list/profile responses expose only a `hasPublicResume` boolean.
- `guild.getResumeUrl` re-queries all visibility and ownership conditions at
  click time, then creates a ten-minute signed PDF URL.
- `view` uses inline content disposition; `download` uses attachment
  disposition with a server-sanitized filename.
- Résumé URLs are created client-side on action and never rendered into static
  metadata, sitemap data, or server HTML.
- Presigning failure returns a safe `INTERNAL_SERVER_ERROR` message and leaves
  the rest of the profile usable.

## tRPC/API behavior

### `guild.listProfiles`

Input schema:

- `seed`: UUID required for non-search discovery;
- `cursor`: optional bounded opaque string;
- `limit`: integer, default 24, maximum 48;
- `query`: trimmed optional text, maximum 80 characters;
- `memberStatuses`: current/alumni selection;
- `graduationYears`: bounded valid year array;
- `memberSinceYears`: bounded join-year cohort array derived from the legacy
  member-created date;
- `schools`: bounded values from the existing school set;
- `majors`: bounded values from the existing major set;
- `resumeAvailable`: optional boolean;
- `teamMembersOnly`: boolean, default false; when true, an `EXISTS` filter
  requires an eligible code-owned officer, director, or team role;
- `opportunityStatuses`: bounded approved values.

Output:

- `items`: public directory-card DTOs;
- `nextCursor`: opaque cursor or `null`.

The query searches only approved public fields: first/last name, tagline,
about, school, major, company, and opportunity status. Résumé availability
means profile visible, résumé visibility on, and a non-empty résumé reference.

### `guild.getProfile`

Input: member UUID.

Output: one public profile DTO containing approved identity, academic/work,
external-link, opportunity, status, callout, signed picture, and public-résumé
availability fields.

Hidden and missing profiles both return `NOT_FOUND`.

### `guild.getResumeUrl`

Input:

- member UUID;
- disposition enum: `view` or `download`.

Output: a ten-minute signed URL. No URL or storage reference is returned when
any visibility or ownership gate fails.

### `guild.getFilterOptions`

Returns distinct graduation years, member-since years, schools, and majors
represented by visible profiles plus code-owned member status, résumé
availability, and opportunity options. It does not return private-domain
counts.

### `guild.getSitemapProfiles`

Returns only visible member UUIDs and display names. It does not sign media or
return card/profile details.

### `member.updateGuildPreferences`

Accepts a partial object containing at least one of:

- `guildProfileVisible`;
- `guildResumeVisible`;
- `guildOpportunityStatuses`.

The opportunity array contains no duplicates and has at most three approved
values. The procedure updates only the current user's member row and returns
the resulting public-preference fields.

### API discoverability

The router exports named input/output schemas and concise procedure comments
describing purpose, access tier, visibility rules, and side effects. This
keeps the procedures usable by future generated tRPC/API context without
changing the global tRPC metadata system in this feature.

## Validation

Add `GUILD.OPPORTUNITY_STATUS_OPTIONS` and label metadata to
`@forge/consts`. Persist stable option keys rather than display copy.

`@forge/validators` must validate:

- all list inputs and bounded arrays;
- UUID seed/member IDs;
- opaque cursor length/decoding;
- opportunity status keys, uniqueness, and maximum three selections;
- public card/profile/callout DTOs;
- safe optional HTTPS profile links through existing member validation;
- public role colors as `#RRGGBB` or `null`;
- résumé disposition;
- Guild preference partial writes with at least one provided property.

The database migration must independently enforce opportunity array size and
allowed values so direct writes cannot persist unsupported state.

## Data / migration / compatibility

### Member schema

Add to `Member`:

- `guildResumeVisible`: non-null boolean, default `true`;
- `guildOpportunityStatuses`: non-null text/varchar array, default empty.

Do not add a Guild profile table, profile slug, public ID, role-callout
metadata, or public media URL columns.

### Migration

Generate and commit a Drizzle migration. It is additive:

- every existing member receives `guildResumeVisible = true`;
- every existing member receives an empty opportunity array;
- existing `guildProfileVisible` values remain unchanged;
- existing résumé/profile-picture object references are not rewritten.

Existing rows with a résumé therefore become publicly résumé-eligible whenever
their existing Guild profile remains visible. This is the approved default-on,
announcement-and-opt-out policy.

The migration must pass a fresh database apply and an upgrade over the
prod-like sanitized dataset. Rollback deploys may run older application code
against the additive columns safely; the committed migration is not dropped
or reversed merely to roll back code.

### Member create/update compatibility

- New member signup presents `guildResumeVisible`, defaults it on, and explains
  that an uploaded résumé is public while both Guild visibility switches are
  enabled.
- Opportunity status is not part of signup and defaults empty.
- Full profile settings persist the new preference fields atomically through
  `member.updateMember`.
- Dashboard quick edits use `member.updateGuildPreferences`.
- The code-owned member signup response includes only fields actually present
  in signup; dashboard-only opportunity status does not become a fabricated
  historical signup answer.
- Existing Guild visibility copy is updated everywhere. A hidden profile is
  absent from public Guild; there is no sponsor-only Guild tier.

### Issues flag retirement

Remove `ISSUES_FEATURE_ENABLED` from:

- `apps/blade/src/env.ts`;
- `apps/blade/src/app/_components/admin/access.ts`;
- `apps/cron/src/env.ts`;
- `apps/cron/src/index.ts`;
- `apps/blade/playwright.config.ts`;
- `turbo.json`.

`canAccessIssues` becomes permission-only and preserves the officer bypass.
`issueReminders.schedule()` runs unconditionally alongside the other cron
schedulers. Tests and current artifacts should record the superseded rollout
behavior rather than erasing historical decision-log entries.

## Discord integration

This feature makes no Discord API calls, sends no announcements, changes no
roles, and adds no sync side effect.

Guild callouts read current `Permissions`/`Roles` rows already maintained by
the existing role system. A Discord outage must not affect Guild reads. Role
changes appear after the existing role data changes; Guild does not introduce
another cache or source of truth.

## Configurability review

Would this require a developer change next year?

- Answer: Yes, if Knight Hacks changes the opportunity vocabulary, role names,
  role precedence, or team labels.
- Hard-coding is explicitly approved for this release. Opportunity values and
  role mappings live centrally in `@forge/consts`, not inside UI/API files.
- School and major vocabularies continue to use their existing code-owned
  sources.
- No launch date or Guild feature flag is introduced. Deployment makes the
  public experience active.
- A future feature may move organizational callout metadata into Role
  Management, but this bundle must not add speculative configuration fields.

## React / frontend constraints

### Guild app

- Keep `apps/guild/src/app/page.tsx` and
  `apps/guild/src/app/members/[memberId]/page.tsx` as server components.
- Server pages parse validated params, call tRPC, generate metadata, and render
  feature components; do not add page-level `"use client"`.
- A focused client directory component owns debounced search, URL
  synchronization, filter-dialog state, active chips, and infinite loading.
- The first 24 cards render from server data. Client hydration must not
  immediately refetch or reorder them.
- Search debounces at approximately 300ms and replaces, rather than pushes,
  transient URL states. Current/alumni applies immediately.
- Remaining filters use a viewport-safe `Dialog` on desktop and mobile, not a
  sheet or sliding panel. Apply/reset actions are explicit.
- Each card has a semantic link to `/members/[memberId]` plus sibling quick
  links for any published LinkedIn, GitHub, and portfolio URL. External links
  open in a new tab, have accessible names/tooltips, and must never be nested
  inside the card's profile link.
- Remove the card detail dialog, page-size control, numbered pagination,
  ambient/decorative animation, spring scaling, and alert-based errors.
- Use short Framer Motion opacity/transform entrance and interaction
  transitions. Directory-card entrance may use an index-based stagger capped
  at 420ms for the full sequence. Each `Load more` batch restarts that short
  stagger and appended cards animate when they enter the viewport, preventing
  the motion from completing unseen below the fold. Existing cards must not
  replay. Framer's user-preference motion configuration and CSS reduced-motion
  fallbacks must suppress nonessential transforms without changing
  server/client markup.
- Keep identity rows aligned across a grid row while allowing one- and two-line
  taglines to use their natural height. Graduation and tenure metadata anchors
  to the bottom of the fixed identity block immediately above the affiliation
  slot. Team roles and alumni status use that fixed-height affiliation slot;
  academic, employer, and footer regions retain stable geometry. Role-bearing
  cards must not shift profile pictures or names.
- Team bands use configured role color as a tinted surface, marker, left edge,
  and card border while retaining readable text. The band contains only the
  team role. Graduation year uses compact calendar metadata anchored above the
  affiliation slot; current years are neutral and alumni remains gold.
  Alumni cards also use a gold edge and dedicated full-width gold status band.
  Current profiles without a role render no affiliation band, allowing academic
  content to move up while the card/footer geometry stays stable.
- The footer reserves stable opportunity and action rows. Social-link icons
  are Lucide icons on inset Blade surfaces; profiles without a given link keep
  the same card geometry.
- Use CSS hover/focus treatment only where it preserves reduced-motion and
  keyboard behavior; hover travel is limited to two pixels.
- The profile page uses an editorial, app-owned composition rather than a
  persistent settings/data side rail.
- At desktop widths, the profile route consumes at most the viewport space
  below the sticky site header. The identity column remains stable and the
  detail column becomes the bounded scroll region when content is longer than
  the available screen. Mobile retains natural document flow rather than a
  cramped internal scroller.
- Résumé preview uses a viewport-safe dialog with an accessible PDF title,
  loading/failure treatment, and separate download action.
- Missing or failed profile pictures render deterministic initials.
- Empty directory, exhausted results, unavailable profile, API failure, and
  résumé failure each receive deliberate copy and recovery actions.

### Blade app

- Add the public résumé visibility switch beside the signup résumé control.
- Add a compact opportunity-status dialog to the dashboard Guild card.
- Add résumé visibility and opportunity controls to member profile settings.
- Keep the settings transition/skeleton behavior established by the mobile
  member feature.
- Use the dedicated owner mutation for quick changes and invalidate current
  member queries after success.
- Successful dialog writes close, toast, and reflect immediately; failures
  preserve the draft and show safe inline/toast feedback.

### Visual system and responsiveness

- Guild imports Geist and reuses `@forge/ui` primitives plus Blade's semantic
  dark token values, border-led elevation, typography minimums, radii, icon
  sizing, focus treatment, and reserved gold accent.
- Guild may compose those primitives as a public editorial directory; it must
  not become a Blade admin dashboard or generic SaaS shell.
- Add a Guild public-experience section to
  `apps/blade/DESIGN_SYSTEM.md`; do not move the whole Blade theme into a
  shared package.
- Use a compact masthead and discovery toolbar, not an oversized hero or
  second floating dock.
- Use the Knight Hacks wordmark in the header and Blade-like dark card/inset
  surfaces with restrained purple and blue page color. Reuse the Blade
  authenticated-shell grid dimensions at low contrast across Guild directory
  and profile routes; grid lines stay behind raised surfaces. Do not add orbit
  graphics, floating status pills, or glass-sheen effects.
- At 320px there is no document-level horizontal overflow, dialogs stay
  within the viewport, labels wrap, and controls keep 44px touch targets.
- Desktop and laptop layouts use the available height/width efficiently.
- Visual QA must cover at least a laptop/desktop directory, desktop profile,
  mobile directory, mobile filters, and mobile profile/resume states.

### SEO

- `generateMetadata` for visible profiles uses approved public name/tagline
  fields and a canonical `/members/[memberId]` URL.
- Hidden/missing profiles use normal not-found behavior and do not emit public
  metadata.
- `sitemap.ts` uses `guild.getSitemapProfiles`.
- Resume destinations are excluded from metadata, sitemap, and server-rendered
  stable anchors; client actions use nofollow/noindex-safe treatment.

## Testing / verification strategy

Exact test cases belong in `test-cases.md`, but implementation must cover:

- `@forge/consts` and `@forge/validators` opportunity values, input bounds,
  public DTO field exclusions, and preference validation;
- API access tests proving hidden/missing indistinguishability, résumé gates,
  owner-only writes, no officer/public write bypass, and no storage-key leaks;
- API query tests for completeness scoring, refresh seeds, cursor continuity,
  relevance ordering, filter intersection, role precedence, and sitemap
  projection;
- storage tests for legacy profile-picture references, ownership rejection,
  signing fallbacks, inline/download dispositions, and short TTLs;
- migration tests for fresh apply, existing-row defaults, allowed opportunity
  values, maximum three, and prod-like upgrade;
- Guild component tests for URL/search/filter state, card links, load more,
  empty/error states, profile layout, initials fallback, and résumé actions;
- Blade component/API tests for signup copy/default, dashboard quick edit,
  settings persistence, mutation error behavior, and cache invalidation;
- Issues access/cron tests proving the rollout flag is absent, permissions
  still gate navigation, officer bypass remains, and reminders schedule;
- Guild Playwright coverage for anonymous desktop/mobile directory browsing,
  search/filter/load-more, shareable profiles, hidden 404, role/opportunity
  callouts, and résumé view/download;
- Blade Playwright coverage for authenticated opportunity/resume preference
  updates reflected in public Guild.

Required validation includes focused workspace format/lint/typecheck/test/build
commands, generated migration checks, `git diff --check`,
`pnpm analyze:react:changed --base=reforge/main`, Playwright at desktop/mobile
viewports, and screenshot inspection with vision beyond source review.

## Open questions

- None.
