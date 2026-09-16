"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

export function JudgingLiveUpdates({ hackathonId }: { hackathonId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { reset } = api.judging.onChange.useSubscription(
    { hackathonId },
    {
      onData() {
        // The initial event also repairs anything missed while disconnected.
        if (!navigator.onLine) return;
        void utils.judging.invalidate();
        void utils.projects.invalidate();
        router.refresh();
      },
      onError(error) {
        if (
          navigator.onLine &&
          (error.data?.code === "UNAUTHORIZED" ||
            error.data?.code === "FORBIDDEN")
        ) {
          router.refresh();
        }
      },
    },
  );
  useEffect(() => {
    // Reconnect immediately when the browser returns, even during retry backoff.
    window.addEventListener("online", reset);
    return () => window.removeEventListener("online", reset);
  }, [reset]);
  return null;
}
