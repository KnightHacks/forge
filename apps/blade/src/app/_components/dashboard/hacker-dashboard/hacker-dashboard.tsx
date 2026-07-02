import type { Metadata } from "next";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";
import { cn } from "@forge/ui";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
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
  dashboardFrameTheme,
  hackathon,
  hacker,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  hackathon: SelectHackathon;
  hacker: Awaited<ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>>;
}) {
  if (!hacker) {
    const now = new Date();

    if (now < hackathon.applicationOpen) {
      const applicationOpen = new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "America/New_York",
      }).format(hackathon.applicationOpen);

      return (
        <div className="flex flex-col items-center justify-center gap-y-3 text-center">
          <p className="text-2xl font-semibold">
            Applications for {hackathon.displayName} open on {applicationOpen}.
          </p>
          <p className="text-muted-foreground">
            Check back then to submit your hacker application.
          </p>
        </div>
      );
    }

    if (now > hackathon.applicationDeadline) {
      return (
        <div className="flex flex-col items-center justify-center gap-y-3 text-center">
          <p className="text-2xl font-semibold">
            Applications for {hackathon.displayName} are closed.
          </p>
          <p className="text-muted-foreground">
            Existing applicants can still view their application status here.
          </p>
        </div>
      );
    }

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

  const [resume, pastHackathons] = await Promise.allSettled([
    api.resume.getResume(),
    api.hackathon.getPastHackathons(),
  ]);

  return (
    <>
      <div
        className={cn(
          "animate-mobile-initial-expand relative mx-auto flex h-0 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:py-0 sm:pb-0 lg:max-h-56",
          dashboardFrameTheme?.frameClassName,
        )}
      >
        {/* Main content */}
        <HackerData
          dashboardFrameTheme={dashboardFrameTheme}
          data={hacker}
          hackathon={hackathon}
        />

        {!dashboardFrameTheme?.hideFrameCutouts && (
          <>
            {/* Transparent Triangle overlay in bottom right corner */}
            <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[30px] border-l-[30px] border-b-background border-l-transparent"></div>

            {/* Triangle in bottom right corner */}
            <div
              className="absolute bottom-0 right-0 h-0 w-0"
              style={{
                borderBottom: `20px solid ${dashboardFrameTheme?.cornerAccentColor ?? "#6C26D9"}`,
                borderLeft: "20px solid transparent",
              }}
            ></div>

            {/* Top rectangle */}
            <div
              className={cn(
                "absolute -top-[1.4rem] right-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-96",
                dashboardFrameTheme?.topTabClassName,
              )}
            >
              <div className="border-t-solid border-r-solid absolute left-0 top-0 h-0 w-0 border-r-[23px] border-t-[23px] border-r-transparent border-t-background"></div>
            </div>

            {/* Bottom rectangle */}
            <div
              className={cn(
                "absolute -bottom-[1.46rem] left-0 h-6 w-40 bg-[#E5E7EB] dark:bg-[#0A0F1D] sm:w-48",
                dashboardFrameTheme?.bottomTabClassName,
              )}
            >
              <div className="border-b-solid border-l-solid absolute bottom-0 right-0 h-0 w-0 border-b-[24px] border-l-[24px] border-b-background border-l-transparent"></div>
            </div>
          </>
        )}

        {/* Left side rectangle */}
        <div
          className={cn(
            "absolute -left-3 top-0 h-full w-[0.4rem] bg-primary",
            dashboardFrameTheme?.leftAccentClassName,
          )}
        ></div>
      </div>
      <div className="mx-auto mb-10 mt-20 flex flex-col justify-center gap-x-2 gap-y-4 sm:flex-row">
        {resume.status === "rejected" ||
        pastHackathons.status === "rejected" ? (
          <div className="font-bold">
            Something went wrong. Please try again later.
          </div>
        ) : (
          <>
            <PastHackathonButton
              actionButtonClassName={dashboardFrameTheme?.actionButtonClassName}
              actionIconClassName={dashboardFrameTheme?.actionIconClassName}
              hackathons={pastHackathons.value}
            />
            <HackerResumeButton
              actionButtonClassName={dashboardFrameTheme?.actionButtonClassName}
              actionIconClassName={dashboardFrameTheme?.actionIconClassName}
              resume={resume.value}
            />
          </>
        )}
      </div>
    </>
  );
}
