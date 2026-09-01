import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import {
  canAccessAlumniAdmin,
  canAccessAnalytics,
  canAccessCompanyAdmin,
  canAccessDiscordArchive,
  canAccessEmailPortal,
  canAccessEventAdmin,
  canAccessEventCheckIn,
  canAccessFormAdmin,
  canAccessHackathonAdmin,
  canAccessHackathonCheckIn,
  canAccessHackathonEvents,
  canAccessIssues,
  canAccessMemberAdmin,
  canAccessProjectAdmin,
  canAccessRoleAdmin,
  getAdminNavigationAccess,
} from "~/lib/admin-access";
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
    !canAccessCompanyAdmin(effectivePermissions) &&
    !canAccessDiscordArchive(effectivePermissions) &&
    !canAccessAlumniAdmin(effectivePermissions) &&
    !canAccessEventAdmin(effectivePermissions) &&
    !canAccessEmailPortal(effectivePermissions) &&
    !canAccessEventCheckIn(effectivePermissions) &&
    !canAccessFormAdmin(effectivePermissions) &&
    !canAccessHackathonAdmin(effectivePermissions) &&
    !canAccessHackathonCheckIn(effectivePermissions) &&
    !canAccessHackathonEvents(effectivePermissions) &&
    !canAccessIssues(effectivePermissions) &&
    !canAccessMemberAdmin(effectivePermissions) &&
    !canAccessProjectAdmin(effectivePermissions) &&
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
