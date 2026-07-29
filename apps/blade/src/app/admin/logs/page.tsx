import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { AdminLogsDashboard } from "~/app/_components/admin/logs/admin-logs-dashboard";
import { canAccessAdminLogs } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review the record of privileged admin actions.",
  title: "Blade | Admin Action Logs",
};

export default async function AdminLogsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessAdminLogs(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const [events, members] = await Promise.all([
    api.audit.list({ limit: 50 }),
    api.audit.searchMembers({ limit: 20, search: "" }),
  ]);

  return <AdminLogsDashboard events={events} members={members} />;
}
