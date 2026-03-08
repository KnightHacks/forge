import { PERMISSIONS } from "@forge/consts";
import { eq, sql } from "@forge/db";
import { Permissions, Roles } from "@forge/db/schemas/auth";

import { getTestDb } from "./db";

/**
 * Builds a permissions map from database roles for a user.
 * This mimics the logic in permProcedure.
 */
export async function buildPermissionsMap(
  userId: string,
): Promise<Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>> {
  const testDb = getTestDb();

  const permRows = await testDb
    .select({
      permissions: Roles.permissions,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
    .where(sql`cast(${Permissions.userId} as text) = ${userId}`);

  const permissionsBits = new Array(
    Object.keys(PERMISSIONS.PERMISSIONS).length,
  ).fill(false) as boolean[];

  permRows.forEach((v) => {
    for (let i = 0; i < v.permissions.length; i++) {
      if (v.permissions.at(i) == "1") permissionsBits[i] = true;
    }
  });

  const permissionsMap = Object.keys(PERMISSIONS.PERMISSIONS).reduce(
    (accumulator, key) => {
      const index = PERMISSIONS.PERMISSIONS[key];
      if (index === undefined) return accumulator;
      accumulator[key] = permissionsBits[index] ?? false;

      return accumulator;
    },
    {} as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
  );

  return permissionsMap;
}
