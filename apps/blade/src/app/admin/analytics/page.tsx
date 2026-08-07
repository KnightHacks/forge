import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { AnalyticsDashboard } from "~/app/_components/admin/analytics/analytics-dashboard";
import { HackathonAnalyticsDashboard } from "~/app/_components/admin/analytics/hackathon-analytics-dashboard";
import { parseHackathonAnalyticsSearchParams } from "~/app/_components/admin/analytics/hackathon-params";
import { parseAnalyticsSearchParams } from "~/app/_components/admin/analytics/params";
import { TeamPerformanceAnalyticsDashboard } from "~/app/_components/admin/analytics/team-performance-analytics-dashboard";
import { parseTeamPerformanceSearchParams } from "~/app/_components/admin/analytics/team-performance-params";
import {
  canAccessAnalytics,
  canAccessClubAnalytics,
  canAccessEventAdmin,
  canAccessHackathonAnalytics,
  canAccessIdentifiedHackathonAnalytics,
  canAccessMemberAdmin,
} from "~/lib/admin-access";
import { first } from "~/lib/search-params";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review Knight Hacks club and hackathon intelligence.",
  title: "Blade | Analytics",
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessAnalytics(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  const params = await searchParams;
  const canAccessClub = canAccessClubAnalytics(permissions);
  const canAccessHackathon = canAccessHackathonAnalytics(permissions);
  const requestedScope = first(params.scope);
  const scope =
    requestedScope === "hackathon" && canAccessHackathon
      ? "hackathon"
      : requestedScope === "team" && canAccessClub
        ? "team"
        : requestedScope === "club" && canAccessClub
          ? "club"
          : canAccessClub
            ? "club"
            : "hackathon";

  if (scope === "team") {
    const options = await api.analytics.listTeamPerformanceOptions();
    const defaultTeamSlug = options.defaultTeamSlug;
    if (!defaultTeamSlug) {
      return (
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <h1 className="text-2xl font-semibold">Team performance</h1>
          <p className="mt-2 text-muted-foreground">
            No Club teams are configured yet.
          </p>
        </main>
      );
    }
    const { input, rankBy } = parseTeamPerformanceSearchParams(
      params,
      defaultTeamSlug,
    );
    const selectedInput = options.options.some(
      (option) => option.id === input.teamSlug,
    )
      ? input
      : { ...input, teamSlug: defaultTeamSlug };
    const report = await api.analytics.getTeamPerformanceReport(selectedInput);
    if (!report) redirect("/admin/analytics?scope=team");
    return (
      <TeamPerformanceAnalyticsDashboard
        access={{
          canEditMembers:
            permissions.IS_OFFICER === true ||
            permissions.EDIT_MEMBERS === true,
          canOpenMembers: canAccessMemberAdmin(permissions),
        }}
        canAccessHackathon={canAccessHackathon}
        input={selectedInput}
        options={options}
        rankBy={rankBy}
        report={report}
      />
    );
  }

  if (scope === "hackathon") {
    const optionsResult = await api.analytics.listHackathonOptions();
    const requestedHackathonId = first(params.hackathon);
    const selectedHackathonId =
      requestedHackathonId &&
      optionsResult.options.some((option) => option.id === requestedHackathonId)
        ? requestedHackathonId
        : optionsResult.defaultHackathonId;
    if (!selectedHackathonId) {
      return (
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <h1 className="text-2xl font-semibold">Hackathon Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            No hackathons are configured yet.
          </p>
        </main>
      );
    }
    const input = parseHackathonAnalyticsSearchParams(
      params,
      selectedHackathonId,
      optionsResult.comparisonByHackathonId[selectedHackathonId] ?? null,
    );
    const [report, identifiedRows] = await Promise.all([
      api.analytics.getHackathonReport(input),
      canAccessIdentifiedHackathonAnalytics(permissions)
        ? api.analytics.getHackathonIdentifiedRows(input)
        : Promise.resolve(null),
    ]);
    return (
      <HackathonAnalyticsDashboard
        canAccessClub={canAccessClub}
        canPrepareResumes={permissions.IS_OFFICER === true}
        identifiedRows={identifiedRows}
        input={input}
        key={JSON.stringify(input)}
        comparisonByHackathonId={optionsResult.comparisonByHackathonId}
        options={optionsResult.options}
        report={report}
      />
    );
  }

  const input = parseAnalyticsSearchParams(params);
  const [report, discordReport] = await Promise.all([
    api.analytics.getReport(input),
    api.analytics.getDiscordReport(input),
  ]);
  return (
    <AnalyticsDashboard
      access={{
        canEditMembers:
          permissions.IS_OFFICER === true || permissions.EDIT_MEMBERS === true,
        canOpenEvents: canAccessEventAdmin(permissions),
        canOpenMembers: canAccessMemberAdmin(permissions),
        canPrepareResumes: permissions.IS_OFFICER === true,
      }}
      canAccessHackathon={canAccessHackathon}
      discordReport={discordReport}
      input={input}
      report={report}
    />
  );
}
