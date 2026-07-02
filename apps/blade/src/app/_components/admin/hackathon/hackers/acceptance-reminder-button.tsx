import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

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

export default function AcceptanceReminderButton({
  hacker,
  hackathonRouteName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonRouteName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sendHackathonEmail = api.email.sendHackathonEmail.useMutation({
    onSuccess: () => {
      toast.success(
        `Acceptance reminder sent to ${hacker.firstName} ${hacker.lastName}!`,
      );
      setIsOpen(false);
    },
    onError: (opts) => {
      toast.error(opts.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSendReminder = () => {
    setIsLoading(true);
    sendHackathonEmail.mutate({
      from: "donotreply@knighthacks.org",
      hackathonName: hackathonRouteName,
      kind: "AcceptedReminder",
      recipientName: hacker.firstName,
      to: hacker.email,
    });
  };

  const disabled = hacker.status !== "accepted" || !hackathonRouteName;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-amber-500 p-2 hover:bg-amber-600"
          disabled={disabled}
          title="Send acceptance reminder"
          aria-label={`Send acceptance reminder to ${hacker.firstName} ${hacker.lastName}`}
        >
          <MailCheck className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Send Acceptance Reminder
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-md">
          Send an acceptance reminder email to {hacker.firstName}{" "}
          {hacker.lastName} at {hacker.email}. This uses a separate reminder
          email kind from the original acceptance email.
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
            <Button onClick={handleSendReminder}>Send Reminder</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
