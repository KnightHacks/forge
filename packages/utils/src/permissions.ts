import { TRPCError } from "@trpc/server";

import { PERMISSIONS } from "@forge/consts";

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
