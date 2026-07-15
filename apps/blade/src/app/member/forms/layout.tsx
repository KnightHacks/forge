import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAdminNavigationAccess } from "~/app/_components/admin/access";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MemberFormsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();

  return (
    <AuthenticatedShell
      adminNavigation={getAdminNavigationAccess(permissions)}
      sectionLabel="Previous forms"
      session={session}
    >
      {children}
    </AuthenticatedShell>
  );
}
