import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { HACKATHON_TEMPLATE_IDS } from "@forge/email/client";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function AcceptButton({
  hacker,
  hackathonName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  const updateStatus = api.hacker.updateHackerStatus.useMutation({
    onSuccess() {
      toast.success(`Accepted ${hacker.firstName} ${hacker.lastName}!`);
    },
    onError: (opts) => {
      toast.error(opts.message);
      setIsLoading(false);
    },
    onSettled: async () => {
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
      id: hacker.id ?? "",
      status: "accepted",
      hackathonName,
    });

    sendEmail.mutate({
      from: "donotreply@knighthacks.org",
      to: hacker.email,
      subject: `[ACTION REQUIRED] ${hackathonName} Acceptance Information!`,
      template_id: HACKATHON_TEMPLATE_IDS.Accepted,
      data: {
        name: hacker.firstName,
        hackathon: hackathonName,
      },
    });
  };

  const disabled =
    hacker.status === "accepted" ||
    hacker.status === "confirmed" ||
    hacker.status === "checkedin";

  return isLoading ? (
    <Loader2 className="animate-spin" />
  ) : (
    <Button
      className="bg-lime-600 p-2 hover:bg-lime-700"
      onClick={handleUpdateStatus}
      disabled={disabled}
    >
      <Check className="h-6 w-6" />
    </Button>
  );
}
