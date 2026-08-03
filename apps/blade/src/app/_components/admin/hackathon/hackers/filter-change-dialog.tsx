"use client";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

/**
 * Asked before a filter change that would cost selections.
 *
 * Not a speed bump: both routes forward are real work. Either drop the rows
 * that leave the view and keep the rest, or abandon the filter change and go
 * finish the action that is already part-way done.
 *
 * Never rendered when nothing would be lost — with one exception it names out
 * loud. The selection can empty while the check that produced this is still in
 * flight, and by then the question about rows is moot; what is still pending is
 * the filter itself, so the dialog says so and asks about that instead. A dialog
 * that fires with nothing at stake is how the real one gets clicked through
 * without reading.
 */
export function FilterChangeDialog({
  droppedCount,
  onCancel,
  onProceed,
  open,
  selectedCount,
}: {
  droppedCount: number;
  onCancel: () => void;
  onProceed: () => void;
  open: boolean;
  selectedCount: number;
}) {
  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-lg">
        {/*
          The selection can empty while the check that produced this is still in
          flight — a sidebar click to this same route is a soft navigation, and
          it clears the selection without cancelling the request. Rather than
          asking about rows that no longer exist ("hides 12 of your 0 selected"),
          the question becomes the one that is still true.
        */}
        <DialogHeader>
          <DialogTitle>
            {selectedCount === 0
              ? "Your selection was cleared"
              : `This filter hides ${droppedCount} of your ${selectedCount} selected`}
          </DialogTitle>
          <DialogDescription>
            {selectedCount === 0
              ? "Something cleared it while this filter was being checked, so there is nothing left to lose. Applying the filter now."
              : `Changing the filter now deselects those ${droppedCount}; the rest stay selected. Keep this filter instead and your selection is untouched, so you can finish what you started.`}
          </DialogDescription>
        </DialogHeader>

        {/*
          Two buttons, not three. The previous "finish this action first" did
          exactly what "keep the current filter" does — it only added a toast —
          and a dialog where two of three choices are the same thing is how the
          real choice gets clicked through unread.
        */}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button className="min-h-11" onClick={onCancel} variant="outline">
            {selectedCount === 0
              ? "Cancel"
              : "Keep this filter and my selection"}
          </Button>
          <Button className="min-h-11" onClick={onProceed} variant="secondary">
            {selectedCount === 0
              ? "Apply filter"
              : `Change filter, drop ${droppedCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
