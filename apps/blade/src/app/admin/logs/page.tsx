import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { AdminLogsDashboard } from "~/app/_components/admin/logs/admin-logs-dashboard";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review append-only privileged administration history.",
  title: "Blade | Admin Action Logs",
};

export default async function AdminLogsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) redirect(MEMBER_DASHBOARD_PATH);

  void api.audit.list.prefetch({ limit: 50 });
  void api.audit.searchMembers.prefetch({ limit: 20, search: "" });

  return (
    <HydrateClient>
      <AdminLogsDashboard />
    </HydrateClient>
  );
}
