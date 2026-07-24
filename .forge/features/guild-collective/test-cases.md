# Guild Collective Test Cases

Status: Approved

> This file owns observable proof. The human approved these cases on 2026-07-23.

## Scope

These cases prove the Guild member data additions, public access boundary,
completeness-weighted discovery, refresh-scoped ordering, search and filters,
shareable profiles, role callouts, secure public media access, owner preference
editing in Blade, public Guild presentation, SEO behavior, and removal of the
Issues rollout flag.

They intentionally do not test a private sponsor portal, authenticated Guild
browsing, Club team-roster restoration, skills, messaging, follows, comments,
feeds, endorsements, job postings, analytics, configurable role-callout
metadata, Discord API calls, or a new migration-testing framework.

## Test placement plan

- `packages/validators/src/tests/guild.test.ts` and existing member tests:
  opportunity values, list/filter inputs, public DTOs, preference writes, and
  signup/settings contracts with Vitest.
- `packages/api/src/tests/guild/`: public access, projections, discovery,
  cursor/search/filter behavior, role callouts, media gates, sitemap data, and
  owner preferences with deterministic DB and MinIO mocks.
- `packages/db`: generated migration inspection plus fresh and prod-like
  `db:migrate` verification; no separate migration harness.
- `apps/blade/src/tests/member/`: signup, dashboard quick editor, full settings,
  mutation feedback, and visibility copy with Vitest.
- `apps/blade/src/tests/issues/`: permission-only Issues navigation after flag
  removal.
- `apps/cron/src/tests/`: unconditional issue-reminder scheduling.
- `apps/guild/src/tests/`: directory/profile/SEO component behavior with the
  smallest app-owned Vitest setup.
- `apps/guild/src/tests/e2e/guild-collective.spec.ts`: anonymous public,
  cross-app Blade/Guild, mobile, and visual workflows with a Guild-owned
  Playwright configuration that launches Blade and Guild.

Expected focused commands:

- `pnpm --filter=@forge/validators test -- guild member`
- `pnpm --filter=@forge/api test -- guild resume profile-picture`
- `pnpm --filter=@forge/blade test -- guild issue-rollout`
- `pnpm --filter=@forge/cron test -- scheduling`
- `pnpm --filter=@forge/guild test`
- `pnpm --filter=@forge/guild e2e -- guild-collective.spec.ts`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm analyze:react:changed --base=reforge/main`

## Test cases

### TC-001: Guild validators preserve the approved public vocabulary

Setup:

- Prepare every approved opportunity key, one-to-three selections, a preference
  partial write, a valid list input, and a valid public profile DTO.

Action:

- Parse each value through the exported Guild/member schemas.

Expected observations:

- All six opportunity keys resolve to their approved labels.
- One-to-three unique selections pass and preserve stable keys.
- A preference write with at least one approved property passes.
- Valid list, filter, public card, profile, and callout data parse without
  adding private fields.

### TC-002: The additive migration gives safe existing and new-member defaults

Setup:

- Begin with a migrated pre-feature member who has a visible Guild profile and
  résumé, another member without a résumé, and a newly inserted member that
  relies on database defaults.

Action:

- Apply the generated migration and inspect the resulting rows/constraints.

Expected observations:

- Every existing/new member has `guildResumeVisible = true`.
- Every existing/new member has an empty opportunity-status array.
- Existing Guild visibility and stored media references are unchanged.
- The database accepts zero-to-three approved opportunity keys and rejects
  unsupported or oversized arrays.

### TC-003: New-member signup is explicit about public résumé behavior

Setup:

- Open member signup with no previous form response.

Action:

- Inspect the Guild section, leave defaults in place, upload a résumé, and
  submit valid member data.

Expected observations:

- Guild profile visibility and public résumé visibility both default on.
- Copy explains that the résumé is public while the profile and résumé
  switches are enabled.
- Opportunity status is not presented during signup.
- The created member and signup response preserve the selected visibility
  values without fabricating an opportunity answer.

### TC-004: Public directory output includes only eligible professional data

Setup:

- Create visible and hidden members containing complete professional fields,
  sensitive onboarding/account fields, storage object names, and role rows.

Action:

- Call `guild.listProfiles` without a session.

Expected observations:

- Only visible profiles appear.
- Returned cards contain only approved identity, education/work, opportunity,
  role-callout, status, media projection, and résumé-availability fields.
- Email, phone, date of birth, age, demographic answers, shirt size, Discord
  identity, user ID, permissions, raw roles, and storage object names are
  absent from the serialized response.
- No authentication challenge occurs.

### TC-005: Completeness changes prominence but never eligibility

Setup:

- Create visible profiles covering every combination of profile picture,
  tagline, biography, company, and external link, plus different résumé,
  opportunity, and role states.

Action:

- Request default discovery with a fixed seed.

Expected observations:

- Each non-empty approved completeness field contributes once.
- Whitespace-only values do not contribute.
- Résumé visibility, opportunity status, and organizational role do not change
  completeness.
- Higher-completeness profiles precede lower-completeness profiles.
- Incomplete visible profiles remain reachable after continuing the result set.

### TC-006: Seeded continuation is stable within one browse session

Setup:

- Create enough equal-completeness profiles for several pages and choose two
  deterministic seeds.

Action:

- Request the first page and all continuations with the first seed, repeat the
  same requests, then begin a fresh request with the second seed.

Expected observations:

- The same seed and inputs produce the same complete sequence.
- Following cursors returns every eligible member exactly once with no gaps.
- A different seed can change equal-tier order without changing eligibility or
  completeness tiers.
- `nextCursor` becomes `null` exactly when results are exhausted.

### TC-007: Public search ranks relevant professional matches

Setup:

- Create visible profiles where the same term is an exact name, a name prefix,
  a general name/tagline/about/school/major/company/opportunity substring, and
  only a private-field value.

Action:

- Search for the term.

Expected observations:

- Exact and prefix matches rank ahead of general contains matches.
- Approved public fields participate in matching.
- Private-field-only matches do not appear.
- Results use relevance ordering rather than the homepage seed order.

### TC-008: Compound filters and filter options use visible data

Setup:

- Create current/alumni visible profiles across years, schools, majors,
  opportunities, and résumé states plus hidden profiles containing otherwise
  unique option values.

Action:

- Request filter options and apply multiple values within and across filter
  dimensions.
- Select one or more member-since years and verify results belong to the
  selected join-year cohorts.

Expected observations:

- Options include only values represented by visible profiles.
- Multiple selections within one dimension use OR.
- Different filter dimensions combine with AND.
- Current/alumni boundaries follow the stored graduation date.
- Résumé availability requires a visible profile, enabled résumé visibility,
  and a non-empty résumé.
- Team-members-only requires one eligible code-owned officer, director, or
  team role and excludes profiles with unknown or unrelated roles.

### TC-009: Exactly one highest Knight Hacks role callout is public

Setup:

- Assign profiles specific officer, aggregate officer, specific director,
  aggregate director, team, same-tier multiple, unknown, and color/no-color
  role combinations.

Action:

- Request directory cards and full profiles.

Expected observations:

- Specific officers outrank directors and teams.
- Aggregate roles show `Officer` or `Director` only when no higher applicable
  specific callout wins.
- Team membership shows the configured public team label.
- Team labels use the `Team` suffix while KH IX membership displays
  `Organizer`.
- Same-tier conflicts use the configured order.
- Unknown roles produce no callout.
- A valid configured color may appear as an accent; permissions and unrelated
  role data never appear.

### TC-010: Visible member profiles have stable public destinations

Setup:

- Create a visible current member and visible alumnus with complete public
  professional fields.

Action:

- Call `guild.getProfile` and open `/members/[memberId]`.

Expected observations:

- The UUID route resolves the same member consistently.
- A member opened from filtered results carries a sanitized directory return
  path, and “Back to the Guild” restores the same filters.
- The profile includes approved biography, school, major, graduation,
  company, opportunity, role, external-link, and résumé-availability data.
- Current/alumni state is correct.
- No private member/account fields or object references appear.

### TC-011: Profile-picture projection is short-lived and resilient

Setup:

- Create visible profiles with a current owned object name, an owned legacy
  MinIO URL, no picture, a foreign object, and a signing failure.

Action:

- Request public cards/profiles with deterministic MinIO mocks.

Expected observations:

- Owned current and legacy references produce one-hour signed URLs.
- Raw references never serialize.
- No picture, foreign ownership, and signing failure produce a null public
  picture rather than failing the profile request.
- The UI renders deterministic initials for null pictures.

### TC-012: Public résumé actions recheck visibility and disposition

Setup:

- Create a visible member with a public owned résumé and deterministic MinIO
  signing.

Action:

- Request `view`, then `download`, through `guild.getResumeUrl`.

Expected observations:

- Each action re-reads current profile and résumé visibility.
- Both URLs expire after ten minutes.
- View uses inline PDF disposition.
- Download uses attachment disposition and a sanitized member-based filename.
- The persisted object name is never returned independently of the signed URL.

### TC-013: Sitemap and profile metadata expose only indexable identity

Setup:

- Create visible and hidden members with names, taglines, pictures, and
  résumés.

Action:

- Request sitemap profile data and generate route metadata.

Expected observations:

- Sitemap data contains only visible member UUIDs and display names.
- Visible routes emit canonical `/members/[memberId]` metadata using approved
  public identity copy.
- Hidden members emit no public metadata entry.
- Résumé URLs and storage references never enter sitemap or metadata output.

### TC-014: Owner preference quick edits are narrow and immediate

Setup:

- Authenticate a member with a profile and unchanged non-Guild fields.

Action:

- Update opportunity selections, résumé visibility, and profile visibility
  through `member.updateGuildPreferences`.

Expected observations:

- Only the current user's approved preference fields change.
- An omitted preference remains unchanged.
- The response contains the resulting preference state.
- Other member/profile fields and the signup response remain unchanged.

### TC-015: Full settings save persists Guild preferences atomically

Setup:

- Open member settings with edited profile fields, visibility switches, and
  opportunity statuses.

Action:

- Submit the full settings form once.

Expected observations:

- Profile fields and Guild preferences either all persist or all remain at
  their previous values.
- Signup-backed fields continue syncing to the existing member signup response.
- Dashboard-only opportunity status does not appear as a historical signup
  answer.
- The returned current member contains the saved preferences.

### TC-016: Directory controls maintain understandable URL state

Setup:

- Server-render the Guild directory with 24 initial profiles and available
  filters.

Action:

- Type a search, wait for the debounce, change current/alumni, clear search,
  and navigate backward/forward.

Expected observations:

- Initial profiles are present before client interaction and do not reorder on
  hydration.
- Search replaces transient URL state after the debounce.
- Current/alumni applies immediately.
- Search and filter URL state restores on navigation.
- The random seed and cursor are not exposed as shareable query parameters.

### TC-017: Secondary filters use one accessible dialog and removable chips

Setup:

- Open the directory at desktop and mobile widths.

Action:

- Open filters, select multiple dimensions, apply, remove one active chip, then
  reset.

Expected observations:

- The same viewport-safe Dialog pattern is used rather than a sliding sheet.
- Focus enters the dialog, stays contained, and returns to the trigger.
- Applying shows active, individually removable chips.
- Reset clears controls/results/URL state.
- Apply/reset controls remain reachable at 320px.

### TC-018: Cards and progressive loading remain semantic and compact

Setup:

- Render cards with long names/taglines, company/academic context, three
  opportunities, a role callout, every external link, and more than 24
  results. Include cards without external links, roles, employers, and
  taglines.

Action:

- Navigate by keyboard through cards and activate `Load more`.

Expected observations:

- Each card has one semantic link to its member route plus sibling quick links
  for its published LinkedIn, GitHub, and portfolio URLs.
- It shows the approved compact hierarchy and no more than two opportunity
  labels.
- External links open in a new tab, have accessible names/tooltips, and are
  not nested inside the card link.
- Role/no-role, current/alumni, external-link/no-link, and missing-content
  combinations retain the same identity, tag, context, and footer geometry.
- Null, empty-string, and whitespace-only legacy taglines all use the same
  missing-tagline presentation.
- Team cards expose a fixed-height configured-color band containing only the
  role. Every card shows a neutral current-year or gold alumni-year calendar
  treatment in a consistently aligned row immediately above the affiliation
  slot, regardless of one- or two-line tagline height. Alumni cards use a gold
  border and full-width gold status band in the affiliation slot. Current
  non-team cards render no empty affiliation band and move academic content
  upward without changing the footer or overall card height.
- Loading appends the next unique cards without replacing or reordering the
  existing grid.
- Appended cards restart the short batch stagger as they enter the viewport;
  the animation does not complete unseen below the fold and existing cards do
  not replay.
- Exhaustion removes/disables continuation with deliberate completion copy.

### TC-019: Public profile UI owns full detail and external actions

Setup:

- Render a complete visible profile with opportunity/role callouts, long about
  text, external links, and an available résumé.

Action:

- Inspect and navigate the profile at desktop and mobile widths.

Expected observations:

- Identity, About, education/work, opportunities, external links, résumé, and
  edit-in-Blade action are present in an editorial composition.
- At desktop width, the profile card ends within the viewport and long detail
  content scrolls inside its main column; mobile profiles continue in natural
  document flow.
- Every selected opportunity appears on the profile.
- External links use safe new-tab behavior.
- There is no card-detail dialog or persistent SaaS-style side rail.
- Content remains readable without document-level horizontal overflow.

### TC-020: Résumé preview and download have independent UI states

Setup:

- Render a public profile whose résumé URL request can load, fail, and retry.

Action:

- Open preview, trigger download, simulate a signing failure, and retry.

Expected observations:

- Preview opens in a viewport-safe titled PDF dialog.
- Download requests attachment behavior separately.
- Loading disables duplicate actions without replacing the profile.
- Failure shows a safe retryable error and preserves the rest of the page.
- No raw browser alert is used.

### TC-021: Blade presents every owner-facing Guild control consistently

Setup:

- Render member signup, dashboard, and settings with public/default and
  opted-out states.

Action:

- Inspect signup copy, edit opportunity status from the dashboard dialog, and
  edit visibility/settings.

Expected observations:

- Signup includes the default-on public résumé switch and no opportunity field.
- Dashboard offers the compact opportunity editor with a three-selection cap.
- Settings contains profile visibility, résumé visibility, and opportunity
  controls with consistent public wording.
- Successful quick edits close, toast, invalidate member data, and update the
  displayed state.
- Existing member dashboard/settings transitions and skeleton structure remain
  intact.

### TC-022: Issues flag retirement preserves access and scheduling

Setup:

- Prepare an officer, `READ_ISSUES`, `EDIT_ISSUES`, unrelated authenticated,
  and unauthenticated actors without any rollout environment variable.
- Mock every cron scheduler.

Action:

- Resolve navigation access, visit the Issues route, and initialize cron
  scheduling.

Expected observations:

- Officer/read/edit actors receive their established access.
- Unrelated and unauthenticated actors remain denied by the existing access
  policy.
- No feature-enabled argument or environment state changes the result.
- The Issues navigation entry is available whenever permissions allow it.
- Issue reminders schedule exactly once.
- Other established cron schedulers retain their existing behavior.
- Cron environment validation no longer expects the removed flag.

### TC-023: Anonymous desktop discovery works end to end

Setup:

- Launch Blade/Guild with visible fixtures spanning statuses and filters; do
  not authenticate the browser.

Action:

- Open Guild, search, apply filters, remove a chip, load more, and open a card.

Expected observations:

- The complete journey works anonymously.
- URL state, result ordering, chips, continuation, and profile destination
  match the approved behavior.
- No duplicate member appears while loading more.

### TC-024: Public profile and résumé privacy work end to end

Setup:

- Seed a visible public-résumé member, visible résumé-opted-out member, and
  hidden member.

Action:

- Open each profile destination and use available résumé actions.

Expected observations:

- The eligible profile previews/downloads its résumé.
- The résumé-opted-out profile remains visible without résumé availability.
- The hidden profile returns the same not-found experience as a random UUID.
- No stable résumé URL appears in server-rendered HTML.

### TC-025: Blade preference changes propagate to public Guild

Setup:

- Authenticate an e2e member whose profile and résumé begin visible.

Action:

- Change opportunity status and résumé visibility in Blade, then open/refresh
  the same public Guild profile.

Expected observations:

- Public opportunity labels reflect the saved selection.
- Résumé availability reflects the saved visibility immediately after normal
  data refresh.
- Hiding the full profile makes the public route unavailable.
- Re-enabling restores the same stable member URL.

### TC-026: Mobile and laptop visual contracts are verified

Setup:

- Prepare representative complete, incomplete, long-content, empty, loading,
  and error fixtures.

Action:

- Capture directory, filter, profile, and résumé states at 1440×900, 1024×768,
  390×844, and 320px-wide viewports and inspect them with vision.

Expected observations:

- Guild clearly belongs to the Blade design family without looking like an
  admin/SaaS dashboard.
- The fine Blade grid and restrained purple/blue canvas depth continue behind
  raised cards without reducing text or border contrast.
- Masthead and controls remain compact; the profile wall uses available space.
- Cards preserve title/content hierarchy and do not clip user text.
- Mobile dialogs/actions fit the viewport and keep 44px targets.
- No document-level horizontal overflow or inconsistent floating dock appears.

## Negative / regression cases

### TC-NEG-001: Malformed discovery inputs fail before querying

Setup:

- Prepare invalid UUID seeds, oversized queries/limits/filter arrays, invalid
  enums/years, malformed or oversized cursors, and unknown properties.

Action:

- Parse/call `guild.listProfiles`.

Expected observations:

- Each invalid input fails with `BAD_REQUEST`/Zod details.
- No database or storage query runs.
- Cursor text is never interpolated into raw SQL.

### TC-NEG-002: Hidden and nonexistent identities are indistinguishable

Setup:

- Create a hidden member and choose a nonexistent UUID.

Action:

- Request the profile, résumé, and public profile route for each UUID.

Expected observations:

- Both identities receive the same `NOT_FOUND` API and page behavior.
- Neither response reveals whether a member row, picture, résumé, or user
  exists.

### TC-NEG-003: Every résumé gate fails closed

Setup:

- Cover hidden profile, résumé visibility off, missing résumé, foreign object
  ownership, malformed object, and signing failure.

Action:

- Request both résumé dispositions.

Expected observations:

- Ineligible/ownership cases return `NOT_FOUND` without calling MinIO signing.
- Signing failure returns a safe server error without an object name.
- No failure exposes Hacker-only résumé data or another user's object.

### TC-NEG-004: Unauthorized or invalid preference writes change nothing

Setup:

- Prepare no session, a different authenticated user, an empty partial,
  duplicate statuses, four statuses, and an unknown status.

Action:

- Call the preference mutation and full settings save.

Expected observations:

- No session receives `UNAUTHORIZED`.
- A caller cannot target another member because no target ID is accepted.
- Invalid inputs receive field-specific validation failures.
- The member row and signup response remain unchanged after every failure.

### TC-NEG-005: Public contracts cannot regress into PII or storage leakage

Setup:

- Fill every Member/User/Role field, including values that match the active
  search term and recognizable object-name sentinels.

Action:

- Serialize list, profile, filter, sitemap, error, and résumé responses and run
  public search.

Expected observations:

- Only explicitly approved Guild DTO keys appear.
- Private-field matches do not affect search/results.
- Object-name sentinels, permission bits, Discord identifiers, and auth IDs
  appear nowhere in public success or error payloads.

### TC-NEG-006: UI failures remain usable, accessible, and non-animated

Setup:

- Simulate initial directory failure, load-more failure, empty results,
  unavailable profile, profile-picture failure, preference failure, and
  reduced-motion preference.

Action:

- Render and interact with each Guild/Blade state by keyboard and pointer.

Expected observations:

- Initial/load-more failures provide scoped retry without discarding loaded
  cards.
- Empty and unavailable states use deliberate copy and valid next actions.
- Preference failure preserves the user's draft.
- Initials replace broken pictures.
- Focus remains visible and logical.
- No staggered entrance, spring scaling, sliding filter panel, raw alert, or
  motion that ignores reduced-motion appears.

## Open questions

- None.

## Implementation proof

Recorded 2026-07-24:

- Validator coverage proves approved opportunity vocabulary, defaults, strict
  public DTO boundaries, empty partial rejection, maximum selections, and
  duplicate selection rejection.
- API coverage proves the restored public procedure surface, exclusion of the
  deferred Club roster, role precedence/labels, owner-only preference writes,
  anonymous write denial, safe Legacy-link normalization, résumé ownership
  gates, ten-minute inline/attachment signing, and safe storage failures.
- Blade component tests preserve member dashboard/settings behavior while the
  implemented dashboard Dialog and full settings form share the validated
  Guild preference contract.
- Guild component tests prove semantic stable profile links, the two-label
  card limit, résumé indication, and initials fallback.
- Guild Playwright proves anonymous directory access, cross-origin public tRPC
  continuation without duplicate cards, Dialog-based filtering and URL state,
  semantic profile navigation without a detail modal, the branded
  hidden/missing experience, and no horizontal overflow at 320px.
- Migration `0017_nice_vulture.sql` was applied successfully to the local
  PostgreSQL database and inspected for default-on résumé visibility, empty
  opportunity arrays, approved keys, and the three-selection database cap.
- Production Guild build, focused lint/typecheck, React analysis, and visual
  review at 1440×900, 1024×768, 390×844, and 320px completed successfully.

The cases above remain the behavioral acceptance catalog; focused automated
tests group related observations rather than creating one test function per
case.
