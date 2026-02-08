import type { Metadata } from "next";

import { DISCORD } from "@forge/consts";

import type { api as serverCall } from "~/trpc/server";
import { HackerAppCard } from "~/app/_components/option-cards";
import { api } from "~/trpc/server";
import HackingCountdown from "./countdown";
import { HackathonData } from "./hackathon-data";
import { TeamPoints } from "./team-points";
import UpcomingEvents from "./upcoming-events";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

/**
 * Render the hackathon dashboard UI for a given hacker.
 *
 * Displays a registration prompt when no hacker is provided, a configuration error
 * if the hacker's class is missing or invalid, or the full dashboard with
 * class-specific styling and sections (profile data, team points, countdown,
 * and upcoming events) when valid.
 *
 * @param hacker - The current hacker profile returned from the server; may be `null`/`undefined` when the user is not registered.
 * @returns A React element rendering the appropriate dashboard or informative prompt based on `hacker` and its class information.
 */
export default async function HackathonDashboard({
  hacker,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  interface HackerClassInfo {
    teamColor: string;
    team: string;
    classPfp: string;
  }
  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (!hacker) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <p className="w-full max-w-xl text-center text-2xl">
          Register for Knight Hacks today!
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          {currentHackathon && (
            <HackerAppCard hackathonName={currentHackathon.name} />
          )}
        </div>
      </div>
    );
  }

  if (
    !hacker.class ||
    !(hacker.class in DISCORD.KNIGHTHACKS_8.HACKER_CLASS_INFO)
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 px-4 py-12 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <h3 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
            Configuration Error
          </h3>
          <p className="text-red-700 dark:text-red-300">
            Unable to load your team information. Please contact support or try
            refreshing the page.
          </p>
          {hacker.class && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Class: {hacker.class}
            </p>
          )}
        </div>
      </div>
    );
  }

  interface HackerClassInfo {
    teamColor: string;
    team: string;
    classPfp: string;
  }

  const HACKER_CLASS_INFO_TYPED: Record<string, HackerClassInfo> =
    HACKER_CLASS_INFO as Record<string, HackerClassInfo>;

  const classInfo = HACKER_CLASS_INFO_TYPED[hacker.class] ?? {
    teamColor: "#000000",
    team: "Unknown Team",
    classPfp: "/default.png",
  };

  const { teamColor, team, classPfp } = classInfo;

  return (
    <>
      <div className="animate-fade-in mb-4 px-4 sm:mb-8 sm:px-0">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
          <span>Hello,</span>
          <span
            className="font-bold"
            style={{
              color: teamColor,
              textShadow: `0 0 10px ${teamColor}, 0 0 20px ${teamColor}`,
            }}
          >
            {hacker.class}
          </span>
          <span>{hacker.firstName}!</span>
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Hackathon Dashboard
        </p>
      </div>

      <div className="animate-mobile-initial-expand mx-auto flex min-h-[900px] rounded-lg bg-[#E5E7EB] px-2 py-4 dark:bg-[#0A0F1D] sm:relative sm:px-0 sm:py-6 lg:min-h-[380px]">
        {/* Main content */}
        <HackathonData
          data={hacker}
          teamColor={teamColor}
          classPfp={classPfp}
          team={team}
        />

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
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <TeamPoints hId={currentHackathon?.name || ""} hClass={hacker.class} />
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <HackingCountdown />
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <UpcomingEvents />
      </div>
    </>
  );
}