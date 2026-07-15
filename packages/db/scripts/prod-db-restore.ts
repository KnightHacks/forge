export interface PsqlConnection {
  database: string;
  host: string;
  port: string;
  user: string;
}

export function psqlFileArgs(
  connection: PsqlConnection,
  files: readonly string[],
  { singleTransaction = false }: { singleTransaction?: boolean } = {},
) {
  return [
    "-v",
    "ON_ERROR_STOP=1",
    ...(singleTransaction ? ["--single-transaction"] : []),
    "-h",
    connection.host,
    "-p",
    connection.port,
    "-U",
    connection.user,
    "-d",
    connection.database,
    ...files.flatMap((file) => ["-f", file]),
  ];
}

export function truncateRestorePrelude() {
  return `CREATE SCHEMA IF NOT EXISTS "forge_local_restore";
DROP TABLE IF EXISTS "forge_local_restore"."drizzle_migrations";
DROP TABLE IF EXISTS "forge_local_restore"."event_tags";
CREATE TABLE "forge_local_restore"."drizzle_migrations" AS
  TABLE "drizzle"."__drizzle_migrations";

DO $$
BEGIN
  IF to_regclass('public.knight_hacks_event_tag') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE "forge_local_restore"."event_tags" AS TABLE "public"."knight_hacks_event_tag"';
  END IF;
END $$;

DO $$
DECLARE
  table_row RECORD;
BEGIN
  FOR table_row IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', 'public', table_row.tablename);
  END LOOP;
END $$;
TRUNCATE TABLE "drizzle"."__drizzle_migrations";
`;
}

export function truncateRestorePostlude() {
  return `TRUNCATE TABLE "drizzle"."__drizzle_migrations";
INSERT INTO "drizzle"."__drizzle_migrations"
SELECT * FROM "forge_local_restore"."drizzle_migrations";

DO $$
DECLARE
  has_event_tags boolean;
BEGIN
  IF to_regclass('public.knight_hacks_event_tag') IS NOT NULL THEN
    IF to_regclass('forge_local_restore.event_tags') IS NOT NULL THEN
      EXECUTE 'INSERT INTO "public"."knight_hacks_event_tag" SELECT * FROM "forge_local_restore"."event_tags" ON CONFLICT ("normalized_name") DO NOTHING';
    END IF;
    EXECUTE 'UPDATE "public"."knight_hacks_event" AS event SET "tag_color" = tag."color" FROM "public"."knight_hacks_event_tag" AS tag WHERE event."legacy" = true AND tag."name" = event."tag"';
    EXECUTE 'UPDATE "public"."knight_hacks_event_attendee" AS attendance SET "points_awarded" = COALESCE(event."points", (SELECT tag."default_points" FROM "public"."knight_hacks_event_tag" AS tag WHERE tag."name" = event."tag" LIMIT 1), 0), "points_awarded_estimated" = true FROM "public"."knight_hacks_event" AS event WHERE attendance."event_id" = event."id" AND attendance."points_awarded" IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."knight_hacks_event_attendee" AS attendance
    LEFT JOIN "public"."knight_hacks_event" AS event
      ON event."id" = attendance."event_id"
    LEFT JOIN "public"."knight_hacks_member" AS member
      ON member."id" = attendance."member_id"
    WHERE event."id" IS NULL OR member."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Production restore left orphan event attendance rows.';
  END IF;

  IF to_regclass('public.knight_hacks_event_tag') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM "public"."knight_hacks_event_tag")'
      INTO has_event_tags;
    IF NOT has_event_tags THEN
      RAISE EXCEPTION 'Production restore left the event tag catalog empty.';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations") THEN
    RAISE EXCEPTION 'Production restore lost the local migration ledger.';
  END IF;
END $$;

DROP SCHEMA "forge_local_restore" CASCADE;
`;
}
