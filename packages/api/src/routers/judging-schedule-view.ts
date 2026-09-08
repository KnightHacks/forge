import type { TRPCRouterRecord } from "@trpc/server";

import { and, asc, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  JudgingAppointment,
  JudgingBuilding,
  JudgingRoom,
  JudgingRoomPresence,
  JudgingSchedule,
  ProjectChallenge,
  ProjectEvaluation,
} from "@forge/db/schemas/knight-hacks";
import { judgingScheduleReadSchema } from "@forge/validators";

import { judgeProcedure } from "../trpc";
import { reconcileExpiredJudgingDrafts } from "../utils/judging-schedule/reconcile";
import { resolveJudgeScope } from "../utils/judging/scope";

export const judgingScheduleViewRouter = {
  listJudgeSchedule: judgeProcedure
    .input(judgingScheduleReadSchema)
    .query(async ({ ctx, input }) => {
      const scope = await resolveJudgeScope(ctx.judgePrincipal, input);
      await reconcileExpiredJudgingDrafts(scope.hackathonId);
      const serverNow = new Date();
      const schedule = await db.query.JudgingSchedule.findFirst({
        where: eq(JudgingSchedule.hackathonId, scope.hackathonId),
      });
      const challenge = await db.query.ProjectChallenge.findFirst({
        where: eq(ProjectChallenge.id, scope.challengeId),
      });
      const filterChallenges = input.challengeIds.length
        ? await db
            .select({
              id: ProjectChallenge.id,
              parentId: ProjectChallenge.parentId,
            })
            .from(ProjectChallenge)
            .where(eq(ProjectChallenge.hackathonId, scope.hackathonId))
        : [];
      const parentFilters = input.challengeIds.map(
        (id) =>
          filterChallenges.find((challenge) => challenge.id === id)?.parentId ??
          id,
      );
      const [presence] = scope.judgeId
        ? await db
            .select({ roomId: JudgingRoomPresence.roomId })
            .from(JudgingRoomPresence)
            .where(
              and(
                eq(JudgingRoomPresence.judgeId, scope.judgeId),
                isNull(JudgingRoomPresence.leftAt),
              ),
            )
            .limit(1)
        : [];
      const appointments = schedule
        ? await db
            .select({
              id: JudgingAppointment.id,
              projectId: JudgingAppointment.projectId,
              challengeId: JudgingAppointment.challengeId,
              roomId: JudgingAppointment.roomId,
              startsAt: JudgingAppointment.startsAt,
              deadlineAt: JudgingAppointment.deadlineAt,
              endsAt: JudgingAppointment.endsAt,
              roomName: JudgingRoom.name,
              buildingName: JudgingBuilding.name,
            })
            .from(JudgingAppointment)
            .innerJoin(
              JudgingRoom,
              eq(JudgingRoom.id, JudgingAppointment.roomId),
            )
            .leftJoin(
              JudgingBuilding,
              eq(JudgingBuilding.id, JudgingRoom.buildingId),
            )
            .where(eq(JudgingAppointment.scheduleId, schedule.id))
            .orderBy(asc(JudgingAppointment.startsAt))
        : [];
      const busy = appointments.filter(
        (appointment) =>
          appointment.startsAt <= serverNow && appointment.endsAt > serverNow,
      );
      const current = busy.find(
        (appointment) => appointment.roomId === presence?.roomId,
      );
      const own = scope.judgeId
        ? await db
            .select({
              id: ProjectEvaluation.id,
              appointmentId: ProjectEvaluation.appointmentId,
              autoSubmittedAt: ProjectEvaluation.autoSubmittedAt,
            })
            .from(ProjectEvaluation)
            .where(eq(ProjectEvaluation.judgeId, scope.judgeId))
        : [];
      const editLockedEvaluationIds = own
        .filter(
          (evaluation) =>
            current !== undefined ||
            (evaluation.autoSubmittedAt &&
              busy.some(
                (appointment) =>
                  appointment.roomId ===
                  appointments.find(
                    (origin) => origin.id === evaluation.appointmentId,
                  )?.roomId,
              )),
        )
        .map((evaluation) => evaluation.id);
      return {
        serverNow,
        scheduleExists: !!schedule,
        activeRoomId: presence?.roomId ?? null,
        untimed:
          !schedule || (!!challenge && !challenge.isScheduled && !current),
        currentAppointment:
          current?.challengeId === scope.challengeId ? current : null,
        appointments: appointments.filter((appointment) =>
          scope.principalKind === "guest" || !input.challengeIds.length
            ? appointment.challengeId === scope.challengeId
            : parentFilters.includes(appointment.challengeId),
        ),
        editLockedEvaluationIds,
      };
    }),
} satisfies TRPCRouterRecord;
