"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { HackerRosterFilter } from "@forge/validators";

/**
 * Filter state and the selected hackathon live in the URL, like the rest of
 * the admin surface.
 *
 * Not a preference — a shareable address. An officer working through a
 * capacity round sends "here, this filter" to another officer, refreshes
 * without losing their place, and gets back where they were from history.
 * Component state does none of that.
 *
 * `router.replace` rather than `push`: refining a filter is not a navigation
 * step, and stacking twenty history entries for twenty keystrokes makes the
 * back button useless.
 */
export interface RosterUrlState {
  filter: HackerRosterFilter;
  hackathonId: string | null;
  setFilter: (next: HackerRosterFilter) => void;
  setHackathonId: (next: string) => void;
  showAll: boolean;
  setShowAll: (next: boolean) => void;
}

/** Repeatable params, so `?school=A&school=B` round-trips as an array. */
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

  const filter = useMemo<HackerRosterFilter>(() => {
    const list = (key: string) => {
      const values = searchParams.getAll(key);
      return values.length > 0 ? values : undefined;
    };
    return {
      blacklisted:
        searchParams.get("blacklisted") === "true" ? true : undefined,
      deliveryFailed:
        searchParams.get("deliveryFailed") === "true" ? true : undefined,
      graduationTerms: list(
        "graduationTerms",
      ) as HackerRosterFilter["graduationTerms"],
      // Junk years in a hand-edited URL are dropped rather than sent as NaN,
      // which the schema would reject with no visible cause.
      graduationYears: list("graduationYears")
        ?.map(Number)
        .filter((year) => Number.isInteger(year)),
      levelsOfStudy: list("levelsOfStudy"),
      schools: list("schools"),
      search: searchParams.get("search") ?? undefined,
      status:
        (searchParams.get("status") as HackerRosterFilter["status"]) ??
        undefined,
    };
  }, [searchParams]);

  const write = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        // The roster is a client query; re-running the server component on
        // every keystroke would fetch a page nothing renders.
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return {
    filter,
    hackathonId: searchParams.get("hackathon"),
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
