import { ShieldX } from "lucide-react";

import { PERMISSIONS } from "@forge/consts";

export function BadPerms({ perms }: { perms: PERMISSIONS.PermissionKey[] }) {
  const permNames: string[] = [];
  perms.forEach((v) => {
    const permissionData = PERMISSIONS.PERMISSION_DATA[v];
    if (permissionData) permNames.push(permissionData.name);
  });

  return (
    <div className="mx-auto flex max-w-fit flex-col gap-2 rounded-lg border border-red-700 bg-red-700/10 p-8 text-center">
      <div className="mx-auto flex size-12 rounded-full bg-red-700 shadow-sm">
        <ShieldX className="mx-auto my-auto" />
      </div>
      <h2 className="text-xl font-bold sm:text-2xl">Access Denied</h2>
      <div className="text-sm">
        This action requires the following permissions:
      </div>
      <div className="font-semibold">{permNames.join(", ")}</div>
    </div>
  );
}
