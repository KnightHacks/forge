import { useState } from "react";
import { Gavel, Loader2 } from "lucide-react";

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

export default function BlacklistButton({
  hacker,
  hackathonRouteName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonRouteName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();
  const sendHackathonEmail = api.email.sendHackathonEmail.useMutation({
    onSuccess: () => {
      toast.success(
        `Blacklist email sent to ${hacker.firstName} ${hacker.lastName}!`,
      );
    },
    onError: (opts) => {
      toast.error(opts.message);
    },
  });

  const updateStatus = api.hackerMutation.updateHackerStatus.useMutation({
    onSuccess() {
      toast.success(
        `Denied ${hacker.firstName} ${hacker.lastName} successfully!`,
      );
      sendHackathonEmail.mutate({
        from: "donotreply@knighthacks.org",
        hackathonName: hackathonRouteName,
        kind: "Blacklist",
        recipientName: hacker.firstName,
        to: hacker.email,
      });
      setIsOpen(false);
    },
    onError(opts) {
      toast.error(opts.message);
      setIsLoading(false);
    },
    async onSettled() {
      await Promise.all([
        utils.hackerQuery.invalidate(),
        utils.hackerPagination.invalidate(),
        utils.hackerMutation.invalidate(),
      ]);
      setIsLoading(false);
    },
  });

  const handleUpdateStatus = () => {
    setIsLoading(true);
    updateStatus.mutate({
      id: hacker.id ?? "",
      status: "denied",
      hackathonName: hackathonRouteName,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="bg-[#1A001A] p-2 transition duration-300 ease-in-out hover:bg-[#2D0A31] hover:shadow-[0_0_20px_4px_rgba(128,0,128,0.7)]"
          disabled={
            hacker.status === "denied" ||
            hacker.status === "confirmed" ||
            hacker.status === "checkedin"
              ? true
              : false
          }
        >
          <Gavel className="h-6 w-6 text-white" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Denial</DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-md">
          Please confirm the{" "}
          <b className="text-[rgba(128,0,128,0.7)]">BLACKLIST DENIAL</b> of{" "}
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
