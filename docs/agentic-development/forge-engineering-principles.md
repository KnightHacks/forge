# Forge Engineering Principles

These principles describe the ideal future Forge/Blade architecture for agentic work on `reforge/main`. They are intentionally opinionated so humans and agents write SRDs consistently instead of letting every implementation depend on what the model feels like that day.

Current Forge conventions are useful for understanding the repo, but they are not automatically the target architecture. Preserve important behavior, not accidental debt.

## Product/architecture philosophy

Forge should be a durable platform, not a set of yearly one-off apps.

Ideal-world `apps/*` are thin clients that ingest platform logic from `packages/*`. Clients may be web apps, Discord bots, cron jobs, MCP servers, or other surfaces. Apps should orchestrate user interaction and rendering; durable product capabilities should live in packages where they can be reused safely.

The ideal package set is intentionally small:

```txt
packages/api          # main platform capability layer and tRPC routers
packages/db           # Drizzle schemas, DB client, migrations; no product queries
packages/validators   # reusable Zod validators derived from/compatible with DB schemas
packages/ui           # app-agnostic UI primitives
packages/auth         # auth/session integration and shared auth helpers
```

Domain concepts like hackathons, members, hackers, forms, issues, judging, Discord operations, and guild profiles are primarily owned by `@forge/api`, not by a proliferation of domain packages. Create new packages only when an SRD proves a stable cross-client boundary is needed.

The platform should optimize for durability and maintainability outside of Dev. A non-dev officer should be able to configure recurring organizational changes where practical instead of requiring code edits every time.

Examples of the desired direction:

- Team/role/profile data should be driven by Blade/admin data, not hard-coded site edits.
- New hackathon setup should become configuration/data-driven over time, not a pile of hard-coded constants and database rewiring.
- Constants that reflect organizational state should move toward admin-configurable data when feasible.

## Architectural sins to avoid

- Requiring developer changes for behavior that should be configurable by officers/admins.
- Hard-coding yearly hackathon constants, team lists, role mappings, Discord IDs, or operational state in many places.
- Making apps own platform behavior that should be reusable by other clients.
- Letting `@forge/utils` become a junk drawer.
- Copying current debt just because it exists.
- Adding shared abstractions before there is a stable interface and real reuse.
- Creating new packages for every domain just because the domain exists.

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
- Prefer good hook usage for interactive/client state: focused hooks such as `useHacker`, `useHackathon`, or `useHackerApplication` are better than scattered `useState`/`useEffect` spam.
- Create and maintain custom hooks when they express reusable client behavior, data/mutation orchestration, or UI state transitions. Hooks should have product-intent names and hide noisy tRPC/react-query mechanics from components when reuse or clarity warrants it.
- Avoid `useEffect` for derived state, simple data shaping, or work that can happen in server reads, tRPC/react-query, form handlers, or memoized derivations.
- Use memoization intentionally for derived values or expensive computations. Do not cargo-cult `useMemo`/`useCallback`, but do avoid repeated ad-hoc derivations that make components noisy.
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
- `@forge/api` is the main platform capability layer.
- `@forge/db` owns schemas, the DB client, migrations, relations/types, and Drizzle exports. It must not own product queries or business workflows.
- Product queries and mutations live in `@forge/api`, near the tRPC routers that need them.
- Discord bots and cron jobs should use the same platform APIs/capabilities as web apps where practical. Wire tRPC access for non-web clients rather than duplicating business logic.
- Non-web clients inside the monorepo/runtime should prefer server-side tRPC callers. Use HTTP clients only when crossing process/deployment boundaries or when an SRD explicitly requires it.
- `@forge/validators` owns reusable validators and form/API schemas.
- `@forge/ui` owns app-agnostic primitives.
- Blade app components own Blade-specific composition and feature UI.
- `@forge/utils` should not collect random helpers. Adding to shared utilities requires a stable cross-app reason.

## Readability and colocation

Prefer code that a maintainer can read in the place they naturally look first.

- Keep business workflow logic close to the tRPC procedure or route that owns the behavior.
- Do not create service/helper files solely to make routers look thin. Thin routers are useful only when the extracted code has a clearer home and real reuse.
- Extract shared code when multiple procedures/routes need the same behavior, when a boundary is truly generic, or when the name of the helper makes the calling code substantially clearer.
- Feature-specific callback wiring, seed/config objects, and mappings should live near the feature/domain that owns them, even when a generic runtime consumes them.
- Use short, durable names. Prefer `memberSchema`, `memberFormSchema`, and `createResponse` over names that encode every implementation detail.
- Comment why a boundary exists, why a transaction is required, why a callback is safe, or why code is intentionally hardcoded for a first slice.
- Do not comment obvious assignments or line-by-line mechanics. Good names should carry the basic meaning.
- If a type helper uses advanced TypeScript inference, hide it behind a named alias and leave a short comment explaining the intent.

## tRPC and API principles

- tRPC remains the main API paradigm for business logic.
- Do not add REST for internal business APIs.
- REST/route handlers are acceptable only for protocol-mandated external boundaries such as OAuth callbacks, webhooks, file downloads/uploads, or ingesting external REST APIs like Discord REST.
- Routers should be as light as possible while remaining readable.
- Organize routers by product intent/domain, often close to DB objects but not mechanically one-router-per-table. Examples: hackers, hackathons, members, forms.
- It is acceptable for tRPC procedures to contain business workflow logic directly. Do not create separate service files just for architectural purity.
- Keep procedures maintainable: auth/permission gate, input validation, focused DB/workflow logic, standardized error handling, typed output.
- Business logic should primarily live in `@forge/api` and tRPC procedures unless an SRD justifies a reusable platform package.
- Multi-step/multi-table mutations should use transactions when consistency requires it. The API layer owns that decision.

## tRPC API documentation and LLM context

Forge should eventually generate machine-readable API context from tRPC, similar in spirit to OpenAPI/Swagger, without turning our business API into REST.

Useful reference points:

- `@trpc/openapi` can generate an OpenAPI 3.1 document from a tRPC router by statically analyzing TypeScript types. It is currently alpha and version-aligned with newer tRPC versions than Forge currently uses, so treat it as a future/candidate tool rather than a required dependency today.
- The older `trpc-openapi` project generated OpenAPI docs and REST handlers, but that repository is archived and is not the direction we want.

Desired Reforge direction:

- keep business logic in tRPC
- do not expose REST for internal business APIs
- generate an API/spec manifest for humans and LLMs from tRPC routers, validators, procedure names, access policy, and JSDoc/Zod descriptions
- use generated docs as context for agents, SRDs, test-case generation, and non-web clients
- avoid hand-maintaining duplicated API docs when the router/schema can be the source

SRDs that create or reshape routers should consider whether the router needs documentation metadata, Zod `.describe()` strings, or comments that improve generated API context.

## Database principles

- `@forge/db` is schemas plus DB client plus migration machinery.
- Do not put product queries, business workflows, Discord calls, email sends, auth gates, or UI-oriented helpers in `@forge/db`.
- Queries should live in `@forge/api`, close to the router/procedure that needs them.
- Migration commands live in the DB package, but migration planning belongs in the feature/change `srd.md` by default.
- SRDs that touch production data should include data-change flows, caveats, validation expectations, and rollback/cutover notes.
- Create a separate `migration.md` only if the migration plan becomes too large or operationally complex for the SRD.

## Auth, Discord, and permission principles

Knight Hacks' production Discord guild is a first-class operational hub. Blade is not merely a web app; it is also a Discord-integrated management plane.

Blade/Future Forge should treat Discord integration as core platform behavior. Reuse Discord logic where applicable and integrate Discord side effects intentionally through the platform rather than scattering one-off calls.

Examples include:

- role sync between Discord roles and Blade auth/permission tables
- role assignment on event/check-in or hackathon participation flows
- configurable hackathon role hashes/role mappings instead of hard-coded yearly role IDs
- permission/capability management
- alumni management
- thread creation
- announcements
- Discord-driven operational workflows
- guild profile management
- Discord bot/client workflows

Access policy must be explicit in every SRD. Model access as tiers:

1. unauthenticated/public
2. logged-in user
3. role/permission-based officer/admin/organizer

The existing permissions system is conceptually strong and should be preserved as a system model, even if the code is refactored. Permission names/capabilities are already configurable through Discord/Blade dashboard flows and should remain admin-manageable.

Use the established control-permissions style for officer/admin/organizer access. Client-side hiding is UX only; server/API boundaries must enforce permissions.

Prefer permission-aware procedures/mutations over ad-hoc admin mutations. Each protected mutation should make its required access tier/permission obvious near the top of the procedure.

## Configurability principles

A core Reforge review question:

> Would this require a developer change next year?

If yes, the SRD should explain why hard-coding is acceptable or define a path to admin-configurable data.

Hard rule of thumb: if a value changes by semester, hackathon, officer team, sponsor cycle, role, event, season, or Discord server configuration, it should not be hard-coded unless the SRD explicitly justifies it.

Configuration should primarily live in DB tables managed through Blade admin UI, not scattered constants, YAML files, or environment variables. Env vars should be reserved for deployment/runtime secrets and infrastructure configuration, not routine organizational state.

Baseline configurable domains include:

- member management
- hacker management
- hackathon management: theme, start/end dates, team classes/counts, registration/application settings, judging/results configuration, Discord role hashes/role mappings
- role and permission management
- guild profile management
- Discord-integrated issues/Jira-style workflows
- judging magic-link auth state
- CSV imports/exports
- results tabs and operational reporting

Avoid generic config blobs unless an SRD proves they are safer than domain-specific tables. Domain-specific admin-managed tables are preferred.

## Validation principles

- Use Zod as the default validation tool.
- tRPC procedure input schemas should come from `@forge/validators` by default.
- Frontend forms should use form objects/schemas that infer types directly from database-backed validators where practical.
- `@forge/validators` should ingest/derive from `@forge/db` schemas and hold reusable validators.
- Prefer patterns like:

```txt
packages/validators/src/member.ts
packages/validators/src/hackathon.ts
packages/validators/src/application.ts
```

- Local one-off schemas should be rare and justified by the SRD or kept truly local if not reusable.
- Do not infer validation rules from UI alone.

## Error-handling and UX principles

- Prefer standardized `TRPCError` usage and consistent error classes/messages over ad-hoc failure behavior.
- Avoid typed result-object patterns everywhere unless an SRD explains why they are better for that boundary.
- Every mutation should consider a standard responsive UX pattern: pending/loading state, success state, error state, safe user-facing messages, and accessible feedback.
- Use tRPC/react-query mutation hooks such as `onSuccess`, `onError`, `onSettled`, and completion states to build responsive, accessible user feedback.
- Error messages shown to users should be safe and centralized where practical.
- Agents should consider loading, empty, success, and error states for every client component that performs user interaction.

## Frontend design-system principles

Frontend work should consult the Blade design system/design guidance when available. If a feature changes visual patterns, layout primitives, component styling, or user interaction conventions, the SRD should reference the relevant design-system doc or note that one is missing.

Agents should use existing UI primitives and Blade conventions before inventing new visual patterns.

## Testing principles

Testing strategy should mix integration, unit, and selected UI/E2E coverage.

- Default proof for business behavior should be integration and unit tests at the owning app/package boundary.
- Vitest is the intended default for unit and package/app integration tests.
- Playwright should be used for important end-to-end/user-path coverage.
- UI E2E should be reserved for high-value paths rather than every component.
- Tests should be written/generated from `test-cases.md` before implementation when practical.
- Tests should live per app/package rather than in one global tests package, so targeted package/app commands can run them.
- React apps should expose `test`, `test:watch`, `e2e`, `analyze:react`, and `analyze:react:changed` scripts in their own `package.json` so Turbo/pnpm filters can target them.
- Core platform packages should expose `test`/`test:watch` scripts as the default place for unit/integration tests.

## Comments and human readability

Code should be readable to future student contributors, not just agents.

- Add comments for non-obvious decisions, platform boundaries, permission assumptions, data migration caveats, Discord side effects, and tricky React/data-flow behavior.
- Prefer comments that explain **why** over comments that restate **what** the next line does.
- Public package exports, complex validators, tricky tRPC procedures, and operational scripts should have enough context for a new contributor to understand the intent.
- Do not add noisy comments, AI-sounding filler, or generic narration.
- Use the repo-level `deslop` skill/checklist on meaningful prose and comments when drafting or reviewing agent-written work.

## Static analysis and CLI verification

Agent verification should use more than tests when useful. Prefer cheap static checks and purpose-built CLI verification before broad manual review.

Baseline pre-commit gate for Reforge work:

```bash
pnpm verify:precommit
```

For non-React changes, the baseline push gate remains:

```bash
pnpm verify:push
```

Equivalent core commands:

```bash
pnpm format
pnpm lint
pnpm typecheck
```

These should pass before pushing unless the PR explicitly documents a blocker. For release/cutover readiness, `pnpm build` should also pass.

React/UI analysis:

```bash
pnpm analyze:react apps/blade/src
pnpm analyze:react <component-file-or-directory>
pnpm analyze:react:changed
pnpm analyze:react:all
pnpm --filter=@forge/blade analyze:react
```

Use React analysis before broad frontend refactors or when an SRD needs component-surface context. For pre-commit checks, prefer `pnpm analyze:react:changed` so Reforge does not inherit all existing React debt at once. Use `pnpm analyze:react:all` or filtered package scripts when intentionally auditing an app/package.

React analyzer is useful for component-surface context: exported components, props, optionality, and wrapper patterns. It is not a complete React quality linter. Pair it with TypeScript, ESLint/react-hooks, review against these principles, and SRD/test expectations for proper hook design, accessibility, loading/error states, and data flow.

Agent-driven browser verification is supported through the repo-level Playwright skill and package `e2e` scripts. Use it for high-value flows, visual/runtime validation, form workflows, and accessibility/user-state checks that static analysis cannot prove.

Future SRDs may add feature-specific CLIs or static analyzers, especially for React/Next patterns, accessibility, route conventions, dependency boundaries, or forbidden hard-coded configuration. Do not add a new analyzer casually; document why it is useful, how to run it, and what failure means.

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
