import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/server";
import HackerDashboard from "../dashboard/_components/hacker-dashboard/hacker-dashboard";
import MemberDashboard from "../dashboard/_components/member-dashboard/member-dashboard";
import { HackerAppCard, MemberAppCard } from "./option-cards";

export async function UserInterface() {
  const [member, hacker] = await Promise.allSettled([
    api.member.getMember(),
    api.hacker.getHacker({}),
  ]);

  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (member.status === "rejected" || hacker.status === "rejected") {
    return (
      <div className="mt-10 flex flex-col items-center justify-center gap-y-6 font-bold">
        Something went wrong. Please try again later.
      </div>
    );
  }

  if (!member.value && !hacker.value) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 font-bold">
        <p className="w-full max-w-xl text-center">
          You have not applied to be a Knight Hacks member or hacker for an
          upcoming Hackathon yet. Please fill out an application below to get
          started!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <MemberAppCard />
          {currentHackathon && (
            <HackerAppCard hackathonName={currentHackathon.name} />
          )}
        </div>
      </div>
    );
  }

  if (member.value && !currentHackathon) {
    return (
      <div className="flex justify-center">
        <div className="max-w-8xl w-full">
          <MemberDashboard member={member.value} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Tabs
        defaultValue={!member.value ? "Hacker" : "Member"}
        className="max-w-8xl relative w-full"
      >
        <div className="flex justify-center pb-8">
          <TabsList className="grid w-full max-w-4xl grid-cols-2">
            <TabsTrigger
              value="Member"
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              {`${!member.value ? "Become a " : ""}Member`}
            </TabsTrigger>
            <TabsTrigger
              value="Hacker"
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              {currentHackathon ? currentHackathon.displayName : "Hacker"}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="Member" className="mt-4 w-full">
          <MemberDashboard member={member.value} />
        </TabsContent>
        <TabsContent value="Hacker" className="mt-4 w-full">
          <HackerDashboard hacker={hacker.value} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
