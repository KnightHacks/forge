import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import EventDemographics from "./_components/EventDemographics";
import MemberDemographics from "./_components/MemberDemographics";

export const metadata: Metadata = {
  title: "Blade | Data",
  description: "View member and event demographics.",
};

export default async function Data() {
  // authentication
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="hborder-2 hborder-yellow-500 container mt-6">
        <Tabs defaultValue="members" className="hborder-2 hborder-red-400">
          <TabsList>
            <TabsTrigger value="members">Member data</TabsTrigger>
            <TabsTrigger value="events">Event data</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <MemberDemographics />
          </TabsContent>
          <TabsContent value="events">
            <EventDemographics />
          </TabsContent>
        </Tabs>
      </main>
    </HydrateClient>
  );
}
