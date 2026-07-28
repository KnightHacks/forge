"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";

export function FormDeleteDialog({
  deletePending,
  onCancel,
  onDelete,
  onOpenChange,
  open,
}: {
  deletePending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-destructive/30">
        <DialogHeader>
          <DialogTitle>Delete form?</DialogTitle>
          <DialogDescription>
            This is only allowed when the form has no responses. Forms with
            retained responses should be archived instead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">
            This permanently removes the form definition and cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={deletePending}
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" /> Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
