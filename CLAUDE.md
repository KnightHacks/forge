# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                          # Run all apps concurrently
pnpm dev --filter=@forge/blade    # Run a specific app (blade, club, guild, etc.)
pnpm dev:blade                    # Alias for running blade only

# Quality checks (run all before submitting a PR)
pnpm lint                         # ESLint
pnpm lint:fix                     # ESLint with auto-fix
pnpm format                       # Prettier check
pnpm format:fix                   # Prettier auto-fix
pnpm typecheck                    # TypeScript
pnpm build                        # Full production build

# Database
docker compose up                 # Start local Postgres
pnpm db:push                      # Push schema changes to local DB
pnpm db:studio                    # Open Drizzle Studio GUI at local.drizzle.studio
docker compose down --volumes     # Reset database completely

# Utilities
pnpm ui-add <component>           # Add a shadcn/ui component to @forge/ui
pnpm turbo gen init               # Scaffold a new package
pnpm db:bootstrap                 # Bootstrap superadmin user
```

## Architecture

Forge is a **Turborepo monorepo** (pnpm workspaces) for Knight Hacks' entire digital ecosystem.

### Apps (`apps/`)

| App           | Type               | Role                                            |
| ------------- | ------------------ | ----------------------------------------------- |
| `blade`       | Next.js full-stack | The "backend" — all auth, all writes, all admin |
| `club`        | Next.js frontend   | Club website, reads stats from blade            |
| `guild`       | Next.js frontend   | Member networking directory                     |
| `2025`        | Next.js frontend   | Knight Hacks VIII hackathon site                |
| `gemiknights` | Next.js frontend   | GemiKnights 2025 event site                     |
| `tk`          | Node.js            | Discord bot (discord.js)                        |
| `cron`        | Node.js            | Scheduled jobs (node-cron)                      |

**Blade is the only app with write operations.** All other Next.js apps are read-only frontends that call blade's tRPC endpoints for data.

### Packages (`packages/`)

- **`@forge/api`** — tRPC router (~22 routers). Add new routers to `packages/api/src/root.ts`. All apps consume this.
- **`@forge/db`** — Drizzle ORM + PostgreSQL. Schemas in `packages/db/src/schemas/`. Two schema files: `auth.ts` (sessions) and `knight-hacks.ts` (domain entities).
- **`@forge/auth`** — Better Auth with Discord OAuth. Currently only used in blade.
- **`@forge/ui`** — Shared shadcn/ui + custom components. Apps also have their own `components/` for app-specific UI.
- **`@forge/email`** — React Email templates + Listmonk sending.
- **`@forge/validators`** — Shared Zod schemas.
- **`@forge/consts`** — Shared constants: Discord role IDs, URLs, majors, `PERMISSIONS` object.

### Tooling (`tooling/`)

Shared ESLint, Prettier, Tailwind, and TypeScript configs. All apps/packages extend these.

## Data Model

Three core user concepts (a person can be all three):

- **`User`** — Discord OAuth profile (minimal info, created on login)
- **`Member`** — Full profile for UCF club members
- **`Hacker`** — Full profile for hackathon participants

## tRPC Procedure Types

Choose the right procedure type in `packages/api/src/routers/`:

| Procedure            | When to use                                                     |
| -------------------- | --------------------------------------------------------------- |
| `publicProcedure`    | No auth required                                                |
| `protectedProcedure` | Auth required, no specific permissions                          |
| `permProcedure`      | Specific permissions required (loads `ctx.session.permissions`) |
| `judgeProcedure`     | **Deprecated** — use `permProcedure` instead                    |

### Permission Checking

```typescript
import { controlPerms } from "../utils";

// User needs ANY of these permissions (IS_OFFICER always passes)
controlPerms.or(["MANAGE_EVENTS", "VIEW_EVENTS"], ctx);

// User needs ALL of these permissions
controlPerms.and(["MANAGE_EVENTS", "DELETE_EVENTS"], ctx);
```

Permissions are stored as bit strings. The `PERMISSIONS` object in `@forge/consts/knight-hacks` maps permission names to bit indices. `IS_OFFICER` automatically passes all checks.

## Mutation Logging Requirement

**Every mutation must log both success and failure** via Discord webhook:

```typescript
import { log } from "../utils";

.mutation(async ({ input, ctx }) => {
  try {
    const result = await db.update(Something).set(input);

    await log({
      title: "Something Updated",
      message: `Updated ID ${input.id}`,
      color: "success_green",   // or "uhoh_red", "blade_purple", "tk_blue"
      userId: ctx.session.user.discordUserId,
    });

    return result;
  } catch (error) {
    await log({
      title: "Update Failed",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      color: "uhoh_red",
      userId: ctx.session.user.discordUserId,
    });
    throw error;
  }
}),
```

## Form Integration Pattern

tRPC procedures called from dynamic forms need `.meta()` with both `id` and `inputSchema` matching the `.input()` schema exactly. The form responder client uses this metadata for client-side validation.

## Development Patterns

- **Server Components by default** — only use Client Components for interactivity/hooks/browser APIs
- **Commit messages in all lowercase**, concise and descriptive
- Assign roles through the Blade UI (not directly in Discord) for immediate permission sync
- Use `TRPCError` for error responses; always re-throw after logging
