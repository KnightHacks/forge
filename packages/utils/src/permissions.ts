import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";

import { PERMISSIONS } from "@forge/consts";
import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";

import { logger } from "./logger";

export const hasPermission = (
  userPermissions: string,
  permission: PERMISSIONS.PermissionIndex,
): boolean => {
  const permissionBit = userPermissions[permission];
  return permissionBit === "1";
};

// Mock tRPC context for type-safety
interface Context {
  session: {
    permissions: Record<PERMISSIONS.PermissionKey, boolean>;
  };
}

export const controlPerms = {
  // Returns true if the user has any required permission OR has isOfficer role
  or: (perms: PERMISSIONS.PermissionKey[], ctx: Context) => {
    // first check if user has IS_OFFICER
    if (ctx.session.permissions.IS_OFFICER) return true;

    let flag = false;
    for (const p of perms) if (ctx.session.permissions[p]) flag = true;
    if (!flag) throw new TRPCError({ code: "UNAUTHORIZED" });
    return true;
  },

  // Returns true only if the user has ALL required permissions
  and: (perms: PERMISSIONS.PermissionKey[], ctx: Context) => {
    // first check if user has IS_OFFICER
    if (ctx.session.permissions.IS_OFFICER) return true;

    for (const p of perms)
      if (!ctx.session.permissions[p])
        throw new TRPCError({ code: "UNAUTHORIZED" });

    return true;
  },
};

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

export function getPermsAsList(perms: string) {
  const list = [];
  const permKeys = Object.keys(PERMISSIONS.PERMISSIONS);
  for (let i = 0; i < perms.length; i++) {
    const permKey = permKeys.at(i);
    if (perms[i] == "1" && permKey) {
      const permissionData = PERMISSIONS.PERMISSION_DATA[permKey];
      if (permissionData) list.push(permissionData.name);
    }
  }
  return list;
}
