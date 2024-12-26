"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

// eslint-disable-next-line prefer-const
let extraCaution = false;
interface DeleteEventButtonProps {
  event: {
    id: string;
    discordId: string;
    name: string;
  };
}

export function DeleteEventButton({ event }: DeleteEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  // Our TRPC mutation for deleting the event
  const deleteEvent = api.event.deleteEvent.useMutation({
    onSuccess() {
      toast.success("Event deleted successfully!");
      setIsOpen(false);
      setConfirmationText("");
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      setIsLoading(false);
      // Invalidate or refetch your events list so UI updates
      await utils.event.invalidate();
    },
  });

  const handleDelete = () => {
    setIsLoading(true);
    deleteEvent.mutate({ id: event.id, discordId: event.discordId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            You are about to delete the <strong>{event.name}</strong> event.
            This action cannot be undone. Please proceed with caution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p>
            Please type <strong>"I am absolutely sure"</strong> to confirm
            deletion:
          </p>
          <Input
            placeholder='Type "I am absolutely sure"'
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setConfirmationText("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              extraCaution
                ? confirmationText !== "I am absolutely sure" || isLoading
                : isLoading
            }
            onClick={handleDelete}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Delete Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
