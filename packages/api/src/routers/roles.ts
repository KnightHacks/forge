import type { TRPCRouterRecord } from "@trpc/server";
import type { APIGuildMember, APIRole } from "discord-api-types/v10";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import type { PermissionKey } from "@forge/consts";
import { DISCORD, PERMISSIONS } from "@forge/consts";
import { eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";

import { permProcedure, protectedProcedure } from "../trpc";
import {
  addRoleToMember,
  controlPerms,
  discord,
  getPermsAsList,
  log,
  removeRoleFromMember,
} from "../utils";

export const rolesRouter = {
  // ROLES

  createRoleLink: permProcedure
    .input(
      z.object({
        name: z.string(),
        roleId: z.string(),
        permissions: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      controlPerms.or(["CONFIGURE_ROLES"], ctx);

      // check for duplicate discord role
      const dupe = await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.discordRoleId, input.roleId),
      });
      if (dupe)
        throw new TRPCError({
          message: "This role is already linked.",
          code: "CONFLICT",
        });

      // Create the role link first
      const insertedRoles = await db
        .insert(Roles)
        .values({
          name: input.name,
          discordRoleId: input.roleId,
          permissions: input.permissions,
        })
        .returning();

      const newRole = insertedRoles[0];
      if (!newRole) {
        throw new TRPCError({
          message: "Failed to create role link.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      // Sync existing Blade users who have this Discord role
      let syncedCount = 0;
      let checkedCount = 0;

      try {
        const bladeUsers = await db.select().from(User);

        for (const bladeUser of bladeUsers) {
          try {
            const guildMember = (await discord.get(
              Routes.guildMember(
                DISCORD.KNIGHTHACKS_GUILD,
                bladeUser.discordUserId,
              ),
            )) as APIGuildMember;

            checkedCount++;

            if (guildMember.roles.includes(input.roleId)) {
              const existingPerm = await db.query.Permissions.findFirst({
                where: (t, { eq, and }) =>
                  and(eq(t.userId, bladeUser.id), eq(t.roleId, newRole.id)),
              });

              if (!existingPerm) {
                await db.insert(Permissions).values({
                  roleId: newRole.id,
                  userId: bladeUser.id,
                });
                syncedCount++;
              }
            }
          } catch {
            continue;
          }
        }

        await log({
          title: `Created Role: ${input.name}`,
          message: `Role linked to <@&${input.roleId}>
                  \n**Permissions:** ${getPermsAsList(input.permissions).join(", ")}
                  \n**Auto-synced:** ${syncedCount} user(s) granted (checked ${checkedCount} Blade users)`,
          color: "blade_purple",
          userId: ctx.session.user.discordUserId,
        });
      } catch {
        await log({
          title: `Created Role: ${input.name}`,
          message: `Role linked to <@&${input.roleId}>
                  \n**Permissions:** ${getPermsAsList(input.permissions).join(", ")}
                  \n**Note:** Auto-sync unavailable. Checked ${checkedCount} users, synced ${syncedCount}.`,
          color: "blade_purple",
          userId: ctx.session.user.discordUserId,
        });
      }
    }),

  updateRoleLink: permProcedure
    .input(
      z.object({
        name: z.string(),
        id: z.string(),
        roleId: z.string(),
        permissions: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      controlPerms.or(["CONFIGURE_ROLES"], ctx);

      // check for existing role
      const exist = await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });
      if (!exist)
        throw new TRPCError({
          message: "Tried to edit a role link that does not exist.",
          code: "BAD_REQUEST",
        });

      // check for duplicate discord role
      const dupe = await db.query.Roles.findFirst({
        where: (t, { and, eq, not }) =>
          and(not(eq(t.id, input.id)), eq(t.discordRoleId, input.roleId)),
      });
      if (dupe)
        throw new TRPCError({
          message: "This role is already linked.",
          code: "CONFLICT",
        });

      await db
        .update(Roles)
        .set({
          name: input.name,
          discordRoleId: input.roleId,
          permissions: input.permissions,
        })
        .where(eq(Roles.id, input.id));

      await log({
        title: `Updated Role`,
        message: `The **${exist.name}** Role (<@&${input.roleId}>) role has been updated.
                \n**Name:** ${exist.name} -> ${input.name}
                \n**Original Perms:**\n${getPermsAsList(exist.permissions).join("\n")}
                \n**New Perms:**\n${getPermsAsList(input.permissions).join("\n")}`,
        color: "blade_purple",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteRoleLink: permProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      controlPerms.or(["CONFIGURE_ROLES"], ctx);

      // check for existing role
      const exist = await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });
      if (!exist)
        throw new TRPCError({
          message: "Tried to delete a role link that does not exist.",
          code: "BAD_REQUEST",
        });

      await db.delete(Roles).where(eq(Roles.id, input.id));

      await log({
        title: `Deleted Role`,
        message: `The **${exist.name}** Role (<@&${exist.discordRoleId}>) role has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),

  getRoleLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });
    }),

  getAllLinks: protectedProcedure.query(async () => {
    return await db.select().from(Roles);
  }),

  getDiscordRole: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }): Promise<APIRole | null> => {
      try {
        return (await discord.get(
          Routes.guildRole(DISCORD.KNIGHTHACKS_GUILD, input.roleId),
        )) as APIRole | null;
      } catch {
        return null;
      }
    }),

  getDiscordRoles: protectedProcedure
    .input(
      z.object({ roles: z.array(z.object({ discordRoleId: z.string() })) }),
    )
    .query(async ({ input }): Promise<(APIRole | null)[]> => {
      const ret = [];

      for (const r of input.roles) {
        try {
          ret.push(
            (await discord.get(
              Routes.guildRole(DISCORD.KNIGHTHACKS_GUILD, r.discordRoleId),
            )) as APIRole | null,
          );
        } catch {
          ret.push(null);
        }
      }

      return ret;
    }),

  getDiscordRoleCounts: protectedProcedure.query(
    async (): Promise<Record<string, number> | null> => {
      return (await discord.get(
        `/guilds/${DISCORD.KNIGHTHACKS_GUILD}/roles/member-counts`,
      )) as Record<string, number>;
    },
  ),

  // PERMS

  // returnes the bitwise OR'd permissions for the given user
  // if no user is passed, get the current context user
  getPermissions: protectedProcedure
    .input(z.optional(z.object({ userId: z.string() })))
    .query(async ({ ctx, input }) => {
      const permRows = await db
        .select({
          permissions: Roles.permissions,
        })
        .from(Roles)
        .innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
        .where(
          sql`cast(${Permissions.userId} as text) = ${input ? input.userId : ctx.session.user.id}`,
        );

      const permissionsBits = new Array(Object.keys(PERMISSIONS).length).fill(
        false,
      ) as boolean[];

      permRows.forEach((v) => {
        for (let i = 0; i < v.permissions.length; i++) {
          if (v.permissions.at(i) == "1") permissionsBits[i] = true;
        }
      });

      const permissionsMap = Object.keys(PERMISSIONS).reduce(
        (accumulator, key) => {
          const index = PERMISSIONS[key];
          if (index === undefined) return accumulator;
          accumulator[key] = permissionsBits[index] ?? false;

          return accumulator;
        },
        {} as Record<PermissionKey, boolean>,
      );

      return permissionsMap;
    }),

  hasPermission: permProcedure
    .input(
      z.object({
        and: z.optional(z.array(z.string())),
        or: z.optional(z.array(z.string())),
      }),
    )
    .query(({ input, ctx }) => {
      try {
        if (input.or) controlPerms.or(input.or, ctx);
        if (input.and) controlPerms.and(input.and, ctx);
      } catch {
        return false;
      }

      return true;
    }),

  grantPermission: permProcedure
    .input(z.object({ roleId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["ASSIGN_ROLES"], ctx);

      const exists = await db.query.Permissions.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.userId, input.userId), eq(t.roleId, input.roleId)),
      });

      if (exists)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This permission relation already exists.",
        });

      const user = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.id, input.userId),
      });

      const role = await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.id, input.roleId),
      });

      if (!user || !role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User or role not found.",
        });
      }

      // Add the role to the user on Discord
      // Note: This may fail due to role hierarchy or bot permissions
      // We log the error but don't break the flow - Blade permission is still granted
      try {
        await addRoleToMember(user.discordUserId, role.discordRoleId);
        console.log(
          `Successfully added Discord role ${role.discordRoleId} to user ${user.discordUserId}`,
        );
      } catch (error) {
        console.error(
          `Failed to add Discord role ${role.discordRoleId} to user ${user.discordUserId}:`,
          error,
        );
        console.error(
          `   This may be due to role hierarchy or bot permissions. Blade permission will still be granted.`,
        );
      }

      await db.insert(Permissions).values({
        roleId: input.roleId,
        userId: input.userId,
      });

      await log({
        title: `Granted Role`,
        message: `The **${role.name}** role (<@&${role.discordRoleId}>) has been granted to <@${user.discordUserId}>.`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  revokePermission: permProcedure
    .input(z.object({ roleId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["ASSIGN_ROLES"], ctx);

      const perm = await db.query.Permissions.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.userId, input.userId), eq(t.roleId, input.roleId)),
      });

      if (!perm)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The permission relation you are trying to revoke does not exist.",
        });

      const user = await db.query.User.findFirst({
        where: (t, { eq }) => eq(t.id, input.userId),
      });

      const role = await db.query.Roles.findFirst({
        where: (t, { eq }) => eq(t.id, input.roleId),
      });

      if (!user || !role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User or role not found.",
        });
      }

      // Remove the role from the user on Discord
      // Note: This may fail due to role hierarchy or bot permissions
      // We log the error but don't break the flow - Blade permission is still revoked
      try {
        await removeRoleFromMember(user.discordUserId, role.discordRoleId);
        console.log(
          `✅ Successfully removed Discord role ${role.discordRoleId} from user ${user.discordUserId}`,
        );
      } catch (error) {
        console.error(
          `Failed to remove Discord role ${role.discordRoleId} from user ${user.discordUserId}:`,
          error,
        );
        console.error(
          `   This may be due to role hierarchy or bot permissions. Blade permission will still be revoked.`,
        );
      }

      await db.delete(Permissions).where(eq(Permissions.id, perm.id));

      await log({
        title: `Revoked Role`,
        message: `The **${role.name}** role (<@&${role.discordRoleId}>) has been revoked from <@${user.discordUserId}>.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),

  batchManagePermission: permProcedure
    .input(
      z.object({
        roleIds: z.array(z.string()),
        userIds: z.array(z.string()),
        revoking: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["ASSIGN_ROLES"], ctx);

      interface Return {
        roleName: string;
        userName: string;
      }
      const failed: Return[] = [];
      const succeeded: Return[] = [];

      // Cache users with full data for Discord operations
      const cachedUsers: Record<
        string,
        { name: string; discordUserId: string }
      > = {};
      const dbUsers = await db
        .select()
        .from(User)
        .where(inArray(User.id, input.userIds));
      dbUsers.forEach((v) => {
        cachedUsers[v.id] = {
          name: v.name ?? "",
          discordUserId: v.discordUserId,
        };
      });

      // Cache roles with full data for Discord operations
      const cachedRoles: Record<
        string,
        { name: string; discordRoleId: string }
      > = {};
      const dbRoles = await db
        .select()
        .from(Roles)
        .where(inArray(Roles.id, input.roleIds));
      dbRoles.forEach((v) => {
        cachedRoles[v.id] = { name: v.name, discordRoleId: v.discordRoleId };
      });

      for (const [roleId, roleData] of Object.entries(cachedRoles)) {
        for (const [userId, userData] of Object.entries(cachedUsers)) {
          const perm = await db.query.Permissions.findFirst({
            where: (t, { eq, and }) =>
              and(eq(t.userId, userId), eq(t.roleId, roleId)),
          });

          const ret = { roleName: roleData.name, userName: userData.name };

          if (!perm == input.revoking) {
            failed.push(ret);
          } else {
            try {
              if (!input.revoking) {
                // Granting role - Discord may fail due to hierarchy/perms
                try {
                  await addRoleToMember(
                    userData.discordUserId,
                    roleData.discordRoleId,
                  );
                } catch (discordError) {
                  console.error(
                    `Discord role grant failed for ${userData.name} -> ${roleData.name}:`,
                    discordError,
                  );
                }
                await db.insert(Permissions).values({
                  roleId: roleId,
                  userId: userId,
                });
                succeeded.push(ret);
              } else if (perm) {
                // Revoking role - Discord may fail due to hierarchy/perms
                try {
                  await removeRoleFromMember(
                    userData.discordUserId,
                    roleData.discordRoleId,
                  );
                } catch (discordError) {
                  console.error(
                    `Discord role revoke failed for ${userData.name} -> ${roleData.name}:`,
                    discordError,
                  );
                }
                await db.delete(Permissions).where(eq(Permissions.id, perm.id));
                succeeded.push(ret);
              } else {
                failed.push(ret);
              }
            } catch (error) {
              // This catches DB errors only (Discord errors are caught above)
              console.error(
                `Database error for ${input.revoking ? "revoke" : "grant"} role ${roleData.name} ${input.revoking ? "from" : "to"} ${userData.name}:`,
                error,
              );
              failed.push(ret);
            }
          }
        }
      }

      const failText =
        failed.length > 0
          ? "\n**Failed:**\n" +
            failed.map((v) => `${v.userName} -> ${v.roleName}`).join("\n")
          : "";

      await log({
        title: `${input.revoking ? "Revoked" : "Granted"} Batch Roles`,
        message:
          `The following roles have been ${input.revoking ? "revoked from" : "granted to"} the following users:\n\n` +
          (succeeded.length > 0
            ? succeeded.map((v) => `${v.userName} -> ${v.roleName}`).join("\n")
            : "None") +
          failText,
        color: input.revoking ? "uhoh_red" : "success_green",
        userId: ctx.session.user.discordUserId,
      });

      // Only throw error for database failures (Discord failures are logged but don't break)
      if (failed.length > 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: Failed to ${input.revoking ? "revoke" : "grant"} ${failed.length} role(s): ${failed.map((v) => `${v.roleName}`).join(", ")}`,
        });
      }
    }),
} satisfies TRPCRouterRecord;
