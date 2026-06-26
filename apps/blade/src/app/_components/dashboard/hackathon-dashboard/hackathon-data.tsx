"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CircleCheckBig } from "lucide-react";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

import type { api as serverCall } from "~/trpc/server";
import { HackerQRCodePopup } from "~/app/_components/dashboard/hacker-dashboard/hacker-qr-button";
import { DownloadQRPass } from "~/app/_components/dashboard/member-dashboard/download-qr-pass";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import { BaseHackathonIssueButton } from "./issue-dialog";

type StatusKey = keyof typeof HACKER_STATUS_MAP | null | undefined;
type HackerProfile = Awaited<
  ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>
>;

export function BaseHackathonQRCodeButton() {
  return <HackerQRCodePopup />;
}

export function BaseHackathonWalletButton({
  profile,
}: {
  profile: HackerProfile;
}) {
  return <DownloadQRPass profile={profile} profileKind="hacker" />;
}

export function BaseHackathonGuideButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group flex w-full items-center gap-3 rounded-lg border bg-card px-5 py-3 text-base font-semibold shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-md sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
    >
      <BookOpen className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
      <span>Hacker's Guide</span>
    </Link>
  );
}

export function BaseHackathonData({
  data,
  guideHref,
  hackathon,
}: {
  data: HackerProfile;
  guideHref: string;
  hackathon: SelectHackathon;
}) {
  const [hackerStatus, setHackerStatus] = useState<string | null>("");
  const [hackerStatusColor, setHackerStatusColor] = useState<string>("");

  const { data: hacker, isError } = api.hackerQuery.getHacker.useQuery(
    { hackathonName: hackathon.name },
    {
      initialData: data,
    },
  );

  function getStatusName(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].name;
  }

  function getStatusColor(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].color;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHackerStatus(getStatusName(hacker?.status));
    setHackerStatusColor(getStatusColor(hacker?.status));
  }, [hacker]);

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-lg text-muted-foreground">
          Something went wrong. Please refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
      {/* Name, Status, and Actions */}
      <div className="flex flex-col justify-evenly gap-4">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
            {/* Name and Info Column */}
            <div className="flex-1 space-y-4 sm:space-y-4">
              {hacker?.firstName && hacker.lastName && (
                <h1 className="animate-fade-in text-center text-3xl font-bold tracking-tight sm:text-3xl md:text-start">
                  {hacker.firstName} {hacker.lastName}
                </h1>
              )}

              {/* Status Badge */}
              <div className="animate-fade-in flex flex-col items-center space-y-3 md:items-start md:justify-start">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px] md:text-start">
                  Application Status
                </p>
                <div className="inline-flex items-center gap-2.5 rounded-full bg-background shadow-sm">
                  <span
                    className={`text-base font-bold uppercase sm:text-lg ${hackerStatusColor}`}
                  >
                    {hackerStatus}
                  </span>
                  {hackerStatus === "Checked-in" && (
                    <CircleCheckBig
                      className={`h-4 w-4 sm:h-4 sm:w-4 ${hackerStatusColor}`}
                    />
                  )}
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

          {/* QR Code and Apple Wallet */}
          <div className="flex flex-row items-center justify-between gap-3 sm:flex-row sm:justify-start sm:gap-3">
            <BaseHackathonQRCodeButton />
            <BaseHackathonWalletButton profile={hacker} />
          </div>

          {/* Hacker Guide Link */}
          <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <BaseHackathonGuideButton href={guideHref} />
            <BaseHackathonIssueButton />
          </div>
        </div>
      </div>
    </div>
  );
}
