import { TRPCError } from "@trpc/server";

import { requireHackerEdit } from "../hacker/access";

export function requirePointStoreEdit(
  ctx: Parameters<typeof requireHackerEdit>[0],
) {
  requireHackerEdit(ctx);
  // Store access requires this specific grant, including for officers.
  if (!ctx.session.permissions.EDIT_HACKERS)
    throw new TRPCError({ code: "FORBIDDEN" });
}
