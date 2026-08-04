"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { GRADUATION_TERMS, HACKER_STATUS_LABELS } from "@forge/validators";

import type { RosterFilter } from "./hacker-roster";
import type { RosterFilterPatch } from "./use-roster-url-state";
import { clearedFacets } from "./use-roster-url-state";

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
  // One chip per facet, named by its own plural, so removing one is
  // unambiguous — a generic "5 filters" chip cannot say which it drops.
  for (const [field, plural] of [
    ["majors", "majors"],
    ["racesOrEthnicities", "races"],
    ["genders", "genders"],
    ["countries", "countries"],
    ["shirtSizes", "shirt sizes"],
  ] as const) {
    const values = filter[field];
    if (!values?.length) continue;
    chips.push({
      field,
      label:
        values.length === 1 ? (values[0] ?? "") : `${values.length} ${plural}`,
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
  busy,
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
  busy: boolean;
  onFilterChange: (patch: RosterFilterPatch) => void;
  onHackathonChange: (next: string) => void;
  options: FilterOptions;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RosterFilter>(filter);
  /**
   * The draft as it was seeded, so Apply can send only what the officer touched.
   *
   * `filter` comes from the URL, which does not update until the server
   * responds — so a panel opened during a navigation is seeded from a stale
   * copy. Sending all five facets unconditionally then made this a
   * `{...snapshot, oneChange}` write wearing a patch's clothes: remove the UCF
   * chip, open the panel inside that window, tick a level of study, Apply, and
   * the chip an officer just removed came back. Diffing against the seed means
   * a facet they never touched is simply absent from the patch, and whatever
   * happened to it meanwhile survives.
   */
  const [seed, setSeed] = useState<RosterFilter>(filter);

  const openWith = (next: boolean) => {
    // Reseeded on open, so a cancelled edit does not persist into the next one.
    if (next) {
      setDraft(filter);
      setSeed(filter);
    }
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
        disabled={busy}
        className="h-11 min-w-0 max-w-64 rounded-md border border-input bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        id="hacker-hackathon"
        onChange={(event) => onHackathonChange(event.target.value)}
        value={hackathonId}
      >
        {/*
          Rendered in the order the server returned them — nearest start date
          first — rather than re-sorted here. An officer opening this screen
          wants the hackathon about to happen, and alphabetical put "Knight
          Hacks IX" above whatever is running next week.
        */}
        {hackathons.map((hackathon) => (
          <option key={hackathon.id} value={hackathon.id}>
            {hackathon.displayName}
            {hackathon.hasEnded ? " · ended" : ""}
          </option>
        ))}
      </select>

      <Button
        className="h-11 gap-2 bg-background/70"
        disabled={busy}
        onClick={() => openWith(true)}
        type="button"
        variant="outline"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {appliedCount > 0 ? (
          <span className="rounded-full bg-primary/15 px-2 text-sm text-primary">
            {appliedCount}
          </span>
        ) : null}
      </Button>

      {/*
        A dialog rather than a popover, matching the member directory. Ten
        facets do not fit a 24rem popover without becoming a scroll-within-a-
        scroll, and an officer building a capacity filter is doing deliberate
        work, not glancing.
      */}
      <Dialog onOpenChange={openWith} open={open}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-4xl overflow-y-auto border-white/10 bg-card/95 p-0 shadow-2xl">
          <DialogHeader className="border-b border-border/70 px-5 py-5 pr-12 md:px-6">
            <DialogTitle>Filter applicants</DialogTitle>
            <DialogDescription>
              Values within one filter are combined with OR. Different filters
              are combined with AND. Status lives on the tabs behind this.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:px-6">
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
            <MultiSelectFilter
              label="Major"
              onChange={(majors) => setDraft({ ...draft, majors })}
              options={options.majors}
              selected={draft.majors ?? []}
            />
            <MultiSelectFilter
              label="Race or ethnicity"
              onChange={(racesOrEthnicities) =>
                setDraft({ ...draft, racesOrEthnicities })
              }
              options={options.racesOrEthnicities}
              selected={draft.racesOrEthnicities ?? []}
            />
            <MultiSelectFilter
              label="Gender"
              onChange={(genders) => setDraft({ ...draft, genders })}
              options={options.genders}
              selected={draft.genders ?? []}
            />
            <MultiSelectFilter
              label="Country"
              onChange={(countries) => setDraft({ ...draft, countries })}
              options={options.countries}
              selected={draft.countries ?? []}
            />
            <MultiSelectFilter
              label="Shirt size"
              onChange={(shirtSizes) => setDraft({ ...draft, shirtSizes })}
              options={options.shirtSizes}
              selected={draft.shirtSizes ?? []}
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
          </div>

          <DialogFooter className="border-t border-border/70 px-5 py-4 md:px-6">
            <Button
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                // Only the facets this panel owns. Search, status and the pane
                // are untouched because they are not named — and
                // `deliveryFailed` in particular is the worklist the officer is
                // working to empty, not a filter they set.
                onFilterChange(clearedFacets());
                setOpen(false);
              }}
              variant="ghost"
            >
              Clear
            </Button>
            <Button
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                onFilterChange(changedFacets(seed, draft));
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Only the facets whose value actually differs from what the panel was seeded
 * with, compared as sets — the multi-selects append, so re-ticking a school an
 * officer had just unticked yields the same set in a different order, which
 * would otherwise read as a change and cost a navigation and a survival check.
 */
export function changedFacets(
  seed: RosterFilter,
  draft: RosterFilter,
): RosterFilterPatch {
  const patch: RosterFilterPatch = {};
  if (seed.blacklisted !== draft.blacklisted) {
    patch.blacklisted = draft.blacklisted;
  }
  if (differs(seed.schools, draft.schools)) patch.schools = draft.schools;
  if (differs(seed.levelsOfStudy, draft.levelsOfStudy)) {
    patch.levelsOfStudy = draft.levelsOfStudy;
  }
  if (differs(seed.graduationTerms, draft.graduationTerms)) {
    patch.graduationTerms = draft.graduationTerms;
  }
  if (differs(seed.graduationYears, draft.graduationYears)) {
    patch.graduationYears = draft.graduationYears;
  }
  return patch;
}

function differs(
  left: (number | string)[] | undefined,
  right: (number | string)[] | undefined,
) {
  const a = [...(left ?? [])].map(String).sort();
  const b = [...(right ?? [])].map(String).sort();
  return a.length !== b.length || a.some((value, index) => value !== b[index]);
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
  onFilterChange: (patch: RosterFilterPatch) => void;
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
        onClick={() => onFilterChange({ status: undefined })}
      />
      {order.map((status) => (
        <StatusTab
          active={filter.status === status}
          busy={busy}
          count={counts.byStatus[status] ?? 0}
          key={status}
          label={HACKER_STATUS_LABELS[status]}
          onClick={() => onFilterChange({ status })}
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
  busy,
  filter,
  onFilterChange,
}: {
  filter: RosterFilter;
  busy: boolean;
  onFilterChange: (patch: RosterFilterPatch) => void;
}) {
  const chips = activeFilters(filter);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-sm text-primary hover:bg-primary/15 disabled:opacity-50"
          disabled={busy}
          key={chip.field}
          onClick={() =>
            onFilterChange(
              // The grad chip owns both halves, so removing it clears both.
              chip.field === "graduationYears"
                ? { graduationTerms: undefined, graduationYears: undefined }
                : { [chip.field]: undefined },
            )
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
        disabled={busy}
        onClick={() =>
          // Search too, since it has a chip here. The pane and the status tab
          // are not chips, so "Clear filters" leaves them where they are.
          onFilterChange({ ...clearedFacets(), search: undefined })
        }
        size="sm"
        variant="ghost"
      >
        Clear filters
      </Button>
    </div>
  );
}
