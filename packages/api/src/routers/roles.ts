import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";
import {
  discordRoleIdSchema,
  emailRoleAudienceSchema,
  permissionExpressionSchema,
  roleBatchAssignmentSchema,
  roleCreateSchema,
  roleEventFeedbackExclusionSchema,
  roleIdSchema,
  roleIssueReminderUpdateSchema,
  roleManagementQuerySchema,
  rolePermissionUpdateSchema,
  roleUnlinkSchema,
} from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import {
  appendAdminAuditResults,
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { loadPermissionsForUser } from "../utils/permissions-db";
import {
  canConfigureRole,
  requireAssign,
  requireConfigure,
  requireOfficerForOfficerEscalation,
  requireRoleRead,
} from "../utils/roles/access";
import { resolveRoleDiscordGateway } from "../utils/roles/discord-gateway";
import {
  filterDiscordRolesForLinking,
  filterRoleUsers,
  isAdministrativePermissionString,
  permissionBitstringToKeys,
  permissionKeysToBitstring,
  retainsAssignedRoleAdministratorAfterRevocations,
  roleColorToHex,
  roleHasPermission,
  runRoleAssignmentBatch,
} from "../utils/roles/management";
import {
  assertEligibleDiscordRole,
  assertUniqueDiscordRole,
  buildLinkedRoleViews,
  countFeedbackExclusionImpact,
  getAssignmentRows,
  getDependencyCounts,
  getDiscordRole,
  retainsAdministratorAfter,
  syncLinkedRole,
} from "../utils/roles/service";

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
      guildId: await getKnightHacksGuildId(),
      linkedRoleIds: new Set(linked.map((role) => role.discordRoleId)),
      memberCounts,
      roles: discordRoles.roles,
    });
  }),

  listReminderChannels: permProcedure.query(async ({ ctx }) => {
    requireConfigure(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    return gateway.getGuildTextChannels?.() ?? [];
  }),

  previewDiscordRole: permProcedure
    .input(discordRoleIdSchema)
    .query(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const role = assertEligibleDiscordRole(
        await getDiscordRole(gateway, input),
        await getKnightHacksGuildId(),
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
    // One extra query for the one role this procedure resolves, beside the
    // `canRemoveAdmin` lookup. `listLinks` deliberately does not carry it.
    const pastEventCount = await countFeedbackExclusionImpact(role.id);
    return {
      ...role,
      canRemoveAdmin,
      feedbackExclusionImpact: { pastEventCount },
    };
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
      if (input.permissions.includes("IS_OFFICER")) {
        requireOfficerForOfficerEscalation(ctx);
      }
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const discordRole = assertEligibleDiscordRole(
        await getDiscordRole(gateway, input.discordRoleId),
        await getKnightHacksGuildId(),
      );
      await assertUniqueDiscordRole(discordRole);
      const operationId = randomUUID();
      const { auditEventId, created } = await db.transaction(async (tx) => {
        const [createdRole] = await tx
          .insert(Roles)
          .values({
            discordRoleId: discordRole.id,
            // `eventFeedbackExcluded` is left at its column default here. It
            // used to be set from a hard-coded list of eighteen role names,
            // hand-copied out of `@forge/consts`, which guessed "is this a
            // staff role?" from the Discord role's *name* — the same match that
            // emptied club teams whenever a role was renamed. A role being
            // linked has no club roster classification yet, so there is nothing
            // to derive the answer from. The durable answer stays where it has
            // always been, on the row, and an officer sets it.
            name: discordRole.name,
            permissions: permissionKeysToBitstring(input.permissions),
            teamHexcodeColor: roleColorToHex(discordRole.color),
          })
          .returning();
        if (!createdRole) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The role link could not be created.",
          });
        }
        const audit = await createAdminAuditEvent(
          {
            actionKey: "role.linked",
            actor: ctx.session.user,
            metadata: {
              discordRoleId: discordRole.id,
              discordRoleName: discordRole.name,
              permissionKeys: input.permissions,
            },
            operationId,
            subjects: [
              {
                relation: "primary",
                targetId: createdRole.id,
                targetLabel: createdRole.name,
                targetType: "role",
              },
              {
                relation: "secondary",
                targetId: discordRole.id,
                targetLabel: discordRole.name,
                targetType: "discord_role",
              },
            ],
          },
          tx,
        );
        return { auditEventId: audit.id, created: createdRole };
      });
      let sync;
      try {
        sync = await syncLinkedRole(created, gateway);
      } catch {
        sync = {
          results: [
            {
              effect: "unchanged" as const,
              memberId: null,
              outcome: "failed_external" as const,
              userId: discordRole.id,
              userLabel: "Discord role synchronization",
            },
          ],
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
      await appendAdminAuditResults({
        actionKey: "role.linked",
        eventId: auditEventId,
        results: sync.results.map((result) => ({
          memberId: result.memberId,
          metadata: { effect: result.effect },
          resultOutcome: result.outcome,
          targetId: result.userId,
          targetLabel: result.userLabel,
          targetType:
            result.userId === discordRole.id ? "provider" : ("user" as const),
        })),
      });
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
        await getKnightHacksGuildId(),
      );
      await assertUniqueDiscordRole(live, role.id);
      const nextPermissions = permissionKeysToBitstring(input.permissions);
      if (
        roleHasPermission(role.permissions, "IS_OFFICER") !==
        roleHasPermission(nextPermissions, "IS_OFFICER")
      ) {
        requireOfficerForOfficerEscalation(ctx);
      }
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
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(Roles)
          .set({
            name: live.name,
            permissions: nextPermissions,
            teamHexcodeColor: roleColorToHex(live.color),
          })
          .where(eq(Roles.id, role.id))
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "role.permissions.updated",
            actor: ctx.session.user,
            changes: [
              {
                after: permissionBitstringToKeys(nextPermissions),
                before: permissionBitstringToKeys(role.permissions),
                field: "permissionKeys",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: live.name,
                targetType: "role",
              },
            ],
          },
          tx,
        );
        return updated;
      });
    }),

  updateIssueReminders: permProcedure
    .input(roleIssueReminderUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      if (
        !gateway.validateTextChannel ||
        !(await gateway.validateTextChannel(input.channelId))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Choose a writable text channel from this Discord server or enter its channel ID.",
        });
      }
      const role = await db.query.Roles.findFirst({
        where: eq(Roles.id, input.roleId),
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(Roles)
          .set({
            issueReminderChannel: input.channelId,
            issueRemindersEnabled: input.enabled,
          })
          .where(eq(Roles.id, input.roleId))
          .returning({
            channelId: Roles.issueReminderChannel,
            enabled: Roles.issueRemindersEnabled,
            roleId: Roles.id,
          });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "role.issue_reminders.updated",
            actor: ctx.session.user,
            changes: [
              {
                after: input.enabled,
                before: role.issueRemindersEnabled,
                field: "enabled",
              },
              {
                after: input.channelId,
                before: role.issueReminderChannel,
                field: "channelId",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: role.name,
                targetType: "role",
              },
            ],
          },
          tx,
        );
        return updated;
      });
    }),

  updateEmailAudience: permProcedure
    .input(emailRoleAudienceSchema)
    .mutation(async ({ ctx, input }) => {
      requireConfigure(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [role] = await tx
          .select()
          .from(Roles)
          .where(eq(Roles.id, input.roleId))
          .limit(1)
          .for("update");
        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        const [updated] = await tx
          .update(Roles)
          .set({ emailAudienceEnabled: input.emailAudienceEnabled })
          .where(eq(Roles.id, input.roleId))
          .returning({
            emailAudienceEnabled: Roles.emailAudienceEnabled,
            id: Roles.id,
            name: Roles.name,
          });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "role.email_audience.updated",
            actor: auditActor,
            changes: [
              {
                after: updated.emailAudienceEnabled,
                before: role.emailAudienceEnabled,
                field: "enabled",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: role.name,
                targetType: "role",
              },
            ],
          },
          tx,
        );
        return updated;
      });
    }),

  /** Excludes a role's events from feedback collection, analytics, and export. */
  updateEventFeedbackExclusion: permProcedure
    .input(roleEventFeedbackExclusionSchema)
    .mutation(async ({ ctx, input }) => {
      // `requireConfigure`, not the officer guard the platform console uses. It
      // sits in the same dialog as `updateEmailAudience`, and a CONFIGURE_ROLES
      // holder who can already rewrite a role's permissions is not meaningfully
      // restrained by being denied one boolean.
      requireConfigure(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [role] = await tx
          .select()
          .from(Roles)
          .where(eq(Roles.id, input.roleId))
          .limit(1)
          .for("update");
        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        const [updated] = await tx
          .update(Roles)
          .set({ eventFeedbackExcluded: input.excluded })
          .where(eq(Roles.id, input.roleId))
          .returning({
            eventFeedbackExcluded: Roles.eventFeedbackExcluded,
            id: Roles.id,
            name: Roles.name,
          });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "role.event_feedback_exclusion.updated",
            actor: auditActor,
            changes: [
              {
                after: updated.eventFeedbackExcluded,
                before: role.eventFeedbackExcluded,
                field: "excluded",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: role.name,
                targetType: "role",
              },
            ],
          },
          tx,
        );
        return updated;
      });
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
      if (roleHasPermission(role.permissions, "IS_OFFICER")) {
        requireOfficerForOfficerEscalation(ctx);
      }
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      const operationId = randomUUID();
      const result = await syncLinkedRole(role, gateway);
      await createAdminAuditEvent({
        actionKey: "role.synced",
        actor: auditActor,
        metadata: {
          addedCount: result.summary.added,
          checkedCount: result.summary.checked,
          failedCount: result.summary.failed,
          removedCount: result.summary.removed,
          skippedCount: result.summary.skipped,
          unchangedCount: result.summary.unchanged,
        },
        operationId,
        outcome: result.summary.failed > 0 ? "partial_external" : "committed",
        subjects: [
          {
            relation: "primary",
            targetId: role.id,
            targetLabel: result.role.name,
            targetType: "role",
          },
          ...result.results.map((syncResult) => ({
            memberId: syncResult.memberId,
            metadata: { effect: syncResult.effect },
            relation: "result" as const,
            resultOutcome: syncResult.outcome,
            targetId: syncResult.userId,
            targetLabel: syncResult.userLabel,
            targetType: "user" as const,
          })),
        ],
      });
      return result;
    }),

  batchAssign: permProcedure
    .input(roleBatchAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      requireAssign(ctx);
      const gateway = await resolveRoleDiscordGateway(ctx.session);
      const [roleRows, userRows, memberRows, assignmentRows, discordRoles] =
        await Promise.all([
          db.select().from(Roles).where(inArray(Roles.id, input.roleIds)),
          db.select().from(User).where(inArray(User.id, input.userIds)),
          db
            .select({ id: Member.id, userId: Member.userId })
            .from(Member)
            .where(inArray(Member.userId, input.userIds)),
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
        roleRows.some((role) =>
          roleHasPermission(role.permissions, "IS_OFFICER"),
        )
      ) {
        requireOfficerForOfficerEscalation(ctx);
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
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      const result = await runRoleAssignmentBatch({
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
      const operationId = randomUUID();
      const usersById = new Map(userRows.map((user) => [user.id, user]));
      const rolesById = new Map(roleRows.map((role) => [role.id, role]));
      const memberIdsByUserId = new Map(
        memberRows.map((member) => [member.userId, member.id]),
      );
      const resultSubject = (
        pair: (typeof result.succeeded)[number],
        resultOutcome:
          | "compensated"
          | "failed_external"
          | "failed_internal"
          | "skipped"
          | "succeeded",
      ) => {
        const user = usersById.get(pair.userId);
        const role = rolesById.get(pair.roleId);
        return {
          memberId: memberIdsByUserId.get(pair.userId) ?? null,
          metadata: {
            compensated: "compensated" in pair && pair.compensated === true,
            roleId: pair.roleId,
            roleName: role?.name ?? "Unknown role",
            stage: "stage" in pair ? (pair.stage ?? null) : null,
          },
          relation: "result" as const,
          resultOutcome,
          targetId: pair.userId,
          targetLabel: `${user?.name ?? user?.discordUserId ?? "Unknown user"} · ${role?.name ?? "Unknown role"}`,
          targetType: "user" as const,
        };
      };
      await createAdminAuditEvent({
        actionKey:
          input.action === "grant"
            ? "role.assignments.granted"
            : "role.assignments.revoked",
        actor: auditActor,
        metadata: {
          failedCount: result.failed.length,
          selectedCount: input.userIds.length * input.roleIds.length,
          skippedCount: result.skipped.length,
          succeededCount: result.succeeded.length,
        },
        operationId,
        outcome: result.failed.length > 0 ? "partial_external" : "committed",
        subjects: [
          {
            relation: "primary",
            targetId: operationId,
            targetLabel: `${input.action === "grant" ? "Grant" : "Revoke"} ${input.userIds.length} user${input.userIds.length === 1 ? "" : "s"} × ${input.roleIds.length} role${input.roleIds.length === 1 ? "" : "s"}`,
            targetType: "role_assignment_batch",
          },
          ...result.succeeded.map((pair) => resultSubject(pair, "succeeded")),
          ...result.skipped.map((pair) => resultSubject(pair, "skipped")),
          ...result.failed.map((pair) =>
            resultSubject(
              pair,
              pair.compensated
                ? "compensated"
                : pair.stage === "discord"
                  ? "failed_external"
                  : "failed_internal",
            ),
          ),
        ],
      });
      return result;
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
      if (roleHasPermission(role.permissions, "IS_OFFICER")) {
        requireOfficerForOfficerEscalation(ctx);
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
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      const operationId = randomUUID();
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
        const assignments = await tx
          .select({
            memberId: Member.id,
            userId: User.id,
            userLabel: User.name,
          })
          .from(Permissions)
          .innerJoin(User, eq(User.id, Permissions.userId))
          .leftJoin(Member, eq(Member.userId, User.id))
          .where(eq(Permissions.roleId, lockedRole.id));
        await tx
          .delete(Permissions)
          .where(eq(Permissions.roleId, lockedRole.id));
        await tx.delete(Roles).where(eq(Roles.id, lockedRole.id));
        await createAdminAuditEvent(
          {
            actionKey: "role.unlinked",
            actor: auditActor,
            metadata: {
              permissionKeys: permissionBitstringToKeys(role.permissions),
              removedAssignmentCount: assignments.length,
            },
            operationId,
            subjects: [
              {
                relation: "primary",
                targetId: role.id,
                targetLabel: role.name,
                targetType: "role",
              },
              ...assignments.map((assignment) => ({
                memberId: assignment.memberId,
                metadata: { effect: "removed" },
                relation: "result" as const,
                resultOutcome: "succeeded" as const,
                targetId: assignment.userId,
                targetLabel: assignment.userLabel ?? assignment.userId,
                targetType: "user" as const,
              })),
            ],
          },
          tx,
        );
      });
      return { id: role.id };
    }),
} satisfies TRPCRouterRecord;
