import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { JudgingControlPanel } from "~/app/_components/judging/judging-control-panel";
import { canAccessProjectAdmin } from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Provision judging rooms and manage guest access.",
  title: "Blade | Judging Rooms",
};

export default async function JudgingAdminPage({
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
  const requested = first(params.hackathon);
  const selected =
    hackathons.find((hackathon) => hackathon.id === requested) ?? hackathons[0];
  if (!selected) redirect("/admin/projects");
  const data = await api.judging.listAdmin({ hackathonId: selected.id });
  return <JudgingControlPanel hackathons={hackathons} initialData={data} />;
}
