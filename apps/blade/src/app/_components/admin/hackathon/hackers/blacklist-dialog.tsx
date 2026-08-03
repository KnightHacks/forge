"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Hacker = RouterOutputs["hacker"]["listForHackathon"]["hackers"][number];

export function BlacklistDialog({
  hacker,
  onOpenChange,
  onSaved,
}: {
  hacker: Hacker | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Re-seed per applicant, so one person's reason cannot follow another.
  if (hacker && seededFor !== hacker.attendeeId) {
    setSeededFor(hacker.attendeeId);
    setReason("");
  }
  if (!hacker && seededFor !== null) setSeededFor(null);

  const save = api.hacker.setBlacklist.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      toast.success(
        result.blacklisted ? "Applicant blacklisted." : "Blacklist removed.",
      );
      onSaved();
    },
  });

  const removing = hacker?.blacklisted === true;

  return (
    <Dialog onOpenChange={onOpenChange} open={hacker !== null}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words leading-tight">
            {removing ? "Remove blacklist from" : "Blacklist"} {hacker?.name}?
          </DialogTitle>
          <DialogDescription>
            {removing
              ? "They become acceptable again. Their status does not change."
              : "This does not change their status and sends no email. They stay where they are in the funnel and are never told. It only stops them being accepted by accident."}
          </DialogDescription>
        </DialogHeader>

        {removing ? null : (
          <div className="grid gap-2">
            <Label htmlFor="blacklist-reason">Reason</Label>
            <Textarea
              id="blacklist-reason"
              // Matches the server's `.max(500)` so an over-long paste cannot
              // reach Zod and surface as a raw error blob.
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why should this applicant not be accepted?"
              value={reason}
            />
            <p className="text-sm text-muted-foreground">
              Required, and visible only here. A year from now this is the only
              thing that explains the flag to whoever inherits it.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={
              save.isPending || !hacker || (!removing && reason.trim() === "")
            }
            onClick={() => {
              if (!hacker) return;
              if (removing) {
                save.mutate({
                  attendeeId: hacker.attendeeId,
                  blacklisted: false,
                });
              } else {
                save.mutate({
                  attendeeId: hacker.attendeeId,
                  blacklisted: true,
                  reason,
                });
              }
            }}
            variant={removing ? "primary" : "destructive"}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {removing ? "Remove blacklist" : "Blacklist applicant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
