import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { HackathonProvider } from "~/app/_components/dashboard/hackathon-dashboard/components";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { api, HydrateClient } from "~/trpc/server";
import { BKHackathonDashboard } from "./components/bk-hackathon-dashboard";

export const metadata: Metadata = {
  title: "Blade | BloomKnights Dashboard",
  description: "The official BloomKnights hackathon dashboard.",
};

export default async function BloomKnightsHackathonPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hackathon = await api.hackathon.getCurrentHackathonByName({
    hackathonName: "bloomknights",
  });

  const hacker = hackathon
    ? await api.hackerQuery.getHacker({
        hackathonName: hackathon.name,
      })
    : null;

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="container min-h-screen py-16">
        <HackathonProvider hackathon={hackathon}>
          {hackathon ? (
            <div className="flex justify-center">
              <div className="max-w-8xl w-full">
                {hacker && (hacker.status as string) === "checkedin" ? (
                  <BKHackathonDashboard hacker={hacker} />
                ) : (
                  <HackerDashboard hacker={hacker} />
                )}
              </div>
            </div>
          ) : null}
        </HackathonProvider>
      </main>
    </HydrateClient>
  );
}
