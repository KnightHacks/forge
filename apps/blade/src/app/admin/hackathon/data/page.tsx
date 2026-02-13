import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import HackerEventDemographics from "../../club/data/_components/HackerEventDemographics";
import HackathonDataContent from "./_components/HackathonDataContent";

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
