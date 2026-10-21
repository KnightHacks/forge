# Projects Public Website SRD

Status: P2 public fixture implementation.

## Technical purpose

Build the public, read-only Projects experience in a new Forge Next.js app. All content is local fixture data and can later be replaced by a published case-study API projection.

## Relevant principles

- Follow [Forge engineering principles](../../../docs/agentic-development/forge-engineering-principles.md), [repo conventions](../../../docs/REPO-CONVENTIONS.md), and the [frontend design guide](../../../docs/agentic-development/frontend-design-skill.md).
- Use Guild's public Next app patterns and Blade's Knight Hacks color/accessibility conventions as references.
- Keep feature components in `apps/projects`; use `@forge/ui` only for app-agnostic primitives.

## Access policy

Every route is public. No identity, session, authorization, or private draft behavior is implemented.

## Architecture / data flow

- `apps/projects/src/content/projects.ts` owns illustrative fixture content.
- Server components render the home, archive shell, and static case-study routes.
- A bounded client component filters the same fixtures by search text and one technology selection.
- No tRPC, API, DB, auth, upload, remote image, or external content fetch is used.
- Fixture cover art is local SVG rendered by an app component.

## Validation

- Use meaningful document landmarks, labels, keyboard focus, contrast, alt/accessible naming, reduced-motion support, and responsive behavior through 320px.
- Links in fixture demo/repository fields use the reserved `example.com` domain and remain visibly labeled as fixture links.
- Never imply that illustrative teams, projects, metrics, or outcomes are real Knight Hacks records.

## Data / migration / compatibility

No persistence or migration. Fixture records are shaped as public case-study content, not source-event data.

## React / frontend constraints

- Server-render static content and case-study routes; isolate client behavior to archive search/filter controls.
- Use Forge's existing Next, Tailwind, Geist, Lucide, and shared UI conventions without adding dependencies.
- Give the archive an explicit empty state, result count, clear action, and stable card geometry.
- Case-study pages use readable line lengths and support variable-length sections, code samples, diagrams, and related entries.
- Check screenshots at desktop and 320px, and verify navigation, filtering, keyboard access, and horizontal overflow.

## Testing / verification strategy

- App Playwright tests cover homepage/archive/detail navigation, search and technology filters, empty/reset states, and 320px overflow.
- Run Projects build, typecheck, lint, format, React analyzer, and focused browser tests. Run broader root checks when feasible.

## Open questions

- Real case-study data and authorized contributor attribution are supplied in a later publishing/API slice.
