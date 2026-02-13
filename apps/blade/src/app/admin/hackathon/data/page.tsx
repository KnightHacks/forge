import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import HackerEventDemographics from "~/app/_components/admin/club/data/HackerEventDemographics";
import HackathonDataContent from "~/app/_components/admin/hackathon/data/HackathonDataContent";

export const metadata: Metadata = {
  title: "Blade | Hackathon Data",
  description: "View hackathon demographics.",
};

export default async function HackathonData() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["READ_HACK_DATA"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container mt-6">
        <Tabs defaultValue="hackers">
          <TabsList>
            <TabsTrigger value="hackers">Hacker data</TabsTrigger>
            <TabsTrigger value="events">Event data</TabsTrigger>
          </TabsList>
          <TabsContent value="hackers">
            <HackathonDataContent />
          </TabsContent>
          <TabsContent value="events">
            <HackerEventDemographics />
          </TabsContent>
        </Tabs>
      </main>
    </HydrateClient>
  );
}
