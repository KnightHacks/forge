import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { DISCORD } from "@forge/consts";
import { and, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { permissions } from "@forge/utils";
import {
  discordRoleIdSchema,
  permissionExpressionSchema,
  roleBatchAssignmentSchema,
  roleCreateSchema,
  roleIdSchema,
  roleManagementQuerySchema,
  rolePermissionUpdateSchema,
  roleUnlinkSchema,
} from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import { loadPermissionsForUser } from "../utils/permissions-db";
import { resolveRoleDiscordGateway } from "../utils/roles/discord-gateway";
import {
  filterDiscordRolesForLinking,
  filterRoleUsers,
  isAdministrativePermissionString,
  permissionKeysToBitstring,
  retainsAssignedRoleAdministratorAfterRevocations,
  runRoleAssignmentBatch,
} from "../utils/roles/management";
import {
  assertEligibleDiscordRole,
  assertUniqueDiscordRole,
  buildLinkedRoleViews,
  getAssignmentRows,
  getDependencyCounts,
  getDiscordRole,
  retainsAdministratorAfter,
  roleColorToHex,
  syncLinkedRole,
} from "../utils/roles/service";

function requireRoleRead(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(["CONFIGURE_ROLES", "ASSIGN_ROLES"], ctx);
}

function requireConfigure(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(["CONFIGURE_ROLES"], ctx);
}

function requireAssign(ctx: Parameters<typeof permissions.controlPerms.or>[1]) {
  permissions.controlPerms.or(["ASSIGN_ROLES"], ctx);
}

function canConfigureRole(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  return (
    ctx.session.permissions.IS_OFFICER === true ||
    ctx.session.permissions.CONFIGURE_ROLES === true
  );
}

export const rolesRouter = {
  getPermissions: protectedProcedure.query(async ({ ctx }) =>
    loadPermissionsForUser(ctx.session.user.id),
  ),

  hasPermission: permProcedure
    .input(permissionExpressionSchema)
    .query(({ ctx, input }) => {
      try {
        if ("or" in input && input.or) {
          permissions.controlPerms.or(input.or, ctx);
        } else if ("and" in input) {
          permissions.controlPerms.and(input.and, ctx);
        }
        return true;
      } catch {
        return false;
      }
    }),

  listLinks: permProcedure.query(async ({ ctx }) => {
    requireRoleRead(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    return buildLinkedRoleViews(canConfigureRole(ctx), gateway);
  }),

  listDiscordOptions: permProcedure.query(async ({ ctx }) => {
    requireConfigure(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    const [linked, discordRoles, memberCounts] = await Promise.all([
      db.select({ discordRoleId: Roles.discordRoleId }).from(Roles),
      gateway.getGuildRoles(),
      gateway.getRoleCounts(),
    ]);
    if (!discordRoles.available) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Discord roles are temporarily unavailable.",
      });
    }
    return filterDiscordRolesForLinking({
      guildId: DISCORD.KNIGHTHACKS_GUILD,
      linkedRoleIds: new Set(linked.map((role) => role.discordRoleId)),
      memberCounts,
      roles: discordRoles.roles,
    });
  }),

  previewDiscordRole: permProcedure
    .input(discordRoleIdSchema)
    .query(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const role = assertEligibleDiscordRole(
        await getDiscordRole(gateway, input),
      );
      await assertUniqueDiscordRole(role);
      const counts = await gateway.getRoleCounts();
      return {
        color: role.color,
        hexColor: roleColorToHex(role.color),
        id: role.id,
        managed: role.managed,
        memberCount: counts?.[role.id] ?? null,
        name: role.name,
        position: role.position,
      };
    }),

  getRole: permProcedure.input(roleIdSchema).query(async ({ ctx, input }) => {
    requireConfigure(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    const roles = await buildLinkedRoleViews(true, gateway);
    const role = roles.find((candidate) => candidate.id === input.roleId);
    if (!role) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
    }
    const canRemoveAdmin =
      !isAdministrativePermissionString(
        permissionKeysToBitstring(role.permissions),
      ) || (await retainsAdministratorAfter(role.id, null));
    return { ...role, canRemoveAdmin };
  }),

  listUsers: permProcedure
    .input(roleManagementQuerySchema)
    .query(async ({ ctx, input }) => {
      requireAssign(ctx);
      const users = await db.query.User.findMany({
        with: { member: true, permissions: true },
      });
      return filterRoleUsers(
        users.map((user) => ({
          discordUserId: user.discordUserId,
          email: user.email,
          id: user.id,
          memberName: user.member
            ? `${user.member.firstName} ${user.member.lastName}`
            : null,
          name: user.name,
          roleIds: [
            ...new Set(user.permissions.map((assignment) => assignment.roleId)),
          ],
        })),
        input,
      );
    }),

  createLink: permProcedure
    .input(roleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const discordRole = assertEligibleDiscordRole(
        await getDiscordRole(gateway, input.discordRoleId),
      );
      await assertUniqueDiscordRole(discordRole);
      const [created] = await db
        .insert(Roles)
        .values({
          discordRoleId: discordRole.id,
          name: discordRole.name,
          permissions: permissionKeysToBitstring(input.permissions),
          teamHexcodeColor: roleColorToHex(discordRole.color),
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The role link could not be created.",
        });
      }
      let sync;
      try {
        sync = await syncLinkedRole(created, gateway);
      } catch {
        sync = {
          role: {
            discordRoleId: created.discordRoleId,
            id: created.id,
            name: created.name,
            teamHexcodeColor: created.teamHexcodeColor,
          },
          summary: {
            added: 0,
            checked: 0,
            failed: 1,
            removed: 0,
            skipped: 0,
            unchanged: 0,
          },
        };
      }
      return { created, sync };
    }),

  updatePermissions: permProcedure
    .input(rolePermissionUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const role = await db.query.Roles.findFirst({
        where: eq(Roles.id, input.roleId),
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      const live = assertEligibleDiscordRole(
        await getDiscordRole(gateway, role.discordRoleId),
      );
      await assertUniqueDiscordRole(live, role.id);
      const nextPermissions = permissionKeysToBitstring(input.permissions);
      if (
        isAdministrativePermissionString(role.permissions) &&
        !isAdministrativePermissionString(nextPermissions) &&
        !(await retainsAdministratorAfter(role.id, nextPermissions))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This change would remove the final role administrator.",
        });
      }
      const [updated] = await db
        .update(Roles)
        .set({
          name: live.name,
          permissions: nextPermissions,
          teamHexcodeColor: roleColorToHex(live.color),
        })
        .where(eq(Roles.id, role.id))
        .returning();
      return updated;
    }),

  syncRole: permProcedure
    .input(roleIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const role = await db.query.Roles.findFirst({
        where: eq(Roles.id, input.roleId),
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      return syncLinkedRole(role, gateway);
    }),

  batchAssign: permProcedure
    .input(roleBatchAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      requireAssign(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const [roleRows, userRows, assignmentRows, discordRoles] =
        await Promise.all([
          db.select().from(Roles).where(inArray(Roles.id, input.roleIds)),
          db.select().from(User).where(inArray(User.id, input.userIds)),
          db
            .select({ roleId: Permissions.roleId, userId: Permissions.userId })
            .from(Permissions)
            .where(
              and(
                inArray(Permissions.roleId, input.roleIds),
                inArray(Permissions.userId, input.userIds),
              ),
            ),
          gateway.getGuildRoles(),
        ]);
      if (
        roleRows.length !== input.roleIds.length ||
        userRows.length !== input.userIds.length
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more selected users or roles no longer exist.",
        });
      }
      if (
        input.action === "revoke" &&
        roleRows.some((role) =>
          isAdministrativePermissionString(role.permissions),
        )
      ) {
        const [allRoles, allAssignments] = await Promise.all([
          db
            .select({ id: Roles.id, permissions: Roles.permissions })
            .from(Roles),
          getAssignmentRows(),
        ]);
        if (
          !retainsAssignedRoleAdministratorAfterRevocations({
            assignments: allAssignments,
            revokedRoleIds: new Set(input.roleIds),
            revokedUserIds: new Set(input.userIds),
            roles: allRoles,
          })
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This change would remove the final role administrator.",
          });
        }
      }
      const liveRoleIds = new Set(discordRoles.roles.map((role) => role.id));
      if (
        !discordRoles.available ||
        roleRows.some((role) => !liveRoleIds.has(role.discordRoleId))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more selected Discord roles are unavailable.",
        });
      }
      return runRoleAssignmentBatch({
        action: input.action,
        existingPairs: new Set(
          assignmentRows.map((row) => `${row.userId}:${row.roleId}`),
        ),
        grantBlade: async (userId, roleId) => {
          await db.insert(Permissions).values({ roleId, userId });
        },
        grantDiscord: gateway.grantRole,
        revokeBlade: async (userId, roleId) => {
          await db
            .delete(Permissions)
            .where(
              and(
                eq(Permissions.userId, userId),
                eq(Permissions.roleId, roleId),
              ),
            );
        },
        revokeDiscord: gateway.revokeRole,
        roles: roleRows,
        users: userRows,
      });
    }),

  unlinkRole: permProcedure
    .input(roleUnlinkSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const role = await db.query.Roles.findFirst({
        where: eq(Roles.id, input.roleId),
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      if (
        isAdministrativePermissionString(role.permissions) &&
        !(await retainsAdministratorAfter(role.id, null))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This role is the final assigned role administrator.",
        });
      }
      await db.transaction(async (tx) => {
        const [lockedRole] = await tx
          .select({ id: Roles.id })
          .from(Roles)
          .where(eq(Roles.id, role.id))
          .for("update");
        if (!lockedRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        const dependencies = await getDependencyCounts(role.id, tx);
        if (dependencies.total > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This role is still used by another Blade feature.",
          });
        }
        await tx
          .delete(Permissions)
          .where(eq(Permissions.roleId, lockedRole.id));
        await tx.delete(Roles).where(eq(Roles.id, lockedRole.id));
      });
      return { id: role.id };
    }),
} satisfies TRPCRouterRecord;
