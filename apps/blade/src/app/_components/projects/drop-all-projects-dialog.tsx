"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

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
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function DropAllProjectsDialog({
  hackathonId,
  hackathonName,
  onDropped,
  projectCount,
}: {
  hackathonId: string;
  hackathonName: string;
  onDropped: () => void;
  projectCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const dropAll = api.projects.dropAll.useMutation({
    onSuccess(result) {
      toast.success(
        `Permanently deleted ${result.projectCount} project${result.projectCount === 1 ? "" : "s"} from ${hackathonName}.`,
      );
      setOpen(false);
      setConfirmation("");
      onDropped();
    },
    onError(error) {
      toast.error(
        error.message || "The project inventory could not be deleted.",
      );
    },
  });

  function close() {
    if (dropAll.isPending) return;
    setOpen(false);
    setConfirmation("");
  }

  return (
    <>
      <Button
        className="h-11 gap-2"
        disabled={projectCount === 0}
        onClick={() => setOpen(true)}
        type="button"
        variant="destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Drop all projects
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}
      >
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-xl overflow-y-auto border-destructive/30 bg-card/95 motion-reduce:animate-none">
          <DialogHeader className="text-left">
            <DialogTitle>Permanently delete all projects?</DialogTitle>
            <DialogDescription className="leading-6">
              This permanently deletes all {projectCount} active and deleted
              projects for {hackathonName}, including team contacts and imported
              challenges. The hackathon itself stays in Forge. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border border-destructive/25 bg-destructive/10 p-4">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                Type <span className="font-semibold">{hackathonName}</span> to
                confirm.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drop-project-inventory-confirmation">
                Hackathon name
              </Label>
              <Input
                autoComplete="off"
                id="drop-project-inventory-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  toast.info(
                    "Please type the hackathon name instead of pasting it.",
                  );
                }}
                placeholder={hackathonName}
                value={confirmation}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={dropAll.isPending}
              onClick={close}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={confirmation !== hackathonName || dropAll.isPending}
              onClick={() => dropAll.mutate({ confirmation, hackathonId })}
              type="button"
              variant="destructive"
            >
              {dropAll.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Permanently deleting projects
                </>
              ) : (
                "Permanently delete projects"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
