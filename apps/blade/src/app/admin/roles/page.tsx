import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { parseRoleManagementSearchParams } from "~/app/_components/admin/roles/params";
import { RoleManagementDashboard } from "~/app/_components/admin/roles/role-management-dashboard";
import { canAccessRoleAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Role Management",
  description: "Manage Blade roles and their Discord connections.",
};

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const effectivePermissions = await api.roles.getPermissions();
  if (!canAccessRoleAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }

  const canConfigure =
    effectivePermissions.IS_OFFICER === true ||
    effectivePermissions.CONFIGURE_ROLES === true;
  const canAssign =
    effectivePermissions.IS_OFFICER === true ||
    effectivePermissions.ASSIGN_ROLES === true;
  const parsed = parseRoleManagementSearchParams(await searchParams);
  const input = {
    ...parsed,
    role: canConfigure ? parsed.role : undefined,
    view:
      parsed.view === "assignments" && canAssign
        ? ("assignments" as const)
        : canConfigure
          ? ("roles" as const)
          : ("assignments" as const),
  };

  const [roles, users, detail] = await Promise.all([
    api.roles.listLinks(),
    input.view === "assignments"
      ? api.roles.listUsers(input)
      : Promise.resolve(null),
    input.role && canConfigure
      ? api.roles.getRole({ roleId: input.role }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <HydrateClient>
      <RoleManagementDashboard
        key={JSON.stringify(input)}
        access={{
          canAssign,
          canConfigure,
          isOfficer: effectivePermissions.IS_OFFICER === true,
        }}
        detail={detail}
        input={input}
        roles={roles}
        users={users}
      />
    </HydrateClient>
  );
}
