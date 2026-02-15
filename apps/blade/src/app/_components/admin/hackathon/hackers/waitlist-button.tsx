import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { HACKATHON_TEMPLATE_IDS } from "@forge/email/client";
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

export default function WaitlistButton({
  hacker,
  hackathonName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonName: string;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();
  const updateStatus = api.hacker.updateHackerStatus.useMutation({
    onSuccess() {
      toast.success(
        `Waitlisted ${hacker.firstName} ${hacker.lastName} successfully!`,
      );
      setIsOpen(false);
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
        `Waitlisting email sent to ${hacker.firstName} ${hacker.lastName}!`,
      );
    },
    onError: (opts) => {
      toast.error(opts.message);
    },
  });

  const handleUpdateStatus = () => {
    setIsLoading(true);
    updateStatus.mutate({
      id: hacker.id ?? "",
      status: "waitlisted",
      hackathonName,
    });

    sendEmail.mutate({
      from: "donotreply@knighthacks.org",
      to: hacker.email,
      subject: `${hackathonName} Waitlist Information`,
      template_id: HACKATHON_TEMPLATE_IDS.Waitlist,
      data: {
        name: hacker.firstName,
        hackathon: hackathonName,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-[#4D96FF] p-2 hover:bg-[#3D78CC]"
          disabled={
            hacker.status === "waitlisted" ||
            hacker.status === "confirmed" ||
            hacker.status === "checkedin"
              ? true
              : false
          }
        >
          <ClipboardList className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Waitlisting</DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-md">
          Please confirm the <b className="text-[#4D96FF]">WAITLISTING</b> of{" "}
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
