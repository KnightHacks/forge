# Blade App

A Next.js application with TypeScript, tRPC, and various integrations.

## Setup

### Prerequisites
- Node.js (v20+)
- pnpm package manager
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd forge/apps/blade
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your actual values for:
   - Database connection (PostgreSQL)
   - Auth secret (generate with `openssl rand -base64 32`)
   - Stripe API keys
   - Discord bot credentials
   - Google service account credentials
   - Minio/S3 storage credentials
   - Apple Passkit certificates

4. **Setup Minio (Local Object Storage)**
   
   **Option A: Using Docker**
   ```bash
   docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
   ```
   
   **Option B: Using Binary (Windows)**
   ```bash
   # Download Minio binary
   Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile "minio.exe"
   
   # Start Minio server
   ./minio.exe server ./data --console-address ":9001"
   ```
   
   Access Minio Console at: http://localhost:9001
   - Username: `minioadmin`
   - Password: `minioadmin`

5. **Start development server**
   ```bash
   pnpm dev
   ```
   
   The app will be available at: http://localhost:3000

## Environment Variables

Key environment variables needed for local development:

### Required
- `NODE_ENV`: Set to "development" for local development
- `AUTH_SECRET`: Secret for NextAuth.js
- `DATABASE_URL`: PostgreSQL connection string
- `MINIO_ENDPOINT`: Minio server endpoint (use "127.0.0.1" for local)
- `MINIO_ACCESS_KEY`: Minio access key (default: "minioadmin")
- `MINIO_SECRET_KEY`: Minio secret key (default: "minioadmin")

### Optional (for full functionality)
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `DISCORD_BOT_TOKEN`: Discord bot token
- `GOOGLE_PRIVATE_KEY_B64`: Base64 encoded Google service account private key
- Various Apple Passkit certificates for wallet integration

## Project Structure

```
src/
├── app/           # Next.js app router pages
├── consts/        # Constants and configuration
├── lib/           # Utility libraries
└── trpc/          # tRPC configuration and client setup
```

## Development Notes

- The app uses tRPC for type-safe API calls
- Minio is used for object storage (S3-compatible)
- The development setup includes hot reload and type checking
- Environment variables are validated using Zod schemas

## Troubleshooting

### Minio Connection Issues
If you see "Invalid endPoint" errors:
1. Ensure Minio is running on port 9000
2. Use `MINIO_ENDPOINT="127.0.0.1"` (without protocol)
3. Set `NODE_ENV="development"`

### Port Conflicts
If port 3000 or 9000 are in use:
- For Next.js: Use `pnpm dev --port 3001`
- For Minio: Kill existing processes using `taskkill /PID <pid> /F`

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request