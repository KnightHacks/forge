"use client";

import { useState } from "react";

import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { judgingTime } from "~/lib/judging/schedule-display";
import { api } from "~/trpc/react";

export type AppointmentSelection =
  | { appointmentId: string }
  | { projectId: string; challengeId: string };

export function AppointmentMoveDialog({
  selection,
  hackathonId,
  timeZone,
  onClose,
}: {
  selection: AppointmentSelection;
  hackathonId: string;
  timeZone: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [choiceKey, setChoiceKey] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const moveChoices = api.judging.getAppointmentMoveChoices.useQuery(
    {
      hackathonId,
      appointmentId:
        "appointmentId" in selection
          ? selection.appointmentId
          : "00000000-0000-4000-8000-000000000000",
    },
    { enabled: "appointmentId" in selection, refetchInterval: 5000 },
  );
  const assignChoices = api.judging.getUnassignedPresentationChoices.useQuery(
    {
      hackathonId,
      projectId:
        "projectId" in selection
          ? selection.projectId
          : "00000000-0000-4000-8000-000000000000",
      challengeId:
        "challengeId" in selection
          ? selection.challengeId
          : "00000000-0000-4000-8000-000000000000",
    },
    { enabled: "projectId" in selection, refetchInterval: 5000 },
  );
  const data =
    "appointmentId" in selection ? moveChoices.data : assignChoices.data;
  const queryError =
    "appointmentId" in selection ? moveChoices.error : assignChoices.error;
  const onSuccess = async () => {
    await utils.judging.listScheduleAdmin.invalidate({ hackathonId });
    toast.success("Appointment saved.");
    onClose();
  };
  const onError = (error: { message: string }) => toast.error(error.message);
  const move = api.judging.moveAppointment.useMutation({ onSuccess, onError });
  const assign = api.judging.assignPresentation.useMutation({
    onSuccess,
    onError,
  });
  const selected = data?.choices.find(
    (choice) =>
      `${choice.roomId}:${choice.startsAt.toISOString()}` === choiceKey,
  );
  const pending = move.isPending || assign.isPending;
  function save() {
    if (!selected || !data) return;
    const destination = {
      hackathonId,
      roomId: selected.roomId,
      startsAt: selected.startsAt,
      acknowledgeReducedBreaks: acknowledged,
    };
    if ("appointmentId" in selection)
      move.mutate({
        ...destination,
        appointmentId: selection.appointmentId,
        expectedRevision: data.appointment.revision,
      });
    else assign.mutate({ ...destination, ...selection });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{data?.appointment.title ?? "Appointment"}</DialogTitle>
          <DialogDescription>
            {data?.appointment.challengeLabel ?? "Find a compatible opening."}
          </DialogDescription>
        </DialogHeader>
        {queryError ? (
          <p role="alert" className="text-sm text-destructive">
            {queryError.message}
          </p>
        ) : !data ? (
          <p role="status" className="text-sm">
            Finding available slots...
          </p>
        ) : (
          <>
            <div className="space-y-3 rounded-md border border-white/10 bg-background/60 p-4">
              <h3 className="font-semibold">Contact the team</h3>
              {data.members.map((member) => (
                <div key={`${member.name}:${member.email}`} className="text-sm">
                  <p className="font-semibold">{member.name}</p>
                  <a
                    className="break-all text-primary underline"
                    href={`mailto:${member.email}`}
                  >
                    {member.email}
                  </a>
                </div>
              ))}
              {!data.members.length ? (
                <p className="text-sm text-muted-foreground">
                  No team contacts were imported.
                </p>
              ) : null}
            </div>
            {data.smartChoice ? (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  const best = data.smartChoice;
                  if (best) {
                    setChoiceKey(
                      `${best.roomId}:${best.startsAt.toISOString()}`,
                    );
                    setAcknowledged(false);
                  }
                }}
              >
                Smart reassign: choose the best opening
              </Button>
            ) : (
              <p className="text-sm text-amber-200">
                No legal future opening is available. Existing appointments have
                been kept in place.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="appointment-destination">New appointment</Label>
              <select
                id="appointment-destination"
                value={selected ? choiceKey : ""}
                onChange={(event) => {
                  setChoiceKey(event.target.value);
                  setAcknowledged(false);
                }}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose an open slot</option>
                {data.choices.map((choice) => (
                  <option
                    key={`${choice.roomId}:${choice.startsAt.toISOString()}`}
                    value={`${choice.roomId}:${choice.startsAt.toISOString()}`}
                  >
                    {judgingTime(choice.startsAt, timeZone)} ·{" "}
                    {choice.buildingName} {choice.roomName}
                    {choice.reducedBreakCount ? " · Reduced travel break" : ""}
                  </option>
                ))}
              </select>
            </div>
            {selected?.reducedBreakCount ? (
              <Label className="flex items-start gap-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(value) => setAcknowledged(value === true)}
                />
                I acknowledge the shorter cross-building break. No opening with
                the full travel break exists.
              </Label>
            ) : null}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={
              pending ||
              !selected ||
              (!!selected.reducedBreakCount && !acknowledged)
            }
            onClick={save}
          >
            {pending ? "Saving..." : "Save appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
