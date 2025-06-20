import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
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
    api.hacker.getHackathons(),
  ]);

  return (
    <>
      <div className="animate-mobile-initial-expand relative mx-auto flex h-0 w-[90%] max-w-[70rem] bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:py-0 sm:pb-0 lg:max-h-56">
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
      <div className="mx-auto mb-10 mt-20 flex w-[90%] max-w-[70rem] flex-col justify-center gap-x-2 gap-y-4 sm:flex-row">
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
