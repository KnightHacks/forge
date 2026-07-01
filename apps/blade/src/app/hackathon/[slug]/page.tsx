import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackathon Dashboard",
  description: "The official hackathon dashboard.",
};

export default async function HackathonSlugPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hackathon = await api.hackathon.getHackathon({
    hackathonName: slug,
  });

  if (!hackathon) {
    notFound();
  }

  const hacker = await api.hackerQuery.getHacker({
    hackathonName: hackathon.name,
  });

  return (
    <HydrateClient>
      <main className="container min-h-screen py-16">
        <div className="flex justify-center">
          <div className="max-w-8xl w-full">
            {hacker?.status === "checkedin" ? (
              <BaseHackathonDashboard hackathon={hackathon} hacker={hacker} />
            ) : (
              <HackerDashboard hackathon={hackathon} hacker={hacker} />
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
