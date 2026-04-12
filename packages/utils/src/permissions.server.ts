import "server-only";

import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { and, eq, gt, inArray } from "drizzle-orm";

import { db } from "@forge/db/client";
import { JudgeSession, Permissions } from "@forge/db/schemas/auth";

import { logger } from "./logger";

/**
 * Server-only function to check if the current user is a judge admin.
 * Uses cookies() from next/headers, so this can only be used in Server Components or Server Actions.
 */
export const isJudgeAdmin = async () => {
  try {
    const token = (await cookies()).get("sessionToken")?.value;
    if (!token) return false;

    const now = new Date();
    const rows = await db
      .select({ sessionToken: JudgeSession.sessionToken })
      .from(JudgeSession)
      .where(
        and(
          eq(JudgeSession.sessionToken, token),
          gt(JudgeSession.expires, now),
        ),
      )
      .limit(1);

    return rows.length > 0;
  } catch (err) {
    logger.error("isJudgeAdmin DB check error:", err);
    return false;
  }
};

/**
 * Server-only function to get judge session from cookie.
 * Uses cookies() from next/headers, so this can only be used in Server Components or Server Actions.
 */
export const getJudgeSessionFromCookie = async () => {
  const token = (await cookies()).get("sessionToken")?.value;
  if (!token) return null;

  const now = new Date();
  const rows = await db
    .select({
      sessionToken: JudgeSession.sessionToken,
      roomName: JudgeSession.roomName,
      expires: JudgeSession.expires,
    })
    .from(JudgeSession)
    .where(
      and(eq(JudgeSession.sessionToken, token), gt(JudgeSession.expires, now)),
    )
    .limit(1);

  return rows[0] ?? null;
};

interface IssueAssigneeValidationNode {
  team: string;
  assigneeIds?: string[];
  children?: IssueAssigneeValidationNode[];
}

export const validateAssigneesBelongToTeam = async (
  teamId: string,
  assigneeIds: string[] | undefined,
) => {
  if (!assigneeIds || assigneeIds.length === 0) {
    return;
  }

  const uniqueAssigneeIds = [...new Set(assigneeIds)];

  const rows = await db
    .select({ userId: Permissions.userId })
    .from(Permissions)
    .where(
      and(
        eq(Permissions.roleId, teamId),
        inArray(Permissions.userId, uniqueAssigneeIds),
      ),
    );

  const validAssigneeIdSet = new Set(rows.map((row) => row.userId));
  const invalidAssigneeIds = uniqueAssigneeIds.filter(
    (assigneeId) => !validAssigneeIdSet.has(assigneeId),
  );

  if (invalidAssigneeIds.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "All assignees must belong to the selected team. Invalid assignee IDs: " +
        invalidAssigneeIds.join(", "),
    });
  }
};

export const validateIssueNodeAssignees = async (
  nodes: IssueAssigneeValidationNode[],
) => {
  for (const node of nodes) {
    await validateAssigneesBelongToTeam(node.team, node.assigneeIds);
    if (node.children?.length) {
      await validateIssueNodeAssignees(node.children);
    }
  }
};
