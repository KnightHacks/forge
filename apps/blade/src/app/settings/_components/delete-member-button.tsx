"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { USE_CAUTION } from '@forge/consts';

/**
 * Renders a button that opens a confirmation dialog to delete a member and performs the deletion.
 *
 * The dialog requires typing the exact confirmation phrase when extra caution is enabled. On successful deletion the component shows a success toast, closes the dialog, and navigates to the application root; on failure it shows an error toast.
 *
 * @param memberId - The unique identifier of the member to delete.
 * @param firstName - The member's first name (unused by the component but available for callers).
 * @param lastName - The member's last name (unused by the component but available for callers).
 * @returns The DeleteMemberButton React element.
 */
export default function DeleteMemberButton({
  memberId,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Our TRPC mutation for deleting the event
  const deleteMember = api.member.deleteMember.useMutation({
    onSuccess() {
      toast.success("Member successfully deleted.");
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
    deleteMember.mutate({
      id: memberId,
    });
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Membership
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            You are about to delete your membership profile. This action cannot
            be undone. Please proceed with caution.
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
              "Delete Membership"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}