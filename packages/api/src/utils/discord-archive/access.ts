import { TRPCError } from "@trpc/server";

import type { PermissionMap } from "../permissions";

export function assertCanReadDiscordArchiveHealth(permissions: PermissionMap) {
  if (permissions.IS_OFFICER !== true) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Officer permission is required to view Discord archive health",
    });
  }
}
