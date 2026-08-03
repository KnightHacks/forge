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
  onFinishFirst,
  onProceed,
  open,
  selectedCount,
}: {
  droppedCount: number;
  onCancel: () => void;
  onFinishFirst: () => void;
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
            Changing the filter now deselects those {droppedCount}. The rest
            stay selected. Or finish what you started first — the whole
            selection carries over to the confirmation step.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button className="min-h-11" onClick={onCancel} variant="outline">
            Keep the current filter
          </Button>
          <Button className="min-h-11" onClick={onProceed} variant="secondary">
            Change anyway, drop {droppedCount}
          </Button>
          <Button className="min-h-11" onClick={onFinishFirst}>
            Finish this action first
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
