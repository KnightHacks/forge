import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function AcceptButton({ hacker }: { hacker: InsertHacker }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();
  const updateStatus = api.hacker.updateHackerStatus.useMutation({
    onSuccess() {
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
    <>
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Button
          className="bg-lime-600 p-2 hover:bg-lime-700"
          onClick={handleUpdateStatus}
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
      )}
    </>

  );
}
