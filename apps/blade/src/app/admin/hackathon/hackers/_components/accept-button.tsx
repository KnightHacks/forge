import { useState } from "react";
import { render } from "@react-email/render";
import { Check, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { GemiKnightsAcceptanceEmail } from "./gemiknights-acceptance-email";

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

  const handleUpdateStatus = async () => {
    setIsLoading(true);

    updateStatus.mutate({
      id: hacker.id ?? "",
      status: "accepted",
      hackathonName,
    });

    const html = await render(
      <GemiKnightsAcceptanceEmail
        name={`${hacker.firstName} ${hacker.lastName}`}
      />,
    );

    sendEmail.mutate({
      from: "donotreply@knighthacks.org",
      to: hacker.email,
      subject: "GemiKnights 2025 - You're Accepted! Confirm your spot!",
      body: html,
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
