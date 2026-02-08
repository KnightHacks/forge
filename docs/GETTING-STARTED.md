# Getting Started

This guide will help you set up Forge locally and make your first contribution.

## Who This Is For

**Knight Hacks Dev Team Members:** You'll have access to shared environment variables and private channels.

**External Contributors:** You're welcome to contribute! You'll need to set up your own credentials for certain features, but most of the app works without them.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js LTS](https://nodejs.org/en/download/) (v20.16.0 or higher)
- [pnpm](https://pnpm.io/installation) (v9.6.0 or higher)
- [Docker Desktop](https://docs.docker.com/get-docker/)
- A POSIX/Unix terminal (Linux, macOS, or WSL for Windows users)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/KnightHacks/forge.git
cd forge
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the repository root.

#### For Dev Team Members

You have access to the shared environment variables document in Notion. Copy those values into your `.env` file.

If you don't have access, you need a Knight Hacks email. Reach out to [secretary@knighthacks.org](mailto:secretary@knighthacks.org) to get access.

#### For External Contributors

You'll need to set up your own credentials. Use `.env.example` as a template.

**Minimum Required Setup:**

To open the app locally, you need Discord OAuth credentials:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Get your Client ID and Client Secret
4. Add these to your `.env` file

**Optional Services (for specific features):**

You only need these if you're working on the corresponding features:

- **Events Pages** (hack or club): Google Cloud Platform project with Calendar API enabled. Get the JSON credentials and add to `.env`
- **Email Functions**: Set up [Listmonk](https://listmonk.app/) (self-hosted or cloud) and get access keys
- **S3/Object Storage**: Set up [MinIO](https://min.io/) (self-hosted or cloud) and get access keys

See `.env.example` for all required environment variable names.

### 4. Set Up the Database

Start the local Postgres database with Docker:

```bash
docker compose up
```

> IMPORTANT!

You must push the database schema to your local database before running the project. This is a common source of errors for new contributors.

```bash
pnpm db:push
```

**Optional:** View the database contents with Drizzle Studio:

```bash
pnpm db:studio
```

This opens a GUI at [local.drizzle.studio](http://local.drizzle.studio).

### 5. (Optional) Bootstrap Superadmin Access

If you need to work on admin-level pages or test permission-based features, you'll need superadmin access. This requires a one-time bootstrap step.

**Why is this needed?**

Forge uses a role-based permission system. To access admin features, you need a role with permissions. But to create roles, you need admin access. This creates a chicken-and-egg problem for fresh databases. The bootstrap script solves this by directly inserting a superadmin role into the database.

**How to bootstrap:**

1. Start the database and run Blade at least once
2. Log in to Blade using Discord OAuth (this creates your user record)
3. Get your Discord user ID (right-click your profile in Discord with Developer Mode enabled)
4. Choose any Discord role ID to link to the superadmin role (this is just metadata stored in the database)
5. Run the bootstrap script:

```bash
pnpm db:bootstrap <discord-role-id> <discord-user-id>
```

Example:

```bash
pnpm db:bootstrap 1321955700540309645 238081392481665025
```

After running this, you'll have full superadmin permissions and can manage other roles through the Blade UI.

### 6. (Optional) Populate Test Data from Production

**Dev Team Members Only:** If you have access to the shared MinIO instance, you can pull a sanitized copy of production data to test with realistic data locally.

```bash
pnpm db:pull
```

This downloads and inserts production data into your local database without removing existing data (like your superadmin role).

If you want to completely replace your local database with the production snapshot:

```bash
pnpm db:pull --truncate
```

**Note:** You can run the superadmin bootstrap script after pulling production data if needed.

## Running the Project

### Run All Applications

```bash
pnpm dev
```

This starts all apps concurrently. Each app will be available at its own port.

### Run a Specific Application

```bash
pnpm dev --filter=@forge/blade
```

Replace `@forge/blade` with any app name.

### Application Ports

When running the apps, they will be available at the following ports:

| App | Package Name | Port | URL | Description |
|-----|-------------|------|-----|-------------|
| Blade | `@forge/blade` | 3000 | http://localhost:3000 | Main monolithic app (membership, hacker registration, dues, events) |
| Club | `@forge/club` | 3001 | http://localhost:3001 | Club site (frontend only) |
| 2025 | `@forge/2025` | 3002 | http://localhost:3002 | Knight Hacks VIII 2025 hackathon site (frontend only) |
| Guild | `@forge/guild` | 3003 | http://localhost:3003 | Member networking site (Knight Hacks LinkedIn) |
| GemiKnights | `@forge/gemiknights` | 3005 | http://localhost:3005 | GemiKnights 2025 hackathon site (frontend only) |
| TK | `@forge/tk` | N/A | N/A | Discord bot for Knight Hacks server |
| Cron | `@forge/cron` | N/A | N/A | Cron job server |

## What Works Locally

Most features work out of the box with just Discord OAuth configured.

**Features that require additional setup:**

- Events pages (hack or club) - requires Google Calendar API
- Email sending - requires Listmonk
- File uploads/S3 operations - requires MinIO

## Making Your First Contribution

### Find an Issue

Look for issues labeled [`Onboarding`](https://github.com/KnightHacks/forge/labels/Onboarding) on GitHub. These are beginner-friendly tasks designed for new contributors.

### Development Workflow

1. Create a new branch for your changes
2. Make your changes
3. Test your changes locally
4. Run checks before submitting:
   ```bash
   pnpm format
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
5. Commit your changes (use lowercase, descriptive commit messages)
6. Push your branch and open a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines on commits, pull requests, and testing.

## Getting Help

### Dev Team Members

Ask questions in the private dev team Discord channel.

### External Contributors

Ask questions in the [Knight Hacks Discord server](https://discord.com/channels/486628710443778071/486631140552212491).

You can also join the broader [Knight Hacks community Discord](https://discord.gg/ynr44H6KAY) for general support.

## Common Issues

### Database Connection Errors

Make sure Docker is running and the Postgres container is up:

```bash
docker compose ps
```

If the container isn't running, start it with `docker compose up`.

### Port Already in Use

If a port is already in use, stop the conflicting process or change the port in the app's configuration.

### pnpm Installation Fails

Make sure you're using the correct versions:

```bash
node --version  # Should be >= 20.16.0
pnpm --version  # Should be >= 9.6.0
```

## Next Steps

Now that you're set up, explore the codebase:

- Check out the [Architecture Overview](./ARCHITECTURE.md) to understand how everything fits together
- Look at the [API & Permissions](./API-AND-PERMISSIONS.md) guide for backend development guidelines
- Read our [GitHub Etiquette](./GITHUB-ETIQUETTE.md) guide for how to contribute to the project
