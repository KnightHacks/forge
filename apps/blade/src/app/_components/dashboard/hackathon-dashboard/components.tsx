import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";
import { cn } from "@forge/ui";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import type { api as serverCall } from "~/trpc/server";
import { HackerAppCard } from "~/app/_components/option-cards";
import { BaseHackathonCountdown } from "./countdown";
import { BaseHackathonData } from "./hackathon-data";
import { BaseHackathonUpcomingEvents } from "./upcoming-events";

export {
  BaseHackathonGuideButton,
  BaseHackathonQRCodeButton,
  BaseHackathonWalletButton,
} from "./hackathon-data";
export { BaseHackathonCountdown } from "./countdown";
export * from "./issue-dialog";
export { BaseHackathonUpcomingEvents } from "./upcoming-events";

const DEFAULT_HACKER_GUIDE_HREF =
  "https://knight-hacks.notion.site/knight-hacks-viii";

export function BaseHackathonRegistrationPrompt({
  hackathon,
}: {
  hackathon: SelectHackathon;
}) {
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
  dashboardFrameTheme,
  guideHref = DEFAULT_HACKER_GUIDE_HREF,
  hackathon,
  hacker,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  guideHref?: string;
  hackathon: SelectHackathon;
  hacker: Awaited<ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>>;
}) {
  if (!hacker) {
    return <BaseHackathonRegistrationPrompt hackathon={hackathon} />;
  }

  return (
    <>
      <div
        className={cn(
          "animate-mobile-initial-expand mx-auto flex min-h-[900px] rounded-lg bg-[#E5E7EB] px-2 py-4 dark:bg-[#0A0F1D] sm:relative sm:px-0 sm:py-6 lg:min-h-[380px]",
          dashboardFrameTheme?.frameClassName,
        )}
      >
        <BaseHackathonData
          dashboardFrameTheme={dashboardFrameTheme}
          data={hacker}
          guideHref={guideHref}
          hackathon={hackathon}
        />

        {!dashboardFrameTheme?.hideFrameCutouts && (
          <>
            <div className="border-b-solid border-l-solid absolute bottom-0 right-0 hidden h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent sm:block"></div>

            <div
              className="absolute bottom-0 right-0 hidden h-0 w-0 sm:block"
              style={{
                borderBottom: `20px solid ${dashboardFrameTheme?.cornerAccentColor ?? "#6C26D9"}`,
                borderLeft: "20px solid transparent",
              }}
            ></div>

            <div
              className={cn(
                "absolute -top-[1.4rem] right-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-96",
                dashboardFrameTheme?.topTabClassName,
              )}
            >
              <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
            </div>

            <div
              className={cn(
                "absolute -bottom-[1.46rem] left-0 hidden h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:block sm:w-48",
                dashboardFrameTheme?.bottomTabClassName,
              )}
            >
              <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
            </div>
          </>
        )}

        <div
          className={cn(
            "absolute -left-3 top-0 hidden h-full w-[0.4rem] bg-primary sm:block",
            dashboardFrameTheme?.leftAccentClassName,
          )}
        ></div>
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <BaseHackathonCountdown endDate={hackathon.endDate} />
      </div>
      <div className="animate-fade-in mb-8 mt-8 px-0 sm:mt-12 sm:px-4">
        <BaseHackathonUpcomingEvents hackathonId={hackathon.id} />
      </div>
    </>
  );
}
