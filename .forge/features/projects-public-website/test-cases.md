# Projects Public Website Test Cases

Status: P2 implementation cases.

## Scope

Verify the public fixture experience only. Authentication, API responses, publishing workflow, and real production content are not part of this slice.

## Test placement plan

- `apps/projects/src/tests`: Playwright browser tests against the local Next app.
- Commands: `pnpm --filter @forge/projects test:e2e`, `typecheck`, `lint`, `format`, `build`, and root `pnpm analyze:react:changed`.

## Test cases

### TC-001: Discover and open a featured project

Setup: Open the homepage at a desktop viewport.

Action: Follow the featured case-study link and use the project breadcrumb to return to the archive.

Expected observations: Both pages load, links use local routes, and the case study shows its technical sections, diagram/code where present, fixture provenance, and related links.

### TC-002: Search and technology filters

Setup: Open the archive with several fixture projects.

Action: Search a known project/technology; select a technology; combine the filter with a query that has no matches; clear filters.

Expected observations: Matching cards update, result counts are announced, filters combine, empty state is readable, and reset restores all fixtures.

### TC-003: Keyboard and narrow viewport

Setup: Open the archive and a case-study route at 320px width.

Action: Navigate header, search, filter buttons, and story links using the keyboard; inspect page width and visible focus.

Expected observations: Controls remain reachable with visible focus, content wraps, and no document-level horizontal overflow occurs.

### TC-004: Fixture provenance

Setup: Open each public content surface.

Action: Inspect labels, team metadata, awards, and external links.

Expected observations: Illustrative status is visible, contributor names and winner claims are absent, and fixture external links use `example.com`.

## Negative / regression cases

### TC-NEG-001: Unknown slug

Setup: Request an unknown case-study slug.

Action: Open the route.

Expected observations: A branded not-found page appears and no unrelated case study is rendered.
