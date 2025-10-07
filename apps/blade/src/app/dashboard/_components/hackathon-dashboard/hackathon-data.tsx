"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CircleCheckBig, Trophy } from "lucide-react";

import type { api as serverCall } from "~/trpc/server";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import { HackerQRCodePopup } from "../hacker-dashboard/hacker-qr-button";
import { DownloadQRPass } from "../member-dashboard/download-qr-pass";

type StatusKey = keyof typeof HACKER_STATUS_MAP | null | undefined;

export function HackathonData({
  data,
}: {
  data: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  const [hackerStatus, setHackerStatus] = useState<string | null>("");
  const [hackerStatusColor, setHackerStatusColor] = useState<string>("");

  const { data: hacker, isError } = api.hacker.getHacker.useQuery(
    {},
    {
      initialData: data,
    },
  );

  const { data: hackathonData } = api.hackathon.getHackathon.useQuery({
    hackathonName: undefined,
  });

  function getStatusName(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].name;
  }

  function getStatusColor(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].color;
  }

  useEffect(() => {
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
    <div className="flex h-full w-full flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-6">
      {/* Left Section - Name, Status, Image, and Actions */}
      <div className="flex flex-1 flex-col justify-evenly gap-5 lg:border-r lg:border-border lg:pr-8">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Name and Info Column */}
            <div className="flex-1 space-y-3">
              {hacker?.firstName && hacker.lastName && (
                <h1 className="animate-fade-in text-3xl font-bold tracking-tight">
                  {hacker.firstName} {hacker.lastName}
                </h1>
              )}

              <div className="animate-fade-in flex items-center gap-2 text-base text-muted-foreground">
                <span className="font-medium">{hacker?.class}</span>
                <span className="text-border">•</span>
                <span className="font-semibold text-foreground">Team T.K</span>
              </div>

              {/* Status Badge */}
              <div className="animate-fade-in space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status for {hackathonData?.displayName}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm">
                  <span className={`text-base font-bold ${hackerStatusColor}`}>
                    {hackerStatus}
                  </span>
                  {hackerStatus === "Confirmed" && (
                    <CircleCheckBig className="h-4 w-4" color="#00C9A7" />
                  )}
                </div>
              </div>
            </div>

            {/* TK Image */}
            <div className="animate-fade-in relative h-24 w-24 flex-shrink-0 self-center overflow-hidden rounded-lg border-2 border-border/50 bg-accent/20 shadow-sm sm:self-start">
              <Image
                src="/tk-dashboard-img.svg"
                alt="Image of TK"
                fill
                style={{ objectFit: "contain" }}
                priority
                sizes="96px"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h3>

          {/* QR Code and Apple Wallet */}
          <div className="flex flex-wrap items-center gap-2.5">
            <HackerQRCodePopup />
            <DownloadQRPass />
          </div>

          {/* Hacker Guide Link */}
          <Link
            href={"https://knight-hacks.notion.site/knight-hacks-viii"}
            className="group flex w-3/4 items-center gap-2.5 rounded-lg border bg-card px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-md sm:w-auto"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span>Hacker's Guide</span>
          </Link>
        </div>
      </div>

      {/* Right Section - Hack Points */}
      <div className="flex flex-1 items-center justify-center lg:pl-8">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-accent/10 p-6 shadow-lg transition-transform hover:scale-[1.02]">
            {/* Decorative gradient overlay */}
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-10 translate-x-10 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative">
              {/* Icon */}
              <div className="mb-3 flex justify-center">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <Trophy className="h-7 w-7 text-primary" />
                </div>
              </div>

              <h2 className="mb-2.5 text-center text-2xl font-bold">
                Hack Points
              </h2>

              <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
                Accumulate by attending workshops, socials, meals, sponsor fair,
                and more!
              </p>

              {/* Points Display */}
              <div className="mb-6 flex items-center justify-center">
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 px-6 py-5">
                  <div className="text-center text-6xl font-bold tabular-nums tracking-tight">
                    {hacker?.points || 0}
                  </div>
                </div>
              </div>

              <button className="w-full rounded-lg bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20 hover:shadow-md">
                View Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
