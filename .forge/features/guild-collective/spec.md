# Guild Collective Spec

Status: Approved

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Restore Guild as a working Knight Hacks member network and make it a larger,
first-class part of the Knight Hacks product rather than a stranded directory.

The existing Guild application depends on API procedures that were moved into
Legacy during the Reforge scaffold. This feature restores the approved Guild
capabilities and completely rethinks the Guild frontend around the product
direction confirmed through reverse-prompting.

## Users / actors

- Public visitor discovering Knight Hacks members without signing in.
- Sponsor or recruiter browsing public Guild profiles and resumes without a
  special Guild account.
- Current Knight Hacks member whose public Guild identity is represented.
- Knight Hacks alumnus whose public Guild identity remains represented.
- Member using Blade to edit or hide their Guild profile and resume.

## User-visible interface

### Public Guild directory

- Guild is publicly accessible at `guild.knighthacks.org`; browsing does not
  require authentication.
- The directory is a community-discovery experience that can also help
  sponsors and recruiters find Knight Hacks members.
- Only profiles whose owner has not opted out of Guild visibility appear.
- Visitors can search, filter, browse, and progressively load the public
  member directory.
- Current members and alumni are clearly identified and filterable.
- The unfiltered home directory prioritizes a randomized selection of visible
  profiles with the most complete Guild presentation, such as a profile
  picture and tagline, while still keeping other visible profiles
  discoverable.
- Each fresh unfiltered homepage load creates a new randomized order.
- The randomized order remains stable for that page session while the visitor
  loads more profiles so members do not duplicate or disappear mid-browse.
- Search results use relevance rather than random ordering.
- Directory continuation uses a single `Load more` action rather than a page
  size selector or numbered pagination.
- The home directory does not add a separate member-spotlight feature.
- Search inspects the member's public name, tagline, biography, school, major,
  company, and approved opportunity status.
- The first-release filters cover current/alumni status, Knight Hacks team
  membership, graduation year, member-since year, school, major, résumé
  availability, and approved opportunity status.
- Directory cards stay compact and show the profile picture, name,
  current/alumni state, tagline, company, school or major, graduation year,
  member-since year, Knight Hacks role callout when available, and quick links
  for any published LinkedIn, GitHub, or portfolio URL.
- Team cards keep the same geometry as every other member card while using a
  larger, fixed-height role-only band with configured team color instead of
  reducing team identity to a small pill. Their current/alumni information
  remains separate and appears in a fixed metadata row immediately above the
  affiliation slot, independent of tagline height. Alumni additionally receive
  a gold card border and full-width gold `Alumni` band in the affiliation slot.
  Current profiles without a role do not render an empty band; their academic
  content uses that space while card height remains stable.
- The redesigned directory must feel like a first-class Knight Hacks product,
  not a generic data grid or a lightly restyled version of the current card
  wall.
- Guild follows the Blade design system closely enough to feel like the same
  product family while avoiding a generic SaaS-dashboard composition.
- The directory and profile canvas reuse Blade's low-contrast grid and
  purple/blue depth so the public Guild remains visibly part of the same
  product family.

### Public member profiles

- Each visible member has a stable, shareable profile page.
- A profile presents the member's Guild identity, education, work context,
  biography, external profile links, and résumé when the member has not opted
  out of public résumé sharing.
- Public professional fields include major, company, and available résumé.
  Email, phone number, date of birth, demographic responses, Discord identity,
  and account data never become public Guild fields.
- A public résumé can be previewed in the browser and downloaded.
- A member may publish an optional opportunity status configured from their
  Blade member dashboard.
- Opportunity status supports up to three selections from:
  - Open to internships
  - Open to full-time roles
  - Open to freelance/contract work
  - Open to project collaboration
  - Offering mentorship
  - Seeking mentorship
- Directory cards show at most two opportunity labels; the full profile shows
  every selected status.
- Opportunity status is filterable and defaults to no selection.
- Guild does not add skills or technology tags in this release.
- A member with a current Knight Hacks organizational role receives one public
  callout derived from their highest role. Officers show the specific officer
  title, directors show the specific director title, and team members show
  the team name suffixed with `Team`. The KH IX team uses the public label
  `Organizer`.
- Alumni profiles remain available indefinitely while the alumnus keeps the
  profile visible.
- Hidden, missing, and otherwise unavailable profiles do not expose private
  member information.

### Profile and résumé controls

- Guild profiles are visible by default, with an opt-out control in Blade.
- Résumés are publicly available by default when present, with a separate
  Guild résumé opt-out control in Blade.
- Hiding a Guild profile prevents its profile page and résumé from being
  publicly discoverable regardless of the résumé setting.
- Guild provides a clear link to the Blade profile-editing experience rather
  than duplicating member editing.
- The edit-in-Blade link is always available; Guild does not add authentication
  awareness merely to personalize that action.
- Members configure their public opportunity status from the Blade member
  dashboard.
- The dashboard Guild card opens a compact opportunity-status editor, and the
  same setting remains available in member profile settings.
- The rollout assumes Knight Hacks will announce the public-by-default profile
  and résumé policy so members can opt out.

## Scope

### In scope

- Restore the public Guild member-discovery and résumé API capabilities needed
  by the Guild application.
- Replace the current Guild frontend with an intentional, responsive member
  discovery experience.
- Add stable, shareable public member profile pages.
- Preserve Blade as the owner of Guild profile editing.
- Add a separate public résumé visibility control to the Blade member
  experience.
- Add an optional public opportunity status to the Blade member dashboard and
  Guild profile.
- Add a single public Knight Hacks role callout based on the member's highest
  applicable current role.
- Keep Guild profile visibility and résumé visibility defaulted on, with
  member-controlled opt out.
- Keep visible alumni profiles available in the directory.
- Preserve public search and current/alumni filtering while replacing numbered
  pagination with progressive loading.
- Prioritize complete profiles in randomized default discovery without
  excluding opted-in incomplete profiles.

### Out of scope

- Authentication as a prerequisite for browsing Guild.
- A sponsor account, private sponsor directory, or Guild-specific permission.
- Restoring or changing the Club website's public team-roster API in this
  bundle.
- Messaging, follows, comments, social feeds, endorsements, job postings, and
  profile analytics.
- Duplicating Guild profile editing inside the standalone Guild application.
- Skills or technology tags.
- A separate curated or rotating member-spotlight section.

## Vocabulary

- `Guild`: Knight Hacks' public member identity and community-discovery
  product.
- `Guild profile`: The public professional/community identity projected from
  a Knight Hacks member profile.
- `Guild profile visibility`: A member-controlled opt-out setting that
  determines whether the member appears anywhere on public Guild.
- `Guild résumé visibility`: A separate member-controlled opt-out setting that
  determines whether a résumé attached to a visible Guild profile may be
  opened publicly.
- `Current member`: A visible Guild member whose graduation date has not
  passed under the approved status rule.
- `Alumnus`: A visible Guild member whose graduation date has passed under the
  approved status rule.
- `Opportunity status`: An optional, public member-selected signal describing
  the opportunities or community connections they welcome.
- `Knight Hacks role callout`: One public label representing the member's
  highest applicable current organizational role.
- `Profile completeness`: A ranking signal based only on approved Guild
  presentation fields; it determines default prominence but never public
  eligibility.

## Acceptance criteria

- A visitor can browse Guild without signing in.
- Only members with visible Guild profiles appear in directory results or on
  public profile pages.
- Search, approved filters, and progressive loading produce understandable
  discovery states, with search and filters represented in the URL.
- Opening a member from filtered directory results and returning to the Guild
  restores the same search and filter URL.
- Default discovery gives complete visible profiles varied prominence without
  making incomplete visible profiles unreachable.
- Profile completeness considers profile picture, tagline, biography, company,
  and whether at least one external profile link is present.
- Résumé visibility, opportunity status, and Knight Hacks organizational role
  do not affect completeness or prominence.
- A fresh unfiltered homepage load produces a new random order, and `Load
more` continues that same order without duplicates or omissions.
- Active search results are relevance-ordered rather than randomized.
- Each visible member has a stable public profile destination.
- Visible profiles clearly distinguish current members from alumni.
- Alumni remain discoverable indefinitely unless they opt out.
- A member with a visible profile and résumé can expose that résumé publicly
  when Guild résumé visibility is on.
- A member can opt out of public résumé sharing without hiding the rest of
  their Guild profile.
- A public résumé can be previewed and downloaded.
- A member can set, update, or clear the approved opportunity status from
  Blade, and the public Guild profile reflects the change.
- A member can select no more than three approved opportunity statuses.
- Directory cards show no more than two opportunity-status labels while the
  full profile shows the complete selection.
- Eligible current team members, directors, and officers receive exactly one
  correct highest-role callout.
- Visitors can limit discovery to members with an eligible officer, director,
  or team role.
- Specific officer roles outrank specific director roles, which outrank team
  membership. Same-tier conflicts follow the configured Knight Hacks role
  order. Aggregate-only roles display `Officer` or `Director`.
- Role callouts may use the configured role/team color as a restrained accent
  without replacing the Blade card and surface system.
- A hidden Guild profile never exposes its résumé through Guild.
- Guild links members to the Blade editing experience.
- The public response excludes private member/account fields that are not
  approved Guild profile information.
- Empty, loading, unavailable, and invalid-profile states are deliberate and
  understandable.
- The experience works without document-level horizontal overflow at 320px
  and makes effective use of laptop and desktop screen space.

## Open questions

- None.
