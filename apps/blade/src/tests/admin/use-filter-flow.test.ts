/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FilterFlowDeps,
  FilterFlowState,
} from "~/app/_components/admin/hackathon/hackers/use-filter-flow";
import {
  SEARCH_DEBOUNCE_MS,
  useFilterFlow,
} from "~/app/_components/admin/hackathon/hackers/use-filter-flow";

/**
 * The roster's filter flow, driven directly.
 *
 * Four consecutive review rounds found a regression in this logic, each one
 * inside the fix for the previous round, and every one of them shipped green
 * because nothing rendered the component it lived in. All four were about
 * *interleaving*: a survival response landing after a later one, a commit
 * recorded before the URL caught up, two commits landing one after the other.
 * None of it is reachable without controlling when each promise settles, which
 * is why the dependencies are injected and the responses are deferred here.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

interface Harness {
  deps: FilterFlowDeps;
  /** Every patch that actually reached the URL, in order. */
  applied: Record<string, unknown>[];
  pending: ReturnType<typeof deferred<{ droppedIds: string[] }>>[];
  result: { current: FilterFlowState };
  /** Simulates the server responding: the URL now holds this search term. */
  land: (search: string) => void;
}

function setup(options?: { selected?: number; urlSearch?: string }): Harness {
  const applied: Record<string, unknown>[] = [];
  const pending: ReturnType<typeof deferred<{ droppedIds: string[] }>>[] = [];
  let urlSearch = options?.urlSearch ?? "";
  const selected = options?.selected ?? 0;

  const deps: FilterFlowDeps = {
    checkSurvival: () => {
      const next = deferred<{ droppedIds: string[] }>();
      pending.push(next);
      return next.promise;
    },
    onCheckFailed: vi.fn(),
    selectedCount: () => selected,
    setFilter: (patch) => {
      applied.push(patch);
      return true;
    },
    urlSearch,
    wouldMove: () => true,
  };

  const { rerender, result } = renderHook(
    (props: FilterFlowDeps) => useFilterFlow(props),
    { initialProps: deps },
  );

  return {
    applied,
    deps,
    land: (search: string) => {
      urlSearch = search;
      act(() => rerender({ ...deps, urlSearch }));
    },
    pending,
    result,
  };
}

/** Runs the 350 ms debounce and lets the resulting promise chain settle. */
async function settleDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useFilterFlow", () => {
  describe("the search box, with nothing selected", () => {
    it("commits a trimmed term after the pause", async () => {
      const h = setup();

      act(() => h.result.current.setSearch("john "));
      await settleDebounce();

      // Trimmed, because the schema trims. Holding the raw text meant `"john "`
      // never matched the `"john"` that came back.
      expect(h.applied).toEqual([{ search: "john" }]);
    });

    it("keeps text typed while the commit is still in flight", async () => {
      const h = setup();

      act(() => h.result.current.setSearch("john"));
      await settleDebounce();
      act(() => h.result.current.setSearch("john smith"));

      // The URL has not caught up yet. The box must not be touched.
      expect(h.result.current.search).toBe("john smith");
      h.land("john");
      expect(h.result.current.search).toBe("john smith");
    });

    /**
     * Round 7's regression. Two commits inside one navigation window land one
     * after the other, and the first landing is not the latest term — a single
     * "last sent" string called it foreign and rewound the box mid-word.
     */
    it("does not rewind when the first of two commits lands", async () => {
      const h = setup();

      act(() => h.result.current.setSearch("john"));
      await settleDebounce();
      act(() => h.result.current.setSearch("john smith"));
      await settleDebounce();
      act(() => h.result.current.setSearch("john smithe"));

      h.land("john");
      expect(h.result.current.search).toBe("john smithe");
      h.land("john smith");
      expect(h.result.current.search).toBe("john smithe");
    });

    /**
     * Round 8's regression. A chain can revisit a term — "john" → "johnny" →
     * "john" — and treating membership as ownership let the first landing clear
     * the whole claim, after which the rest were foreign and rewrote the box.
     */
    it("survives a chain that returns to an earlier term", async () => {
      const h = setup();

      act(() => h.result.current.setSearch("john"));
      await settleDebounce();
      act(() => h.result.current.setSearch("johnny"));
      await settleDebounce();
      act(() => h.result.current.setSearch("john"));
      await settleDebounce();
      act(() => h.result.current.setSearch("john s"));

      h.land("john");
      h.land("johnny");
      h.land("john");
      expect(h.result.current.search).toBe("john s");
    });

    it("resyncs when the URL moves somewhere we did not send it", () => {
      const h = setup({ urlSearch: "john" });

      // Someone removed the chip, hit "Clear filters", or opened a shared link.
      h.land("");
      expect(h.result.current.search).toBe("");
    });
  });

  describe("with a selection live", () => {
    it("asks the server before applying, and applies when nobody is dropped", async () => {
      const h = setup({ selected: 20 });

      act(() => h.result.current.setSearch("john"));
      await settleDebounce();
      expect(h.result.current.busy).toBe(true);
      expect(h.applied).toEqual([]);

      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: [] });
        await Promise.resolve();
      });

      expect(h.applied).toEqual([{ search: "john" }]);
      expect(h.result.current.busy).toBe(false);
    });

    it("prompts rather than applying when rows would be dropped", async () => {
      const h = setup({ selected: 20 });

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: ["a", "b"] });
        await Promise.resolve();
      });

      expect(h.result.current.flow).toMatchObject({
        droppedIds: ["a", "b"],
        kind: "prompting",
      });
      expect(h.applied).toEqual([]);
    });

    /**
     * The search box cannot be disabled — an officer may be mid-word — so it was
     * the one control that could supersede the check the officer was waiting on.
     * Their status click then vanished with no error and no toast.
     */
    it("refuses a debounced term while a check is running", async () => {
      const h = setup({ selected: 20 });

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      expect(h.result.current.busy).toBe(true);

      act(() => h.result.current.setSearch("john"));
      await settleDebounce();

      // No second request, so the first cannot be discarded.
      expect(h.pending).toHaveLength(1);
    });

    it("retries the refused term once the flow settles", async () => {
      const h = setup({ selected: 20 });

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      act(() => h.result.current.setSearch("john"));
      await settleDebounce();

      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: [] });
        await Promise.resolve();
      });
      await settleDebounce();
      await act(async () => {
        h.pending[1]?.resolve({ droppedIds: [] });
        await Promise.resolve();
      });

      // Refusing is only safe because the term comes back. Without the retry it
      // sat in the box filtering nothing, with no path out.
      expect(h.applied).toEqual([{ status: "accepted" }, { search: "john" }]);
    });

    it("reports a failed check and settles", async () => {
      const h = setup({ selected: 20 });

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      await act(async () => {
        h.pending[0]?.reject(new Error("offline"));
        await Promise.resolve();
      });

      expect(h.deps.onCheckFailed).toHaveBeenCalledTimes(1);
      expect(h.result.current.busy).toBe(false);
      expect(h.applied).toEqual([]);
    });
  });

  describe("the prompt", () => {
    it("deselects and applies on proceed", async () => {
      const h = setup({ selected: 20 });
      const deselect = vi.fn();

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: ["a"] });
        await Promise.resolve();
      });
      act(() => h.result.current.proceedWithPrompt(deselect));

      expect(deselect).toHaveBeenCalledWith(["a"]);
      expect(h.applied).toEqual([{ status: "accepted" }]);
      expect(h.result.current.busy).toBe(false);
    });

    it("applies nothing on cancel", async () => {
      const h = setup({ selected: 20 });

      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: ["a"] });
        await Promise.resolve();
      });
      act(() => h.result.current.cancelPrompt());

      expect(h.applied).toEqual([]);
      expect(h.result.current.busy).toBe(false);
    });

    it("rewinds the box only when the prompt was about the search", async () => {
      const h = setup({ selected: 20 });

      // A status prompt, with a term typed before it opened.
      act(() => h.result.current.setSearch("half typed"));
      act(() => void h.result.current.requestFilter({ status: "accepted" }));
      await act(async () => {
        h.pending[0]?.resolve({ droppedIds: ["a"] });
        await Promise.resolve();
      });
      act(() => h.result.current.cancelPrompt());

      // Cancelling a status prompt must not destroy typed text.
      expect(h.result.current.search).toBe("half typed");
    });
  });

  describe("work it should not do", () => {
    it("does not check or navigate for a patch that changes nothing", async () => {
      const h = setup({ selected: 20 });
      const deps = { ...h.deps, wouldMove: () => false };
      const { result } = renderHook(() => useFilterFlow(deps));

      let landed = true;
      await act(async () => {
        landed = await result.current.requestFilter({ status: "accepted" });
      });

      // Re-clicking the active tab used to freeze the whole filter strip for a
      // round trip that could not have an answer.
      expect(landed).toBe(false);
      expect(h.pending).toHaveLength(0);
      expect(result.current.busy).toBe(false);
    });

    it("skips the check entirely when nothing is selected", async () => {
      const h = setup({ selected: 0 });

      await act(async () => {
        await h.result.current.requestFilter({ status: "accepted" });
      });

      expect(h.pending).toHaveLength(0);
      expect(h.applied).toEqual([{ status: "accepted" }]);
    });
  });
});
