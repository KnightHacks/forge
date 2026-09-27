/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { useEvaluationAutosave } from "~/lib/judging/use-evaluation-autosave";

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("~/trpc/react", () => ({
  api: {
    judging: {
      saveEvaluationDraft: {
        useMutation: () => ({ mutateAsync, isPending: false }),
      },
    },
  },
}));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("evaluation draft recovery", () => {
  it("backs off repeated autosave failures, stops automatic retries and lets a manual retry preserve the answers", async () => {
    vi.useFakeTimers();
    mutateAsync.mockRejectedValue(
      new Error("Saved answers changed in another window."),
    );
    const input = {
      projectId: "project",
      ratings: [],
      responses: [
        { itemId: "feedback", value: "Keep my notes", isPublic: false },
      ],
    };
    const editor: RouterOutputs["judging"]["getEvaluationEditor"] = {
      serverNow: new Date(),
      appointmentId: null,
      deadlineAt: null,
      lockAt: null,
      evaluationId: null,
      evaluationRevision: 0,
      isComplete: false,
      canEdit: true,
      reason: null,
      timed: false,
      draft: null,
    };
    const { result } = renderHook(() =>
      useEvaluationAutosave(input, editor, true),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(mutateAsync).toHaveBeenCalledTimes(5);
    expect(result.current.status).toBe("error");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(mutateAsync).toHaveBeenCalledTimes(5);
    mutateAsync.mockResolvedValue({
      revision: 1,
      updatedAt: new Date(),
      deadlineAt: null,
    });
    await act(async () => {
      await result.current.flush();
    });
    expect(mutateAsync).toHaveBeenLastCalledWith({
      ...input,
      expectedDraftRevision: 0,
    });
    expect(result.current.status).toBe("saved");
  });
});
