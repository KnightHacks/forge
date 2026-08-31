# Legacy Hackathon Site Archives Spec

Status: Approved

## User-facing purpose

Knight Hacks should own stable, maintainable public archives of its 2020, 2021,
2023, and 2024 hackathon sites at their existing year subdomains. Visitors should be able
to revisit each event's public theme, schedule, sponsors, FAQs, and other
historical content without encountering a broken backend, an authentication
wall, or an application form for an event that has ended.

The archive is a historical record, not a revival of the old event platforms.
Current and future applications and hacker dashboards remain the responsibility
of the maintained Hacker SDK experience for KHIX/2026 onward.

## Users / actors

- Alumni, hackers, sponsors, and community members revisiting a past event.
- Knight Hacks officers sharing historical event material.
- Dev team members maintaining and deploying the archived frontends from Forge.
- Search engines and link previews resolving established year URLs.

## User-visible interface

### Shared archive behavior

- The retained year domains continue to identify the corresponding event year.
- Each site retains its own historical visual identity. The four sites are not
  restyled into the current Knight Hacks design system.
- Public event content remains browsable without signing in.
- Application, registration, sign-in, sign-up, and hacker-dashboard controls are
  absent from navigation, hero sections, and public content.
- A direct visit to a removed workflow shows a small year-themed archival notice
  stating that the event has ended. It contains no form, auth control, or
  dashboard data and links to the current Knight Hacks event site.
- External links that remain visible must still be intentional and safe. Dead or
  event-specific operational links are removed rather than silently redirected.

### Per-year public surface

| Year | Public content to preserve                                                      | Workflows to remove                                                                                 |
| ---- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 2020 | Public landing experience and its historical sections                           | `/register`, `/accepted`, Firebase behavior, and obsolete operational redirect aliases              |
| 2021 | Home, About, Sponsors, Schedule, FAQ, and Attributions                          | `/register`, `/success`, and form-success behavior                                                  |
| 2023 | Public home experience and, pending approval, the public `/social` graphic tool | `/auth`, `/register`, Firebase sign-in, resume upload, application form, and application status     |
| 2024 | Public home, About, Sponsors, FAQ, and Contact sections                         | `/application/*`, `/dashboard`, `/sign-in`, `/sign-up`, Clerk, and live application calls to action |

The abandoned `hackathon-2022` prototype is not an event archive. Knight Hacks'
official history and internal records contain no 2022 event, and the source
contains placeholder statistics plus empty Schedule and Sponsors pages.

## Scope

### In scope

- Import the public 2020, 2021, 2023, and 2024 frontend source into separate
  Forge apps.
- Preserve historical copy, artwork, animation, layout, and public navigation as
  closely as the available evidence allows.
- Repair outdated frontend dependencies and browser behavior where required to
  build in the current monorepo.
- Replace backend-fed public data with an immutable historical snapshot when the
  data was part of the public event site, such as the 2024 sponsor list.
- Keep the established year domains and move their origins to the new Forge
  deployments only after local and visual approval.
- Verify every site on desktop and mobile before any push or production cutover.
- Deploy and verify one year at a time to avoid noisy notifications and reduce
  rollback scope.

### Out of scope

- Restoring any historical application, account, authentication, resume upload,
  dashboard, or organizer workflow.
- Recreating old databases, Firebase projects, Clerk tenants, or backend APIs.
- Changing KHIX/2026 or the maintained Hacker SDK.
- Redesigning the four sites into one visual system.
- Upgrading Coolify.
- Deleting the old Cloudflare projects, Access application, DNS records, or
  rollback paths before the replacement for that year is approved and healthy.
- Changing unrelated Forge apps or shared platform packages.

## Vocabulary

- `archive`: A read-only public rendering of an event's final public site.
- `historical workflow`: An application, registration, auth, upload, or dashboard
  flow that must not remain functional.
- `archival notice`: A non-interactive explanation shown at a removed historical
  workflow URL.
- `visual baseline`: The best trustworthy reference for a site's intended event-
  close appearance: current live deployment, source at the deployed commit,
  screenshots, or a web archive.
- `cutover`: The later, separately approved change that sends a year domain to
  its Forge deployment.

## Acceptance criteria

- All four retained year domains have a locally verified archive build whose public pages
  render without credentials, APIs, databases, or runtime secrets.
- No archive displays an Apply, Register, Sign in, Sign up, or Dashboard action.
- Direct visits to removed workflow URLs cannot submit data, authenticate, expose
  user state, or load a legacy backend.
- The retained pages have no unexpected console errors or failed first-party
  network requests.
- Images, fonts, animations, internal navigation, anchors, and intentional
  external links work at desktop and mobile widths.
- Visual review compares representative local routes to the best available
  baseline and records any deliberate difference.
- Each production image contains only the static export and web server runtime,
  not the Forge repository, source tree, package manager store, or `node_modules`.
- Actual build time, final image size, running-container memory, restart count,
  health, and root-disk change are recorded after each later deployment.
- The next year is not deployed until the current year's container, domain,
  visuals, links, and resource footprint have been inspected.
- Nothing is pushed or deployed until all four local builds and the complete
  visual review matrix are approved.

## Accepted product decisions

1. Show a year-themed archival notice with HTTP 410 semantics at removed
   workflow URLs instead of a raw error or redirect.
2. Add a restrained “Past event” cue linking to the current Knight Hacks event
   site only where it does not disrupt the historical composition; the archival
   notice always includes the link.
3. Keep the 2023 `/social` graphic route if it remains fully client-side and
   requires no personal data or external service.
4. Remove all 2020 utility redirect routes. Visible social links point directly
   to intentional destinations.
5. Exclude 2022 because no event record exists and the checked-in project is an
   unfinished prototype, not a completed public event site.
6. Gate each later production deployment with a ten-minute health and resource
   observation before advancing to the next year.

## Supplied 2024 sponsor roster

- Gold: ServiceNow, IBM, NextEra Energy, BNY Mellon, Siemens Energy.
- Silver: Impress Ink.
- Bronze: Kinde Auth, Synopsys, GEICO.

The human-provided names and tiers are authoritative. Implementation must source
the corresponding 2024-era official websites and logo assets, record provenance,
and vendor the approved logo files locally.
