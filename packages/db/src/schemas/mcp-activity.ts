import { sql } from "drizzle-orm";
import { check, index, pgTableCreator } from "drizzle-orm/pg-core";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `mcp_${name}`);

export const McpActivity = createTable(
  "activity",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    actorUserId: t.uuid().references(() => User.id, { onDelete: "set null" }),
    clientId: t.varchar({ length: 255 }),
    clientName: t.varchar({ length: 255 }),
    tool: t.varchar({ length: 128 }).notNull(),
    procedurePath: t.varchar({ length: 255 }),
    sqlQuery: t.text(),
    target: t.varchar({ length: 512 }),
    outcome: t
      .varchar({ length: 16, enum: ["allowed", "denied", "failed"] })
      .notNull(),
    errorCode: t.varchar({ length: 64 }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    actorCreatedIdx: index("mcp_activity_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
      table.id,
    ),
    createdIdx: index("mcp_activity_created_idx").on(table.createdAt, table.id),
    validOutcome: check(
      "mcp_activity_outcome_check",
      sql`${table.outcome} IN ('allowed', 'denied', 'failed')`,
    ),
  }),
);

export type InsertMcpActivity = typeof McpActivity.$inferInsert;
export type SelectMcpActivity = typeof McpActivity.$inferSelect;
