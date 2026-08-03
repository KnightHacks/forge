"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
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
  const url = useRosterUrlState();
  const selection = useHackerSelection();
  const utils = api.useUtils();

  const [bulkStatus, setBulkStatus] = useState<SendingStatus | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingFilter, setPendingFilter] = useState<{
    droppedIds: string[];
    filter: RosterFilter;
  } | null>(null);
  const [checkingFilter, setCheckingFilter] = useState(false);
  /** Set when this component initiates a URL change, so the selection survives it. */
  const ownChangeRef = useRef(false);
  const [search, setSearch] = useState(url.filter.search ?? "");
  /**
   * What we last pushed into the URL ourselves.
   *
   * Without it the resync below cannot tell "the officer removed the search
   * chip" from "my own debounced commit just landed", so a commit arriving
   * mid-word rewound the box and ate whatever had been typed since — which is
   * the common case on a dynamic route, not the edge one.
   */
  const committedSearchRef = useRef(url.filter.search ?? "");

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

  const hackers = roster.data?.hackers ?? [];
  const shownIds = hackers.map((row) => row.attendeeId);
  const shownKey = shownIds.join(",");
  const selectedCount = selection.selected.size;

  // The shift anchor belongs to the list it was set in. Keyed on the rows
  // themselves, because show-all and a hackathon switch change the list too.
  const { resetAnchor } = selection;
  useEffect(() => resetAnchor(), [resetAnchor, shownKey]);

  /**
   * Clears the selection when the view changes underneath it.
   *
   * Back/forward changes the URL without going through `requestFilter`, so the
   * survival prompt never runs — and the selection would then span rows the
   * officer cannot see, or belong to a different hackathon entirely. The key
   * includes the hackathon for exactly that reason: backing from hackathon B to
   * A kept "12 selected" holding B's ids, which a bulk action then resolved as
   * every applicant missing.
   *
   * `ownChangeRef` is what keeps this from firing on our own commits — a
   * debounced search landing while a bulk dialog is open would otherwise empty
   * the selection under it and re-fire the preview with nothing in it.
   */
  const viewKey = `${hackathonId}:${JSON.stringify(url.filter)}`;
  const lastViewKeyRef = useRef(viewKey);
  useEffect(() => {
    if (viewKey === lastViewKeyRef.current) return;
    const ours = ownChangeRef.current;
    lastViewKeyRef.current = viewKey;
    ownChangeRef.current = false;
    if (!ours && selection.selected.size > 0) {
      selection.clear();
      toast.info("Selection cleared — the view changed.");
    }
  }, [selection, viewKey]);

  // Search commits on a pause. Per keystroke it round-trips through the URL
  // and, with a selection active, a server survival check — which blanked the
  // field mid-word and fired a dialog per character.

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

  const requestFilter = useCallback(
    async (next: RosterFilter) => {
      if (selectedCount === 0) {
        url.setFilter(next);
        return;
      }
      setCheckingFilter(true);
      try {
        // Asked server-side: the browser only knows the rows it has loaded, and
        // the case that matters is a selected row on a page nobody is looking at.
        const survival = await utils.hacker.selectionSurvival.fetch({
          attendeeIds: [...selection.selected],
          filter: next,
          hackathonId,
        });
        if (survival.droppedIds.length === 0) {
          url.setFilter(next);
          return;
        }
        setPendingFilter({ droppedIds: survival.droppedIds, filter: next });
      } catch {
        toast.error("Could not check the selection against that filter.");
      } finally {
        setCheckingFilter(false);
      }
    },
    [hackathonId, selection.selected, url, utils],
  );

  /**
   * The live filter and the request function, held in refs.
   *
   * `useRosterUrlState` rebuilds its return value every render, so naming
   * `url` or `requestFilter` as effect dependencies re-armed the 350 ms timer
   * on every render — and when the pending search opened the survival dialog
   * instead of committing, `url.filter.search` never caught up, so it fired
   * again, and again. Refs read the current values without making the effect
   * re-run.
   */
  const filterRef = useRef(url.filter);
  filterRef.current = url.filter;
  const requestFilterRef = useRef(requestFilter);
  requestFilterRef.current = requestFilter;

  // Resyncs only when the URL's search changed to something we did not write —
  // removing the chip, "Clear filters", or browser Back.
  useEffect(() => {
    const fromUrl = url.filter.search ?? "";
    if (fromUrl === committedSearchRef.current) return;
    committedSearchRef.current = fromUrl;
    setSearch(fromUrl);
  }, [url.filter.search]);

  useEffect(() => {
    if (search === committedSearchRef.current) return;
    const timer = setTimeout(() => {
      committedSearchRef.current = search;
      void requestFilterRef.current({
        ...filterRef.current,
        search: search || undefined,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

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

  // The cap has to be stated. "1000 shown" beside a status tab reading 1448,
  // with a header select-all that then mails 1000 of them, is the worst
  // possible silence on this screen.
  const atCap = url.showAll && hackers.length === SHOW_ALL_SIZE;
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
              onFilterChange={(next) => void requestFilter(next)}
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
                label="Roster"
                onClick={() =>
                  void requestFilter({
                    ...url.filter,
                    deliveryFailed: undefined,
                  })
                }
              />
              <PaneTab
                active={url.filter.deliveryFailed === true}
                label="Delivery"
                onClick={() =>
                  void requestFilter({
                    ...url.filter,
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
                busy={checkingFilter}
                counts={counts.data ?? { byStatus: {}, total: 0 }}
                filter={url.filter}
                onFilterChange={(next) => void requestFilter(next)}
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
            filter={url.filter}
            onFilterChange={(next) => void requestFilter(next)}
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
          {hackers.length} of {counts.data?.total ?? hackers.length} shown
          {atCap
            ? ` · capped at ${SHOW_ALL_SIZE}; narrow the filter to reach the rest`
            : url.showAll
              ? ""
              : ` · first ${PAGE_SIZE}, use Show all to select across the list`}
          {" · "}click a row to open it, shift-click to select a range
        </div>
      </Card>

      <BulkConfirmDialog
        attendeeIds={[...selection.selected]}
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
        droppedCount={pendingFilter?.droppedIds.length ?? 0}
        onCancel={() => setPendingFilter(null)}
        onProceed={() => {
          if (!pendingFilter) return;
          selection.deselect(pendingFilter.droppedIds);
          ownChangeRef.current = true;
          url.setFilter(pendingFilter.filter);
          setPendingFilter(null);
        }}
        open={pendingFilter !== null}
        selectedCount={selectedCount}
      />
    </main>
  );
}
