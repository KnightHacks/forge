import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { SearchParams } from "~/lib/search-params";
import { AnalyticsDashboard } from "~/app/_components/admin/analytics/analytics-dashboard";
import { parseAnalyticsSearchParams } from "~/app/_components/admin/analytics/params";
import {
  canAccessAnalytics,
  canAccessEventAdmin,
  canAccessMemberAdmin,
} from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Review Knight Hacks turnout, dues, feedback, and member data.",
  title: "Blade | Club Analytics",
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
  const input = parseAnalyticsSearchParams(await searchParams);
  const [report, discordReport] = await Promise.all([
    api.analytics.getReport(input),
    api.analytics.getDiscordReport(input),
  ]);
  return (
    <HydrateClient>
      <AnalyticsDashboard
        access={{
          canEditMembers:
            permissions.IS_OFFICER === true ||
            permissions.EDIT_MEMBERS === true,
          canOpenEvents: canAccessEventAdmin(permissions),
          canOpenMembers: canAccessMemberAdmin(permissions),
        }}
        discordReport={discordReport}
        input={input}
        report={report}
      />
    </HydrateClient>
  );
}
