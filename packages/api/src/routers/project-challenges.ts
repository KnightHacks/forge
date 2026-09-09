import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  JudgingRoom,
  ProjectChallenge,
} from "@forge/db/schemas/knight-hacks";
import {
  judgingGroupCreateSchema,
  judgingGroupDeleteSchema,
  judgingGroupUpdateSchema,
  projectChallengeUpdateSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { lockScheduleHackathon } from "../utils/judging-schedule/source";
import { assertCanManageProjects } from "../utils/projects/access";
import {
  assertChallengeSetupEditable,
  challengeSelection,
  rebuildParentMemberships,
  validateChallengeGrouping,
} from "../utils/projects/challenge-configuration";

export const projectChallengesRouter = {
  createGroup: permProcedure
    .input(judgingGroupCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await assertChallengeSetupEditable(tx, input.hackathonId);
        const hackathon = await tx.query.Hackathon.findFirst({
          where: eq(Hackathon.id, input.hackathonId),
          columns: { displayName: true },
        });
        if (input.isMlhImportDefault) {
          await tx
            .update(ProjectChallenge)
            .set({ importLabelMatch: null })
            .where(
              and(
                eq(ProjectChallenge.hackathonId, input.hackathonId),
                eq(ProjectChallenge.isGroup, true),
                eq(ProjectChallenge.importLabelMatch, "MLH"),
              ),
            );
        }
        const [group] = await tx
          .insert(ProjectChallenge)
          .values({
            hackathonId: input.hackathonId,
            label: input.label,
            isGeneral: input.isGeneral,
            isScheduled: input.isScheduled,
            isGroup: true,
            importLabelMatch: input.isMlhImportDefault ? "MLH" : null,
          })
          .onConflictDoNothing()
          .returning(challengeSelection);
        if (!group)
          throw new TRPCError({
            code: "CONFLICT",
            message: "A judging group with this name already exists.",
          });
        await rebuildParentMemberships(tx, input.hackathonId);
        await createAdminAuditEvent(
          {
            actionKey: "judging.group.created",
            actor,
            metadata: {
              groupId: group.id,
              isMlhImportDefault: group.isMlhImportDefault,
              label: group.label,
              isGeneral: group.isGeneral,
              isScheduled: group.isScheduled,
            },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetType: "hackathon",
                targetLabel: hackathon?.displayName ?? input.hackathonId,
              },
            ],
          },
          tx,
        );
        return group;
      });
    }),
  updateGroup: permProcedure
    .input(judgingGroupUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await assertChallengeSetupEditable(tx, input.hackathonId);
        const hackathon = await tx.query.Hackathon.findFirst({
          where: eq(Hackathon.id, input.hackathonId),
          columns: { displayName: true },
        });
        const previous = await tx.query.ProjectChallenge.findFirst({
          columns: {
            label: true,
            isGeneral: true,
            isScheduled: true,
            importLabelMatch: true,
          },
          where: and(
            eq(ProjectChallenge.id, input.groupId),
            eq(ProjectChallenge.hackathonId, input.hackathonId),
            eq(ProjectChallenge.isGroup, true),
          ),
        });
        if (!previous)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Judging group not found in this hackathon.",
          });
        const duplicate = await tx.query.ProjectChallenge.findFirst({
          columns: { id: true },
          where: and(
            eq(ProjectChallenge.hackathonId, input.hackathonId),
            eq(ProjectChallenge.isGroup, true),
            eq(ProjectChallenge.label, input.label),
          ),
        });
        if (duplicate && duplicate.id !== input.groupId)
          throw new TRPCError({
            code: "CONFLICT",
            message: "A judging group with this name already exists.",
          });
        if (input.isMlhImportDefault) {
          await tx
            .update(ProjectChallenge)
            .set({ importLabelMatch: null })
            .where(
              and(
                eq(ProjectChallenge.hackathonId, input.hackathonId),
                eq(ProjectChallenge.isGroup, true),
                eq(ProjectChallenge.importLabelMatch, "MLH"),
              ),
            );
        }
        const [group] = await tx
          .update(ProjectChallenge)
          .set({
            importLabelMatch:
              input.isMlhImportDefault === undefined
                ? undefined
                : input.isMlhImportDefault
                  ? "MLH"
                  : null,
            label: input.label,
            isGeneral: input.isGeneral,
            isScheduled: input.isScheduled,
          })
          .where(
            and(
              eq(ProjectChallenge.id, input.groupId),
              eq(ProjectChallenge.hackathonId, input.hackathonId),
              eq(ProjectChallenge.isGroup, true),
            ),
          )
          .returning(challengeSelection);
        if (!group)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Judging group not found in this hackathon.",
          });
        await rebuildParentMemberships(tx, input.hackathonId);
        await createAdminAuditEvent(
          {
            actionKey: "judging.group.updated",
            actor,
            changes: (
              [
                "label",
                "isGeneral",
                "isScheduled",
                "isMlhImportDefault",
              ] as const
            ).flatMap((field) => {
              const before =
                field === "isMlhImportDefault"
                  ? previous.importLabelMatch === "MLH"
                  : previous[field];
              const after = group[field];
              return before === after ? [] : [{ field, before, after }];
            }),
            metadata: {
              groupId: group.id,
              isMlhImportDefault: group.isMlhImportDefault,
              label: group.label,
              isGeneral: group.isGeneral,
              isScheduled: group.isScheduled,
            },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetType: "hackathon",
                targetLabel: hackathon?.displayName ?? input.hackathonId,
              },
            ],
          },
          tx,
        );
        return group;
      });
    }),
  deleteGroup: permProcedure
    .input(judgingGroupDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await assertChallengeSetupEditable(tx, input.hackathonId);
        const hackathon = await tx.query.Hackathon.findFirst({
          where: eq(Hackathon.id, input.hackathonId),
          columns: { displayName: true },
        });
        const group = await tx.query.ProjectChallenge.findFirst({
          columns: { id: true, label: true },
          where: and(
            eq(ProjectChallenge.id, input.groupId),
            eq(ProjectChallenge.hackathonId, input.hackathonId),
            eq(ProjectChallenge.isGroup, true),
          ),
        });
        if (!group)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Judging group not found in this hackathon.",
          });
        const room = await tx.query.JudgingRoom.findFirst({
          where: and(
            eq(JudgingRoom.challengeId, group.id),
            isNull(JudgingRoom.archivedAt),
          ),
        });
        if (room)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Reassign or archive this group's rooms before deleting it.",
          });
        await tx
          .update(ProjectChallenge)
          .set({ parentId: null })
          .where(
            and(
              eq(ProjectChallenge.parentId, group.id),
              eq(ProjectChallenge.hackathonId, input.hackathonId),
            ),
          );
        await tx
          .delete(ProjectChallenge)
          .where(eq(ProjectChallenge.id, group.id));
        await rebuildParentMemberships(tx, input.hackathonId);
        await createAdminAuditEvent(
          {
            actionKey: "judging.group.deleted",
            actor,
            metadata: { groupId: group.id, label: group.label },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetType: "hackathon",
                targetLabel: hackathon?.displayName ?? input.hackathonId,
              },
            ],
          },
          tx,
        );
        return { success: true };
      });
    }),
  updateChallenge: permProcedure
    .input(projectChallengeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await assertChallengeSetupEditable(tx, input.hackathonId);
        const hackathon = await tx.query.Hackathon.findFirst({
          where: eq(Hackathon.id, input.hackathonId),
          columns: { displayName: true },
        });
        const challenges = await tx
          .select(challengeSelection)
          .from(ProjectChallenge)
          .where(eq(ProjectChallenge.hackathonId, input.hackathonId));
        const previous = challenges.find(
          (item) => item.id === input.challengeId,
        );
        validateChallengeGrouping(
          challenges,
          input.challengeId,
          input.parentId,
        );
        if (challenges.find((item) => item.id === input.challengeId)?.isGroup)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Use group settings to edit a judging group.",
          });
        if (input.parentId) {
          const room = await tx.query.JudgingRoom.findFirst({
            where: and(
              eq(JudgingRoom.challengeId, input.challengeId),
              isNull(JudgingRoom.archivedAt),
            ),
          });
          if (room)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "Reassign or archive this challenge's rooms before collapsing it.",
            });
        }
        const [challenge] = await tx
          .update(ProjectChallenge)
          .set({ parentId: input.parentId, isScheduled: input.isScheduled })
          .where(eq(ProjectChallenge.id, input.challengeId))
          .returning(challengeSelection);
        if (!challenge || !previous)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imported challenge not found in this hackathon.",
          });
        await rebuildParentMemberships(tx, input.hackathonId);
        await createAdminAuditEvent(
          {
            actionKey: "judging.challenge.updated",
            actor,
            changes: (["parentId", "isScheduled"] as const).flatMap((field) =>
              previous[field] === challenge[field]
                ? []
                : [{ field, before: previous[field], after: challenge[field] }],
            ),
            metadata: {
              challengeId: challenge.id,
              label: challenge.label,
              parentId: input.parentId,
              isScheduled: input.isScheduled,
            },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetLabel: hackathon?.displayName ?? input.hackathonId,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
        return challenge;
      });
    }),
} satisfies TRPCRouterRecord;
