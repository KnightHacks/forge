"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { USE_CAUTION } from "@forge/consts/knight-hacks";
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

export default function DeleteHackerButton({
  hackerId,
  firstName,
  lastName,
}: {
  hackerId: string;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Our TRPC mutation for deleting a hacker
  const deleteHacker = api.hacker.deleteHacker.useMutation({
    onSuccess() {
      toast.success("Hacker successfully deleted.");
      setIsOpen(false);
      router.push("/");
    },
    onError(opts) {
      toast.error(opts.message);
    },
    onSettled() {
      setIsLoading(false);
    },
  });

  const handleDelete = () => {
    setIsLoading(true);
    deleteHacker.mutate({
      id: hackerId,
      firstName: firstName,
      lastName: lastName,
    });
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Hacker Data
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            You are about to delete your hacker profile. This action cannot be
            undone. Please proceed with caution.
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

        <DialogFooter>
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
              (USE_CAUTION as boolean)
                ? confirmationText !== "I am absolutely sure" || isLoading
                : isLoading
            }
            onClick={handleDelete}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Delete Hacker Data"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
