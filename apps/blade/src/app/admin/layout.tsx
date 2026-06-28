import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { canAccessMemberAdmin } from "~/app/_components/admin/access";
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
  if (!canAccessMemberAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }

  return (
    <AuthenticatedShell
      activeNavigation="members"
      canAccessAdmin
      sectionLabel="Member admin"
      session={session}
    >
      {children}
    </AuthenticatedShell>
  );
}
