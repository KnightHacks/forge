import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { api, HydrateClient } from "~/trpc/server";
import { BloomKnightsDashboardShell } from "./components/bloomknights-dashboard-shell";

export const metadata: Metadata = {
  title: "Blade | BloomKnights Dashboard",
  description: "The official BloomKnights hackathon dashboard.",
};

const bloomKnightsDashboardFrameTheme: DashboardFrameTheme = {
  frameClassName:
    "border border-emerald-100/15 bg-emerald-950/80 shadow-2xl shadow-emerald-950/40 backdrop-blur-sm dark:bg-emerald-950/80",
  topTabClassName: "bg-emerald-950/80 dark:bg-emerald-950/80",
  bottomTabClassName: "bg-emerald-950/80 dark:bg-emerald-950/80",
  leftAccentClassName: "bg-[#F6B6D2]",
  cornerAccentColor: "#F6B6D2",
  hideFrameCutouts: true,
  actionButtonClassName:
    "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#F6B6D2]/70 hover:bg-[#F6B6D2]/10 hover:shadow-lg hover:shadow-[#F6B6D2]/15 active:translate-y-0 active:shadow-none motion-reduce:transform-none motion-reduce:transition-none",
  actionBloomClassName: "bk-bloom-cta-action",
  actionIconClassName: "group-hover:text-[#F6B6D2]",
  checkedInStatusClassName: "text-[#F6B6D2]",
  confirmedStatusClassName: "text-[#F6B6D2]",
  confirmedStatusIconColor: "#F6B6D2",
};

export default async function BloomKnightsHackathonPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hackathon = await api.hackathon.getHackathon({
    hackathonName: "bloomknights",
  });

  if (!hackathon) {
    notFound();
  }

  const hacker = await api.hackerQuery.getHacker({
    hackathonName: hackathon.name,
  });

  return (
    <HydrateClient>
      <SessionNavbar />
      <BloomKnightsDashboardShell>
        {hacker?.status === "checkedin" ? (
          <BaseHackathonDashboard
            dashboardFrameTheme={bloomKnightsDashboardFrameTheme}
            hackathon={hackathon}
            hacker={hacker}
          />
        ) : (
          <HackerDashboard
            dashboardFrameTheme={bloomKnightsDashboardFrameTheme}
            hackathon={hackathon}
            hacker={hacker}
          />
        )}
      </BloomKnightsDashboardShell>
    </HydrateClient>
  );
}
