import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import {
  canAccessJudgeProjects,
  getAdminNavigationAccess,
} from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function JudgeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessJudgeProjects(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  return (
    <AuthenticatedShell
      adminNavigation={getAdminNavigationAccess(permissions)}
      sectionLabel="Project directory"
      session={session}
    >
      {children}
    </AuthenticatedShell>
  );
}
