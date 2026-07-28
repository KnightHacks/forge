import { TRPCError } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

interface MemberAuditIdentity {
  discordUser: string;
  firstName: string;
  id: string;
  lastName: string;
}

export function memberAuditLabel(member: Omit<MemberAuditIdentity, "id">) {
  return (
    `${member.firstName} ${member.lastName}`.trim() ||
    member.discordUser ||
    "Unknown member"
  );
}

export function memberAuditSubject(member: MemberAuditIdentity) {
  return {
    memberId: member.id,
    relation: "primary" as const,
    targetId: member.id,
    targetLabel: memberAuditLabel(member),
    targetType: "member" as const,
  };
}

// Self-service procedures only carry a session user ID. Audit subjects are
// keyed by member so member-scoped audit search finds the row either way.
export async function loadMemberAuditIdentity(
  userId: string,
  executor: WriteDb = db,
) {
  const [member] = await executor
    .select({
      discordUser: Member.discordUser,
      firstName: Member.firstName,
      id: Member.id,
      lastName: Member.lastName,
    })
    .from(Member)
    .where(eq(Member.userId, userId))
    .limit(1);

  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member profile does not exist.",
    });
  }

  return member;
}
