"use client";

import { useEffect, useId, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { EmploymentInput } from "@forge/validators";
import { CAREER } from "@forge/consts";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";

import { api } from "~/trpc/react";

type CompanyResult = RouterOutputs["career"]["searchCompanies"][number];
type CityResult = RouterOutputs["career"]["searchUsCities"][number];

export interface CareerHistoryDraft extends Omit<
  EmploymentInput,
  "experienceType" | "state" | "title"
> {
  cityLabel: string | null;
  companyLabel: string;
  draftId: string;
  experienceType: EmploymentInput["experienceType"] | null;
  state: EmploymentInput["state"] | "unknown";
  title: string | null;
}

interface EmploymentHistoryEditorProps {
  currentCityKey: string | null;
  currentCityLabel: string | null;
  guildLocationVisible: boolean;
  history: CareerHistoryDraft[];
  onCurrentCityChange: (city: CityResult | null) => void;
  onGuildLocationVisibleChange: (visible: boolean) => void;
  onHistoryChange: (history: CareerHistoryDraft[]) => void;
}

const blankExperience = (): CareerHistoryDraft => ({
  cityKey: null,
  cityLabel: null,
  companyId: null,
  companyLabel: "",
  draftId: crypto.randomUUID(),
  endMonth: null,
  experienceType: "full_time",
  guildVisible: true,
  proposedCompanyName: null,
  startMonth: null,
  state: "current",
  title: "",
});

function SearchResults({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-white/10 bg-popover p-1 shadow-xl"
      role="listbox"
    >
      {children}
    </div>
  );
}

function CompanyPicker({
  entry,
  onChange,
}: {
  entry: CareerHistoryDraft;
  onChange: (entry: CareerHistoryDraft) => void;
}) {
  const utils = api.useUtils();
  const query = entry.companyLabel;
  const [resultState, setResultState] = useState<{
    matches: CompanyResult[];
    query: string;
  }>({ matches: [], query: "" });
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const trimmedQuery = query.trim();
  const results =
    !entry.companyId && resultState.query === trimmedQuery
      ? resultState.matches
      : [];

  useEffect(() => {
    if (trimmedQuery.length < 2 || entry.companyId) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void utils.career.searchCompanies
        .fetch({ query: trimmedQuery })
        .then((matches) => {
          if (!active) return;
          setResultState({ matches, query: trimmedQuery });
          setOpen(true);
        })
        .catch(() => {
          if (active) setResultState({ matches: [], query: trimmedQuery });
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [entry.companyId, trimmedQuery, utils.career.searchCompanies]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
        Company
      </label>
      <Input
        id={inputId}
        value={query}
        placeholder="Search companies"
        autoComplete="off"
        className="h-11 bg-background/70"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          const value = event.target.value;
          setOpen(true);
          onChange({
            ...entry,
            companyId: null,
            companyLabel: value,
            proposedCompanyName: value.trim() || null,
          });
        }}
        onFocus={() => setOpen(results.length > 0)}
      />
      <SearchResults visible={open && results.length > 0}>
        {results.map((company) => (
          <button
            key={company.id}
            type="button"
            role="option"
            aria-selected={entry.companyId === company.id}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(false);
              onChange({
                ...entry,
                companyId: company.id,
                companyLabel: company.displayName,
                proposedCompanyName: null,
              });
            }}
          >
            <span>{company.displayName}</span>
            {company.reviewState === "pending" && (
              <span className="text-xs text-muted-foreground">
                Pending review
              </span>
            )}
          </button>
        ))}
      </SearchResults>
      {!entry.companyId && entry.proposedCompanyName && (
        <p className="mt-2 text-xs text-muted-foreground">
          New company · visible publicly after officer review
        </p>
      )}
    </div>
  );
}

function CityPicker({
  label,
  onChange,
  selectionKey,
}: {
  label: string | null;
  onChange: (city: CityResult | null) => void;
  selectionKey: string | null;
}) {
  const utils = api.useUtils();
  const [query, setQuery] = useState(label ?? "");
  const [resultState, setResultState] = useState<{
    matches: CityResult[];
    query: string;
  }>({ matches: [], query: "" });
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const trimmedQuery = query.trim();
  const results =
    trimmedQuery !== label && resultState.query === trimmedQuery
      ? resultState.matches
      : [];

  useEffect(() => {
    if (!selectionKey || !label) return;
    const timeout = window.setTimeout(() => setQuery(label), 0);
    return () => window.clearTimeout(timeout);
  }, [label, selectionKey]);

  useEffect(() => {
    if (trimmedQuery.length < 2 || trimmedQuery === label) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void utils.career.searchUsCities
        .fetch({ query: trimmedQuery })
        .then((matches) => {
          if (!active) return;
          setResultState({ matches, query: trimmedQuery });
          setOpen(true);
        })
        .catch(() => {
          if (active) setResultState({ matches: [], query: trimmedQuery });
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [label, trimmedQuery, utils.career.searchUsCities]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
        City
      </label>
      <Input
        id={inputId}
        value={query}
        placeholder="Search U.S. cities"
        autoComplete="off"
        className="h-11 bg-background/70"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          onChange(null);
        }}
        onFocus={() => setOpen(results.length > 0)}
      />
      <SearchResults visible={open && results.length > 0}>
        {results.map((city) => (
          <button
            key={city.key}
            type="button"
            role="option"
            aria-selected={label === city.label}
            className="flex min-h-11 w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery(city.label);
              setOpen(false);
              onChange(city);
            }}
          >
            {city.label}
          </button>
        ))}
      </SearchResults>
    </div>
  );
}

export function EmploymentHistoryEditor({
  currentCityKey,
  currentCityLabel,
  guildLocationVisible,
  history,
  onCurrentCityChange,
  onGuildLocationVisibleChange,
  onHistoryChange,
}: EmploymentHistoryEditorProps) {
  const updateEntry = (index: number, next: CareerHistoryDraft) => {
    onHistoryChange(
      history.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
    );
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= history.length) return;
    const next = [...history];
    const [entry] = next.splice(index, 1);
    if (!entry) return;
    next.splice(destination, 0, entry);
    onHistoryChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Employment history</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add current and past roles. Each public entry can appear on Guild
            once its company is approved.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 gap-2"
          onClick={() => onHistoryChange([...history, blankExperience()])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add experience
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Employment history is optional. Add a role whenever it is useful.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry, index) => (
            <section
              key={entry.draftId}
              data-career-draft-id={entry.draftId}
              className="rounded-md border border-white/10 bg-background/60 p-4"
              aria-label={`Employment experience ${index + 1}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BriefcaseBusiness
                    className="size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.companyLabel || `Experience ${index + 1}`}
                    </p>
                    {entry.state === "unknown" && (
                      <p className="text-xs text-[#DBC049]">
                        Unconfirmed legacy entry
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move experience up"
                    disabled={index === 0}
                    onClick={() => moveEntry(index, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move experience down"
                    disabled={index === history.length - 1}
                    onClick={() => moveEntry(index, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove experience"
                    onClick={() =>
                      onHistoryChange(
                        history.filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CompanyPicker
                  entry={entry}
                  onChange={(next) => updateEntry(index, next)}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Position title
                  </label>
                  <Input
                    value={entry.title ?? ""}
                    maxLength={120}
                    placeholder="Software Engineer"
                    className="h-11 bg-background/70"
                    onChange={(event) =>
                      updateEntry(index, {
                        ...entry,
                        title: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Experience type
                  </label>
                  <Select
                    value={entry.experienceType ?? undefined}
                    onValueChange={(value) =>
                      updateEntry(index, {
                        ...entry,
                        experienceType:
                          value as EmploymentInput["experienceType"],
                      })
                    }
                  >
                    <SelectTrigger className="h-11 bg-background/70">
                      <SelectValue placeholder="Choose a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAREER.EMPLOYMENT_EXPERIENCE_TYPES.map(
                        (
                          type: (typeof CAREER.EMPLOYMENT_EXPERIENCE_TYPES)[number],
                        ) => (
                          <SelectItem key={type} value={type}>
                            {CAREER.EMPLOYMENT_EXPERIENCE_LABELS[type]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Employment status
                  </label>
                  <Select
                    value={entry.state}
                    onValueChange={(value) =>
                      updateEntry(index, {
                        ...entry,
                        endMonth: value === "current" ? null : entry.endMonth,
                        state: value as "current" | "past",
                      })
                    }
                  >
                    <SelectTrigger className="h-11 bg-background/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="past">Former</SelectItem>
                      {entry.state === "unknown" && (
                        <SelectItem value="unknown" disabled>
                          Unconfirmed
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Start month
                  </label>
                  <Input
                    type="month"
                    value={entry.startMonth ?? ""}
                    className="h-11 bg-background/70"
                    onChange={(event) =>
                      updateEntry(index, {
                        ...entry,
                        startMonth: event.target.value || null,
                      })
                    }
                  />
                </div>
                {entry.state !== "current" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      End month
                    </label>
                    <Input
                      type="month"
                      value={entry.endMonth ?? ""}
                      className="h-11 bg-background/70"
                      onChange={(event) =>
                        updateEntry(index, {
                          ...entry,
                          endMonth: event.target.value || null,
                        })
                      }
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <CityPicker
                    label={entry.cityLabel}
                    selectionKey={entry.cityKey}
                    onChange={(city) =>
                      updateEntry(index, {
                        ...entry,
                        cityKey: city?.key ?? null,
                        cityLabel: city?.label ?? null,
                      })
                    }
                  />
                  {entry.state === "current" &&
                    entry.cityKey &&
                    entry.cityKey !== currentCityKey && (
                      <Button
                        type="button"
                        variant="link"
                        className="mt-1 h-auto px-0 text-sm"
                        onClick={() => {
                          const cityKey = entry.cityKey;
                          const cityLabel = entry.cityLabel;
                          if (!cityKey || !cityLabel) return;
                          onCurrentCityChange({
                            key: cityKey,
                            label: cityLabel,
                            latitude: 0,
                            longitude: 0,
                            name: cityLabel.split(",")[0] ?? "",
                            state: cityLabel.split(",")[1]?.trim() ?? "",
                          });
                        }}
                      >
                        Use as my current Guild city
                      </Button>
                    )}
                </div>
                <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/10 bg-background/70 px-3 py-2 md:col-span-2">
                  <span className="text-sm">Make this experience public</span>
                  <Switch
                    aria-label="Make this experience public"
                    checked={entry.guildVisible}
                    onCheckedChange={(checked) =>
                      updateEntry(index, {
                        ...entry,
                        guildVisible: checked,
                      })
                    }
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="rounded-md border border-white/10 bg-background/60 p-4">
        <div className="mb-4 flex items-start gap-3">
          <MapPin
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-medium">Current Guild city</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              This is the only location used on the Guild globe. It is never
              inferred from a school or employer.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <CityPicker
            label={currentCityLabel}
            selectionKey={currentCityKey}
            onChange={onCurrentCityChange}
          />
          <label
            className={cn(
              "flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/10 bg-background/70 px-3 py-2 md:min-w-52",
            )}
          >
            <span className="text-sm">Show on Guild</span>
            <Switch
              aria-label="Show location on Guild"
              checked={guildLocationVisible}
              onCheckedChange={onGuildLocationVisibleChange}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
