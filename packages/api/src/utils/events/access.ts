import { TRPCError } from "@trpc/server";

import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requireEventRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(
    ["READ_CLUB_EVENT", "EDIT_CLUB_EVENT"],
    ctx,
  );
}

export function requireEventEdit(ctx: PermissionContext) {
  return permissions.controlPerms.or(["EDIT_CLUB_EVENT"], ctx);
}

export function requireEventCheckIn(ctx: PermissionContext) {
  return permissions.controlPerms.or(["CHECKIN_CLUB_EVENT"], ctx);
}

export function assertClubEvent<T extends { hackathonId: string | null }>(
  event: T | null | undefined,
): T {
  if (!event || event.hackathonId !== null) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
  return event;
}
