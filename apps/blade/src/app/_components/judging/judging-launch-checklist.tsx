"use client";

import { useState } from "react";
import { ArrowRight, Check, Circle, ClipboardCheck } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

type ControlData = RouterOutputs["judging"]["listAdmin"];

export function JudgingLaunchChecklist({
  data,
  onNavigate,
}: {
  data: ControlData;
  onNavigate: (tab: string, section?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeRooms = data.rooms.filter((room) => !room.archivedAt);
  const setupReady =
    data.rubric.length > 0 &&
    data.challenges.some(
      (challenge) => challenge.isGroup && challenge.isScheduled,
    );
  const roomAccessReady =
    activeRooms.length > 0 &&
    activeRooms.every((room) => room.buildingId && room.activeLinkId);
  const scheduleReady =
    data.inventory.projectCount > 0 && setupReady && roomAccessReady;
  const judgingOpen = data.configuration.state === "open";
  const steps = [
    {
      complete: data.inventory.projectCount > 0,
      description: "Load the final Devpost CSV into this hackathon.",
      label: "Import projects",
      section: "project-inventory",
      tab: "projects",
    },
    {
      complete: setupReady,
      description: "Choose scheduled groups and save at least one rubric item.",
      label: "Configure challenges and rubric",
      section: "challenge-setup-title",
      tab: "setup",
    },
    {
      complete: roomAccessReady,
      description: "Give every active room a building and guest access link.",
      label: "Configure and distribute room access",
      section: "judging-rooms",
      tab: "rooms",
    },
    {
      complete: scheduleReady,
      description:
        "Inventory, rubric, and room access are ready for generation.",
      label: "Begin generating the schedule",
      section: "schedule-workspace",
      tab: "schedule",
    },
    {
      complete: data.hasSavedSchedule,
      description: "Save the candidate that judges and hackers will use.",
      label: "Save the schedule",
      section: "schedule-workspace",
      tab: "schedule",
    },
    {
      complete: judgingOpen,
      description: "Allow judges to submit and edit evaluations.",
      label: "Open judging to judges",
      section: "judging-state",
      tab: "launch",
    },
    {
      complete: data.inventory.claimLinksSent,
      description: `Send claim links to all ${data.inventory.memberCount} imported team members.`,
      label: "Email claim links to hackers",
      section: "hacker-access",
      tab: "launch",
    },
    {
      complete: data.hasSavedSchedule && judgingOpen,
      description:
        "Monitor rooms, appointments, and exceptions during judging.",
      label: "Watch the schedule",
      section: "schedule-workspace",
      tab: "schedule",
    },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return (
    <>
      <Button
        className="h-11 gap-2"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <ClipboardCheck className="size-4" aria-hidden="true" />
        Launch checklist
        <span className="text-muted-foreground">
          {completed}/{steps.length}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-2xl overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle>Judging launch checklist</DialogTitle>
            <DialogDescription>
              Follow the setup in order. A green step is complete or ready.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-1" aria-hidden="true">
            {steps.map((step) => (
              <span
                className={
                  step.complete
                    ? "h-1.5 rounded-full bg-emerald-500"
                    : "h-1.5 rounded-full bg-muted"
                }
                key={step.label}
              />
            ))}
          </div>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step.label}>
                <button
                  className="group flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setOpen(false);
                    onNavigate(step.tab, step.section);
                  }}
                  type="button"
                >
                  <span
                    className={
                      step.complete
                        ? "grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"
                        : "grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                    }
                  >
                    {step.complete ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Circle className="size-3" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {index + 1}. {step.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
