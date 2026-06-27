"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

import { TacoTuesday } from "../discord-modal";

interface DashboardHackathon {
  applicationsOpen: boolean;
  displayName: string;
  isLive: boolean;
  name: string;
}

export function DashboardEntryDialogs({
  currentHackathon,
  hasHacker,
  hasMember,
  showDiscordPrompt,
}: {
  currentHackathon: DashboardHackathon | null;
  hasHacker: boolean;
  hasMember: boolean;
  showDiscordPrompt: boolean;
}) {
  const [routingOpen, setRoutingOpen] = useState(currentHackathon != null);

  const hackathonAction = hasHacker
    ? `Open ${currentHackathon?.displayName ?? "Hackathon"} Dashboard`
    : currentHackathon?.applicationsOpen
      ? `Register for ${currentHackathon.displayName}`
      : `View ${currentHackathon?.displayName ?? "Hackathon"}`;
  const memberAction = hasMember
    ? "Continue to Member Dashboard"
    : "Explore Knight Hacks Membership";

  return (
    <>
      {currentHackathon && (
        <Dialog open={routingOpen} onOpenChange={setRoutingOpen}>
          <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-x-hidden sm:max-w-lg">
            <DialogHeader className="min-w-0 pr-6">
              <DialogTitle>
                {currentHackathon.displayName} is{" "}
                {currentHackathon.isLive ? "live" : "coming up"}
              </DialogTitle>
              <DialogDescription className="break-words">
                {hasHacker
                  ? `You have a ${currentHackathon.displayName} application. Choose which dashboard you want to open.`
                  : `Choose whether you are here for ${currentHackathon.displayName} or year-round Knight Hacks membership.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:items-stretch sm:space-x-0">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-center leading-snug sm:min-w-0 sm:flex-1"
                >
                  {memberAction}
                </Button>
              </DialogClose>
              <Button
                asChild
                className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-center leading-snug sm:min-w-0 sm:flex-1"
              >
                <Link href={`/hackathon/${currentHackathon.name}`}>
                  {hackathonAction}
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!routingOpen && showDiscordPrompt && <TacoTuesday initialState={true} />}
    </>
  );
}
