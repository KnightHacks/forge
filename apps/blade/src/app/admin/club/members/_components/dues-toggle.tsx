"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function DuesToggleButton({
  member,
  status,
}: {
  member: InsertMember;
  status: boolean;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const utils = api.useUtils();
  const createDues = api.member.createDuesPayingMember.useMutation({
    onSuccess() {
      toast.success("Toggled member dues successfully!");
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.member.invalidate();
      setIsLoading(false);
    },
  });

  const deleteDues = api.member.deleteDuesPayingMember.useMutation({
    onSuccess() {
      toast.success("Toggled member dues successfully!");
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.member.invalidate();
      setIsLoading(false);
    },
  });

  const toggleDues = () => {
    setIsLoading(true);

    if (status) {
      deleteDues.mutate({
        id: member.id,
      });
    } else {
      createDues.mutate({
        id: member.id,
      });
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleDues}
      className={
        status
          ? "bg-yellow-500 hover:bg-yellow-600"
          : "bg-lime-600 hover:bg-lime-700"
      }
    >
      {isLoading ? (
        <Loader2 className="animate-spin text-white" />
      ) : status ? (
        <X className="text-white" />
      ) : (
        <Check className="text-white" />
      )}
    </Button>
  );
}
