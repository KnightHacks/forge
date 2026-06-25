# Forge Engineering Principles

These principles describe the ideal future Forge/Blade architecture for agentic work on `reforge/main`. They are intentionally opinionated so humans and agents write SRDs consistently instead of letting every implementation depend on what the model feels like that day.

Current Forge conventions are useful for understanding the repo, but they are not automatically the target architecture. Preserve important behavior, not accidental debt.

## Product/architecture philosophy

Forge should be a durable platform, not a set of yearly one-off apps.

Ideal-world `apps/*` are thin clients that ingest platform logic from `packages/*`. Clients may be web apps, Discord bots, cron jobs, MCP servers, or other surfaces. Apps should orchestrate user interaction and rendering; durable product capabilities should live in packages where they can be reused safely.

The platform should optimize for durability and maintainability outside of Dev. A non-dev officer should be able to configure recurring organizational changes where practical instead of requiring code edits every time.

Examples of the desired direction:

- Team/role/profile data should be driven by Blade/admin data, not hard-coded site edits.
- New hackathon setup should become configuration/data-driven over time, not a pile of hard-coded constants and database rewiring.
- Constants that reflect organizational state should move toward admin-configurable data when feasible.

## Architectural sins to avoid

- Requiring developer changes for behavior that should be configurable by officers/admins.
- Hard-coding yearly hackathon constants, team lists, role mappings, or operational state in many places.
- Making apps own platform behavior that should be reusable by other clients.
- Letting `@forge/utils` become a junk drawer.
- Copying current debt just because it exists.
- Adding shared abstractions before there is a stable interface and real reuse.

## What is already good

Frontend-only hackathon sites and small frontend-heavy apps are valuable contribution surfaces. They let newer contributors ship visible work without needing to understand the entire platform. Preserve that contributor pathway.

The parts most in need of Reforge are Blade/club/guild-style platform behavior, Discord/cron operational logic, hard-coded constants, and workflows that require dev intervention for routine organizational changes.

## Branch and review policy

- Current production work targets `main`.
- Reforge work targets `reforge/main` through reviewed `reforge/*` branches.
- Do not put Reforge implementation on `main` until cutover.
- Regularly merge `main` into `reforge/main` and document meaningful conflict decisions in the relevant feature/change `status.md`.

## Existing docs to read

Before editing code, read the relevant current Forge docs:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/REPO-CONVENTIONS.md`
- `docs/DATABASE-USAGE.md` before schema/table/query semantics changes
- the relevant `spec.md`, `srd.md`, `test-cases.md`, and `status.md` for Reforge work

## React and Next.js principles

- Use a server-first approach by default for load time, SEO, maintenance, and simpler data flow.
- Pages should stay server-side. Do not put `"use client"` at the page level.
- Pages own routing, auth gates, redirects, stable server-side reads, and high-level composition.
- Use server-side tRPC queries for data that should not change within a session, such as an initial hacker/member profile snapshot.
- Pass server-read data down into rendered components instead of forcing client refetches.
- Client components are for user interactivity, hooks, dynamic form behavior, optimistic/responsive UI, and browser-only APIs.
- Isolate client logic to rendered components. Prefer skeletons and Suspense/loading states so users get immediate page feedback while client pieces hydrate or data streams in.
- Keep the current app-router `_components` style unless an SRD justifies a different structure.
- Organize Blade components by usage/intent, for example:

```txt
apps/blade/src/app/_components/admin/analytics/dashboard.tsx
apps/blade/src/app/_components/applications/form.tsx
apps/blade/src/app/_components/shared/...
```

- Put reusable UI in `@forge/ui` only when it is truly app-agnostic. Blade-specific composed components belong in Blade.

## Sharing and package boundaries

Shared code is expensive. Move code to a package only when reuse is real, the boundary is stable, and the SRD explains why the code belongs there.

- `apps/*` should ingest platform capabilities, not duplicate them.
- `@forge/ui` owns app-agnostic primitives.
- Blade app components own Blade-specific composition and feature UI.
- `@forge/utils` should not collect random helpers. Adding to shared utilities requires a stable cross-app reason.
- Product/platform capabilities that multiple clients need should move toward explicit package APIs.

## tRPC and API principles

- tRPC remains the main API paradigm. Do not add REST by default.
- Use REST only if a future SRD explicitly identifies an unavoidable external protocol boundary. Otherwise, prefer tRPC.
- Routers should be as light as possible while remaining readable.
- Organize routers by product intent/domain, often close to DB objects but not mechanically one-router-per-table. Examples: hackers, hackathons, members, forms.
- It is acceptable for tRPC procedures to contain business workflow logic directly. Do not create separate service files just for architectural purity.
- Keep procedures maintainable: auth/permission gate, input validation, focused DB/workflow logic, standardized error handling, typed output.
- Business logic should primarily live in `@forge/api` and tRPC procedures unless an SRD justifies a reusable platform package.

## Auth and permission tiers

Model access as tiers:

1. unauthenticated/public
2. logged-in user
3. role/permission-based admin or organizer

Internal gates should use the established control-permissions style for admin/organizer access. Client-side hiding is UX only; server/API boundaries must enforce permissions.

## Validation principles

- Use Zod as the default validation tool.
- Validate tRPC inputs in procedures.
- Frontend forms should use form objects/schemas that infer types directly from database-backed validators where practical.
- Prefer `@forge/validators` as the shared home for reusable validation schemas. Validators may import from `@forge/db` and may compose/extend other validators.
- Do not infer validation rules from UI alone.

## Error-handling principles

- Prefer standardized `TRPCError` usage and consistent error classes/messages over ad-hoc failure behavior.
- Use tRPC/react-query mutation hooks such as `onSuccess`, `onError`, `onSettled`, and completion states to build responsive, accessible user feedback.
- Do not introduce typed result-object patterns everywhere unless an SRD explains why they are better for that boundary.

## Real Forge commands

From repo root:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

Useful targeted checks:

```bash
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/club typecheck
pnpm --filter=@forge/api typecheck
pnpm --filter=@forge/db typecheck
pnpm db:generate
pnpm db:migrate
```

Database commands require appropriate local environment setup. Do not claim they passed unless actually run.

## Git/diff discipline

Use diffs constantly:

```bash
git status --short
git diff --stat
git diff --name-only
git diff --check
git diff
```

Before committing, the diff should answer:

- Which spec/SRD/test case does this implement?
- Which apps/packages are touched?
- Which shared consumers could be affected?
- Which tests/checks were run?
- What is intentionally out of scope?

## Security and data hygiene

- Never commit secrets, `.env` files, tokens, credentials, private keys, or production data.
- Do not log secrets or sensitive user data.
- Do not alter auth, permissions, payments, email, uploads, deployment, or database schema without explicit SRD coverage and human approval.
