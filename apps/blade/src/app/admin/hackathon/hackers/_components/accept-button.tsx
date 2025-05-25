import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
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
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function AcceptButton({ hacker }: { hacker: InsertHacker }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();
  const updateStatus = api.hacker.updateHackerStatus.useMutation({
    onSuccess() {
      setIsOpen(false);
      toast.success(
        `Accepted ${hacker.firstName} ${hacker.lastName} successfully!`,
      );
    },
    onError(opts) {
      toast.error(opts.message);
      setIsLoading(false);
    },
    async onSettled() {
      await utils.hacker.invalidate();
      setIsLoading(false);
    },
  });

  const sendEmail = api.email.sendEmail.useMutation({
    onSuccess: () => {
      toast.success(
        `Acceptance email sent to ${hacker.firstName} ${hacker.lastName}!`,
      );
    },
    onError: (opts) => {
      toast.error(opts.message);
    },
  });

  const handleUpdateStatus = () => {
    setIsLoading(true);

    updateStatus.mutate({
      id: hacker.id,
      status: "accepted",
    });

    sendEmail.mutate({
      from: "donotreply@knighthacks.org",
      to: hacker.email,
      subject: "You have been accepted to Knight Hacks!",
      body: "<h1>you made it<h1>", // change..
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-lime-600 p-2 hover:bg-lime-700"
          disabled={
            hacker.status === "accepted" ||
            hacker.status === "confirmed" ||
            hacker.status === "checkedin"
              ? true
              : false
          }
        >
          <Check className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Acceptance</DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-md">
          Please confirm the <b className="text-lime-500">ACCEPTANCE</b> of{" "}
          {hacker.firstName} {hacker.lastName}.
        </DialogDescription>

        <DialogFooter className="flex flex-row items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Button onClick={handleUpdateStatus}>Confirm</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
