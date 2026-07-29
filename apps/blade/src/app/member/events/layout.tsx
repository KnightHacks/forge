import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { getAdminNavigationAccess } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MemberEventsLayout({
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
      sectionLabel="Member events"
      session={session}
    >
      {children}
    </AuthenticatedShell>
  );
}
