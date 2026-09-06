import type { Session } from "@forge/auth/server";
import {
  hashGuestJudgeCredential,
  JUDGING_GUEST_COOKIE,
  readCookieValue,
} from "@forge/auth/server";
import { and, eq, gt, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
} from "@forge/db/schemas/knight-hacks";

import { loadPermissionsForUser } from "../permissions-db";

export interface MemberJudgePrincipal {
  kind: "member";
  discordUserId: string;
  displayName: string;
  isOfficer: boolean;
  userId: string;
}

export interface GuestJudgePrincipal {
  kind: "guest";
  challengeId: string;
  displayName: string;
  guestSessionId: string;
  hackathonId: string;
  judgeId: string;
  roomId: string;
}

export interface IncompleteGuestJudgeAccess {
  kind: "incomplete-guest";
  guestSessionId: string;
  hackathonId: string;
  roomId: string;
}

export type JudgeAccess =
  | MemberJudgePrincipal
  | GuestJudgePrincipal
  | IncompleteGuestJudgeAccess
  | { kind: "none" };

export async function resolveJudgeAccess(input: {
  headers: Headers;
  session: Session | null;
}): Promise<JudgeAccess> {
  if (input.session?.user) {
    const permissions = await loadPermissionsForUser(input.session.user.id);
    if (permissions.IS_JUDGE === true || permissions.IS_OFFICER === true) {
      return {
        displayName: input.session.user.name,
        discordUserId: input.session.user.discordUserId,
        isOfficer: permissions.IS_OFFICER === true,
        kind: "member",
        userId: input.session.user.id,
      };
    }
  }

  const credential = readCookieValue(
    input.headers.get("cookie"),
    JUDGING_GUEST_COOKIE,
  );
  if (!credential) return { kind: "none" };

  const [record] = await db
    .select({
      challengeId: JudgingRoom.challengeId,
      completedAt: GuestJudgeSession.completedAt,
      displayName: Judge.displayName,
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
    .leftJoin(Judge, eq(Judge.id, GuestJudgeSession.judgeId))
    .where(
      and(
        eq(GuestJudgeSession.tokenHash, hashGuestJudgeCredential(credential)),
        gt(GuestJudgeSession.expiresAt, new Date()),
        isNull(GuestJudgeSession.revokedAt),
        isNull(JudgingRoomAccessLink.revokedAt),
        isNull(JudgingRoom.archivedAt),
      ),
    )
    .limit(1);

  if (!record) return { kind: "none" };
  if (!record.completedAt || !record.judgeId || !record.displayName) {
    return {
      guestSessionId: record.guestSessionId,
      hackathonId: record.hackathonId,
      kind: "incomplete-guest",
      roomId: record.roomId,
    };
  }
  return {
    challengeId: record.challengeId,
    displayName: record.displayName,
    guestSessionId: record.guestSessionId,
    hackathonId: record.hackathonId,
    judgeId: record.judgeId,
    kind: "guest",
    roomId: record.roomId,
  };
}
