import { TRPCError } from "@trpc/server";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Hackathon,
  HackathonJudgingConfiguration,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
  ProjectChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import { upsertMemberJudge } from "../../judging-access.server";

async function activeHackathon() {
  const now = new Date();
  const [hackathon] = await db
    .select({ displayName: Hackathon.displayName, id: Hackathon.id })
    .from(Hackathon)
    .where(and(lte(Hackathon.startDate, now), gte(Hackathon.endDate, now)))
    .orderBy(desc(Hackathon.startDate))
    .limit(1);
  return hackathon ?? null;
}

export async function resolveJudgeScope(
  principal:
    | {
        displayName: string;
        isOfficer: boolean;
        kind: "member";
        userId: string;
      }
    | {
        challengeId: string;
        displayName: string;
        guestSessionId: string;
        hackathonId: string;
        judgeId: string;
        kind: "guest";
      },
  input: { challengeId?: string; hackathonId?: string },
) {
  if (principal.kind === "guest") {
    return {
      challengeId: principal.challengeId,
      hackathonId: principal.hackathonId,
      judgeId: principal.judgeId,
      principalKind: principal.kind,
    } as const;
  }
  if (
    input.hackathonId &&
    !principal.isOfficer &&
    (await activeHackathon())?.id !== input.hackathonId
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const hackathon = input.hackathonId
    ? await db.query.Hackathon.findFirst({
        columns: { displayName: true, id: true },
        where: eq(Hackathon.id, input.hackathonId),
      })
    : await activeHackathon();
  if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
  const challenges = await db
    .select({ id: ProjectChallenge.id, label: ProjectChallenge.label })
    .from(ProjectChallenge)
    .where(eq(ProjectChallenge.hackathonId, hackathon.id))
    .orderBy(
      sql`CASE WHEN ${ProjectChallenge.label} = 'General' THEN 0 ELSE 1 END`,
      asc(ProjectChallenge.label),
    );
  const selected =
    challenges.find((challenge) => challenge.id === input.challengeId) ??
    challenges[0];
  if (!selected) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Import projects before opening the judging workspace.",
    });
  }
  const [judge] = await db
    .select({ id: Judge.id })
    .from(Judge)
    .where(
      and(
        eq(Judge.hackathonId, hackathon.id),
        eq(Judge.userId, principal.userId),
      ),
    )
    .limit(1);
  return {
    challengeId: selected.id,
    challenges,
    hackathon,
    hackathonId: hackathon.id,
    judgeId: judge?.id ?? null,
    principalKind: principal.kind,
  } as const;
}

export async function requireWritableJudging(tx: WriteDb, hackathonId: string) {
  const [hackathon] = await tx
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .for("share")
    .limit(1);
  if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

  const config = await tx.query.HackathonJudgingConfiguration.findFirst({
    columns: { state: true },
    where: eq(HackathonJudgingConfiguration.hackathonId, hackathonId),
  });
  if (config?.state !== "open") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        config?.state === "closed"
          ? "Judging is closed. Your saved work is read-only."
          : "Judging has not opened yet.",
    });
  }
}

export async function resolveWritableJudge(
  tx: WriteDb,
  principal:
    | {
        displayName: string;
        isOfficer: boolean;
        kind: "member";
        userId: string;
      }
    | {
        challengeId: string;
        displayName: string;
        guestSessionId: string;
        hackathonId: string;
        judgeId: string;
        kind: "guest";
      },
  input: { challengeId?: string; hackathonId?: string },
) {
  if (principal.kind === "guest") {
    const [access] = await tx
      .select({
        challengeId: JudgingRoom.challengeId,
        hackathonId: JudgingRoom.hackathonId,
        judgeId: GuestJudgeSession.judgeId,
      })
      .from(GuestJudgeSession)
      .innerJoin(
        JudgingRoomAccessLink,
        eq(JudgingRoomAccessLink.id, GuestJudgeSession.accessLinkId),
      )
      .innerJoin(JudgingRoom, eq(JudgingRoom.id, JudgingRoomAccessLink.roomId))
      .where(
        and(
          eq(GuestJudgeSession.id, principal.guestSessionId),
          eq(GuestJudgeSession.judgeId, principal.judgeId),
          gt(GuestJudgeSession.expiresAt, new Date()),
          isNotNull(GuestJudgeSession.completedAt),
          isNull(GuestJudgeSession.revokedAt),
          isNull(JudgingRoomAccessLink.revokedAt),
          isNull(JudgingRoom.archivedAt),
        ),
      )
      .for("update", { of: GuestJudgeSession })
      .limit(1);
    if (!access?.judgeId) throw new TRPCError({ code: "UNAUTHORIZED" });
    return {
      challengeId: access.challengeId,
      hackathonId: access.hackathonId,
      judgeId: access.judgeId,
      principalKind: principal.kind,
    } as const;
  }
  if (
    input.hackathonId &&
    !principal.isOfficer &&
    (await activeHackathon())?.id !== input.hackathonId
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const hackathon = input.hackathonId
    ? await tx.query.Hackathon.findFirst({
        columns: { id: true },
        where: eq(Hackathon.id, input.hackathonId),
      })
    : (
        await tx
          .select({ id: Hackathon.id })
          .from(Hackathon)
          .where(
            and(
              lte(Hackathon.startDate, new Date()),
              gte(Hackathon.endDate, new Date()),
            ),
          )
          .orderBy(desc(Hackathon.startDate))
          .limit(1)
      )[0];
  if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
  const [challenge] = await tx
    .select({ id: ProjectChallenge.id })
    .from(ProjectChallenge)
    .where(
      and(
        eq(ProjectChallenge.hackathonId, hackathon.id),
        input.challengeId
          ? eq(ProjectChallenge.id, input.challengeId)
          : eq(ProjectChallenge.label, "General"),
      ),
    )
    .limit(1);
  if (!challenge) throw new TRPCError({ code: "BAD_REQUEST" });
  const judge = await upsertMemberJudge(tx, {
    displayName: principal.displayName,
    hackathonId: hackathon.id,
    userId: principal.userId,
  });
  return {
    challengeId: challenge.id,
    hackathonId: hackathon.id,
    judgeId: judge.id,
    principalKind: principal.kind,
  } as const;
}
