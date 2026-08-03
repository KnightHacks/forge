"use client";

import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { HackerRosterFilter } from "@forge/validators";
import { hackerRosterFilterSchema } from "@forge/validators";

/**
 * Filter state, the selected hackathon, and show-all live in the URL, like the
 * rest of the admin surface.
 *
 * Not a preference — a shareable address. An officer working a capacity round
 * sends "here, this filter" to another officer, refreshes without losing their
 * place, and gets back where they were from history.
 */
export interface RosterUrlState {
  filter: HackerRosterFilter;
  hackathonId: string | null;
  navigating: boolean;
  setFilter: (next: HackerRosterFilter) => void;
  setHackathonId: (next: string) => void;
  setShowAll: (next: boolean) => void;
  showAll: boolean;
}

const LIST_KEYS = [
  "schools",
  "levelsOfStudy",
  "graduationTerms",
  "graduationYears",
] as const;
const SCALAR_KEYS = [
  "search",
  "status",
  "deliveryFailed",
  "blacklisted",
] as const;

export function useRosterUrlState(): RosterUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigating, startNavigation] = useTransition();

  /**
   * The last params we wrote, so two writes inside one navigation window
   * compose instead of the second rebuilding from the first's stale snapshot.
   *
   * `useSearchParams` only updates once the server responds, and this page is
   * dynamic. Clicking "Show all" and then a status tab before that lands would
   * otherwise silently drop the first.
   *
   * Read and reconciled inside `write`, never during render — a ref touched in
   * the render path is exactly what breaks under concurrent rendering.
   */
  const pendingRef = useRef<string | null>(null);
  /**
   * Discarded whenever the URL moves anywhere we did not send it — browser
   * Back, most importantly.
   *
   * Without this the ref outlived the navigation it belonged to: apply a school
   * filter, let it land, press Back to undo it, then click "Show all" — and the
   * write rebuilt from the dead pending query, silently restoring the filter
   * the officer had just backed out of.
   */
  useEffect(() => {
    const committed = searchParams.toString();
    if (pendingRef.current !== null && pendingRef.current !== committed) {
      pendingRef.current = null;
    }
  }, [searchParams]);

  const filter = useMemo<HackerRosterFilter>(() => {
    const list = (key: string) => {
      const values = searchParams.getAll(key);
      return values.length > 0 ? values : undefined;
    };
    const raw = {
      blacklisted:
        searchParams.get("blacklisted") === "true" ? true : undefined,
      deliveryFailed:
        searchParams.get("deliveryFailed") === "true" ? true : undefined,
      graduationTerms: list("graduationTerms"),
      graduationYears: list("graduationYears")
        ?.map(Number)
        .filter((year) => Number.isInteger(year) && year >= 1900),
      levelsOfStudy: list("levelsOfStudy"),
      schools: list("schools"),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    };

    // Parsed, not cast. A shared or hand-edited link carrying `?status=Accepted`
    // or a truncated `?graduationYears=` would otherwise reach the server, fail
    // Zod, and put the whole screen into its error state — an officer following
    // a colleague's link would see "the roster could not be loaded" and have no
    // idea a stray character caused it. Unparseable values are dropped and the
    // rest of the filter still applies.
    const parsed = hackerRosterFilterSchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    const salvaged = { ...raw } as Record<string, unknown>;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") delete salvaged[key];
    }
    const retry = hackerRosterFilterSchema.safeParse(salvaged);
    return retry.success ? retry.data : {};
  }, [searchParams]);

  const write = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const committed = searchParams.toString();
      // Once the URL catches up with what we wrote, the pending copy is spent.
      if (pendingRef.current === committed) pendingRef.current = null;
      const params = new URLSearchParams(pendingRef.current ?? committed);
      mutate(params);
      const query = params.toString();
      pendingRef.current = query;
      // In a transition so the officer gets a pending signal rather than a
      // screen that sits unchanged while the server re-renders.
      startNavigation(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  return {
    filter,
    hackathonId: searchParams.get("hackathon"),
    navigating,
    setFilter: useCallback(
      (next) =>
        write((params) => {
          for (const key of SCALAR_KEYS) {
            const value = next[key];
            if (value === undefined || value === "" || value === false) {
              params.delete(key);
            } else {
              params.set(key, String(value));
            }
          }
          for (const key of LIST_KEYS) {
            params.delete(key);
            for (const value of next[key] ?? []) {
              params.append(key, String(value));
            }
          }
        }),
      [write],
    ),
    setHackathonId: useCallback(
      (next) =>
        write((params) => {
          params.set("hackathon", next);
        }),
      [write],
    ),
    setShowAll: useCallback(
      (next) =>
        write((params) => {
          if (next) params.set("showAll", "true");
          else params.delete("showAll");
        }),
      [write],
    ),
    showAll: searchParams.get("showAll") === "true",
  };
}
