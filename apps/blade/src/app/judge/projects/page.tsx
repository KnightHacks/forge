import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { SearchParams } from "~/lib/search-params";
import { GuestNameGate } from "~/app/_components/judging/guest-name-gate";
import { JudgingLiveUpdates } from "~/app/_components/judging/judging-live-updates";
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
  const judgingContext = await api.judging.getContext({});
  if (judgingContext.kind === "none") redirect("/");
  if (judgingContext.kind === "incomplete-guest") {
    return <GuestNameGate />;
  }
  const isOfficer =
    judgingContext.kind === "member" && judgingContext.isOfficer;
  const isMember = judgingContext.kind === "member";
  const input = {
    challengeIds: parsed.challengeIds,
    direction: parsed.direction,
    hackathonId: isMember ? requestedHackathon : undefined,
    includeJudged: parsed.includeJudged,
    showInRoomOnly: parsed.showInRoomOnly,
    page: parsed.page,
    pageSize: parsed.pageSize,
    query: parsed.query,
    sort: first(params.sort) ? parsed.sort : "scheduledAt",
  };
  const [data, hackathons] = await Promise.all([
    api.projects.listJudge(input),
    isMember ? api.projects.listJudgeHackathons() : Promise.resolve([]),
  ]);
  if (isMember) input.hackathonId = data.hackathon?.id;
  const challengeId = data.selectedChallengeId ?? undefined;
  const tabParam = first(params.tab);
  const tab =
    tabParam === "submissions" || tabParam === "deliberation"
      ? tabParam
      : "projects";
  const workspaceInput = {
    challengeId,
    hackathonId: input.hackathonId,
  };
  const workspace =
    data.hackathon && challengeId
      ? await api.judging.getWorkspace(workspaceInput)
      : null;
  const [scores, submissions, deliberation] = workspace
    ? await Promise.all([
        api.judging.getProjectScores({
          ...workspaceInput,
          projectIds: data.projects.map((project) => project.id),
        }),
        api.judging.listMySubmissions(workspaceInput),
        api.judging.listMyDeliberation(workspaceInput),
      ])
    : [[], [], []];

  return (
    <>
      {data.hackathon ? (
        <JudgingLiveUpdates hackathonId={data.hackathon.id} />
      ) : null}
      <JudgeProjectWorkspace
        data={data}
        deliberation={deliberation}
        hackathons={hackathons}
        input={input}
        isOfficer={isOfficer}
        judgingContext={judgingContext}
        readOnly={
          isMember && data.hackathon?.id !== judgingContext.hackathon?.id
        }
        scores={scores}
        selectedTab={tab}
        submissions={submissions}
        workspace={workspace}
      />
    </>
  );
}
