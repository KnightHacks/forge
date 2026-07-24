"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import {
  Filter,
  Loader2,
  RotateCcw,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { GuildListProfilesInput, GuildProfile } from "@forge/validators";
import { GUILD } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import { MemberCard } from "~/app/_components/member-card";
import { SiteHeader } from "~/app/_components/site-header";
import { api } from "~/trpc/react";

type Filters = Omit<GuildListProfilesInput, "cursor" | "limit" | "seed">;
type FilterOptions = RouterOutputs["guild"]["getFilterOptions"];
type Page = RouterOutputs["guild"]["listProfiles"];

interface GuildDirectoryProps {
  filterOptions: FilterOptions;
  initialFilters: Filters;
  initialPage: Page;
  seed: string;
}

function directoryPath(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  filters.memberStatuses.forEach((value) => params.append("status", value));
  filters.graduationYears.forEach((value) =>
    params.append("year", String(value)),
  );
  filters.memberSinceYears.forEach((value) =>
    params.append("joined", String(value)),
  );
  filters.schools.forEach((value) => params.append("school", value));
  filters.majors.forEach((value) => params.append("major", value));
  filters.opportunityStatuses.forEach((value) =>
    params.append("opportunity", value),
  );
  if (filters.resumeAvailable !== undefined) {
    params.set("resume", filters.resumeAvailable ? "yes" : "no");
  }
  if (filters.teamMembersOnly) params.set("team", "yes");

  return params.size > 0 ? `/?${params.toString()}` : "/";
}

export function GuildDirectory({
  filterOptions,
  initialFilters,
  initialPage,
  seed,
}: GuildDirectoryProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isNavigating, startNavigation] = useTransition();
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [profiles, setProfiles] = useState<GuildProfile[]>(
    initialPage.profiles,
  );
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [entranceBatchStart, setEntranceBatchStart] = useState(
    initialPage.profiles.length,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeFilterCount =
    initialFilters.memberStatuses.length +
    initialFilters.graduationYears.length +
    initialFilters.memberSinceYears.length +
    initialFilters.schools.length +
    initialFilters.majors.length +
    initialFilters.opportunityStatuses.length +
    (initialFilters.teamMembersOnly ? 1 : 0) +
    (initialFilters.resumeAvailable === undefined ? 0 : 1);

  const navigate = (nextFilters: Filters) => {
    startNavigation(() => {
      router.push(directoryPath(nextFilters));
    });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextFilters = {
      ...initialFilters,
      query: query.trim() || undefined,
    };
    setDraft(nextFilters);
    navigate(nextFilters);
  };

  const clearAll = () => {
    const cleared: Filters = {
      graduationYears: [],
      majors: [],
      memberSinceYears: [],
      memberStatuses: [],
      opportunityStatuses: [],
      schools: [],
      teamMembersOnly: false,
    };
    setQuery("");
    setDraft(cleared);
    setFiltersOpen(false);
    navigate(cleared);
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const page = await utils.guild.listProfiles.fetch({
        ...initialFilters,
        cursor: nextCursor,
        seed,
      });
      setEntranceBatchStart(profiles.length);
      setProfiles((current) => {
        const ids = new Set(current.map((profile) => profile.id));
        return [
          ...current,
          ...page.profiles.filter((profile) => !ids.has(profile.id)),
        ];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "More Guild profiles could not be loaded.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="guild-shell">
        <SiteHeader />
        <main>
          <section>
            <div className="container py-8 md:py-10">
              <motion.div
                className="max-w-3xl"
                initial={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  Guild <span className="guild-title-accent">Collective</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Find collaborators, mentors, and the people shaping Knight
                  Hacks, on campus and beyond.
                </p>
              </motion.div>
            </div>
          </section>

          <section className="container py-5 md:py-7">
            <motion.div
              className="guild-search-surface mb-6 rounded-lg p-3 md:p-4"
              initial={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                delay: 0.06,
                duration: 0.38,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={submitSearch}
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Search Guild profiles"
                    className="h-11 border-white/10 bg-background/70 pl-10 focus-visible:border-[hsl(var(--guild-blue)/0.45)] focus-visible:ring-[hsl(var(--guild-blue)/0.28)]"
                    placeholder="Search people, schools, companies, or opportunities"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 sm:w-auto"
                  disabled={isNavigating}
                >
                  Search
                </Button>
                <GuildFiltersDialog
                  activeFilterCount={activeFilterCount}
                  draft={draft}
                  filterOptions={filterOptions}
                  onApply={(nextDraft) => {
                    setDraft(nextDraft);
                    setFiltersOpen(false);
                    navigate({
                      ...nextDraft,
                      query: query.trim() || undefined,
                    });
                  }}
                  onChange={setDraft}
                  onClear={clearAll}
                  onOpenChange={(nextOpen) => {
                    if (nextOpen) setDraft(initialFilters);
                    setFiltersOpen(nextOpen);
                  }}
                  open={filtersOpen}
                />
              </form>
            </motion.div>

            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-card/40 px-5 py-16 text-center">
                <UsersRound
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-semibold">No profiles found</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a broader search or clear a filter.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 gap-2"
                  onClick={clearAll}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Clear search and filters
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    Showing {profiles.length}{" "}
                    {profiles.length === 1 ? "profile" : "profiles"}
                  </p>
                  {isNavigating ? (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Updating
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {profiles.map((profile, index) => (
                    <MemberCard
                      key={profile.id}
                      index={
                        index >= entranceBatchStart
                          ? index - entranceBatchStart
                          : index
                      }
                      profile={profile}
                      returnTo={directoryPath(initialFilters)}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3 py-8">
                  {loadError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {loadError}
                    </p>
                  ) : null}
                  {nextCursor ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-36"
                      disabled={isLoadingMore}
                      onClick={loadMore}
                    >
                      {isLoadingMore ? (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      Load more
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You’ve reached the end of the Guild.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

function GuildFiltersDialog({
  activeFilterCount,
  draft,
  filterOptions,
  onApply,
  onChange,
  onClear,
  onOpenChange,
  open,
}: {
  activeFilterCount: number;
  draft: Filters;
  filterOptions: FilterOptions;
  onApply: (filters: Filters) => void;
  onChange: (filters: Filters) => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const toggle = <Key extends keyof Filters>(
    key: Key,
    value: Filters[Key] extends readonly (infer Value)[] ? Value : never,
  ) => {
    const current = draft[key];
    if (!Array.isArray(current)) return;
    const values = current as unknown[];
    onChange({
      ...draft,
      [key]: values.includes(value)
        ? values.filter((candidate) => candidate !== value)
        : [...values, value],
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2 bg-background/70"
        onClick={() => onOpenChange(true)}
      >
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filters
        {activeFilterCount > 0 ? (
          <Badge className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5">
            {activeFilterCount}
          </Badge>
        ) : null}
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filter the Guild</DialogTitle>
            <DialogDescription>
              Combine filters to narrow the community. Multiple choices within a
              section match any selected value.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <FilterCheckboxes
              label="Member status"
              options={GUILD.GUILD_TAG_OPTIONS.map((value) => ({
                label: value === "current" ? "Current member" : "Alumni",
                value,
              }))}
              selected={draft.memberStatuses}
              onToggle={(value) => toggle("memberStatuses", value)}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Knight Hacks team</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm">
                <Checkbox
                  checked={draft.teamMembersOnly}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...draft,
                      teamMembersOnly: checked === true,
                    })
                  }
                />
                <span>
                  <span className="block leading-5">Team members only</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Officers, directors, and active team roles
                  </span>
                </span>
              </label>
            </fieldset>
            <FilterCheckboxes
              label="Opportunity"
              options={GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS.map((value) => ({
                label: GUILD.GUILD_OPPORTUNITY_STATUS_LABELS[value],
                value,
              }))}
              selected={draft.opportunityStatuses}
              onToggle={(value) => toggle("opportunityStatuses", value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <AddFilterSelect
                label="School"
                options={filterOptions.schools}
                selected={draft.schools}
                onAdd={(value) =>
                  onChange({
                    ...draft,
                    schools: [...new Set([...draft.schools, value])],
                  })
                }
                onRemove={(value) => toggle("schools", value)}
              />
              <AddFilterSelect
                label="Major"
                options={filterOptions.majors}
                selected={draft.majors}
                onAdd={(value) =>
                  onChange({
                    ...draft,
                    majors: [...new Set([...draft.majors, value])],
                  })
                }
                onRemove={(value) => toggle("majors", value)}
              />
              <AddFilterSelect
                label="Graduation year"
                options={filterOptions.graduationYears.map(String)}
                selected={draft.graduationYears.map(String)}
                onAdd={(value) =>
                  onChange({
                    ...draft,
                    graduationYears: [
                      ...new Set([...draft.graduationYears, Number(value)]),
                    ],
                  })
                }
                onRemove={(value) => toggle("graduationYears", Number(value))}
              />
              <AddFilterSelect
                label="Member since"
                options={filterOptions.memberSinceYears.map(String)}
                selected={draft.memberSinceYears.map(String)}
                onAdd={(value) =>
                  onChange({
                    ...draft,
                    memberSinceYears: [
                      ...new Set([...draft.memberSinceYears, Number(value)]),
                    ],
                  })
                }
                onRemove={(value) => toggle("memberSinceYears", Number(value))}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Resume</p>
                <Select
                  value={
                    draft.resumeAvailable === undefined
                      ? "any"
                      : draft.resumeAvailable
                        ? "yes"
                        : "no"
                  }
                  onValueChange={(value) =>
                    onChange({
                      ...draft,
                      resumeAvailable:
                        value === "any" ? undefined : value === "yes",
                    })
                  }
                >
                  <SelectTrigger className="h-11 bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any resume status</SelectItem>
                    <SelectItem value="yes">Public resume available</SelectItem>
                    <SelectItem value="no">No public resume</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={onClear}>
              Clear all
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => onApply(draft)}>
                Apply filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterCheckboxes<Value extends string>({
  label,
  onToggle,
  options,
  selected,
}: {
  label: string;
  onToggle: (value: Value) => void;
  options: readonly { label: string; value: Value }[];
  selected: readonly Value[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm"
          >
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
            />
            <span className="leading-5">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AddFilterSelect<Value extends string>({
  label,
  onAdd,
  onRemove,
  options,
  selected,
}: {
  label: string;
  onAdd: (value: Value) => void;
  onRemove: (value: Value) => void;
  options: readonly Value[];
  selected: readonly Value[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <Select value="" onValueChange={(value) => onAdd(value as Value)}>
        <SelectTrigger className="h-11 bg-background/70">
          <SelectValue placeholder={`Add ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options
            .filter((option) => !selected.includes(option))
            .map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-muted/50 px-2 py-1 text-xs"
              onClick={() => onRemove(value)}
            >
              <span className="truncate">{value}</span>
              <X className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">Remove {value}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
