import { TRPCError } from "@trpc/server";

import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function requireHackathonEventRead(ctx: PermissionContext) {
  return permissions.controlPerms.or(
    ["READ_HACK_EVENT", "EDIT_HACK_EVENT"],
    ctx,
  );
}

export function requireHackathonEventEdit(ctx: PermissionContext) {
  return permissions.controlPerms.or(["EDIT_HACK_EVENT"], ctx);
}

export function requireHackathonEventCheckIn(ctx: PermissionContext) {
  return permissions.controlPerms.or(["CHECKIN_HACK_EVENT"], ctx);
}

export function requireAnyHackathonEventCapability(ctx: PermissionContext) {
  return permissions.controlPerms.or(
    ["READ_HACK_EVENT", "EDIT_HACK_EVENT", "CHECKIN_HACK_EVENT"],
    ctx,
  );
}

export function assertHackathonEvent<T extends { hackathonId: string | null }>(
  event: T | null | undefined,
  hackathonId: string,
): T {
  if (!event || event.hackathonId !== hackathonId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
  return event;
}
