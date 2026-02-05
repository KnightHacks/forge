import type { APIGuildMember } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";

import {
  discord,
  KNIGHTHACKS_GUILD_ID,
} from "../../../../packages/api/src/utils";

/**
 * Syncs Blade permissions with Discord roles
 *
 * This cron job ensures consistency between Blade's permission system and Discord:
 * 1. If a user has a permission in Blade but NOT the role on Discord → Remove from Blade
 * 2. If a user has a role on Discord that's linked in Blade but NO permission entry → Add to Blade
 */
export async function syncRoles() {
  try {
    console.log("[Role Sync] Starting role synchronization...");

    // Get all roles that are linked in Blade
    const linkedRoles = await db.select().from(Roles);
    console.log(`[Role Sync] Found ${linkedRoles.length} linked roles`);

    // Get all users in Blade
    const users = await db.select().from(User);
    console.log(`[Role Sync] Checking ${users.length} users`);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Fetch the user's roles from Discord
        const guildMember = (await discord.get(
          Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
        )) as APIGuildMember;

        const discordRoleIds = guildMember.roles;

        // Get user's current permissions in Blade
        const userPermissions = await db
          .select({
            permissionId: Permissions.id,
            roleId: Permissions.roleId,
            discordRoleId: Roles.discordRoleId,
            roleName: Roles.name,
          })
          .from(Permissions)
          .innerJoin(Roles, eq(Permissions.roleId, Roles.id))
          .where(eq(Permissions.userId, user.id));

        // Check 1: Remove permissions from Blade if user doesn't have role on Discord
        for (const perm of userPermissions) {
          if (!discordRoleIds.includes(perm.discordRoleId)) {
            console.log(
              `[Role Sync] Removing role "${perm.roleName}" from user ${user.name} (${user.discordUserId}) - not on Discord`,
            );
            await db
              .delete(Permissions)
              .where(eq(Permissions.id, perm.permissionId));
            removedCount++;
          }
        }

        // Check 2: Add permissions to Blade if user has role on Discord but not in Blade
        for (const role of linkedRoles) {
          const hasRoleOnDiscord = discordRoleIds.includes(role.discordRoleId);
          const hasPermissionInBlade = userPermissions.some(
            (p) => p.roleId === role.id,
          );

          if (hasRoleOnDiscord && !hasPermissionInBlade) {
            console.log(
              `[Role Sync] Adding role "${role.name}" to user ${user.name} (${user.discordUserId}) - found on Discord`,
            );
            await db.insert(Permissions).values({
              roleId: role.id,
              userId: user.id,
            });
            addedCount++;
          }
        }
      } catch (error) {
        // User might not be in the guild anymore
        if ((error as { status?: number } | undefined)?.status === 404) {
          console.log(
            `[Role Sync] User ${user.name} (${user.discordUserId}) not found in guild - skipping`,
          );
          skippedCount++;
        } else {
          console.error(
            `[Role Sync] Error syncing user ${user.name} (${user.discordUserId}):`,
            error,
          );
        }
      }
    }

    console.log(
      `[Role Sync] Sync completed. Added: ${addedCount}, Removed: ${removedCount}, Skipped: ${skippedCount}`,
    );
  } catch (err) {
    console.error("[Role Sync] Unexpected error during role sync:", err);
  }
}
