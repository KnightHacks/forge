# KHIX Dashboard Interface Guidelines SRD

Status: Approved for implementation

## Technical purpose

Strengthen the shared KHIX dashboard shell and map controls so every dashboard
route inherits consistent interaction, accessibility, mobile, and metadata
behavior without duplicating page-specific implementations.

## Relevant principles

- `docs/agentic-development/frontend-design-skill.md`
- `docs/agentic-development/forge-engineering-principles.md` React and error UX sections
- User-supplied Web Interface Guidelines

## Access policy

No access changes. The existing portal auth boundary and participant-state
locks remain authoritative.

## Architecture / data flow

Changes remain inside `apps/khix`: shared dashboard/map components, CSS modules,
portal metadata, and route metadata. No package, API, or database changes.

## tRPC/API behavior

None.

## Validation

No validation contract changes.

## Data / migration / compatibility

No data, schema, migration, environment variable, or dependency changes.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: No. This is durable interaction and accessibility infrastructure.

## React / frontend constraints

- Preserve the existing KHIX enchanted palette and typography.
- Add behavior at the shared shell/CSS layer wherever possible.
- Use native elements and existing Radix/@forge primitives.
- Trap and restore focus only while the mobile drawer is mounted.
- Make the inactive dashboard content inert while the drawer is open.
- Preserve browser zoom and honor `prefers-reduced-motion`.
- Keep transitions limited to explicit opacity/transform/color properties.

## Testing / verification strategy

- KHIX format, typecheck, lint, React changed analysis, and production build.
- Existing KHIX map unit tests.
- Playwright keyboard and visual checks at desktop, 320–390 px mobile, and an
  ultra-wide viewport.

## Open questions

- None.
