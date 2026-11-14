import { TRPCError } from "@trpc/server";

import type { PERMISSIONS } from "@forge/consts";

import type { PermissionMap } from "../permissions";

/**
 * The action-level permission rule a procedure declares in `meta.mcp.access`.
 *
 * `any` mirrors `permissions.controlPerms.or` and `all` mirrors
 * `permissions.controlPerms.and`. The list is non-empty by type: an empty `all`
 * rule would pass every caller, which is never what a declaration means.
 */
export interface McpAccessRule {
  mode: "all" | "any";
  permissions: readonly [
    PERMISSIONS.PermissionKey,
    ...PERMISSIONS.PermissionKey[],
  ];
}

/** The MCP declaration a procedure carries in its tRPC meta. */
export interface McpActionMeta {
  access: McpAccessRule;
  description: string;
}

/**
 * Returns whether `permissions` satisfies `rule`, without throwing.
 *
 * Officers pass every rule, exactly as `controlPerms` lets `IS_OFFICER` through
 * before it reads the required keys.
 */
export function evaluateAccess(
  rule: McpAccessRule,
  permissions: PermissionMap,
): boolean {
  if (permissions.IS_OFFICER) return true;

  return rule.mode === "any"
    ? rule.permissions.some((permission) => permissions[permission])
    : rule.permissions.every((permission) => permissions[permission]);
}

/** Throws the same `FORBIDDEN` error `controlPerms` does when `rule` fails. */
export function assertAccess(
  rule: McpAccessRule,
  permissions: PermissionMap,
): void {
  if (!evaluateAccess(rule, permissions)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
