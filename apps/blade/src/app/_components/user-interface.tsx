import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/server";
import HackerDashboard from "../dashboard/_components/hacker-dashboard/hacker-dashboard";
import MemberDashboard from "../dashboard/_components/member-dashboard/member-dashboard";
import { HackerAppCard, MemberAppCard } from "./option-cards";

export async function UserInterface() {
  const member = await api.member.getMember();
  const hacker = await api.hacker.getHacker();

  if (!member && !hacker) {
    return (
      <div className="flex flex-wrap justify-center gap-5">
        <MemberAppCard />
        <HackerAppCard />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Tabs
        defaultValue={member ? "Member" : hacker ? "Hacker" : ""}
        className="w-[400px]"
      >
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
          >
            Hacker (wip)
          </TabsTrigger>
        </TabsList>
        <TabsContent className="absolute left-0 w-full" value="Member">
          <MemberDashboard member={member} />
        </TabsContent>
        <TabsContent value="Hacker">
          <HackerDashboard hacker={hacker} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
