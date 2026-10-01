import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { TeamsWorkspace } from "~/app/_components/admin/teams/teams-workspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Blade | Teams" };
export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ hackathonId?: string }>;
}) {
  if (!(await auth())) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!permissions.READ_HACKERS && !permissions.EDIT_HACKERS)
    redirect(MEMBER_DASHBOARD_PATH);
  const hackathons = await api.hackerTeam.hackathons();
  const { hackathonId } = await searchParams;
  const selected =
    hackathons.find((h) => h.id === hackathonId)?.id ?? hackathons[0]?.id;
  return (
    <TeamsWorkspace
      key={selected}
      hackathons={hackathons}
      hackathonId={selected}
      canEdit={permissions.EDIT_HACKERS === true}
    />
  );
}
