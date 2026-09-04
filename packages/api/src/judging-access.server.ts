import { TRPCError } from "@trpc/server";

import type { Session } from "@forge/auth/server";
import { env as authEnv } from "@forge/auth/env";
import {
  createGuestJudgeCredential,
  hashGuestJudgeCredential,
  JUDGING_GUEST_COOKIE,
  JUDGING_GUEST_SESSION_SECONDS,
  readCookieValue,
  signJudgingRoomLink,
  verifyJudgingRoomLink,
} from "@forge/auth/server";
import { and, eq, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "./utils/db";
import { env } from "./env";
import { resolveJudgeAccess } from "./utils/judging/principal";

function judgingSecret() {
  const secret = authEnv.JUDGING_ACCESS_SECRET;
  if (!secret) {
    throw new Error(
      "JUDGING_ACCESS_SECRET is required for judging room access.",
    );
  }
  return secret;
}

export async function upsertMemberJudge(
  tx: WriteDb,
  input: { displayName: string; hackathonId: string; userId: string },
) {
  const [judge] = await tx
    .insert(Judge)
    .values({
      displayName: input.displayName,
      hackathonId: input.hackathonId,
      kind: "member",
      userId: input.userId,
    })
    .onConflictDoUpdate({
      set: { displayName: input.displayName },
      target: [Judge.hackathonId, Judge.userId],
      targetWhere: sql`${Judge.userId} IS NOT NULL`,
    })
    .returning({ id: Judge.id });
  if (!judge) throw new Error("Member judge was not created.");
  return judge;
}

export function judgingRoomActivationUrl(linkId: string) {
  const signature = signJudgingRoomLink(linkId, judgingSecret());
  return `${env.BLADE_URL}/judge/activate/${linkId}?signature=${encodeURIComponent(signature)}`;
}

export type RoomActivationResult =
  | { challengeId: string; kind: "member"; roomId: string }
  | {
      challengeId: string;
      credential: string;
      kind: "guest";
      roomId: string;
    };

export async function activateJudgingRoom(input: {
  linkId: string;
  session: Session | null;
  signature: string;
}): Promise<RoomActivationResult> {
  if (!verifyJudgingRoomLink(input.linkId, input.signature, judgingSecret())) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Link not found." });
  }

  const memberAccess = await resolveJudgeAccess({
    headers: new Headers(),
    session: input.session,
  });

  return db.transaction(async (tx) => {
    const [access] = await tx
      .select({
        challengeId: JudgingRoom.challengeId,
        hackathonId: JudgingRoom.hackathonId,
        roomId: JudgingRoom.id,
      })
      .from(JudgingRoomAccessLink)
      .innerJoin(JudgingRoom, eq(JudgingRoom.id, JudgingRoomAccessLink.roomId))
      .where(
        and(
          eq(JudgingRoomAccessLink.id, input.linkId),
          isNull(JudgingRoomAccessLink.revokedAt),
          isNull(JudgingRoom.archivedAt),
        ),
      )
      .for("update")
      .limit(1);
    if (!access) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Link not found." });
    }

    if (memberAccess.kind === "member") {
      const judge = await upsertMemberJudge(tx, {
        displayName: memberAccess.displayName,
        hackathonId: access.hackathonId,
        userId: memberAccess.userId,
      });
      const now = new Date();
      await tx
        .update(JudgingRoomPresence)
        .set({ leftAt: now, leaveReason: "switched-room" })
        .where(
          and(
            eq(JudgingRoomPresence.judgeId, judge.id),
            isNull(JudgingRoomPresence.leftAt),
          ),
        );
      await tx.insert(JudgingRoomPresence).values({
        hackathonId: access.hackathonId,
        judgeId: judge.id,
        roomId: access.roomId,
      });
      return {
        challengeId: access.challengeId,
        kind: "member",
        roomId: access.roomId,
      };
    }

    const credential = createGuestJudgeCredential();
    await tx.insert(GuestJudgeSession).values({
      accessLinkId: input.linkId,
      expiresAt: new Date(Date.now() + JUDGING_GUEST_SESSION_SECONDS * 1000),
      hackathonId: access.hackathonId,
      tokenHash: hashGuestJudgeCredential(credential),
    });
    return {
      challengeId: access.challengeId,
      credential,
      kind: "guest",
      roomId: access.roomId,
    };
  });
}

export async function completeGuestJudge(input: {
  displayName: string;
  headers: Headers;
}) {
  const credential = readCookieValue(
    input.headers.get("cookie"),
    JUDGING_GUEST_COOKIE,
  );
  if (!credential) throw new TRPCError({ code: "UNAUTHORIZED" });
  const tokenHash = hashGuestJudgeCredential(credential);

  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        completedAt: GuestJudgeSession.completedAt,
        expiresAt: GuestJudgeSession.expiresAt,
        guestSessionId: GuestJudgeSession.id,
        hackathonId: JudgingRoom.hackathonId,
        judgeId: GuestJudgeSession.judgeId,
        roomId: JudgingRoom.id,
      })
      .from(GuestJudgeSession)
      .innerJoin(
        JudgingRoomAccessLink,
        eq(JudgingRoomAccessLink.id, GuestJudgeSession.accessLinkId),
      )
      .innerJoin(JudgingRoom, eq(JudgingRoom.id, JudgingRoomAccessLink.roomId))
      .where(
        and(
          eq(GuestJudgeSession.tokenHash, tokenHash),
          isNull(GuestJudgeSession.revokedAt),
          isNull(JudgingRoomAccessLink.revokedAt),
          isNull(JudgingRoom.archivedAt),
        ),
      )
      .for("update")
      .limit(1);
    if (!record || record.expiresAt <= new Date()) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (record.completedAt && record.judgeId) {
      return { judgeId: record.judgeId, roomId: record.roomId };
    }

    const [judge] = await tx
      .insert(Judge)
      .values({
        displayName: input.displayName,
        hackathonId: record.hackathonId,
        kind: "guest",
      })
      .returning({ id: Judge.id });
    if (!judge) throw new Error("Guest judge was not created.");
    const now = new Date();
    await tx
      .update(GuestJudgeSession)
      .set({ completedAt: now, judgeId: judge.id, lastSeenAt: now })
      .where(eq(GuestJudgeSession.id, record.guestSessionId));
    await tx.insert(JudgingRoomPresence).values({
      hackathonId: record.hackathonId,
      judgeId: judge.id,
      roomId: record.roomId,
    });
    return { judgeId: judge.id, roomId: record.roomId };
  });
}
