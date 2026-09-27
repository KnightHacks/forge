"use client";

import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { HackerRosterFilter } from "@forge/validators";
import { hackerRosterFilterSchema } from "@forge/validators";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";

/**
 * Filter state, the selected hackathon, and show-all live in the URL, like the
 * rest of the admin surface.
 *
 * Not a preference — a shareable address. An officer working a capacity round
 * sends "here, this filter" to another officer, and refreshes without losing
 * their place.
 *
 * Every write is a `replace`, so there is deliberately no per-filter history
 * entry: a 350 ms-debounced search box would otherwise bury the page an officer
 * arrived from under a dozen of them. The cost is that Back does not step
 * backwards through filters, and nothing here should claim it does.
 */
export interface RosterUrlState {
  filter: HackerRosterFilter;
  /**
   * The applicant whose panel is open, so a link opens on the same person.
   *
   * The member directory does this with `?member=`; an officer asking a
   * colleague "what do you make of this one" should be able to paste a URL
   * rather than describe how to find the row.
   */
  hackerId: string | null;
  hackathonId: string | null;
  navigating: boolean;
  /**
   * The filter a patch would produce, resolved against any write still in
   * flight rather than against the URL.
   *
   * The survival check needs the filter that will actually be in effect. Asking
   * with `{...url.filter, ...patch}` reintroduces the stale-snapshot bug in the
   * one place it is most expensive: the officer would be told "12 of your 20
   * selected disappear" about a filter that is not the one being applied, and
   * Proceed would then apply the real one.
   */
  projectFilter: (patch: RosterFilterPatch) => HackerRosterFilter;
  /**
   * Whether a patch would actually move the URL.
   *
   * Asked before the survival check, so re-clicking the tab that is already
   * active does not freeze the whole filter strip for the length of a server
   * round trip in response to a click that was a no-op by construction.
   */
  wouldMove: (patch: RosterFilterPatch) => boolean;
  /** Applies only the keys present on `patch`. Returns whether the URL moved. */
  setFilter: (patch: RosterFilterPatch) => boolean;
  setHackerId: (next: string | null) => boolean;
  setHackathonId: (next: string) => boolean;
  setShowAll: (next: boolean) => boolean;
  showAll: boolean;
}

/**
 * A partial filter, where "absent" and "present but undefined" mean different
 * things: absent leaves the key alone, present-and-undefined clears it.
 *
 * This distinction is the whole design. Callers used to pass a complete filter
 * built as `{...url.filter, oneChange}`, and `url.filter` comes from
 * `useSearchParams`, which does not update until the server responds. A second
 * write issued during that window therefore carried a stale copy of every
 * *other* key and silently reverted it — remove a school chip, click a status
 * tab 200 ms later, and the chip came back. Composing the query string could
 * not help, because the mutator then overwrote exactly the keys it composed.
 */
export type RosterFilterPatch = Partial<HackerRosterFilter>;

const LIST_KEYS = [
  "schools",
  "levelsOfStudy",
  "majors",
  "racesOrEthnicities",
  "genders",
  "shirtSizes",
  "graduationTerms",
  "graduationYears",
] as const;
const SCALAR_KEYS = [
  "search",
  "status",
  "deliveryFailed",
  "blacklisted",
  "ageMin",
  "ageMax",
  "hasDietaryNeeds",
  "isFirstTime",
  "firstTimeStatus",
] as const;

/**
 * Fails the build if a filter key is added without a branch in `applyPatch`.
 *
 * `satisfies` on the key lists checks membership, not coverage — an unhandled
 * key would be silently skipped, so `wouldMove` would report false for it
 * forever and its control would be a permanent no-op that nothing catches.
 */
type UncoveredFilterKey = Exclude<
  keyof HackerRosterFilter,
  (typeof LIST_KEYS)[number] | (typeof SCALAR_KEYS)[number]
>;
const _everyFilterKeyIsApplied: UncoveredFilterKey extends never
  ? true
  : never = true;

/** Everything the Filters panel owns, so its Clear buttons can name them. */
export const FACET_KEYS = [
  "ageMax",
  "ageMin",
  "blacklisted",
  "genders",
  "graduationTerms",
  "graduationYears",
  "hasDietaryNeeds",
  "isFirstTime",
  "firstTimeStatus",
  "levelsOfStudy",
  "majors",
  "racesOrEthnicities",
  "schools",
  "shirtSizes",
] as const satisfies readonly (keyof HackerRosterFilter)[];

/**
 * Fails the build if a filter key is not owned by the panel or named as an
 * exception.
 *
 * `satisfies` above only checks that every listed key is a real filter key. It
 * says nothing about *coverage*, so a new facet could be added to the schema and
 * the panel and simply be missing here — and `changedFacets` iterates this list,
 * so Apply would silently send nothing for it. That shipped three times running:
 * major, race, gender and shirt size, then again for first-hackathon.
 *
 * `search` lives in the search box, `status` on the tabs, and `deliveryFailed`
 * is the pane an officer is in rather than a filter they set.
 */
type UnownedFilterKey = Exclude<
  keyof HackerRosterFilter,
  (typeof FACET_KEYS)[number] | "deliveryFailed" | "search" | "status"
>;
const _everyFilterKeyIsOwned: UnownedFilterKey extends never ? true : never =
  true;

/** A patch that clears every facet, leaving search, status and the pane alone. */
export function clearedFacets(): RosterFilterPatch {
  return Object.fromEntries(FACET_KEYS.map((key) => [key, undefined]));
}

/**
 * Applies a patch to a *copy* of `base`, and never to a live params object.
 *
 * `useSearchParams` returns a `ReadonlyURLSearchParams` whose `set`, `delete`,
 * `append` and `sort` all throw at runtime — and are only marked `@deprecated`
 * on the type, so passing one here type-checks cleanly and blows up in the
 * browser on the first filter click. Taking a string rather than a params object
 * means no caller can make that mistake, instead of three callers each having to
 * remember to copy.
 */
function applyPatch(base: string, patch: RosterFilterPatch) {
  const params = new URLSearchParams(base);
  for (const key of SCALAR_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    // `hasDietaryNeeds: false` is a filter, not an absence — the others use
    // `false` to mean "not applied", so only this one keeps it.
    // `false` is a filter for the tri-state keys, not an absence — the others
    // use `false` to mean "not applied".
    const clears =
      key === "hasDietaryNeeds" || key === "isFirstTime"
        ? value === undefined
        : value === undefined || value === "" || value === false;
    if (clears) params.delete(key);
    else params.set(key, String(value));
  }
  for (const key of LIST_KEYS) {
    if (!(key in patch)) continue;
    params.delete(key);
    // Sorted, because these are sets and the order carries no meaning. Appending
    // in click order meant unticking UCF and re-ticking it produced a different
    // query for an identical filter — a navigation, a refetch, and with a
    // selection live a survival request, for a change that was not one.
    for (const value of [...(patch[key] ?? [])].map(String).sort()) {
      params.append(key, value);
    }
  }
  return params;
}

function triState(value: string | null) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

function numeric(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseFilter(params: {
  get: (key: string) => string | null;
  getAll: (key: string) => string[];
}): HackerRosterFilter {
  const list = (key: string) => {
    const values = params.getAll(key);
    return values.length > 0 ? values : undefined;
  };
  /*
    List keys are read back from `LIST_KEYS`, not named again here.

    Written out by hand, this object silently omitted `majors`,
    `racesOrEthnicities`, `genders` and `shirtSizes`: the patch reached the URL,
    the chip appeared, and the filter did nothing, because the value was dropped
    on the way back in. Deriving it means a key that can be written can also be
    read.
  */
  const raw = {
    ...Object.fromEntries(LIST_KEYS.map((key) => [key, list(key)])),
    ageMax: numeric(params.get("ageMax")),
    ageMin: numeric(params.get("ageMin")),
    blacklisted: params.get("blacklisted") === "true" ? true : undefined,
    deliveryFailed: params.get("deliveryFailed") === "true" ? true : undefined,
    // Tri-state: absent means "either", and `false` is a real choice, so these
    // cannot collapse to `undefined` the way the other booleans do.
    hasDietaryNeeds: triState(params.get("hasDietaryNeeds")),
    isFirstTime: triState(params.get("isFirstTime")),
    firstTimeStatus: (() => {
      const value = params.get("firstTimeStatus");
      return value === "first" || value === "returning" || value === "unknown"
        ? value
        : undefined;
    })(),
    // Years are the one list that is not strings.
    graduationYears: list("graduationYears")
      ?.map(Number)
      .filter((year) => Number.isInteger(year) && year >= 1900),
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
  };

  // Parsed, not cast. A shared or hand-edited link carrying `?status=Accepted`
  // or a truncated `?graduationYears=` would otherwise reach the server, fail
  // Zod, and put the whole screen into its error state — an officer following a
  // colleague's link would see "the roster could not be loaded" and have no idea
  // a stray character caused it. Unparseable values are dropped and the rest of
  // the filter still applies.
  const parsed = hackerRosterFilterSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const salvaged = { ...raw } as Record<string, unknown>;
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete salvaged[key];
  }
  const retry = hackerRosterFilterSchema.safeParse(salvaged);
  return retry.success ? retry.data : {};
}

/**
 * @param onForeignNavigation Called when the URL changes to something this hook
 *   did not write — a pasted link, or Back leaving the page. The roster drops
 *   its selection on these and only these, and the decision lives here because
 *   this is the only place that knows which queries are ours. Mirroring that
 *   knowledge in the component as a flag was wrong three separate times; as a
 *   boolean it was consumed by the first of two navigations in a chain, so the
 *   second wiped a selection a survival check had just cleared as safe.
 */
export function useRosterUrlState(
  onForeignNavigation?: () => void,
): RosterUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigating, startNavigation] = useTransition();

  /**
   * The last query we wrote, so two writes inside one navigation window compose
   * instead of the second rebuilding from the first's stale snapshot.
   */
  const pendingRef = useRef<string | null>(null);
  /**
   * Every query we wrote in the current chain, newest last.
   *
   * Telling "an earlier write of ours landed" from "someone navigated away"
   * needs more than the latest one: pending holds the second query while the
   * URL settles on the first, and comparing only against pending called that a
   * foreign navigation.
   */
  const writtenRef = useRef<string[]>([]);
  const lastCommittedRef = useRef<string | null>(null);
  const foreignRef = useRef(onForeignNavigation);
  useEffect(() => {
    foreignRef.current = onForeignNavigation;
  });

  useEffect(() => {
    const committed = searchParams.toString();
    // The first run establishes a baseline; the URL we mounted on is neither
    // ours nor a navigation away from anything.
    if (lastCommittedRef.current === null) {
      lastCommittedRef.current = committed;
      return;
    }
    if (lastCommittedRef.current === committed) return;
    lastCommittedRef.current = committed;

    if (committed === pendingRef.current) {
      // The chain caught up. Nothing left to compose against.
      pendingRef.current = null;
      writtenRef.current = [];
      return;
    }
    // An intermediate write of ours landing is the chain working — keep
    // composing. Anything else is a link, a pasted URL, or Back.
    if (writtenRef.current.includes(committed)) return;

    pendingRef.current = null;
    writtenRef.current = [];
    foreignRef.current?.();
  }, [searchParams]);

  const filter = useMemo<HackerRosterFilter>(
    () => parseFilter(searchParams),
    [searchParams],
  );

  const write = useCallback(
    (build: (base: string) => URLSearchParams) => {
      const committed = searchParams.toString();
      // Once the URL catches up with what we wrote, the pending copy is spent.
      if (pendingRef.current === committed) pendingRef.current = null;
      const settled = pendingRef.current === null;
      const base = pendingRef.current ?? committed;
      const params = build(base);
      // Sorted, so a query is defined by its content rather than by the order
      // keys happened to be touched. Without this, re-appending list keys built
      // a different string for an identical filter, and every no-op click cost
      // a navigation, a spinner, and — with a selection live — a survival
      // request against the server.
      params.sort();
      const query = params.toString();
      if (query === base) return false;

      pendingRef.current = query;
      // A chain starting from a settled URL begins its own history, so a Back
      // to something we wrote minutes ago is still recognised as foreign.
      writtenRef.current = settled ? [query] : [...writtenRef.current, query];
      // In a transition so the officer gets a pending signal rather than a
      // screen that sits unchanged while the server re-renders.
      startNavigation(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
      return true;
    },
    [pathname, router, searchParams],
  );

  return {
    hackerId: searchParams.get("hacker"),
    filter,
    hackathonId: searchParams.get("hackathon"),
    navigating,
    projectFilter: useCallback(
      (patch) =>
        parseFilter(
          applyPatch(pendingRef.current ?? searchParams.toString(), patch),
        ),
      [searchParams],
    ),
    setFilter: useCallback(
      (patch) => write((base) => applyPatch(base, patch)),
      [write],
    ),
    wouldMove: useCallback(
      (patch) => {
        const base = pendingRef.current ?? searchParams.toString();
        const params = applyPatch(base, patch);
        params.sort();
        // Compared against the sorted base, so an externally-built URL whose
        // keys happen to be out of order is not mistaken for a pending change.
        const sortedBase = new URLSearchParams(base);
        sortedBase.sort();
        return params.toString() !== sortedBase.toString();
      },
      [searchParams],
    ),
    setHackerId: useCallback(
      (next) =>
        write((base) => {
          const params = new URLSearchParams(base);
          if (next) params.set("hacker", next);
          else params.delete("hacker");
          return params;
        }),
      [write],
    ),
    setHackathonId: useCallback(
      (next) =>
        write((base) => {
          const params = new URLSearchParams(base);
          params.set("hackathon", next);
          return params;
        }),
      [write],
    ),
    setShowAll: useCallback(
      (next) =>
        write((base) => {
          const params = new URLSearchParams(base);
          if (next) params.set("showAll", "true");
          else params.delete("showAll");
          return params;
        }),
      [write],
    ),
    showAll: searchParams.get("showAll") === "true",
  };
}
