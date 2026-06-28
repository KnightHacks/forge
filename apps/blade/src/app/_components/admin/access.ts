import type { RouterOutputs } from "@forge/api";

type EffectivePermissions = RouterOutputs["roles"]["getPermissions"];

export function canAccessMemberAdmin(permissions: EffectivePermissions) {
  return (
    permissions.IS_OFFICER ||
    permissions.READ_MEMBERS ||
    permissions.EDIT_MEMBERS
  );
}
