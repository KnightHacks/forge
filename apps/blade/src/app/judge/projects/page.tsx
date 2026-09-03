import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { JudgeProjectWorkspace } from "~/app/_components/projects/judge-project-workspace";
import {
  parseProjectDirectoryParams,
  parseUuidParam,
} from "~/app/_components/projects/params";
import { canAccessJudgeProjects } from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review the projects submitted to Knight Hacks.",
  title: "Blade | Projects",
};

export default async function JudgeProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessJudgeProjects(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  const params = await searchParams;
  const parsed = parseProjectDirectoryParams(params);
  const isOfficer = permissions.IS_OFFICER === true;
  const requestedHackathon = parseUuidParam(first(params.hackathon));
  const input = {
    challengeIds: parsed.challengeIds,
    direction: parsed.direction,
    hackathonId: isOfficer ? requestedHackathon : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
    query: parsed.query,
    sort: parsed.sort,
  };
  const [data, hackathons] = await Promise.all([
    api.projects.listJudge(input),
    isOfficer ? api.projects.listAdminHackathons() : Promise.resolve([]),
  ]);

  return (
    <JudgeProjectWorkspace
      data={data}
      hackathons={hackathons}
      input={input}
      isOfficer={isOfficer}
    />
  );
}
