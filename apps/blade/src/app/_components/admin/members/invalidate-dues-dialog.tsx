"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { toast } from "@forge/ui/toast";
import {
  ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
  ADMIN_MEMBER_DUES_SECOND_CONFIRMATION,
} from "@forge/validators";

import { api } from "~/trpc/react";

export function InvalidateDuesDialog({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmation, setConfirmation] = useState("");
  const invalidate = api.member.invalidateEffectiveDues.useMutation({
    onSuccess(result) {
      toast.success(
        `Invalidated effective dues for ${result.affected} member${result.affected === 1 ? "" : "s"}.`,
      );
      setOpen(false);
      setStep(1);
      setConfirmation("");
      onComplete();
    },
    onError(error) {
      toast.error(error.message || "Effective dues could not be invalidated.");
    },
  });

  const expected =
    step === 2
      ? ADMIN_MEMBER_DUES_SECOND_CONFIRMATION
      : ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION;
  const close = () => {
    if (invalidate.isPending) return;
    setOpen(false);
    setStep(1);
    setConfirmation("");
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="h-11 gap-2"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-4 w-4" />
        Invalidate all dues
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-xl overflow-y-auto border-destructive/30 bg-card/95 motion-reduce:animate-none">
          <DialogHeader>
            <DialogTitle>
              {step === 1
                ? "Are you sure?"
                : step === 2
                  ? "Are you really sure?"
                  : "Please be sure."}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {step === 1
                ? "This marks every dues payment that currently grants paid status as inactive. Payment records remain in history, but every affected member becomes unpaid."
                : step === 2
                  ? "This is not for changing one member. It invalidates effective dues across the organization. Type the sentence below to continue."
                  : "This action changes every currently paid member at once. Type the final sentence exactly before invalidating dues."}
            </DialogDescription>
          </DialogHeader>

          {step > 1 && (
            <div className="space-y-3 rounded-md border border-destructive/25 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">{expected}</p>
              <Input
                aria-label={
                  step === 2 ? "Second confirmation" : "Final confirmation"
                }
                value={confirmation}
                placeholder="Type the sentence exactly"
                onChange={(event) => setConfirmation(event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  toast.info(
                    "Please type the confirmation instead of pasting it.",
                  );
                }}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={invalidate.isPending}
              onClick={close}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                variant="destructive"
                disabled={step === 2 && confirmation !== expected}
                onClick={() => {
                  setStep(step === 1 ? 2 : 3);
                  setConfirmation("");
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={confirmation !== expected || invalidate.isPending}
                onClick={() =>
                  invalidate.mutate({
                    confirmation: ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
                  })
                }
              >
                {invalidate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Invalidate effective dues"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
