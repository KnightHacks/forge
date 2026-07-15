# Architecture

This document explains how Forge is structured, how the pieces fit together, and the technologies we use.

## Monorepo Structure

Forge is a Turborepo monorepo containing multiple applications and shared packages.

```
forge/
├── apps/              # Standalone applications
│   ├── blade/         # Main full-stack app and web API host
│   ├── club/          # Club website (frontend only)
│   ├── 2025/          # Knight Hacks VIII 2025 site (frontend only)
│   ├── bloomknights/  # BloomKnights hackathon site (frontend only)
│   ├── gemiknights/   # GemiKnights 2025 site (frontend only)
│   ├── guild/         # Member networking site (frontend only)
│   ├── khix/          # Knight Hacks IX hackathon site (frontend only)
│   ├── tk/            # Discord bot
│   └── cron/          # Cron job server
├── packages/          # Shared packages
│   ├── api/           # tRPC router (API layer)
│   ├── auth/          # Authentication setup
│   ├── consts/        # Shared constants and metadata
│   ├── db/            # Database schema and client
│   ├── email/         # Email templates and sending
│   ├── ui/            # Shared UI components
│   ├── utils/         # Reusable non-UI helpers and integrations
│   └── validators/    # Shared Zod schemas and validation helpers
├── legacy/            # Behavioral reference; excluded from the workspace
└── tooling/           # Shared configuration
    ├── eslint/        # ESLint config
    ├── prettier/      # Prettier config
    ├── tailwind/      # Tailwind config
    └── typescript/    # TypeScript config
```

## Reforge Branch State

`reforge/main` is the active Blade Reforge development line. Production
maintenance continues on `main`; Reforge changes should preserve important
production behavior without copying legacy file boundaries or known debt.

The completed Reforge feature bundles currently cover:

- initial member onboarding and profile editing;
- the mobile member experience, member QR codes, and dues payments;
- the admin member dashboard and Discord-backed role management; and
- club event management, member event discovery, attendance, and check-in.

The active API currently registers `auth`, `dues`, `event`, `forms`, `health`,
`member`, `profilePicture`, `qr`, `resume`, and `roles` capabilities in
`packages/api/src/root.ts`. Member-administration procedures are composed into
the member capability rather than exposed as a separate root router.

The `legacy/` tree is deliberately excluded from `pnpm-workspace.yaml`. Its
`CURRENT.md` inventories are evidence for behavior that Reforge may need to
preserve; legacy source is not an implementation target.

### Intentional Guild Baseline Failure

The active Reforge API does not yet restore the `guild` router. The Guild app
and Club team roster still reference `api.guild`, so full-workspace typecheck
and build currently fail at those unchanged consumers. This is an intentional
baseline condition until Guild is selected as a Reforge feature.

Feature work outside Guild should run targeted checks for every touched app or
package and record the inherited Guild failure separately when a root command
reaches it. Do not weaken types or add a placeholder router merely to make the
workspace gate green.

## How Apps Communicate

### Blade as the Web API Host

Blade is a Next.js application that hosts the current web-facing tRPC and auth
protocol endpoints:

- It exposes platform workflows implemented by `@forge/api`.
- It handles Better Auth protocol routes and Discord OAuth.
- It enforces role-based permissions at server/API boundaries.
- Frontend-only apps consume type-safe read capabilities through tRPC.

Business workflows belong in `@forge/api`, not in Blade pages or `@forge/db`.
Blade pages own routing, auth gates, redirects, initial server reads, and
high-level rendering.

### Frontend-Only Apps

Apps such as `club`, `guild`, `2025`, `bloomknights`, `gemiknights`, and `khix`
are frontend-only sites. Where they need platform data, they consume
`@forge/api` capabilities exposed by Blade.

- **club**: Reads member count and other club stats
- **guild**: Will read member profiles once the intentionally absent Reforge
  Guild capability is restored.
- **2025/bloomknights/gemiknights/khix**: Primarily static hackathon sites with
  minimal backend needs.

These apps use tRPC (via `@forge/api`) to make read-only API calls to `blade`.

`tk` and `cron` are operational clients rather than frontend-only apps. New
work should reuse platform capabilities from `@forge/api` where practical
instead of duplicating product workflows.

### Authentication Flow

All authentication is centralized in `blade`:

1. User clicks "Login" on any frontend app
2. They're redirected to `blade` with a callback URL
3. `blade` handles Discord OAuth via Better Auth
4. After authentication, user is redirected to the necessary functional page on Blade

## Shared Packages

### `@forge/api`

The tRPC router that defines all API endpoints. This is the API layer that apps use to communicate with the backend.

- Contains read and write procedures
- Only `blade` exposes write operations
- Other apps consume read-only endpoints

To create a new API endpoint, you need to add a procedure in an existing router, or create a new router altogether. If creating a new router, you need to add it to the `appRouter` in `packages/api/src/root.ts`. Then, this new procedure will be available to all apps that use the `@forge/api` package.

### `@forge/db`

Database layer using Drizzle ORM with PostgreSQL.

- Contains all database schemas
- Exports the database client
- Includes committed SQL migrations and migration helper scripts
- Located in `packages/db/src/schemas/`

Local development applies schema changes with `pnpm db:migrate`. Schema edits should be followed by `pnpm db:generate`, and the generated files in `packages/db/drizzle/` are part of the reviewed source of truth.

### `@forge/auth`

Authentication setup using Better Auth with Discord OAuth.

- Currently only used in `blade`
- Separated as a package for potential future use in other apps
- Handles Discord OAuth flow and session management

### `@forge/email`

Email system using Listmonk.

- Email templates (React Email)
- Email sending functions
- Used for member communications, hackathon notifications, etc.

### `@forge/ui`

Shared UI component library.

- Mix of shadcn/ui components and custom in-house components
- Used across multiple apps for consistency
- Each app also has its own `components/` folder for app-specific components

### `@forge/consts`

Shared constants used across the repository.

- Discord role IDs
- URLs and domains
- Majors of study
- Other static configuration values

### `@forge/validators`

Reusable Zod contracts for API inputs, forms, and shared validation behavior.

- Owns cross-boundary validation schemas and pure validation helpers
- May derive from or remain compatible with database-backed types
- Must not own database access, API workflows, auth, or UI behavior

### `@forge/utils`

Reusable non-UI helpers and integrations with stable cross-app value.

- Owns shared date, permission, transform, export, and integration helpers
- Must not become a home for feature-specific business workflows or constants
- Server-only behavior must remain behind explicit server-only exports

## Data Model

### Core Entities

**Users, Members, and Hackers:**

- `User`: Discord OAuth profile (minimal info)
- `Member`: Full profile for club members (Orlando students)
- `Hacker`: Full profile for hackathon participants (national students)

A single `User` can be both a `Member` and a `Hacker`. We separate these because Knight Hacks serves two distinct audiences:

- Local club members at UCF
- National students attending our 1000+ person annual hackathon

**Events, Applications, and Forms:**

- `Event`: Both club events and hackathon events
- `HackerAttendee`: Per-hackathon application and attendance state for a hacker
- `FormsSchemas` and `FormResponse`: Identified dynamic form definitions and
  submissions, including immutable question/option snapshots for historical
  accuracy
- `FormSection`: Organizational and role-based admin access boundary for forms
- `FormAttachment`: Instruction media and respondent uploads stored in MinIO
- `FormCallbackConfiguration` and `FormCallbackExecution`: Configuration and
  durable asynchronous execution state for code-owned form actions
- `EventFeedbackConfig` and `EventFeedbackReward`: The event-linked feedback
  window and one-time five-point award; feedback answers are identified
  `FormResponse` rows linked through the configuration's form ID

**Roles and Permissions:**

- `Role`: Maps to Discord server roles
- `Permission`: Grants access to features in `blade`
- Discord-linked roles also drive operational synchronization and reminders

**Other Entities:**

- Dues and payments
- Sponsors and partnerships
- Check-ins and attendance tracking
- And more (see `packages/db/src/schemas/knight-hacks.ts`)

## Forms and Event Feedback

The forms platform is implemented across shared contracts, API workflows,
Blade surfaces, persistent storage, and cron workers rather than as a page-local
builder.

- `@forge/validators` owns the form definition, response, availability,
  callback-mapping, and file constraints shared across boundaries.
- `@forge/api` owns lifecycle and section-access enforcement, form response
  rules, immutable answer snapshots, analytics/CSV generation, upload access,
  callback registration/execution, and event-feedback policy.
- `@forge/db` persists definitions, section role gates, responses, single-
  response claims, attachments, callback state, event-feedback configuration,
  responses, and rewards. Migration `0013_outgoing_betty_brant.sql` introduces
  the active platform model and archives legacy definitions for controlled
  republishing.
- Blade exposes direct respondent routes at `/form/[slug]`, member-owned generic
  response history at `/member/forms`, form administration under `/admin/forms`,
  and event-specific feedback through the existing member/admin event flows.
- Cron workers dispatch pending callback executions, reclaim expired running
  leases for retry, and delete abandoned/replaced form attachments after the
  retention boundary.

Generic forms are direct-link only for respondents. Their state machine is
`Draft -> Published <-> Archived`; published definitions edit in place using
stable IDs. Global permissions are evaluated before section viewer/editor role
gates, with the officer bypass enforced server-side. The callback registry is
an explicit, code-owned catalog: the builder may map fields or fixed values only
to registered procedures, and unavailable procedures remain visible but
disabled with their required permission. Each worker claims a durable execution
lease; expired running leases return to the claimable queue, while terminal
failures remain available for an authorized manual retry.

Event feedback is intentionally siloed from generic form discovery and
analytics. Qualifying non-hackathon events provision a locked response window
with no start gate and a deadline seven days after event end. Checked-in
attendees submit from event cards/dialogs, receive one durable five-point
reward, and cannot edit or repeat the response. Event administration exposes
deterministic aggregates and identified answers according to separate
event-read and response-read permissions; local response exclusions affect only
the current analytics view.

## Technology Stack

### Frontend

- **Framework**: Next.js 16.2 with App Router and React 19.2
- **Styling**: Tailwind CSS 4.2
- **UI Components**: shadcn/ui + custom components
- **Client Data State**: React Query 5 via tRPC

### Backend

- **API Layer**: tRPC 11 with Zod 4 contracts
- **Database**: PostgreSQL with Drizzle ORM 0.45
- **Authentication**: Better Auth 1.4 with Discord OAuth
- **Object Storage**: MinIO (S3-compatible)
- **Email**: Listmonk

### Infrastructure

- **Monorepo Tool**: Turborepo 2.8
- **Package Manager**: pnpm 9.12 with workspaces
- **Discord Bot**: discord.js
- **Cron Jobs**: node-cron

### Development Tools

- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript 5.9
- **Unit/Integration Testing**: Vitest 4
- **Browser Testing**: Playwright 1.61
- **Database GUI**: Drizzle Studio

## Development Patterns

### Server-First Architecture

We prioritize Server Components in Next.js:

- Use Server Components by default
- Only use Client Components when necessary (interactivity, hooks, browser APIs)
- Keep data fetching on the server when possible
- Keep `page.tsx` files thin; move interactive feature UI into app-local
  `_components` directories

### tRPC for API Communication

Normal product API communication uses tRPC:

- Type-safe end-to-end
- Shared types between client and server
- REST/route handlers are reserved for protocol boundaries such as auth,
  webhooks, file transfer, and the tRPC transport itself

### Shared Configuration

Configuration is centralized in `tooling/`:

- ESLint, Prettier, Tailwind, and TypeScript configs are shared
- Apps and packages extend these base configs
- Ensures consistency across the entire monorepo

## Turborepo

Turborepo orchestrates the monorepo, handling builds, dev servers, and caching.

### Key Commands

- `pnpm dev` - Run all apps in development mode
- `pnpm build` - Build all apps for production
- `pnpm lint` - Lint all packages
- `pnpm typecheck` - Type-check all packages
- `pnpm test` - Run workspace unit and integration tests
- `pnpm verify:push` - Run format, lint, and typecheck gates
- `pnpm verify:precommit` - Add changed-React analysis to the push gates

### Filtering

Run commands for specific apps using filters:

```bash
pnpm dev --filter=@forge/blade
pnpm build --filter=@forge/club
pnpm --filter=@forge/api test
pnpm --filter=@forge/blade typecheck
```

Because Guild is an intentional baseline failure, targeted filtered commands
are the authoritative validation for non-Guild feature work until that
capability is restored. Meaningful Blade UI changes should also run
`pnpm analyze:react:changed --base=reforge/main` and the relevant Playwright
specs. The main CI workflow does not currently run Blade Playwright tests.

### Pipeline

Turborepo uses a pipeline defined in `turbo.json` that:

- Determines task dependencies (e.g., build depends on typecheck)
- Caches task outputs for faster subsequent runs
- Runs tasks in parallel when possible

## Deployment

### Infrastructure

- **Orchestration**: Coolify (self-hosted PaaS)
- **Hosting**: Azure VMs (Observer + Worker nodes)
- **Observer Node**: Runs Coolify control plane, PostgreSQL, and MinIO
- **Worker Node**: Runs all applications (blade, club, guild, etc.), tk bot, and cron server

### Deployment Strategy

Each app is deployed separately:

- Apps have independent build, install, and start commands
- Each app has its own watch paths for automatic rebuilds
- Frontend apps are deployed as static sites or SSR depending on needs
- `tk` and `cron` run as long-lived processes

### Environment Separation

- **Development**: Local with Docker Compose for databases
- **Production**: Azure infrastructure with Coolify

## Helpful Resources

### Core Technologies

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)

### UI and Styling

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Framer Motion Documentation](https://www.framer.com/motion/)

### Tools

- [pnpm Documentation](https://pnpm.io/)
- [discord.js Guide](https://discordjs.guide/)

## Next Steps

Now that you understand the architecture:

- Read the [Contribution Guide](../CONTRIBUTING.md) for contribution guidelines
- Setup your environment by following the [Getting Started Guide](./GETTING-STARTED.md)
- Check out the [API & Permissions](./API-AND-PERMISSIONS.md) guide for forge specific backend development guidelines
- Read our [GitHub Etiquette](./GITHUB-ETIQUETTE.md) guide for how to contribute to the project
