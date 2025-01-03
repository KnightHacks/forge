import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/server";
import MemberDashboard from "./member-dashboard/member-dashboard";
import { HackerAppCard, MemberAppCard } from "./option-cards";

export async function UserInterface() {
  const member = await api.member.getMember();

  // This is temporary in-place until hackathon dashboard is made
  if (!member) {
    return (
      <div className="flex items-center justify-center">
        <div className="mx-auto grid max-w-4xl gap-6 p-4 md:grid-cols-2">
          <MemberAppCard />
          <HackerAppCard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Tabs defaultValue="Member" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="Member"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Member
          </TabsTrigger>
          <TabsTrigger
            value="Hacker"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
            disabled
          >
            Hacker (soon)
          </TabsTrigger>
        </TabsList>
        <TabsContent className="absolute left-0 w-full" value="Member">
          <MemberDashboard member={member} />
        </TabsContent>
        <TabsContent value="Hacker"></TabsContent>
      </Tabs>
    </div>
  );
}
