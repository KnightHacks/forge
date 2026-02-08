# Architecture

This document explains how Forge is structured, how the pieces fit together, and the technologies we use.

## Monorepo Structure

Forge is a Turborepo monorepo containing multiple applications and shared packages.

```
forge/
├── apps/              # Standalone applications
│   ├── blade/         # Main full-stack app (the "backend")
│   ├── club/          # Club website (frontend only)
│   ├── 2025/          # Knight Hacks VIII 2025 site (frontend only)
│   ├── gemiknights/   # GemiKnights 2025 site (frontend only)
│   ├── guild/         # Member networking site (frontend only)
│   ├── tk/            # Discord bot
│   └── cron/          # Cron job server
├── packages/          # Shared packages
│   ├── api/           # tRPC router (API layer)
│   ├── auth/          # Authentication setup
│   ├── db/            # Database schema and client
│   ├── email/         # Email templates and sending
│   ├── ui/            # Shared UI components
│   └── consts/        # Shared constants
└── tooling/           # Shared configuration
    ├── eslint/        # ESLint config
    ├── prettier/      # Prettier config
    ├── tailwind/      # Tailwind config
    └── typescript/    # TypeScript config
```

## How Apps Communicate

### Blade as the "Backend"

While `blade` is technically a Next.js app, it serves as the backend because:

- It contains all write operations (create, update, delete)
- It handles authentication
- It manages role-based permissions
- Other apps only have read access via tRPC

### Frontend-Only Apps

Apps like `club`, `guild`, `2025`, and `gemiknights` are frontend-only and interact with `blade` for data:

- **club**: Reads member count and other club stats
- **guild**: Reads member profiles for the networking directory
- **2025/gemiknights**: Primarily static, minimal backend needs

These apps use tRPC (via `@forge/api`) to make read-only API calls to `blade`.

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

### `@forge/db`

Database layer using Drizzle ORM with PostgreSQL.

- Contains all database schemas
- Exports the database client
- Includes migration scripts
- Located in `packages/db/src/schemas/`

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

## Data Model

### Core Entities

**Users, Members, and Hackers:**

- `User`: Discord OAuth profile (minimal info)
- `Member`: Full profile for club members (Orlando students)
- `Hacker`: Full profile for hackathon participants (national students)

A single `User` can be both a `Member` and a `Hacker`. We separate these because Knight Hacks serves two distinct audiences:
- Local club members at UCF
- National students attending our 1000+ person annual hackathon

**Events and Applications:**

- `Event`: Both club events and hackathon events
- `Application`: Can be club membership applications or hackathon applications
- Applications link to either a `Member` or `Hacker`

**Roles and Permissions:**

- `Role`: Maps to Discord server roles
- `Permission`: Grants access to features in `blade`
- Only relevant in `blade` (the only app with admin features)

**Other Entities:**

- Dues and payments
- Sponsors and partnerships
- Check-ins and attendance tracking
- And more (see `packages/db/src/schemas/knight-hacks.ts`)

## Technology Stack

### Frontend

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + custom components
- **Animations**: Framer Motion, GSAP
- **State Management**: React Query (via tRPC)

### Backend

- **API Layer**: tRPC
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Better Auth with Discord OAuth
- **Object Storage**: MinIO (S3-compatible)
- **Email**: Listmonk

### Infrastructure

- **Monorepo Tool**: Turborepo
- **Package Manager**: pnpm with workspaces
- **Discord Bot**: discord.js
- **Cron Jobs**: node-cron

### Development Tools

- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript
- **Database GUI**: Drizzle Studio

## Development Patterns

### Server-First Architecture

We prioritize Server Components in Next.js:

- Use Server Components by default
- Only use Client Components when necessary (interactivity, hooks, browser APIs)
- Keep data fetching on the server when possible

### tRPC for API Communication

All API communication uses tRPC:

- Type-safe end-to-end
- Shared types between client and server
- No manual API route definitions needed

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

### Filtering

Run commands for specific apps using filters:

```bash
pnpm dev --filter=@forge/blade
pnpm build --filter=@forge/club
```

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
