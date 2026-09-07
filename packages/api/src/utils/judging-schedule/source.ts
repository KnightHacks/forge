import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { and, asc, eq, gte, isNull, or } from "@forge/db";
import {
  GuestJudgeSession,
  Hackathon,
  Judge,
  JudgingBuilding,
  JudgingRoom,
  JudgingRoomPresence,
  Project,
  ProjectChallenge,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import type { ScheduleProblem } from "./model";
import {
  isMlhChallenge,
  isSponsorChallenge,
} from "../projects/challenge-labels";

export async function lockScheduleHackathon(tx: WriteDb, hackathonId: string) {
  const [hackathon] = await tx
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .for("update")
    .limit(1);
  if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
}

/** Reuses Command Center's recent joined-judge predicate, including guest expiry. */
export async function readScheduleSource(
  tx: WriteDb,
  hackathonId: string,
  now = new Date(),
) {
  const rooms = await tx
    .select({
      id: JudgingRoom.id,
      challengeId: JudgingRoom.challengeId,
      challengeLabel: ProjectChallenge.label,
      buildingId: JudgingRoom.buildingId,
      buildingName: JudgingBuilding.name,
      name: JudgingRoom.name,
    })
    .from(JudgingRoom)
    .innerJoin(
      ProjectChallenge,
      eq(ProjectChallenge.id, JudgingRoom.challengeId),
    )
    .leftJoin(JudgingBuilding, eq(JudgingBuilding.id, JudgingRoom.buildingId))
    .where(
      and(
        eq(JudgingRoom.hackathonId, hackathonId),
        isNull(JudgingRoom.archivedAt),
      ),
    )
    .orderBy(asc(JudgingRoom.id));
  const presence = await tx
    .select({ roomId: JudgingRoomPresence.roomId })
    .from(JudgingRoomPresence)
    .innerJoin(Judge, eq(Judge.id, JudgingRoomPresence.judgeId))
    .leftJoin(
      GuestJudgeSession,
      and(
        eq(GuestJudgeSession.judgeId, Judge.id),
        isNull(GuestJudgeSession.revokedAt),
      ),
    )
    .where(
      and(
        eq(JudgingRoomPresence.hackathonId, hackathonId),
        isNull(JudgingRoomPresence.leftAt),
        gte(
          JudgingRoomPresence.lastSeenAt,
          new Date(now.getTime() - 15 * 60_000),
        ),
        or(eq(Judge.kind, "member"), gte(GuestJudgeSession.expiresAt, now)),
      ),
    );
  const staffedIds = new Set(presence.map((row) => row.roomId));
  const inventory = await tx
    .select({
      projectId: Project.id,
      title: Project.title,
      challengeId: ProjectChallenge.id,
      challengeLabel: ProjectChallenge.label,
    })
    .from(ProjectToChallenge)
    .innerJoin(Project, eq(Project.id, ProjectToChallenge.projectId))
    .innerJoin(
      ProjectChallenge,
      eq(ProjectChallenge.id, ProjectToChallenge.challengeId),
    )
    .where(
      and(
        eq(ProjectToChallenge.hackathonId, hackathonId),
        isNull(Project.deletedAt),
      ),
    )
    .orderBy(asc(Project.id), asc(ProjectChallenge.id));
  const scheduledRooms = rooms.filter(
    (room) => !isMlhChallenge(room.challengeLabel),
  );
  const tasks = inventory.filter(
    (task) => !isMlhChallenge(task.challengeLabel),
  );
  const eligibleRooms = scheduledRooms.flatMap((room) =>
    room.buildingId && staffedIds.has(room.id)
      ? [{ ...room, buildingId: room.buildingId }]
      : [],
  );
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        rooms: eligibleRooms.map(({ id, challengeId, buildingId }) => ({
          id,
          challengeId,
          buildingId,
        })),
        tasks: tasks.map(({ projectId, challengeId }) => ({
          projectId,
          challengeId,
        })),
      }),
    )
    .digest("hex");
  return {
    rooms: rooms.map((room) => ({
      ...room,
      staffed: staffedIds.has(room.id),
      scheduled: !isMlhChallenge(room.challengeLabel),
    })),
    eligibleRooms,
    tasks,
    fingerprint,
  };
}

export function scheduleProblemFromSource(
  source: Awaited<ReturnType<typeof readScheduleSource>>,
  timing: {
    startsAt: Date;
    endsAt: Date;
    setupMinutes: number;
    judgingMinutes: number;
    teardownMinutes: number;
    sameBuildingBreakMinutes: number;
    differentBuildingBreakMinutes: number;
  },
): ScheduleProblem {
  return {
    durationMinutes:
      timing.setupMinutes + timing.judgingMinutes + timing.teardownMinutes,
    windowMinutes:
      (timing.endsAt.getTime() - timing.startsAt.getTime()) / 60_000,
    sameBuildingBreakMinutes: timing.sameBuildingBreakMinutes,
    differentBuildingBreakMinutes: timing.differentBuildingBreakMinutes,
    rooms: source.eligibleRooms.map(({ id, buildingId, challengeId }) => ({
      id,
      buildingId,
      challengeId,
    })),
    tasks: source.tasks.map(({ projectId, challengeId, challengeLabel }) => ({
      projectId,
      challengeId,
      sponsor: isSponsorChallenge(challengeLabel),
    })),
  };
}
