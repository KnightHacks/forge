"use client";

import { useState } from "react";
import Image from "next/image";

import { DISCORD } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

/**
 * Render a dialog prompting the user to join the Knight Hacks Discord.
 *
 * The dialog's open state is initialized from `initialState`. The primary action opens the permanent Discord invite in a new tab; the secondary action closes the dialog.
 *
 * @param initialState - Whether the dialog is open on initial render
 * @returns The rendered dialog element
 */
export function TacoTuesday({ initialState }: { initialState: boolean }) {
  const [open, setOpen] = useState<boolean>(initialState);
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px] [&>button:last-child]:hidden">
        <DialogHeader>
          <DialogTitle>
            <p className="text-center text-2xl">
              T.K Alert - You're not in our Discord!
            </p>
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 md:items-center">
                  <div className="relative h-[90px] w-[90px] md:h-[135px] md:w-[135px]">
                    <Image
                      src="/tk-dashboard-img.svg"
                      alt="Knight Hacks Logo"
                      fill
                      className="object-contain pr-2 md:pr-0"
                      priority
                    />
                  </div>
                  <p className="text-lg md:text-center">
                    Join the Knight Hacks Discord to stay up to date on
                    everything Knight Hacks!
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 pt-3">
                <Button
                  className="text-md w-3/4"
                  onClick={() =>
                    window.open(
                      DISCORD.PERMANENT_INVITE,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  type="submit"
                >
                  Join Discord!
                </Button>
                <Button
                  className="w-1/2 bg-transparent hover:bg-transparent"
                  onClick={() => setOpen(false)}
                  type="submit"
                >
                  <p className="text-sm text-gray-400 underline">
                    Not right now
                  </p>
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}