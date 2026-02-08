import type { APIGuildMember } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import { discord, KNIGHTHACKS_GUILD_ID } from "@forge/api/utils";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";

import { CronBuilder } from "../structs/CronBuilder";

/**
 * Syncs Blade permissions with Discord roles
 *
 * This cron job ensures consistency between Blade's permission system and Discord:
 * 1. If a user has a permission in Blade but NOT the role on Discord → Remove from Blade
 * 2. If a user has a role on Discord that's linked in Blade but NO permission entry → Add to Blade
 */
export const roleSync = new CronBuilder({
  name: "role-sync",
  color: 2,
}).addCron(
  "0 8 * * *", // 8am every day
  async () => {
    // Get all roles that are linked in Blade
    const linkedRoles = await db.select().from(Roles);
    console.log(`Found ${linkedRoles.length} linked roles`);

    // Get all users in Blade
    const users = await db.select().from(User);
    console.log(`Checking ${users.length} users`);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    let erroredUsers = [];

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

          if (!hasRoleOnDiscord || hasPermissionInBlade) {
            continue;
          }

          await db.insert(Permissions).values({
            roleId: role.id,
            userId: user.id,
          });
          addedCount++;
        }
      } catch (error) {
        // User might not be in the guild anymore
        if ((error as { status?: number } | undefined)?.status === 404) {
          skippedCount++;
        } else {
          errorCount++;
          if (erroredUsers.length < 5) erroredUsers.push(user.name);
        }
      }
    }

    console.log(
      `Sync completed. Added: ${addedCount}, Removed: ${removedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );

    if (errorCount > 0) {
      console.log(`First ${erroredUsers.length} users it errored for:`);
      for (const name of erroredUsers) {
        console.log(name);
      }
    }
  },
);
