"use client";

import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import type { AdminEventInput } from "./params";
import type { EventFilterOptions } from "./types";

function ToggleChoice({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        className="h-4 w-4 accent-primary"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function toggleValue<T extends string>(
  current: T[],
  value: T,
  checked: boolean,
) {
  return checked
    ? [...new Set([...current, value])]
    : current.filter((item) => item !== value);
}

function isAudience(
  value: string,
): value is AdminEventInput["audiences"][number] {
  return value === "dues" || value === "public" || value === "roles";
}

function isHealth(value: string): value is AdminEventInput["health"][number] {
  return (
    value === "error" ||
    value === "pending" ||
    value === "synced" ||
    value === "unknown"
  );
}

export function EventFilters({
  input,
  onApply,
  options,
}: {
  input: AdminEventInput;
  onApply: (input: AdminEventInput) => void;
  options: EventFilterOptions;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(input);

  const activeCount =
    input.audiences.length +
    input.health.length +
    input.roleIds.length +
    input.tags.length +
    Number(input.internal !== "all") +
    Number(input.timing === "past") +
    Number(Boolean(input.startDate)) +
    Number(Boolean(input.endDate));

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setDraft(input);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 gap-2">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter events</DialogTitle>
          <DialogDescription>
            Choices within a section use OR. Different sections combine with
            AND.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Audience</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {options.audiences.filter(isAudience).map((audience) => (
                <ToggleChoice
                  key={audience}
                  label={
                    audience === "dues"
                      ? "Dues paying"
                      : audience === "roles"
                        ? "Selected roles"
                        : "Public"
                  }
                  checked={draft.audiences.includes(audience)}
                  onChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      audiences: toggleValue(
                        current.audiences,
                        audience,
                        checked,
                      ),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Tags</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.tags.map((tag) => (
                <ToggleChoice
                  key={tag.name}
                  label={tag.name}
                  checked={draft.tags.includes(tag.name)}
                  onChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      tags: toggleValue(current.tags, tag.name, checked),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">
              Integration health
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.health.filter(isHealth).map((health) => (
                <ToggleChoice
                  key={health}
                  label={health[0]?.toUpperCase() + health.slice(1)}
                  checked={draft.health.includes(health)}
                  onChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      health: toggleValue(current.health, health, checked),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          {options.roles.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-semibold">
                Selected roles
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.roles.map((role) => (
                  <ToggleChoice
                    key={role.id}
                    label={role.name}
                    checked={draft.roleIds.includes(role.id)}
                    onChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        roleIds: toggleValue(current.roleIds, role.id, checked),
                      }))
                    }
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="event-filter-timing">Timing</Label>
              <select
                id="event-filter-timing"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.timing}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    direction: event.target.value === "past" ? "desc" : "asc",
                    timing: event.target.value as AdminEventInput["timing"],
                  }))
                }
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-filter-internal">Placement</Label>
              <select
                id="event-filter-internal"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.internal}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    internal: event.target.value as AdminEventInput["internal"],
                  }))
                }
              >
                <option value="all">All</option>
                <option value="external">Public calendar</option>
                <option value="internal">Internal calendar</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-filter-start">From</Label>
              <Input
                id="event-filter-start"
                type="date"
                value={draft.startDate ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startDate: event.target.value || undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-filter-end">Through</Label>
              <Input
                id="event-filter-end"
                type="date"
                value={draft.endDate ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    endDate: event.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                audiences: [],
                endDate: undefined,
                health: [],
                internal: "all",
                page: 1,
                roleIds: [],
                startDate: undefined,
                tags: [],
                direction: "asc",
                timing: "upcoming",
              }))
            }
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button
            type="button"
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
  );
}
