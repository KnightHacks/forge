/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearedFacets,
  useRosterUrlState,
} from "~/app/_components/admin/hackathon/hackers/use-roster-url-state";

/**
 * The roster's filter writes, tested as the state machine they are.
 *
 * Every defect this file pins shipped at least once, and three of them shipped
 * twice, because the behaviour only shows up when a second write happens before
 * the first navigation lands. That window is invisible to a component test and
 * to the e2e suite — the server answers too fast locally — so it has to be
 * driven directly.
 *
 * `replace` is captured rather than executed: nothing here advances the URL
 * unless the test says so, which is precisely the in-flight window.
 */
const replace = vi.fn();
let committed = "";

/**
 * Next hands back a `ReadonlyURLSearchParams`, whose mutators throw.
 *
 * A plain `URLSearchParams` here would let the hook mutate the object it was
 * given and still pass, while throwing on the first filter click in a browser —
 * and `set`/`append`/`delete`/`sort` are only `@deprecated` on that type, not
 * removed, so `tsc` would not catch it either.
 */
function readonlyParams(query: string) {
  const params = new URLSearchParams(query);
  for (const method of ["append", "delete", "set", "sort"] as const) {
    Object.defineProperty(params, method, {
      value: () => {
        throw new Error(`ReadonlyURLSearchParams.${method} is not callable`);
      },
    });
  }
  return params;
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/hackers",
  useRouter: () => ({ replace }),
  useSearchParams: () => readonlyParams(committed),
}));

/** Simulates the server responding: the URL becomes whatever we last wrote. */
function land(query: string) {
  committed = query;
}

function queryOf(call: number) {
  const href = replace.mock.calls[call]?.[0] as string | undefined;
  return href?.split("?")[1] ?? "";
}

function optionsOf(call: number) {
  return replace.mock.calls[call]?.[1] as Record<string, unknown> | undefined;
}

beforeEach(() => {
  replace.mockClear();
  committed = "hackathon=h1";
});

describe("useRosterUrlState", () => {
  describe("patch semantics", () => {
    it("leaves keys the patch does not mention alone", () => {
      committed = "hackathon=h1&schools=UCF&status=pending";
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ status: "accepted" }));

      const params = new URLSearchParams(queryOf(0));
      expect(params.get("status")).toBe("accepted");
      expect(params.getAll("schools")).toEqual(["UCF"]);
    });

    it("clears a key the patch mentions as undefined", () => {
      committed = "hackathon=h1&schools=UCF";
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ schools: undefined }));

      expect(new URLSearchParams(queryOf(0)).getAll("schools")).toEqual([]);
    });

    it("clears every facet but keeps search, status and the pane", () => {
      committed =
        "blacklisted=true&deliveryFailed=true&hackathon=h1&schools=UCF&search=jo&status=pending";
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter(clearedFacets()));

      const params = new URLSearchParams(queryOf(0));
      expect(params.getAll("schools")).toEqual([]);
      expect(params.get("blacklisted")).toBeNull();
      expect(params.get("search")).toBe("jo");
      expect(params.get("status")).toBe("pending");
      expect(params.get("deliveryFailed")).toBe("true");
    });
  });

  describe("two writes inside one navigation window", () => {
    /**
     * The defect this replaces: the second write rebuilt every filter key from
     * `url.filter`, which is still the pre-write URL. Removing a school chip and
     * then clicking a status tab brought the chip back.
     */
    it("composes rather than reverting the first", () => {
      committed = "hackathon=h1&schools=UCF";
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ schools: undefined }));
      // No `land()` — the server has not answered yet.
      act(() => void result.current.setFilter({ status: "waitlisted" }));

      const params = new URLSearchParams(queryOf(1));
      expect(params.getAll("schools")).toEqual([]);
      expect(params.get("status")).toBe("waitlisted");
    });

    it("keeps showAll when a filter write follows it", () => {
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setShowAll(true));
      act(() => void result.current.setFilter({ status: "accepted" }));

      const params = new URLSearchParams(queryOf(1));
      expect(params.get("showAll")).toBe("true");
      expect(params.get("status")).toBe("accepted");
    });

    it("still composes after an earlier write in the chain lands", () => {
      const { result, rerender } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setShowAll(true));
      act(() => void result.current.setFilter({ status: "accepted" }));
      // The URL settles on the *first* of the two. Treating that as a foreign
      // navigation is what silently switched "Show all" back off.
      act(() => {
        land(queryOf(0));
        rerender();
      });
      act(() => void result.current.setFilter({ schools: ["UCF"] }));

      const params = new URLSearchParams(queryOf(2));
      expect(params.get("showAll")).toBe("true");
      expect(params.get("status")).toBe("accepted");
      expect(params.getAll("schools")).toEqual(["UCF"]);
    });
  });

  describe("no-op writes", () => {
    it("does not navigate when the filter is already applied", () => {
      committed = "hackathon=h1&status=pending";
      const { result } = renderHook(() => useRosterUrlState());

      let moved = true;
      act(() => {
        moved = result.current.setFilter({ status: "pending" });
      });

      expect(moved).toBe(false);
      expect(replace).not.toHaveBeenCalled();
    });

    it("treats a re-applied list filter as unchanged despite key order", () => {
      committed = "hackathon=h1&schools=UCF&status=pending";
      const { result } = renderHook(() => useRosterUrlState());

      // Re-appending list keys moved them to the end of the query, so an
      // identical filter produced a different string and cost a navigation, a
      // spinner, and a survival request against the server.
      let moved = true;
      act(() => {
        moved = result.current.setFilter({ schools: ["UCF"] });
      });

      expect(moved).toBe(false);
    });
  });

  describe("how it navigates", () => {
    // Both of these were unpinned: swapping the whole
    // `startNavigation(() => replace(href, { scroll: false }))` for a bare
    // `replace(href)` left every other test in this file green.
    it("does not scroll the officer back to the top", () => {
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ status: "accepted" }));

      // Without this, every filter click and every 350 ms search commit yanks
      // someone from row 400 of a thousand-row table back to row 1.
      expect(optionsOf(0)).toEqual({ scroll: false });
    });

    it("reports that a navigation is in flight", () => {
      // Sampled per render, because the pending window opens and closes inside
      // the `act`. Asserting on `result.current` afterwards only ever sees the
      // settled value — which is why the previous version of this test passed
      // with the transition removed entirely.
      const seen: boolean[] = [];
      const { result } = renderHook(() => {
        const state = useRosterUrlState();
        seen.push(state.navigating);
        return state;
      });

      act(() => void result.current.setFilter({ status: "accepted" }));

      // `navigating` drives the "Updating results" row. Outside a transition it
      // is permanently false, so the table sits unchanged with no signal while
      // the server re-renders and the officer clicks again.
      expect(seen).toContain(true);
    });
  });

  describe("foreign navigation", () => {
    it("reports a URL nobody here wrote", () => {
      const onForeign = vi.fn();
      const { rerender } = renderHook(() => useRosterUrlState(onForeign));

      act(() => {
        land("hackathon=h1&status=denied");
        rerender();
      });

      expect(onForeign).toHaveBeenCalledTimes(1);
    });

    it("stays silent for both landings of our own two-write chain", () => {
      const onForeign = vi.fn();
      const { result, rerender } = renderHook(() =>
        useRosterUrlState(onForeign),
      );

      act(() => void result.current.setFilter({ status: "pending" }));
      act(() => void result.current.setFilter({ status: "accepted" }));
      act(() => {
        land(queryOf(0));
        rerender();
      });
      act(() => {
        land(queryOf(1));
        rerender();
      });

      // As a boolean flag in the component this was the failing case: the first
      // landing consumed it, so the second cleared a selection that a survival
      // check had just confirmed was safe.
      expect(onForeign).not.toHaveBeenCalled();
    });

    it("does not fire on mount", () => {
      const onForeign = vi.fn();
      renderHook(() => useRosterUrlState(onForeign));
      expect(onForeign).not.toHaveBeenCalled();
    });
  });

  describe("a URL built by someone else", () => {
    it("still recognises a no-op once its own write has landed", () => {
      // Next does not sort, and neither does a hand-written link. The first
      // write normalises, which costs one navigation; every no-op after that
      // must be free.
      committed = "status=pending&hackathon=h1&schools=UCF";
      const { result, rerender } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ status: "pending" }));
      act(() => {
        land(queryOf(0));
        rerender();
      });

      let moved = true;
      act(() => {
        moved = result.current.setFilter({ status: "pending" });
      });
      expect(moved).toBe(false);
    });

    it("treats a re-ticked list value as no change", () => {
      committed = "hackathon=h1&schools=UCF&schools=USF";
      const { result } = renderHook(() => useRosterUrlState());

      // The multi-select appends, so unticking UCF and re-ticking it yields the
      // same set in a different order.
      let moved = true;
      act(() => {
        moved = result.current.setFilter({ schools: ["USF", "UCF"] });
      });
      expect(moved).toBe(false);
    });
  });

  describe("wouldMove", () => {
    it("is false for a patch that changes nothing", () => {
      committed = "hackathon=h1&status=pending";
      const { result } = renderHook(() => useRosterUrlState());

      // Consulted before the survival round trip. Without it, re-clicking the
      // already-active tab froze the whole filter strip for the length of a
      // server request answering a question that could not have an answer.
      expect(result.current.wouldMove({ status: "pending" })).toBe(false);
      expect(result.current.wouldMove({ status: "accepted" })).toBe(true);
      expect(replace).not.toHaveBeenCalled();
    });

    it("is false on a URL whose keys are not in order", () => {
      // Next does not sort, and neither does a pasted link. Comparing the
      // sorted result against an unsorted base reported a change for every
      // patch, so re-clicking the active tab froze the whole filter strip for
      // the length of a survival request that could not have an answer.
      committed = "status=pending&hackathon=h1&schools=UCF";
      const { result } = renderHook(() => useRosterUrlState());

      expect(result.current.wouldMove({ status: "pending" })).toBe(false);
    });
  });

  describe("every facet survives the round trip", () => {
    /**
     * Write it, read it back, and see it in `filter`.
     *
     * Four facets shipped where the write worked and the read did not: the chip
     * appeared, the URL carried the value, and the roster ignored it. A filter
     * that looks applied and is not is worse than one that visibly fails.
     */
    it.each([
      ["majors", ["Computer Science"]],
      ["racesOrEthnicities", ["Prefer not to answer"]],
      ["genders", ["Prefer not to answer"]],
      ["shirtSizes", ["M"]],
      ["schools", ["University of Central Florida"]],
      ["levelsOfStudy", ["Undergraduate University (3+ year)"]],
    ] as const)("%s", (field, value) => {
      const { result, rerender } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ [field]: value }));
      act(() => {
        land(queryOf(0));
        rerender();
      });

      expect(result.current.filter[field]).toEqual(value);
    });

    it("first hackathon, in both directions", () => {
      // Shipped broken: the key was in `SCALAR_KEYS` but not `FACET_KEYS`, so
      // `changedFacets` never sent it and Apply did nothing at all.
      for (const value of [true, false]) {
        const { result, rerender } = renderHook(() => useRosterUrlState());
        act(() => void result.current.setFilter({ isFirstTime: value }));
        act(() => {
          land(queryOf(replace.mock.calls.length - 1));
          rerender();
        });
        expect(result.current.filter.isFirstTime).toBe(value);
      }
    });

    it("age range and dietary toggle", () => {
      const { result, rerender } = renderHook(() => useRosterUrlState());

      act(
        () =>
          void result.current.setFilter({
            ageMax: 22,
            ageMin: 18,
            hasDietaryNeeds: false,
          }),
      );
      act(() => {
        land(queryOf(0));
        rerender();
      });

      expect(result.current.filter.ageMin).toBe(18);
      expect(result.current.filter.ageMax).toBe(22);
      // `false` is a real choice here, unlike the other booleans where it means
      // "not applied".
      expect(result.current.filter.hasDietaryNeeds).toBe(false);
    });
  });

  describe("projectFilter", () => {
    it("resolves against a write still in flight, not the URL", () => {
      committed = "hackathon=h1";
      const { result } = renderHook(() => useRosterUrlState());

      act(() => void result.current.setFilter({ schools: ["UCF"] }));

      // Asking with `{...url.filter, ...patch}` would answer `schools: []` here,
      // so the officer would be told which rows survive a filter that is not the
      // one about to land — and Proceed would then apply the real one.
      const projected = result.current.projectFilter({ status: "accepted" });
      expect(projected.schools).toEqual(["UCF"]);
      expect(projected.status).toBe("accepted");
    });
  });
});
