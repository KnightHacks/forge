# Database Migrations (Drizzle)

This package uses migration files committed to the repository.

## Standard workflow

1. Update schema files in `src/schemas/`.
2. Generate migration SQL:

```bash
pnpm db:generate
```

3. Commit the generated files in `packages/db/drizzle/`.
4. Open a PR. CI will fail if schema and migration files are out of sync.
5. After merge to `main`, CI applies pending migrations with `pnpm db:migrate`.

## Commands

- `pnpm db:generate`: Generate SQL migration files from schema changes.
- `pnpm db:migrate`: Apply pending migrations using `DATABASE_URL`.
- `pnpm db:push`: Directly push schema changes (emergency/non-standard only).

## Notes

- Migrations are the reviewable source of truth for DB changes.
- Production migration apply job expects `PROD_DATABASE_URL` in GitHub secrets and maps it to `DATABASE_URL`.
