import "server-only";

import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";

import { logger } from "./logger";

/**
 * Server-only function to check if the current user is a judge admin.
 * Uses cookies() from next/headers, so this can only be used in Server Components or Server Actions.
 */
export const isJudgeAdmin = async () => {
  try {
    const token = cookies().get("sessionToken")?.value;
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
  const token = cookies().get("sessionToken")?.value;
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
