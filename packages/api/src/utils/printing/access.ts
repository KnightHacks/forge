import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

/** Reading and working the queue are one capability; officers always pass. */
export function requirePrintingQueue(ctx: PermissionContext) {
  return permissions.controlPerms.or(["PRINTING_QUEUE"], ctx);
}
