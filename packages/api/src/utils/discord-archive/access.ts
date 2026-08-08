import { permissions } from "@forge/utils";

type PermissionContext = Parameters<typeof permissions.controlPerms.or>[1];

export function assertCanReadDiscordArchiveHealth(ctx: PermissionContext) {
  permissions.controlPerms.or(["READ_DISCORD_ARCHIVE"], ctx);
}
