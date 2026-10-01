import { TRPCError } from "@trpc/server";

import { requireHackerEdit, requireHackerRead } from "../hacker/access";

export function requireTeamsRead(ctx: Parameters<typeof requireHackerRead>[0]) {
  requireHackerRead(ctx);
  if (
    !ctx.session.permissions.READ_HACKERS &&
    !ctx.session.permissions.EDIT_HACKERS
  )
    throw new TRPCError({ code: "FORBIDDEN" });
}
export function requireTeamsEdit(ctx: Parameters<typeof requireHackerEdit>[0]) {
  requireHackerEdit(ctx);
  if (!ctx.session.permissions.EDIT_HACKERS)
    throw new TRPCError({ code: "FORBIDDEN" });
}
