---
name: postgres-drizzle
description: How to write and review PostgreSQL schemas, Drizzle queries, and migrations in Forge — table shape in packages/db/src/schemas, constraints, indexes, relations, transactions, and generated migrations in packages/db/drizzle. Use this whenever adding or changing a table or column, writing a non-trivial Drizzle query, generating or reviewing a migration, or diagnosing a slow query. Pair it with forge-api for where queries live and with docs/DATABASE-USAGE.md for what existing tables mean, even when the change looks like a one-column tweak.
---

# Postgres and Drizzle

Forge is on `drizzle-orm` ^0.45 and `drizzle-kit` ^0.31. That is the 0.x
`relations()` API, not v1 `defineRelations()`. Most Drizzle examples online, and
most generic agent skills, use a table shape Forge has never used. Copy a nearby
table, not a tutorial.

`@forge/db` owns schemas, the client, and migrations. It does not own product
queries. Those live in `@forge/api` beside the procedure that needs them. Read
`docs/DATABASE-USAGE.md` before querying an unfamiliar table, because several
columns do not mean what their names suggest.

## Table shape

All 62 tables in `knight-hacks.ts` use the same form: a `(t) => ({ ... })` column
builder and an **object** of extras keyed by name. Do not use the array form
`(table) => [ ... ]` or the `uuid("id")` string-name form. Both compile, and
both make the file inconsistent.

`JudgingAnnouncement` is the model to copy:

```ts
export const JudgingAnnouncement = createTable(
  "judging_announcement",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    hackathonId: t
      .uuid()
      .notNull()
      .references(() => Hackathon.id, { onDelete: "cascade" }),
    roomId: t.uuid(),
    message: t.varchar({ length: 1000 }).notNull(),
    publishedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    clearedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    roomScopeFk: foreignKey({
      columns: [table.roomId, table.hackathonId],
      foreignColumns: [JudgingRoom.id, JudgingRoom.hackathonId],
      name: "knight_hacks_judging_announcement_room_scope_fk",
    }).onDelete("cascade"),
    oneCurrentPerRoom: uniqueIndex(
      "knight_hacks_judging_announcement_current_room_unique",
    )
      .on(table.roomId)
      .where(sql`${table.roomId} IS NOT NULL AND ${table.clearedAt} IS NULL`),
    currentLookup: index(
      "knight_hacks_judging_announcement_current_lookup_idx",
    ).on(table.hackathonId, table.roomId, table.clearedAt),
    messageNotBlank: check(
      "knight_hacks_judging_announcement_message_not_blank_check",
      sql`${table.message} ~ '[^[:space:]]'`,
    ),
  }),
);
```

Rules the example encodes:

- `createTable` is `pgTableCreator` with the `knight_hacks_` prefix. Auth tables
  in `auth.ts` use `auth_`.
- `drizzle.config.ts` sets `casing: "snake_case"`. Write camelCase keys and never
  pass a column name string.
- IDs are `uuid().defaultRandom()`. Forge has no identity or serial keys.
- Timestamps are `timestamp({ withTimezone: true })`. A timestamp without a zone
  silently shifts when the server and the database disagree about time zones.
- Name every constraint and index `knight_hacks_<table>_<what>_<fk|idx|unique|check>`.
  Generated names get truncated at 63 characters and are unreadable in errors.
- A child row that must stay in its parent's hackathon gets a composite foreign
  key over `(parentId, hackathonId)`. A single-column key lets a row point at a
  room from a different hackathon.
- "At most one current X" is a partial `uniqueIndex(...).where(...)`, not
  application code. Code checks race; the index does not.
- Postgres does not index foreign keys. Add an index for every column a list
  query filters or sorts on, leading with the most selective equality column.

Other conventions:

- Enum values come from `@forge/consts`, stored as `pgEnum` or as
  `t.text({ enum })` plus a named `check()`. Adding a value to a `pgEnum` needs
  a migration; a text column with a check needs the check rewritten too.
- Discord IDs are `varchar({ length: 20 })` with a 17-20 digit snowflake check.
- Export `Insert<Table>` and `Select<Table>` from `$inferInsert` and
  `$inferSelect`. Input validation lives in hand-written Zod schemas in
  `@forge/validators`, not `createInsertSchema`.
- Relations go in `schemas/relations.ts` with 0.x `relations()`. A relation is
  query metadata only. It creates no foreign key, so declare `.references()`
  as well.

## Queries

- Import the client from `@forge/db/client`, tables from `@forge/db/schemas/*`,
  and operators from `@forge/db`.
- `and()` and `or()` drop `undefined` arguments. Build optional filters as
  `cond ? eq(col, v) : undefined`, and compare against `undefined` rather than
  truthiness when `0` or `""` is a real value.
- Upserts are `.onConflictDoUpdate({ target, set })`. The target must match a
  real unique constraint or index, or Postgres rejects the statement.
- Prefer `.returning()` over a follow-up select.
- Select the columns you need and map to a DTO before returning from a
  procedure. Never return a raw row.

## Transactions

- Use `db.transaction(async (tx) => ...)` for any multi-table change, and send
  every statement through `tx`. A query on the outer `db` runs on another
  connection, commits on its own, and does not roll back.
- Keep Discord calls, email sends, and MinIO writes outside the transaction.
  Decide what happens when the side effect fails after the commit, and say so in
  a comment.
- Write audit events with the same `tx` (see `forge-api`).

## Migrations

```bash
pnpm db:generate   # drizzle-kit generate, then prettier on drizzle/meta
pnpm db:migrate    # apply pending migrations to DATABASE_URL
```

- Commit `packages/db/drizzle/NNNN_<name>.sql` together with its
  `meta/NNNN_snapshot.json` and `meta/_journal.json`. CI fails on drift between
  the schema and the migrations.
- Do not use `pnpm db:push` for normal work. `packages/db/README.md` reserves it
  for emergencies, because it applies changes with no migration file to review
  or replay.
- Read the generated SQL before applying it. `drizzle-kit` cannot tell a rename
  from a drop and create. It asks interactively, and the wrong answer drops the
  column with its data.
- For a backfill or hand-written SQL, generate a registered empty file with
  `pnpm --filter=@forge/db with-env drizzle-kit generate --custom --name=<name>`.
  A `.sql` file created by hand is missing from `_journal.json` and never runs.
- Add a required column as nullable, backfill it, then tighten it in a later
  migration. Adding `NOT NULL` without a default fails on any table with rows.
- The migrator runs each file in a transaction, so `CREATE INDEX CONCURRENTLY`
  cannot go in a migration. Forge tables are small enough for a plain
  `CREATE INDEX`.
- Never edit or delete a migration that has been applied anywhere. Fix forward
  with a new one.
- Schema changes need explicit human approval (`AGENTS.md`). Put data-change,
  rollout, and rollback notes in the feature's `srd.md`. Drizzle generates no
  down migrations, so rollback is a new forward migration or a restore.

## Performance

Diagnose from a plan, not a guess. `EXPLAIN ANALYZE` executes the statement,
writes included, so run it only against a local or test database. Look for
sequential scans on large tables and for sorts that a composite index could
serve.

Adapted from `postgres-drizzle` in
[ccheney/robust-skills](https://github.com/ccheney/robust-skills) (MIT), rewritten
against this codebase.
