import type { Session } from "@forge/auth/server";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";

import type { PermissionMap } from "../permissions";

export interface PlatformFormActor {
  discordUserId?: string | null;
  name?: string | null;
  permissions: PermissionMap;
  roleIds: string[];
  userId: string;
}

export async function loadPlatformFormActor(
  session: Session & { permissions: PermissionMap },
): Promise<PlatformFormActor> {
  const rows = await db
    .select({ roleId: Permissions.roleId })
    .from(Permissions)
    .where(eq(Permissions.userId, session.user.id));
  return {
    discordUserId: session.user.discordUserId,
    name: session.user.name,
    permissions: session.permissions,
    roleIds: [...new Set(rows.map(({ roleId }) => roleId))],
    userId: session.user.id,
  };
}

export function auditActor(actor: PlatformFormActor) {
  return {
    discordUserId: actor.discordUserId,
    id: actor.userId,
    name: actor.name,
  };
}
