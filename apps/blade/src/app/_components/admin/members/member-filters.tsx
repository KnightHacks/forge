"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, SlidersHorizontal } from "lucide-react";

import type { AdminMemberListInput } from "@forge/validators";
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
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";

interface FilterOptions {
  companies: string[];
  genders: string[];
  graduationYears: number[];
  guildVisibilities: string[];
  levelsOfStudy: string[];
  majors: string[];
  racesOrEthnicities: string[];
  schools: string[];
}

function cloneFilters(input: AdminMemberListInput): AdminMemberListInput {
  return {
    ...input,
    companies: [...input.companies],
    duesStatuses: [...input.duesStatuses],
    genders: [...input.genders],
    graduationYears: [...input.graduationYears],
    guildVisibilities: [...input.guildVisibilities],
    levelsOfStudy: [...input.levelsOfStudy],
    majors: [...input.majors],
    racesOrEthnicities: [...input.racesOrEthnicities],
    schools: [...input.schools],
  };
}

function clearFilters(input: AdminMemberListInput): AdminMemberListInput {
  return {
    ...input,
    companies: [],
    duesStatuses: [],
    genders: [],
    graduationYears: [],
    guildVisibilities: [],
    joinedFrom: undefined,
    joinedTo: undefined,
    levelsOfStudy: [],
    majors: [],
    page: 1,
    racesOrEthnicities: [],
    schools: [],
  };
}

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
  const uniqueOptions = [...new Set(options)];
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between bg-background/70 font-normal"
          >
            <span className="truncate">
              {selected.length === 0
                ? `Any ${label.toLowerCase()}`
                : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {uniqueOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    className="min-h-11"
                    onSelect={() => toggle(option)}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary/40",
                        selected.includes(option) &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {selected.includes(option) && (
                        <Check className="h-3 w-3" />
                      )}
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

export function MemberFilters({
  input,
  onApply,
  options,
}: {
  input: AdminMemberListInput;
  onApply: (input: AdminMemberListInput) => void;
  options: FilterOptions;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => cloneFilters(input));
  const invalidDateRange = Boolean(
    draft.joinedFrom && draft.joinedTo && draft.joinedFrom > draft.joinedTo,
  );

  const openDialog = () => {
    setDraft(cloneFilters(input));
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2"
        onClick={openDialog}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-4xl overflow-y-auto border-white/10 bg-card/95 p-0 shadow-2xl motion-reduce:animate-none">
          <DialogHeader className="border-b border-border/70 px-5 py-5 pr-12 md:px-6">
            <DialogTitle>Filter members</DialogTitle>
            <DialogDescription>
              Values within one filter are combined with OR. Different filters
              are combined with AND.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:px-6">
            <MultiSelectFilter
              label="Dues status"
              options={["paid", "unpaid"]}
              selected={draft.duesStatuses}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  duesStatuses: values as ("paid" | "unpaid")[],
                }))
              }
            />
            <MultiSelectFilter
              label="School"
              options={options.schools}
              selected={draft.schools}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  schools: values,
                }))
              }
            />
            <MultiSelectFilter
              label="Major"
              options={options.majors}
              selected={draft.majors}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  majors: values as AdminMemberListInput["majors"],
                }))
              }
            />
            <MultiSelectFilter
              label="Level of study"
              options={options.levelsOfStudy}
              selected={draft.levelsOfStudy}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  levelsOfStudy:
                    values as AdminMemberListInput["levelsOfStudy"],
                }))
              }
            />
            <MultiSelectFilter
              label="Graduation year"
              options={options.graduationYears.map(String)}
              selected={draft.graduationYears.map(String)}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  graduationYears: values.map(Number),
                }))
              }
            />
            <MultiSelectFilter
              label="Company"
              options={options.companies}
              selected={draft.companies}
              onChange={(values) =>
                setDraft((current) => ({ ...current, companies: values }))
              }
            />
            <MultiSelectFilter
              label="Guild visibility"
              options={options.guildVisibilities}
              selected={draft.guildVisibilities}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  guildVisibilities: values as ("public" | "private")[],
                }))
              }
            />
            <MultiSelectFilter
              label="Gender"
              options={options.genders}
              selected={draft.genders}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  genders: values as AdminMemberListInput["genders"],
                }))
              }
            />
            <MultiSelectFilter
              label="Race or ethnicity"
              options={options.racesOrEthnicities}
              selected={draft.racesOrEthnicities}
              onChange={(values) =>
                setDraft((current) => ({
                  ...current,
                  racesOrEthnicities:
                    values as AdminMemberListInput["racesOrEthnicities"],
                }))
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="joined-from">Joined from</Label>
                <Input
                  id="joined-from"
                  type="date"
                  className="h-11 bg-background/70"
                  value={draft.joinedFrom ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      joinedFrom: event.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joined-to">Joined through</Label>
                <Input
                  id="joined-to"
                  type="date"
                  className="h-11 bg-background/70"
                  value={draft.joinedTo ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      joinedTo: event.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
            {invalidDateRange && (
              <p
                role="alert"
                className="text-sm font-medium text-destructive md:col-span-2"
              >
                Joined-from date must not be after joined-through date.
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-border/70 px-5 py-4 md:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(clearFilters(input))}
            >
              Reset all
            </Button>
            <Button
              type="button"
              disabled={invalidDateRange}
              onClick={() => {
                onApply({ ...draft, page: 1 });
                setOpen(false);
              }}
            >
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
