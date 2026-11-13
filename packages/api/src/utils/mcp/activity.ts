import { z } from "zod";

import { db } from "@forge/db/client";
import { McpActivity } from "@forge/db/schemas/mcp-activity";

import { sqlPreview } from "./sql-preview";

const activityEntrySchema = z
  .object({
    actorUserId: z.uuid().nullable(),
    clientId: z.string().max(255).nullish(),
    clientName: z.string().max(255).nullish(),
    tool: z.string().min(1).max(128),
    procedurePath: z.string().max(255).nullish(),
    sqlQuery: z.string().nullish(),
    target: z.string().max(512).nullish(),
    outcome: z.enum(McpActivity.outcome.enumValues),
    errorCode: z
      .string()
      .max(64)
      .regex(/^[A-Z0-9_]+$/)
      .nullish(),
  })
  .refine((entry) => entry.actorUserId !== null || entry.outcome === "denied", {
    message: "Only denied calls may omit actorUserId",
  });

export type RecordMcpActivityInput = z.input<typeof activityEntrySchema>;

/**
 * Call once after the tool's final outcome is known, including denial/failure.
 * Identity and descriptive fields must come from trusted, credential-free
 * context. Never pass tool arguments, results, bindings, or raw error messages.
 */
export async function recordMcpActivity(entry: RecordMcpActivityInput) {
  // Parsing also strips unexpected runtime properties, including result/token
  // fields carried by structurally compatible objects from callers.
  const activity = activityEntrySchema.parse(entry);
  if (activity.sqlQuery != null)
    activity.sqlQuery = sqlPreview(activity.sqlQuery);
  await db.insert(McpActivity).values(activity);
}
