# Guild Career Network Test Cases

Status: Proposed

## Scope

These cases cover company identity and review, complete employment history,
current U.S. city selection, admin relationship intelligence, public company
discovery, the current-city globe, permissions, privacy, and legacy migration.

International cities, addresses, automatic image enrichment, sponsor CRM
behavior, and Discord behavior are excluded.

## Test placement plan

- `packages/validators`: company, employment, month, and member-location
  schemas.
- `packages/db`: migration shape, checks, and legacy-data preflight.
- `packages/api`: member ownership, company lifecycle, moderation, counts,
  public privacy, city search, and globe aggregation.
- `apps/blade`: employment editor and Member Admin Companies behavior.
- `apps/guild`: public company and accessible globe rendering.
- Blade/Guild Playwright: selected complete user and officer paths.

Expected commands:

- `pnpm --filter=@forge/validators test`
- `pnpm --filter=@forge/db test`
- `pnpm --filter=@forge/api test`
- `pnpm --filter=@forge/blade test`
- `pnpm --filter=@forge/guild test`
- `pnpm --filter=@forge/blade e2e`
- `pnpm --filter=@forge/guild e2e`

## Test cases

### TC-001: Membership accepts a complete optional employment history

Setup:

- A prospective member has no saved member record.
- Approved companies and valid U.S. cities exist in the search catalogs.

Action:

- The user adds multiple current and former employment entries, then submits
  the membership form.

Expected observations:

- The member and every valid employment entry are created together.
- Titles, experience types, states, dates, city keys, and visibility match the
  reviewed form.
- Submitting no employment entries also succeeds.

### TC-002: Member Settings maintains the complete history

Setup:

- A member has current and former employment entries.

Action:

- The member adds, edits, hides, and removes entries in Member Settings.

Expected observations:

- The saved history matches the confirmed editor state.
- The member cannot alter employment owned by another member.
- Success and failure feedback is visible and safe.

### TC-003: Company search resolves aliases

Setup:

- An approved company has display name `AMD` and alias
  `Advanced Micro Devices`.

Action:

- A member searches for either name using different casing.

Expected observations:

- Both searches return the same canonical company.
- The approved display name remains `AMD`.

### TC-004: Member creates a pending company

Setup:

- No visible company matches the member's proposed employer.

Action:

- The member creates the company while editing employment.

Expected observations:

- The employment form can use the new company immediately.
- The company is pending and visible to its creator and authorized officers.
- It does not appear in public company search, company pages, employment
  history, or counts.

### TC-005: Officer reviews a company

Setup:

- A pending company has one or more employment relationships.

Action:

- An `EDIT_MEMBERS` actor updates its canonical metadata and approves it.

Expected observations:

- The company becomes eligible for public surfaces.
- Existing employment relationships now resolve to the approved canonical
  display name.
- A read-only officer cannot perform the mutation.

### TC-006: Officer merges duplicate companies

Setup:

- Two companies represent the same employer and both have employment rows.

Action:

- An authorized officer merges the duplicate into the canonical company.

Expected observations:

- All employment rows resolve to the canonical company.
- Useful duplicate names remain searchable as aliases.
- Public and admin counts treat the companies as one.
- The merge completes atomically.

### TC-007: Admin Companies reports relationship intelligence

Setup:

- A company has multiple roles for some members and a mix of current, former,
  hidden, and unconfirmed employment.

Action:

- A `READ_MEMBERS` actor opens Member Admin Companies and the company detail.

Expected observations:

- Headline current, former, and unconfirmed counts use distinct members.
- Authorized admin detail lists the underlying positions, types, dates, and
  represented cities.
- Hidden employment remains visible to authorized member administrators.

### TC-008: Current city is explicit

Setup:

- A member has a current employment in one city and no current Guild city.

Action:

- The member selects the employment city and accepts the prompt to use it as
  their current city.

Expected observations:

- The current city changes only after confirmation.
- Changing or removing employment later does not silently rewrite the current
  city.

### TC-009: Public company discovery

Setup:

- Approved companies have visible current, former, and unconfirmed employment.
- Other companies are pending, rejected, or merged.

Action:

- An unauthenticated visitor opens Guild Companies and a company page.

Expected observations:

- Only approved canonical companies appear.
- Counts use distinct public members.
- The company page groups visible relationships by state.
- Selecting a member preserves a working return path to the company view.

### TC-010: Public member history honors privacy

Setup:

- A public member has visible and hidden employment at approved companies plus
  employment at a pending company.

Action:

- An unauthenticated visitor opens the member's Guild profile.

Expected observations:

- Only visible employment at approved companies appears.
- Hidden and pending relationships are absent from the response and rendered
  source.

### TC-011: Current-location globe clusters members

Setup:

- Several public, location-visible members select the same Census city.
- Other members hide their location or hide their Guild profile.

Action:

- A visitor opens Guild Globe and selects the shared city marker.

Expected observations:

- The globe shows one clustered marker for the city.
- Its count and profile list include only eligible members.
- Each eligible member contributes one logical pin.

### TC-012: Globe remains usable without animation or WebGL

Setup:

- The visitor requests reduced motion or WebGL initialization fails.

Action:

- The visitor opens Guild Globe and navigates by keyboard.

Expected observations:

- No required information depends on continuous animation or the canvas.
- The visitor can browse the city/profile list and open profiles.
- Reduced motion disables idle rotation and pulsing effects.

### TC-013: Census city search is bounded and unambiguous

Setup:

- The generated catalog contains cities with repeated names in different
  states.

Action:

- A logged-in member searches for a city.

Expected observations:

- Results include city and state, use stable Census keys, and return a bounded
  number of matches.
- A submitted key outside the catalog is rejected.

### TC-014: Legacy company data remains available

Setup:

- Members have distinct non-empty legacy company strings.

Action:

- The migration and preflight validation run.

Expected observations:

- Each normalized company becomes one approved company.
- Each affected member receives one unconfirmed employment relationship.
- No title, type, dates, state, or city are invented.
- Re-running validation does not create duplicates.

### TC-015: Officer manages a company image

Setup:

- An authorized officer opens a canonical company record.

Action:

- The officer uploads a valid image, replaces it, and then removes it.

Expected observations:

- Blade previews the current image without exposing an object-storage key.
- Public Guild company cards and detail prefer the officer-managed image.
- Replacing or removing the image cleans up the superseded object.
- Invalid formats and files larger than 2MB are rejected without changing the
  saved image.

## Negative / regression cases

### TC-NEG-001: Invalid employment dates are rejected

Setup:

- A member enters a past role whose end month precedes its start month or a
  current role with an end month.

Action:

- The member submits the history.

Expected observations:

- Validation rejects the affected entry with a field-specific message.
- Existing saved history remains unchanged.

### TC-NEG-002: Disallowed company name is rejected

Setup:

- A member enters a company name containing disallowed content.

Action:

- The member tries to create it.

Expected observations:

- Creation fails with a safe message.
- No company or employment row is written.

### TC-NEG-003: Duplicate company creation is intercepted

Setup:

- A canonical or member-owned pending company has the same normalized name or
  domain.

Action:

- The member attempts to create another company.

Expected observations:

- The API returns the existing usable match or a conflict response.
- No duplicate row is inserted.

### TC-NEG-004: Unauthorized company administration fails

Setup:

- A normal logged-in member knows a company identifier.

Action:

- They invoke approve, reject, edit, merge, image upload, or image removal.

Expected observations:

- The server rejects the action through control permissions.
- Company and employment data remain unchanged.

### TC-NEG-005: Rejected and merged companies stay off public surfaces

Setup:

- Employment rows reference companies later rejected or merged.

Action:

- A visitor searches Guild, Companies, company pages, and Globe.

Expected observations:

- Rejected and duplicate company identities do not appear.
- Merged employment resolves only through the canonical approved company.

### TC-NEG-006: Public APIs do not leak hidden data

Setup:

- A private member and a public member with hidden location/employment exist in
  a city and company represented by other public members.

Action:

- An unauthenticated client calls public company and globe procedures.

Expected observations:

- Counts and profile arrays exclude every hidden relationship.
- The response contains no hidden member IDs, names, city keys, or employment
  details.

## Open questions

- None. Human approval of this file authorizes test generation.
