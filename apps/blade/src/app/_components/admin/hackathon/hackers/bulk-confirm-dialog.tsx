"use client";

import { useEffect } from "react";
import { Loader2, Send } from "lucide-react";

import type { SkipReason } from "@forge/validators";
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
import { HACKER_STATUS_LABELS } from "@forge/validators";

import { api } from "~/trpc/react";

type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

/**
 * Read through a widening helper, the same way `hacker-table.tsx` reads status
 * labels.
 *
 * The map stays exhaustive over the union so a new reason fails the build. But
 * `row.reason` arrives over the wire, so a tab left open across a release that
 * adds one holds a value the union does not have — and indexing directly gave
 * `undefined`, which React renders as nothing. A blank explanation on the one
 * list whose job is saying who was *not* mailed is worse than an ugly one.
 */
export function skipLabel(reason: string | null) {
  if (reason === null) return "Requires officer review";
  // `hasOwn`, not `in`: `in` walks the prototype, so `"toString"` would pass the
  // guard and return a function, which React refuses to render — an error
  // boundary in place of the fallback this helper exists to provide.
  return Object.hasOwn(SKIP_REASONS, reason)
    ? SKIP_REASONS[reason as SkipReason]
    : "Skipped — reload for details";
}

/*
  Keyed by the shared union rather than `string`, so adding a reason in
  `@forge/validators` fails the build here instead of rendering its raw slug to
  an officer. A previous round shipped exactly that: `already` was missing, and
  the fallback printed "already" in the skipped list.

  Note the guarantee needs the whole build — `@forge/validators` resolves through
  its compiled `dist`, so a filtered typecheck of this app alone will not see a
  newly added member.
*/
const SKIP_REASONS: Record<SkipReason, string> = {
  already: "Already has this status",
  blacklisted: "Blacklisted",
  checked_in: "Already checked into this hackathon",
  duplicate_email: "Shares an email with another selected applicant",
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
  const preview = api.hacker.previewBulk.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const confirm = api.hacker.confirmBulk.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      const skippedNote =
        result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : "";
      // The withheld note only ever appears outside production, where sends are
      // narrowed to the team. Saying "queued" with nothing queued is how a live
      // test looked successful and mailed nobody.
      const withheldNote = result.withheldCount
        ? ` Email withheld for ${result.withheldCount} — this environment only sends to the team.`
        : " The email is queued.";
      toast.success(`${result.movedCount} moved${skippedNote}.${withheldNote}`);
      onDone();
    },
  });

  const open = status !== null;

  // An effect, not a render-phase call. `previewBulk` is a network request, and
  // firing it during render means StrictMode's double-invoke sends it twice —
  // and a render discarded by a parent transition sends it anyway. The
  // `isPending` guard could not see either, because it reads a render-time
  // snapshot.
  const { mutate: runPreview, reset: resetPreview } = preview;
  /**
   * The selection's contents, as a value the dependency array can compare.
   *
   * The caller must hand this component a memoised array — `hacker-roster.tsx`
   * does, via `selectedIds`. Inlined as `[...selection.selected]` it is a fresh
   * identity every parent render, and the effect below would re-fire a
   * `previewBulk` each time, blanking the list an officer is reading in a dialog
   * that cannot be recalled. `idsKey` does not save that case; it exists so a
   * *content* change re-fires even when identity happens not to move.
   */
  const idsKey = attendeeIds.join(",");
  useEffect(() => {
    if (status === null) {
      resetPreview();
      return;
    }
    // `previewBulk` requires at least one id. If the selection empties while
    // this is open the request fails validation, the dialog shows a Zod string
    // in place of the preview, and retrying fails the same way — so it says
    // what happened instead.
    if (attendeeIds.length === 0) {
      resetPreview();
      return;
    }
    runPreview({ attendeeIds, hackathonId, status });
  }, [attendeeIds, hackathonId, idsKey, resetPreview, runPreview, status]);

  const result = preview.data;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {status ? HACKER_STATUS_LABELS[status] : ""}{" "}
            {result ? `${result.sending.length} applicants` : "applicants…"}
          </DialogTitle>
          <DialogDescription>
            This sends each of them the configured email immediately. It cannot
            be recalled.
          </DialogDescription>
        </DialogHeader>

        {preview.isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{preview.error.message}</p>
            <Button
              className="mt-2 min-h-11"
              onClick={() => {
                if (status) runPreview({ attendeeIds, hackathonId, status });
              }}
              size="sm"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : null}

        {attendeeIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is selected any more. Close this and pick the applicants
            again.
          </p>
        ) : null}

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
                      {row.name} — {skipLabel(row.reason)}
                      {row.email ? ` (${row.email})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
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
            {result ? `Send ${result.sending.length} emails` : "Send emails"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
