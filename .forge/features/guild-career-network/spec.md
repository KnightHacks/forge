# Guild Career Network Spec

Status: Proposed

## User-facing purpose

Knight Hacks members can maintain a professional history that reflects where
they have worked, what they did, and where they are based now. Guild uses that
information to help members discover career paths through the community.
Officers use the same information during sponsorship outreach to understand
which companies already employ Knight Hacks members and alumni.

## Users / actors

- Members entering or maintaining their professional history.
- Prospective members completing the Knight Hacks membership form.
- Public Guild visitors exploring members, companies, and current locations.
- Officers reviewing member-company relationships and maintaining the company
  directory.

## User-visible interface

### Membership form and Member Settings

- The membership form includes an optional employment-history section.
- A member may add, edit, reorder, or remove any number of employment entries.
- Each entry supports a company, position title, experience type, employment
  state, month/year dates, public visibility, and an optional U.S. city.
- Members search the existing company directory before creating a company.
- If no company matches, the member can create one without leaving the form.
- A newly created company remains pending until an officer reviews it. The
  member can still save and later edit the employment entry.
- Member Settings provides the same complete history editor after signup.
- Members choose one current U.S. city for their Guild location. Selecting a
  city for a current employment offers to use that city as the current Guild
  location.
- Employment entries and the current city default to public when the Guild
  profile is public. Members can hide individual entries or their current city.

### Public Guild

- Guild navigation offers People, Companies, and Globe views.
- The Companies view lists approved companies represented in public employment
  histories.
- Each company shows distinct current and former member counts.
- A public company page shows members with visible experience at that company,
  separated into current, former, and unconfirmed experience where applicable.
- Public member profiles show visible employment history in date order.
- The Globe shows one current-location layer. Members in the same city share a
  clustered marker with a count. Selecting the marker reveals those profiles.
- Guild never infers a member's location from a company headquarters, school,
  or address.

### Blade Member Admin

- Member Admin offers People and Companies views.
- The Companies view shows each company, distinct current/former/unconfirmed
  member counts, represented experience types, represented cities, and review
  status.
- Officers can open a company to see current and past employees and their
  positions, dates, and cities.
- Officers can approve or reject pending companies, change display and legal
  names, maintain aliases and domains, or merge duplicates.
- The review queue makes pending companies prominent and reports safe,
  actionable success and error states.

## Scope

### In scope

- A managed company directory with member-created pending companies.
- Complete member employment history on signup and in Member Settings.
- Position titles, experience types, month/year dates, current/past/unconfirmed
  state, per-entry visibility, and U.S. city selection.
- An explicit current city and current-location visibility preference.
- Officer company review, editing, rejection, and duplicate merging.
- Company relationship counts and member drill-down in Blade.
- Public company discovery and public company profile pages in Guild.
- A single-layer, current-city Guild globe.
- A generated U.S. city catalog sourced from the U.S. Census Places Gazetteer.
- Preservation of existing company information during migration.

### Out of scope

- International cities.
- Street addresses, office addresses, or precise personal coordinates.
- Company logos.
- Company contacts, sponsorship pipeline stages, outreach notes, or a general
  sponsor CRM.
- Automatic company enrichment from an external service.
- School-based or company-headquarters location inference.
- Discord behavior.

## Vocabulary

- `Company`: One canonical employer in the Knight Hacks directory.
- `Alias`: An alternate company name that finds the same canonical company.
- `Employment`: One member's professional experience at one company.
- `Current employment`: Employment the member marks as ongoing.
- `Former employment`: Employment the member marks as ended.
- `Unconfirmed employment`: Preserved legacy company information whose current
  or former state has not been confirmed.
- `Pending company`: A member-created company awaiting officer review.
- `Current city`: The U.S. city a member explicitly chooses as their present
  Guild location.

## Acceptance criteria

- A prospective member can submit zero or more employment-history entries
  without leaving the membership form.
- A member can maintain the same complete history from Member Settings.
- Searching by a company display name or alias returns the canonical company.
- Creating a new company does not block membership or profile completion.
- Pending companies stay off public Guild company and employment surfaces until
  approved.
- Officers can review, approve, reject, edit, alias, and merge companies.
- Company counts use distinct members rather than raw employment rows.
- Public company pages and member histories honor profile, employment, company,
  and current-city visibility rules.
- Existing company values remain available as unconfirmed experience until a
  member or officer confirms them.
- A member can select a current U.S. city from the Census-backed catalog.
- The globe renders no more than one logical current-location pin per visible
  member and clusters members who share a city.
- Hidden locations and employment entries do not appear in public Guild API
  responses or page source.

## Open questions

- None. The human approved the product decisions on 2026-07-24.
