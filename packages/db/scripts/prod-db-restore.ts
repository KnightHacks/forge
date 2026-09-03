export interface PsqlConnection {
  database: string;
  host: string;
  port: string;
  user: string;
}

const RETIRED_JUDGING_TABLES = new Set([
  "auth_judge_session",
  "knight_hacks_challenges",
  "knight_hacks_judged_submission",
  "knight_hacks_judges",
  "knight_hacks_submissions",
  "knight_hacks_teams",
]);

export function isRetiredJudgingDumpStatement(line: string) {
  const statementPattern =
    /^\s*(?:INSERT INTO|ALTER TABLE(?: ONLY)?)\s+(?:"?public"?\.)?"?([a-z0-9_]+)"?\b/u;
  const table = statementPattern.exec(line)?.[1];
  return table ? RETIRED_JUDGING_TABLES.has(table) : false;
}

export class RetiredJudgingDumpFilter {
  private blockComment = false;
  private dollarQuote: string | null = null;
  private doubleQuoted = false;
  private dropping = false;
  private escapeString = false;
  private singleQuoted = false;

  shouldInclude(line: string) {
    const startsInSql =
      !this.blockComment &&
      !this.dollarQuote &&
      !this.doubleQuoted &&
      !this.singleQuoted;
    if (startsInSql && isRetiredJudgingDumpStatement(line)) {
      this.dropping = true;
    }

    const include = !this.dropping;
    const statementEnded = this.scan(line);
    if (this.dropping && statementEnded) this.dropping = false;
    return include;
  }

  private scan(line: string) {
    let statementEnded = false;
    for (let index = 0; index < line.length; index += 1) {
      if (this.dollarQuote) {
        if (line.startsWith(this.dollarQuote, index)) {
          index += this.dollarQuote.length - 1;
          this.dollarQuote = null;
        }
        continue;
      }
      if (this.singleQuoted) {
        if (this.escapeString && line[index] === "\\") {
          index += 1;
        } else if (line[index] === "'" && line[index + 1] === "'") {
          index += 1;
        } else if (line[index] === "'") {
          this.escapeString = false;
          this.singleQuoted = false;
        }
        continue;
      }
      if (this.doubleQuoted) {
        if (line[index] === '"' && line[index + 1] === '"') {
          index += 1;
        } else if (line[index] === '"') {
          this.doubleQuoted = false;
        }
        continue;
      }
      if (this.blockComment) {
        if (line[index] === "*" && line[index + 1] === "/") {
          index += 1;
          this.blockComment = false;
        }
        continue;
      }

      if (line[index] === "-" && line[index + 1] === "-") break;
      if (line[index] === "/" && line[index + 1] === "*") {
        index += 1;
        this.blockComment = true;
        continue;
      }
      if (line[index] === "'") {
        const prefix = line[index - 1];
        const beforePrefix = line[index - 2];
        this.escapeString =
          (prefix === "E" || prefix === "e") &&
          (beforePrefix === undefined || !/[A-Za-z0-9_$]/u.test(beforePrefix));
        this.singleQuoted = true;
        continue;
      }
      if (line[index] === '"') {
        this.doubleQuoted = true;
        continue;
      }
      if (line[index] === "$") {
        const delimiter = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/u.exec(
          line.slice(index),
        )?.[0];
        if (delimiter) {
          this.dollarQuote = delimiter;
          index += delimiter.length - 1;
          continue;
        }
      }
      if (line[index] === ";") statementEnded = true;
    }
    return statementEnded;
  }
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
      -- Tag identity is scoped: Club tags and each hackathon may reuse the same
      -- normalized name. Targetless conflict handling respects either partial
      -- unique index instead of naming the retired global constraint.
      -- A local-only hackathon tag is safe to preserve only when its parent
      -- hackathon also exists in the restored production data. Otherwise the
      -- scoped foreign key would roll back the entire single-transaction
      -- restore.
      EXECUTE 'INSERT INTO "public"."knight_hacks_event_tag" SELECT saved.* FROM "forge_local_restore"."event_tags" AS saved WHERE saved."hackathon_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."knight_hacks_hackathon" AS hackathon WHERE hackathon."id" = saved."hackathon_id") ON CONFLICT DO NOTHING';
    END IF;
    EXECUTE 'UPDATE "public"."knight_hacks_event" AS event SET "tag_color" = tag."color" FROM "public"."knight_hacks_event_tag" AS tag WHERE event."legacy" = true AND tag."name" = event."tag" AND tag."hackathon_id" IS NOT DISTINCT FROM event."hackathon_id"';
    EXECUTE 'UPDATE "public"."knight_hacks_event_attendee" AS attendance SET "points_awarded" = COALESCE(event."points", (SELECT tag."default_points" FROM "public"."knight_hacks_event_tag" AS tag WHERE tag."name" = event."tag" AND tag."hackathon_id" IS NOT DISTINCT FROM event."hackathon_id" LIMIT 1), 0), "points_awarded_estimated" = true FROM "public"."knight_hacks_event" AS event WHERE attendance."event_id" = event."id" AND attendance."points_awarded" IS NULL';
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
