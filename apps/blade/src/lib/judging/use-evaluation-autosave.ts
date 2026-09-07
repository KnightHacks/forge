"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RouterInputs, RouterOutputs } from "@forge/api";

import { api } from "~/trpc/react";

type Draft = RouterInputs["judging"]["saveEvaluationDraft"];
type Editor = RouterOutputs["judging"]["getEvaluationEditor"];

/** Serial saves preserve revision ordering when typing outpaces the network. */
export function useEvaluationAutosave(
  input: Omit<Draft, "expectedDraftRevision">,
  editor: Editor,
  enabled: boolean,
) {
  const mutation = api.judging.saveEvaluationDraft.useMutation();
  const mutateAsync = mutation.mutateAsync;
  const revision = useRef(editor.draft?.revision ?? 0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const failures = useRef(0);
  const retryAfter = useRef(0);
  const lastSaved = useRef<string | null>(null);
  const [state, setState] = useState<{
    status: "saved" | "saving" | "error";
    message: string;
  }>({
    status: "saved",
    message: editor.draft
      ? "Saved progress restored"
      : "Progress saves as you type",
  });
  const serialized = JSON.stringify(input);
  const persist = useCallback(
    async (automatic = false) => {
      const operation = queue.current
        .catch(() => undefined)
        .then(async () => {
          if (
            automatic &&
            (failures.current >= 5 || Date.now() < retryAfter.current)
          )
            return;
          if (lastSaved.current === serialized) return;
          setState({ status: "saving", message: "Saving progress..." });
          try {
            const saved = await mutateAsync({
              ...input,
              expectedDraftRevision: revision.current,
            });
            failures.current = 0;
            retryAfter.current = 0;
            revision.current = saved.revision;
            lastSaved.current = serialized;
            setState({ status: "saved", message: "Progress saved" });
          } catch (error) {
            failures.current += 1;
            retryAfter.current =
              Date.now() + Math.min(30_000, 1000 * 2 ** failures.current);
            setState({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Progress could not be saved. Keep this window open and retry.",
            });
            throw error;
          }
        });
      queue.current = operation;
      await operation;
    },
    [input, mutateAsync, serialized],
  );
  const latestPersist = useRef(persist);
  useEffect(() => {
    latestPersist.current = persist;
  }, [persist]);
  // Continuous typing must reach the server before the fixed deadline too.
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      if (failures.current < 5 && Date.now() >= retryAfter.current)
        void latestPersist.current(true).catch(() => undefined);
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const timeout = window.setTimeout(() => {
      if (failures.current < 5 && Date.now() >= retryAfter.current)
        void persist(true).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [enabled, persist]);
  return { ...state, flush: persist, pending: mutation.isPending };
}
