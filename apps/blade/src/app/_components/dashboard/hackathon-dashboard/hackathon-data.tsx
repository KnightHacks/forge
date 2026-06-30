"use client";

import Link from "next/link";
import { BookOpen, CircleCheckBig } from "lucide-react";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import type { api as serverCall } from "~/trpc/server";
import { HackerQRCodePopup } from "~/app/_components/dashboard/hacker-dashboard/hacker-qr-button";
import { DownloadQRPass } from "~/app/_components/dashboard/member-dashboard/download-qr-pass";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import { BaseHackathonIssueButton } from "./issue-dialog";

type HackerProfile = Awaited<
  ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>
>;

export function BaseHackathonQRCodeButton({
  dashboardFrameTheme,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
}) {
  return (
    <HackerQRCodePopup
      actionButtonClassName={dashboardFrameTheme?.actionButtonClassName}
      actionIconClassName={dashboardFrameTheme?.actionIconClassName}
    />
  );
}

export function BaseHackathonWalletButton({
  dashboardFrameTheme,
  profile,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  profile: HackerProfile;
}) {
  return (
    <DownloadQRPass
      buttonClassName={cn(
        "group flex h-auto w-full items-center gap-3 rounded-lg border bg-card px-5 py-3 text-base font-semibold text-card-foreground shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-card hover:shadow-md sm:w-auto sm:px-5 sm:py-3 sm:text-sm",
        dashboardFrameTheme?.actionButtonClassName,
      )}
      iconClassName={cn(
        "h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary",
        dashboardFrameTheme?.actionIconClassName,
      )}
      profile={profile}
      profileKind="hacker"
    />
  );
}

export function BaseHackathonGuideButton({
  dashboardFrameTheme,
  href,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  href: string;
}) {
  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "animate-fade-in group w-full gap-2 rounded-lg border border-[#1F2937] bg-card px-5 py-3 shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-card hover:shadow-md sm:px-8",
        dashboardFrameTheme?.actionButtonClassName,
      )}
    >
      <Link href={href}>
        <BookOpen
          className={cn(
            "h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary",
            dashboardFrameTheme?.actionIconClassName,
          )}
        />
        <span className="text-base font-bold text-black dark:text-white">
          Hacker's Guide
        </span>
      </Link>
    </Button>
  );
}

export function BaseHackathonData({
  dashboardFrameTheme,
  data,
  guideHref,
  hackathon,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  data: HackerProfile;
  guideHref: string;
  hackathon: SelectHackathon;
}) {
  const { data: hacker, isError } = api.hackerQuery.getHacker.useQuery(
    { hackathonName: hackathon.name },
    {
      initialData: data,
    },
  );

  if (isError || !hacker) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-lg text-muted-foreground">
          Something went wrong. Please refresh and try again.
        </p>
      </div>
    );
  }

  const hackerStatus = HACKER_STATUS_MAP.checkedin.name;
  const hackerStatusColor =
    dashboardFrameTheme?.checkedInStatusClassName ??
    HACKER_STATUS_MAP.checkedin.color;

  return (
    <div className="flex h-full w-full flex-col gap-3 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
      {/* Name, Status, and Actions */}
      <div className="flex flex-col justify-evenly gap-4">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
            {/* Name and Info Column */}
            <div className="flex-1 space-y-4 sm:space-y-4">
              <h1 className="animate-fade-in text-center text-3xl font-bold tracking-tight sm:text-3xl md:text-start">
                {hacker.firstName} {hacker.lastName}
              </h1>

              {/* Status Badge */}
              <div className="animate-fade-in flex flex-col items-center space-y-3 md:items-start md:justify-start">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-background shadow-sm">
                  <span
                    className={`text-base font-bold uppercase sm:text-lg ${hackerStatusColor}`}
                  >
                    {hackerStatus}
                  </span>

                  <CircleCheckBig
                    className={`h-4 w-4 sm:h-4 sm:w-4 ${hackerStatusColor}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 sm:space-y-4">
          <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs md:text-start">
            Quick Actions
          </h3>

          {/* Primary actions */}
          <div className="flex flex-row items-center justify-between gap-3 sm:flex-row sm:justify-start sm:gap-3">
            <BaseHackathonQRCodeButton
              dashboardFrameTheme={dashboardFrameTheme}
            />
            <BaseHackathonGuideButton
              dashboardFrameTheme={dashboardFrameTheme}
              href={guideHref}
            />
          </div>

          {/* Secondary actions */}
          <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <BaseHackathonWalletButton
              dashboardFrameTheme={dashboardFrameTheme}
              profile={hacker}
            />
            <BaseHackathonIssueButton
              dashboardFrameTheme={dashboardFrameTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
