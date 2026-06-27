import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { DashboardEntryDialogs } from "~/app/_components/dashboard/dashboard-entry-dialogs";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { UserInterface } from "~/app/_components/user-interface";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Dashboard",
  description: "Manage your Knight Hacks account.",
};

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const [isDiscordMember, member, currentHackathon] = await Promise.all([
    api.auth.getDiscordMemberStatus(),
    api.member.getMember(),
    api.hackathon.getCurrentHackathon(),
  ]);
  const hacker = currentHackathon
    ? await api.hackerQuery.getHacker({
        hackathonName: currentHackathon.name,
      })
    : null;
  const now = new Date();

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="container h-screen py-16">
        <DashboardEntryDialogs
          currentHackathon={
            currentHackathon
              ? {
                  applicationsOpen: currentHackathon.applicationDeadline >= now,
                  displayName: currentHackathon.displayName,
                  isLive: currentHackathon.startDate <= now,
                  name: currentHackathon.name,
                }
              : null
          }
          hasHacker={hacker != null}
          hasMember={member != null}
          showDiscordPrompt={!isDiscordMember}
        />
        <UserInterface member={member} />
      </main>
    </HydrateClient>
  );
}
