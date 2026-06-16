import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function AcceptButton({
  hacker,
  hackathonRouteName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonRouteName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  const updateStatus = api.hackerMutation.updateHackerStatus.useMutation({
    onSuccess() {
      toast.success(
        `Accepted ${hacker.firstName} ${hacker.lastName} and sent their acceptance email!`,
      );
    },
    onError: (opts) => {
      toast.error(opts.message);
      setIsLoading(false);
    },
    onSettled: async () => {
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
      status: "accepted",
      hackathonName: hackathonRouteName,
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
