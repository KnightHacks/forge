"use client";

import { useEffect, useState } from "react";
import { NotepadText } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function HackerSurveyResponsesButton({
  hacker,
}: {
  hacker: InsertHacker;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const utils = api.useUtils();

  useEffect(() => {
    async function invalidateHackers() {
      await utils.hacker.invalidate();
    }

    invalidateHackers().catch(() => {
      toast.error("Error invalidating hackers in survey responses!");
    });
  }, [utils.hacker, hacker]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <NotepadText className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-h-screen overflow-y-scroll break-words"
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle className="text-xl">
            {hacker.firstName} {hacker.lastName}'s Survey Responses
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-md">Why do you want to attend Knight Hacks?</h1>
            <p className="text-xs font-bold text-gray-300">{hacker.survey1}</p>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-md">
              What do you hope to achieve at Knight Hacks?
            </h1>
            <p className="text-xs font-bold text-gray-300">{hacker.survey2}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
