import { TRPCError } from "@trpc/server";

import type { HackerJudgingDto } from "@forge/hacker-sdk/contracts";
import { and, asc, eq, ilike, inArray, isNotNull, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingAppointment,
  JudgingBuilding,
  JudgingRoom,
  JudgingRubricItem,
  Project,
  ProjectChallenge,
  ProjectClaimLink,
  ProjectEvaluation,
  ProjectEvaluationRating,
  ProjectEvaluationResponse,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import { appointmentStatus } from "../judging-schedule/appointments";
import { reconcileExpiredJudgingDrafts } from "../judging-schedule/reconcile";
import {
  claimMemberDto,
  ownProjectClaim,
  projectRoster,
  requireClaimParticipant,
} from "./claims";

export async function searchJudgingProjects(
  userId: string,
  hackathonId: string,
  query: string,
) {
  await requireClaimParticipant(userId, hackathonId);
  const [config] = await db
    .select()
    .from(HackathonJudgingConfiguration)
    .where(eq(HackathonJudgingConfiguration.hackathonId, hackathonId));
  if (!config?.hackerSchedulePublished || !config.hackerScheduleEmergency)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Project search is not open for this event.",
    });
  return db
    .select({ id: Project.id, title: Project.title })
    .from(Project)
    .where(
      and(
        eq(Project.hackathonId, hackathonId),
        isNull(Project.deletedAt),
        ilike(Project.title, `%${query.replace(/[\\%_]/g, "\\$&")}%`),
      ),
    )
    .orderBy(asc(Project.title))
    .limit(25);
}

export async function hackerJudging(
  userId: string,
  hackathonId: string,
  selectedId?: string,
): Promise<HackerJudgingDto> {
  await requireClaimParticipant(userId, hackathonId);
  const [config, own, hackathon, sentLink] = await Promise.all([
    db.query.HackathonJudgingConfiguration.findFirst({
      where: eq(HackathonJudgingConfiguration.hackathonId, hackathonId),
    }),
    ownProjectClaim(userId, hackathonId),
    db.query.Hackathon.findFirst({
      columns: { timezone: true },
      where: eq(Hackathon.id, hackathonId),
    }),
    db
      .select({ id: ProjectClaimLink.id })
      .from(ProjectClaimLink)
      .innerJoin(ProjectMember, eq(ProjectMember.id, ProjectClaimLink.memberId))
      .innerJoin(Project, eq(Project.id, ProjectMember.projectId))
      .where(
        and(
          eq(Project.hackathonId, hackathonId),
          isNull(Project.deletedAt),
          isNotNull(ProjectClaimLink.sentAt),
        ),
      )
      .limit(1),
  ]);
  const now = new Date();
  const output: HackerJudgingDto = {
    claimsOpen: sentLink.length > 0,
    published: config?.hackerSchedulePublished ?? false,
    emergency: config?.hackerScheduleEmergency ?? false,
    serverNow: now.toISOString(),
    timezone: hackathon?.timezone ?? "UTC",
    project: null,
    appointments: [],
    unscheduled: [],
    feedback: [],
  };
  const projectId = output.emergency
    ? output.published
      ? selectedId
      : undefined
    : own?.projectId;
  if (!output.emergency && selectedId && selectedId !== own?.projectId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only view your claimed project.",
    });
  if (!projectId) return output;
  const project = await db.query.Project.findFirst({
    where: and(
      eq(Project.id, projectId),
      eq(Project.hackathonId, hackathonId),
      isNull(Project.deletedAt),
    ),
  });
  if (!project)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This project is unavailable.",
    });
  const roster = output.emergency ? [] : await projectRoster(project.id);
  output.project = {
    id: project.id,
    title: project.title,
    members: roster.map((member) => claimMemberDto(member, userId)),
    canInvite:
      !output.emergency &&
      Math.max(project.participantCount, roster.length) < 4,
  };
  if (!output.published) return output;
  // Materialize deadline submissions before the final missed-appointment check.
  // Unclaimed hackers and an empty emergency selection never run this work.
  await reconcileExpiredJudgingDrafts(hackathonId);
  const [challenges, rooms, appointments, evaluations] = await Promise.all([
    db
      .select({
        id: ProjectChallenge.id,
        label: ProjectChallenge.label,
        parentId: ProjectChallenge.parentId,
        isScheduled: ProjectChallenge.isScheduled,
      })
      .from(ProjectToChallenge)
      .innerJoin(
        ProjectChallenge,
        eq(ProjectChallenge.id, ProjectToChallenge.challengeId),
      )
      .where(
        and(
          eq(ProjectToChallenge.projectId, project.id),
          eq(ProjectToChallenge.hackathonId, hackathonId),
        ),
      ),
    db
      .select({
        id: JudgingRoom.id,
        challengeId: JudgingRoom.challengeId,
        name: JudgingRoom.name,
        building: JudgingBuilding.name,
      })
      .from(JudgingRoom)
      .leftJoin(JudgingBuilding, eq(JudgingBuilding.id, JudgingRoom.buildingId))
      .where(
        and(
          eq(JudgingRoom.hackathonId, hackathonId),
          isNull(JudgingRoom.archivedAt),
        ),
      ),
    db
      .select()
      .from(JudgingAppointment)
      .where(
        and(
          eq(JudgingAppointment.projectId, project.id),
          eq(JudgingAppointment.hackathonId, hackathonId),
        ),
      )
      .orderBy(asc(JudgingAppointment.startsAt)),
    db
      .select({
        id: ProjectEvaluation.id,
        challengeId: ProjectEvaluation.challengeId,
        isComplete: ProjectEvaluation.isComplete,
        kind: Judge.kind,
      })
      .from(ProjectEvaluation)
      .innerJoin(Judge, eq(Judge.id, ProjectEvaluation.judgeId))
      .where(
        and(
          eq(ProjectEvaluation.projectId, project.id),
          eq(ProjectEvaluation.hackathonId, hackathonId),
        ),
      )
      .orderBy(asc(ProjectEvaluation.createdAt)),
  ]);
  const roomLabel = (room: (typeof rooms)[number] | undefined) =>
    room
      ? [room.building, room.name].filter(Boolean).join(" · ")
      : "Ask an organizer for the room";
  const children = (challengeId: string) =>
    challenges
      .filter((child) => child.parentId === challengeId)
      .map((child) => child.label);
  output.appointments = appointments.map((appointment) => ({
    id: appointment.id,
    challengeId: appointment.challengeId,
    challenge:
      challenges.find((challenge) => challenge.id === appointment.challengeId)
        ?.label ?? "Judging",
    children: children(appointment.challengeId),
    room: roomLabel(rooms.find((room) => room.id === appointment.roomId)),
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointmentStatus(
      appointment,
      evaluations.filter(
        (evaluation) => evaluation.challengeId === appointment.challengeId,
      ),
      now,
    ),
  }));
  output.unscheduled = challenges
    .filter((challenge) => !challenge.parentId && !challenge.isScheduled)
    .map((challenge) => ({
      challengeId: challenge.id,
      challenge: challenge.label,
      judged: evaluations.some(
        (evaluation) =>
          evaluation.challengeId === challenge.id && evaluation.isComplete,
      ),
      children: children(challenge.id),
      rooms: rooms
        .filter((room) => room.challengeId === challenge.id)
        .map(roomLabel),
    }));
  const eligible = output.emergency
    ? []
    : evaluations.filter(
        (evaluation) => evaluation.kind === "member" && evaluation.isComplete,
      );
  if (eligible.length) {
    const ids = eligible.map((evaluation) => evaluation.id);
    const [ratings, responses] = await Promise.all([
      db
        .select({
          evaluationId: ProjectEvaluationRating.evaluationId,
          label: JudgingRubricItem.label,
          value: ProjectEvaluationRating.value,
        })
        .from(ProjectEvaluationRating)
        .innerJoin(
          JudgingRubricItem,
          eq(JudgingRubricItem.id, ProjectEvaluationRating.rubricItemId),
        )
        .where(inArray(ProjectEvaluationRating.evaluationId, ids))
        .orderBy(asc(JudgingRubricItem.displayOrder)),
      db
        .select({
          evaluationId: ProjectEvaluationResponse.evaluationId,
          label: JudgingRubricItem.label,
          value: ProjectEvaluationResponse.value,
        })
        .from(ProjectEvaluationResponse)
        .innerJoin(
          JudgingRubricItem,
          eq(JudgingRubricItem.id, ProjectEvaluationResponse.rubricItemId),
        )
        .where(inArray(ProjectEvaluationResponse.evaluationId, ids))
        .orderBy(asc(JudgingRubricItem.displayOrder)),
    ]);
    output.feedback = eligible.map((evaluation) => ({
      challengeId: evaluation.challengeId,
      challenge:
        challenges.find((challenge) => challenge.id === evaluation.challengeId)
          ?.label ?? "Judging",
      ratings: ratings
        .filter((rating) => rating.evaluationId === evaluation.id)
        .map(({ label, value }) => ({ label, value })),
      responses: responses
        .filter((response) => response.evaluationId === evaluation.id)
        .map(({ label, value }) => ({ label, value })),
    }));
  }
  return output;
}
