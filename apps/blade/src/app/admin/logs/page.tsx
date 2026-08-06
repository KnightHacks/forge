import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import {
  auditIdentityParams,
  mergeAuditOptions,
} from "~/app/_components/admin/logs/admin-log-options";
import { AdminLogsDashboard } from "~/app/_components/admin/logs/admin-logs-dashboard";
import { canAccessAdminLogs } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review the record of privileged admin actions.",
  title: "Blade | Admin Action Logs",
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessAdminLogs(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const identities = auditIdentityParams(await searchParams);
  const [
    events,
    hackers,
    members,
    selectedHacker,
    selectedMember,
    selectedActor,
  ] = await Promise.all([
    api.audit.list({ limit: 50 }),
    api.audit.searchHackers({ limit: 20, search: "" }),
    api.audit.searchMembers({ limit: 20, search: "" }),
    identities.hackerAttendeeId
      ? api.audit.searchHackers({
          limit: 1,
          search: identities.hackerAttendeeId,
        })
      : Promise.resolve([]),
    identities.memberId
      ? api.audit.searchMembers({ limit: 1, search: identities.memberId })
      : Promise.resolve([]),
    identities.actorUserId
      ? api.audit.searchMembers({
          limit: 1,
          search: identities.actorUserId,
        })
      : Promise.resolve([]),
  ]);

  const seededHackers = mergeAuditOptions(
    hackers,
    selectedHacker,
    (hacker) => hacker.attendeeId,
  );
  const seededMembers = mergeAuditOptions(
    members,
    [...selectedMember, ...selectedActor],
    (member) => member.id,
  );

  return (
    <AdminLogsDashboard
      events={events}
      hackers={seededHackers}
      members={seededMembers}
    />
  );
}
