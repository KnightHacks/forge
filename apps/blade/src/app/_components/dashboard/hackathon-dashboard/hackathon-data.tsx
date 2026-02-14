"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CircleCheckBig, Trophy } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import type { api as serverCall } from "~/trpc/server";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import { HackerQRCodePopup } from "~/app/_components/dashboard/hacker-dashboard/hacker-qr-button";
import { DownloadQRPass } from "~/app/_components/dashboard/member-dashboard/download-qr-pass";
import AlertButton from "./issue-dialog";
import { PointLeaderboard } from "./point-leaderboard";

type StatusKey = keyof typeof HACKER_STATUS_MAP | null | undefined;

export function HackathonData({
  data,
  teamColor,
  team,
  classPfp,
}: {
  data: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
  teamColor: string;
  team: string;
  classPfp: string;
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
    <div className="flex h-full w-full flex-col gap-3 p-2 sm:gap-4 sm:p-4 lg:flex-row lg:gap-6 lg:p-6">
      {/* Left Section - Name, Status, Image, and Actions */}
      <div className="flex flex-1 flex-col justify-evenly gap-4 lg:border-r lg:border-border lg:pr-8">
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

              <div className="animate-fade-in flex flex-wrap items-center justify-center gap-2 text-base text-muted-foreground sm:text-base md:justify-start">
                <span
                  className="font-medium"
                  style={{
                    color: teamColor,
                    textShadow: `0 0 10px ${teamColor}, 0 0 20px ${teamColor}`,
                  }}
                >
                  {hacker?.class}
                </span>
                <span className="text-border">•</span>
                <span
                  className="font-semibold text-foreground"
                  style={{
                    color: teamColor,
                    textShadow: `0 0 10px ${teamColor}, 0 0 20px ${teamColor}`,
                  }}
                >
                  {"Team " + team}
                </span>
              </div>

              {/* Status Badge */}
              <div className="animate-fade-in flex flex-col items-center space-y-3 md:items-start md:justify-start">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px] md:text-start">
                  Status for {hackathonData?.displayName}
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

            {/* TK Image */}
            <div className="animate-fade-in relative h-28 w-28 flex-shrink-0 self-center overflow-hidden shadow-sm sm:h-32 sm:w-32 sm:self-start">
              <Image
                src={classPfp}
                alt="Team Mascot Image"
                fill
                className="rounded-full object-cover"
                priority
                sizes="(max-width: 800px) 112px, 128px"
              />
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
            <HackerQRCodePopup />
            <DownloadQRPass />
          </div>

          {/* Hacker Guide Link */}
          <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Link
              href={"https://knight-hacks.notion.site/knight-hacks-viii"}
              className="group flex w-full items-center gap-3 rounded-lg border bg-card px-5 py-3 text-base font-semibold shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-md sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
            >
              <BookOpen className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              <span>Hacker's Guide</span>
            </Link>
            <AlertButton />
          </div>
        </div>
      </div>

      {/* Right Section - Hack Points */}
      <div className="flex flex-1 items-center justify-center lg:pl-8">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background to-accent/10 p-4 shadow-lg transition-transform hover:scale-[1.02] sm:p-6">
            {/* Decorative gradient overlay */}
            <div
              className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full blur-3xl sm:h-32 sm:w-32 sm:-translate-y-10 sm:translate-x-10"
              style={{ backgroundColor: `${teamColor}20` }}
            />

            <div className="relative">
              {/* Icon */}
              <div className="mb-2 flex justify-center sm:mb-3">
                <div
                  className="rounded-full p-2 sm:p-2.5"
                  style={{ backgroundColor: `${teamColor}20` }}
                >
                  <Trophy
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    style={{ color: teamColor }}
                  />
                </div>
              </div>

              <h2 className="mb-2 text-center text-xl font-bold sm:mb-2.5 sm:text-2xl">
                Hack Points
              </h2>

              <p className="mb-4 text-center text-xs leading-relaxed text-muted-foreground sm:mb-6 sm:text-sm">
                Accumulate by attending workshops, socials, meals, sponsor fair,
                and more!
              </p>

              {/* Points Display */}
              <div className="mb-4 flex items-center justify-center sm:mb-6">
                <div
                  className="rounded-xl px-4 py-3 sm:px-6 sm:py-5"
                  style={{
                    background: `linear-gradient(to bottom right, ${teamColor}33, ${teamColor}0d)`,
                    boxShadow: `0 0 20px ${teamColor}40`,
                  }}
                >
                  <div
                    className="text-center text-4xl font-bold tabular-nums tracking-tight sm:text-6xl"
                    style={{
                      color: teamColor,
                      textShadow: `0 0 10px ${teamColor}80`,
                    }}
                  >
                    {hacker?.points || 0}
                  </div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="w-full rounded-lg py-2 text-sm font-semibold transition-all hover:shadow-md sm:py-2.5"
                    style={{
                      backgroundColor: `${teamColor}20`,
                      color: teamColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${teamColor}33`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${teamColor}20`;
                    }}
                  >
                    View Leaderboard
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Leaderboard</DialogTitle>
                  </DialogHeader>
                  <PointLeaderboard
                    hacker={hacker}
                    hId={hackathonData?.name ?? ""}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
