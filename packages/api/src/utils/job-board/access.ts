import { TRPCError } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

/**
 * The job board is for members: a signed-in account without a member profile
 * may not read listings or other members' progress. Every job board procedure
 * calls this before doing any work.
 */
export async function requireJobBoardMember(userId: string) {
  const [member] = await db
    .select({ id: Member.id })
    .from(Member)
    .where(eq(Member.userId, userId))
    .limit(1);

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Create a member profile to use the job board.",
    });
  }

  return member;
}
