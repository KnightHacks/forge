"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { EVENTS } from "@forge/consts";
import { CLUB } from "@forge/consts";
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

interface DeleteEventButtonProps {
  event: {
    id: string;
    discordId: string;
    googleId: string;
    name: string;
    tag: (typeof EVENTS.EVENT_TAGS)[number];
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
    deleteEvent.mutate({
      id: event.id,
      discordId: event.discordId,
      googleId: event.googleId,
      name: event.name,
      tag: event.tag,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
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
            onPaste={(e) => {
              e.preventDefault();
              toast.info("Please type in the text, do not paste.");
            }}
          />
        </div>

        <DialogFooter className="flex flex-row justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setConfirmationText("");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              (CLUB.USE_CAUTION as boolean)
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
