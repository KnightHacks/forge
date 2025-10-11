import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { HackerAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";
import { HackerData } from "./hacker-data";
import { HackerResumeButton } from "./hacker-resume-button";
import { PastHackathonButton } from "./past-hackathons";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

export default async function HackerDashboard({
  hacker,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  const [resume, pastHackathons] = await Promise.allSettled([
    api.resume.getResume(),
    api.hackathon.getPastHackathons(),
  ]);

  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (!hacker) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <p className="w-full max-w-xl text-center text-2xl">
          Register for Knight Hacks today!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          {
            //if there is no current hackathon then this page is never rendered anyway
            currentHackathon && (
              <HackerAppCard hackathonName={currentHackathon.name} />
            )
          }
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in mb-8">
        <h2 className="text-xl font-bold tracking-tight">
          Hello, {hacker.firstName}!
        </h2>
        <p className="text-muted-foreground">Hackathon Dashboard</p>
      </div>
      <div className="animate-mobile-initial-expand relative mx-auto flex h-0 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:py-0 sm:pb-0 lg:max-h-56">
        {/* Main content */}
        <HackerData data={hacker} />

        {/* Transparent Triangle overlay in bottom right corner */}
        <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent"></div>

        {/* Triangle in bottom right corner */}
        <div
          className="absolute bottom-0 right-0 h-0 w-0"
          style={{
            borderBottom: "20px solid #6C26D9", // Change to bg color
            borderLeft: "20px solid transparent",
          }}
        ></div>

        {/* Top rectangle */}
        <div className="absolute -top-[1.4rem] right-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-96">
          <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
        </div>

        {/* Bottom rectangle */}
        <div className="absolute -bottom-[1.46rem] left-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-48">
          <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
        </div>

        {/* Left side rectangle */}
        <div className="absolute -left-3 top-0 h-full w-[0.4rem] bg-primary"></div>
      </div>
      <div className="mx-auto mb-10 mt-20 flex flex-col justify-center gap-x-2 gap-y-4 sm:flex-row">
        {resume.status === "rejected" ||
        pastHackathons.status === "rejected" ? (
          <div className="font-bold">
            Something went wrong. Please try again later.
          </div>
        ) : (
          <>
            <PastHackathonButton hackathons={pastHackathons.value} />
            <HackerResumeButton resume={resume.value} />
          </>
        )}
      </div>
    </>
  );
}
