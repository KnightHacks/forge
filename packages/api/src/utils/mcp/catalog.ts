import type { AnyProcedure, AnyRouter } from "@trpc/server";
import { z } from "zod";

import { PERMISSIONS } from "@forge/consts";

import type { ForgeTRPCMeta } from "../forms/callbacks";
import type { McpAccessRule } from "./access";

export interface McpAction {
  access: McpAccessRule;
  description: string;
  inputSchema: z.core.JSONSchema.JSONSchema;
  path: string;
}

export type ActionCatalog = ReadonlyMap<string, McpAction>;

const registrationSchema = z
  .object({
    access: z
      .object({
        mode: z.enum(["any", "all"]),
        permissions: z
          .tuple([z.enum(PERMISSIONS.PERMISSION_KEYS)])
          .rest(z.enum(PERMISSIONS.PERMISSION_KEYS)),
      })
      .strict(),
    description: z.string().trim().min(1),
  })
  .strict();

/** Derive action definitions from the same flattened procedure record tRPC calls. */
export function buildActionCatalog(router: AnyRouter): ActionCatalog {
  const catalog = new Map<string, McpAction>();
  const procedures = router._def.procedures as Record<string, AnyProcedure>;
  for (const [path, procedure] of Object.entries(procedures)) {
    const meta = procedure._def.meta as ForgeTRPCMeta | undefined;
    if (meta?.mcp === undefined) continue;
    const parsed = registrationSchema.safeParse(meta.mcp);
    if (!parsed.success)
      throw new Error(
        `Invalid MCP metadata for ${path}: ${parsed.error.message}`,
      );
    if (procedure._def.type === "subscription")
      throw new Error(`MCP action ${path} cannot be a subscription.`);
    if (catalog.has(path)) throw new Error(`Duplicate MCP action: ${path}`);
    const inputs = procedure._def.inputs;
    const schemas = inputs.map((input) => {
      if (!(input instanceof z.ZodType))
        throw new Error(`MCP action ${path} must use Zod input validators.`);
      return z.toJSONSchema(input, {
        io: "input",
        unrepresentable: "any",
        override: ({ zodSchema, jsonSchema }) => {
          const type = zodSchema._zod.def.type;
          if (type === "date") {
            // JSON transports encode Dates as ISO strings. The plain gateway
            // preserves native tRPC inputs; #641 must revive these Date fields.
            jsonSchema.type = "string";
            jsonSchema.format = "date-time";
            jsonSchema["x-forge-native-type"] = "Date";
          } else if (
            [
              "bigint",
              "symbol",
              "undefined",
              "void",
              "nan",
              "custom",
              "function",
              "transform",
              "map",
              "set",
              "literal",
            ].includes(type)
          ) {
            // Retain Zod's fail-closed behavior for every other unsupported
            // type (including non-JSON literals), rather than silently using {}.
            z.toJSONSchema(zodSchema, { io: "input" });
          }
        },
      });
    });
    const inputSchema =
      schemas.length > 1
        ? { allOf: schemas }
        : (schemas[0] ?? z.toJSONSchema(z.object({}).strict()));
    catalog.set(path, { ...parsed.data, path, inputSchema });
  }
  return catalog;
}

const catalogs = new WeakMap<AnyRouter, ActionCatalog>();

/** Cache only static definitions, never sessions or permissions. */
export function getActionCatalog(router: AnyRouter): ActionCatalog {
  const cached = catalogs.get(router);
  if (cached) return cached;
  const catalog = buildActionCatalog(router);
  catalogs.set(router, catalog);
  return catalog;
}
