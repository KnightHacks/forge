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
import { USE_CAUTION } from '@forge/consts';

/**
 * Render a destructive button that opens a confirmation dialog to delete a member.
 *
 * The dialog displays the member's name, requires typing the exact confirmation phrase
 * (paste is prevented), and shows a loading state while the deletion is in progress.
 * On success a success toast is shown and the dialog resets and closes; on error an error toast is shown.
 * The member cache is invalidated after the mutation settles.
 *
 * @param member - The member to delete; must include `id`, `firstName`, and `lastName` for identification and display.
 * @returns The JSX element for the delete button and its confirmation dialog.
 */
export default function DeleteMemberButton({
  member,
}: {
  member: { id: string; firstName: string; lastName: string };
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();

  const deleteMember = api.member.deleteMember.useMutation({
    onSuccess() {
      toast.success("Member deleted successfully!");
      setIsOpen(false);
      setConfirm("");
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      setIsLoading(false);
      await utils.member.invalidate();
    },
  });

  const handleDelete = async () => {
    setIsLoading(true);
    await deleteMember.mutateAsync({
      id: member.id,
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
            You are about to delete the member{" "}
            <b>
              {member.firstName} {member.lastName}
            </b>
            . This action cannot be undone. Please proceed with caution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p>
            Please type <b>"I am absolutely sure"</b> to confirm deletion:
          </p>
          <Input
            placeholder='Type "I am absolutely sure"'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              toast.info("Please type in the text, do not paste.");
            }}
          />
        </div>

        <DialogFooter className="flex flex-row items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setConfirm("");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Button
              variant="destructive"
              disabled={
                (USE_CAUTION as boolean)
                  ? confirm !== "I am absolutely sure" || isLoading
                  : isLoading
              }
              onClick={handleDelete}
            >
              Delete Member
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}