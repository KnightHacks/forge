"use client";

import { useState } from "react";

import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function useEmailRecovery() {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const utils = api.useUtils();
  const queue = api.email.listRecoveryQueue.useQuery(
    { query, offset, limit: 25 },
    { refetchInterval: 30_000 },
  );
  const investigate = api.email.investigateSend.useMutation();
  const retry = api.email.retryRecipients.useMutation({
    async onSuccess(result) {
      toast.success(
        `${result.recipientCount} recipient retries queued. Follow the new send in this queue.`,
      );
      investigate.reset();
      await utils.email.listRecoveryQueue.invalidate();
    },
  });
  const retryPreparation = api.email.retrySend.useMutation({
    async onSuccess() {
      toast.success("Preparation retry queued.");
      await utils.email.listRecoveryQueue.invalidate();
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  return {
    query,
    offset,
    queue,
    investigate,
    retry,
    retryPreparation,
    search(value: string) {
      setQuery(value);
      setOffset(0);
    },
    setOffset,
  };
}
