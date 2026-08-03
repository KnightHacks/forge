"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Loader2, TriangleAlert, Users } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { HackerRosterFilter } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { toast } from "@forge/ui/toast";
import { HACKER_STATUS_LABELS } from "@forge/validators";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { api } from "~/trpc/react";
import { BlacklistDialog } from "./blacklist-dialog";
import { BulkConfirmDialog } from "./bulk-confirm-dialog";
import { FilterChangeDialog } from "./filter-change-dialog";
import { HackerFilters } from "./hacker-filters";
import { HackerTable } from "./hacker-table";
import { useHackerSelection } from "./use-hacker-selection";

type Hackathon = RouterOutputs["hackathon"]["get"]["hackathon"];
type Roster = RouterOutputs["hacker"]["listForHackathon"]["hackers"];
type Counts = RouterOutputs["hacker"]["statusCounts"];
/** Derived from the validator, so the screen and the server cannot disagree. */
export type RosterFilter = HackerRosterFilter;

/** The paged default. Show-all raises it to cover a whole hackathon. */
const PAGE_SIZE = 50;
const SHOW_ALL_SIZE = 5000;

export function HackerRoster({
  hackathon,
  initialCounts,
  initialHackers,
  isConfigured,
}: {
  hackathon: Hackathon;
  initialCounts: Counts;
  initialHackers: Roster;
  isConfigured: boolean;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = () => startRefresh(() => router.refresh());

  const [filter, setFilter] = useState<RosterFilter>({});
  const [showAll, setShowAll] = useState(false);
  const selection = useHackerSelection();

  const [bulkStatus, setBulkStatus] = useState<
    keyof typeof HACKER_STATUS_LABELS | null
  >(null);
  const [blacklistTarget, setBlacklistTarget] = useState<Roster[number] | null>(
    null,
  );
  /**
   * A filter the officer asked for that would cost selections, held unapplied
   * until they decide. Carries the ids it would drop so the dialog can say how
   * many, and so proceeding drops exactly those.
   */
  const [pendingFilter, setPendingFilter] = useState<{
    droppedIds: string[];
    filter: RosterFilter;
  } | null>(null);
  const [checkingFilter, setCheckingFilter] = useState(false);
  const utils = api.useUtils();

  const roster = api.hacker.listForHackathon.useQuery(
    {
      filter,
      hackathonId: hackathon.id,
      limit: showAll ? SHOW_ALL_SIZE : PAGE_SIZE,
    },
    { initialData: { hackers: initialHackers } },
  );
  const counts = api.hacker.statusCounts.useQuery(
    { filter, hackathonId: hackathon.id },
    { initialData: initialCounts },
  );

  const hackers = roster.data.hackers;
  const shownIds = hackers.map((row) => row.attendeeId);
  const selectedCount = selection.selected.size;

  const setStatus = api.hacker.setStatus.useMutation({
    onError: (error) => {
      toast.error(error.message);
      refresh();
    },
    onSuccess: () => {
      toast.success("Status updated. The email is queued.");
      refresh();
    },
  });

  /**
   * Holds the requested filter and asks first, rather than applying and asking
   * afterwards. "Finish this action first" means abandoning a change that was
   * never committed — which is impossible if the change already landed.
   */
  const requestFilter = async (next: RosterFilter) => {
    if (selectedCount === 0) {
      setFilter(next);
      return;
    }

    // Asked server-side: the browser only knows the rows it has loaded, and
    // the case that matters is a selected row sitting on a page nobody is
    // looking at.
    setCheckingFilter(true);
    try {
      const survival = await utils.hacker.selectionSurvival.fetch({
        attendeeIds: [...selection.selected],
        filter: next,
        hackathonId: hackathon.id,
      });
      // Nothing at stake, so nothing to ask. A dialog that fires when there is
      // nothing to lose is how the real one gets clicked through.
      if (survival.droppedIds.length === 0) {
        setFilter(next);
        return;
      }
      setPendingFilter({ droppedIds: survival.droppedIds, filter: next });
    } catch {
      toast.error("Could not check the selection against that filter.");
    } finally {
      setCheckingFilter(false);
    }
  };

  const blocked = !isConfigured;

  return (
    <main className={adminPageLayoutClassName}>
      <Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">
        <Link href={`/admin/hackathon/${hackathon.id}`}>
          <ArrowLeft className="size-4" aria-hidden="true" />{" "}
          {hackathon.displayName}
        </Link>
      </Button>

      <AdminPageHeader
        description={`Everyone who applied to ${hackathon.displayName}. Filter to the group you mean, select across it, and act on them together.`}
        eyebrow={ADMIN_PAGE_EYEBROWS.hackers}
        icon={Users}
        title="Hackers"
      />

      {blocked ? (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
              Status changes are blocked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive/90">
            This hackathon does not have all six status emails configured, so
            moving anyone would leave them untold. Blacklisting and reading
            still work.{" "}
            <Link
              className="underline underline-offset-4"
              href={`/admin/hackathon/${hackathon.id}`}
            >
              Finish configuring it
            </Link>
            .
          </CardContent>
        </Card>
      ) : null}

      <HackerFilters
        counts={counts.data}
        filter={filter}
        busy={checkingFilter}
        onFilterChange={(next) => void requestFilter(next)}
        onShowAllChange={setShowAll}
        showAll={showAll}
        shownCount={hackers.length}
      />

      {selectedCount > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Badge className="gap-1" variant="secondary">
              {selectedCount} selected
            </Badge>
            {/*
              Every sending status, not just accept and deny. Withdraw is here
              rather than on the row because an officer withdrawing someone is
              rare — the applicant normally does it themselves.
            */}
            {(
              Object.keys(
                HACKER_STATUS_LABELS,
              ) as (keyof typeof HACKER_STATUS_LABELS)[]
            ).map((status) => (
              <Button
                className="min-h-11"
                disabled={blocked || isRefreshing}
                key={status}
                onClick={() => setBulkStatus(status)}
                size="sm"
                variant={status === "accepted" ? "primary" : "secondary"}
              >
                {HACKER_STATUS_LABELS[status]}
              </Button>
            ))}
            <Button
              className="min-h-11"
              onClick={selection.clear}
              size="sm"
              variant="ghost"
            >
              Clear selection
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <HackerTable
        busy={setStatus.isPending || isRefreshing}
        blocked={blocked}
        hackers={hackers}
        loading={roster.isFetching}
        onBlacklist={setBlacklistTarget}
        onSelectAllShown={(next) => selection.setAllShown(shownIds, next)}
        onSetStatus={(attendeeId, status) =>
          setStatus.mutate({ attendeeId, status })
        }
        onToggle={selection.toggle}
        onToggleRange={(id) => selection.selectRange(id, shownIds)}
        selected={selection.selected}
      />

      {roster.isFetching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading applicants…
        </p>
      ) : null}

      <BulkConfirmDialog
        attendeeIds={[...selection.selected]}
        hackathonId={hackathon.id}
        onDone={() => {
          setBulkStatus(null);
          selection.clear();
          refresh();
        }}
        onOpenChange={(open) => {
          if (!open) setBulkStatus(null);
        }}
        status={bulkStatus}
      />

      <BlacklistDialog
        hacker={blacklistTarget}
        onOpenChange={(open) => {
          if (!open) setBlacklistTarget(null);
        }}
        onSaved={() => {
          setBlacklistTarget(null);
          refresh();
        }}
      />

      <FilterChangeDialog
        droppedCount={pendingFilter?.droppedIds.length ?? 0}
        onCancel={() => setPendingFilter(null)}
        onFinishFirst={() => {
          // Abandons the filter change and sends the officer to the
          // confirmation panel with the selection whole.
          setPendingFilter(null);
          setBulkStatus("accepted");
        }}
        onProceed={() => {
          if (!pendingFilter) return;
          selection.deselect(pendingFilter.droppedIds);
          setFilter(pendingFilter.filter);
          setPendingFilter(null);
        }}
        open={pendingFilter !== null}
        selectedCount={selectedCount}
      />

      {blacklistTarget === null &&
      bulkStatus === null &&
      selectedCount === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ban className="size-4" aria-hidden="true" />
          Blacklisting an applicant never changes their status and is never
          shown to them.
        </p>
      ) : null}
    </main>
  );
}
