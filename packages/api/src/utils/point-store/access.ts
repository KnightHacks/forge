import { TRPCError } from "@trpc/server";

import type { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requirePointStoreEdit(ctx: PermissionContext) {
  // Store access requires this specific grant, including for officers.
  if (!ctx.session.permissions.HACKATHON_MERCH_STORE)
    throw new TRPCError({ code: "FORBIDDEN" });
}
