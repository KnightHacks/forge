"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { cn } from "@forge/ui";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { buttonVariants } from "@forge/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

const CURRENT_HACKATHON_HREF = "/hackathon/current";

export function CurrentHackathonNotice({
  hackathonDisplayName,
}: {
  hackathonDisplayName: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Alert className="border-primary/40 bg-primary/10">
        <Trophy className="h-4 w-4" />
        <AlertTitle>{hackathonDisplayName} is happening now</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Head to the hackathon dashboard for your check-in tools, points,
            live events, and event-specific info.
          </span>
          <Link
            href={CURRENT_HACKATHON_HREF}
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "w-full shrink-0 sm:w-auto",
            )}
          >
            Open Hackathon Dashboard
          </Link>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hackathonDisplayName} is live</DialogTitle>
            <DialogDescription>
              The hackathon dashboard has check-in tools, points, live events,
              and event-specific info.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: "outline" }))}>
              Stay Here
            </DialogClose>
            <Link
              href={CURRENT_HACKATHON_HREF}
              className={cn(buttonVariants({ variant: "primary" }))}
            >
              Open Hackathon Dashboard
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
