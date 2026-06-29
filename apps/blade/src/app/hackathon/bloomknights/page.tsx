import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { api, HydrateClient } from "~/trpc/server";
import { BloomKnightsDashboardShell } from "./components/bloomknights-dashboard-shell";

export const metadata: Metadata = {
  title: "Blade | BloomKnights Dashboard",
  description: "The official BloomKnights hackathon dashboard.",
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
          <BaseHackathonDashboard hackathon={hackathon} hacker={hacker} />
        ) : (
          <HackerDashboard hackathon={hackathon} hacker={hacker} />
        )}
      </BloomKnightsDashboardShell>
    </HydrateClient>
  );
}
