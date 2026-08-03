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
 * Never rendered when nothing would be lost. A dialog that fires with nothing
 * at stake is how the real one gets clicked through without reading.
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
        <DialogHeader>
          <DialogTitle>
            This filter hides {droppedCount} of your {selectedCount} selected
          </DialogTitle>
          <DialogDescription>
            Changing the filter now deselects those {droppedCount}; the rest
            stay selected. Keep this filter instead and your selection is
            untouched, so you can finish what you started.
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
            Keep this filter and my selection
          </Button>
          <Button className="min-h-11" onClick={onProceed} variant="secondary">
            Change filter, drop {droppedCount}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
