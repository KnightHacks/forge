import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import type { SQL } from "@forge/db";
import { and, desc, eq, gte, lt, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { McpActivity } from "@forge/db/schemas/mcp-activity";
import { permissions } from "@forge/utils";

import { permProcedure, protectedProcedure } from "../trpc";

// Local to this API feature: these read filters are not shared form validators.
const listInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z.uuid().optional(),
    clientId: z.string().max(255).optional(),
    tool: z.string().max(128).optional(),
    procedurePath: z.string().max(255).optional(),
    target: z.string().max(512).optional(),
    outcome: z.enum(McpActivity.outcome.enumValues).optional(),
    from: z.date().optional(),
    to: z.date().optional(),
  })
  .strict();

type ListInput = z.output<typeof listInputSchema>;

function validTimeRange(input: ListInput) {
  return !input.from || !input.to || input.from < input.to;
}

const memberListInputSchema = listInputSchema
  .refine(validTimeRange, { message: "from must be before to" })
  .default({ limit: 50 });
const officerListInputSchema = listInputSchema
  .extend({ actorUserId: z.uuid().optional() })
  .refine(validTimeRange, { message: "from must be before to" })
  .default({ limit: 50 });

async function listActivity(input: ListInput, actorUserId?: string) {
  const conditions: SQL[] = [];
  if (actorUserId) conditions.push(eq(McpActivity.actorUserId, actorUserId));
  if (input.clientId !== undefined)
    conditions.push(eq(McpActivity.clientId, input.clientId));
  if (input.tool !== undefined)
    conditions.push(eq(McpActivity.tool, input.tool));
  if (input.procedurePath !== undefined)
    conditions.push(eq(McpActivity.procedurePath, input.procedurePath));
  if (input.target !== undefined)
    conditions.push(eq(McpActivity.target, input.target));
  if (input.outcome) conditions.push(eq(McpActivity.outcome, input.outcome));
  if (input.from) conditions.push(gte(McpActivity.createdAt, input.from));
  if (input.to) conditions.push(lt(McpActivity.createdAt, input.to));
  if (input.cursor) {
    // Read the cursor timestamp inside PostgreSQL: JS Dates round off the
    // microseconds in defaultNow(), which can otherwise skip rows between pages.
    conditions.push(sql`(${McpActivity.createdAt}, ${McpActivity.id}) < (
      select created_at, id from ${McpActivity} where id = ${input.cursor}::uuid
    )`);
  }

  const rows = await db.query.McpActivity.findMany({
    where: and(...conditions),
    orderBy: [desc(McpActivity.createdAt), desc(McpActivity.id)],
    limit: input.limit + 1,
  });
  const items = rows.slice(0, input.limit);
  return {
    items,
    nextCursor: rows.length > input.limit ? (items.at(-1)?.id ?? null) : null,
  };
}

/** Newest-first activity; `from` is inclusive, `to` exclusive, filters exact. */
export const mcpActivityRouter = {
  list: permProcedure.input(officerListInputSchema).query(({ ctx, input }) => {
    permissions.controlPerms.or(["IS_OFFICER"], ctx);
    return listActivity(input, input.actorUserId);
  }),
  listMine: protectedProcedure
    .input(memberListInputSchema)
    .query(({ ctx, input }) => {
      return listActivity(input, ctx.session.user.id);
    }),
} satisfies TRPCRouterRecord;
