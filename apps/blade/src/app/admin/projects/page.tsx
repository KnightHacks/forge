import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { AdminProjectWorkspace } from "~/app/_components/projects/admin-project-workspace";
import { parseProjectDirectoryParams } from "~/app/_components/projects/params";
import { canAccessProjectAdmin } from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Import and manage hackathon projects.",
  title: "Blade | Project Import",
};

function selectHackathon(
  hackathons: Awaited<ReturnType<typeof api.projects.listAdminHackathons>>,
  requestedHackathon: string | undefined,
) {
  const now = Date.now();
  const active = hackathons.find(
    (hackathon) =>
      hackathon.startDate.getTime() <= now &&
      hackathon.endDate.getTime() >= now,
  );
  const upcoming = [...hackathons]
    .filter((hackathon) => hackathon.startDate.getTime() >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  return (
    hackathons.find((hackathon) => hackathon.id === requestedHackathon) ??
    active ??
    upcoming ??
    hackathons[0]
  );
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessProjectAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const [params, hackathons] = await Promise.all([
    searchParams,
    api.projects.listAdminHackathons(),
  ]);
  const requestedHackathon = first(params.hackathon);
  const selected = selectHackathon(hackathons, requestedHackathon);

  if (!selected) {
    return <AdminProjectWorkspace data={null} hackathons={[]} input={null} />;
  }

  const input = {
    ...parseProjectDirectoryParams(params),
    hackathonId: selected.id,
  };
  const data = await api.projects.listAdmin(input);
  return (
    <AdminProjectWorkspace data={data} hackathons={hackathons} input={input} />
  );
}
