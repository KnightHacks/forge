"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
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
import { Textarea } from "@forge/ui/textarea";

import type { EventTagItem } from "~/app/_components/admin/events/types";
import { validNewYorkOffsets } from "~/app/_components/admin/events/event-form-validation";
import {
  clubDateTimeInput,
  clubUtcOffset,
  localNewYorkDateTime,
} from "~/lib/dates";

type Offset = "-04:00" | "-05:00";

export interface HackathonEventFormValue {
  creationKey: string;
  description: string;
  end: string;
  internalTarget: { internal: false };
  location: string;
  name: string;
  pointsOverride?: number;
  purpose: "event" | "primary_check_in";
  start: string;
  tagId: string;
}

export interface HackathonEventFormInitial {
  description: string;
  endAt: Date | string;
  location: string;
  name: string;
  points: number;
  purpose: "event" | "primary_check_in";
  startAt: Date | string;
  tag: string;
  tagId?: string | null;
}

export interface HackathonEventDraft {
  creationKey: string;
  description: string;
  end: string;
  endOffset?: Offset;
  location: string;
  name: string;
  points: string;
  purpose: "event" | "primary_check_in";
  start: string;
  startOffset?: Offset;
  tagId: string;
}

function offsetForInstant(value: Date | string) {
  const offset = clubUtcOffset(value);
  return offset === "-04:00" || offset === "-05:00" ? offset : undefined;
}

function initialDraft(
  initial: HackathonEventFormInitial | null,
  tags: EventTagItem[],
): HackathonEventDraft {
  if (!initial) {
    return {
      creationKey: crypto.randomUUID(),
      description: "",
      end: "",
      location: "",
      name: "",
      points: "",
      purpose: "event",
      start: "",
      tagId: tags.find(({ active }) => active)?.id ?? "",
    };
  }
  return {
    creationKey: crypto.randomUUID(),
    description: initial.description,
    end: clubDateTimeInput(initial.endAt),
    endOffset: offsetForInstant(initial.endAt),
    location: initial.location,
    name: initial.name,
    points: String(initial.points),
    purpose: initial.purpose,
    start: clubDateTimeInput(initial.startAt),
    startOffset: offsetForInstant(initial.startAt),
    tagId:
      initial.tagId ?? tags.find(({ name }) => name === initial.tag)?.id ?? "",
  };
}

export function buildHackathonEventFormValue(
  draft: HackathonEventDraft,
): HackathonEventFormValue {
  const points = draft.points.trim();
  const numericPoints = points === "" ? undefined : Number(points);
  if (
    numericPoints !== undefined &&
    (!Number.isInteger(numericPoints) || numericPoints < 0)
  ) {
    throw new Error("Points must be a non-negative whole number.");
  }
  const start = localNewYorkDateTime(draft.start, draft.startOffset);
  const end = localNewYorkDateTime(draft.end, draft.endOffset);
  if (Date.parse(end) <= Date.parse(start)) {
    throw new Error("End time must be after start time.");
  }
  return {
    creationKey: draft.creationKey,
    description: draft.description,
    end,
    internalTarget: { internal: false },
    location: draft.location,
    name: draft.name,
    ...(numericPoints === undefined ? {} : { pointsOverride: numericPoints }),
    purpose: draft.purpose,
    start,
    tagId: draft.tagId,
  };
}

function OffsetChoice({
  label,
  onChange,
  value,
  wallTime,
}: {
  label: string;
  onChange: (value: Offset | undefined) => void;
  value?: Offset;
  wallTime: string;
}) {
  const offsets = validNewYorkOffsets(wallTime);
  if (offsets.length < 2) return null;
  return (
    <div className="grid gap-2">
      <Label>{label} occurrence</Label>
      <select
        className="h-11 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm"
        onChange={(event) =>
          onChange(
            event.target.value === "-04:00" || event.target.value === "-05:00"
              ? event.target.value
              : undefined,
          )
        }
        value={value ?? ""}
      >
        <option value="">Choose first or second occurrence</option>
        <option value="-04:00">First occurrence (UTC−04:00)</option>
        <option value="-05:00">Second occurrence (UTC−05:00)</option>
      </select>
    </div>
  );
}

export function HackathonEventFormDialog({
  initial,
  mode = initial ? "edit" : "create",
  onOpenChange,
  onSubmit,
  open,
  tags,
}: {
  initial: HackathonEventFormInitial | null;
  mode?: "create" | "duplicate" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: HackathonEventFormValue) => Promise<void>;
  open: boolean;
  tags: EventTagItem[];
}) {
  const [draft, setDraft] = useState(() => initialDraft(initial, tags));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selectedTag = useMemo(
    () => tags.find(({ id }) => id === draft.tagId) ?? null,
    [draft.tagId, tags],
  );
  const patch = (next: Partial<HackathonEventDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

  return (
    <Dialog onOpenChange={(next) => !pending && onOpenChange(next)} open={open}>
      <DialogContent className="max-h-[92svh] max-w-3xl overflow-y-auto border-white/10">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "Edit event"
              : mode === "duplicate"
                ? "Duplicate event"
                : "Create event"}
          </DialogTitle>
          <DialogDescription>
            Times use America/New_York. Purpose controls whether this is the one
            whole-hack admission event or ordinary attendance.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            try {
              await onSubmit(buildHackathonEventFormValue(draft));
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "The hackathon event could not be saved.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="hack-event-name">Name</Label>
              <Input
                id="hack-event-name"
                maxLength={100}
                onChange={(event) => patch({ name: event.target.value })}
                required
                value={draft.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-purpose">Purpose</Label>
              <select
                className="h-11 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm"
                id="hack-event-purpose"
                onChange={(event) =>
                  patch({
                    purpose:
                      event.target.value === "primary_check_in"
                        ? "primary_check_in"
                        : "event",
                  })
                }
                value={draft.purpose}
              >
                <option value="event">Ordinary hackathon event</option>
                <option value="primary_check_in">Primary check-in</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-tag">Tag</Label>
              <select
                className="h-11 rounded-md border border-input bg-background/70 px-3 pr-10 text-sm"
                id="hack-event-tag"
                onChange={(event) => patch({ tagId: event.target.value })}
                required
                value={draft.tagId}
              >
                <option value="">Select a tag</option>
                {tags
                  .filter(({ active }) => active)
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name} · {tag.defaultPoints} points
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="hack-event-description">Description</Label>
              <Textarea
                id="hack-event-description"
                maxLength={1000}
                onChange={(event) => patch({ description: event.target.value })}
                required
                value={draft.description}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-location">Location</Label>
              <Input
                id="hack-event-location"
                maxLength={100}
                onChange={(event) => patch({ location: event.target.value })}
                required
                value={draft.location}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-points">
                Point override (optional)
              </Label>
              <Input
                id="hack-event-points"
                inputMode="numeric"
                min={0}
                onChange={(event) => patch({ points: event.target.value })}
                placeholder={
                  selectedTag
                    ? `Tag default: ${selectedTag.defaultPoints}`
                    : "Select a tag"
                }
                step={1}
                type="number"
                value={draft.points}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-start">Starts</Label>
              <Input
                id="hack-event-start"
                onChange={(event) =>
                  patch({ start: event.target.value, startOffset: undefined })
                }
                required
                type="datetime-local"
                value={draft.start}
              />
              <OffsetChoice
                label="Start"
                onChange={(startOffset) => patch({ startOffset })}
                value={draft.startOffset}
                wallTime={draft.start}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hack-event-end">Ends</Label>
              <Input
                id="hack-event-end"
                onChange={(event) =>
                  patch({ end: event.target.value, endOffset: undefined })
                }
                required
                type="datetime-local"
                value={draft.end}
              />
              <OffsetChoice
                label="End"
                onChange={(endOffset) => patch({ endOffset })}
                value={draft.endOffset}
                wallTime={draft.end}
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={pending || tags.every(({ active }) => !active)}
              type="submit"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {mode === "edit"
                ? "Save changes"
                : mode === "duplicate"
                  ? "Create duplicate"
                  : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
