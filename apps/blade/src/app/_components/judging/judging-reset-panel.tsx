"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type ControlData = RouterOutputs["judging"]["listAdmin"];
type Action =
  | "evaluations"
  | "full"
  | "launch"
  | "projects"
  | "rooms"
  | "schedule"
  | "setup";

const actionCopy: Record<
  Action,
  { button: string; description: string; pending: string; title: string }
> = {
  evaluations: {
    button: "Drop evaluations",
    description:
      "Deletes every submitted evaluation, draft, answer, and revision. Projects, rooms, schedule, and settings stay in place.",
    pending: "Dropping evaluations",
    title: "Drop all evaluations?",
  },
  rooms: {
    button: "Drop rooms and access",
    description:
      "Deletes all rooms, active guest links, guest sessions, presence, and judging announcements. Drop the schedule first.",
    pending: "Dropping room setup",
    title: "Drop all room configuration?",
  },
  projects: {
    button: "Reset projects",
    description:
      "Permanently deletes every active and deleted project, team contact, and imported challenge. Judging groups and their settings stay in Forge.",
    pending: "Resetting projects",
    title: "Reset the project inventory?",
  },
  schedule: {
    button: "Reset schedule",
    description:
      "Deletes the saved schedule, reservations, and unsent schedule drafts. Submitted evaluations stay in place. This is unavailable after the first scheduled result.",
    pending: "Resetting schedule",
    title: "Reset the judging schedule?",
  },
  setup: {
    button: "Reset challenge and rubric setup",
    description:
      "Deletes the rubric and custom judging groups, restores the starter groups, and leaves imported projects in place. Drop the schedule, evaluations, and rooms first.",
    pending: "Resetting setup",
    title: "Reset challenge and rubric setup?",
  },
  launch: {
    button: "Reset launch settings",
    description:
      "Closes judging and the hacker schedule, hides results, clears claim links and claims, and restores launch settings to draft defaults.",
    pending: "Resetting launch",
    title: "Reset launch and hacker access?",
  },
  full: {
    button: "Reset all judging",
    description:
      "Deletes projects, evaluations, schedules, rooms, access links, claims, rubric, challenge configuration, judge sessions, deliberation, and announcements. Every judging toggle returns to its default. The hackathon and global buildings remain.",
    pending: "Resetting all judging",
    title: "Reset all judging for this hackathon?",
  },
};

function ConfirmationDialog({
  action,
  hackathonName,
  onClose,
  onConfirm,
  pending,
}: {
  action: Action | null;
  hackathonName: string;
  onClose: () => void;
  onConfirm: (confirmation: string) => void;
  pending: boolean;
}) {
  const [confirmation, setConfirmation] = useState("");
  const copy = action ? actionCopy[action] : null;
  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setConfirmation("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-xl overflow-y-auto border-destructive/30 bg-card/95">
        <DialogHeader className="text-left">
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription className="leading-6">
            {copy?.description} This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-md border border-destructive/25 bg-destructive/10 p-4">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              Type <span className="font-semibold">{hackathonName}</span> to
              confirm.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="judging-reset-confirmation">Hackathon name</Label>
            <Input
              autoComplete="off"
              id="judging-reset-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              onPaste={(event) => {
                event.preventDefault();
                toast.info(
                  "Please type the hackathon name instead of pasting it.",
                );
              }}
              placeholder={hackathonName}
              value={confirmation}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={confirmation !== hackathonName || pending || !copy}
            onClick={() => onConfirm(confirmation)}
            variant="destructive"
          >
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {copy?.pending}
              </>
            ) : (
              copy?.button
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DropEvaluationsButton({
  data,
  onDropped,
}: {
  data: ControlData;
  onDropped: () => void;
}) {
  const [open, setOpen] = useState(false);
  const drop = api.judging.dropEvaluations.useMutation({
    onSuccess(result) {
      toast.success(
        `Dropped ${result.evaluationCount} evaluation${result.evaluationCount === 1 ? "" : "s"}.`,
      );
      setOpen(false);
      onDropped();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <Button
        disabled={!data.hasEvaluationData}
        onClick={() => setOpen(true)}
        variant="destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Drop all evaluations
      </Button>
      <ConfirmationDialog
        key={open ? "evaluations" : "closed"}
        action={open ? "evaluations" : null}
        hackathonName={data.hackathon.displayName}
        onClose={() => setOpen(false)}
        onConfirm={(confirmation) =>
          drop.mutate({ confirmation, hackathonId: data.hackathon.id })
        }
        pending={drop.isPending}
      />
    </>
  );
}

export function JudgingResetPanel({ data }: { data: ControlData }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [action, setAction] = useState<Action | null>(null);
  const evaluations = api.judging.dropEvaluations.useMutation();
  const projects = api.judging.resetProjects.useMutation();
  const rooms = api.judging.dropRooms.useMutation();
  const schedule = api.judging.dropSchedule.useMutation();
  const setup = api.judging.resetSetup.useMutation();
  const launch = api.judging.resetLaunch.useMutation();
  const full = api.judging.resetHackathon.useMutation();
  const mutations = {
    evaluations,
    full,
    launch,
    projects,
    rooms,
    schedule,
    setup,
  };
  const pending = action ? mutations[action].isPending : false;

  async function confirm(confirmation: string) {
    if (!action) return;
    try {
      if (action === "schedule") {
        await schedule.mutateAsync({ hackathonId: data.hackathon.id });
      } else {
        await mutations[action].mutateAsync({
          confirmation,
          hackathonId: data.hackathon.id,
        });
      }
      toast.success(
        action === "full"
          ? `${data.hackathon.displayName} judging is back to a clean slate.`
          : `${actionCopy[action].button} complete.`,
      );
      setAction(null);
      await Promise.all([
        utils.judging.listAdmin.invalidate({
          hackathonId: data.hackathon.id,
        }),
        utils.judging.listScheduleAdmin.invalidate({
          hackathonId: data.hackathon.id,
        }),
      ]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed.");
    }
  }

  const slices: {
    action: Action;
    description: string;
    disabled?: boolean;
    label: string;
  }[] = [
    {
      action: "projects",
      description: "Projects, team contacts, and imported challenges.",
      label: "Projects",
    },
    {
      action: "setup",
      description: "Custom groups and the saved rubric.",
      label: "Challenge and rubric setup",
    },
    {
      action: "rooms",
      description: "Rooms, links, sessions, presence, and announcements.",
      disabled: data.rooms.length === 0 && !data.globalAnnouncement,
      label: "Rooms and access",
    },
    {
      action: "schedule",
      description: "Saved schedule, reservations, and unsent drafts.",
      disabled: !data.hasScheduleData || data.scheduleDropLocked,
      label: "Schedule",
    },
    {
      action: "evaluations",
      description: "Submitted evaluations, drafts, answers, and revisions.",
      disabled: !data.hasEvaluationData,
      label: "Evaluations",
    },
    {
      action: "launch",
      description: "Claims, publication, judging state, and result visibility.",
      label: "Launch settings",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <RotateCcw
            className="mt-0.5 size-5 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold">Reset one judging slice</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reset only what you need while testing. Dependent slices must be
              dropped first so the remaining data stays valid.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {slices.map((slice) => (
            <div
              className="flex min-h-24 items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
              key={slice.label}
            >
              <div>
                <h3 className="text-sm font-medium">{slice.label}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {slice.description}
                </p>
              </div>
              <Button
                className={"h-11 shrink-0 text-destructive"}
                disabled={slice.disabled}
                onClick={() => setAction(slice.action)}
                variant="outline"
              >
                Reset
                <RotateCcw className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-destructive/35 bg-destructive/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-destructive">
              Reset all judging
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Return this hackathon to its fresh judging state in one
              transaction. The hackathon, global buildings, and audit history
              stay in Forge. Existing Discord threads are not deleted.
            </p>
          </div>
          <Button
            className="h-11 shrink-0"
            onClick={() => setAction("full")}
            variant="destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Reset all judging
          </Button>
        </div>
      </section>

      <ConfirmationDialog
        key={action ?? "closed"}
        action={action}
        hackathonName={data.hackathon.displayName}
        onClose={() => !pending && setAction(null)}
        onConfirm={(confirmation) => void confirm(confirmation)}
        pending={pending}
      />
    </div>
  );
}
