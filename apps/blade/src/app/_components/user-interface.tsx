import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/server";
import HackathonDashboard from "~/app/_components/dashboard/hackathon-dashboard/hackathon-dashboard";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import MemberDashboard from "~/app/_components/dashboard/member-dashboard/member-dashboard";
import { HackerAppCard, MemberAppCard } from "~/app/_components/option-cards";

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
      <Tabs defaultValue="Hacker" className="max-w-8xl relative w-full">
        <div className="flex justify-center pb-8">
          <div className="w-full max-w-4xl">
            <h1 className="mb-4 text-center text-2xl font-bold sm:text-3xl">
              Select Your Dashboard
            </h1>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="Member"
                className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {!member.value ? (
                  "Become a Member"
                ) : (
                  <>
                    <span className="sm:hidden">Member</span>
                    <span className="hidden sm:inline">Member</span>
                  </>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="Hacker"
                className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <span className="sm:hidden">
                  {currentHackathon ? currentHackathon.displayName : "Hacker"}
                </span>
                <span className="hidden sm:inline">
                  {currentHackathon
                    ? `${currentHackathon.displayName}`
                    : "Hacker Dashboard"}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="Member" className="mt-4 w-full">
          <div className="mx-auto w-[95%] max-w-[70rem]">
            <MemberDashboard member={member.value} />
          </div>
        </TabsContent>
        <TabsContent value="Hacker" className="mt-4 w-full">
          <div className="mx-auto w-[95%] max-w-[70rem]">
            {(hacker.value?.status as string) === "checkedin" ? (
              <HackathonDashboard hacker={hacker.value} />
            ) : (
              <HackerDashboard hacker={hacker.value} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
