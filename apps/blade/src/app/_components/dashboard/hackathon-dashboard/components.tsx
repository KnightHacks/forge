"use client";

import { HACKATHONS } from "@forge/consts";

import type { api as serverCall } from "~/trpc/server";
import { HackerAppCard } from "~/app/_components/option-cards";
import { BaseHackathonCountdown } from "./countdown";
import { BaseHackathonData } from "./hackathon-data";
import { useCurrentHackathon } from "./provider";
import { BaseHackathonTeamPoints } from "./team-points";
import { BaseHackathonUpcomingEvents } from "./upcoming-events";

export {
  BaseHackathonGuideButton,
  BaseHackathonQRCodeButton,
  BaseHackathonWalletButton,
} from "./hackathon-data";
export { BaseHackathonCountdown } from "./countdown";
export * from "./issue-dialog";
export { BaseHackathonPointLeaderboard } from "./point-leaderboard";
export {
  BaseHackathonMissingError,
  HackathonProvider,
  useCurrentHackathon,
} from "./provider";
export { BaseHackathonTeamPoints } from "./team-points";
export { BaseHackathonUpcomingEvents } from "./upcoming-events";

export interface BaseHackathonClassInfo {
  classPfp: string;
  team: string;
  teamColor: string;
}

type BaseHackathonHacker = Awaited<
  ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>
>;

const DEFAULT_HACKER_GUIDE_HREF =
  "https://knight-hacks.notion.site/knight-hacks-viii";

const DEFAULT_CLASS_INFO = HACKATHONS.KNIGHT_HACKS_8
  .HACKER_CLASS_INFO as Record<string, BaseHackathonClassInfo>;

export function BaseHackathonClassError({
  hackerClass,
}: {
  hackerClass?: string | null;
}) {
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
        {hackerClass && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Class: {hackerClass}
          </p>
        )}
      </div>
    </div>
  );
}

export function BaseHackathonRegistrationPrompt() {
  const hackathon = useCurrentHackathon();

  return (
    <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
      <p className="w-full max-w-xl text-center text-2xl">
        Register for {hackathon.displayName} today!
      </p>
      <div className="flex flex-wrap justify-center gap-5">
        <HackerAppCard hackathonName={hackathon.name} />
      </div>
    </div>
  );
}

export function BaseHackathonDashboard({
  classInfoByClass = DEFAULT_CLASS_INFO,
  guideHref = DEFAULT_HACKER_GUIDE_HREF,
  hacker,
}: {
  classInfoByClass?: Record<string, BaseHackathonClassInfo>;
  guideHref?: string;
  hacker: BaseHackathonHacker;
}) {
  const hackathon = useCurrentHackathon();

  if (!hacker) {
    return <BaseHackathonRegistrationPrompt />;
  }

  if (!hacker.class || !(hacker.class in classInfoByClass)) {
    return <BaseHackathonClassError hackerClass={hacker.class} />;
  }

  const classInfo = classInfoByClass[hacker.class];

  if (!classInfo) {
    return <BaseHackathonClassError hackerClass={hacker.class} />;
  }

  const { classPfp, team, teamColor } = classInfo;

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
        <p className="text-sm text-muted-foreground">
          {hackathon.displayName} Dashboard
        </p>
      </div>

      <div className="animate-mobile-initial-expand mx-auto flex min-h-[900px] rounded-lg bg-[#E5E7EB] px-2 py-4 dark:bg-[#0A0F1D] sm:relative sm:px-0 sm:py-6 lg:min-h-[380px]">
        <BaseHackathonData
          classPfp={classPfp}
          data={hacker}
          guideHref={guideHref}
          team={team}
          teamColor={teamColor}
        />

        <div className="border-b-solid border-l-solid absolute bottom-0 right-0 hidden h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent sm:block"></div>

        <div
          className="absolute bottom-0 right-0 hidden h-0 w-0 sm:block"
          style={{
            borderBottom: "20px solid #6C26D9",
            borderLeft: "20px solid transparent",
          }}
        ></div>

        <div className="absolute -top-[1.4rem] right-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-96">
          <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
        </div>

        <div className="absolute -bottom-[1.46rem] left-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-48">
          <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
        </div>

        <div className="absolute -left-3 top-0 hidden h-full w-[0.4rem] bg-primary sm:block"></div>
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <BaseHackathonTeamPoints hClass={hacker.class} />
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <BaseHackathonCountdown />
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <BaseHackathonUpcomingEvents />
      </div>
    </>
  );
}
