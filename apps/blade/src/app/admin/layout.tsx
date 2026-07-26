import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import {
  canAccessAlumniAdmin,
  canAccessAnalytics,
  canAccessEventAdmin,
  canAccessEventCheckIn,
  canAccessFormAdmin,
  canAccessIssues,
  canAccessMemberAdmin,
  canAccessRoleAdmin,
  getAdminNavigationAccess,
} from "~/app/_components/admin/access";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const effectivePermissions = await api.roles.getPermissions();
  if (
    !canAccessAnalytics(effectivePermissions) &&
    !canAccessAlumniAdmin(effectivePermissions) &&
    !canAccessEventAdmin(effectivePermissions) &&
    !canAccessEventCheckIn(effectivePermissions) &&
    !canAccessFormAdmin(effectivePermissions) &&
    !canAccessIssues(effectivePermissions) &&
    !canAccessMemberAdmin(effectivePermissions) &&
    !canAccessRoleAdmin(effectivePermissions)
  ) {
    redirect(MEMBER_DASHBOARD_PATH);
  }

  return (
    <AuthenticatedShell
      adminNavigation={getAdminNavigationAccess(effectivePermissions)}
      sectionLabel="Administration"
      session={session}
    >
      {children}
    </AuthenticatedShell>
  );
}
