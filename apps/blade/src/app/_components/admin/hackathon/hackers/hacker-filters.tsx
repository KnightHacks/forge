"use client";

import { Loader2, Search } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { HACKER_STATUS_LABELS } from "@forge/validators";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import type { RosterFilter } from "./hacker-roster";

type Counts = RouterOutputs["hacker"]["statusCounts"];
type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

const STATUS_ORDER: SendingStatus[] = [
  "pending",
  "accepted",
  "confirmed",
  "waitlisted",
  "denied",
  "withdrawn",
];

/**
 * Filters, and the per-status counts beside them.
 *
 * The counts are the filter: an officer clicks "462 Applied" rather than
 * choosing a status from a dropdown and then wondering how many that is. Legacy
 * put the numbers somewhere else entirely, so reading them meant leaving the
 * screen you act on.
 */
export function HackerFilters({
  busy,
  counts,
  filter,
  onFilterChange,
  onShowAllChange,
  showAll,
  shownCount,
}: {
  busy: boolean;
  counts: Counts;
  filter: RosterFilter;
  onFilterChange: (next: RosterFilter) => void;
  onShowAllChange: (next: boolean) => void;
  showAll: boolean;
  shownCount: number;
}) {
  const patch = (next: Partial<RosterFilter>) =>
    onFilterChange({ ...filter, ...next });

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="min-h-11"
            disabled={busy}
            onClick={() => patch({ status: undefined })}
            size="sm"
            variant={filter.status ? "ghost" : "secondary"}
          >
            All <span className="ml-1.5 opacity-70">{counts.total}</span>
          </Button>
          {STATUS_ORDER.map((status) => (
            <Button
              className="min-h-11"
              disabled={busy}
              key={status}
              onClick={() => patch({ status })}
              size="sm"
              variant={filter.status === status ? "secondary" : "ghost"}
            >
              {HACKER_STATUS_LABELS[status]}
              <span className="ml-1.5 opacity-70">
                {counts.byStatus[status] ?? 0}
              </span>
            </Button>
          ))}
          {busy ? (
            <Loader2
              aria-label="Checking your selection"
              className="size-4 animate-spin text-muted-foreground"
            />
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="hacker-search">Search</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                id="hacker-search"
                onChange={(event) =>
                  patch({ search: event.target.value || undefined })
                }
                placeholder="Name or email"
                value={filter.search ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hacker-school">School</Label>
            <Input
              id="hacker-school"
              onChange={(event) =>
                patch({ school: event.target.value || undefined })
              }
              placeholder="University of Central Florida"
              value={filter.school ?? ""}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hacker-grad-year">Graduation year</Label>
            <Input
              id="hacker-grad-year"
              inputMode="numeric"
              onChange={(event) =>
                patch({
                  graduationYear: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              placeholder="2030"
              value={filter.graduationYear ?? ""}
            />
            {/*
              Named for what it is. Nothing records that someone is a freshman,
              and inferring it from a graduation date is wrong for transfers and
              part-time students — at bulk scale that means accepting a cohort
              nobody meant to.
            */}
            <p className="text-sm text-muted-foreground">
              Not academic year — that is not recorded.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hacker-view">View</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-11"
                id="hacker-view"
                onClick={() => onShowAllChange(!showAll)}
                size="sm"
                variant={showAll ? "secondary" : "ghost"}
              >
                {showAll ? "Showing all" : "Show all"}
              </Button>
              <Button
                className="min-h-11"
                onClick={() =>
                  patch({ deliveryFailed: filter.deliveryFailed ? undefined : true })
                }
                size="sm"
                variant={filter.deliveryFailed ? "secondary" : "ghost"}
              >
                Email failed
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {shownCount} shown
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
