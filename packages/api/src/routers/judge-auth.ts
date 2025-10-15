import { cookies } from "next/headers";
import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";
import { and, eq, gt } from "drizzle-orm";
import type { Session } from "@forge/auth";

export const isJudgeAdmin = async (_user: Session["user"] | null | undefined) => {
  try {
    const token = cookies().get("sessionToken")?.value;
    if (!token) return false;

    const now = new Date();
    const rows = await db
      .select({ sessionToken: JudgeSession.sessionToken })
      .from(JudgeSession)
      .where(and(eq(JudgeSession.sessionToken, token), gt(JudgeSession.expires, now)))
      .limit(1);

    return !!rows[0];
  } catch (err) {
    console.error("isJudgeAdmin DB check error:", err);
    return false;
  }
}; 

// packages/api/src/lib/judge-auth.ts
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
    .where(and(eq(JudgeSession.sessionToken, token), gt(JudgeSession.expires, now)))
    .limit(1);

  return rows[0] ?? null;
};
