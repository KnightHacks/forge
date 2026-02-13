"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

export default function ConfirmWithTOS({
  hackathonData,
  handleConfirm,
  isLoading,
  numConfirmed,
}: {
  hackathonData: { displayName?: string; confirmationDeadline?: Date | null };
  handleConfirm: () => Promise<void> | void;
  isLoading: boolean;
  numConfirmed: number;
}) {
  const [open, setOpen] = useState(false);

  const disabled =
    !hackathonData.confirmationDeadline ||
    hackathonData.confirmationDeadline < new Date() ||
    numConfirmed >= 1100;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`animate-fade-in sm:size-lg gap-2 !rounded-none ${
            disabled ? "bg-gray-700 hover:bg-gray-900" : ""
          }`}
          disabled={disabled}
        >
          {isLoading ? (
            <Loader2 className="w-[85px] animate-spin" />
          ) : (
            <span className="text-lg font-bold text-white">
              {disabled ? "CONFIRMATION CLOSED" : "CONFIRM"}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Terms of Service</DialogTitle>
          <DialogDescription>
            Please review and agree to the terms to proceed with{" "}
            {hackathonData.displayName}.
          </DialogDescription>
        </DialogHeader>

        {/* Terms */}
        <div className="border p-3 text-sm">
          <p>
            By confirming, you agree to follow the{" "}
            <a
              href="https://knight-hacks.notion.site/kh-25-tos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-purple-500 transition duration-300 hover:text-purple-400 hover:shadow-[0_0_8px_2px_rgba(168,85,247,0.7)]"
            >
              Knight Hacks terms of service
            </a>
            , MLH rules, and organizer instructions. Respectful behavior is
            required, and any violation may result in removal.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={async () => {
              await handleConfirm();
              setOpen(false);
            }}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "I agree & confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
