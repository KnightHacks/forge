import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";

import { mergePermissionBitstrings } from "./permissions";

export async function loadPermissionsForUser(userId: string) {
  const rows = await db
    .select({ permissions: Roles.permissions })
    .from(Roles)
    .innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
    .where(eq(Permissions.userId, userId));

  return mergePermissionBitstrings(rows.map((row) => row.permissions));
}
