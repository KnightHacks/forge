import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { SearchParams } from "~/lib/search-params";
import { GuestNameGate } from "~/app/_components/judging/guest-name-gate";
import { JudgeProjectWorkspace } from "~/app/_components/projects/judge-project-workspace";
import {
  parseProjectDirectoryParams,
  parseUuidParam,
} from "~/app/_components/projects/params";
import { first } from "~/lib/search-params";
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
  const params = await searchParams;
  const parsed = parseProjectDirectoryParams(params);
  const requestedHackathon = parseUuidParam(first(params.hackathon));
  const judgingContext = await api.judging.getContext({
    hackathonId: requestedHackathon,
  });
  if (judgingContext.kind === "none") redirect("/");
  if (judgingContext.kind === "incomplete-guest") {
    return <GuestNameGate />;
  }
  const isGuest = judgingContext.kind === "guest";
  const isOfficer =
    judgingContext.kind === "member" && judgingContext.isOfficer;
  const input = {
    challengeIds: isGuest ? [judgingContext.challengeId] : parsed.challengeIds,
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
      judgingContext={judgingContext}
    />
  );
}
