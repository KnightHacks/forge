import type { Metadata } from "next";

import type { api as serverCall } from "~/trpc/server";
import { HackerAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";
import HackingCountdown from "./countdown";
import UpcomingEvents from "./event/upcoming-events";
import { HackathonData } from "./hackathon-data";
import { MobileHackathonData } from "./mobile-hackathon-data";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

export default async function HackathonDashboard({
  hacker,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (!hacker) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <p className="w-full max-w-xl text-center text-2xl">
          Register for KnightHacks today!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          {currentHackathon && (
            <HackerAppCard hackathonName={currentHackathon.name} />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in mb-4 px-4 sm:mb-8 sm:px-0">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          Hello, {hacker.firstName}!
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Hackathon Dashboard
        </p>
      </div>
      <div className="animate-mobile-initial-expand mx-auto flex min-h-[1000px] bg-[#E5E7EB] px-2 py-4 dark:bg-[#0A0F1D] sm:relative sm:px-0 sm:py-6 lg:min-h-[380px]">
        {/* Main content */}
        <HackathonData data={hacker} />

        {/* Transparent Triangle overlay in bottom right corner - hidden on mobile */}
        <div className="border-b-solid border-l-solid absolute bottom-0 right-0 hidden h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent sm:block"></div>

        {/* Triangle in bottom right corner - hidden on mobile */}
        <div
          className="absolute bottom-0 right-0 hidden h-0 w-0 sm:block"
          style={{
            borderBottom: "20px solid #6C26D9",
            borderLeft: "20px solid transparent",
          }}
        ></div>

        {/* Top rectangle - hidden on mobile */}
        <div className="absolute -top-[1.4rem] right-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-96">
          <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
        </div>

        {/* Bottom rectangle - hidden on mobile */}
        <div className="absolute -bottom-[1.46rem] left-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-48">
          <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
        </div>

        {/* Left side rectangle - hidden on mobile */}
        <div className="absolute -left-3 top-0 hidden h-full w-[0.4rem] bg-primary sm:block"></div>
      </div>

      <div className="animate-fade-in mb-8 mt-8 px-4 sm:mt-12 sm:px-0">
        <HackingCountdown />
      </div>

      <div>
        <UpcomingEvents />
      </div>
    </>
  );
}
