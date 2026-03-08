import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";
import type { z } from "zod";

/**
 * Metadata for a tRPC procedure.
 */
export interface ProcedureMeta {
  inputSchema: string[];
  route: string;
}

interface ProcedureMetaOriginal {
  id: string;
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  inputSchema: z.ZodObject<any>;
}

function hasSchemaMeta(meta: unknown): meta is ProcedureMetaOriginal {
  return (
    typeof meta === "object" &&
    meta !== null &&
    "id" in meta &&
    "inputSchema" in meta
  );
}

/**
 * Extracts procedure metadata from a tRPC router.
 * Useful for form connections and other dynamic tRPC usage.
 *
 * @param {AnyTRPCRouter} router - The tRPC router to extract procedures from.
 * @returns {Record<string, ProcedureMeta>} A record of procedure IDs to their metadata.
 *
 * @example
 * const procedures = extractProcedures(appRouter);
 * // { "procedureId": { inputSchema: ["field1", "field2"], route: "router.procedure" } }
 */
export function extractProcedures(router: AnyTRPCRouter) {
  const procedures: Record<string, ProcedureMeta> = {};

  /* eslint-disable  @typescript-eslint/no-unsafe-argument */
  for (const [procKey, proc] of Object.entries(router._def.procedures)) {
    const procTyped = proc as AnyTRPCProcedure;

    const meta = procTyped._def.meta;
    if (!hasSchemaMeta(meta)) continue;

    procedures[meta.id] = {
      inputSchema: Object.keys(meta.inputSchema.shape),
      route: procKey,
    };
  }

  return procedures;
}
