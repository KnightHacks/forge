import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { canAccessIssues } from "~/app/_components/admin/access";
import { IssueDetail } from "~/app/_components/admin/issues/issue-detail";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = { title: "Blade | Issue" };

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessIssues(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  const { id } = await params;
  const [detail, history, teams, events] = await Promise.all([
    api.issues.get({ id }).catch(() => null),
    api.issues.listHistory({ id, limit: 25 }).catch(() => null),
    api.issues.listTeams(),
    api.issues.listEvents(),
  ]);
  if (!detail || !history) notFound();
  return (
    <HydrateClient>
      <IssueDetail
        detail={detail}
        events={events}
        history={history}
        teams={teams}
      />
    </HydrateClient>
  );
}
