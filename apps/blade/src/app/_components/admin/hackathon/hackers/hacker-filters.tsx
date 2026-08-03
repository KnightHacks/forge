"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@forge/ui/command";
import { Label } from "@forge/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { GRADUATION_TERMS, HACKER_STATUS_LABELS } from "@forge/validators";

import type { RosterFilter } from "./hacker-roster";

type Options = RouterOutputs["hacker"]["listHackathonOptions"]["hackathons"];
type FilterOptions = RouterOutputs["hacker"]["filterOptions"];

export interface ActiveFilter {
  field: keyof RosterFilter;
  label: string;
}

export function activeFilters(filter: RosterFilter): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  if (filter.search) {
    chips.push({ field: "search", label: `“${filter.search}”` });
  }
  if (filter.schools?.length) {
    chips.push({
      field: "schools",
      label:
        filter.schools.length === 1
          ? (filter.schools[0] ?? "")
          : `${filter.schools.length} schools`,
    });
  }
  if (filter.levelsOfStudy?.length) {
    chips.push({
      field: "levelsOfStudy",
      label:
        filter.levelsOfStudy.length === 1
          ? (filter.levelsOfStudy[0] ?? "")
          : `${filter.levelsOfStudy.length} levels`,
    });
  }
  if (filter.graduationTerms?.length || filter.graduationYears?.length) {
    const terms = filter.graduationTerms?.join("/") ?? "";
    const years = filter.graduationYears?.join(", ") ?? "";
    chips.push({
      field: "graduationYears",
      label: `Graduating ${[terms, years].filter(Boolean).join(" ")}`,
    });
  }
  if (filter.deliveryFailed) {
    chips.push({ field: "deliveryFailed", label: "Email failed" });
  }
  if (filter.blacklisted) {
    chips.push({ field: "blacklisted", label: "Blacklisted" });
  }
  return chips;
}

/**
 * A searchable multi-select over values that actually appear in the data.
 *
 * The same `Command`-inside-`Popover` the member directory uses. Typing to
 * narrow matters here more than there: a hackathon's applicants can span
 * dozens of schools, and a plain list would be unusable long before that.
 */
function MultiSelectFilter({
  label,
  onChange,
  options,
  selected,
}: {
  label: string;
  onChange: (values: string[]) => void;
  options: readonly string[];
  selected: readonly string[];
}) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="h-11 w-full justify-between bg-background/70 font-normal"
            type="button"
            variant="outline"
          >
            <span className="truncate">
              {selected.length === 0
                ? `Any ${label.toLowerCase()}`
                : selected.length === 1
                  ? selected[0]
                  : `${selected.length} selected`}
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    className="min-h-11"
                    key={option}
                    onSelect={() => toggle(option)}
                    value={option}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary/40",
                        selected.includes(option) &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {selected.includes(option) ? (
                        <Check className="size-3" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * The hackathon picker and the advanced filters, behind a popover.
 *
 * Only search and the status tabs stay on the surface — those are touched
 * constantly. School, level of study and graduation are used once at the start
 * of a capacity round, so they live behind a trigger and surface as removable
 * chips once applied.
 */
export function HackerFilters({
  filter,
  hackathonId,
  hackathons,
  onFilterChange,
  onHackathonChange,
  options,
}: {
  filter: RosterFilter;
  hackathonId: string;
  hackathons: Options;
  onFilterChange: (next: RosterFilter) => void;
  onHackathonChange: (next: string) => void;
  options: FilterOptions;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RosterFilter>(filter);

  const openWith = (next: boolean) => {
    // Reseeded on open, so a cancelled edit does not persist into the next one.
    if (next) setDraft(filter);
    setOpen(next);
  };

  const appliedCount = activeFilters(filter).filter(
    (chip) => chip.field !== "search",
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="hacker-hackathon">
        Hackathon
      </label>
      <select
        className="h-11 min-w-0 max-w-64 rounded-md border border-input bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        id="hacker-hackathon"
        onChange={(event) => onHackathonChange(event.target.value)}
        value={hackathonId}
      >
        {hackathons.map((hackathon) => (
          <option key={hackathon.id} value={hackathon.id}>
            {hackathon.displayName}
            {hackathon.hasEnded ? " · ended" : ""}
          </option>
        ))}
      </select>

      <Popover onOpenChange={openWith} open={open}>
        <PopoverTrigger asChild>
          <Button className="h-11 gap-2 bg-background/70" variant="outline">
            <Filter className="size-4" aria-hidden="true" />
            Filters
            {appliedCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 text-sm text-primary">
                {appliedCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-4">
          <div className="grid gap-4">
            <MultiSelectFilter
              label="School"
              onChange={(schools) => setDraft({ ...draft, schools })}
              options={options.schools}
              selected={draft.schools ?? []}
            />
            <MultiSelectFilter
              label="Level of study"
              onChange={(levelsOfStudy) =>
                setDraft({ ...draft, levelsOfStudy })
              }
              options={options.levelsOfStudy}
              selected={draft.levelsOfStudy ?? []}
            />

            {/*
              Term and year as two boxes, because an officer thinks "Spring
              2027", not "a date in the first five months of 2027". Term is
              derived from the graduation month rather than stored — see
              GRADUATION_TERMS.
            */}
            <div className="grid grid-cols-2 gap-2">
              <MultiSelectFilter
                label="Grad term"
                onChange={(terms) =>
                  setDraft({
                    ...draft,
                    graduationTerms: terms as RosterFilter["graduationTerms"],
                  })
                }
                options={GRADUATION_TERMS}
                selected={draft.graduationTerms ?? []}
              />
              <MultiSelectFilter
                label="Grad year"
                onChange={(years) =>
                  setDraft({
                    ...draft,
                    graduationYears: years.map(Number),
                  })
                }
                options={options.graduationYears.map(String)}
                selected={(draft.graduationYears ?? []).map(String)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Only show</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-pressed={draft.blacklisted === true}
                  className="min-h-11 text-sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      blacklisted: draft.blacklisted ? undefined : true,
                    })
                  }
                  size="sm"
                  variant={draft.blacklisted ? "secondary" : "outline"}
                >
                  Blacklisted
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                className="min-h-11"
                onClick={() => {
                  // `deliveryFailed` survives: it is the pane the officer is
                  // in, not a filter they set. Clearing it here threw them out
                  // of the worklist they were working to empty.
                  onFilterChange({
                    deliveryFailed: filter.deliveryFailed,
                    search: filter.search,
                    status: filter.status,
                  });
                  setOpen(false);
                }}
                variant="ghost"
              >
                Clear
              </Button>
              <Button
                className="min-h-11"
                onClick={() => {
                  onFilterChange({
                    ...draft,
                    deliveryFailed: filter.deliveryFailed,
                    search: filter.search,
                  });
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The status tabs, with their counts. Always visible — this is the main axis. */
export function StatusTabs({
  busy,
  counts,
  filter,
  onFilterChange,
}: {
  busy: boolean;
  counts: RouterOutputs["hacker"]["statusCounts"];
  filter: RosterFilter;
  onFilterChange: (next: RosterFilter) => void;
}) {
  const order = [
    "pending",
    "accepted",
    "confirmed",
    "waitlisted",
    "denied",
    "withdrawn",
  ] as const;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <StatusTab
        active={!filter.status}
        busy={busy}
        count={counts.total}
        label="All"
        onClick={() => onFilterChange({ ...filter, status: undefined })}
      />
      {order.map((status) => (
        <StatusTab
          active={filter.status === status}
          busy={busy}
          count={counts.byStatus[status] ?? 0}
          key={status}
          label={HACKER_STATUS_LABELS[status]}
          onClick={() => onFilterChange({ ...filter, status })}
        />
      ))}
    </div>
  );
}

function StatusTab({
  active,
  busy,
  count,
  label,
  onClick,
}: {
  active: boolean;
  busy: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-primary/15 font-medium text-primary"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className={active ? "opacity-80" : "opacity-60"}>{count}</span>
    </button>
  );
}

/** Removable chips for whatever is applied, matching the member directory. */
export function FilterChips({
  filter,
  onFilterChange,
}: {
  filter: RosterFilter;
  onFilterChange: (next: RosterFilter) => void;
}) {
  const chips = activeFilters(filter);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-sm text-primary hover:bg-primary/15"
          key={chip.field}
          onClick={() =>
            onFilterChange({
              ...filter,
              // The grad chip owns both halves, so removing it clears both.
              ...(chip.field === "graduationYears"
                ? { graduationTerms: undefined, graduationYears: undefined }
                : { [chip.field]: undefined }),
            })
          }
          type="button"
        >
          <span className="max-w-56 truncate">{chip.label}</span>
          <X className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <Button
        className="min-h-11"
        onClick={() =>
          onFilterChange({
            deliveryFailed: filter.deliveryFailed,
            status: filter.status,
          })
        }
        size="sm"
        variant="ghost"
      >
        Clear filters
      </Button>
    </div>
  );
}
