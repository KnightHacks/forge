"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarOff,
  Loader2,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { HackerRosterFilter } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import type { RosterFilterPatch } from "./use-roster-url-state";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { api } from "~/trpc/react";
import { BulkConfirmDialog } from "./bulk-confirm-dialog";
import { FilterChangeDialog } from "./filter-change-dialog";
import { HackerDetailDialog } from "./hacker-detail-dialog";
import { FilterChips, HackerFilters, StatusTabs } from "./hacker-filters";
import { HackerTable } from "./hacker-table";
import { useHackerSelection } from "./use-hacker-selection";
import { useRosterUrlState } from "./use-roster-url-state";

type Options = RouterOutputs["hacker"]["listHackathonOptions"]["hackathons"];
export type RosterFilter = HackerRosterFilter;
type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

const PAGE_SIZE = 50;
/**
 * The show-all ceiling.
 *
 * Deliberately not the schema's 5000. These rows are unvirtualized and each
 * carries a Radix Checkbox, so mounting a few thousand freezes the main thread
 * for seconds with only a progress bar as warning. 1000 covers every hackathon
 * held so far — the largest is 1448 attendees across all statuses, and a single
 * status bucket is far smaller — and the count below the table says plainly
 * when the cap bites.
 */
const SHOW_ALL_SIZE = 1000;

function PaneTab({
  active,
  busy,
  label,
  onClick,
}: {
  active: boolean;
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      disabled={busy}
      className={
        active
          ? "min-h-11 rounded px-3 text-sm font-medium text-foreground shadow-sm ring-1 ring-border"
          : "min-h-11 rounded px-3 text-sm text-muted-foreground hover:text-foreground"
      }
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function HackerRoster({
  hackathons,
  selected,
}: {
  hackathons: Options;
  selected: Options[number] | null;
}) {
  const selection = useHackerSelection();
  const url = useRosterUrlState(() => {
    if (selection.selected.size === 0) return;
    selection.clear();
    toast.info("Selection cleared — the view changed.");
  });
  const utils = api.useUtils();

  const [bulkStatus, setBulkStatus] = useState<SendingStatus | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  /**
   * Applying a filter is one process with three states, not two booleans.
   *
   * As two, `checking` and `prompting` were simultaneously reachable: a request
   * issued before the dialog opened would resolve behind it and either rewrite
   * the open dialog's numbers under the officer's cursor, or commit a different
   * filter outright while the dialog was still asking about this one. That state
   * has no meaning, so it is now unrepresentable.
   */
  const [filterFlow, setFilterFlow] = useState<
    | { kind: "checking" }
    | { kind: "idle" }
    | { droppedIds: string[]; kind: "prompting"; patch: RosterFilterPatch }
  >({ kind: "idle" });
  const [search, setSearch] = useState(url.filter.search ?? "");
  /**
   * Two facts, because one is not enough to know whether to touch the box.
   *
   * `lastUrlSearch` is what the URL held when we last reconciled, and it is the
   * *only* trigger for the adjustment below — the box may be rewritten when the
   * URL moves, and at no other time. `sentSearch` is the term we last asked the
   * URL to hold, which says whether a move was ours.
   *
   * Collapsing these into one "committed" value is what broke: the microtask
   * recording a commit always beats the server round trip, so for the length of
   * a navigation that single value disagreed with a URL which had simply not
   * caught up. The adjustment fired, blanked the box, and ate everything typed
   * during the navigation — the exact failure it exists to prevent.
   *
   * Stored trimmed, because the schema trims: keeping the raw box text meant
   * `"john "` never matched the `"john"` that came back, so the box read its own
   * write as someone else's and `"john "` + `"smith"` produced `"johnsmith"`.
   */
  const [lastUrlSearch, setLastUrlSearch] = useState(url.filter.search ?? "");
  const [sentSearch, setSentSearch] = useState(url.filter.search ?? "");

  const hackathonId = selected?.id ?? "";
  const enabled = hackathonId !== "";

  // No `initialData`. Seeding a fresh query key with server data stamps it
  // `dataUpdatedAt = now`, and against the app's 30s staleTime a filter change
  // then creates a key considered fresh that **never fetches** — the table keeps
  // showing the previous rows with no spinner, and "select all shown" selects
  // people who are not in the filter the officer believes they are looking at.
  const roster = api.hacker.listForHackathon.useQuery(
    {
      filter: url.filter,
      hackathonId,
      limit: url.showAll ? SHOW_ALL_SIZE : PAGE_SIZE,
    },
    { enabled },
  );
  // `status` is excluded from the key as well as from the query: the server
  // strips it, so including it made every tab click a cache miss that returned
  // identical numbers — and while it was in flight every tab rendered 0, which
  // is indistinguishable from an empty hackathon.
  const { status: _ignored, ...countFilter } = url.filter;
  const counts = api.hacker.statusCounts.useQuery(
    { filter: countFilter, hackathonId },
    { enabled },
  );
  const filterOptions = api.hacker.filterOptions.useQuery(
    { hackathonId },
    { enabled },
  );

  /**
   * A stable array for the bulk dialog.
   *
   * Built inline as `[...selection.selected]` it was a fresh identity every
   * render, so the preview effect re-fired on each one — a `previewBulk` per
   * parent render while a dialog for an irreversible mass email was open, each
   * one blanking the list the officer was reading.
   */
  const selectedIds = useMemo(
    () => [...selection.selected],
    [selection.selected],
  );

  const hackers = roster.data?.hackers ?? [];
  const shownIds = hackers.map((row) => row.attendeeId);
  const shownKey = shownIds.join(",");
  const selectedCount = selection.selected.size;

  // The shift anchor belongs to the list it was set in. Keyed on the rows
  // themselves, because show-all and a hackathon switch change the list too.
  const { resetAnchor } = selection;
  useEffect(() => resetAnchor(), [resetAnchor, shownKey]);

  /**
   * Invalidates the query cache rather than refreshing the route.
   *
   * `router.refresh()` re-runs the server component, but the table renders from
   * a react-query cache entry that already exists — so an officer saw a success
   * toast and an unchanged row, and clicked again.
   */
  const refresh = async () => {
    await utils.hacker.invalidate();
  };

  /**
   * Discards a survival response that a later request has already superseded.
   *
   * Without it, typing "jo" then "john" could commit "jo" last if the first
   * request happened to be slower: the box read "john", the roster was filtered
   * by "jo", and because neither the box nor the URL changed again, nothing
   * re-armed. The screen stayed lying about what it was showing, and the next
   * bulk action mailed the wrong group.
   */
  const requestSeqRef = useRef(0);

  /** Resolves true only if the patch actually reached the URL. */
  const requestFilter = useCallback(
    async (patch: RosterFilterPatch) => {
      // A prompt is a question this officer has not answered yet. Committing
      // anything behind it — including a debounce armed before it opened —
      // would apply a filter they never agreed to.
      if (filterFlow.kind === "prompting") return false;

      // A patch that changes nothing needs neither a navigation nor a question
      // about a selection that cannot be affected by it.
      if (!url.wouldMove(patch)) return false;
      if (selection.selected.size === 0) return url.setFilter(patch);

      const seq = ++requestSeqRef.current;
      setFilterFlow({ kind: "checking" });
      try {
        // Asked server-side: the browser only knows the rows it has loaded, and
        // the case that matters is a selected row on a page nobody is looking
        // at. Projected through the hook so the question is about the filter
        // that will actually land, not the one currently in the URL.
        const survival = await utils.hacker.selectionSurvival.fetch({
          attendeeIds: [...selection.selected],
          filter: url.projectFilter(patch),
          hackathonId,
        });
        if (seq !== requestSeqRef.current) return false;
        if (survival.droppedIds.length === 0) {
          setFilterFlow({ kind: "idle" });
          return url.setFilter(patch);
        }
        setFilterFlow({
          droppedIds: survival.droppedIds,
          kind: "prompting",
          patch,
        });
        return false;
      } catch {
        if (seq === requestSeqRef.current) {
          setFilterFlow({ kind: "idle" });
          toast.error("Could not check the selection against that filter.");
        }
        return false;
      }
    },
    [filterFlow.kind, hackathonId, selection.selected, url, utils],
  );

  /**
   * The debounce reads these rather than naming them as dependencies.
   *
   * `useRosterUrlState` rebuilds its return value every render, so listing
   * `requestFilter` re-armed the 350 ms timer on every render — and when a
   * pending search opened the prompt instead of committing, it fired again, and
   * again. Assigned in an effect, never during render: a ref touched in the
   * render path is what breaks under concurrent rendering, and this component
   * renders inside a transition.
   *
   * There is no filter ref any more. The debounce sends `{ search }` alone, so
   * it has nothing stale to carry.
   */
  const requestFilterRef = useRef(requestFilter);
  useEffect(() => {
    requestFilterRef.current = requestFilter;
  });

  // Resyncs only when the URL's search changed to something we did not write —
  // removing the chip, "Clear filters", or arriving on a shared link.
  const searchFromUrl = url.filter.search ?? "";
  if (searchFromUrl !== lastUrlSearch) {
    setLastUrlSearch(searchFromUrl);
    if (searchFromUrl !== sentSearch) {
      setSentSearch(searchFromUrl);
      setSearch(searchFromUrl);
    }
  }

  useEffect(() => {
    // Compared trimmed, because that is what comes back. The schema trims, so
    // storing the raw box text meant `"john "` never matched the `"john"` in
    // the URL — the resync above read its own commit as someone else's, rewound
    // the box, and typing `"john "` then `"smith"` produced `"johnsmith"`.
    const term = search.trim();
    if (term === sentSearch) return;
    const timer = setTimeout(() => {
      void requestFilterRef
        .current({ search: term || undefined })
        .then((committed) => {
          // Only once it landed. Recording it up front stranded the term when the
          // survival dialog intercepted the write: the box held text the roster
          // was not filtered by, and nothing would retry it.
          if (committed) setSentSearch(term);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [filterFlow.kind, search, sentSearch]);

  if (!selected) {
    return (
      <main className={adminPageLayoutClassName}>
        <AdminPageHeader
          description="No hackathons exist yet."
          eyebrow={ADMIN_PAGE_EYEBROWS.hackers}
          icon={Users}
          title="Hackers"
        />
        <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
          Create a hackathon before managing applicants.{" "}
          <Link
            className="underline underline-offset-4"
            href="/admin/hackathon"
          >
            Hackathons
          </Link>
        </p>
      </main>
    );
  }

  // From the server's own "there is more after this", not from the page being
  // exactly full. A hackathon with precisely 1000 matches otherwise rendered
  // "1000 of 1000 shown · capped at 1000; narrow the filter to reach the rest"
  // — telling an officer to go hunting for rows that were all on screen.
  // Every control that writes a filter is locked while a check is running, so a
  // second request cannot cancel the one the officer is waiting on. Previously
  // only the status tabs greyed out, and clicking a still-live pane tab or chip
  // silently discarded the greyed-out request.
  const filterBusy = filterFlow.kind !== "idle";
  const atCap = url.showAll && roster.data?.nextCursor != null;
  /**
   * The total for the rows actually on screen.
   *
   * `counts` is deliberately computed with `status` stripped so the tabs can
   * show every bucket at once, which makes `counts.total` the whole hackathon.
   * Using it here put "3 of 903 shown" beside a tab reading "Applied 3".
   */
  const shownTotal = url.filter.status
    ? counts.data?.byStatus[url.filter.status]
    : counts.data?.total;
  const failedToLoad = roster.isError || counts.isError;
  const blocked = selected.hasEnded || failedToLoad;
  const blockedReason = selected.hasEnded
    ? `${selected.displayName} ended, so its roster is read-only.`
    : failedToLoad
      ? "The roster could not be loaded, so actions are unavailable."
      : null;

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        description="Everyone who applied. Filter to the group you mean, click across the rows, and act on them together."
        eyebrow={ADMIN_PAGE_EYEBROWS.hackers}
        icon={Users}
        title="Hackers"
      />

      {failedToLoad ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4 text-destructive">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p>
              {roster.error?.message ?? counts.error?.message} — an empty table
              below would read as &ldquo;nobody applied&rdquo;, which is not
              what happened.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="w-full min-w-0 gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardHeader className="min-w-0 gap-3 border-b border-border/70 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
              />
              <Input
                aria-label="Search applicants"
                className="h-11 bg-background/70 pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                value={search}
              />
            </div>
            <HackerFilters
              busy={filterBusy}
              options={
                filterOptions.data ?? {
                  graduationYears: [],
                  levelsOfStudy: [],
                  schools: [],
                }
              }
              filter={url.filter}
              hackathonId={selected.id}
              hackathons={hackathons}
              onFilterChange={(patch) => void requestFilter(patch)}
              onHackathonChange={(next) => {
                // Those ids belong to the roster being left.
                selection.clear();
                url.setHackathonId(next);
              }}
            />
            {/*
              Delivery is its own pane, not a filter chip among the statuses:
              "who never got told" is a different job from triage — worked until
              empty, using phone and Discord rather than status changes.

              Sits in the toolbar beside Filters rather than on its own row. Two
              small tabs alone on a full-width row left most of it empty, which
              read as a gap in the layout rather than a deliberate control.
            */}
            <div className="flex shrink-0 items-center gap-1 rounded-md bg-background/70 p-1">
              <PaneTab
                active={!url.filter.deliveryFailed}
                busy={filterBusy}
                label="Roster"
                onClick={() =>
                  void requestFilter({ deliveryFailed: undefined })
                }
              />
              <PaneTab
                active={url.filter.deliveryFailed === true}
                busy={filterBusy}
                label="Delivery"
                onClick={() =>
                  void requestFilter({
                    deliveryFailed: true,
                    status: undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {url.filter.deliveryFailed ? null : (
              <StatusTabs
                busy={filterBusy}
                counts={counts.data ?? { byStatus: {}, total: 0 }}
                filter={url.filter}
                onFilterChange={(patch) => void requestFilter(patch)}
              />
            )}
            <Button
              aria-pressed={url.showAll}
              className="min-h-11 text-sm"
              onClick={() => url.setShowAll(!url.showAll)}
              size="sm"
              variant={url.showAll ? "secondary" : "ghost"}
            >
              {url.showAll ? "Showing all" : "Show all"}
            </Button>
          </div>

          <FilterChips
            busy={filterBusy}
            filter={url.filter}
            onFilterChange={(patch) => void requestFilter(patch)}
          />

          {url.filter.deliveryFailed ? (
            <p className="text-sm text-muted-foreground">
              Applicants whose last status email failed for good. They were
              never told — open one to get their phone number and Discord.
            </p>
          ) : null}

          {selected.hasEnded ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarOff className="size-4" aria-hidden="true" />
              Ended — read-only.
            </p>
          ) : null}
        </CardHeader>

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-primary/5 px-3 py-3 sm:px-4 md:px-6">
            <Badge className="text-sm" variant="secondary">
              {selectedCount} selected
            </Badge>
            {/*
              Named, because this row sits directly under the status tabs and
              carries the same six words. Without a label it reads as a second
              filter strip — and the difference is that these buttons send mail
              and cannot be recalled.
            */}
            <span className="text-sm font-medium">Move to</span>
            {(Object.keys(HACKER_STATUS_LABELS) as SendingStatus[]).map(
              (status) => (
                <Button
                  className="min-h-11 text-sm"
                  disabled={blocked}
                  key={status}
                  onClick={() => setBulkStatus(status)}
                  size="sm"
                  variant={status === "accepted" ? "primary" : "secondary"}
                >
                  {HACKER_STATUS_LABELS[status]}
                </Button>
              ),
            )}
            <Button
              className="ml-auto min-h-11 text-sm"
              disabled={filterBusy}
              onClick={selection.clear}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        ) : null}

        <CardContent className="px-0 py-0">
          {roster.isFetching || url.navigating ? (
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2 text-sm text-muted-foreground md:px-6">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Updating results
            </div>
          ) : null}

          {hackers.length === 0 && !roster.isPending && !failedToLoad ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">No applicants match these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear a filter above, or pick a different hackathon.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <HackerTable
                hackers={hackers}
                onOpen={(hacker) => setDetailId(hacker.attendeeId)}
                onSelectAllShown={(next) =>
                  selection.setAllShown(shownIds, next)
                }
                onToggle={selection.toggle}
                onToggleRange={(id) => selection.selectRange(id, shownIds)}
                selected={selection.selected}
              />
            </div>
          )}
        </CardContent>

        <div className="border-t border-border/70 px-3 py-3 text-sm text-muted-foreground sm:px-4 md:px-6">
          {/*
            States the cap. "1000 shown" beside a status tab reading 1448, with
            a header select-all that then mails 1000 of them, is the worst
            possible silence on this screen.
          */}
          {/*
            No `?? hackers.length` fallback: during the first load that asserted
            "50 of 50 shown", which is a claim about the whole hackathon made
            from one page of it.
          */}
          {hackers.length}
          {shownTotal === undefined ? "" : ` of ${shownTotal}`} shown
          {atCap
            ? ` · capped at ${SHOW_ALL_SIZE}; narrow the filter to reach the rest`
            : url.showAll
              ? ""
              : ` · first ${PAGE_SIZE}, use Show all to select across the list`}
          {" · "}click a row to open it, shift-click to select a range
        </div>
      </Card>

      <BulkConfirmDialog
        attendeeIds={selectedIds}
        hackathonId={selected.id}
        onDone={() => {
          setBulkStatus(null);
          selection.clear();
          void refresh();
        }}
        onOpenChange={(open) => {
          if (!open) setBulkStatus(null);
        }}
        status={bulkStatus}
      />

      <HackerDetailDialog
        attendeeId={detailId}
        blocked={blocked}
        blockedReason={blockedReason}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onSaved={() => {
          setDetailId(null);
          void refresh();
        }}
      />

      <FilterChangeDialog
        droppedCount={
          filterFlow.kind === "prompting" ? filterFlow.droppedIds.length : 0
        }
        onCancel={() => {
          // Only when the prompt was about the search. Rewinding
          // unconditionally meant cancelling a *status* prompt silently threw
          // away text the officer had typed but not yet committed.
          if (filterFlow.kind === "prompting" && "search" in filterFlow.patch) {
            setSearch(sentSearch);
          }
          setFilterFlow({ kind: "idle" });
        }}
        onProceed={() => {
          if (filterFlow.kind !== "prompting") return;
          const { droppedIds, patch } = filterFlow;
          selection.deselect(droppedIds);
          setFilterFlow({ kind: "idle" });
          if (url.setFilter(patch) && "search" in patch) {
            setSentSearch(patch.search ?? "");
          }
        }}
        open={filterFlow.kind === "prompting"}
        selectedCount={selectedCount}
      />
    </main>
  );
}
