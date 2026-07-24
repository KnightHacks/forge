# Guild Career Network Status

Current phase: Complete — live review

## Decision log

- 2026-07-24: Build from `reforge/main` on
  `reforge/guild-career-network`.
- 2026-07-24: Add exactly two domain tables, `Company` and `Employment`.
  Company owns aliases and moderation state. Employment owns its optional city.
- 2026-07-24: Company logo storage remains out of scope. Guild renders
  best-effort vector marks for known supported brands, domain favicons when a
  company has a domain, and a stable monogram fallback.
- 2026-07-24: Employment locations and the member's current location use U.S.
  cities only. Addresses and international locations are deferred.
- 2026-07-24: Generate the city catalog from the U.S. Census Places Gazetteer.
- 2026-07-24: Members explicitly choose one current city. The globe uses that
  value as its single location layer and clusters members by city.
- 2026-07-24: Employment and current-city visibility default to public when the
  Guild profile is public, with member opt-outs.
- 2026-07-24: Pending companies remain private to the creator and officers.
  Approved companies alone reach public Guild surfaces.
- 2026-07-24: The membership form and Member Settings both support zero or more
  complete employment-history entries.
- 2026-07-24: Month/year dates and current, past, or unconfirmed state preserve
  useful history without inventing legacy facts.
- 2026-07-24: Experience types begin with internship, full-time, part-time,
  co-op, contract, fellowship, self-employed, and other.
- 2026-07-24: Legacy member-company strings migrate to approved companies and
  unconfirmed employment with no invented role, date, type, or city.
- 2026-07-24: Company intelligence uses `READ_MEMBERS`; company moderation and
  merging use `EDIT_MEMBERS`; the officer bypass remains intact.
- 2026-07-24: Guild adds Companies and Globe alongside People.
- 2026-07-24: Public navigation identifies the active People, Companies, or
  Globe page. All three use the same compact page-intro rhythm.
- 2026-07-24: The Globe renders truthfully with zero markers when nobody has
  shared a city; no synthetic member data ships.
- 2026-07-24: Employment editor cards use immutable client-only draft IDs so
  editing company, title, date, or location fields never remounts the card or
  drops keyboard focus.

## Open questions

- None.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Generate failing validator, API, DB, Blade, and Guild tests.
- [x] Implement database schema, migration, and legacy backfill.
- [x] Implement company, employment, city, admin, and public APIs.
- [x] Implement membership and Member Settings employment history.
- [x] Implement Blade Member Admin Companies.
- [x] Implement Guild Companies, company detail, member history, and Globe.
- [x] Run static, unit, integration, React, browser, and visual validation.

## Validation / commands

- `pnpm forge:feature guild-career-network "Guild Career Network"`: created the
  feature bundle.
- `pnpm exec prettier --check .forge/features/guild-career-network/*.md`:
  passed.
- `git diff --check`: passed.
- `pnpm db:migrate`: passed against the local development database.
- `pnpm -r --parallel --filter @forge/api --filter @forge/db --filter
@forge/validators --filter @forge/blade --filter @forge/guild test`: passed;
  API 266, DB 24 with 9 intentionally skipped, validators 95, Blade 141, and
  Guild 9 tests.
- Typechecks passed for `@forge/consts`, `@forge/api`, `@forge/db`,
  `@forge/validators`, `@forge/blade`, and `@forge/guild`.
- Lint passed for `@forge/consts`, `@forge/api`, `@forge/db`,
  `@forge/validators`, `@forge/blade`, and `@forge/guild`.
- `pnpm analyze:react:changed`: all new feature components parsed; the command
  still exits nonzero on its two pre-existing analyzer failures in current and
  legacy `apps/blade/src/trpc/react.tsx`.
- Playwright/visual validation at desktop and laptop sizes passed for active
  navigation, People header/search placement, company search and dynamic
  re-staggering, best-effort logos, the empty Three.js globe, horizontal
  overflow, and browser console/page errors.
- Employment draft identity regression coverage, Blade typecheck, Blade lint,
  and all 141 Blade tests pass after the focus-retention fix.

## Links

- PRs:
- Issues:
- Discord/thread context:
