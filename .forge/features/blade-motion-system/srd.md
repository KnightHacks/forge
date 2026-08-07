# Blade Loading and Motion System SRD

Status: Approved

## Technical purpose

Standardize Blade loading and motion behavior with server-first route skeletons, small Blade-local client motion primitives, retained-query feedback, and reduced-motion-safe shared primitives.

## Relevant principles

- `apps/blade/DESIGN_SYSTEM.md`: skeleton geometry, route transitions, stable dashboard surfaces, direct interaction motion, reduced motion, and visual verification.
- `docs/agentic-development/frontend-design-skill.md`: purposeful motion, representative worst-case states, and desktop/mobile review.
- `docs/agentic-development/forge-engineering-principles.md`: server-first pages, responsive mutation UX, narrow shared boundaries, and React verification.

## Access policy

This slice changes presentation only. Existing public, logged-in, and permission-based access gates remain unchanged.

## Architecture / data flow

- Route `loading.tsx` files remain server components and compose Blade skeletons.
- Reusable Blade motion composition lives under `apps/blade/src/app/_components/shared`.
- Existing tRPC/react-query state drives retained-content and local pending feedback; no new API is introduced.
- App-agnostic reduced-motion fixes may be made in `@forge/ui` primitives. Shared behavior must preserve existing visual defaults for users who have not requested reduced motion.
- No new animation dependency is required. Use Tailwind/tw-animate, CSS transitions, Radix state attributes, and the existing Intersection Observer pattern.

## tRPC/API behavior

No procedure, input, output, authorization, or caching contract changes.

## Validation

No new schemas. UI state remains derived from typed query and mutation state.

## Data / migration / compatibility

No schema, data, environment, or migration changes. Shared UI modifications are restricted to animation duration and reduced-motion behavior.

## Discord integration

Existing hackathon event publication behavior is unchanged. The UI may visualize current desired/published/error counts already returned by the API.

## Configurability review

Would this require a developer change next year?

- Answer: Motion values and skeleton composition are code-level design-system behavior, not annual organizational configuration.

## React / frontend constraints

- Do not add `use client` to route pages.
- Keep public server pages server-rendered by wrapping only animated regions in small client components.
- Content replacing a route skeleton appears directly; do not stack card-by-card entrance motion on authenticated dashboard surfaces. The member signup form retains its pre-existing, one-time section fade because it is a long guided creation flow rather than a dashboard refresh.
- Intersection reveals run once, use a bounded delay, and reveal immediately for reduced-motion users.
- Retained-content loading preserves layout and uses `aria-busy` plus visible status.
- Direct interaction motion should generally finish within 120–220ms; public reveals may use 320–450ms.
- Do not delay routing for reduced-motion users.

## Testing / verification strategy

- Unit tests for structural skeleton exports and reusable motion state where existing test conventions make this practical.
- Existing Blade Vitest suite and targeted loading tests.
- `pnpm analyze:react:changed` for meaningful React changes.
- Blade lint/typecheck and repository precommit checks.
- Playwright screenshots and manual desktop/320px inspection with both normal and reduced motion.

## Open questions

- None.
