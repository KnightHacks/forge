import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { ProjectCommandCenter } from "~/app/_components/judging/project-command-center";
import { parseProjectDirectoryParams } from "~/app/_components/projects/params";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { canAccessProjectAdmin } from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Configure projects, scoring, and judging rooms.",
  title: "Blade | Project Command Center",
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
  if (!selected) {
    return (
      <main className={adminPageLayoutClassName}>
        <AdminPageHeader
          description="Create a hackathon before configuring projects, scoring, and judging rooms."
          eyebrow="Officer tools"
          icon={ClipboardList}
          title="Project command center"
        />
        <section className="rounded-lg border border-dashed border-white/15 bg-card/75 px-5 py-16 text-center">
          <h2 className="text-xl font-semibold">No hackathons available</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Once a hackathon exists, its project inventory and judging setup
            will appear here.
          </p>
        </section>
      </main>
    );
  }
  const projectInput = {
    ...parseProjectDirectoryParams(params),
    hackathonId: selected.id,
  };
  const [controlData, projectData, evaluations] = await Promise.all([
    api.judging.listAdmin({ hackathonId: selected.id }),
    api.projects.listAdmin(projectInput),
    api.judging.listEvaluationAudit({ hackathonId: selected.id }),
  ]);
  const requestedTab = first(params.tab);
  const selectedTab =
    requestedTab === "evaluations" ||
    requestedTab === "projects" ||
    requestedTab === "rooms"
      ? requestedTab
      : "setup";
  return (
    <ProjectCommandCenter
      controlData={controlData}
      evaluations={evaluations}
      hackathons={hackathons}
      projectData={projectData}
      projectInput={projectInput}
      selectedTab={selectedTab}
    />
  );
}
