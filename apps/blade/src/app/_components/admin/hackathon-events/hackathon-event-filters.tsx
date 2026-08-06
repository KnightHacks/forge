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
import { Label } from "@forge/ui/label";

interface HackathonEventFilterValue {
  health?: "error" | "healthy" | "needs_attention" | "pending" | "unknown";
  purpose?: "event" | "primary_check_in";
  tags: string[];
}

function toggle(values: string[], value: string, checked: boolean) {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((candidate) => candidate !== value);
}

export function HackathonEventFilters({
  onApply,
  tagOptions,
  value,
}: {
  onApply: (value: HackathonEventFilterValue) => void;
  tagOptions: { color: string; name: string }[];
  value: HackathonEventFilterValue;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const activeCount =
    value.tags.length +
    Number(Boolean(value.health)) +
    Number(Boolean(value.purpose));

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button className="min-h-11 gap-2" type="button" variant="outline">
          <Filter className="size-4" aria-hidden="true" />
          Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter hackathon events</DialogTitle>
          <DialogDescription>
            Tag choices use OR. Purpose and provider health combine with them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hack-event-filter-purpose">Purpose</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm"
                id="hack-event-filter-purpose"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    purpose:
                      event.target.value === "event" ||
                      event.target.value === "primary_check_in"
                        ? event.target.value
                        : undefined,
                  }))
                }
                value={draft.purpose ?? ""}
              >
                <option value="">All purposes</option>
                <option value="event">Ordinary events</option>
                <option value="primary_check_in">Primary check-in</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-filter-health">Provider health</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm"
                id="hack-event-filter-health"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    health: event.target.value
                      ? (event.target
                          .value as HackathonEventFilterValue["health"])
                      : undefined,
                  }))
                }
                value={draft.health ?? ""}
              >
                <option value="">All provider states</option>
                <option value="healthy">Healthy</option>
                <option value="needs_attention">Needs attention</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">Tags</legend>
            {tagOptions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {tagOptions.map((tag) => (
                  <label
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm"
                    key={tag.name}
                  >
                    <input
                      checked={draft.tags.includes(tag.name)}
                      className="size-4 accent-primary"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          tags: toggle(
                            current.tags,
                            tag.name,
                            event.target.checked,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tags configured.
              </p>
            )}
          </fieldset>
        </div>
        <DialogFooter className="gap-2">
          <Button
            className="gap-2"
            onClick={() => setDraft({ tags: [] })}
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Reset
          </Button>
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
            type="button"
          >
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
