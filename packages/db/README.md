# Database Migrations (Drizzle)

This package uses migration files committed to the repository.

## Standard workflow

1. Start a local Postgres database.
2. Apply committed migrations:

```bash
pnpm db:migrate
```

3. Update schema files in `src/schemas/`.
4. Generate migration SQL:

```bash
pnpm db:generate
```

5. Commit the generated files in `packages/db/drizzle/`.
6. Open a PR. CI will fail if schema and migration files are out of sync and will smoke test applying migrations.
7. After merge to `main`, CI can apply pending migrations with `pnpm db:migrate` once production is baselined and the deploy gate is enabled.

## Commands

- `pnpm db:generate`: Generate SQL migration files from schema changes.
- `pnpm db:migrate`: Apply pending migrations using `DATABASE_URL`.
- `pnpm db:pull`: Restore the filtered prod-like backup into the database at `DATABASE_URL`.
- `pnpm db:push`: Directly push schema changes (emergency/non-standard only).

## Notes

- Migrations are the reviewable source of truth for DB changes.
- Local development should use `pnpm db:migrate`, not `pnpm db:push`.
- `pnpm db:pull` is intended for maintainers/CI jobs that have MinIO credentials.
- Production migration apply job expects `PROD_DATABASE_URL` in GitHub secrets and maps it to `DATABASE_URL`.
