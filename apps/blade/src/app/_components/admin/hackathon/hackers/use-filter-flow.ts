"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RosterFilterPatch } from "./use-roster-url-state";

/**
 * Applying a filter, and the search box that feeds it.
 *
 * Extracted from `HackerRoster` because nothing rendered that component, so
 * every fix to this logic shipped untested — and rounds 5, 6, 7 and 8 each found
 * a regression inside the previous round's fix here. The dependencies are
 * injected for the same reason `use-audience-resolution.ts` injects `resolve`:
 * the failures are all about *interleaving* (a response landing after a later
 * one, a commit landing before the URL catches up), and interleaving is only
 * reachable when the test controls when each promise settles.
 */
export interface FilterFlowDeps {
  /** How many rows are selected right now. Read at call time, never cached. */
  selectedCount: () => number;
  /** Asks the server which of the selection a filter would hide. */
  checkSurvival: (
    patch: RosterFilterPatch,
  ) => Promise<{ droppedIds: string[] }>;
  onCheckFailed: () => void;
  /** Applies the patch. Returns whether the URL actually moved. */
  setFilter: (patch: RosterFilterPatch) => boolean;
  /** The search term the URL currently holds. */
  urlSearch: string;
  /** Whether a patch would move the URL at all. */
  wouldMove: (patch: RosterFilterPatch) => boolean;
}

export type FilterFlow =
  | { kind: "checking" }
  | { kind: "idle" }
  | { droppedIds: string[]; kind: "prompting"; patch: RosterFilterPatch };

export const SEARCH_DEBOUNCE_MS = 350;

export interface FilterFlowState {
  /** True while a check is running or its prompt is open. */
  busy: boolean;
  cancelPrompt: () => void;
  flow: FilterFlow;
  proceedWithPrompt: (deselect: (ids: string[]) => void) => void;
  requestFilter: (patch: RosterFilterPatch) => Promise<boolean>;
  search: string;
  setSearch: (next: string) => void;
}

export function useFilterFlow(deps: FilterFlowDeps): FilterFlowState {
  const [flow, setFlow] = useState<FilterFlow>({ kind: "idle" });
  const [search, setSearch] = useState(deps.urlSearch);
  /**
   * What the URL held when the box last reconciled.
   *
   * The *only* permitted trigger for rewriting the box. Comparing against what
   * we sent instead meant the adjustment ran during the whole navigation window
   * — the microtask that records a commit always beats a server round trip — so
   * it blanked the box mid-typing.
   */
  const [lastUrlSearch, setLastUrlSearch] = useState(deps.urlSearch);
  /**
   * Terms we have asked the URL to hold and not yet seen land.
   *
   * A single "last sent" string was wrong for the same reason one pending query
   * was wrong in `useRosterUrlState`: two commits inside one window land one
   * after the other, and the first landing is not the latest term, so it read as
   * foreign and rewound `"john smith"` to `"john"`.
   *
   * Outstanding rather than "everything ever sent", because a chain can revisit
   * a term — "john" → "johnny" → "john". Treating membership as ownership let
   * the first landing clear the whole list, after which the remaining landings
   * were foreign and rewrote the box twice.
   */
  const [outstanding, setOutstanding] = useState<string[]>([]);

  const requestSeqRef = useRef(0);
  const flowRef = useRef(flow);
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
    flowRef.current = flow;
  });

  /** Resolves true only if the patch actually reached the URL. */
  const requestFilter = useCallback(async (patch: RosterFilterPatch) => {
    const current = depsRef.current;
    /*
      Refused unless settled.

      Every control is disabled while a check runs, but the search box cannot be
      — an officer may be mid-word — so the debounce was the one remaining path
      that could supersede the check the officer was already waiting on, and
      their status click vanished with no error and no toast.

      Nothing is lost: `flow.kind` is a dependency of the debounce, so a refused
      term is retried the moment the flow settles.
    */
    if (flowRef.current.kind !== "idle") return false;

    // A patch that changes nothing needs neither a navigation nor a question
    // about a selection it cannot affect.
    if (!current.wouldMove(patch)) return false;
    if (current.selectedCount() === 0) return current.setFilter(patch);

    const seq = ++requestSeqRef.current;
    setFlow({ kind: "checking" });
    try {
      const survival = await current.checkSurvival(patch);
      // Kept even though the idle gate above makes a second request hard to
      // reach: this is the one exit that leaves `flow` untouched, so if the gate
      // is ever relaxed the alternative is a permanently stuck `checking`.
      if (seq !== requestSeqRef.current) return false;
      if (survival.droppedIds.length === 0) {
        setFlow({ kind: "idle" });
        return current.setFilter(patch);
      }
      setFlow({ droppedIds: survival.droppedIds, kind: "prompting", patch });
      return false;
    } catch {
      if (seq === requestSeqRef.current) {
        setFlow({ kind: "idle" });
        current.onCheckFailed();
      }
      return false;
    }
  }, []);

  // Rewrites the box only when the URL moved somewhere we did not send it.
  if (deps.urlSearch !== lastUrlSearch) {
    setLastUrlSearch(deps.urlSearch);
    if (outstanding.includes(deps.urlSearch)) {
      // Ours. Drop it and everything it superseded; anything sent after it is
      // still in flight and must stay claimed.
      setOutstanding((sent) => sent.slice(sent.indexOf(deps.urlSearch) + 1));
    } else {
      setOutstanding([]);
      setSearch(deps.urlSearch);
    }
  }

  const committed = outstanding.at(-1) ?? lastUrlSearch;

  useEffect(() => {
    // Compared trimmed, because that is what comes back: the schema trims, so
    // holding the raw box text meant `"john "` never matched the `"john"` that
    // landed, and `"john "` + `"smith"` produced `"johnsmith"`.
    const term = search.trim();
    if (term === committed) return;
    const timer = setTimeout(() => {
      void requestFilter({ search: term || undefined }).then((landed) => {
        // Only once it reached the URL. Recording it up front stranded the term
        // whenever the prompt intercepted the write: the box held text the
        // roster was not filtered by, and nothing retried it.
        if (landed) setOutstanding((sent) => [...sent, term]);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [committed, flow.kind, requestFilter, search]);

  return {
    busy: flow.kind !== "idle",
    cancelPrompt: useCallback(() => {
      setFlow((current) => {
        // Backing out means the filter was not applied, so a box claiming
        // otherwise has to stop — but only when the prompt was about the search.
        // Rewinding unconditionally threw away text typed before an unrelated
        // prompt opened.
        if (current.kind === "prompting" && "search" in current.patch) {
          setSearch(depsRef.current.urlSearch);
        }
        return { kind: "idle" };
      });
    }, []),
    flow,
    proceedWithPrompt: useCallback((deselect: (ids: string[]) => void) => {
      const current = flowRef.current;
      if (current.kind !== "prompting") return;
      deselect(current.droppedIds);
      setFlow({ kind: "idle" });
      if (
        depsRef.current.setFilter(current.patch) &&
        "search" in current.patch
      ) {
        setOutstanding((sent) => [...sent, current.patch.search ?? ""]);
      }
    }, []),
    requestFilter,
    search,
    setSearch,
  };
}
