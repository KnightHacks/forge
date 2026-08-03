"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { HACKER_STATUS_LABELS } from "@forge/validators";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

const SKIP_REASONS: Record<string, string> = {
  blacklisted: "Blacklisted",
  missing: "No longer in this hackathon",
  no_email: "No email address",
};

/**
 * Preview, then confirm — the same two-step the email portal uses for a
 * campaign, because this is the same act: a lot of mail leaving at once,
 * unrecallable.
 *
 * The preview writes nothing. It exists so an officer sees exactly who is about
 * to be mailed and who is being skipped *before* committing, rather than
 * finding out from the result summary afterwards.
 */
export function BulkConfirmDialog({
  attendeeIds,
  hackathonId,
  onDone,
  onOpenChange,
  status,
}: {
  attendeeIds: string[];
  hackathonId: string;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  status: SendingStatus | null;
}) {
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);

  const preview = api.hacker.previewBulk.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const confirm = api.hacker.confirmBulk.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      const skippedNote =
        result.skipped.length > 0
          ? `, ${result.skipped.length} skipped`
          : "";
      toast.success(
        `${result.movedCount} moved${skippedNote}. The email is queued.`,
      );
      onDone();
    },
  });

  const open = status !== null;
  // Preview once per opening, keyed by status so switching action re-previews.
  if (status !== null && previewedFor !== status && !preview.isPending) {
    setPreviewedFor(status);
    preview.mutate({ attendeeIds, hackathonId, status });
  }
  if (!open && previewedFor !== null) setPreviewedFor(null);

  const result = preview.data;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {status ? HACKER_STATUS_LABELS[status] : ""}{" "}
            {result ? `${result.sending.length} applicants` : "applicants"}
          </DialogTitle>
          <DialogDescription>
            This sends each of them the configured email immediately. It cannot
            be recalled.
          </DialogDescription>
        </DialogHeader>

        {preview.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Working out who this affects…
          </p>
        ) : null}

        {result ? (
          <div className="grid gap-4">
            <div>
              <p className="font-medium">
                Will be emailed ({result.sending.length})
              </p>
              <ul className="mt-1 max-h-48 overflow-y-auto text-sm text-muted-foreground">
                {result.sending.map((row) => (
                  <li className="break-all" key={row.attendeeId}>
                    {row.name} — {row.email}
                  </li>
                ))}
              </ul>
            </div>

            {result.skipped.length > 0 ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">
                  Skipped ({result.skipped.length})
                </p>
                <ul className="mt-1 max-h-40 overflow-y-auto text-sm text-destructive/90">
                  {result.skipped.map((row) => (
                    <li key={row.attendeeId}>
                      {row.name} — {SKIP_REASONS[row.reason] ?? row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={
              confirm.isPending ||
              preview.isPending ||
              !status ||
              (result?.sending.length ?? 0) === 0
            }
            onClick={() => {
              if (status) confirm.mutate({ attendeeIds, hackathonId, status });
            }}
          >
            {confirm.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Send {result ? result.sending.length : ""} emails
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
