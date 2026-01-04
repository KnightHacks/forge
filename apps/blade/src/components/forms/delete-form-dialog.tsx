"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function DeleteFormDialog({
  slug_name,
  onOpenChange,
}: {
  slug_name: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const utils = api.useUtils();

  const deleteForm = api.forms.deleteForm.useMutation({
    onSuccess() {
      toast.success("Form deleted");
      setIsOpen(false);
    },
    onError() {
      toast.error("Failed to delete form");
    },
    async onSettled() {
      await utils.forms.getForms.invalidate();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Form</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{slug_name}</span>? This
          action cannot be undone.
        </p>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={deleteForm.isPending}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={() => deleteForm.mutate({ slug_name })}
            disabled={deleteForm.isPending}
          >
            {deleteForm.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
